import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';

class SubmitResultDto {
  @ApiProperty()
  roomId: string;
  @ApiProperty()
  claimedWinnerId: string;
  @ApiProperty()
  screenshotUrl: string;
}

@ApiTags('Rooms')
@ApiBearerAuth('JWT-auth')
@Controller('rooms')
@UseGuards(AuthGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post('submit-result')
  @ApiOperation({ summary: 'Soumettre le résultat d un match avec preuve' })
  async submitResult(@Request() req, @Body() dto: SubmitResultDto) {
    return this.roomsService.submitResult(
      dto.roomId,
      req.user.id,
      dto.claimedWinnerId,
      dto.screenshotUrl
    );
  }
}
