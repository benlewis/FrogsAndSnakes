// Populate the next X days of daily levels.
//
// For each date in the range this generates one level per difficulty using the
// procedural generator (lib/autoLevelGenerator.js) — the same generator and
// BFS par-checker the hourly cron uses — and POSTs each to /api/levels, which
// stores them as Vercel Blobs keyed by date + difficulty (the exact shape the
// web app and iOS app fetch).
//
// Difficulty -> generator tier follows the repo's own THEME_TITLES convention:
//   easy   -> auto1   (par 6-7,   5x5)
//   medium -> auto2   (par 11-14, 5x5)
//   hard   -> auto3   (par 15-17, 5x5)
//   expert -> auto6   (par 30-60, 6x6)   [weekly: Sundays only by default]
//
// Expert is a WEEKLY puzzle: the app fetches it from the most recent Sunday, so
// by default this only generates expert on Sundays in the range. Use
// --expert-daily to force one every day, or --no-expert to skip it.
//
// Usage:
//   # Start the API first (writes go through it):
//   npm run dev:api                       # serves http://localhost:3002
//
//   node scripts/generate-daily-levels.js [days] [options]
//
// Options:
//   days                       number of days to populate (default 7)
//   --start=YYYY-MM-DD         first date (default: today, local time)
//   --difficulties=a,b,c       daily difficulties (default: easy,medium,hard)
//   --expert-daily             generate expert every day, not just Sundays
//   --no-expert                don't generate expert at all
//   --force                    overwrite levels that already exist
//   --prod                     target https://frogsandsnakes.com (default: local)
//   --api=URL                  explicit API base (overrides --prod / default)
//   --timeout=SECONDS          per-level generation budget (default: per-tier)
//   --dry-run                  generate + report, but don't POST anything
//
// Examples:
//   node scripts/generate-daily-levels.js 14
//   node scripts/generate-daily-levels.js 7 --start=2026-07-01 --force
//   node scripts/generate-daily-levels.js 30 --difficulties=easy,medium,hard,expert --expert-daily

import { generateLevel, DEFAULT_THEMES } from '../lib/autoLevelGenerator.js'
import { toWebLevel } from './levelFormat.js'

// --- difficulty -> generator tier (see THEME_TITLES in autoLevelGenerator.js) ---
const DIFFICULTY_THEME = {
  easy: 'auto1',
  medium: 'auto2',
  hard: 'auto3',
  expert: 'auto6',
}

// Per-tier generation budget in ms. The harder tiers run a much deeper BFS per
// candidate and may need many candidates, so they get more wall-clock.
const DEFAULT_TIMEOUT_MS = {
  auto1: 15_000,
  auto2: 20_000,
  auto3: 30_000,
  auto4: 45_000,
  auto5: 60_000,
  auto6: 90_000,
  cowboy: 60_000,
  wizard: 45_000,
  treasure: 45_000,
}

// Wizard/treasure themes have wide native par ranges (wizard 2-12, treasure
// 3-14). When one is used in a difficulty slot, we keep generating until the
// par lands in that slot's band so a daily set still ramps easy < medium < hard.
const MECHANIC_PAR_BANDS = {
  // Wizard chains scale par with grid (2-4 on the 6x6 wizard grid).
  wizard: { easy: [2, 2], medium: [3, 3], hard: [4, 6], expert: [4, 6] },
  // Treasure is a fixed two-frog switch puzzle (par 3).
  treasure: { easy: [3, 3], medium: [3, 4], hard: [3, 6], expert: [3, 6] },
}

// --- arg parsing ---
const args = process.argv.slice(2)
const flags = new Map()
let days = 7
for (const arg of args) {
  if (arg.startsWith('--')) {
    // Split on the FIRST '=' so values may contain '=' (e.g. --themes=easy=wizard).
    const eq = arg.indexOf('=')
    if (eq === -1) flags.set(arg.slice(2), true)
    else flags.set(arg.slice(2, eq), arg.slice(eq + 1))
  } else if (/^\d+$/.test(arg)) {
    days = parseInt(arg, 10)
  } else {
    console.error(`Unrecognized argument: ${arg}`)
    process.exit(1)
  }
}

const PROD_URL = 'https://frogsandsnakes.com'
const LOCAL_URL = 'http://localhost:3002'
const API_BASE = flags.get('api') || (flags.get('prod') ? PROD_URL : LOCAL_URL)
const FORCE = flags.has('force')
const DRY_RUN = flags.has('dry-run')
const EXPERT_DAILY = flags.has('expert-daily')
const NO_EXPERT = flags.has('no-expert')
const TIMEOUT_OVERRIDE = flags.has('timeout') ? parseFloat(flags.get('timeout')) * 1000 : null

const difficulties = (flags.get('difficulties') || 'easy,medium,hard')
  .split(',')
  .map((d) => d.trim())
  .filter(Boolean)

// Per-difficulty theme overrides: --themes=easy=wizard,medium=treasure,hard=wizard
const THEME_OVERRIDES = {}
if (flags.get('themes') && flags.get('themes') !== true) {
  for (const pair of String(flags.get('themes')).split(',')) {
    const [d, theme] = pair.split('=').map((s) => s.trim())
    if (!d || !theme) continue
    if (!DEFAULT_THEMES[theme]) {
      console.error(`Unknown theme "${theme}" in --themes. Known: ${Object.keys(DEFAULT_THEMES).join(', ')}`)
      process.exit(1)
    }
    THEME_OVERRIDES[d] = theme
  }
}
const themeFor = (difficulty) => THEME_OVERRIDES[difficulty] || DIFFICULTY_THEME[difficulty]

