import { Controller, Get, Post, Body, UseGuards, Request, Patch, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer mes notifications' })
  async getMyNotifications(@Request() req) {
    return this.notificationsService.getMyNotifications(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Post('admin/send')
  @Roles('admin')
  @ApiOperation({ summary: 'Envoyer une notification à un utilisateur spécifique (Admin)' })
  async sendToUser(
    @Body('userId') userId: string,
    @Body('title') title: string,
    @Body('message') message: string,
    @Body('type') type?: string,
  ) {
    return this.notificationsService.sendToUser(userId, title, message, type);
  }

  @Post('admin/broadcast')
  @Roles('admin')
  @ApiOperation({ summary: 'Envoyer une notification à tous les utilisateurs (Admin)' })
  async broadcast(
    @Body('title') title: string,
    @Body('message') message: string,
    @Body('type') type?: string,
  ) {
    return this.notificationsService.broadcast(title, message, type);
  }
}
