import { Controller, Get, Post, Body, UseGuards, Request, Patch } from '@nestjs/common';
import { FriendsService } from './friends.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Social - Friends')
@ApiBearerAuth()
@Controller('friends')
@UseGuards(AuthGuard)
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister mes amis acceptés' })
  async getFriends(@Request() req) {
    return this.friendsService.getFriends(req.user.id);
  }

  @Post('request')
  @ApiOperation({ summary: 'Envoyer une demande d ami' })
  async sendRequest(@Request() req, @Body('friendId') friendId: string) {
    return this.friendsService.sendFriendRequest(req.user.id, friendId);
  }

  @Patch('accept')
  @ApiOperation({ summary: 'Accepter une demande d ami' })
  async acceptRequest(@Request() req, @Body('friendId') friendId: string) {
    return this.friendsService.acceptFriendRequest(req.user.id, friendId);
  }
}
