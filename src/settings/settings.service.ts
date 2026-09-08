import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SettingsService {
  constructor(private readonly supabase: SupabaseService) {}

  async findAll() {
    const { data, error } = await this.supabase.getClient().from('platform_settings').select('*');
    if (error) throw error;
    return data;
  }

  async update(key: string, value: any) {
    const { data, error } = await this.supabase
      .getClient()
      .from('platform_settings')
      .update({ value, updated_at: new Date() })
      .eq('key', key)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
