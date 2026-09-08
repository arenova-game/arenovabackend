import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { WebhooksController } from './webhooks.controller';

@Module({
  controllers: [NotificationsController, WebhooksController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
