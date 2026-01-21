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

// Frog color schemes for SVG - cartoony glossy style
const FROG_COLOR_SCHEMES = {
  green: {
    body: '#22c55e',
    bodyLight: '#4ade80',
    bodyDark: '#166534',
    belly: '#fde047',
    bellyDark: '#ca8a04',
    outline: '#14532d',
    toes: '#f97316',
  },
  brown: {
    body: '#a16207',
    bodyLight: '#d4a574',
    bodyDark: '#713f12',
    belly: '#fef3c7',
    bellyDark: '#d97706',
    outline: '#451a03',
    toes: '#ea580c',
  },
  blue: {
    body: '#3b82f6',
    bodyLight: '#93c5fd',
    bodyDark: '#1e40af',
    belly: '#bfdbfe',
    bellyDark: '#2563eb',
    outline: '#1e3a8a',
    toes: '#f97316',
  },
}

// Cartoony glossy Frog SVG component for editor
const FrogSVG = ({ color = 'green' }) => {
  const colors = FROG_COLOR_SCHEMES[color] || FROG_COLOR_SCHEMES.green
  const id = `editor-frog-${color}`

  return (
    <svg viewBox="0 0 100 100" className="editor-piece-svg">
      <defs>
        <radialGradient id={`${id}-body`} cx="40%" cy="30%" r="70%">
          <stop offset="0%" stopColor={colors.bodyLight} />
          <stop offset="60%" stopColor={colors.body} />
          <stop offset="100%" stopColor={colors.bodyDark} />
        </radialGradient>
        <radialGradient id={`${id}-belly`} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor={colors.belly} />
          <stop offset="100%" stopColor={colors.bellyDark} />
        </radialGradient>
        <radialGradient id={`${id}-eye`} cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#d0d0d0" />
        </radialGradient>
      </defs>
      {/* Body outline */}
      <ellipse cx="50" cy="60" rx="28" ry="24" fill={colors.outline} />
      <ellipse cx="50" cy="58" rx="26" ry="22" fill={`url(#${id}-body)`} />
      {/* Belly */}
      <ellipse cx="50" cy="64" rx="14" ry="10" fill={colors.outline} />
      <ellipse cx="50" cy="63" rx="12" ry="8" fill={`url(#${id}-belly)`} />
      {/* Front feet */}
      <ellipse cx="28" cy="72" rx="6" ry="4" fill={colors.outline} />
      <ellipse cx="28" cy="71" rx="4" ry="3" fill={colors.toes} />
      <ellipse cx="72" cy="72" rx="6" ry="4" fill={colors.outline} />
      <ellipse cx="72" cy="71" rx="4" ry="3" fill={colors.toes} />
      {/* Head outline */}
      <ellipse cx="50" cy="35" rx="24" ry="20" fill={colors.outline} />
      <ellipse cx="50" cy="34" rx="22" ry="18" fill={`url(#${id}-body)`} />
      {/* Eye bumps */}
      <circle cx="38" cy="22" r="12" fill={colors.outline} />
      <circle cx="38" cy="21" r="10" fill={`url(#${id}-body)`} />
      <circle cx="62" cy="22" r="12" fill={colors.outline} />
      <circle cx="62" cy="21" r="10" fill={`url(#${id}-body)`} />
      {/* Eyes */}
      <ellipse cx="38" cy="24" rx="6" ry="7" fill={colors.outline} />
      <ellipse cx="38" cy="24" rx="5" ry="6" fill={`url(#${id}-eye)`} />
      <ellipse cx="39" cy="25" rx="2.5" ry="3.5" fill="#1a1a1a" />
      <circle cx="37" cy="22" r="2" fill="white" />
      <ellipse cx="62" cy="24" rx="6" ry="7" fill={colors.outline} />
      <ellipse cx="62" cy="24" rx="5" ry="6" fill={`url(#${id}-eye)`} />
      <ellipse cx="63" cy="25" rx="2.5" ry="3.5" fill="#1a1a1a" />
      <circle cx="61" cy="22" r="2" fill="white" />
      {/* Smile */}
      <path d="M42 42 Q50 48 58 42" stroke={colors.outline} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Shine */}
      <ellipse cx="42" cy="50" rx="8" ry="5" fill="white" opacity="0.3" />
    </svg>
  )
}

