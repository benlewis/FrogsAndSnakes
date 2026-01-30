// Database connection utility
// Uses local Postgres in development, Vercel Postgres in production

import pg from 'pg';
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

  console.log('Database schema initialized');
}
