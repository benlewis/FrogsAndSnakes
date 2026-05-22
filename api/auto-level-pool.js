import { ensurePoolSchema, fetchRandom, fetchSince, poolCounts, runGenerationPass } from './_autoPool.js';

// The POST (manual generate) branch can run a bounded generation pass.
export const config = { maxDuration: 60 };

// Leave headroom under maxDuration so we always return cleanly.
const MANUAL_BUDGET_MS = 50_000;

function clampInt(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

// GET  /api/auto-level-pool?themeKey=auto6&limit=10
//   → { levels: [Level, ...] }  (random selection from the server pool)
// GET  /api/auto-level-pool?themeKey=auto6&afterId=0&limit=200
//   → { levels: [Level, ...], maxId }  (oldest-first page of levels with
//     id > afterId; the client pages until maxId is null to mirror the whole
//     pool and only pull newly generated levels on later launches)
// GET  /api/auto-level-pool?counts=true
//   → { counts: { auto1: n, ... } }  (status/monitoring)
// POST /api/auto-level-pool  { action: 'generate', themeKey?, count? }
//   → { ok, added, counts, elapsedMs }  (bounded manual run; if themeKey is
//     omitted, runs across all tiers. With `count`, generates that many NEW
//     levels per tier ignoring the target; without it, fills toward target.)
//
// Levels are stored in the iOS app's Swift `Level` JSON shape, so the
// client can decode them directly with no transformation.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    await ensurePoolSchema();

    if (req.method === 'GET') {
      if (String(req.query.counts || '') === 'true') {
        return res.status(200).json({ counts: await poolCounts() });
      }
      const themeKey = String(req.query.themeKey || '').trim();
      if (!themeKey) return res.status(400).json({ error: 'themeKey required' });
      if (req.query.afterId !== undefined) {
        const afterId = clampInt(parseInt(req.query.afterId, 10), 0, Number.MAX_SAFE_INTEGER, 0);
        const limit = clampInt(parseInt(req.query.limit, 10), 1, 500, 200);
        const page = await fetchSince(themeKey, afterId, limit);
        return res.status(200).json(page);
      }
      const limit = clampInt(parseInt(req.query.limit, 10), 1, 50, 10);
      const levels = await fetchRandom(themeKey, limit);
      return res.status(200).json({ levels });
    }

    if (req.method === 'POST') {
      const { action, themeKey, count } = req.body || {};
      if (action !== 'generate') {
        return res.status(400).json({ error: "unsupported action; expected 'generate'" });
      }
      const start = Date.now();
      const added = await runGenerationPass({
        deadlineMs: start + MANUAL_BUDGET_MS,
        onlyThemeKey: themeKey ? String(themeKey) : undefined,
        count: count != null ? clampInt(parseInt(count, 10), 1, 1000, undefined) : undefined,
      });
      return res.status(200).json({
        ok: true,
        added,
        elapsedMs: Date.now() - start,
        counts: await poolCounts(),
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in auto level pool:', error);
    return res.status(500).json({ error: 'Pool error: ' + error.message });
  }
}
