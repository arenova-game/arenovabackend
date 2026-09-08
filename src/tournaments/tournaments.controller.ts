import { Controller, Get, Post, Param, UseGuards, Request, Body, Patch, Delete } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Tournaments')
@ApiBearerAuth()
@Controller('tournaments')
@UseGuards(AuthGuard)
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les tournois' })
  async findAll() {
    return this.tournamentsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails d un tournoi spécifique' })
  async findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Créer un nouveau tournoi (Admin)' })
  async create(@Body() tournamentData: any) {
    return this.tournamentsService.create(tournamentData);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Mettre à jour un tournoi (Admin)' })
  async update(@Param('id') id: string, @Body() updates: any) {
    return this.tournamentsService.update(id, updates);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Supprimer un tournoi (Admin)' })
  async remove(@Param('id') id: string) {
    return this.tournamentsService.remove(id);
  }

  @Post(':id/join')
  @ApiOperation({ summary: 'Rejoindre un tournoi' })
  async join(@Param('id') id: string, @Request() req) {
    return this.tournamentsService.join(id, req.user.id);
  }
}
