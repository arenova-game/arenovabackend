import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class GamesService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll(includeInactive = false) {
    let query = this.supabase.getClient().from('games').select('*');
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('games')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(gameData: any) {
    const { data, error } = await this.supabase
      .getClient()
      .from('games')
      .insert([gameData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: any) {
    const { data, error } = await this.supabase
      .getClient()
      .from('games')
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
      .from('games')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { deleted: true };
  }
}