const LilyPadSVG = () => (
  <svg viewBox="0 0 100 100" className="editor-piece-svg">
    <defs>
      <radialGradient id="editorLilypadMain" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="50%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#166534" />
      </radialGradient>
      <radialGradient id="editorLilypadCenter" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#ca8a04" />
      </radialGradient>
    </defs>
    {/* Shadow */}
    <ellipse cx="52" cy="55" rx="44" ry="38" fill="rgba(0,0,0,0.2)" />
    {/* Main pad outline */}
    <ellipse cx="50" cy="52" rx="44" ry="38" fill="#14532d" />
    {/* Main pad */}
    <ellipse cx="50" cy="50" rx="42" ry="36" fill="url(#editorLilypadMain)" />
    {/* Notch */}
    <path d="M50 50 L50 12 L30 28 Z" fill="#1e3a5f" />
    {/* Veins */}
    <path d="M50 50 L20 30" stroke="#166534" strokeWidth="2.5" fill="none" opacity="0.5" />
    <path d="M50 50 L80 30" stroke="#166534" strokeWidth="2.5" fill="none" opacity="0.5" />
    <path d="M50 50 L10 50" stroke="#166534" strokeWidth="2.5" fill="none" opacity="0.5" />
    <path d="M50 50 L90 50" stroke="#166534" strokeWidth="2.5" fill="none" opacity="0.5" />
    <path d="M50 50 L50 88" stroke="#166534" strokeWidth="2.5" fill="none" opacity="0.5" />
    {/* Center */}
    <circle cx="50" cy="50" r="7" fill="#14532d" />
    <circle cx="50" cy="49" r="5" fill="url(#editorLilypadCenter)" />
    {/* Highlights */}
    <ellipse cx="35" cy="38" rx="14" ry="9" fill="white" opacity="0.35" />
    <ellipse cx="32" cy="35" rx="7" ry="4" fill="white" opacity="0.5" />
  </svg>
)

const LogSVG = () => (
  <svg viewBox="0 0 100 100" className="editor-piece-svg">
    <defs>
      <radialGradient id="editorLogTop" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="40%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>
      <linearGradient id="editorLogBark" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#78350f" />
        <stop offset="20%" stopColor="#92400e" />
        <stop offset="50%" stopColor="#a16207" />
        <stop offset="80%" stopColor="#92400e" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
      <radialGradient id="editorLogCenter" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#92400e" />
        <stop offset="100%" stopColor="#451a03" />
      </radialGradient>
    </defs>
    {/* Shadow */}
    <ellipse cx="52" cy="94" rx="42" ry="8" fill="rgba(0,0,0,0.25)" />
    {/* Bark base/bottom */}
    <ellipse cx="50" cy="90" rx="44" ry="10" fill="#451a03" />
    {/* Bark body */}
    <path d="M6 28 L6 88 Q50 98 94 88 L94 28 Q50 38 6 28" fill="url(#editorLogBark)" />
    {/* Bark outline */}
    <path d="M6 28 L6 88" stroke="#451a03" strokeWidth="3" />
    <path d="M94 28 L94 88" stroke="#451a03" strokeWidth="3" />
    {/* Bark texture lines */}
    <path d="M18 32 L18 86" stroke="#78350f" strokeWidth="4" opacity="0.6" />
    <path d="M34 34 L34 90" stroke="#451a03" strokeWidth="3" opacity="0.5" />
    <path d="M50 36 L50 92" stroke="#78350f" strokeWidth="4" opacity="0.6" />
    <path d="M66 34 L66 90" stroke="#451a03" strokeWidth="3" opacity="0.5" />
    <path d="M82 32 L82 86" stroke="#78350f" strokeWidth="4" opacity="0.6" />
    {/* Top face outline */}
    <ellipse cx="50" cy="28" rx="46" ry="18" fill="#78350f" />
    {/* Top face */}
    <ellipse cx="50" cy="26" rx="44" ry="16" fill="url(#editorLogTop)" />
    {/* Tree rings */}
    <ellipse cx="50" cy="26" rx="36" ry="12" fill="none" stroke="#b45309" strokeWidth="2" opacity="0.6" />
    <ellipse cx="50" cy="26" rx="26" ry="8" fill="none" stroke="#92400e" strokeWidth="2" opacity="0.7" />
    <ellipse cx="50" cy="26" rx="16" ry="5" fill="none" stroke="#b45309" strokeWidth="2" opacity="0.6" />
    <ellipse cx="50" cy="26" rx="8" ry="2.5" fill="none" stroke="#92400e" strokeWidth="2" opacity="0.7" />
    {/* Center */}
    <ellipse cx="50" cy="26" rx="4" ry="1.5" fill="url(#editorLogCenter)" />
    {/* Top glossy highlights */}
    <ellipse cx="35" cy="20" rx="14" ry="6" fill="white" opacity="0.3" />
    <ellipse cx="32" cy="18" rx="7" ry="3" fill="white" opacity="0.5" />
    {/* Bark highlight */}
    <path d="M14 38 Q18 55 14 75" stroke="#d97706" strokeWidth="3" fill="none" opacity="0.4" />
  </svg>
)

