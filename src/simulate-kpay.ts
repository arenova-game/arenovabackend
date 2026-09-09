import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { KPayService } from './payments/kpay.service';
import { SupabaseService } from './supabase/supabase.service';

async function simulate() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabase = app.get(SupabaseService);
  const kpayService = app.get(KPayService);

  const client = supabase.getClient();

  console.log('🚀 Démarrage de la simulation K-Pay...');

  // 1. Créer un utilisateur de test si aucun n existe
  let { data: user } = await client.from('profiles').select('id, username, ova_balance').limit(1).maybeSingle();

  if (!user) {
    console.log('📝 Aucun utilisateur trouvé. Création d un utilisateur de test "TestPlayer"...');

    // Créer dans Auth
    const { data: authData, error: authError } = await client.auth.admin.createUser({
      email: 'test@arenova.com',
      password: 'password123',
      user_metadata: { username: 'TestPlayer' },
      email_confirm: true
    });

    if (authError || !authData.user) {
      console.error('❌ Impossible de créer l utilisateur auth:', authError?.message);
      await app.close();
      return;
    }

    // Créer dans Profiles (Normalement géré par un trigger, mais on assure le coup)
    const { data: profileData, error: profError } = await client.from('profiles').insert({
      id: authData.user.id,
      username: 'TestPlayer',
      ova_balance: 0,
      ova_escrow: 0
    }).select().single();

    if (profError) {
      console.error('❌ Erreur insertion profil:', profError.message);
      await app.close();
      return;
    }
    user = profileData;
  }

  console.log(`👤 Utilisateur cible : ${user?.username} (Solde actuel: ${user?.ova_balance} OVA)`);

  // 2. Créer une transaction PENDING
  console.log('📝 Création d une transaction en attente de 5000 FCFA...');
  const { data: transaction, error: txError } = await client.from('transactions').insert({
    user_id: user?.id,
    amount_fcfa: 5000,
    amount_ova: 5000,
    type: 'DEPOSIT',
    status: 'PENDING',
    payment_method: 'KPAY',
    phone_number: '690000000'
  }).select().single();

  if (txError) {
    console.error('❌ Erreur création transaction:', txError.message);
    await app.close();
    return;
  }

  console.log(`✅ Transaction créée ID: ${transaction.id}`);

  // 3. Simulation du Webhook
  console.log('🔗 Simulation du Webhook K-Pay (Paiement Réussi)...');
  await kpayService.handleWebhook({
    reference: transaction.id,
    status: 'SUCCESS',
    kpay_reference: 'KPAY-SIM-' + Date.now()
  });

  // 4. Résultat
  const { data: updatedUser } = await client.from('profiles').select('ova_balance').eq('id', user?.id).single();

  console.log('\n--------------------------------------------------');
  console.log(`🎉 RÉSULTAT DE LA SIMULATION :`);
  console.log(`💰 Ancien Solde  : ${user?.ova_balance} OVA`);
  console.log(`💰 Nouveau Solde : ${updatedUser?.ova_balance} OVA`);
  console.log(`✅ Status Transaction : SUCCESS`);
  console.log('--------------------------------------------------\n');

  await app.close();
}

simulate().catch(err => {
  console.error('❌ Erreur fatale simulation:', err);
});
