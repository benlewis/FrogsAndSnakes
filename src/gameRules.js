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

// Check if a cell is blocked for snake movement. excludeFrogIndex lets a
// saddled snake ignore its own rider, who moves along with it.
export const isCellBlockedForSnake = (col, row, { frogs, snakes, logs, lilyPads }, excludeSnakeIndex = -1, excludeFrogIndex = -1) => {
  if (isFrogAt(col, row, frogs, excludeFrogIndex)) return true
  if (isSnakeAt(col, row, snakes, excludeSnakeIndex)) return true
  if (isLogAt(col, row, logs)) return true
  if (isLilyPadAt(col, row, lilyPads)) return true
  return false
}

// The saddle (middle) cell of a snake, or null if it isn't a saddled
// length-3+ snake. A frog can land on this cell and ride along.
export const saddleCellOf = (snake) =>
  (snake && snake.saddle === true && snake.positions.length >= 3)
    ? snake.positions[Math.floor(snake.positions.length / 2)]
    : null

// All saddle cells currently on the board.
export const getSaddleCells = (snakes) =>
  snakes.map(saddleCellOf).filter(Boolean)

// Map of saddle cell key -> the saddled snake's orientation. A frog may only
// land on a saddle by jumping perpendicular to the snake (it can't board from
// the direction the snake travels along), so we need the orientation per cell.
export const getSaddleOrientations = (snakes) => {
  const map = new Map()
  for (const snake of snakes) {
    const saddle = saddleCellOf(snake)
    if (saddle) map.set(`${saddle[0]},${saddle[1]}`, snake.orientation)
  }
  return map
}

// Index of the saddled snake the frog at `pos` is riding, or -1 if it isn't
// on any saddle. The frog can't jump over the snake it's riding.
export const riddenSnakeIndexAt = (pos, snakes) =>
  snakes.findIndex((s) => {
    const saddle = saddleCellOf(s)
    return saddle && saddle[0] === pos[0] && saddle[1] === pos[1]
  })

// Get valid frog jump destinations
export const getValidFrogMoves = (frogIndex, gridSize, { frogs, snakes, logs, lilyPads }) => {
  if (frogIndex === null || frogIndex === undefined || !frogs[frogIndex]) return []

  const frogPos = Array.isArray(frogs[frogIndex]) ? frogs[frogIndex] : frogs[frogIndex].position
  const [frogCol, frogRow] = frogPos
  const validMoves = []
  const gameState = { frogs, snakes, logs, lilyPads }

  // Saddle (middle) cells a frog may land on after a jump, mapped to the
  // saddled snake's orientation. A frog can only board a saddle by jumping
  // perpendicular to the snake (not from the direction the snake travels), but
  // a saddle is always jump-over-able, so the scan never stops on one.
  const saddleOrientations = getSaddleOrientations(snakes)
  // If this frog is currently on a saddle, the snake it's riding is its mount:
  // it can't jump over its own mount, so those cells act as walls.
  const riddenIdx = riddenSnakeIndexAt(frogPos, snakes)
  const mountKeys = riddenIdx >= 0
    ? new Set(snakes[riddenIdx].positions.map(([c, r]) => `${c},${r}`))
    : null

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

    // Can't jump over the snake we're riding — its body is a wall.
    if (mountKeys && mountKeys.has(`${col},${row}`)) continue

    // Must have an adjacent obstacle to jump over
    if (!isObstacleForFrog(col, row, gameState, frogIndex)) continue

    // Can't jump over a lily pad (unless another frog is on it)
    if (isLilyPadAt(col, row, lilyPads) && !isFrogAt(col, row, frogs, frogIndex)) continue

    // Found an obstacle, look for landing spot
    col += dc
    row += dr
    while (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
      // The mount we're riding blocks the jump entirely.
      if (mountKeys && mountKeys.has(`${col},${row}`)) break

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

      // A free saddle is a landing spot — but only when boarded perpendicular
      // to the snake (a vertical snake can only be boarded by a horizontal
      // jump, and vice versa). It can still be jumped over either way, so we
      // record it when eligible and keep scanning past it regardless.
      if (hasSnake && !hasFrog && saddleOrientations.has(`${col},${row}`)) {
        const orientation = saddleOrientations.get(`${col},${row}`)
        const jumpIsVertical = dc === 0
        const boardable = orientation === 'vertical' ? !jumpIsVertical : jumpIsVertical
        if (boardable) validMoves.push([col, row])
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
// Each possible end position counts as one move option (sliding multiple squares is 1 move)
export const getValidSnakeMoves = (snakeIndex, gridSize, { frogs, snakes, logs, lilyPads }) => {
  const moves = []
  const snake = snakes[snakeIndex]
  const isVertical = snake.orientation === 'vertical'
  const gameState = { frogs, snakes, logs, lilyPads }

  // Get max movement in each direction
  const maxNegative = getMaxSnakeDelta(snakeIndex, -1, gridSize, gameState)
  const maxPositive = getMaxSnakeDelta(snakeIndex, 1, gridSize, gameState)

  // Generate all possible end positions (each is a single move)
  for (let delta = maxNegative; delta <= maxPositive; delta++) {
    if (delta === 0) continue // Skip no movement

    const newPositions = snake.positions.map(p =>
      isVertical ? [p[0], p[1] + delta] : [p[0] + delta, p[1]]
    )
    moves.push({ snakeIdx: snakeIndex, positions: newPositions, orientation: snake.orientation })
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

  // A frog riding this snake's saddle slides along with it, so it must not
  // count as a blocker for the snake's own motion.
  const saddle = saddleCellOf(snake)
  const riderFrogIndex = saddle
    ? frogs.findIndex(f => {
        const p = Array.isArray(f) ? f : f.position
        return p[0] === saddle[0] && p[1] === saddle[1]
      })
    : -1

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
      return isCellBlockedForSnake(newCol, newRow, gameState, snakeIndex, riderFrogIndex)
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
