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

// MARK: - Treasure Hunter (stones + pressure-plate switches)

// A stone is raised when its base state is flipped by its color's latched
// switch. Raised = obstacle (leapt over, not landable); flat = landable ground.
// `toggled` is the array of currently-latched color ids.
export const isStoneRaised = (stone, toggled = []) =>
  stone.startsRaised !== toggled.includes(stone.color)

// A switch color is disabled (can't flick) while any frog or snake segment sits
// on a stone of that color — you can't raise a wall under whoever's standing
// there.
export const isSwitchDisabled = (color, frogs, snakes, stones) => {
  const occupied = new Set()
  for (const s of snakes) for (const seg of s.positions) occupied.add(`${seg[0]},${seg[1]}`)
  for (const f of frogs) { const p = Array.isArray(f) ? f : f.position; occupied.add(`${p[0]},${p[1]}`) }
  return stones.some(st => st.color === color && occupied.has(`${st.position[0]},${st.position[1]}`))
}

// Toggle the latching switch(es) under a frog that just landed on `cell`.
// Returns the new toggled-colors array (the latch persists until flicked
// again). A disabled switch does nothing.
export const applySwitchLanding = (cell, toggled, pressurePlates = [], frogs = [], snakes = [], stones = []) => {
  let result = toggled
  for (const plate of pressurePlates) {
    if (plate.position[0] !== cell[0] || plate.position[1] !== cell[1]) continue
    if (isSwitchDisabled(plate.color, frogs, snakes, stones)) continue
    result = result.includes(plate.color)
      ? result.filter(c => c !== plate.color)
      : [...result, plate.color]
  }
  return result
}

// MARK: - Wizard (portals)

// The linked exit mouth for a portal cell, or null if (col,row) isn't a mouth.
export const portalExitOf = (col, row, portals = []) => {
  for (const p of portals) {
    if (!p.positions || p.positions.length !== 2) continue
    const [a, b] = p.positions
    if (a[0] === col && a[1] === row) return b
    if (b[0] === col && b[1] === row) return a
  }
  return null
}

