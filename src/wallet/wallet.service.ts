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

    if (error) throw error;
    return {
      balance: data.ova_balance || 0,
      escrow: data.ova_escrow || 0,
    };
  }

  async holdEscrow(userId: string, amount: number) {
    // 1. Vérifier le solde
    const { data: profile, error: fetchError } = await this.supabase
      .getClient()
      .from('profiles')
      .select('ova_balance, ova_escrow')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) throw new NotFoundException('Utilisateur introuvable');
    if (profile.ova_balance < amount) {
      throw new BadRequestException('Solde OVA insuffisant');
    }

    // 2. Transaction atomique (Mise à jour des balances)
    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .update({
        ova_balance: profile.ova_balance - amount,
        ova_escrow: (profile.ova_escrow || 0) + amount,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // 3. Log de la transaction
    await this.supabase.getClient().from('transactions').insert({
      user_id: userId,
      amount: -amount,
      type: 'ESCROW_LOCK',
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    return { balance: data.ova_balance, escrow: data.ova_escrow };
  }

  async releaseEscrow(userId: string, amount: number) {
    const { data: profile, error: fetchError } = await this.supabase
      .getClient()
      .from('profiles')
      .select('ova_balance, ova_escrow')
      .eq('id', userId)
      .single();

    if (fetchError || !profile) throw new NotFoundException('Utilisateur introuvable');

    const newEscrow = Math.max(0, (profile.ova_escrow || 0) - amount);

    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .update({
        ova_balance: profile.ova_balance + amount,
        ova_escrow: newEscrow,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    await this.supabase.getClient().from('transactions').insert({
      user_id: userId,
      amount: amount,
      type: 'ESCROW_RELEASE',
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    return { balance: data.ova_balance, escrow: data.ova_escrow };
  }

  async creditWinner(winnerId: string, prizePoolAmount: number, roomId: string) {
    const { data: profile, error: fetchError } = await this.supabase
      .getClient()
      .from('profiles')
      .select('ova_balance')
      .eq('id', winnerId)
      .single();

    if (fetchError || !profile) throw new NotFoundException('Gagnant introuvable');

    const { data, error } = await this.supabase
      .getClient()
      .from('profiles')
      .update({
        ova_balance: profile.ova_balance + prizePoolAmount,
      })
      .eq('id', winnerId)
      .select()
      .single();

    if (error) throw error;

    await this.supabase.getClient().from('transactions').insert({
      user_id: winnerId,
      amount: prizePoolAmount,
      type: 'MATCH_WIN_PAYOUT',
      status: 'completed',
      reference_id: roomId,
      created_at: new Date().toISOString(),
    });

    return { balance: data.ova_balance };
  }

  async consumeEscrowOnMatchEnd(loserId: string, amount: number) {
    const { data: profile, error: fetchError } = await this.supabase
      .getClient()
      .from('profiles')
      .select('ova_escrow')
      .eq('id', loserId)
      .single();

    if (fetchError || !profile) throw new NotFoundException('Perdant introuvable');

    const newEscrow = Math.max(0, (profile.ova_escrow || 0) - amount);

    const { error } = await this.supabase
      .getClient()
      .from('profiles')
      .update({
        ova_escrow: newEscrow,
      })
      .eq('id', loserId);

    if (error) throw error;

    return { success: true };
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
