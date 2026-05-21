// Shared data-access helpers for the server-generated Auto level pool.
// Used by both the GET endpoint (api/auto-level-pool.js) and the cron
// generator (api/cron/generate-auto-levels.js).
import crypto from 'crypto';
import { query } from './_db.js';

// Schema is created on first call via IF NOT EXISTS so production
// deployments don't need a separate migration step (matches the pattern
// used by api/auto-level-ratings.js).
let schemaReady = false;
export async function ensurePoolSchema() {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS auto_level_pool (
      id SERIAL PRIMARY KEY,
      theme_key VARCHAR(64) NOT NULL,
      level JSONB NOT NULL,
      par INTEGER,
      level_hash VARCHAR(64) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_auto_pool_theme ON auto_level_pool(theme_key)`);
  schemaReady = true;
}

// Stable content hash so the same layout isn't stored twice.
export function levelHash(level) {
  return crypto.createHash('sha256').update(JSON.stringify(level)).digest('hex');
}

// Returns { auto1: n, auto2: n, ... } counts per theme.
export async function poolCounts() {
  const r = await query(`SELECT theme_key, COUNT(*)::int AS n FROM auto_level_pool GROUP BY theme_key`);
  const counts = {};
  for (const row of r.rows) counts[row.theme_key] = row.n;
  return counts;
}

// Inserts a level; returns true if a new row was written, false if it was
// a duplicate (or insert failed silently on conflict).
export async function insertLevel(themeKey, level) {
  const r = await query(
    `INSERT INTO auto_level_pool (theme_key, level, par, level_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (level_hash) DO NOTHING`,
    [themeKey, JSON.stringify(level), Number.isInteger(level.par) ? level.par : null, levelHash(level)]
  );
  return r.rowCount > 0;
}

// Returns up to `limit` random levels for a theme.
export async function fetchRandom(themeKey, limit) {
  const r = await query(
    `SELECT level FROM auto_level_pool WHERE theme_key = $1 ORDER BY random() LIMIT $2`,
    [themeKey, limit]
  );
  return r.rows.map((row) => row.level);
}
