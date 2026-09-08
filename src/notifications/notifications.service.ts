import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async getMyNotifications(userId: string) {
    const { data, error } = await this.supabase.getClient().from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }

  async markAsRead(notificationId: string) {
    await this.supabase.getClient().from('notifications').update({ is_read: true }).eq('id', notificationId);
  }

  // --- NOUVEAU : ENVOI ADMIN ---
  async sendToUser(userId: string, title: string, message: string, type = 'admin_msg') {
    const { data, error } = await this.supabase.getClient().from('notifications').insert([
      { user_id: userId, title, message, type, is_read: false }
    ]).select().single();
    
    if (error) throw error;
    return data;
  }

  async broadcast(title: string, message: string, type = 'broadcast') {
    // Récupérer tous les IDs d'utilisateurs
    const { data: users } = await this.supabase.getClient().from('profiles').select('id');
    if (!users) return;

    const notifications = users.map(u => ({
      user_id: u.id,
      title,
      message,
      type,
      is_read: false
    }));

    await this.supabase.getClient().from('notifications').insert(notifications);
    return { count: users.length };
  }

  // --- RESEND & TELEGRAM ---
  async sendWelcomeEmail(email: string, username: string, referralCode: string) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) return;
    try {
      await axios.post('https://api.resend.com/emails', {
        from: 'ARENovA <no-reply@arenova.com>',
        to: email,
        subject: 'Bienvenue sur ARENovA ! 🎮',
        html: `<h1>Bienvenue ${username} !</h1><p>Ton code : ${referralCode}</p>`
      }, { headers: { Authorization: `Bearer ${apiKey}` } });
    } catch (e) { this.logger.error(e.message); }
  }

  async sendAdminAlert(message: string) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.configService.get<string>('TELEGRAM_CHAT_ID');
    if (token && chatId) {
      try { await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, { chat_id: chatId, text: `🚀 ${message}` }); }
      catch (e) { this.logger.error(e.message); }
    }
  }
}
