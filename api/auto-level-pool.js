import { ensurePoolSchema, fetchRandom, poolCounts } from './_autoPool.js';

function clampInt(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

// GET /api/auto-level-pool?themeKey=auto6&limit=10
//   → { levels: [Level, ...] }  (random selection from the server pool)
// GET /api/auto-level-pool?counts=true
//   → { counts: { auto1: n, ... } }  (debug/monitoring)
//
// Levels are stored in the iOS app's Swift `Level` JSON shape, so the
// client can decode them directly with no transformation.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await ensurePoolSchema();

    if (String(req.query.counts || '') === 'true') {
      return res.status(200).json({ counts: await poolCounts() });
    }

    const themeKey = String(req.query.themeKey || '').trim();
    const limit = clampInt(parseInt(req.query.limit, 10), 1, 50, 10);
    if (!themeKey) return res.status(400).json({ error: 'themeKey required' });

    const levels = await fetchRandom(themeKey, limit);
    return res.status(200).json({ levels });
  } catch (error) {
    console.error('Error fetching auto level pool:', error);
    return res.status(500).json({ error: 'Failed to fetch pool: ' + error.message });
  }
}
