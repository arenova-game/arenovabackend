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
  const kycService = app.get(KycService);

  const client = supabase.getClient();

  try {
    // 0. Cleanup
    console.log('🧹 Cleanup des données de test...');
    await client.from('profiles').delete().in('username', ['Test_Sali', 'Test_Marc']);
    await client.from('games').delete().eq('title', 'Test_Game');

    // 0b. Créer un jeu de test
    console.log('🎮 Création du jeu de test...');
    const { data: testGame, error: gameError } = await client
      .from('games')
      .insert({ title: 'Test_Game', is_active: true })
      .select()
      .maybeSingle();

    if (gameError) {
      console.error('❌ Erreur Supabase (Games):', JSON.stringify(gameError));
    }

    if (!testGame) {
      console.log('⚠️ Échec insertion jeu, recherche d un jeu existant...');
      const { data: allGames, error: listError } = await client.from('games').select('*').limit(5);
      if (listError) console.error('❌ Erreur liste jeux:', JSON.stringify(listError));

      if (!allGames || allGames.length === 0) throw new Error('Aucun jeu trouvé en DB. Avez-vous exécuté le script SQL dans Supabase ?');
      var gameId = allGames[0].id;
    } else {
      var gameId = testGame.id;
    }
    console.log(`✅ Jeu de test ID: ${gameId}`);

    // 1. Simulation de Création des Joueurs
    console.log('👤 Création de Sali et Marc...');
    const idSali = '00000000-0000-0000-0000-000000000001';
    const idMarc = '00000000-0000-0000-0000-000000000002';

    const { error: pError } = await client.from('profiles').insert([
      { id: idSali, username: 'Test_Sali', ova_balance: 0, ova_escrow: 0, kyc_status: 'NOT_STARTED' },
      { id: idMarc, username: 'Test_Marc', ova_balance: 0, ova_escrow: 0, kyc_status: 'NOT_STARTED' }
    ]);
    if (pError) throw new Error('Erreur création profils: ' + pError.message);

    // 1b. Simulation KYC pour Sali
    console.log('🆔 Sali soumet son KYC...');
    await kycService.submitKyc(idSali, 'http://identity.com/sali-id.jpg', 'Sali Nova');
    console.log('👮 L admin valide le KYC de Sali...');
    await kycService.validateKyc(idSali, 'VERIFIED', 'Documents valides');

    // 2. Dépôt Initial (Simulation Webhook K-Pay)
    console.log('💰 Dépôt de 1000 OVA pour Sali et Marc...');
    await wallet.creditDeposit(idSali, 1000);
    await wallet.creditDeposit(idMarc, 1000);

    const balSaliInit = await wallet.getBalance(idSali);
    const balMarcInit = await wallet.getBalance(idMarc);
    console.log(`✅ Soldes initiaux : Sali=${balSaliInit.ova_balance}, Marc=${balMarcInit.ova_balance}`);

    // 3. Matchmaking (Mise de 500 OVA)
    console.log('🎮 Matchmaking (Mise 500 OVA)...');
    await matchmaking.joinQueue(idSali, gameId, 500);
    console.log('⏱️ Sali est en file.');

    const resB = await matchmaking.joinQueue(idMarc, gameId, 500);
    if (resB.matched) {
      console.log(`🔥 MATCH TROUVÉ ! Room ID: ${resB.room.id}`);

      // 4. Vérifier l Escrow
      const balSaliE = await wallet.getBalance(idSali);
      const balMarcE = await wallet.getBalance(idMarc);
      console.log(`🔒 Escrow : Sali=${balSaliE.ova_balance} (Bloqué:${balSaliE.ova_escrow}), Marc=${balMarcE.ova_balance} (Bloqué:${balMarcE.ova_escrow})`);

      if (Number(balSaliE.ova_escrow) !== 500 || Number(balMarcE.ova_escrow) !== 500) {
        throw new Error('ERREUR : L Escrow n est pas correct !');
      }

      // 5. Preuves
      console.log('📸 Envoi des preuves (Sali gagne)...');
      await rooms.submitResult(resB.room.id, idSali, idSali, 'http://proof.com/win.jpg');
      const finalResult = await rooms.submitResult(resB.room.id, idMarc, idSali, 'http://proof.com/loss.jpg');
      console.log(`🏁 Résultat : ${finalResult.message}`);

      // 6. Vérif finale
      const balSaliF = await wallet.getBalance(idSali);
      const balMarcF = await wallet.getBalance(idMarc);

      console.log('\n--------------------------------------------------');
      console.log('🏆 BILAN FINAL :');
      console.log(`💰 Sali : ${balSaliF.ova_balance} OVA (Attendu: 1400)`);
      console.log(`💰 Marc : ${balMarcF.ova_balance} OVA (Attendu: 500)`);

      if (Number(balSaliF.ova_balance) === 1400 && Number(balMarcF.ova_balance) === 500) {
        console.log('\n✨ TEST RÉUSSI AVEC SUCCÈS ! ✨');
      } else {
        console.log('\n❌ TEST ÉCHOUÉ : Calcul des soldes incorrect.');
      }
      console.log('--------------------------------------------------\n');
    } else {
      console.log('❌ Échec Matchmaking: Marc n a pas été matché.');
    }

  } catch (e) {
    console.error('❌ ERREUR DURANT LE TEST:', e);
  } finally {
    console.log('👋 Fermeture de l application...');
    await app.close();
    process.exit(0);
  }
}

runUltimateTest();
