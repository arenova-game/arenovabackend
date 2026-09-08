import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GamesModule } from './games/games.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { WalletModule } from './wallet/wallet.module';
import { MatchmakingModule } from './matchmaking/matchmaking.module';
import { ProofsModule } from './proofs/proofs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FriendsModule } from './friends/friends.module';
import { ChatModule } from './chat/chat.module';
import { RewardsModule } from './rewards/rewards.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    AuthModule,
    UsersModule,
    GamesModule,
    TournamentsModule,
    WalletModule,
    MatchmakingModule,
    ProofsModule,
    NotificationsModule,
    FriendsModule,
    ChatModule,
    RewardsModule,
    SettingsModule,
  ],
})
export class AppModule {}
