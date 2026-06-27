// One-time fixup: rewrite already-stored daily level blobs into the web app's
// legacy level shape (the website reads snake.positions/orientation and treats
// frog/lilyPad positions as [col,row] arrays). Reads each stored level back,
// runs it through toWebLevel(), and re-POSTs it. Reuses the existing generated
// puzzles (no regeneration), and is idempotent (already-web levels pass through
// unchanged).
//
// Usage:
//   npm run dev:api                                   # serves localhost:3002
//   node scripts/reformat-daily-to-web.js <startDate> <days> [--prod] [--api=URL] [--dry-run]
//
// Example:
//   node scripts/reformat-daily-to-web.js 2026-06-27 28

import { toWebLevel } from './levelFormat.js'

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
  console.error('Usage: node scripts/reformat-daily-to-web.js <YYYY-MM-DD> <days> [--prod] [--dry-run]')
  process.exit(1)
}

const API_BASE = flags.get('api') || (flags.get('prod') ? 'https://frogsandsnakes.com' : 'http://localhost:3002')
const DRY_RUN = flags.has('dry-run')

const localDateString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const startDate = new Date(startStr + 'T12:00:00')

// A level is already in web shape if its first frog's position is an array.
const isWebShape = (lvl) => Array.isArray(lvl?.frogs?.[0]?.position)

async function main() {
  console.log(`Reformatting daily levels -> web shape`)
  console.log(`  target: ${API_BASE}${flags.get('prod') ? '  ⚠️  PRODUCTION' : ''}`)
  console.log(`  range:  ${days} day(s) from ${localDateString(startDate)}${DRY_RUN ? '   [DRY RUN]' : ''}`)
  console.log()

  let converted = 0
  let alreadyOk = 0
  let failed = 0

  for (let off = 0; off < days; off++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + off)
    const date = localDateString(d)

    let obj
    try {
      const res = await fetch(`${API_BASE}/api/levels?date=${date}`)
      obj = await res.json()
    } catch (e) {
      console.log(`  ${date}  ✗ fetch failed: ${e.message}`)
      failed++
      continue
    }

    for (const difficulty of Object.keys(obj)) {
      const level = obj[difficulty]
      const tag = `${date} ${difficulty.padEnd(6)}`

      if (isWebShape(level)) {
        console.log(`  ${tag}  ↳ already web shape`)
        alreadyOk++
        continue
      }

      const web = toWebLevel(level)
      if (DRY_RUN) {
        console.log(`  ${tag}  ✓ would convert (par=${web.par})`)
        converted++
        continue
      }

      try {
        const res = await fetch(`${API_BASE}/api/levels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, difficulty, level: web }),
        })
        if (!res.ok) throw new Error(`POST ${res.status}: ${await res.text()}`)
        console.log(`  ${tag}  ✓ converted (par=${web.par})`)
        converted++
      } catch (e) {
        console.log(`  ${tag}  ✗ ${e.message}`)
        failed++
      }
    }
  }

  console.log()
  console.log(`Done. ${converted} converted, ${alreadyOk} already ok, ${failed} failed.`)
  if (failed) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
