import { THEME_KEYS, generateLevelsUntil } from '../../lib/autoLevelGenerator.js';
import { ensurePoolSchema, insertLevel, poolCounts } from '../_autoPool.js';

// Target pool size per tier. The cron tops each theme up to this many
// cached levels. Easy tiers fill in seconds; Expert (auto6) is slow
// (tens of seconds per level) so it accumulates over many cron runs.
const TARGET_PER_THEME = 100;

// How long a single invocation is allowed to spend generating before it
// stops and returns. Kept under the function's maxDuration (see the
// `config` export) so we always exit cleanly rather than being killed
// mid-insert by the platform timeout.
const TIME_BUDGET_MS = 50_000;

// Vercel functions: allow up to 60s (Pro plans can raise maxDuration;
// Hobby caps lower and the TIME_BUDGET_MS guard handles early exit).
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // Vercel injects `Authorization: Bearer <CRON_SECRET>` on scheduled
  // invocations when CRON_SECRET is set. Reject anything else so randoms
  // can't trigger expensive generation. If the secret isn't configured
  // (e.g. local dev), allow through.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  const start = Date.now();
  const deadline = start + TIME_BUDGET_MS;

  try {
    await ensurePoolSchema();

    const added = {};
    let totalAdded = 0;

    // Most-starved-first: each pass picks the theme furthest below target
    // and generates a chunk for it, then re-evaluates. This keeps every
    // tier progressing instead of letting one theme hog the whole budget,
    // while still naturally front-loading the cheap (fast) tiers since
    // they reach the target almost immediately.
    while (Date.now() < deadline) {
      const counts = await poolCounts();

      let target = null;
      let lowest = Infinity;
      for (const key of THEME_KEYS) {
        const have = (counts[key] || 0) + (added[key] || 0);
        if (have < TARGET_PER_THEME && have < lowest) {
          lowest = have;
          target = key;
        }
      }
      if (!target) break; // every tier is full

      const need = TARGET_PER_THEME - lowest;
      // Generate in small chunks so we re-check the deadline frequently —
      // a single Expert level can take tens of seconds.
      const chunk = Math.min(need, 5);
      const levels = generateLevelsUntil(target, chunk, deadline);

      let chunkAdded = 0;
      for (const level of levels) {
        if (await insertLevel(target, level)) chunkAdded++;
      }
      added[target] = (added[target] || 0) + chunkAdded;
      totalAdded += chunkAdded;

      // If we asked for levels and got none (deadline hit mid-generation,
      // or the theme is momentarily failing to produce), stop.
      if (levels.length === 0) break;
    }

    const finalCounts = await poolCounts();
    return res.status(200).json({
      ok: true,
      elapsedMs: Date.now() - start,
      added,
      totalAdded,
      counts: finalCounts,
    });
  } catch (error) {
    console.error('Auto level cron failed:', error);
    return res.status(500).json({ error: 'Generation failed: ' + error.message });
  }
}
