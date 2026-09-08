import { Controller, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('supabase-auth')
  @ApiOperation({ summary: 'Webhook reçu de Supabase lors d une inscription' })
  async handleSupabaseAuth(@Body() payload: any) {
    const { record, type } = payload;

    if (type === 'INSERT' && record) {
      const { email, raw_user_meta_data, id } = record;
      const username = raw_user_meta_data?.username || 'Joueur';
      const referralCode = `REF-${id.substring(0, 6).toUpperCase()}`;

      await this.notificationsService.sendWelcomeEmail(email, username, referralCode);
      await this.notificationsService.sendAdminAlert(`🚀 Nouveau joueur inscrit : ${username} (${email})`);

      return { success: true };
    }

    return { success: false };
  }
}
