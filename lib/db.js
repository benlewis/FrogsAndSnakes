// Database connection utility
// Uses local Postgres in development, Vercel Postgres in production

import pg from 'pg';
import { seedArtSlots } from './artRegistry.js';
const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
  }
  return pool;
}

export async function query(text, params) {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result;
}

// Initialize database schema
export async function initializeSchema() {
  const pool = getPool();

  // Users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(255) PRIMARY KEY,
      display_name VARCHAR(255),
      email VARCHAR(255),
      picture_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS play_mode VARCHAR(20)`);

  // Completions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS completions (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      puzzle_date DATE NOT NULL,
      difficulty VARCHAR(20) NOT NULL,
      moves INTEGER NOT NULL,
      hints_used INTEGER DEFAULT 0,
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, puzzle_date, difficulty)
    )
  `);
  await pool.query(`ALTER TABLE completions ADD COLUMN IF NOT EXISTS mode VARCHAR(20) NOT NULL DEFAULT 'casual'`);
  await pool.query(`ALTER TABLE completions ADD COLUMN IF NOT EXISTS time_ms INTEGER`);
  await pool.query(`
    ALTER TABLE completions
      DROP CONSTRAINT IF EXISTS completions_user_id_puzzle_date_difficulty_key
  `);
  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'completions_user_puzzle_diff_mode_key'
      ) THEN
        ALTER TABLE completions
          ADD CONSTRAINT completions_user_puzzle_diff_mode_key
          UNIQUE (user_id, puzzle_date, difficulty, mode);
      END IF;
    END$$;
  `);

  // Index for faster queries
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_completions_user_id ON completions(user_id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_completions_puzzle_date ON completions(puzzle_date)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_completions_difficulty ON completions(difficulty)
  `);

  // Auto-generated level fun ratings — players rate procedurally generated
  // levels 1-5 after they finish them so we can mine for the best layouts.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auto_level_ratings (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255),
      theme_key VARCHAR(64),
      chapter_id INTEGER,
      level_index INTEGER,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      par INTEGER,
      moves INTEGER,
      level JSONB NOT NULL,
      rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_auto_ratings_theme ON auto_level_ratings(theme_key)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_auto_ratings_rating ON auto_level_ratings(rating DESC, rated_at DESC)
  `);

  // Server-generated level pool — a corpus of pre-solved procedural levels
  // the iOS app downloads instead of generating on-device. Filled by the
  // Vercel cron at /api/cron/generate-auto-levels. `level_hash` dedups
  // identical layouts.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auto_level_pool (
      id SERIAL PRIMARY KEY,
      theme_key VARCHAR(64) NOT NULL,
      level JSONB NOT NULL,
      par INTEGER,
      level_hash VARCHAR(64) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_auto_pool_theme ON auto_level_pool(theme_key)
  `);

  // Per-tier generation parameter overrides + target pool size, editable
  // from the admin Level Pool panel. `params` holds only changed fields,
  // merged over the code defaults at generation time.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auto_level_config (
      theme_key VARCHAR(64) PRIMARY KEY,
      params JSONB NOT NULL DEFAULT '{}'::jsonb,
      target INTEGER NOT NULL DEFAULT 100,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await initializeArtSchema(pool);

  console.log('Database schema initialized');
}

// Art pipeline schema: registry of replaceable assets (art_slots, mirrored
// from lib/artRegistry.js), per-slot uploads + review state (art_uploads),
// and device pairing "magic numbers" (art_pairing). Shared by dev (here) and
// production (scripts/setup-db.js).
export async function initializeArtSchema(pool) {
  // Artist access to the asset portal is a per-account flag, granted from the
  // /users admin page (api/_artAuth.js resolves roles from it).
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_artist BOOLEAN NOT NULL DEFAULT FALSE`);

  // Long-lived portal sign-ins: ?action=session exchanges an Auth0 login for
  // one of these tokens, valid while used at least every 30 days. Keeps the
  // portal signed in past Auth0's short session lifetime (api/_artAuth.js).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS art_sessions (
      token        VARCHAR(64) PRIMARY KEY,
      user_id      VARCHAR(255) NOT NULL,
      email        VARCHAR(255) NOT NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_art_sessions_user ON art_sessions(user_id)`);

  // Registry of replaceable asset slots — a synced mirror of ART_SLOTS.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS art_slots (
      slot_id      VARCHAR(96) PRIMARY KEY,
      category     VARCHAR(32) NOT NULL,
      display_name VARCHAR(160) NOT NULL,
      spec         JSONB NOT NULL DEFAULT '{}'::jsonb,
      sort_order   INTEGER NOT NULL DEFAULT 0,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Per-slot uploads. status: pending → submitted → approved → finalized
  // (or rejected). The "current" asset for a slot is its highest-version row.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS art_uploads (
      id            SERIAL PRIMARY KEY,
      slot_id       VARCHAR(96) NOT NULL REFERENCES art_slots(slot_id) ON DELETE CASCADE,
      version       INTEGER NOT NULL,
      status        VARCHAR(16) NOT NULL DEFAULT 'pending',
      blob_url      TEXT NOT NULL,
      blob_pathname TEXT,
      content_type  VARCHAR(64),
      width         INTEGER,
      height        INTEGER,
      bytes         INTEGER,
      sha256        VARCHAR(64),
      uploaded_by   VARCHAR(255),
      notes         TEXT,
      review_notes  TEXT,
      reviewed_by   VARCHAR(255),
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      submitted_at  TIMESTAMP,
      reviewed_at   TIMESTAMP,
      finalized_at  TIMESTAMP,
      UNIQUE (slot_id, version)
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_art_uploads_slot ON art_uploads(slot_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_art_uploads_status ON art_uploads(status)`);

  // Device pairing: the "magic number" a player types in app Settings to sync
  // an Auth0 user's in-review assets to their device.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS art_pairing (
      code         VARCHAR(16) PRIMARY KEY,
      user_id      VARCHAR(255) NOT NULL,
      email        VARCHAR(255),
      role         VARCHAR(16) NOT NULL DEFAULT 'artist',
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_used_at TIMESTAMP
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_art_pairing_user ON art_pairing(user_id)`);

  // Sync the registry rows from code.
  const n = await seedArtSlots((text, params) => pool.query(text, params));
  console.log(`✓ Art schema ready (${n} slots seeded)`);
}
