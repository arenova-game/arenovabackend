import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Récupérer le solde (Joueur)' })
  async getBalance(@Request() req) {
    return this.walletService.getBalance(req.user.id);
  }

  @Post('admin/adjust/:userId')
  @Roles('admin') // 🔐 Sécurisé : Uniquement pour vous
  @ApiOperation({ summary: 'Ajuster le solde d un utilisateur (Admin)' })
  async adjustBalance(
    @Param('userId') userId: string,
    @Body('amount') amount: number,
    @Body('reason') reason: string,
  ) {
    return this.walletService.adminAdjustBalance(userId, amount, reason);
  }
}
