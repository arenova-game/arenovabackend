import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  @UseGuards(AuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Récupérer les informations de l utilisateur connecté' })
  getProfile(@Request() req) {
    return req.user;
  }
}
