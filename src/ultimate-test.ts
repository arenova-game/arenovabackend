import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MatchmakingService } from './matchmaking/matchmaking.service';
import { WalletService } from './wallet/wallet.service';
import { RoomsService } from './rooms/rooms.service';
import { SupabaseService } from './supabase/supabase.service';
import { KycService } from './kyc/kyc.service';

async function runUltimateTest() {
  console.log('--- 🛡️ DÉMARRAGE DE L ULTIMATE INTEGRATION TEST ---');
  const app = await NestFactory.createApplicationContext(AppModule);

  const supabase = app.get(SupabaseService);
  const matchmaking = app.get(MatchmakingService);
  const wallet = app.get(WalletService);
  const rooms = app.get(RoomsService);

  const client = supabase.getClient();

  try {
    // 0. Cleanup
    await client.from('profiles').delete().in('username', ['Test_Sali', 'Test_Marc']);
    await client.from('games').delete().eq('title', 'Test_Game');
    console.log('🧹 Cleanup terminé.');

    // 0b. Créer un jeu de test
    let gameId: string;
    const { data: testGame, error: gameError } = await client.from('games').insert({ title: 'Test_Game', is_active: true }).select().single();
    if (gameError) {
       console.log('⚠️ Erreur insertion jeu (existe déjà?), recherche...');
       const { data: existingGame } = await client.from('games').select('*').eq('title', 'Test_Game').single();
       if (!existingGame) throw new Error('Impossible de trouver ou créer un jeu');
       gameId = existingGame.id;
    } else {
       gameId = testGame.id;
    }

    // 1. Simulation de Création des Joueurs
    console.log('👤 Création de Sali et Marc...');
    const idSali = '00000000-0000-0000-0000-000000000001';
    const idMarc = '00000000-0000-0000-0000-000000000002';

    await client.from('profiles').insert([
      { id: idSali, username: 'Test_Sali', ova_balance: 0, ova_escrow: 0, kyc_status: 'NOT_STARTED' },
      { id: idMarc, username: 'Test_Marc', ova_balance: 0, ova_escrow: 0, kyc_status: 'NOT_STARTED' }
    ]);

    // 1b. Simulation KYC pour Sali
    console.log('🆔 Sali soumet son KYC...');
    const kycService = app.get(KycService);
    await kycService.submitKyc(idSali, 'http://identity.com/sali-id.jpg', 'Sali Nova');

    console.log('👮 L admin valide le KYC de Sali...');
    await kycService.validateKyc(idSali, 'VERIFIED', 'Documents valides');

    // 2. Dépôt Initial (Simulation Webhook K-Pay)
    console.log('💰 Dépôt de 1000 OVA pour Sali et 1000 OVA pour Marc...');
    await wallet.creditDeposit(idSali, 1000);
    await wallet.creditDeposit(idMarc, 1000);

    let balSali = await wallet.getBalance(idSali);
    let balMarc = await wallet.getBalance(idMarc);
    console.log(`✅ Soldes initiaux : Sali=${balSali.ova_balance}, Marc=${balMarc.ova_balance}`);

    // 3. Matchmaking (Mise de 500 OVA)
    console.log('🎮 Entrée en matchmaking (Mise 500 OVA)...');

    // Sali entre en premier
    const resA = await matchmaking.joinQueue(idSali, gameId, 500);
    console.log('⏱️ Sali est en file d attente.');

    // Marc entre et matche avec Sali
    const resB = await matchmaking.joinQueue(idMarc, gameId, 500);
    if (resB.matched) {
      console.log(`🔥 MATCH TROUVÉ ! Room ID: ${resB.room.id}`);

      // 4. Vérifier l Escrow
      balSali = await wallet.getBalance(idSali);
      balMarc = await wallet.getBalance(idMarc);
      console.log(`🔒 Escrow vérifié : Sali=${balSali.ova_balance} (Bloqué:${balSali.ova_escrow}), Marc=${balMarc.ova_balance} (Bloqué:${balMarc.ova_escrow})`);

      if (balSali.ova_escrow !== 500 || balMarc.ova_escrow !== 500) {
        throw new Error('ERREUR : L Escrow n a pas été correctement verrouillé !');
      }

      // 5. Soumission des Preuves (Consensus : Sali Gagne)
      console.log('📸 Envoi des preuves (Sali gagne, Marc confirme sa défaite)...');

      // Sali dit : "J'ai gagné"
      await rooms.submitResult(resB.room.id, idSali, idSali, 'http://proof.com/sali-win.jpg');

      // Marc dit : "Sali a gagné"
      const finalResult = await rooms.submitResult(resB.room.id, idMarc, idSali, 'http://proof.com/marc-loss.jpg');

      console.log(`🏁 Résultat final NestJS : ${finalResult.message}`);

      // 6. Vérification Finale des Soldes
      // Sali doit avoir : 500 (restants) + 900 (gain - 10% commission) = 1400 OVA
      // Marc doit avoir : 500 OVA (restants)
      balSali = await wallet.getBalance(idSali);
      balMarc = await wallet.getBalance(idMarc);

      console.log('\n--------------------------------------------------');
      console.log('🏆 RÉSULTATS DU TEST :');
      console.log(`💰 Solde Final Sali : ${balSali.ova_balance} OVA (Attendu: 1400)`);
      console.log(`💰 Solde Final Marc : ${balMarc.ova_balance} OVA (Attendu: 500)`);
      console.log(`🏦 Escrow Marc      : ${balMarc.ova_escrow} OVA (Attendu: 0)`);

      if (balSali.ova_balance === 1400 && balMarc.ova_balance === 500) {
        console.log('\n✨ TEST RÉUSSI : Toute la chaîne (Wallet -> Matchmaking -> Payout) est valide ! ✨');
      } else {
        console.log('\n❌ TEST ÉCHOUÉ : Les soldes ne correspondent pas.');
      }
      console.log('--------------------------------------------------\n');
    }

  } catch (e) {
    console.error('❌ ERREUR FATALE DURANT LE TEST:', e);
  } finally {
    await app.close();
  }
}

runUltimateTest();