// Validate difficulties up front.
for (const d of difficulties) {
  if (!themeFor(d)) {
    console.error(`Unknown difficulty "${d}". Known: ${Object.keys(DIFFICULTY_THEME).join(', ')}`)
    process.exit(1)
  }
}
const wantExpert = !NO_EXPERT && !difficulties.includes('expert')

// --- date helpers (mirror src/App.jsx: local time, YYYY-MM-DD) ---
const localDateString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const startDate = flags.get('start')
  ? new Date(flags.get('start') + 'T12:00:00')
  : new Date()

if (Number.isNaN(startDate.getTime())) {
  console.error(`Invalid --start date: ${flags.get('start')}`)
  process.exit(1)
}

const dateForOffset = (offset) => {
  const d = new Date(startDate)
  d.setDate(d.getDate() + offset)
  return d
}

// --- API ---
async function fetchExistingDifficulties(date) {
  try {
    const res = await fetch(`${API_BASE}/api/levels?date=${date}`)
    if (!res.ok) return new Set()
    const obj = await res.json()
    return new Set(Object.keys(obj || {}))
  } catch {
    return new Set()
  }
}

async function saveLevel(date, difficulty, level) {
  const res = await fetch(`${API_BASE}/api/levels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, difficulty, level }),
  })
  if (!res.ok) throw new Error(`POST failed (${res.status}): ${await res.text()}`)
  return res.json()
}

function generateForDifficulty(difficulty) {
  const themeKey = themeFor(difficulty)
  const budget = TIMEOUT_OVERRIDE ?? DEFAULT_TIMEOUT_MS[themeKey] ?? 30_000
  const band = MECHANIC_PAR_BANDS[themeKey]?.[difficulty] || null
  const start = Date.now()
  const deadline = start + budget

  // For a mechanic theme, keep generating until par lands in the difficulty's
  // band; keep the closest as a fallback if the band proves hard to hit.
  let raw = null
  let best = null
  const mid = band ? (band[0] + band[1]) / 2 : 0
  do {
    const cand = generateLevel(themeKey, deadline)
    if (!cand) break
    if (!band) { raw = cand; break }
    if (cand.par >= band[0] && cand.par <= band[1]) { raw = cand; break }
    if (!best || Math.abs(cand.par - mid) < Math.abs(best.par - mid)) best = cand
  } while (Date.now() < deadline)

  const chosen = raw || best
  // Persist in the web app's level shape (the daily blobs feed the website).
  const level = chosen ? toWebLevel(chosen) : null
  return { level, themeKey, ms: Date.now() - start, budget, inBand: !!raw }
}

// --- main ---
async function main() {
  console.log(`Frogs & Snakes — daily level generator`)
  console.log(`  target:       ${API_BASE}${flags.get('prod') ? '  ⚠️  PRODUCTION' : ''}`)
  console.log(`  range:        ${days} day(s) from ${localDateString(startDate)}`)
  console.log(`  difficulties: ${difficulties.map(d => `${d}→${themeFor(d)}`).join(', ')}${wantExpert ? `  + expert (${EXPERT_DAILY ? 'daily' : 'Sundays'})→${themeFor('expert')}` : ''}`)
  console.log(`  mode:         ${DRY_RUN ? 'DRY RUN (no writes)' : FORCE ? 'overwrite existing' : 'skip existing'}`)
  console.log()

  // Fail fast if the target API isn't reachable (skip on dry run).
  if (!DRY_RUN) {
    try {
      await fetch(`${API_BASE}/api/levels?date=${localDateString(startDate)}`)
    } catch {
      console.error(`Cannot reach ${API_BASE}. Is the API running? Try: npm run dev:api`)
      process.exit(1)
    }
  }

  let created = 0
  let skipped = 0
  let failed = 0

  for (let offset = 0; offset < days; offset++) {
    const d = dateForOffset(offset)
    const date = localDateString(d)
    const isSunday = d.getDay() === 0

    const todays = [...difficulties]
    if (wantExpert && (EXPERT_DAILY || isSunday)) todays.push('expert')

    const existing = FORCE || DRY_RUN ? new Set() : await fetchExistingDifficulties(date)

    for (const difficulty of todays) {
      const tag = `${date} ${difficulty.padEnd(6)}`

      if (existing.has(difficulty)) {
        console.log(`  ${tag}  ↳ exists, skipping (use --force to overwrite)`)
        skipped++
        continue
      }

      const { level, themeKey, ms, inBand } = generateForDifficulty(difficulty)

      if (!level) {
        console.log(`  ${tag}  ✗ no level found for tier ${themeKey} within budget (${ms}ms)`)
        failed++
        continue
      }

      // Note when a mechanic level had to settle outside its target par band.
      const bandNote = (MECHANIC_PAR_BANDS[themeKey]?.[difficulty] && !inBand) ? ' (out of band)' : ''

      if (DRY_RUN) {
        console.log(`  ${tag}  ✓ ${themeKey} par=${level.par} grid=${level.gridSize}${bandNote} (${ms}ms) [dry run]`)
        created++
        continue
      }

      try {
        await saveLevel(date, difficulty, level)
        console.log(`  ${tag}  ✓ ${themeKey} par=${level.par} grid=${level.gridSize}${bandNote} saved (${ms}ms)`)
        created++
      } catch (err) {
        console.log(`  ${tag}  ✗ ${err.message}`)
        failed++
      }
    }
  }

  console.log()
  console.log(`Done. ${created} ${DRY_RUN ? 'generated' : 'saved'}, ${skipped} skipped, ${failed} failed.`)
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
