import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class FriendsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getFriends(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('friendships')
      .select('*, friend:profiles!friend_id(id, username, avatar_url, status)')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) throw error;
    return data;
  }

  async sendFriendRequest(userId: string, friendId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('friendships')
      .insert([
        { user_id: userId, friend_id: friendId, status: 'pending' }
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async acceptFriendRequest(userId: string, friendId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('user_id', friendId)
      .eq('friend_id', userId)
      .select()
      .single();

    if (error) throw error;
    
    // Create reverse friendship for bidirectional access
    await this.supabase.getClient().from('friendships').upsert([
        { user_id: userId, friend_id: friendId, status: 'accepted' }
    ]);

    return data;
  }
}
