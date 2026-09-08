import { Controller, Post, Get, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { ProofsService } from './proofs.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Proofs')
@ApiBearerAuth('JWT-auth')
@Controller('proofs')
@UseGuards(AuthGuard)
export class ProofsController {
  constructor(private readonly proofsService: ProofsService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Envoyer une preuve de victoire (image URL)' })
  async submitProof(
    @Request() req,
    @Body('matchId') matchId: string,
    @Body('proofUrl') proofUrl: string,
  ) {
    return this.proofsService.submitProof(matchId, req.user.id, proofUrl);
  }

  @Get('pending')
  @Roles('admin')
  @ApiOperation({ summary: 'Lister les preuves en attente de validation (Admin)' })
  async getPendingProofs() {
    return this.proofsService.getPendingProofs();
  }

  @Patch(':id/validate')
  @Roles('admin')
  @ApiOperation({ summary: 'Approuver ou rejeter une preuve (Admin)' })
  async validateProof(
    @Param('id') id: string,
    @Body('status') status: 'approved' | 'rejected',
    @Request() req,
  ) {
    return this.proofsService.validateProof(id, status, req.user?.id);
  }
}
