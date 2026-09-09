import { Controller, Post, Body, UseGuards, Request, Headers } from '@nestjs/common';
import { KPayService } from './kpay.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';

class DepositDto {
  @ApiProperty()
  amountFcfa: number;
  @ApiProperty()
  phoneNumber: string;
}

class WithdrawalDto {
  @ApiProperty()
  amountOva: number;
  @ApiProperty()
  phoneNumber: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly kpayService: KPayService) {}

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('kpay/deposit')
  @ApiOperation({ summary: 'Initier un dépôt via K-Pay' })
  async initDeposit(@Request() req, @Body() dto: DepositDto) {
    return this.kpayService.initDeposit(req.user.id, dto.amountFcfa, dto.phoneNumber);
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Post('kpay/withdraw')
  @ApiOperation({ summary: 'Initier un retrait via K-Pay' })
  async initWithdrawal(@Request() req, @Body() dto: WithdrawalDto) {
    return this.kpayService.initWithdrawal(req.user.id, dto.amountOva, dto.phoneNumber);
  }

  @Post('kpay/webhook')
  @ApiOperation({ summary: 'Webhook K-Pay (Appelé par K-Pay)' })
  async handleWebhook(@Body() payload: any) {
    // Note: Ajouter validation de signature ici si nécessaire
    return this.kpayService.handleWebhook(payload);
  }
}
