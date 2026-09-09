import { Module } from '@nestjs/common';
import { KPayService } from './kpay.service';
import { PaymentsController } from './payments.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [PaymentsController],
  providers: [KPayService],
})
export class PaymentsModule {}
