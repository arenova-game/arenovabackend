import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class WalletService {
  constructor(private readonly supabase: SupabaseService) {}

  async getBalance(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('wallets')
      .select('balance, currency')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async getTransactions(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async deposit(userId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const { data, error } = await this.supabase
      .getClient()
      .rpc('increment_wallet_balance', { 
        user_id_param: userId, 
        amount_param: amount 
      });

    if (error) throw error;

    // Log the transaction
    await this.supabase.getClient().from('transactions').insert({
      user_id: userId,
      amount: amount,
      type: 'deposit',
      status: 'completed'
    });

    return data;
  }

  // NOUVEAU : Ajustement admin (Backoffice)
  async adminAdjustBalance(userId: string, amount: number, reason: string) {
    const { data, error } = await this.supabase
      .getClient()
      .rpc('increment_wallet_balance', { 
        user_id_param: userId, 
        amount_param: amount 
      });

    if (error) throw error;

    // Log the transaction
    await this.supabase.getClient().from('transactions').insert({
      user_id: userId,
      amount: amount,
      type: amount > 0 ? 'win' : 'entry_fee', // Simplifié pour le log
      status: 'completed',
      // metadata: { reason } // Optionnel si vous ajoutez une colonne metadata
    });

    return { success: true, newBalance: data };
  }
}
