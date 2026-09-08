import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Rewards')
@ApiBearerAuth()
@Controller('rewards')
@UseGuards(AuthGuard)
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister mes récompenses obtenues' })
  async getMyRewards(@Request() req) {
    return this.rewardsService.getMyRewards(req.user.id);
  }

  @Post('claim-daily')
  @ApiOperation({ summary: 'Réclamer la récompense quotidienne' })
  async claimDaily(@Request() req) {
    return this.rewardsService.claimDailyReward(req.user.id);
  }
}
