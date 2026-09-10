import { Controller, Post, Body, UseGuards, Request, Patch, Param, Get } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';

class JoinQueueDto {
  @ApiProperty()
  gameId: string;
  @ApiProperty()
  stakeAmount: number;
}

@ApiTags('Matchmaking')
@ApiBearerAuth('JWT-auth')
@Controller('matchmaking')
@UseGuards(AuthGuard)
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Post('join')
  @ApiOperation({ summary: 'Rejoindre une file d attente de matchmaking' })
  async joinQueue(@Request() req, @Body() dto: JoinQueueDto) {
    return this.matchmakingService.joinQueue(req.user.id, dto.gameId, dto.stakeAmount);
  }

  @Patch('cancel/:id')
  @ApiOperation({ summary: 'Annuler une recherche de partie' })
  async cancelMatch(@Request() req, @Param('id') id: string) {
    return this.matchmakingService.cancelQueue(id, req.user.id);
  }

  @Post('friend/create')
  @ApiOperation({ summary: 'Créer une room privée pour un ami' })
  async createFriendRoom(@Request() req, @Body('gameId') gameId: string, @Body('betAmount') betAmount: number) {
    return this.matchmakingService.createFriendRoom(req.user.id, gameId, betAmount);
  }

  @Get('friend/verify/:code')
  @ApiOperation({ summary: 'Vérifier un code de room privée' })
  async verifyFriendCode(@Param('code') code: string) {
    return this.matchmakingService.verifyFriendCode(code);
  }

  @Post('friend/join')
  @ApiOperation({ summary: 'Rejoindre une room privée via code' })
  async joinFriendRoom(@Request() req, @Body('entryCode') entryCode: string) {
    return this.matchmakingService.joinFriendRoom(req.user.id, entryCode);
  }
}