const VerticalSnakeSVG = () => (
  <svg viewBox="0 0 40 100" className="editor-snake-svg-vertical">
    <defs>
      <linearGradient id="editorSnakeBodyV" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="30%" stopColor="#a855f7" />
        <stop offset="50%" stopColor="#c084fc" />
        <stop offset="70%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <radialGradient id="editorSnakeEyeV" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#d0d0d0" />
      </radialGradient>
    </defs>
    {/* Shadow */}
    <ellipse cx="22" cy="96" rx="16" ry="4" fill="rgba(0,0,0,0.2)" />
    {/* Tail */}
    <path d="M14 90 Q20 98 26 90" fill="#5b21b6" />
    <path d="M15 89 Q20 95 25 89" fill="#7c3aed" />
    {/* Body outline */}
    <rect x="6" y="22" width="28" height="70" rx="14" fill="#5b21b6" />
    {/* Body */}
    <rect x="8" y="24" width="24" height="66" rx="12" fill="url(#editorSnakeBodyV)" />
    {/* Body pattern */}
    <ellipse cx="20" cy="40" rx="10" ry="6" fill="#7c3aed" opacity="0.5" />
    <ellipse cx="20" cy="58" rx="10" ry="6" fill="#7c3aed" opacity="0.5" />
    <ellipse cx="20" cy="76" rx="10" ry="6" fill="#7c3aed" opacity="0.5" />
    {/* Belly stripe */}
    <rect x="16" y="30" width="8" height="55" rx="4" fill="#e9d5ff" opacity="0.4" />
    {/* Head outline */}
    <ellipse cx="20" cy="18" rx="16" ry="14" fill="#5b21b6" />
    {/* Head */}
    <ellipse cx="20" cy="16" rx="14" ry="12" fill="url(#editorSnakeBodyV)" />
    {/* Eyes */}
    <ellipse cx="13" cy="14" rx="5" ry="6" fill="#5b21b6" />
    <ellipse cx="13" cy="13" rx="4" ry="5" fill="url(#editorSnakeEyeV)" />
    <ellipse cx="14" cy="14" rx="2" ry="3" fill="#1a1a1a" />
    <circle cx="12" cy="11" r="1.5" fill="white" />
    <ellipse cx="27" cy="14" rx="5" ry="6" fill="#5b21b6" />
    <ellipse cx="27" cy="13" rx="4" ry="5" fill="url(#editorSnakeEyeV)" />
    <ellipse cx="28" cy="14" rx="2" ry="3" fill="#1a1a1a" />
    <circle cx="26" cy="11" r="1.5" fill="white" />
    {/* Nostrils */}
    <circle cx="16" cy="22" r="1.5" fill="#5b21b6" />
    <circle cx="24" cy="22" r="1.5" fill="#5b21b6" />
    {/* Tongue */}
    <path d="M20 26 L20 32 M18 34 L20 32 L22 34" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Shine */}
    <ellipse cx="14" cy="12" rx="4" ry="3" fill="white" opacity="0.3" />
  </svg>
)

