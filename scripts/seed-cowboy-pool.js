// Seed the "Cowboy" tier of the server level pool with a curated curriculum:
//
//   1. The hand-crafted teaching levels (board → ride → hop off), inserted
//      first so the pool's oldest-id-first ordering opens with the tutorial.
//   2. 20 levels at par 10–15, then 20 at par 15–20, then 20 ramping from
//      ~20 up past 30 — each band inserted in ascending-par order so the
//      difficulty climbs smoothly as the client pages through the pool.
//
// Every Cowboy level carries a rideable saddle (snakeLength 3–4 guarantees an
// eligible snake, and `saddles: true` puts a saddle on one). Levels are stored
// in the iOS `Level` JSON shape, same as the other tiers.
//
// Usage (needs DATABASE_URL reachable — see .env.local):
//   node scripts/seed-cowboy-pool.js          # seed once
//   node scripts/seed-cowboy-pool.js --force   # add another curriculum pass
import dotenv from 'dotenv';
dotenv.config({ path: new URL('../.env.local', import.meta.url).pathname });

import { ensurePoolSchema, insertLevel, poolCounts } from '../api/_autoPool.js';
import { query } from '../api/_db.js';
import { DEFAULT_THEMES, COWBOY_TEACHING_LEVELS, generateLevelsFromTheme } from '../lib/autoLevelGenerator.js';

const THEME = 'cowboy';
const force = process.argv.includes('--force');

// Collect `n` accepted levels in the given par band (within `budgetMs`), then
// insert them ascending-by-par so the pool id order ramps in difficulty.
async function seedBand(label, parRange, n, budgetMs, extra = {}) {
  const theme = { ...DEFAULT_THEMES[THEME], parRange, ...extra };
  const deadline = Date.now() + budgetMs;
  const collected = [];
  while (collected.length < n && Date.now() < deadline) {
    const batch = generateLevelsFromTheme(theme, n - collected.length, deadline);
    if (batch.length === 0) break;
    collected.push(...batch);
  }
  collected.sort((a, b) => a.par - b.par);
  let inserted = 0;
  for (const lvl of collected) if (await insertLevel(THEME, lvl)) inserted++;
  console.log(`  band ${label}: collected ${collected.length}/${n}, inserted ${inserted}` +
    (collected.length ? `, pars=[${collected.map((l) => l.par).join(', ')}]` : ''));
  return inserted;
}

async function main() {
  await ensurePoolSchema();

  const before = (await poolCounts())[THEME] || 0;
  console.log(`Cowboy pool currently holds ${before} level(s).`);

  // 1) Teaching levels first (idempotent: insertLevel dedupes by content hash).
  let taught = 0;
  for (const lvl of COWBOY_TEACHING_LEVELS) if (await insertLevel(THEME, lvl)) taught++;
  console.log(`Teaching levels: +${taught} inserted (${COWBOY_TEACHING_LEVELS.length} total).`);

  if (before >= 60 && !force) {
    console.log('Pool already seeded (>=60). Skipping band generation — pass --force to add another pass.');
  } else {
    console.log('Generating bands (this takes a few minutes; the 30+ band is slowest)…');
    // 2a) 20 @ 10–15, 2b) 20 @ 15–20.
    await seedBand('10-15', [10, 15], 20, 60_000);
    await seedBand('15-20', [15, 20], 20, 150_000);
    // 2c) 20 ramping 20 → 30+, in rising sub-bands of 5. A far frog↔pad
    //     prefilter keeps the slow high-par search from thrashing.
    await seedBand('20-23', [20, 23], 5, 120_000, { minTotalFrogToPadDistance: 10 });
    await seedBand('24-27', [24, 27], 5, 150_000, { minTotalFrogToPadDistance: 11 });
    await seedBand('28-31', [28, 31], 5, 210_000, { minTotalFrogToPadDistance: 12 });
    await seedBand('32-36', [32, 36], 5, 300_000, { minTotalFrogToPadDistance: 13 });
  }

  // Report final state + par distribution in pool (id) order.
  const after = (await poolCounts())[THEME] || 0;
  const dist = await query(
    `SELECT par, COUNT(*)::int AS n FROM auto_level_pool WHERE theme_key = $1 GROUP BY par ORDER BY par`,
    [THEME]
  );
  console.log(`\nCowboy pool now holds ${after} level(s). Par distribution:`);
  for (const r of dist.rows) console.log(`  par ${String(r.par).padStart(3)}: ${'█'.repeat(r.n)} ${r.n}`);

  process.exit(0);
}

main().catch((e) => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});
