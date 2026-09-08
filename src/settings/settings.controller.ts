import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
@UseGuards(AuthGuard)
@Roles('admin')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les réglages de la plateforme' })
  findAll() {
    return this.settingsService.findAll();
  }

  @Patch(':key')
  @ApiOperation({ summary: 'Mettre à jour un réglage spécifique' })
  update(@Param('key') key: string, @Body('value') value: any) {
    return this.settingsService.update(key, value);
  }
}
