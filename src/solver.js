import {
  getValidFrogMoves,
  getValidSnakeMoves,
  checkWinCondition,
  saddleCellOf,
  resolveFrogDestination,
  applySwitchLanding
} from './gameRules.js'

// Compact state key using string concatenation instead of JSON.stringify.
// Treasure levels also key on the latch (toggled switch colors), since the same
// board with different switch state is a distinct search node.
const compactStateKey = (frogPositions, snakePositions, toggled) => {
  let key = ''
  for (const f of frogPositions) key += f[0] + ',' + f[1] + ';'
  key += '|'
  for (const s of snakePositions) {
    for (const p of s.positions) key += p[0] + ',' + p[1] + '.'
    key += ';'
  }
  if (toggled && toggled.length) key += '|' + [...toggled].sort((a, b) => a - b).join(',')
  return key
}

// Solver using BFS to find minimum moves (supports multiple frogs, portals, and
// treasure-hunter stones/switches).
// Options:
//   trackPath: if false, skips path tracking for faster generation (default: true)
//   maxIterations: override iteration limit (default: 500000)
//   portals, stones, pressurePlates: mechanic pieces (default: [])
export const solveLevel = (gridSize, frogs, snakes, logs, lilyPads, options = {}) => {
  const {
    trackPath = true,
    maxIterations = 500000,
    portals = [],
    stones = [],
    pressurePlates = [],
  } = options

  if (!frogs || frogs.length === 0 || lilyPads.length < frogs.length) {
    return { solvable: false, moves: -1, path: [], reason: 'Not enough lily pads for frogs' }
  }

  // Build game state object for shared rules
  const buildGameState = (frogPositions, snakePositions, toggled) => ({
    frogs: frogPositions,
    snakes: snakePositions,
    logs,
    lilyPads,
    portals,
    stones,
    pressurePlates,
    toggledSwitchColors: toggled,
  })

  // Get frog moves using shared rules (destinations are tapped cells; a portal
  // move targets the mouth, resolved to the exit when applied).
  const getFrogMoves = (frogIdx, frogPositions, snakePositions, toggled) => {
    const gameState = buildGameState(frogPositions, snakePositions, toggled)
    const moves = getValidFrogMoves(frogIdx, gridSize, gameState)
    return moves.map(pos => ({ frogIdx, newPos: pos }))
  }

  // Get snake moves using shared rules
  const getSolverSnakeMoves = (snakeIdx, snakePositions, frogPositions, toggled) => {
    const gameState = buildGameState(frogPositions, snakePositions, toggled)
    return getValidSnakeMoves(snakeIdx, gridSize, gameState)
  }

  // BFS
  const initialSnakes = snakes.map(s => ({
    positions: s.positions.map(p => [...p]),
    orientation: s.orientation,
    saddle: s.saddle
  }))
  const initialFrogs = frogs.map(f => [...(f.position || f)])
  const initialToggled = []

  // Check if already won
  if (checkWinCondition(initialFrogs, lilyPads)) {
    return { solvable: true, moves: 0, path: [] }
  }

  // Use ring buffer for BFS queue to avoid O(n) shift()
  let queue = [{ frogs: initialFrogs, snakes: initialSnakes, toggled: initialToggled, moves: 0, parent: -1, move: null }]
  let queueHead = 0

  const visited = new Set()
  visited.add(compactStateKey(initialFrogs, initialSnakes, initialToggled))

  let iterations = 0

  while (queueHead < queue.length && iterations < maxIterations) {
    iterations++
    const entry = queue[queueHead++]
    const { frogs: currentFrogs, snakes: currentSnakes, toggled: currentToggled, moves } = entry

    // Try moves for each frog
    for (let frogIdx = 0; frogIdx < currentFrogs.length; frogIdx++) {
      const frogMoves = getFrogMoves(frogIdx, currentFrogs, currentSnakes, currentToggled)
      for (const move of frogMoves) {
        // A portal move targets a mouth; the frog ends up at the linked exit.
        const resolved = resolveFrogDestination(move.newPos, portals)
        const newFrogs = currentFrogs.map((f, idx) =>
          idx === move.frogIdx ? [resolved[0], resolved[1]] : [...f]
        )
        // Landing on a pressure plate toggles its switch (latch).
        const newToggled = applySwitchLanding(resolved, currentToggled, pressurePlates, newFrogs, currentSnakes, stones)

        // Check win immediately after move
        if (checkWinCondition(newFrogs, lilyPads)) {
          if (trackPath) {
            const moveEntry = {
              type: 'frog',
              frogIdx: move.frogIdx,
              from: [...currentFrogs[move.frogIdx]],
              to: [...move.newPos]
            }
            return { solvable: true, moves: moves + 1, path: reconstructPath(queue, queueHead - 1, moveEntry) }
          }
          return { solvable: true, moves: moves + 1, path: [] }
        }

        const key = compactStateKey(newFrogs, currentSnakes, newToggled)
        if (!visited.has(key)) {
          visited.add(key)
          const moveEntry = trackPath ? {
            type: 'frog',
            frogIdx: move.frogIdx,
            from: [...currentFrogs[move.frogIdx]],
            to: [...move.newPos]
          } : null
          queue.push({ frogs: newFrogs, snakes: currentSnakes, toggled: newToggled, moves: moves + 1, parent: queueHead - 1, move: moveEntry })
        }
      }
    }

    // Try snake moves (a snake slide never changes switch state)
    for (let i = 0; i < currentSnakes.length; i++) {
      const snakeMoves = getSolverSnakeMoves(i, currentSnakes, currentFrogs, currentToggled)
      for (const move of snakeMoves) {
        const newSnakes = currentSnakes.map((s, idx) =>
          idx === move.snakeIdx
            ? { positions: move.positions, orientation: move.orientation, saddle: s.saddle }
            : { positions: s.positions.map(p => [...p]), orientation: s.orientation, saddle: s.saddle }
        )

        // A frog riding this snake's saddle (middle segment) slides along with
        // it: relocate any frog on the old saddle cell to the new one.
        let newFrogs = currentFrogs
        const oldSaddle = saddleCellOf(currentSnakes[move.snakeIdx])
        if (oldSaddle) {
          const mid = Math.floor(currentSnakes[move.snakeIdx].positions.length / 2)
          const newSaddle = move.positions[mid]
          newFrogs = currentFrogs.map(f =>
            f[0] === oldSaddle[0] && f[1] === oldSaddle[1] ? [newSaddle[0], newSaddle[1]] : [...f]
          )
        }

        const key = compactStateKey(newFrogs, newSnakes, currentToggled)
        if (!visited.has(key)) {
          visited.add(key)
          const moveEntry = trackPath ? {
            type: 'snake',
            snakeIdx: move.snakeIdx,
            from: currentSnakes[move.snakeIdx].positions.map(p => [...p]),
            to: move.positions.map(p => [...p])
          } : null
          queue.push({ frogs: newFrogs, snakes: newSnakes, toggled: currentToggled, moves: moves + 1, parent: queueHead - 1, move: moveEntry })
        }
      }
    }
  }

  return { solvable: false, moves: -1, path: [], reason: iterations >= maxIterations ? 'Hit iteration limit' : 'No solution found' }
}

// Reconstruct path by walking parent pointers back to root
function reconstructPath(queue, parentIdx, finalMove) {
  const path = [finalMove]
  let idx = parentIdx
  while (idx > 0 && queue[idx].move) {
    path.push(queue[idx].move)
    idx = queue[idx].parent
  }
  path.reverse()
  return path
}
