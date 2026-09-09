import { Module, OnModuleInit } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingController } from './matchmaking.controller';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [MatchmakingController],
  providers: [MatchmakingService],
})
export class MatchmakingModule implements OnModuleInit {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  onModuleInit() {
    // Nettoyage automatique des files d attente périmées toutes les minutes
    setInterval(() => {
      console.log('🧹 Cron: Nettoyage de la file d attente...');
      // Logic would go here
    }, 60000);
  }
}
