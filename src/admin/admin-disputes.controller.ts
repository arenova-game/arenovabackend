import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { SupabaseService } from '../supabase/supabase.service';
import { WalletService } from '../wallet/wallet.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';

class ResolveDisputeDto {
  @ApiProperty()
  winnerId: string;
  @ApiProperty()
  adminReason: string;
}

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/disputes')
@UseGuards(AuthGuard)
@Roles('admin')
export class AdminDisputesController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletService: WalletService
  ) {}

  @Post(':roomId/resolve')
  @ApiOperation({ summary: 'Résoudre un litige (Admin)' })
  async resolveDispute(
    @Param('roomId') roomId: string,
    @Body() dto: ResolveDisputeDto
  ) {
    const client = this.supabase.getClient();

    // 1. Récupérer la room
    const { data: room, error: roomError } = await client
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError || !room) throw new Error('Match introuvable');
    if (room.status !== 'DISPUTED') throw new Error('Le match n\'est pas en litige');

    const winnerId = dto.winnerId;
    const loserId = winnerId === room.player1_id ? room.player2_id : room.player1_id;

    // 2. Créditer le gagnant et consommer les séquestres
    await this.walletService.creditWinner(winnerId, room.total_prize_pool, roomId);
    await this.walletService.consumeEscrowOnMatchEnd(loserId, room.stake_amount);
    await this.walletService.consumeEscrowOnMatchEnd(winnerId, room.stake_amount);

    // 3. Mettre à jour la room
    await client.from('game_rooms')
      .update({
        status: 'COMPLETED',
        winner_id: winnerId,
        admin_notes: dto.adminReason
      })
      .eq('id', roomId);

    return { message: 'Litige résolu avec succès' };
  }
}
