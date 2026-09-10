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

  // --- MATCHMAKING AMIS ---

  async createFriendRoom(userId: string, gameId: string, betAmount: number) {
    const client = this.supabase.getClient();
    const entryCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data: room, error } = await client.from(\u0027game_rooms\u0027).insert({
      game_id: gameId,
      player1_id: userId,
      stake_amount: betAmount,
      status: \u0027WAITING\u0027,
      entry_code: entryCode, // Assurez-vous que cette colonne existe
    }).select().single();

    if (error) throw error;
    return room;
  }

  async verifyFriendCode(entryCode: string) {
    const client = this.supabase.getClient();
    const { data: room, error } = await client
      .from(\u0027game_rooms\u0027)
      .select(\u0027*, p1:profiles!player1_id(username)\u0027)
      .eq(\u0027entry_code\u0027, entryCode)
      .eq(\u0027status\u0027, \u0027WAITING\u0027)
      .maybeSingle();

    if (error || !room) throw new NotFoundException(\u0027Code invalide ou partie déjà commencée\u0027);

    return {
      ...room,
      isFull: room.player2_id != null,
      playerCount: room.player2_id ? 2 : 1
    };
  }

  async joinFriendRoom(userId: string, entryCode: string) {
    const client = this.supabase.getClient();

    // 1. Trouver la room
    const { data: room } = await client
      .from(\u0027game_rooms\u0027)
      .select(\u0027*\u0027)
      .eq(\u0027entry_code\u0027, entryCode)
      .eq(\u0027status\u0027, \u0027WAITING\u0027)
      .single();

    if (!room) throw new NotFoundException(\u0027Partie introuvable\u0027);
    if (room.player1_id === userId) throw new BadRequestException(\u0027Vous êtes déjà dans cette partie\u0027);

    // 2. Vérifier solde
    const balance = await this.walletService.getBalance(userId);
    if (balance.ova_balance < room.stake_amount) {
      throw new BadRequestException(\u0027Solde insuffisant\u0027);
    }

    // 3. Bloquer fonds et rejoindre
    await this.walletService.holdEscrow(userId, room.stake_amount);
    await this.walletService.holdEscrow(room.player1_id, room.stake_amount);

    const { data: updatedRoom, error } = await client
      .from(\u0027game_rooms\u0027)
      .update({
        player2_id: userId,
        status: \u0027IN_PROGRESS\u0027,
      })
      .eq(\u0027id\u0027, room.id)
      .select()
      .single();

    if (error) throw error;
    return updatedRoom;
  }
}
