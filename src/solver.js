import {
  getValidFrogMoves,
  getValidSnakeMoves,
  checkWinCondition
} from './gameRules.js'

// Solver using BFS to find minimum moves (supports multiple frogs)
// Returns { solvable, moves, path } where path is an array of move descriptors
export const solveLevel = (gridSize, frogs, snakes, logs, lilyPads) => {
  if (!frogs || frogs.length === 0 || lilyPads.length < frogs.length) {
    return { solvable: false, moves: -1, path: [], reason: 'Not enough lily pads for frogs' }
  }

  // Create a state key for memoization
  const stateKey = (frogPositions, snakePositions) => {
    return JSON.stringify({ frogs: frogPositions, snakes: snakePositions })
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
    orientation: s.orientation
  }))
  const initialFrogs = frogs.map(f => [...(f.position || f)])

  // Check if already won
  if (checkWinCondition(initialFrogs, lilyPads)) {
    return { solvable: true, moves: 0, path: [] }
  }

  const queue = [{ frogs: initialFrogs, snakes: initialSnakes, moves: 0, path: [] }]
  const visited = new Set()
  visited.add(stateKey(initialFrogs, initialSnakes))

  let iterations = 0
  const maxIterations = 500000

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++
    const { frogs: currentFrogs, snakes: currentSnakes, moves, path } = queue.shift()

    // Try moves for each frog
    for (let frogIdx = 0; frogIdx < currentFrogs.length; frogIdx++) {
      const frogMoves = getFrogMoves(frogIdx, currentFrogs, currentSnakes)
      for (const move of frogMoves) {
        const newFrogs = currentFrogs.map((f, idx) =>
          idx === move.frogIdx ? move.newPos : [...f]
        )

        const moveEntry = {
          type: 'frog',
          frogIdx: move.frogIdx,
          from: [...currentFrogs[move.frogIdx]],
          to: [...move.newPos]
        }

        // Check win immediately after move
        if (checkWinCondition(newFrogs, lilyPads)) {
          return { solvable: true, moves: moves + 1, path: [...path, moveEntry] }
        }

        const key = stateKey(newFrogs, currentSnakes)
        if (!visited.has(key)) {
          visited.add(key)
          queue.push({ frogs: newFrogs, snakes: currentSnakes, moves: moves + 1, path: [...path, moveEntry] })
        }
      }
    }

    // Try snake moves
    for (let i = 0; i < currentSnakes.length; i++) {
      const snakeMoves = getSolverSnakeMoves(i, currentSnakes, currentFrogs)
      for (const move of snakeMoves) {
        const newSnakes = currentSnakes.map((s, idx) =>
          idx === move.snakeIdx
            ? { positions: move.positions, orientation: move.orientation }
            : { positions: s.positions.map(p => [...p]), orientation: s.orientation }
        )

        const moveEntry = {
          type: 'snake',
          snakeIdx: move.snakeIdx,
          from: currentSnakes[move.snakeIdx].positions.map(p => [...p]),
          to: move.positions.map(p => [...p])
        }

        const key = stateKey(currentFrogs, newSnakes)
        if (!visited.has(key)) {
          visited.add(key)
          queue.push({ frogs: currentFrogs, snakes: newSnakes, moves: moves + 1, path: [...path, moveEntry] })
        }
      }
    }
  }

  return { solvable: false, moves: -1, path: [], reason: iterations >= maxIterations ? 'Hit iteration limit' : 'No solution found' }
}
