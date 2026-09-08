import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class RewardsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getMyRewards(userId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('user_rewards')
      .select('*, rewards(*)')
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  }

  async claimDailyReward(userId: string) {
    // Logic for daily rewards (checking last claim date, etc.)
    // For now, a simple placeholder implementation
    const { data, error } = await this.supabase
      .getClient()
      .from('user_rewards')
      .insert([{ user_id: userId, reward_type: 'daily', claimed_at: new Date() }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
