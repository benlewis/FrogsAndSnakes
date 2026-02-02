// Script to recheck all levels and update their par values using the current solver
// Run with: node scripts/recheck-levels.js

import { solveLevel } from '../src/solver.js'

const API_BASE = 'http://localhost:3002'

async function recheckAllLevels() {
  console.log('Fetching all levels...')

  const response = await fetch(`${API_BASE}/api/levels?all=true`)
  if (!response.ok) {
    console.error('Failed to fetch levels:', await response.text())
    process.exit(1)
  }

  const levels = await response.json()
  console.log(`Found ${levels.length} levels\n`)

  let updated = 0

  for (const level of levels) {
    const { date, difficulty, gridSize, frogs, snakes, logs, lilyPads, par: oldPar } = level

    // Convert frogs to solver format
    const solverFrogs = frogs ? frogs.map(f => ({ position: f.position, color: f.color })) : []

    if (solverFrogs.length === 0) {
      console.log(`${date} ${difficulty}: Skipping (no frogs)`)
      continue
    }

    const result = solveLevel(gridSize, solverFrogs, snakes || [], logs || [], lilyPads || [])

    if (!result.solvable) {
      console.log(`${date} ${difficulty}: NOT SOLVABLE!`)
      continue
    }

    const newPar = result.moves

    if (oldPar !== newPar) {
      console.log(`${date} ${difficulty}: ${oldPar} -> ${newPar} moves (updating...)`)

      // Update the level with new par
      const updatedLevel = { ...level, par: newPar }
      delete updatedLevel.date
      delete updatedLevel.difficulty

      const saveResponse = await fetch(`${API_BASE}/api/levels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          difficulty,
          level: updatedLevel
        })
      })

      if (saveResponse.ok) {
        updated++
      } else {
        console.error(`  Failed to save: ${await saveResponse.text()}`)
      }
    } else {
      console.log(`${date} ${difficulty}: ${oldPar} moves (unchanged)`)
    }
  }

  console.log(`\nDone! Updated ${updated} levels.`)
}

recheckAllLevels().catch(console.error)
