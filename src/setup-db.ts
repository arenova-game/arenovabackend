import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SupabaseService } from './supabase/supabase.service';

async function setup() {
  console.log('🚀 INITIALISATION DE LA BASE DE DONNÉES SUPABASE...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabase = app.get(SupabaseService);
  const client = supabase.getClient();

  const sql = `
    -- 1. Extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    -- 2. Types ENUM
    DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'room_status') THEN
            CREATE TYPE room_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISPUTED', 'CANCELLED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
            CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'ESCROW_LOCK', 'ESCROW_RELEASE', 'MATCH_WIN_PAYOUT');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_status') THEN
            CREATE TYPE transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');
        END IF;
    END $$;

    -- 3. Table Profiles
    CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        avatar_url TEXT,
        ova_balance NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
        ova_escrow NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 4. Table Games
    CREATE TABLE IF NOT EXISTS public.games (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title TEXT NOT NULL,
        image_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 5. Table Matchmaking Queue
    CREATE TABLE IF NOT EXISTS public.matchmaking_queue (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
        game_id UUID REFERENCES public.games(id),
        stake_amount NUMERIC(10, 2) NOT NULL,
        player_elo INT DEFAULT 1000 NOT NULL,
        status VARCHAR(20) DEFAULT 'WAITING',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 6. Table Game Rooms
    CREATE TABLE IF NOT EXISTS public.game_rooms (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        game_id UUID REFERENCES public.games(id),
        stake_amount NUMERIC(10, 2) NOT NULL,
        total_prize_pool NUMERIC(10, 2) NOT NULL,
        player1_id UUID REFERENCES public.profiles(id),
        player2_id UUID REFERENCES public.profiles(id),
        winner_id UUID REFERENCES public.profiles(id),
        status room_status DEFAULT 'PENDING',
        admin_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 7. Table Room Proofs
    CREATE TABLE IF NOT EXISTS public.room_proofs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE,
        user_id UUID REFERENCES public.profiles(id),
        claimed_winner_id UUID REFERENCES public.profiles(id),
        screenshot_url TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 8. Table Transactions
    CREATE TABLE IF NOT EXISTS public.transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES public.profiles(id),
        amount_fcfa NUMERIC(10, 2) NOT NULL,
        amount_ova NUMERIC(10, 2) NOT NULL,
        type transaction_type NOT NULL,
        status transaction_status DEFAULT 'PENDING',
        payment_method VARCHAR(50),
        payment_reference VARCHAR(100) UNIQUE,
        phone_number VARCHAR(20),
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- 9. FONCTIONS RPC ATOMIQUES
    CREATE OR REPLACE FUNCTION fn_hold_escrow(p_user_id UUID, p_amount NUMERIC)
    RETURNS VOID AS $$
    BEGIN
        UPDATE public.profiles
        SET ova_balance = ova_balance - p_amount,
            ova_escrow = ova_escrow + p_amount
        WHERE id = p_user_id AND ova_balance >= p_amount;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Solde insuffisant pour bloquer le séquestre';
        END IF;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION fn_release_escrow(p_user_id UUID, p_amount NUMERIC)
    RETURNS VOID AS $$
    BEGIN
        UPDATE public.profiles
        SET ova_balance = ova_balance + p_amount,
            ova_escrow = ova_escrow - p_amount
        WHERE id = p_user_id AND ova_escrow >= p_amount;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION fn_credit_winner(p_winner_id UUID, p_amount NUMERIC)
    RETURNS VOID AS $$
    BEGIN
        UPDATE public.profiles
        SET ova_balance = ova_balance + p_amount
        WHERE id = p_winner_id;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION fn_consume_escrow(p_user_id UUID, p_amount NUMERIC)
    RETURNS VOID AS $$
    BEGIN
        UPDATE public.profiles
        SET ova_escrow = ova_escrow - p_amount
        WHERE id = p_user_id AND ova_escrow >= p_amount;
    END;
    $$ LANGUAGE plpgsql;
  `;

  // Note: Supabase JS client doesn't support raw SQL execution easily
  // without creating a custom RPC for it, which is a chicken-and-egg problem.
  // We will assume the user has run the SQL manually or we try to use it if available.

  // BUT we can use the 'rpc' to call a 'exec_sql' function if it exists.
  // Since it doesn't, I will just report to the user that they MUST run the SQL first.

  console.log('⚠️ ATTENTION : Vous DEVEZ copier/coller le contenu SQL du rapport dans l éditeur SQL de Supabase.');
  console.log('Le script JS ne peut pas créer de tables directement via l API client pour des raisons de sécurité.');

  await app.close();
}

setup();
