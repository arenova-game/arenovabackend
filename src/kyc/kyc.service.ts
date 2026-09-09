import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class KycService {
  constructor(private readonly supabase: SupabaseService) {}

  async submitKyc(userId: string, documentUrl: string, fullName: string) {
    const client = this.supabase.getClient();

    const { error } = await client.from('profiles').update({
      kyc_status: 'PENDING',
      kyc_document_url: documentUrl,
      full_name: fullName,
    }).eq('id', userId);

    if (error) throw new BadRequestException('Erreur lors de la soumission du KYC');

    return { message: 'KYC soumis avec succès, en attente de validation.' };
  }

  async validateKyc(userId: string, status: 'VERIFIED' | 'REJECTED', adminNote?: string) {
    const client = this.supabase.getClient();

    const { error } = await client.from('profiles').update({
      kyc_status: status,
      kyc_notes: adminNote,
    }).eq('id', userId);

    if (error) throw new BadRequestException('Erreur lors de la validation du KYC');

    return { message: `Profil mis à jour avec le statut : ${status}` };
  }
}