// Where a frog actually ends up when it moves onto `pos`: a portal mouth drops
// it out of the linked mouth; anywhere else it just lands there. Move
// generators return the tapped cell (the mouth) — consumers resolve through
// this to get the exit.
export const resolveFrogDestination = (pos, portals = []) => {
  const exit = portalExitOf(pos[0], pos[1], portals)
  return exit ? [exit[0], exit[1]] : [pos[0], pos[1]]
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
export const isCellBlockedForSnake = (col, row, state, excludeSnakeIndex = -1, excludeFrogIndex = -1) => {
  const { frogs, snakes, logs, lilyPads, portals = [], stones = [], pressurePlates = [], toggledSwitchColors = [] } = state
  if (isFrogAt(col, row, frogs, excludeFrogIndex)) return true
  if (isSnakeAt(col, row, snakes, excludeSnakeIndex)) return true
  if (isLogAt(col, row, logs)) return true
  if (isLilyPadAt(col, row, lilyPads)) return true
  // Treasure: only a RAISED stone blocks; a flat stone is passable ground.
  if (stones.some(s => s.position[0] === col && s.position[1] === row && isStoneRaised(s, toggledSwitchColors))) return true
  // Snakes can't slide onto a pressure plate or into a portal mouth.
  if (pressurePlates.some(p => p.position[0] === col && p.position[1] === row)) return true
  if (portals.some(p => p.positions.some(m => m[0] === col && m[1] === row))) return true
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

// Get valid frog jump destinations. Returns the cell the player taps; for a
// portal that is the MOUTH — resolve through resolveFrogDestination to get the
// exit the frog actually ends up on.
export const getValidFrogMoves = (frogIndex, gridSize, state) => {
  const { frogs, snakes, logs, lilyPads, portals = [], stones = [], toggledSwitchColors = [] } = state
  if (frogIndex === null || frogIndex === undefined || !frogs[frogIndex]) return []

  const frogPos = Array.isArray(frogs[frogIndex]) ? frogs[frogIndex] : frogs[frogIndex].position
  const [frogCol, frogRow] = frogPos
  const validMoves = []
  const key = (c, r) => `${c},${r}`

  const saddleOrientations = getSaddleOrientations(snakes)
  // If this frog is on a saddle, its mount's body is a wall it can't jump over.
  const riddenIdx = riddenSnakeIndexAt(frogPos, snakes)
  const riddenKeys = riddenIdx >= 0
    ? new Set(snakes[riddenIdx].positions.map(([c, r]) => key(c, r)))
    : null

  // Obstacles a frog flies over: frogs, snake segments, logs, and raised stones.
  const jumpover = new Set()
  for (const f of frogs) { const p = Array.isArray(f) ? f : f.position; jumpover.add(key(p[0], p[1])) }
  for (const s of snakes) for (const seg of s.positions) jumpover.add(key(seg[0], seg[1]))
  for (const l of logs) for (const seg of l.positions) jumpover.add(key(seg[0], seg[1]))
  for (const st of stones) if (isStoneRaised(st, toggledSwitchColors)) jumpover.add(key(st.position[0], st.position[1]))

  const frogKeys = new Set(frogs.map(f => { const p = Array.isArray(f) ? f : f.position; return key(p[0], p[1]) }))
  const lilyKeys = new Set(lilyPads.map(lp => key(lp.position[0], lp.position[1])))
  const portalExit = new Map()
  for (const p of portals) {
    if (!p.positions || p.positions.length !== 2) continue
    const [a, b] = p.positions
    portalExit.set(key(a[0], a[1]), b)
    portalExit.set(key(b[0], b[1]), a)
  }

  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]]
  for (const [dc, dr] of directions) {
    let col = frogCol + dc
    let row = frogRow + dr
    let jumped = false
    while (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
      const k = key(col, row)

      // Can't jump over the snake we're riding — its body is a wall.
      if (riddenKeys && riddenKeys.has(k)) break

      if (portalExit.has(k)) {
        // A frog parked on a mouth is jumped over like any other frog; an empty
        // mouth stops the flight and is boardable only once we've jumped
        // something and the linked exit is free.
        if (frogKeys.has(k)) {
          jumped = true
        } else {
          const exit = portalExit.get(k)
          if (jumped && !jumpover.has(k) && !jumpover.has(key(exit[0], exit[1]))) {
            validMoves.push([col, row])
          }
          break
        }
      } else if (lilyKeys.has(k) && !frogKeys.has(k)) {
        // A bare lily pad is landable after a jump, and can't be flown over.
        if (jumped) validMoves.push([col, row])
        break
      } else if (jumpover.has(k)) {
        // An obstacle. A free saddle (snake middle) is landable when boarded
        // perpendicular to the snake — but is still jumped over either way.
        if (saddleOrientations.has(k) && !frogKeys.has(k)) {
          const orientation = saddleOrientations.get(k)
          const jumpIsVertical = dc === 0
          const boardable = orientation === 'vertical' ? !jumpIsVertical : jumpIsVertical
          if (jumped && boardable) validMoves.push([col, row])
        }
        jumped = true
      } else {
        // Empty ground or a flat stone — landable after a jump; stops the scan.
        if (jumped) validMoves.push([col, row])
        break
      }

      col += dc
      row += dr
    }
  }

  return validMoves
}

// Get valid snake moves (returns array of { snakeIndex, positions, orientation })
// Each possible end position counts as one move option (sliding multiple squares is 1 move)
export const getValidSnakeMoves = (snakeIndex, gridSize, state) => {
  const moves = []
  const snake = state.snakes[snakeIndex]
  const isVertical = snake.orientation === 'vertical'

  // Get max movement in each direction
  const maxNegative = getMaxSnakeDelta(snakeIndex, -1, gridSize, state)
  const maxPositive = getMaxSnakeDelta(snakeIndex, 1, gridSize, state)

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
export const getMaxSnakeDelta = (snakeIndex, direction, gridSize, state) => {
  const { frogs, snakes } = state
  const snake = snakes[snakeIndex]
  const isVertical = snake.orientation === 'vertical'
  const positions = snake.positions

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
      return isCellBlockedForSnake(newCol, newRow, state, snakeIndex, riderFrogIndex)
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
