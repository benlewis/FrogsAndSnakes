import { useState, useEffect } from 'react'
import './LevelEditor.css'

// API base URL - use relative path for production, localhost for dev
const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

// Generate array of dates for the next 2 weeks
const generateDateRange = () => {
  const dates = []
  const today = new Date()
  for (let i = 0; i < 14; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(date.toISOString().split('T')[0])
  }
  return dates
}

// Frog colors for display
const FROG_COLORS = ['green', 'brown', 'blue']

// Frog color schemes for SVG
const FROG_COLOR_SCHEMES = {
  green: {
    bodyLight: '#bef264',
    bodyDark: '#65a30d',
    legLight: '#a3e635',
    legDark: '#4d7c0f',
    spots: '#84cc16',
  },
  brown: {
    bodyLight: '#d4a574',
    bodyDark: '#8b5a2b',
    legLight: '#c4956a',
    legDark: '#6b4423',
    spots: '#a0784a',
  },
  blue: {
    bodyLight: '#93c5fd',
    bodyDark: '#3b82f6',
    legLight: '#60a5fa',
    legDark: '#2563eb',
    spots: '#60a5fa',
  },
}

// Full SVG Components - same as game
const FrogSVG = ({ color = 'green' }) => {
  const colors = FROG_COLOR_SCHEMES[color] || FROG_COLOR_SCHEMES.green
  const id = `editor-frog-${color}`

  return (
    <svg viewBox="0 0 100 100" className="editor-piece-svg">
      <defs>
        <radialGradient id={`${id}-body`} cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor={colors.bodyLight} />
          <stop offset="100%" stopColor={colors.bodyDark} />
        </radialGradient>
        <radialGradient id={`${id}-leg`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor={colors.legLight} />
          <stop offset="100%" stopColor={colors.legDark} />
        </radialGradient>
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="3" stdDeviation="2" floodOpacity="0.3"/>
        </filter>
      </defs>

      <ellipse cx="52" cy="58" rx="32" ry="36" fill="rgba(0,0,0,0.2)" />
      <ellipse cx="15" cy="75" rx="18" ry="10" fill={`url(#${id}-leg)`} transform="rotate(-30 15 75)" />
      <ellipse cx="85" cy="75" rx="18" ry="10" fill={`url(#${id}-leg)`} transform="rotate(30 85 75)" />
      <ellipse cx="5" cy="85" rx="10" ry="6" fill={colors.legDark} transform="rotate(-20 5 85)" />
      <ellipse cx="95" cy="85" rx="10" ry="6" fill={colors.legDark} transform="rotate(20 95 85)" />
      <ellipse cx="20" cy="30" rx="15" ry="8" fill={`url(#${id}-leg)`} transform="rotate(-45 20 30)" />
      <ellipse cx="80" cy="30" rx="15" ry="8" fill={`url(#${id}-leg)`} transform="rotate(45 80 30)" />
      <ellipse cx="8" cy="20" rx="8" ry="5" fill={colors.legDark} transform="rotate(-30 8 20)" />
      <ellipse cx="92" cy="20" rx="8" ry="5" fill={colors.legDark} transform="rotate(30 92 20)" />
      <ellipse cx="50" cy="55" rx="30" ry="35" fill={`url(#${id}-body)`} filter={`url(#${id}-shadow)`} />
      <ellipse cx="40" cy="50" rx="6" ry="8" fill={colors.spots} opacity="0.6" />
      <ellipse cx="60" cy="55" rx="5" ry="7" fill={colors.spots} opacity="0.6" />
      <ellipse cx="50" cy="70" rx="7" ry="5" fill={colors.spots} opacity="0.6" />
      <ellipse cx="50" cy="25" rx="22" ry="18" fill={`url(#${id}-body)`} />
      <circle cx="38" cy="18" r="11" fill={`url(#${id}-body)`} />
      <circle cx="62" cy="18" r="11" fill={`url(#${id}-body)`} />
      <circle cx="38" cy="18" r="7" fill="white" />
      <circle cx="62" cy="18" r="7" fill="white" />
      <circle cx="38" cy="17" r="4" fill="#1a1a1a" />
      <circle cx="62" cy="17" r="4" fill="#1a1a1a" />
      <circle cx="36" cy="15" r="2" fill="white" opacity="0.8" />
      <circle cx="60" cy="15" r="2" fill="white" opacity="0.8" />
      <circle cx="45" cy="28" r="2" fill={colors.legDark} />
      <circle cx="55" cy="28" r="2" fill={colors.legDark} />
    </svg>
  )
}

const LilyPadSVG = () => (
  <svg viewBox="0 0 100 100" className="editor-piece-svg">
    <defs>
      <radialGradient id="editorLilypadGrad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#5eead4" />
        <stop offset="100%" stopColor="#0f766e" />
      </radialGradient>
      <filter id="editorLilypadShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.25"/>
      </filter>
    </defs>
    <ellipse cx="52" cy="53" rx="44" ry="39" fill="rgba(0,0,0,0.15)" />
    <ellipse cx="50" cy="50" rx="45" ry="40" fill="url(#editorLilypadGrad)" filter="url(#editorLilypadShadow)" />
    <path d="M50 50 L50 10 L30 25 Z" fill="#1a1a2e" />
    <ellipse cx="50" cy="50" rx="43" ry="38" fill="none" stroke="#99f6e4" strokeWidth="2" opacity="0.5" />
    <path d="M50 50 L20 30" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 L80 30" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 L15 50" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 L85 50" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 L25 70" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 L75 70" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 L50 85" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <circle cx="50" cy="50" r="6" fill="#0d9488" />
    <circle cx="50" cy="50" r="3" fill="#14b8a6" />
    <ellipse cx="35" cy="40" rx="15" ry="10" fill="#99f6e4" opacity="0.3" />
  </svg>
)

const StumpSVG = () => (
  <svg viewBox="0 0 100 100" className="editor-piece-svg">
    <defs>
      <linearGradient id="editorBarkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#57301a" />
        <stop offset="50%" stopColor="#78350f" />
        <stop offset="100%" stopColor="#57301a" />
      </linearGradient>
      <radialGradient id="editorStumpTop" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#92400e" />
      </radialGradient>
      <filter id="editorStumpShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="3" stdDeviation="2" floodOpacity="0.3"/>
      </filter>
    </defs>
    <ellipse cx="52" cy="75" rx="40" ry="18" fill="rgba(0,0,0,0.2)" />
    <ellipse cx="50" cy="70" rx="38" ry="20" fill="#57301a" />
    <rect x="12" y="50" width="76" height="20" fill="url(#editorBarkGrad)" />
    <path d="M15 55 L15 68" stroke="#92400e" strokeWidth="4" />
    <path d="M25 52 L25 70" stroke="#6b3a1a" strokeWidth="3" />
    <path d="M35 50 L35 70" stroke="#92400e" strokeWidth="4" />
    <path d="M50 50 L50 70" stroke="#6b3a1a" strokeWidth="3" />
    <path d="M65 50 L65 70" stroke="#92400e" strokeWidth="4" />
    <path d="M75 52 L75 70" stroke="#6b3a1a" strokeWidth="3" />
    <path d="M85 55 L85 68" stroke="#92400e" strokeWidth="4" />
    <ellipse cx="50" cy="50" rx="38" ry="20" fill="url(#editorStumpTop)" filter="url(#editorStumpShadow)" />
    <ellipse cx="50" cy="50" rx="32" ry="16" fill="none" stroke="#78350f" strokeWidth="2" />
    <ellipse cx="50" cy="50" rx="25" ry="12" fill="none" stroke="#b45309" strokeWidth="1.5" />
    <ellipse cx="50" cy="50" rx="18" ry="9" fill="none" stroke="#78350f" strokeWidth="2" />
    <ellipse cx="50" cy="50" rx="11" ry="5" fill="none" stroke="#b45309" strokeWidth="1.5" />
    <ellipse cx="50" cy="50" rx="5" ry="2.5" fill="#78350f" />
    <ellipse cx="40" cy="45" rx="12" ry="6" fill="#fbbf24" opacity="0.2" />
  </svg>
)

const VerticalSnakeSVG = () => (
  <svg viewBox="0 0 40 100" className="editor-snake-svg-vertical">
    <defs>
      <linearGradient id="editorSnakeBody" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#14532d" />
        <stop offset="50%" stopColor="#166534" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
      <linearGradient id="editorSnakeHead" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22543d" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
      <filter id="editorSnakeShadow" x="-50%" y="-10%" width="200%" height="120%">
        <feDropShadow dx="2" dy="2" stdDeviation="1.5" floodOpacity="0.3"/>
      </filter>
    </defs>
    {/* Shadow */}
    <path d="M22 95 Q22 50 22 12" stroke="rgba(0,0,0,0.2)" strokeWidth="14" strokeLinecap="round" fill="none" />
    {/* Body */}
    <path d="M20 95 Q20 50 20 12" stroke="url(#editorSnakeBody)" strokeWidth="12" strokeLinecap="round" fill="none" filter="url(#editorSnakeShadow)" />
    {/* Scales */}
    <path d="M20 85 L24 80 L20 75 L16 80 Z" fill="#15803d" opacity="0.7" />
    <path d="M20 70 L24 65 L20 60 L16 65 Z" fill="#15803d" opacity="0.7" />
    <path d="M20 55 L24 50 L20 45 L16 50 Z" fill="#15803d" opacity="0.7" />
    <path d="M20 40 L24 35 L20 30 L16 35 Z" fill="#15803d" opacity="0.7" />
    {/* Head */}
    <ellipse cx="20" cy="8" rx="13" ry="9" fill="url(#editorSnakeHead)" filter="url(#editorSnakeShadow)" />
    {/* Eyes */}
    <circle cx="14" cy="6" r="3.5" fill="#fef08a" />
    <circle cx="26" cy="6" r="3.5" fill="#fef08a" />
    <ellipse cx="14" cy="6" rx="1.5" ry="2.5" fill="#1a1a1a" />
    <ellipse cx="26" cy="6" rx="1.5" ry="2.5" fill="#1a1a1a" />
    {/* Tongue */}
    <path d="M20 0 L18 -6 M20 0 L22 -6" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

const HorizontalSnakeSVG = () => (
  <svg viewBox="0 0 100 40" className="editor-snake-svg-horizontal">
    <defs>
      <linearGradient id="editorSnakeBodyH" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#14532d" />
        <stop offset="50%" stopColor="#166534" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
      <linearGradient id="editorSnakeHeadH" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22543d" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
      <filter id="editorSnakeShadowH" x="-10%" y="-50%" width="120%" height="200%">
        <feDropShadow dx="2" dy="2" stdDeviation="1.5" floodOpacity="0.3"/>
      </filter>
    </defs>
    {/* Shadow */}
    <path d="M5 22 Q50 22 88 22" stroke="rgba(0,0,0,0.2)" strokeWidth="14" strokeLinecap="round" fill="none" />
    {/* Body */}
    <path d="M5 20 Q50 20 88 20" stroke="url(#editorSnakeBodyH)" strokeWidth="12" strokeLinecap="round" fill="none" filter="url(#editorSnakeShadowH)" />
    {/* Scales */}
    <path d="M15 20 L20 24 L25 20 L20 16 Z" fill="#15803d" opacity="0.7" />
    <path d="M35 20 L40 24 L45 20 L40 16 Z" fill="#15803d" opacity="0.7" />
    <path d="M55 20 L60 24 L65 20 L60 16 Z" fill="#15803d" opacity="0.7" />
    <path d="M75 20 L80 24 L85 20 L80 16 Z" fill="#15803d" opacity="0.7" />
    {/* Head */}
    <ellipse cx="92" cy="20" rx="9" ry="13" fill="url(#editorSnakeHeadH)" filter="url(#editorSnakeShadowH)" />
    {/* Eyes */}
    <circle cx="94" cy="14" r="3.5" fill="#fef08a" />
    <circle cx="94" cy="26" r="3.5" fill="#fef08a" />
    <ellipse cx="94" cy="14" rx="2.5" ry="1.5" fill="#1a1a1a" />
    <ellipse cx="94" cy="26" rx="2.5" ry="1.5" fill="#1a1a1a" />
    {/* Tongue */}
    <path d="M100 20 L106 18 M100 20 L106 22" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

// Solver using BFS to find minimum moves (supports multiple frogs)
const solveLevel = (gridSize, frogs, snakes, logs, lilyPads) => {
  if (!frogs || frogs.length === 0 || lilyPads.length < frogs.length) {
    return { solvable: false, moves: -1, reason: 'Not enough lily pads for frogs' }
  }

  // Create a state key for memoization
  const stateKey = (frogPositions, snakePositions) => {
    return JSON.stringify({ frogs: frogPositions, snakes: snakePositions })
  }

  // Check if a cell has an obstacle (snake, log, or another frog)
  const hasObstacle = (col, row, snakePositions, frogPositions, excludeFrogIdx = -1) => {
    for (const snake of snakePositions) {
      if (snake.positions.some(p => p[0] === col && p[1] === row)) return true
    }
    for (const log of logs) {
      if (log.positions.some(p => p[0] === col && p[1] === row)) return true
    }
    for (let i = 0; i < frogPositions.length; i++) {
      if (i === excludeFrogIdx) continue
      if (frogPositions[i][0] === col && frogPositions[i][1] === row) return true
    }
    return false
  }

  // Check if frog can land on this cell (empty, no other frog)
  const canLandOn = (col, row, snakePositions, frogPositions, excludeFrogIdx) => {
    // Can't land on snakes
    for (const snake of snakePositions) {
      if (snake.positions.some(p => p[0] === col && p[1] === row)) return false
    }
    // Can't land on logs
    for (const log of logs) {
      if (log.positions.some(p => p[0] === col && p[1] === row)) return false
    }
    // Can't land on another frog
    for (let i = 0; i < frogPositions.length; i++) {
      if (i === excludeFrogIdx) continue
      if (frogPositions[i][0] === col && frogPositions[i][1] === row) return false
    }
    return true
  }

  // Check if a cell is a lily pad
  const isLilyPad = (col, row) => {
    return lilyPads.some(lp => lp.position[0] === col && lp.position[1] === row)
  }

  // Win condition: all frogs on separate lily pads
  const isWin = (frogPositions) => {
    for (let i = 0; i < frogPositions.length; i++) {
      const [col, row] = frogPositions[i]
      if (!isLilyPad(col, row)) return false
      for (let j = i + 1; j < frogPositions.length; j++) {
        if (frogPositions[j][0] === col && frogPositions[j][1] === row) return false
      }
    }
    return true
  }

  // Get valid moves for a specific frog
  const getFrogMoves = (frogIdx, frogPositions, snakePositions) => {
    const moves = []
    const frog = frogPositions[frogIdx]
    const directions = [
      { dc: 1, dr: 0 },
      { dc: -1, dr: 0 },
      { dc: 0, dr: 1 },
      { dc: 0, dr: -1 },
    ]

    for (const { dc, dr } of directions) {
      let col = frog[0] + dc
      let row = frog[1] + dr

      // Check bounds
      if (col < 0 || col >= gridSize || row < 0 || row >= gridSize) continue

      // Must have an adjacent obstacle to jump over
      if (!hasObstacle(col, row, snakePositions, frogPositions, frogIdx)) continue

      // Found an obstacle, look for landing spot (skip over consecutive obstacles)
      col += dc
      row += dr
      while (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
        // Lily pads force a landing if no other frog is on them
        const onLilyPad = isLilyPad(col, row)
        const frogOnCell = frogPositions.some((f, idx) => idx !== frogIdx && f[0] === col && f[1] === row)
        if (onLilyPad && !frogOnCell) {
          moves.push({ frogIdx, newPos: [col, row] })
          break
        }
        if (canLandOn(col, row, snakePositions, frogPositions, frogIdx)) {
          moves.push({ frogIdx, newPos: [col, row] })
          break
        }
        // If there's another obstacle, keep going
        if (!hasObstacle(col, row, snakePositions, frogPositions, frogIdx)) {
          // Empty cell but can't land
          break
        }
        col += dc
        row += dr
      }
    }

    return moves
  }

  // Get valid snake moves
  const getSnakeMoves = (snakeIdx, snakePositions, frogPositions) => {
    const moves = []
    const snake = snakePositions[snakeIdx]
    const isVertical = snake.orientation === 'vertical'

    const isCellBlocked = (col, row, excludeSnakeIdx) => {
      for (const frogPos of frogPositions) {
        if (frogPos[0] === col && frogPos[1] === row) return true
      }
      for (let i = 0; i < snakePositions.length; i++) {
        if (i === excludeSnakeIdx) continue
        if (snakePositions[i].positions.some(p => p[0] === col && p[1] === row)) return true
      }
      for (const log of logs) {
        if (log.positions.some(p => p[0] === col && p[1] === row)) return true
      }
      return false
    }

    if (isVertical) {
      const topRow = Math.min(...snake.positions.map(p => p[1]))
      const col = snake.positions[0][0]
      if (topRow > 0 && !isCellBlocked(col, topRow - 1, snakeIdx)) {
        const newPositions = snake.positions.map(p => [p[0], p[1] - 1])
        moves.push({ snakeIdx, positions: newPositions, orientation: snake.orientation })
      }
      const bottomRow = Math.max(...snake.positions.map(p => p[1]))
      if (bottomRow < gridSize - 1 && !isCellBlocked(col, bottomRow + 1, snakeIdx)) {
        const newPositions = snake.positions.map(p => [p[0], p[1] + 1])
        moves.push({ snakeIdx, positions: newPositions, orientation: snake.orientation })
      }
    } else {
      const leftCol = Math.min(...snake.positions.map(p => p[0]))
      const row = snake.positions[0][1]
      if (leftCol > 0 && !isCellBlocked(leftCol - 1, row, snakeIdx)) {
        const newPositions = snake.positions.map(p => [p[0] - 1, p[1]])
        moves.push({ snakeIdx, positions: newPositions, orientation: snake.orientation })
      }
      const rightCol = Math.max(...snake.positions.map(p => p[0]))
      if (rightCol < gridSize - 1 && !isCellBlocked(rightCol + 1, row, snakeIdx)) {
        const newPositions = snake.positions.map(p => [p[0] + 1, p[1]])
        moves.push({ snakeIdx, positions: newPositions, orientation: snake.orientation })
      }
    }

    return moves
  }

  // BFS
  const initialSnakes = snakes.map(s => ({
    positions: s.positions.map(p => [...p]),
    orientation: s.orientation
  }))
  const initialFrogs = frogs.map(f => [...f.position])

  // Check if already won
  if (isWin(initialFrogs)) {
    return { solvable: true, moves: 0 }
  }

  const queue = [{ frogs: initialFrogs, snakes: initialSnakes, moves: 0 }]
  const visited = new Set()
  visited.add(stateKey(initialFrogs, initialSnakes))

  let iterations = 0
  const maxIterations = 500000 // Increased limit

  while (queue.length > 0 && iterations < maxIterations) {
    iterations++
    const { frogs: currentFrogs, snakes: currentSnakes, moves } = queue.shift()

    // Try moves for each frog
    for (let frogIdx = 0; frogIdx < currentFrogs.length; frogIdx++) {
      const frogMoves = getFrogMoves(frogIdx, currentFrogs, currentSnakes)
      for (const move of frogMoves) {
        const newFrogs = currentFrogs.map((f, idx) =>
          idx === move.frogIdx ? move.newPos : [...f]
        )

        // Check win immediately after move
        if (isWin(newFrogs)) {
          return { solvable: true, moves: moves + 1 }
        }

        const key = stateKey(newFrogs, currentSnakes)
        if (!visited.has(key)) {
          visited.add(key)
          queue.push({ frogs: newFrogs, snakes: currentSnakes, moves: moves + 1 })
        }
      }
    }

    // Try snake moves
    for (let i = 0; i < currentSnakes.length; i++) {
      const snakeMoves = getSnakeMoves(i, currentSnakes, currentFrogs)
      for (const move of snakeMoves) {
        const newSnakes = currentSnakes.map((s, idx) =>
          idx === move.snakeIdx
            ? { positions: move.positions, orientation: move.orientation }
            : { positions: s.positions.map(p => [...p]), orientation: s.orientation }
        )
        const key = stateKey(currentFrogs, newSnakes)
        if (!visited.has(key)) {
          visited.add(key)
          queue.push({ frogs: currentFrogs, snakes: newSnakes, moves: moves + 1 })
        }
      }
    }
  }

  console.log('Solver exhausted:', { iterations, visited: visited.size, queueRemaining: queue.length })
  return { solvable: false, moves: -1, reason: iterations >= maxIterations ? 'Hit iteration limit' : 'No solution found' }
}

const LevelEditor = ({ onClose, existingLevel = null, onSave }) => {
  const [gridSize, setGridSize] = useState(existingLevel?.gridSize || 5)
  const [difficulty, setDifficulty] = useState(existingLevel?.difficulty || 'easy')
  const [par, setPar] = useState(existingLevel?.par || 3)
  const [levelDate, setLevelDate] = useState(existingLevel?.date || new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [checkResult, setCheckResult] = useState(null)
  const [checking, setChecking] = useState(false)

  // Support both old single-frog format and new multi-frog format
  const [frogs, setFrogs] = useState(() => {
    if (existingLevel?.frogs) return existingLevel.frogs
    if (existingLevel?.frog?.position) return [{ position: existingLevel.frog.position, color: 'green' }]
    return []
  })
  const [snakes, setSnakes] = useState(
    existingLevel?.snakes || []
  )
  const [logs, setLogs] = useState(
    existingLevel?.logs || []
  )
  const [lilyPads, setLilyPads] = useState(
    existingLevel?.lilyPads || []
  )

  // Level list state
  const [allLevels, setAllLevels] = useState([])
  const [loadingLevels, setLoadingLevels] = useState(true)
  const dateRange = generateDateRange()

  // Fetch all levels on mount
  useEffect(() => {
    fetchAllLevels()
  }, [])

  const fetchAllLevels = async () => {
    setLoadingLevels(true)
    try {
      const response = await fetch(`${API_BASE}/api/levels?all=true`)
      if (response.ok) {
        const levels = await response.json()
        setAllLevels(levels)
      }
    } catch (err) {
      console.error('Error fetching levels:', err)
    }
    setLoadingLevels(false)
  }

  // Get level for a specific date and difficulty
  const getLevel = (date, diff) => {
    return allLevels.find(l => l.date === date && l.difficulty === diff)
  }

  const loadLevel = (level) => {
    setGridSize(level.gridSize || 5)
    setDifficulty(level.difficulty || 'easy')
    setPar(level.par || 3)
    setLevelDate(level.date || new Date().toISOString().split('T')[0])
    // Support both old single-frog and new multi-frog format
    if (level.frogs) {
      setFrogs(level.frogs)
    } else if (level.frog?.position) {
      setFrogs([{ position: level.frog.position, color: 'green' }])
    } else {
      setFrogs([])
    }
    setSnakes(level.snakes || [])
    setLogs(level.logs || [])
    setLilyPads(level.lilyPads || [])
    setCheckResult(null) // Reset check when loading a level
  }

  const selectSlot = (date, diff) => {
    const existing = getLevel(date, diff)
    if (existing) {
      loadLevel(existing)
    } else {
      // Start fresh for this slot
      setLevelDate(date)
      setDifficulty(diff)
      clearAll()
    }
  }

  const [currentTool, setCurrentTool] = useState('frog')
  const [selectedFrogIndex, setSelectedFrogIndex] = useState(null)
  const [snakeOrientation, setSnakeOrientation] = useState('vertical')
  const [snakeLength, setSnakeLength] = useState(2)
  const [logLength, setLogLength] = useState(1)

  const isSnakeCell = (col, row) => {
    return snakes.some(snake =>
      snake.positions.some(pos => pos[0] === col && pos[1] === row)
    )
  }

  const isLogCell = (col, row) => {
    return logs.some(log =>
      log.positions.some(pos => pos[0] === col && pos[1] === row)
    )
  }

  const isLilyPadCell = (col, row) => {
    return lilyPads.some(lp => lp.position[0] === col && lp.position[1] === row)
  }

  const getFrogAt = (col, row) => {
    return frogs.find(f => f.position[0] === col && f.position[1] === row)
  }

  const isFrogCell = (col, row) => {
    return getFrogAt(col, row) !== undefined
  }

  const handleCellClick = (col, row) => {
    setCheckResult(null) // Reset check when level changes

    const clickedFrogIndex = frogs.findIndex(f => f.position[0] === col && f.position[1] === row)

    // Eraser tool takes priority
    if (currentTool === 'eraser') {
      // Erase frog at this position
      if (clickedFrogIndex !== -1) {
        const newFrogs = frogs.filter((_, i) => i !== clickedFrogIndex)
          .map((f, idx) => ({ ...f, color: FROG_COLORS[idx] }))
        setFrogs(newFrogs)
        setSelectedFrogIndex(null)
        return
      }
      // Erase other items (logs, lily pads) - snakes handled by overlay click
      setLogs(logs.filter(log =>
        !log.positions.some(pos => pos[0] === col && pos[1] === row)
      ))
      setLilyPads(lilyPads.filter(lp =>
        lp.position[0] !== col || lp.position[1] !== row
      ))
      return
    }

    // Handle frog selection and movement (works with non-eraser tools)
    if (clickedFrogIndex !== -1) {
      // Clicked on a frog - select it (or deselect if already selected)
      if (selectedFrogIndex === clickedFrogIndex) {
        setSelectedFrogIndex(null)
      } else {
        setSelectedFrogIndex(clickedFrogIndex)
      }
      return
    }

    // If a frog is selected, move it to the clicked cell
    if (selectedFrogIndex !== null) {
      setFrogs(frogs.map((f, i) =>
        i === selectedFrogIndex ? { ...f, position: [col, row] } : f
      ))
      setSelectedFrogIndex(null)
      return
    }

    if (currentTool === 'frog') {
      // Add a new frog if not already at this position and under max limit
      if (!isFrogCell(col, row) && frogs.length < 3) {
        const color = FROG_COLORS[frogs.length]
        setFrogs([...frogs, { position: [col, row], color }])
      }
    } else if (currentTool === 'snake') {
      const positions = []
      for (let i = 0; i < snakeLength; i++) {
        const newCol = snakeOrientation === 'horizontal' ? col + i : col
        const newRow = snakeOrientation === 'vertical' ? row + i : row
        if (newCol >= gridSize || newRow >= gridSize) return
        positions.push([newCol, newRow])
      }
      setSnakes([...snakes, { positions, orientation: snakeOrientation }])
    } else if (currentTool === 'log') {
      const positions = []
      for (let i = 0; i < logLength; i++) {
        const newCol = col + i
        if (newCol >= gridSize) return
        positions.push([newCol, row])
      }
      setLogs([...logs, { positions }])
    } else if (currentTool === 'lilypad') {
      if (!isLilyPadCell(col, row)) {
        setLilyPads([...lilyPads, { position: [col, row] }])
      }
    }
  }

  const getCellClass = (col, row) => {
    const classes = ['editor-cell']
    const frog = getFrogAt(col, row)
    if (frog) {
      classes.push('cell-frog', `cell-frog-${frog.color}`)
      const frogIndex = frogs.findIndex(f => f.position[0] === col && f.position[1] === row)
      if (frogIndex === selectedFrogIndex) classes.push('cell-frog-selected')
    }
    if (isSnakeCell(col, row)) classes.push('cell-snake')
    if (isLogCell(col, row)) classes.push('cell-log')
    if (isLilyPadCell(col, row)) classes.push('cell-lilypad')
    return classes.join(' ')
  }

  // Get snake orientation at a cell
  const getSnakeOrientationAt = (col, row) => {
    const snake = snakes.find(s => s.positions.some(p => p[0] === col && p[1] === row))
    return snake?.orientation || 'vertical'
  }

  const getCellContent = (col, row) => {
    const frog = getFrogAt(col, row)
    if (frog) {
      return <FrogSVG color={frog.color} />
    }
    // Snakes are rendered as overlays, not per-cell
    if (isLogCell(col, row)) {
      return <StumpSVG />
    }
    if (isLilyPadCell(col, row)) {
      return <LilyPadSVG />
    }
    return null
  }

  // Calculate snake overlay style (like the game does)
  const getSnakeOverlayStyle = (snake) => {
    const positions = snake.positions
    const minCol = Math.min(...positions.map(p => p[0]))
    const maxCol = Math.max(...positions.map(p => p[0]))
    const minRow = Math.min(...positions.map(p => p[1]))
    const maxRow = Math.max(...positions.map(p => p[1]))

    const cellPercent = 100 / gridSize
    const gapAdjust = 0.5

    return {
      left: `${minCol * cellPercent + gapAdjust}%`,
      top: `${minRow * cellPercent + gapAdjust}%`,
      width: `${(maxCol - minCol + 1) * cellPercent - gapAdjust * 2}%`,
      height: `${(maxRow - minRow + 1) * cellPercent - gapAdjust * 2}%`,
    }
  }

  const clearAll = () => {
    setFrogs([])
    setSnakes([])
    setLogs([])
    setLilyPads([])
    setCheckResult(null)
  }

  const copyLevel = async () => {
    const levelData = {
      gridSize,
      frogs: frogs.map(f => ({ position: f.position, color: f.color })),
      snakes: snakes.map(s => ({
        positions: s.positions,
        orientation: s.orientation
      })),
      logs: logs.map(l => ({ positions: l.positions })),
      lilyPads: lilyPads.map(lp => ({ position: lp.position })),
      par
    }
    try {
      await navigator.clipboard.writeText(JSON.stringify(levelData))
      alert('Level copied to clipboard!')
    } catch (err) {
      alert('Failed to copy: ' + err.message)
    }
  }

  const pasteLevel = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const levelData = JSON.parse(text)

      if (levelData.gridSize) setGridSize(levelData.gridSize)
      if (levelData.frogs) setFrogs(levelData.frogs.map(f => ({ position: f.position, color: f.color || 'green' })))
      if (levelData.snakes) setSnakes(levelData.snakes.map(s => ({ positions: s.positions, orientation: s.orientation })))
      if (levelData.logs) setLogs(levelData.logs.map(l => ({ positions: l.positions })))
      if (levelData.lilyPads) setLilyPads(levelData.lilyPads.map(lp => ({ position: lp.position })))
      if (levelData.par) setPar(levelData.par)
      setCheckResult(null)
    } catch (err) {
      alert('Failed to paste: Invalid level data')
    }
  }

  // Reset check result when level changes
  const resetCheck = () => {
    setCheckResult(null)
  }

  const checkLevel = () => {
    if (frogs.length === 0) {
      alert('Please place at least one frog!')
      return
    }
    if (lilyPads.length < frogs.length) {
      alert(`Please place at least ${frogs.length} lily pad${frogs.length > 1 ? 's' : ''} (one per frog)!`)
      return
    }

    setChecking(true)
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      const result = solveLevel(gridSize, frogs, snakes, logs, lilyPads)
      setCheckResult(result)
      if (result.solvable) {
        setPar(result.moves) // Auto-set par to minimum moves
      }
      setChecking(false)
    }, 10)
  }

  const saveLevel = async () => {
    if (frogs.length === 0) {
      alert('Please place at least one frog!')
      return
    }
    if (lilyPads.length < frogs.length) {
      alert(`Please place at least ${frogs.length} lily pad${frogs.length > 1 ? 's' : ''} (one per frog)!`)
      return
    }

    setSaving(true)
    setSaveError(null)

    const levelData = {
      difficulty,
      date: levelDate,
      gridSize,
      frogs: frogs.map(f => ({ position: f.position, color: f.color })),
      snakes: snakes.map(s => ({
        positions: s.positions,
        orientation: s.orientation
      })),
      logs: logs.map(l => ({ positions: l.positions })),
      lilyPads: lilyPads.map(lp => ({ position: lp.position })),
      par
    }

    try {
      const response = await fetch(`${API_BASE}/api/levels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: levelDate,
          difficulty,
          level: levelData
        })
      })

      if (response.ok) {
        // Refresh the level list
        await fetchAllLevels()
        alert(`Level saved for ${levelDate} (${difficulty})!`)
        if (onSave) onSave()
      } else {
        const error = await response.json()
        setSaveError(error.error || 'Failed to save')
      }
    } catch (err) {
      console.error('Save error:', err)
      setSaveError(err.message)
    }

    setSaving(false)
  }

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.getTime() === today.getTime()) return 'Today'
    if (date.getTime() === tomorrow.getTime()) return 'Tomorrow'

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const isCurrentSelection = (date, diff) => {
    return date === levelDate && diff === difficulty
  }

  return (
    <div className="level-editor-overlay">
      <div className="level-editor wide">
        <div className="editor-header">
          <h2>Level Editor</h2>
          <button className="close-btn" onClick={onClose}>X</button>
        </div>

        <div className="editor-layout">
          {/* Left side - Editor */}
          <div className="editor-main">
            <div className="editor-content">
              <div className="editor-sidebar">
                <div className="current-editing">
                  Editing: <strong>{formatDate(levelDate)}</strong> - <span className={`difficulty-tag ${difficulty}`}>{difficulty}</span>
                </div>

                <div className="editor-section">
                  <label>Grid Size</label>
                  <input
                    type="number"
                    min="3"
                    max="8"
                    value={gridSize}
                    onChange={(e) => {
                      setGridSize(parseInt(e.target.value) || 5)
                      clearAll()
                    }}
                  />
                </div>

                <div className="editor-section">
                  <label>Par (Optimal Moves)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={par}
                    onChange={(e) => setPar(parseInt(e.target.value) || 3)}
                  />
                </div>

                <div className="editor-section">
                  <label>Tool</label>
                  <div className="tool-buttons">
                    <button
                      className={`tool-btn ${currentTool === 'frog' ? 'active' : ''}`}
                      onClick={() => setCurrentTool('frog')}
                    >
                      Frog
                    </button>
                    <button
                      className={`tool-btn ${currentTool === 'snake' ? 'active' : ''}`}
                      onClick={() => setCurrentTool('snake')}
                    >
                      Snake
                    </button>
                    <button
                      className={`tool-btn ${currentTool === 'log' ? 'active' : ''}`}
                      onClick={() => setCurrentTool('log')}
                    >
                      Log
                    </button>
                    <button
                      className={`tool-btn ${currentTool === 'lilypad' ? 'active' : ''}`}
                      onClick={() => setCurrentTool('lilypad')}
                    >
                      Lily Pad
                    </button>
                    <button
                      className={`tool-btn eraser ${currentTool === 'eraser' ? 'active' : ''}`}
                      onClick={() => setCurrentTool('eraser')}
                    >
                      Eraser
                    </button>
                  </div>
                </div>

                {currentTool === 'snake' && (
                  <div className="editor-section">
                    <label>Snake Options</label>
                    <div className="option-row">
                      <span>Orientation:</span>
                      <select
                        value={snakeOrientation}
                        onChange={(e) => setSnakeOrientation(e.target.value)}
                      >
                        <option value="vertical">Vertical</option>
                        <option value="horizontal">Horizontal</option>
                      </select>
                    </div>
                    <div className="option-row">
                      <span>Length:</span>
                      <input
                        type="number"
                        min="2"
                        max="4"
                        value={snakeLength}
                        onChange={(e) => setSnakeLength(parseInt(e.target.value) || 2)}
                      />
                    </div>
                  </div>
                )}

                {currentTool === 'log' && (
                  <div className="editor-section">
                    <label>Log Options</label>
                    <div className="option-row">
                      <span>Length:</span>
                      <input
                        type="number"
                        min="1"
                        max="3"
                        value={logLength}
                        onChange={(e) => setLogLength(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  </div>
                )}

                <div className="editor-section">
                  <div className="action-row">
                    <button className="action-btn clear" onClick={clearAll}>
                      Clear
                    </button>
                    <button className="action-btn copy" onClick={copyLevel}>
                      Copy
                    </button>
                    <button className="action-btn paste" onClick={pasteLevel}>
                      Paste
                    </button>
                  </div>
                  <button
                    className="action-btn check"
                    onClick={checkLevel}
                    disabled={checking}
                  >
                    {checking ? 'Checking...' : 'Check Level'}
                  </button>
                  {checkResult && (
                    <div className={`check-result ${checkResult.solvable ? 'solvable' : 'unsolvable'}`}>
                      {checkResult.solvable ? (
                        <>Solvable in <strong>{checkResult.moves}</strong> move{checkResult.moves !== 1 ? 's' : ''}</>
                      ) : (
                        <>Not solvable! {checkResult.reason && <small>({checkResult.reason})</small>}</>
                      )}
                    </div>
                  )}
                  <button
                    className="action-btn export"
                    onClick={saveLevel}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Level'}
                  </button>
                  {saveError && (
                    <div className="save-error">{saveError}</div>
                  )}
                </div>
              </div>

              <div className="editor-grid-area">
                <div
                  className="editor-grid"
                  style={{
                    gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
                    gridTemplateRows: `repeat(${gridSize}, 1fr)`
                  }}
                >
                  {Array(gridSize).fill(null).map((_, rowIndex) => (
                    Array(gridSize).fill(null).map((_, colIndex) => (
                      <div
                        key={`${colIndex}-${rowIndex}`}
                        className={getCellClass(colIndex, rowIndex)}
                        onClick={() => handleCellClick(colIndex, rowIndex)}
                      >
                        <span className="cell-coords">{colIndex},{rowIndex}</span>
                        <span className="cell-piece">{getCellContent(colIndex, rowIndex)}</span>
                      </div>
                    ))
                  ))}

                  {/* Snake overlays - rendered as continuous pieces spanning cells */}
                  {snakes.map((snake, index) => (
                    <div
                      key={`snake-${index}`}
                      className="editor-snake-overlay"
                      style={getSnakeOverlayStyle(snake)}
                      onClick={(e) => {
                        e.stopPropagation()
                        // Click on snake to delete it when eraser is active
                        if (currentTool === 'eraser') {
                          setSnakes(prev => prev.filter((_, i) => i !== index))
                          setCheckResult(null)
                        }
                      }}
                    >
                      {snake.orientation === 'vertical' ? (
                        <VerticalSnakeSVG />
                      ) : (
                        <HorizontalSnakeSVG />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Level Schedule */}
          <div className="level-schedule">
            <h3>Level Schedule</h3>
            {loadingLevels ? (
              <div className="schedule-loading">Loading...</div>
            ) : (
              <div className="schedule-list">
                {dateRange.map(date => (
                  <div key={date} className="schedule-day">
                    <div className="schedule-date">{formatDate(date)}</div>
                    <div className="schedule-slots">
                      {['easy', 'medium', 'hard'].map(diff => {
                        const level = getLevel(date, diff)
                        const isSelected = isCurrentSelection(date, diff)
                        return (
                          <div
                            key={diff}
                            className={`schedule-slot ${diff} ${level ? 'filled' : 'empty'} ${isSelected ? 'selected' : ''}`}
                            onClick={() => selectSlot(date, diff)}
                          >
                            <span className="slot-difficulty">{diff.charAt(0).toUpperCase()}</span>
                            {!level && <span className="slot-needed">+</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LevelEditor
