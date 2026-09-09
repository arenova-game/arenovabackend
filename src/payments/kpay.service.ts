import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import axios from 'axios';

@Injectable()
export class KPayService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly walletService: WalletService
  ) {
    this.baseUrl = this.configService.get<string>('KPAY_BASE_URL') || 'https://api.kpay.cm';
    this.apiKey = this.configService.get<string>('KPAY_API_KEY');
  }

  async initDeposit(userId: string, amountFcfa: number, phoneNumber: string) {
    const client = this.supabase.getClient();

    // 1. Enregistrer la transaction en attente
    const { data: transaction, error } = await client.from('transactions').insert({
      user_id: userId,
      amount_fcfa: amountFcfa,
      amount_ova: amountFcfa, // Taux 1:1
      type: 'DEPOSIT',
      status: 'PENDING',
      payment_method: 'KPAY',
      phone_number: phoneNumber
    }).select().single();

    if (error) throw error;

    // 2. Appel API K-Pay
    try {
      const response = await axios.post(`${this.baseUrl}/v1/payments/initiate`, {
        amount: amountFcfa,
        phone: phoneNumber,
        reference: transaction.id,
        notify_url: 'https://arenovabackend.onrender.com/payments/kpay/webhook',
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      const kpayRef = response.data.kpay_reference;
      await client.from('transactions')
        .update({ payment_reference: kpayRef })
        .eq('id', transaction.id);

      return response.data;
    } catch (e) {
      await client.from('transactions')
        .update({ status: 'FAILED' })
        .eq('id', transaction.id);
      throw new Error('Erreur K-Pay : ' + e.message);
    }
  }

  async handleWebhook(payload: any) {
    const { reference, status, kpay_reference } = payload;
    const client = this.supabase.getClient();

    const { data: transaction } = await client
      .from('transactions')
      .select('*')
      .eq('id', reference)
      .single();

    if (!transaction || transaction.status === 'SUCCESS') return;

    if (status === 'SUCCESS') {
      await this.walletService.creditDeposit(transaction.user_id, transaction.amount_ova);
      await client.from('transactions')
        .update({ status: 'SUCCESS', payment_reference: kpay_reference })
        .eq('id', reference);
    } else {
      await client.from('transactions')
        .update({ status: 'FAILED' })
        .eq('id', reference);
    }
  }

  async initWithdrawal(userId: string, amountOva: number, phoneNumber: string) {
    // 1. Débiter les OVA du joueur
    await this.walletService.deductForWithdrawal(userId, amountOva);

    const client = this.supabase.getClient();
    const { data: transaction } = await client.from('transactions').insert({
      user_id: userId,
      amount_fcfa: amountOva,
      amount_ova: amountOva,
      type: 'WITHDRAWAL',
      status: 'PENDING',
      payment_method: 'KPAY',
      phone_number: phoneNumber
    }).select().single();

    try {
      const response = await axios.post(`${this.baseUrl}/v1/payouts/initiate`, {
        amount: amountOva,
        phone: phoneNumber,
        reference: transaction.id,
      }, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return response.data;
    } catch (e) {
      // Annuler le débit en cas d'erreur API
      await this.walletService.creditDeposit(userId, amountOva);
      await client.from('transactions')
        .update({ status: 'FAILED' })
        .eq('id', transaction.id);
      throw new Error('Erreur Payout K-Pay : ' + e.message);
    }
  }
}
