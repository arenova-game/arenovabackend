import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class WalletService {
  constructor(private readonly supabase: SupabaseService) {}

  async getBalance(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .select('ova_balance, ova_escrow')
      .eq('id', userId)
      .single();

    if (error) throw new NotFoundException('Profil introuvable');
    return {
      ova_balance: data.ova_balance || 0,
      ova_escrow: data.ova_escrow || 0,
    };
  }

  async holdEscrow(userId: string, amount: number) {
    const client = this.supabase.getClient();

    // Appel de la fonction RPC atomique PostgreSQL
    const { error } = await client.rpc('fn_hold_escrow', {
      p_user_id: userId,
      p_amount: amount
    });

    if (error) {
      throw new BadRequestException(error.message || 'Solde OVA insuffisant pour verrouiller l\'escrow');
    }

    // Enregistrement de la transaction
    await client.from('transactions').insert({
      user_id: userId,
      amount_fcfa: 0,
      amount_ova: amount,
      type: 'ESCROW_LOCK',
      status: 'SUCCESS',
      created_at: new Date().toISOString(),
    });

    return this.getBalance(userId);
  }

  async releaseEscrow(userId: string, amount: number) {
    const client = this.supabase.getClient();
    const { error } = await client.rpc('fn_release_escrow', {
      p_user_id: userId,
      p_amount: amount
    });

    if (error) throw new BadRequestException(error.message);

    await client.from('transactions').insert({
      user_id: userId,
      amount_fcfa: 0,
      amount_ova: amount,
      type: 'ESCROW_RELEASE',
      status: 'SUCCESS',
      created_at: new Date().toISOString(),
    });

    return this.getBalance(userId);
  }

  async creditWinner(winnerId: string, prizePoolAmount: number, roomId: string) {
    const client = this.supabase.getClient();
    const { error } = await client.rpc('fn_credit_winner', {
      p_winner_id: winnerId,
      p_amount: prizePoolAmount
    });

    if (error) throw new BadRequestException(error.message);

    await client.from('transactions').insert({
      user_id: winnerId,
      amount_fcfa: 0,
      amount_ova: prizePoolAmount,
      type: 'MATCH_WIN_PAYOUT',
      status: 'SUCCESS',
      payment_reference: roomId,
      created_at: new Date().toISOString(),
    });

    return this.getBalance(winnerId);
  }

  async consumeEscrowOnMatchEnd(loserId: string, amount: number) {
    const client = this.supabase.getClient();
    const { error } = await client.rpc('fn_consume_escrow', {
      p_user_id: loserId,
      p_amount: amount
    });

    if (error) throw new BadRequestException(error.message);

    return { success: true };
  }

  async creditDeposit(userId: string, amountOva: number) {
    const client = this.supabase.getClient();
    const { data, error } = await client.rpc('fn_credit_winner', {
      p_winner_id: userId,
      p_amount: amountOva
    });
    if (error) throw error;
    return data;
  }

  async deductForWithdrawal(userId: string, amountOva: number) {
    const client = this.supabase.getClient();
    // On peut réutiliser fn_hold_escrow ou créer une fonction dédiée,
    // mais ici on va simplement déduire du balance.
    const { data: profile } = await this.getBalance(userId);
    if (profile.ova_balance < amountOva) {
      throw new BadRequestException('Solde OVA insuffisant');
    }

    const { error } = await client
      .from('profiles')
      .update({ ova_balance: profile.ova_balance - amountOva })
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  }

  async adminAdjustBalance(userId: string, amount: number, reason: string) {
    const client = this.supabase.getClient();
    const { error } = await client.rpc(amount > 0 ? 'fn_credit_winner' : 'fn_consume_escrow', {
      [amount > 0 ? 'p_winner_id' : 'p_user_id']: userId,
      p_amount: Math.abs(amount)
    });

    if (error) throw error;

    await client.from('transactions').insert({
      user_id: userId,
      amount_fcfa: 0,
      amount_ova: amount,
      type: amount > 0 ? 'DEPOSIT' : 'WITHDRAWAL',
      status: 'SUCCESS',
      created_at: new Date().toISOString(),
    });

    return this.getBalance(userId);
  }
}
