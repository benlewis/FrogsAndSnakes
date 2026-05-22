import { poolCounts, runGenerationPass } from '../_autoPool.js';

// How long a single invocation is allowed to spend generating before it
// stops and returns, kept under maxDuration so we exit cleanly rather than
// being killed mid-insert by the platform timeout.
const TIME_BUDGET_MS = 50_000;

// Vercel functions: allow up to 60s (Pro plans can raise maxDuration;
// Hobby caps lower and the time-budget guard handles early exit).
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
  try {
    // Per-tier targets and generation params come from the (DB-backed)
    // effective config inside runGenerationPass, so admin edits drive the
    // cron automatically.
    const added = await runGenerationPass({ deadlineMs: start + TIME_BUDGET_MS });
    return res.status(200).json({
      ok: true,
      elapsedMs: Date.now() - start,
      added,
      counts: await poolCounts(),
    });
  } catch (error) {
    console.error('Auto level cron failed:', error);
    return res.status(500).json({ error: 'Generation failed: ' + error.message });
  }
}
