import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ProofsService {
  constructor(private readonly supabase: SupabaseService) {}

  async submitProof(matchId: string, userId: string, proofUrl: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('match_proofs')
      .insert([{ 
        match_id: matchId, 
        user_id: userId, 
        proof_url: proofUrl,
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getPendingProofs() {
    const { data, error } = await this.supabase
      .getClient()
      .from('match_proofs')
      .select('*, profiles(username), game_rooms(bet_amount, games(name))')
      .eq('status', 'pending');

    if (error) throw error;
    return data;
  }

  async validateProof(proofId: string, status: 'approved' | 'rejected', adminId: string) {
    const client = this.supabase.getClient();
    
    // 1. Récupérer la preuve
    const { data: proof, error: fetchError } = await client
      .from('match_proofs')
      .select('*, game_rooms(*)')
      .eq('id', proofId)
      .single();

    if (fetchError || !proof) throw new NotFoundException('Preuve introuvable');

    // 2. Mettre à jour le statut de la preuve
    await client.from('match_proofs').update({ status }).eq('id', proofId);

    // 3. Si approuvé, on clôture le match et on paie le joueur
    if (status === 'approved') {
      const roomId = proof.match_id;
      const winnerId = proof.user_id;
      const winAmount = proof.game_rooms.bet_amount * 1.8;

      await client.from('game_rooms').update({
        status: 'completed',
        winner_id: winnerId
      }).eq('id', roomId);

      await client.rpc('increment_wallet_balance', { 
        user_id_param: winnerId, 
        amount_param: winAmount 
      });
    }

    return { message: `Preuve ${status}` };
  }
}
