import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TournamentsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from('tournaments')
      .select('*, games(name, image_url)')
      .order('start_date', { ascending: true });

    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('tournaments')
      .select('*, tournament_participants(*, profiles(username, avatar_url))')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(tournamentData: any) {
    const { data, error } = await this.supabase
      .getClient()
      .from('tournaments')
      .insert([tournamentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: any) {
    const { data, error } = await this.supabase
      .getClient()
      .from('tournaments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    const { error } = await this.supabase
      .getClient()
      .from('tournaments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { deleted: true };
  }

  async join(tournamentId: string, userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('tournament_participants')
      .insert([{ tournament_id: tournamentId, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
