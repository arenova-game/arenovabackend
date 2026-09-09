import { Controller, Post, Body, UseGuards, Request, Patch, Param } from '@nestjs/common';
import { KycService } from './kyc.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';

class SubmitKycDto {
  @ApiProperty()
  documentUrl: string;
  @ApiProperty()
  fullName: string;
}

class ValidateKycDto {
  @ApiProperty({ enum: ['VERIFIED', 'REJECTED'] })
  status: 'VERIFIED' | 'REJECTED';
  @ApiProperty({ required: false })
  adminNote?: string;
}

@ApiTags('KYC')
@ApiBearerAuth('JWT-auth')
@Controller('kyc')
@UseGuards(AuthGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('submit')
  @ApiOperation({ summary: 'Soumettre ses documents d identité' })
  async submitKyc(@Request() req, @Body() dto: SubmitKycDto) {
    return this.kycService.submitKyc(req.user.id, dto.documentUrl, dto.fullName);
  }

  @Patch('validate/:userId')
  @Roles('admin')
  @ApiOperation({ summary: 'Valider ou rejeter un KYC (Admin)' })
  async validateKyc(@Param('userId') userId: string, @Body() dto: ValidateKycDto) {
    return this.kycService.validateKyc(userId, dto.status, dto.adminNote);
  }
}
