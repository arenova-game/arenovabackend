import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class MatchmakingService {
  constructor(
    private readonly walletService: WalletService,
    private readonly supabase: SupabaseService
  ) {}

  async joinQueue(userId: string, gameId: string, stakeAmount: number) {
    const client = this.supabase.getClient();

    // 1. Vérification Solde
    const balance = await this.walletService.getBalance(userId);
    if (balance.ova_balance < stakeAmount) {
      throw new BadRequestException('Solde insuffisant pour la mise');
    }

    // 2. Recherche Adversaire compatible (Elo ±200)
    const { data: opponent } = await client
      .from('matchmaking_queue')
      .select('*')
      .eq('game_id', gameId)
      .eq('stake_amount', stakeAmount)
      .eq('status', 'WAITING')
      .neq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (opponent) {
      // MATCH TROUVÉ
      try {
        // Bloquer les fonds pour les deux joueurs
        await this.walletService.holdEscrow(userId, stakeAmount);
        await this.walletService.holdEscrow(opponent.user_id, stakeAmount);

        // Commission de 10%
        const totalPrizePool = (stakeAmount * 2) * 0.90;

        const { data: room, error: roomError } = await client.from('game_rooms').insert({
          game_id: gameId,
          stake_amount: stakeAmount,
          total_prize_pool: totalPrizePool,
          player1_id: opponent.user_id,
          player2_id: userId,
          status: 'IN_PROGRESS'
        }).select().single();

        if (roomError) throw roomError;

        // Mettre à jour la file d'attente
        await client.from('matchmaking_queue')
          .update({ status: 'MATCHED' })
          .eq('id', opponent.id);

        return { matched: true, room };
      } catch (e) {
        // Rollback Escrow si erreur
        try {
          await this.walletService.releaseEscrow(userId, stakeAmount);
          await this.walletService.releaseEscrow(opponent.user_id, stakeAmount);
        } catch (rollbackError) {
          console.error('Critical: Failed to rollback escrow', rollbackError);
        }
        throw new BadRequestException('Erreur lors de la création du match : ' + e.message);
      }
    } else {
      // AJOUT FILE D'ATTENTE
      const { data: queueEntry, error: queueError } = await client.from('matchmaking_queue').insert({
        user_id: userId,
        game_id: gameId,
        stake_amount: stakeAmount,
        status: 'WAITING'
      }).select().single();

      if (queueError) throw queueError;
      
      return { matched: false, queueId: queueEntry.id, message: 'En attente d\'un adversaire' };
    }
  }

  async cancelQueue(queueId: string, userId: string) {
    const client = this.supabase.getClient();
    const { data: entry } = await client
      .from('matchmaking_queue')
      .select('*')
      .eq('id', queueId)
      .eq('user_id', userId)
      .single();

    if (!entry) throw new NotFoundException('Entrée dans la file introuvable');

    const { error } = await client
      .from('matchmaking_queue')
      .update({ status: 'CANCELLED' })
      .eq('id', queueId);
    
    if (error) throw error;
    return { success: true };
  }
}
