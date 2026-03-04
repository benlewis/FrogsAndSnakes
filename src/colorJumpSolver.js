export const NUM_COLORS = 6

// Flood-fill to find all cells connected to (0,0) with the same color
export const getConnectedCells = (grid, gridSize) => {
  const targetColor = grid[0]
  const connected = new Set()
  const queue = [0]
  connected.add(0)

  while (queue.length > 0) {
    const idx = queue.shift()
    const col = idx % gridSize
    const row = Math.floor(idx / gridSize)

    const neighbors = [
      row > 0 ? idx - gridSize : -1,           // up
      row < gridSize - 1 ? idx + gridSize : -1, // down
      col > 0 ? idx - 1 : -1,                   // left
      col < gridSize - 1 ? idx + 1 : -1,        // right
    ]

    for (const n of neighbors) {
      if (n >= 0 && !connected.has(n) && grid[n] === targetColor) {
        connected.add(n)
        queue.push(n)
      }
    }
  }

  return connected
}

// BFS solver to find minimum moves to fill entire grid
// visitedCap controls memory limit (higher = more thorough but slower)
// maxDepth controls search depth
export const solveMinMoves = (grid, gridSize, { visitedCap = 200000, maxDepth = 30 } = {}) => {
  const totalCells = gridSize * gridSize

  const encode = (g) => String.fromCharCode(...g)

  const isWon = (g) => {
    const c = g[0]
    for (let i = 1; i < totalCells; i++) {
      if (g[i] !== c) return false
    }
    return true
  }

  const applyMove = (g, colorIdx) => {
    const connected = getConnectedCells(g, gridSize)
    const newGrid = new Uint8Array(g)
    for (const idx of connected) {
      newGrid[idx] = colorIdx
    }
    return newGrid
  }

  const start = new Uint8Array(grid)
  if (isWon(start)) return 0

  const visited = new Set()
  visited.add(encode(start))
  let queue = [start]

  for (let depth = 1; depth <= maxDepth; depth++) {
    const next = []
    for (const current of queue) {
      const currentColor = current[0]
      for (let c = 0; c < NUM_COLORS; c++) {
        if (c === currentColor) continue
        const conn = getConnectedCells(current, gridSize)
        let hasAdjacent = false
        for (const idx of conn) {
          const col = idx % gridSize
          const row = Math.floor(idx / gridSize)
          const neighbors = [
            row > 0 ? idx - gridSize : -1,
            row < gridSize - 1 ? idx + gridSize : -1,
            col > 0 ? idx - 1 : -1,
            col < gridSize - 1 ? idx + 1 : -1,
          ]
          for (const n of neighbors) {
            if (n >= 0 && !conn.has(n) && current[n] === c) {
              hasAdjacent = true
              break
            }
          }
          if (hasAdjacent) break
        }
        if (!hasAdjacent) continue

        const newGrid = applyMove(current, c)
        if (isWon(newGrid)) return depth
        const key = encode(newGrid)
        if (!visited.has(key)) {
          visited.add(key)
          next.push(newGrid)
        }
      }
    }
    queue = next
    if (visited.size > visitedCap) return null
  }

  return null
}

// Greedy solver: always pick the color that captures the most cells
// Returns an upper bound on moves (not necessarily optimal)
export const solveGreedy = (grid, gridSize) => {
  const totalCells = gridSize * gridSize
  let current = new Uint8Array(grid)
  let moves = 0
  const maxMoves = totalCells // safety limit

  while (moves < maxMoves) {
    const c0 = current[0]
    let allSame = true
    for (let i = 1; i < totalCells; i++) {
      if (current[i] !== c0) { allSame = false; break }
    }
    if (allSame) return moves

    const conn = getConnectedCells(current, gridSize)

    // Find adjacent colors and count how many cells each would capture
    const colorCounts = new Array(NUM_COLORS).fill(0)
    for (const idx of conn) {
      const col = idx % gridSize
      const row = Math.floor(idx / gridSize)
      const neighbors = [
        row > 0 ? idx - gridSize : -1,
        row < gridSize - 1 ? idx + gridSize : -1,
        col > 0 ? idx - 1 : -1,
        col < gridSize - 1 ? idx + 1 : -1,
      ]
      for (const n of neighbors) {
        if (n >= 0 && !conn.has(n)) {
          colorCounts[current[n]]++
        }
      }
    }

    // Pick color with most adjacent cells
    let bestColor = -1
    let bestCount = 0
    for (let c = 0; c < NUM_COLORS; c++) {
      if (c === current[0]) continue
      if (colorCounts[c] > bestCount) {
        bestCount = colorCounts[c]
        bestColor = c
      }
    }
    if (bestColor === -1) return null // stuck

    // Apply move
    const newGrid = new Uint8Array(current)
    for (const idx of conn) {
      newGrid[idx] = bestColor
    }
    current = newGrid
    moves++
  }

  return null
}