const HorizontalSnakeSVG = () => (
  <svg viewBox="0 0 100 40" className="editor-snake-svg-horizontal">
    <defs>
      <linearGradient id="editorSnakeBodyH" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#7c3aed" />
        <stop offset="30%" stopColor="#a855f7" />
        <stop offset="50%" stopColor="#c084fc" />
        <stop offset="70%" stopColor="#a855f7" />
        <stop offset="100%" stopColor="#7c3aed" />
      </linearGradient>
      <radialGradient id="editorSnakeEyeH" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#d0d0d0" />
      </radialGradient>
    </defs>
    {/* Shadow */}
    <ellipse cx="50" cy="38" rx="45" ry="4" fill="rgba(0,0,0,0.2)" />
    {/* Tail */}
    <path d="M10 14 Q2 20 10 26" fill="#5b21b6" />
    <path d="M11 15 Q5 20 11 25" fill="#7c3aed" />
    {/* Body outline */}
    <rect x="8" y="6" width="70" height="28" rx="14" fill="#5b21b6" />
    {/* Body */}
    <rect x="10" y="8" width="66" height="24" rx="12" fill="url(#editorSnakeBodyH)" />
    {/* Body pattern */}
    <ellipse cx="24" cy="20" rx="6" ry="10" fill="#7c3aed" opacity="0.5" />
    <ellipse cx="42" cy="20" rx="6" ry="10" fill="#7c3aed" opacity="0.5" />
    <ellipse cx="60" cy="20" rx="6" ry="10" fill="#7c3aed" opacity="0.5" />
    {/* Belly stripe */}
    <rect x="15" y="16" width="55" height="8" rx="4" fill="#e9d5ff" opacity="0.4" />
    {/* Head outline */}
    <ellipse cx="82" cy="20" rx="14" ry="16" fill="#5b21b6" />
    {/* Head */}
    <ellipse cx="84" cy="20" rx="12" ry="14" fill="url(#editorSnakeBodyH)" />
    {/* Eyes */}
    <ellipse cx="86" cy="13" rx="6" ry="5" fill="#5b21b6" />
    <ellipse cx="87" cy="13" rx="5" ry="4" fill="url(#editorSnakeEyeH)" />
    <ellipse cx="88" cy="14" rx="3" ry="2" fill="#1a1a1a" />
    <circle cx="86" cy="12" r="1.5" fill="white" />
    <ellipse cx="86" cy="27" rx="6" ry="5" fill="#5b21b6" />
    <ellipse cx="87" cy="27" rx="5" ry="4" fill="url(#editorSnakeEyeH)" />
    <ellipse cx="88" cy="28" rx="3" ry="2" fill="#1a1a1a" />
    <circle cx="86" cy="26" r="1.5" fill="white" />
    {/* Nostrils */}
    <circle cx="94" cy="17" r="1.5" fill="#5b21b6" />
    <circle cx="94" cy="23" r="1.5" fill="#5b21b6" />
    {/* Tongue */}
    <path d="M96 20 L102 20 M104 18 L102 20 L104 22" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" fill="none" />
    {/* Shine */}
    <ellipse cx="84" cy="14" rx="3" ry="4" fill="white" opacity="0.3" />
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
      // Can't jump over a lily pad (unless another frog is on it)
      if (isLilyPad(col, row) && !frogPositions.some((f, idx) => idx !== frogIdx && f[0] === col && f[1] === row)) continue

      // Found an obstacle, look for landing spot (skip over consecutive obstacles)
      col += dc
      row += dr
      while (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
        const onLilyPad = isLilyPad(col, row)
        const hasFrog = frogPositions.some((f, idx) => idx !== frogIdx && f[0] === col && f[1] === row)
        const hasSnake = snakePositions.some(s => s.positions.some(p => p[0] === col && p[1] === row))
        const hasLog = logs.some(l => l.positions.some(p => p[0] === col && p[1] === row))

        // If there's a lily pad here with no other frog, must land here
        if (onLilyPad && !hasFrog) {
          moves.push({ frogIdx, newPos: [col, row] })
          break
        }

        // Can land on empty cells (no snake, log, or frog)
        if (!hasSnake && !hasLog && !hasFrog) {
          moves.push({ frogIdx, newPos: [col, row] })
          break
        }

        // Can only continue jumping over snakes, logs, or frogs
        if (hasSnake || hasLog || hasFrog) {
          col += dc
          row += dr
          continue
        }

        // Shouldn't reach here, but break just in case
        break
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
      // Remove any lily pads at the log positions
      const newLilyPads = lilyPads.filter(lp =>
        !positions.some(pos => pos[0] === lp.position[0] && pos[1] === lp.position[1])
      )
      setLilyPads(newLilyPads)
      setLogs([...logs, { positions }])
    } else if (currentTool === 'lilypad') {
      // Remove any logs at this position
      const newLogs = logs.filter(log =>
        !log.positions.some(pos => pos[0] === col && pos[1] === row)
      )
      if (newLogs.length !== logs.length) {
        setLogs(newLogs)
      }
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
    const hasLog = isLogCell(col, row)
    if (hasLog) classes.push('cell-log')
    // Only show lily pad background if there's no log (logs take priority)
    if (isLilyPadCell(col, row) && !hasLog) classes.push('cell-lilypad')
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
      return <LogSVG />
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
