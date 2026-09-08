import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { GamesService } from './games.service';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Games')
@ApiBearerAuth()
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les jeux' })
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  async findAll(@Query('includeInactive') includeInactive: string) {
    return this.gamesService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer les détails d un jeu' })
  async findOne(@Param('id') id: string) {
    return this.gamesService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Ajouter un nouveau jeu (Admin)' })
  async create(@Body() gameData: any) {
    return this.gamesService.create(gameData);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Mettre à jour un jeu (Admin)' })
  async update(@Param('id') id: string, @Body() updates: any) {
    return this.gamesService.update(id, updates);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Supprimer un jeu (Admin)' })
  async remove(@Param('id') id: string) {
    return this.gamesService.remove(id);
  }
}
