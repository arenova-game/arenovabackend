import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Social - Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get(':channelId')
  @ApiOperation({ summary: 'Récupérer les messages d un canal (room ou amis)' })
  async getMessages(@Param('channelId') channelId: string) {
    return this.chatService.getMessages(channelId);
  }

  @Post(':channelId')
  @ApiOperation({ summary: 'Envoyer un message dans un canal' })
  async sendMessage(
    @Request() req,
    @Param('channelId') channelId: string,
    @Body('content') content: string,
  ) {
    return this.chatService.sendMessage(req.user.id, channelId, content);
  }
}
