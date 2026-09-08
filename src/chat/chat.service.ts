import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class ChatService {
  constructor(private readonly supabase: SupabaseService) {}

  async getMessages(channelId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('messages')
      .select('*, profiles(username, avatar_url)')
      .eq('channel_id', channelId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  async sendMessage(userId: string, channelId: string, content: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('messages')
      .insert([{ 
        user_id: userId, 
        channel_id: channelId, 
        content 
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
