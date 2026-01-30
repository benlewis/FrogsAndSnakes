// Setup database schema for production
// Run with: node scripts/setup-db.js
//
// For production, first pull env vars:
//   vercel env pull .env.production.local
//   npm run db:setup -- --env .env.production.local

import pg from 'pg';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
const { Pool } = pg;

// Check for --env flag to load a specific env file
const envFlagIndex = process.argv.indexOf('--env');
if (envFlagIndex !== -1 && process.argv[envFlagIndex + 1]) {
  const envFile = process.argv[envFlagIndex + 1];
  if (existsSync(envFile)) {
    console.log(`Loading environment from ${envFile}`);
    dotenv.config({ path: envFile });
  } else {
    console.error(`Error: Environment file not found: ${envFile}`);
    process.exit(1);
  }
} else if (existsSync('.env.production.local')) {
  console.log('Loading environment from .env.production.local');
  dotenv.config({ path: '.env.production.local' });
} else if (existsSync('.env.local')) {
  console.log('Loading environment from .env.local');
  dotenv.config({ path: '.env.local' });
}

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: POSTGRES_URL or DATABASE_URL environment variable is required');
  console.error('');
  console.error('Usage:');
  console.error('  POSTGRES_URL="postgres://..." node scripts/setup-db.js');
  process.exit(1);
}

const isProduction = connectionString.includes('vercel') || connectionString.includes('neon') || connectionString.includes('supabase') || connectionString.includes('sslmode');

// For production databases with SSL, disable strict certificate verification
if (isProduction) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const pool = new Pool({
  connectionString,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

async function setup() {
  console.log('Connecting to database...');

  try {
    // Create users table
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
    console.log('✓ Created users table');

    // Create completions table
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
    console.log('✓ Created completions table');

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_completions_user_id ON completions(user_id)
    `);
    console.log('✓ Created user_id index');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_completions_puzzle_date ON completions(puzzle_date)
    `);
    console.log('✓ Created puzzle_date index');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_completions_difficulty ON completions(difficulty)
    `);
    console.log('✓ Created difficulty index');

    console.log('');
    console.log('Database setup complete!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();
