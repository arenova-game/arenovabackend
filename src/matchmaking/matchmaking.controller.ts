import { Controller, Post, Get, Body, Param, UseGuards, Request, Query, Patch } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('Matchmaking')
@ApiBearerAuth('JWT-auth')
@Controller('matchmaking')
@UseGuards(AuthGuard)
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Post('auto')
  @ApiOperation({ summary: 'Rejoindre une file d attente automatique' })
  async joinAutoMatch(
    @Request() req, 
    @Body('gameId') gameId: string, 
    @Body('betAmount') betAmount: number
  ) {
    return this.matchmakingService.joinAutoMatchmaking(gameId, req.user.id, betAmount);
  }

  @Post('friend/create')
  @ApiOperation({ summary: 'Créer une partie privée (ami) avec code' })
  async createFriendMatch(
    @Request() req, 
    @Body('gameId') gameId: string, 
    @Body('betAmount') betAmount: number,
    @Body('isExternal') isExternal?: boolean,
    @Body('playerPseudo') playerPseudo?: string
  ) {
    return this.matchmakingService.createFriendRoom(gameId, req.user.id, betAmount, isExternal, playerPseudo);
  }

  @Get('friend/verify/:code')
  @ApiOperation({ summary: 'Vérifier la validité d un code de partie sans la rejoindre' })
  async verifyFriendCode(@Param('code') code: string) {
    return this.matchmakingService.getRoomByCode(code);
  }

  @Post('friend/join')
  @ApiOperation({ summary: 'Rejoindre une partie privée via un code' })
  async joinFriendMatch(
    @Request() req, 
    @Body('entryCode') entryCode: string
  ) {
    return this.matchmakingService.joinFriendRoom(entryCode, req.user.id);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Clôturer un match et distribuer les OVA au gagnant' })
  async completeMatch(
    @Body('roomId') roomId: string,
    @Body('winnerId') winnerId: string
  ) {
    return this.matchmakingService.completeMatch(roomId, winnerId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Récupérer l historique des parties (personnel ou global)' })
  @ApiQuery({ name: 'global', required: false, type: String, description: 'Passer "true" pour l historique de toute la plateforme' })
  async getHistory(@Request() req, @Query('global') global: string) {
    return this.matchmakingService.getHistory(req.user.id, global === 'true');
  }

  @Patch('cancel/:id')
  @ApiOperation({ summary: 'Annuler une recherche de partie' })
  async cancelMatch(@Request() req, @Param('id') id: string) {
    return this.matchmakingService.cancelSearch(id, req.user.id);
  }
}
