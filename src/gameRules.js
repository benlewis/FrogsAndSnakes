// Shared game rules for frog and snake movement
// Used by both the game (App.jsx) and the level solver (LevelEditor.jsx)

// Check if a cell contains a snake
export const isSnakeAt = (col, row, snakes, excludeSnakeIndex = -1) => {
  return snakes.some((snake, idx) =>
    idx !== excludeSnakeIndex && snake.positions.some(pos => pos[0] === col && pos[1] === row)
  )
}

// Check if a cell contains a log
export const isLogAt = (col, row, logs) => {
  return logs.some(log => log.positions.some(pos => pos[0] === col && pos[1] === row))
}

// Check if a cell is a lily pad
export const isLilyPadAt = (col, row, lilyPads) => {
  return lilyPads.some(lp => lp.position[0] === col && lp.position[1] === row)
}

// Check if a frog is at a position
export const isFrogAt = (col, row, frogs, excludeFrogIndex = -1) => {
  return frogs.some((f, idx) => {
    if (idx === excludeFrogIndex) return false
    const pos = Array.isArray(f) ? f : f.position
    return pos[0] === col && pos[1] === row
  })
}

// Check if a cell has an obstacle that can be jumped over (for frogs)
export const isObstacleForFrog = (col, row, { frogs, snakes, logs }, excludeFrogIndex = -1) => {
  if (isSnakeAt(col, row, snakes)) return true
  if (isLogAt(col, row, logs)) return true
  if (isFrogAt(col, row, frogs, excludeFrogIndex)) return true
  return false
}

// Check if a frog can land on this cell
export const canFrogLandOn = (col, row, { frogs, snakes, logs, lilyPads }, excludeFrogIndex = -1) => {
  if (isSnakeAt(col, row, snakes)) return false
  if (isLogAt(col, row, logs)) return false
  if (isFrogAt(col, row, frogs, excludeFrogIndex)) return false
  return true
}

// Check if a cell is blocked for snake movement
export const isCellBlockedForSnake = (col, row, { frogs, snakes, logs, lilyPads }, excludeSnakeIndex = -1) => {
  if (isFrogAt(col, row, frogs)) return true
  if (isSnakeAt(col, row, snakes, excludeSnakeIndex)) return true
  if (isLogAt(col, row, logs)) return true
  if (isLilyPadAt(col, row, lilyPads)) return true
  return false
}

// Get valid frog jump destinations
export const getValidFrogMoves = (frogIndex, gridSize, { frogs, snakes, logs, lilyPads }) => {
  if (frogIndex === null || frogIndex === undefined || !frogs[frogIndex]) return []

  const frogPos = Array.isArray(frogs[frogIndex]) ? frogs[frogIndex] : frogs[frogIndex].position
  const [frogCol, frogRow] = frogPos
  const validMoves = []
  const gameState = { frogs, snakes, logs, lilyPads }

  const directions = [
    { dc: 1, dr: 0 },
    { dc: -1, dr: 0 },
    { dc: 0, dr: 1 },
    { dc: 0, dr: -1 },
  ]

  for (const { dc, dr } of directions) {
    let col = frogCol + dc
    let row = frogRow + dr

    // Check bounds
    if (col < 0 || col >= gridSize || row < 0 || row >= gridSize) continue

    // Must have an adjacent obstacle to jump over
    if (!isObstacleForFrog(col, row, gameState, frogIndex)) continue

    // Can't jump over a lily pad (unless another frog is on it)
    if (isLilyPadAt(col, row, lilyPads) && !isFrogAt(col, row, frogs, frogIndex)) continue

    // Found an obstacle, look for landing spot
    col += dc
    row += dr
    while (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
      const hasLilyPad = isLilyPadAt(col, row, lilyPads)
      const hasFrog = isFrogAt(col, row, frogs, frogIndex)
      const hasSnake = isSnakeAt(col, row, snakes)
      const hasLog = isLogAt(col, row, logs)

      // If there's a lily pad here with no other frog, must land here
      if (hasLilyPad && !hasFrog) {
        validMoves.push([col, row])
        break
      }

      // Can land on empty cells (no snake, log, or frog)
      if (!hasSnake && !hasLog && !hasFrog) {
        validMoves.push([col, row])
        break
      }

      // Can only continue jumping over snakes, logs, or frogs
      if (hasSnake || hasLog || hasFrog) {
        col += dc
        row += dr
        continue
      }

      break
    }
  }

  return validMoves
}

