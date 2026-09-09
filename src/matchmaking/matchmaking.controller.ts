import { Controller, Post, Body, UseGuards, Request, Patch, Param } from '@nestjs/common';
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
}
