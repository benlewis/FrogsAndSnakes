import {
  getValidFrogMoves,
  getValidSnakeMoves,
  checkWinCondition,
  saddleCellOf
} from './gameRules.js'

// Compact state key using string concatenation instead of JSON.stringify
const compactStateKey = (frogPositions, snakePositions) => {
  let key = ''
  for (const f of frogPositions) key += f[0] + ',' + f[1] + ';'
  key += '|'
  for (const s of snakePositions) {
    for (const p of s.positions) key += p[0] + ',' + p[1] + '.'
    key += ';'
  }
  return key
}

// Solver using BFS to find minimum moves (supports multiple frogs)
// Options:
//   trackPath: if false, skips path tracking for faster generation (default: true)
//   maxIterations: override iteration limit (default: 500000)
export const solveLevel = (gridSize, frogs, snakes, logs, lilyPads, options = {}) => {
  const { trackPath = true, maxIterations = 500000 } = options

  if (!frogs || frogs.length === 0 || lilyPads.length < frogs.length) {
    return { solvable: false, moves: -1, path: [], reason: 'Not enough lily pads for frogs' }
  }

  // Build game state object for shared rules
  const buildGameState = (frogPositions, snakePositions) => ({
    frogs: frogPositions,
    snakes: snakePositions,
    logs,
    lilyPads
  })

  // Get frog moves using shared rules
  const getFrogMoves = (frogIdx, frogPositions, snakePositions) => {
    const gameState = buildGameState(frogPositions, snakePositions)
    const moves = getValidFrogMoves(frogIdx, gridSize, gameState)
    return moves.map(pos => ({ frogIdx, newPos: pos }))
  }

  // Get snake moves using shared rules
  const getSolverSnakeMoves = (snakeIdx, snakePositions, frogPositions) => {
    const gameState = buildGameState(frogPositions, snakePositions)
    return getValidSnakeMoves(snakeIdx, gridSize, gameState)
  }

  // BFS
  const initialSnakes = snakes.map(s => ({
    positions: s.positions.map(p => [...p]),
    orientation: s.orientation,
    saddle: s.saddle
  }))
  const initialFrogs = frogs.map(f => [...(f.position || f)])

  // Check if already won
  if (checkWinCondition(initialFrogs, lilyPads)) {
    return { solvable: true, moves: 0, path: [] }
  }

  // Use ring buffer for BFS queue to avoid O(n) shift()
  let queue = [{ frogs: initialFrogs, snakes: initialSnakes, moves: 0, parent: -1, move: null }]
  let queueHead = 0

  const visited = new Set()
  visited.add(compactStateKey(initialFrogs, initialSnakes))

  let iterations = 0

  while (queueHead < queue.length && iterations < maxIterations) {
    iterations++
    const entry = queue[queueHead++]
    const { frogs: currentFrogs, snakes: currentSnakes, moves } = entry

    // Try moves for each frog
    for (let frogIdx = 0; frogIdx < currentFrogs.length; frogIdx++) {
      const frogMoves = getFrogMoves(frogIdx, currentFrogs, currentSnakes)
      for (const move of frogMoves) {
        const newFrogs = currentFrogs.map((f, idx) =>
          idx === move.frogIdx ? move.newPos : [...f]
        )

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

        const key = compactStateKey(newFrogs, currentSnakes)
        if (!visited.has(key)) {
          visited.add(key)
          const moveEntry = trackPath ? {
            type: 'frog',
            frogIdx: move.frogIdx,
            from: [...currentFrogs[move.frogIdx]],
            to: [...move.newPos]
          } : null
          queue.push({ frogs: newFrogs, snakes: currentSnakes, moves: moves + 1, parent: queueHead - 1, move: moveEntry })
        }
      }
    }

    // Try snake moves
    for (let i = 0; i < currentSnakes.length; i++) {
      const snakeMoves = getSolverSnakeMoves(i, currentSnakes, currentFrogs)
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

        const key = compactStateKey(newFrogs, newSnakes)
        if (!visited.has(key)) {
          visited.add(key)
          const moveEntry = trackPath ? {
            type: 'snake',
            snakeIdx: move.snakeIdx,
            from: currentSnakes[move.snakeIdx].positions.map(p => [...p]),
            to: move.positions.map(p => [...p])
          } : null
          queue.push({ frogs: newFrogs, snakes: newSnakes, moves: moves + 1, parent: queueHead - 1, move: moveEntry })
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
