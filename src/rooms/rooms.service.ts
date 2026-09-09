import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletService: WalletService
  ) {}

  async submitResult(roomId: string, userId: string, claimedWinnerId: string, screenshotUrl: string) {
    const client = this.supabase.getClient();

    // 1. Insérer la preuve
    const { error: proofError } = await client.from('room_proofs').insert({
      room_id: roomId,
      user_id: userId,
      claimed_winner_id: claimedWinnerId,
      screenshot_url: screenshotUrl,
    });

    if (proofError) throw new BadRequestException('Erreur lors de la soumission de la preuve');

    // 2. Récupérer toutes les preuves pour cette room
    const { data: proofs, error: fetchProofsError } = await client
      .from('room_proofs')
      .select('*')
      .eq('room_id', roomId);

    if (fetchProofsError) throw fetchProofsError;

    // 3. Récupérer les infos de la room
    const { data: room, error: roomError } = await client
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) throw new NotFoundException('Match introuvable');

    // Si une seule preuve : on attend l'autre
    if (proofs.length === 1) {
      return { message: 'Preuve reçue, attente de la réponse de l\'adversaire' };
    }

    // Si 2 preuves : Vérifier accord ou litige
    if (proofs.length === 2) {
      const p1Proof = proofs.find(p => p.user_id === room.player1_id);
      const p2Proof = proofs.find(p => p.user_id === room.player2_id);

      if (p1Proof.claimed_winner_id === p2Proof.claimed_winner_id) {
        // CAS A : ACCORD
        const winnerId = p1Proof.claimed_winner_id;
        const loserId = winnerId === room.player1_id ? room.player2_id : room.player1_id;

        await this.walletService.creditWinner(winnerId, room.total_prize_pool, roomId);
        await this.walletService.consumeEscrowOnMatchEnd(loserId, room.stake_amount);
        await this.walletService.consumeEscrowOnMatchEnd(winnerId, room.stake_amount); // On vide aussi le séquestre du gagnant

        await client.from('game_rooms')
          .update({ status: 'COMPLETED', winner_id: winnerId })
          .eq('id', roomId);

        return { message: 'Victoire validée et gains versés', status: 'COMPLETED', winnerId };
      } else {
        // CAS B : LITIGE
        await client.from('game_rooms')
          .update({ status: 'DISPUTED' })
          .eq('id', roomId);

        return { message: 'Litige détecté, transmis à l\'arbitrage', status: 'DISPUTED' };
      }
    }

    return { message: 'Preuve enregistrée' };
  }
}
