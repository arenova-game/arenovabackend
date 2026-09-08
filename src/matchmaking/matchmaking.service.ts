import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class MatchmakingService {
  constructor(private readonly supabase: SupabaseService) {}

  async joinAutoMatchmaking(gameId: string, userId: string, betAmount: number) {
    const client = this.supabase.getClient();

    // 1. Chercher une room "auto" en attente avec la même mise
    const { data: rooms, error: searchError } = await client
      .from('game_rooms')
      .select('*')
      .eq('game_id', gameId)
      .eq('room_type', 'auto')
      .eq('status', 'waiting')
      .eq('bet_amount', betAmount)
      .limit(1);

    if (searchError) throw searchError;

    if (rooms && rooms.length > 0) {
      const room = rooms[0];
      if (room.player1_id === userId) return room;

      const { data: updatedRoom, error: joinError } = await client
        .from('game_rooms')
        .update({ 
          player2_id: userId, 
          status: 'ready' 
        })
        .eq('id', room.id)
        .select()
        .single();

      if (joinError) throw joinError;
      return updatedRoom;
    } else {
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + 60);

      const { data: newRoom, error: createError } = await client
        .from('game_rooms')
        .insert([{ 
          game_id: gameId, 
          player1_id: userId, 
          bet_amount: betAmount,
          room_type: 'auto',
          status: 'waiting',
          expires_at: expiresAt
        }])
        .select()
        .single();

      if (createError) throw createError;
      return newRoom;
    }
  }

  async createFriendRoom(gameId: string, userId: string, betAmount: number, isExternal = false, playerPseudo?: string) {
    const entryCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { data, error } = await this.supabase.getClient()
      .from('game_rooms')
      .insert([{
        game_id: gameId,
        player1_id: userId,
        bet_amount: betAmount,
        room_type: 'friend',
        entry_code: entryCode,
        status: 'waiting',
        metadata: {
          is_external: isExternal,
          p1_pseudo: playerPseudo || 'Joueur 1'
        }
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRoomByCode(entryCode: string) {
    const { data: room, error } = await this.supabase.getClient()
      .from('game_rooms')
      .select('*, games(name, image_url), p1:profiles!player1_id(username)')
      .eq('entry_code', entryCode.toUpperCase())
      .single();

    if (error || !room) throw new NotFoundException('Code incorrect');
    
    return {
      ...room,
      isFull: room.player2_id !== null,
      playerCount: room.player2_id !== null ? 2 : 1
    };
  }

  async joinFriendRoom(entryCode: string, userId: string) {
    const client = this.supabase.getClient();
    const { data: room } = await client
      .from('game_rooms')
      .select('*')
      .eq('entry_code', entryCode.toUpperCase())
      .single();

    if (!room) throw new NotFoundException('Code incorrect');
    if (room.status !== 'waiting') throw new BadRequestException('Partie déjà en cours ou terminée');
    if (room.player2_id) throw new BadRequestException('Partie complète');
    if (room.player1_id === userId) return room;

    const { data: updatedRoom } = await client
      .from('game_rooms')
      .update({ 
        player2_id: userId, 
        status: 'ready' 
      })
      .eq('id', room.id)
      .select()
      .single();

    return updatedRoom;
  }

  async completeMatch(roomId: string, winnerId: string) {
    const client = this.supabase.getClient();
    
    // 1. Récupérer les infos de la room
    const { data: room, error: roomError } = await client
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();
      
    if (roomError || !room) throw new NotFoundException('Match introuvable');
    if (room.status === 'completed') return room;

    // 2. Récupérer le taux de commission dynamique
    const { data: setting } = await client
      .from('platform_settings')
      .select('value')
      .eq('key', 'commission_rate')
      .single();
    
    const commissionRate = setting ? parseFloat(setting.value) : 0.20;
    const winFactor = 2 * (1 - commissionRate); // Ex: 2 * (1 - 0.20) = 1.6x la mise d'un joueur (ou 0.8x le pot total)
    const winAmount = room.bet_amount * winFactor;

    // 3. Marquer le match comme terminé
    await client.from('game_rooms').update({
      status: 'completed',
      winner_id: winnerId
    }).eq('id', roomId);

    // 4. Créditer le gagnant
    if (winnerId) {
      await client.rpc('increment_wallet_balance', { 
        user_id_param: winnerId, 
        amount_param: winAmount 
      });

      // Log transaction
      await client.from('transactions').insert({
        user_id: winnerId,
        amount: winAmount,
        type: 'win',
        status: 'completed'
      });
    }

    return { message: 'Match terminé', winnerId, winAmount };
  }

  async getHistory(userId: string, isGlobal = false) {
    let query = this.supabase.getClient()
      .from('game_rooms')
      .select('*, games(name, image_url), p1:profiles!player1_id(username), p2:profiles!player2_id(username)')
      .order('created_at', { ascending: false });

    if (!isGlobal) {
      query = query.or(`player1_id.eq.${userId},player2_id.eq.${userId}`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  async cancelSearch(roomId: string, userId: string) {
    const { error } = await this.supabase.getClient()
      .from('game_rooms')
      .update({ status: 'annuler' })
      .eq('id', roomId)
      .eq('player1_id', userId)
      .eq('status', 'waiting');
    
    if (error) throw error;
    return { message: 'Recherche annulée' };
  }
}
