import { Module } from '@nestjs/common';
import { AdminDisputesController } from './admin-disputes.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [AdminDisputesController],
})
export class AdminModule {}
