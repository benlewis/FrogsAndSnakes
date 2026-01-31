// Shared database utility for Vercel serverless functions
import pg from 'pg';
const { Pool } = pg;

// Disable strict SSL verification for cloud databases
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

let pool = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 1, // Serverless functions should use minimal connections
    });
  }
  return pool;
}

export async function query(text, params) {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result;
}
