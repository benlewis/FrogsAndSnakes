// Repair daily levels broken by the old (pre-perpendicular-saddle-rule)
// generator. For each stored level we re-solve with the runtime solver
// (src/solver.js, which now enforces that a frog can only board a saddle
// perpendicular to the snake). Then:
//   - solvable & par correct & in difficulty band  -> leave as-is
//   - solvable & par drifted but still in band      -> fix par in place
//   - unsolvable OR par out of band                 -> regenerate a fresh
//                                                       in-band level
//
// Regeneration uses the corrected generator (lib/autoLevelGenerator.js), and
// we re-solve the candidate with solver.js (the game's source of truth) and
// require it to land in the difficulty's par band before accepting.
//
// Usage:
//   npm run dev:api
//   node scripts/repair-daily-saddle.js <startDate> <days> [--prod] [--dry-run]

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { generateLevel, DEFAULT_THEMES } from '../lib/autoLevelGenerator.js'
import { solveLevel } from '../src/solver.js'
import { toWebLevel } from './levelFormat.js'

const postHeaders = {
  'Content-Type': 'application/json',
  ...(process.env.LEVELS_TOKEN ? { 'x-levels-token': process.env.LEVELS_TOKEN } : {}),
}

const DIFFICULTY_THEME = { easy: 'auto1', medium: 'auto2', hard: 'auto3', expert: 'auto6' }
const TIMEOUT_MS = { auto1: 15_000, auto2: 20_000, auto3: 30_000, auto6: 300_000 }

const args = process.argv.slice(2)
const flags = new Map()
const positional = []
for (const a of args) {
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=')
    flags.set(k, v === undefined ? true : v)
  } else positional.push(a)
}
const startStr = positional[0]
const days = parseInt(positional[1], 10)
if (!startStr || !Number.isFinite(days)) {
  console.error('Usage: node scripts/repair-daily-saddle.js <YYYY-MM-DD> <days> [--prod] [--dry-run]')
  process.exit(1)
}
const API_BASE = flags.get('api') || (flags.get('prod') ? 'https://frogsandsnakes.com' : 'http://localhost:3002')
const DRY_RUN = flags.has('dry-run')

const localDateString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const startDate = new Date(startStr + 'T12:00:00')

// The local dev server occasionally drops a connection (ECONNRESET) under load.
// Retry transient failures with a short backoff.
async function fetchRetry(url, opts, tries = 4) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(url, opts)
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 300 * (i + 1)))
    }
  }
  throw lastErr
}

const solveWeb = (lvl) => {
  const frogs = lvl.frogs.map((f) => ({ position: f.position, color: f.color }))
  return solveLevel(lvl.gridSize, frogs, lvl.snakes || [], lvl.logs || [], lvl.lilyPads || [])
}

function regenerate(difficulty) {
  const themeKey = DIFFICULTY_THEME[difficulty]
  const band = DEFAULT_THEMES[themeKey].parRange
  const deadline = Date.now() + (TIMEOUT_MS[themeKey] || 30_000)
  while (Date.now() < deadline) {
    const raw = generateLevel(themeKey, deadline)
    if (!raw) continue
    const web = toWebLevel(raw)
    const res = solveWeb(web) // game's source of truth
    if (res.solvable && res.moves >= band[0] && res.moves <= band[1]) {
      web.par = res.moves
      return web
    }
  }
  return null
}

async function save(date, difficulty, level) {
  const res = await fetchRetry(`${API_BASE}/api/levels`, {
    method: 'POST',
    headers: postHeaders,
    body: JSON.stringify({ date, difficulty, level }),
  })
  if (!res.ok) throw new Error(`POST ${res.status}: ${await res.text()}`)
}

async function main() {
  console.log(`Repair daily saddle levels`)
  console.log(`  target: ${API_BASE}${flags.get('prod') ? '  ⚠️  PRODUCTION' : ''}`)
  console.log(`  range:  ${days} day(s) from ${localDateString(startDate)}${DRY_RUN ? '   [DRY RUN]' : ''}`)
  console.log()

  let okCount = 0, parFixed = 0, regenerated = 0, failed = 0

  for (let off = 0; off < days; off++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + off)
    const date = localDateString(d)
    const obj = await (await fetchRetry(`${API_BASE}/api/levels?date=${date}&cb=${off}`)).json()

    for (const difficulty of Object.keys(obj)) {
      const lvl = obj[difficulty]
      const tag = `${date} ${difficulty.padEnd(6)}`
      const band = DEFAULT_THEMES[DIFFICULTY_THEME[difficulty]]?.parRange || [1, 999]
      const res = solveWeb(lvl)

      const inBand = res.solvable && res.moves >= band[0] && res.moves <= band[1]

      if (res.solvable && res.moves === lvl.par && inBand) {
        okCount++
        continue
      }

      if (res.solvable && inBand) {
        // Solvable and well-calibrated, just mislabeled par -> fix in place.
        console.log(`  ${tag}  par ${lvl.par} -> ${res.moves} (fix in place)`)
        parFixed++
        if (!DRY_RUN) {
          try { await save(date, difficulty, { ...lvl, par: res.moves }) }
          catch (e) { console.log(`            ✗ ${e.message}`); failed++; parFixed-- }
        }
        continue
      }

      // Unsolvable or par out of band -> regenerate.
      const reason = res.solvable ? `par ${res.moves} out of band [${band[0]},${band[1]}]` : 'UNSOLVABLE'
      if (DRY_RUN) {
        console.log(`  ${tag}  ${reason} -> would regenerate`)
        regenerated++
        continue
      }
      const fresh = regenerate(difficulty)
      if (!fresh) {
        console.log(`  ${tag}  ${reason} -> ✗ regen failed (no in-band level within budget)`)
        failed++
        continue
      }
      try {
        await save(date, difficulty, fresh)
        console.log(`  ${tag}  ${reason} -> regenerated par=${fresh.par}`)
        regenerated++
      } catch (e) {
        console.log(`  ${tag}  ✗ ${e.message}`)
        failed++
      }
    }
  }

  console.log()
  console.log(`Done. ${okCount} ok, ${parFixed} par-fixed, ${regenerated} regenerated, ${failed} failed.`)
  if (failed) process.exitCode = 1
}

main().catch((e) => { console.error(e); process.exit(1) })