// Get valid snake moves (returns array of { snakeIndex, positions, orientation })
export const getValidSnakeMoves = (snakeIndex, gridSize, { frogs, snakes, logs, lilyPads }) => {
  const moves = []
  const snake = snakes[snakeIndex]
  const isVertical = snake.orientation === 'vertical'
  const gameState = { frogs, snakes, logs, lilyPads }

  if (isVertical) {
    const topRow = Math.min(...snake.positions.map(p => p[1]))
    const bottomRow = Math.max(...snake.positions.map(p => p[1]))
    const col = snake.positions[0][0]

    // Move up
    if (topRow > 0 && !isCellBlockedForSnake(col, topRow - 1, gameState, snakeIndex)) {
      const newPositions = snake.positions.map(p => [p[0], p[1] - 1])
      moves.push({ snakeIdx: snakeIndex, positions: newPositions, orientation: snake.orientation })
    }
    // Move down
    if (bottomRow < gridSize - 1 && !isCellBlockedForSnake(col, bottomRow + 1, gameState, snakeIndex)) {
      const newPositions = snake.positions.map(p => [p[0], p[1] + 1])
      moves.push({ snakeIdx: snakeIndex, positions: newPositions, orientation: snake.orientation })
    }
  } else {
    const leftCol = Math.min(...snake.positions.map(p => p[0]))
    const rightCol = Math.max(...snake.positions.map(p => p[0]))
    const row = snake.positions[0][1]

    // Move left
    if (leftCol > 0 && !isCellBlockedForSnake(leftCol - 1, row, gameState, snakeIndex)) {
      const newPositions = snake.positions.map(p => [p[0] - 1, p[1]])
      moves.push({ snakeIdx: snakeIndex, positions: newPositions, orientation: snake.orientation })
    }
    // Move right
    if (rightCol < gridSize - 1 && !isCellBlockedForSnake(rightCol + 1, row, gameState, snakeIndex)) {
      const newPositions = snake.positions.map(p => [p[0] + 1, p[1]])
      moves.push({ snakeIdx: snakeIndex, positions: newPositions, orientation: snake.orientation })
    }
  }

  return moves
}

// Calculate maximum delta a snake can move in a direction (for drag)
export const getMaxSnakeDelta = (snakeIndex, direction, gridSize, { frogs, snakes, logs, lilyPads }) => {
  const snake = snakes[snakeIndex]
  const isVertical = snake.orientation === 'vertical'
  const positions = snake.positions
  const gameState = { frogs, snakes, logs, lilyPads }

  let maxDelta = 0
  const step = direction > 0 ? 1 : -1

  const leadingEdge = direction > 0
    ? (isVertical
        ? Math.max(...positions.map(p => p[1]))
        : Math.max(...positions.map(p => p[0])))
    : (isVertical
        ? Math.min(...positions.map(p => p[1]))
        : Math.min(...positions.map(p => p[0])))

  for (let delta = step; Math.abs(delta) <= gridSize; delta += step) {
    const checkPos = leadingEdge + delta

    if (checkPos < 0 || checkPos >= gridSize) break

    const blocked = positions.some(([col, row]) => {
      const newCol = isVertical ? col : col + delta
      const newRow = isVertical ? row + delta : row
      return isCellBlockedForSnake(newCol, newRow, gameState, snakeIndex)
    })

    if (blocked) break
    maxDelta = delta
  }

  return maxDelta
}

// Check win condition - all frogs on separate lily pads
export const checkWinCondition = (frogs, lilyPads) => {
  for (let i = 0; i < frogs.length; i++) {
    const pos = Array.isArray(frogs[i]) ? frogs[i] : frogs[i].position
    const [col, row] = pos
    if (!isLilyPadAt(col, row, lilyPads)) return false
    // Check no two frogs on same lily pad
    for (let j = i + 1; j < frogs.length; j++) {
      const pos2 = Array.isArray(frogs[j]) ? frogs[j] : frogs[j].position
      if (pos2[0] === col && pos2[1] === row) return false
    }
  }
  return true
}
