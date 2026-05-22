// Shared data-access helpers for the server-generated Auto level pool.
// Used by both the GET endpoint (api/auto-level-pool.js) and the cron
// generator (api/cron/generate-auto-levels.js).
import crypto from 'crypto';
import { query } from './_db.js';
import {
  DEFAULT_THEMES,
  THEME_KEYS,
  THEME_FIELD_SPEC,
  generateLevelsFromTheme,
} from '../lib/autoLevelGenerator.js';

// Default per-tier target pool size if the admin hasn't set one.
export const DEFAULT_TARGET = 100;

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
  // Per-tier generation parameter overrides + target pool size. `params`
  // holds only the fields the admin changed; they're merged over
  // DEFAULT_THEMES at generation time.
  await query(`
    CREATE TABLE IF NOT EXISTS auto_level_config (
      theme_key VARCHAR(64) PRIMARY KEY,
      params JSONB NOT NULL DEFAULT '{}'::jsonb,
      target INTEGER NOT NULL DEFAULT ${DEFAULT_TARGET},
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  schemaReady = true;
}

// MARK: - Config (per-tier params + target)

function clampInt(value, min, max, fallback) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// Validate/clamp a partial params object against THEME_FIELD_SPEC so a bad
// admin edit can't produce an unsolvable recipe or a runaway BFS. Returns a
// clean object containing only known fields.
export function validateThemeParams(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  for (const spec of THEME_FIELD_SPEC) {
    if (!(spec.key in input)) continue;
    const v = input[spec.key];
    if (spec.kind === 'int') {
      out[spec.key] = clampInt(v, spec.min, spec.max, spec.min);
    } else if (spec.kind === 'intOrNull') {
      out[spec.key] = v === null || v === '' ? null : clampInt(v, spec.min, spec.max, spec.min);
    } else if (spec.kind === 'range') {
      if (!Array.isArray(v) || v.length !== 2) continue;
      let lo = clampInt(v[0], spec.min, spec.max, spec.min);
      let hi = clampInt(v[1], spec.min, spec.max, spec.max);
      if (lo > hi) [lo, hi] = [hi, lo];
      out[spec.key] = [lo, hi];
    }
  }
  return out;
}

// Returns the effective config per tier: defaults merged with DB overrides,
// plus the `target` pool size. Shape:
//   { auto1: { ...themeFields, target }, ... }
export async function getEffectiveConfig() {
  await ensurePoolSchema();
  const rows = (await query(`SELECT theme_key, params, target FROM auto_level_config`)).rows;
  const overrides = {};
  for (const row of rows) overrides[row.theme_key] = row;

  const out = {};
  for (const key of THEME_KEYS) {
    const o = overrides[key];
    out[key] = {
      ...DEFAULT_THEMES[key],
      ...(o ? validateThemeParams(o.params) : {}),
      target: o ? clampInt(o.target, 1, 5000, DEFAULT_TARGET) : DEFAULT_TARGET,
    };
  }
  return out;
}

// Persists overrides for one or more tiers. `themes` is a map of
// { themeKey: { ...themeFields, target } }. Unknown tiers are ignored.
export async function saveConfig(themes) {
  await ensurePoolSchema();
  if (!themes || typeof themes !== 'object') return;
  for (const [key, cfg] of Object.entries(themes)) {
    if (!DEFAULT_THEMES[key] || !cfg || typeof cfg !== 'object') continue;
    const { target, ...rawParams } = cfg;
    const params = validateThemeParams(rawParams);
    const t = clampInt(target, 1, 5000, DEFAULT_TARGET);
    await query(
      `INSERT INTO auto_level_config (theme_key, params, target, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (theme_key)
       DO UPDATE SET params = $2, target = $3, updated_at = CURRENT_TIMESTAMP`,
      [key, JSON.stringify(params), t]
    );
  }
}

// MARK: - Generation pass (shared by cron + manual admin trigger)

// Tops up the pool until `deadlineMs`, most-starved-first. If
// `onlyThemeKey` is given, only that tier is generated. If `count` is given,
// generates exactly that many NEW levels for each in-scope tier (ignoring the
// configured pool target); otherwise fills each tier up to its target.
// Returns a map of { themeKey: countAdded }.
export async function runGenerationPass({ deadlineMs, onlyThemeKey, count } = {}) {
  await ensurePoolSchema();
  const config = await getEffectiveConfig();
  const added = {};
  const fixedCount = Number.isInteger(count) && count > 0 ? count : null;

  while (Date.now() < deadlineMs) {
    const counts = await poolCounts();

    let target = null;
    let lowest = Infinity;
    for (const key of THEME_KEYS) {
      if (onlyThemeKey && key !== onlyThemeKey) continue;
      const have = (counts[key] || 0) + (added[key] || 0);
      // In fixed-count mode, rank by how many we've already added (round-robin
      // across tiers); otherwise rank by absolute pool size (most-starved).
      const remaining = fixedCount != null ? fixedCount - (added[key] || 0) : config[key].target - have;
      const rank = fixedCount != null ? (added[key] || 0) : have;
      if (remaining > 0 && rank < lowest) {
        lowest = rank;
        target = key;
      }
    }
    if (!target) break; // every (selected) tier has reached its goal

    // Small chunks so we re-check the deadline frequently — a single
    // Expert level can take many seconds.
    const remaining = fixedCount != null
      ? fixedCount - (added[target] || 0)
      : config[target].target - ((counts[target] || 0) + (added[target] || 0));
    const chunk = Math.min(remaining, 5);
    const levels = generateLevelsFromTheme(config[target], chunk, deadlineMs);

    let chunkAdded = 0;
    for (const level of levels) {
      if (await insertLevel(target, level)) chunkAdded++;
    }
    added[target] = (added[target] || 0) + chunkAdded;

    if (levels.length === 0) break; // deadline hit mid-generation
  }

  return added;
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
