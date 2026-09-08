import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { HoldEscrowDto, AdjustBalanceDto } from './dto/wallet.dto';

@ApiTags('Wallet')
@ApiBearerAuth('JWT-auth')
@Controller('wallet')
@UseGuards(AuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Récupérer le solde (Joueur)' })
  async getBalance(@Request() req) {
    return this.walletService.getBalance(req.user.id);
  }

  @Post('hold-escrow')
  @ApiOperation({ summary: 'Bloquer des fonds en séquestre' })
  @ApiBody({ type: HoldEscrowDto })
  async holdEscrow(@Request() req, @Body() holdEscrowDto: HoldEscrowDto) {
    return this.walletService.holdEscrow(req.user.id, holdEscrowDto.amount);
  }

  @Post('release-escrow')
  @ApiOperation({ summary: 'Libérer des fonds du séquestre' })
  @ApiBody({ type: HoldEscrowDto })
  async releaseEscrow(@Request() req, @Body() releaseEscrowDto: HoldEscrowDto) {
    return this.walletService.releaseEscrow(req.user.id, releaseEscrowDto.amount);
  }

  @Post('admin/adjust/:userId')
  @Roles('admin') // 🔐 Sécurisé : Uniquement pour vous
  @ApiOperation({ summary: 'Ajuster le solde d un utilisateur (Admin)' })
  @ApiBody({ type: AdjustBalanceDto })
  async adjustBalance(
    @Param('userId') userId: string,
    @Body() adjustBalanceDto: AdjustBalanceDto,
  ) {
    return this.walletService.adminAdjustBalance(userId, adjustBalanceDto.amount, adjustBalanceDto.reason);
  }
}
