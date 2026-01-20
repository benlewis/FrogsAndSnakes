import { useState, useRef, useEffect } from 'react'
import './App.css'
import LevelEditor from './LevelEditor.jsx'

// API base URL - use relative path for production, localhost for dev
const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

// Frog color schemes
const FROG_COLORS = {
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

// Top-down frog SVG component with color support
const FrogSVG = ({ color = 'green' }) => {
  const colors = FROG_COLORS[color] || FROG_COLORS.green
  const id = `frog-${color}`

  return (
    <svg viewBox="0 0 100 100" className="piece-svg">
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

      {/* Shadow under frog */}
      <ellipse cx="52" cy="58" rx="32" ry="36" fill="rgba(0,0,0,0.2)" />

      {/* Back legs */}
      <ellipse cx="15" cy="75" rx="18" ry="10" fill={`url(#${id}-leg)`} transform="rotate(-30 15 75)" />
      <ellipse cx="85" cy="75" rx="18" ry="10" fill={`url(#${id}-leg)`} transform="rotate(30 85 75)" />
      {/* Back feet */}
      <ellipse cx="5" cy="85" rx="10" ry="6" fill={colors.legDark} transform="rotate(-20 5 85)" />
      <ellipse cx="95" cy="85" rx="10" ry="6" fill={colors.legDark} transform="rotate(20 95 85)" />

      {/* Front legs */}
      <ellipse cx="20" cy="30" rx="15" ry="8" fill={`url(#${id}-leg)`} transform="rotate(-45 20 30)" />
      <ellipse cx="80" cy="30" rx="15" ry="8" fill={`url(#${id}-leg)`} transform="rotate(45 80 30)" />
      {/* Front feet */}
      <ellipse cx="8" cy="20" rx="8" ry="5" fill={colors.legDark} transform="rotate(-30 8 20)" />
      <ellipse cx="92" cy="20" rx="8" ry="5" fill={colors.legDark} transform="rotate(30 92 20)" />

      {/* Body */}
      <ellipse cx="50" cy="55" rx="30" ry="35" fill={`url(#${id}-body)`} filter={`url(#${id}-shadow)`} />

      {/* Body spots */}
      <ellipse cx="40" cy="50" rx="6" ry="8" fill={colors.spots} opacity="0.6" />
      <ellipse cx="60" cy="55" rx="5" ry="7" fill={colors.spots} opacity="0.6" />
      <ellipse cx="50" cy="70" rx="7" ry="5" fill={colors.spots} opacity="0.6" />

      {/* Head */}
      <ellipse cx="50" cy="25" rx="22" ry="18" fill={`url(#${id}-body)`} />

      {/* Eyes - bulging */}
      <circle cx="38" cy="18" r="11" fill={`url(#${id}-body)`} />
      <circle cx="62" cy="18" r="11" fill={`url(#${id}-body)`} />
      <circle cx="38" cy="18" r="7" fill="white" />
      <circle cx="62" cy="18" r="7" fill="white" />
      <circle cx="38" cy="17" r="4" fill="#1a1a1a" />
      <circle cx="62" cy="17" r="4" fill="#1a1a1a" />
      {/* Eye highlights */}
      <circle cx="36" cy="15" r="2" fill="white" opacity="0.8" />
      <circle cx="60" cy="15" r="2" fill="white" opacity="0.8" />

      {/* Nostrils */}
      <circle cx="45" cy="28" r="2" fill={colors.legDark} />
      <circle cx="55" cy="28" r="2" fill={colors.legDark} />
    </svg>
  )
}

// Lily pad SVG component - Teal/blue-green
const LilyPadSVG = () => (
  <svg viewBox="0 0 100 100" className="piece-svg">
    <defs>
      <radialGradient id="lilypadGrad" cx="30%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#5eead4" />
        <stop offset="100%" stopColor="#0f766e" />
      </radialGradient>
      <filter id="lilypadShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="2" floodOpacity="0.25"/>
      </filter>
    </defs>

    {/* Shadow */}
    <ellipse cx="52" cy="53" rx="44" ry="39" fill="rgba(0,0,0,0.15)" />

    {/* Lily pad base */}
    <ellipse cx="50" cy="50" rx="45" ry="40" fill="url(#lilypadGrad)" filter="url(#lilypadShadow)" />

    {/* Notch/cut in the pad */}
    <path
      d="M50 50 L50 10 L30 25 Z"
      fill="#1a1a2e"
    />

    {/* Raised edge highlight */}
    <ellipse cx="50" cy="50" rx="43" ry="38" fill="none" stroke="#99f6e4" strokeWidth="2" opacity="0.5" />

    {/* Veins on the pad */}
    <path d="M50 50 L20 30" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 L80 30" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 L15 50" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 L85 50" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 L25 70" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 L75 70" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />
    <path d="M50 50 L50 85" stroke="#134e4a" strokeWidth="2" fill="none" opacity="0.6" />

    {/* Center of pad */}
    <circle cx="50" cy="50" r="6" fill="#0d9488" />
    <circle cx="50" cy="50" r="3" fill="#14b8a6" />

    {/* Highlight */}
    <ellipse cx="35" cy="40" rx="15" ry="10" fill="#99f6e4" opacity="0.3" />
  </svg>
)

// Stump SVG component - Enhanced 3D
const StumpSVG = () => (
  <svg viewBox="0 0 100 100" className="piece-svg">
    <defs>
      <linearGradient id="barkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#57301a" />
        <stop offset="50%" stopColor="#78350f" />
        <stop offset="100%" stopColor="#57301a" />
      </linearGradient>
      <radialGradient id="stumpTop" cx="40%" cy="40%" r="60%">
        <stop offset="0%" stopColor="#d97706" />
        <stop offset="100%" stopColor="#92400e" />
      </radialGradient>
      <filter id="stumpShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="3" stdDeviation="2" floodOpacity="0.3"/>
      </filter>
    </defs>

    {/* Ground shadow */}
    <ellipse cx="52" cy="75" rx="40" ry="18" fill="rgba(0,0,0,0.2)" />

    {/* Stump side (bark) */}
    <ellipse cx="50" cy="70" rx="38" ry="20" fill="#57301a" />
    <rect x="12" y="50" width="76" height="20" fill="url(#barkGrad)" />

    {/* Bark texture - vertical grooves */}
    <path d="M15 55 L15 68" stroke="#92400e" strokeWidth="4" />
    <path d="M25 52 L25 70" stroke="#6b3a1a" strokeWidth="3" />
    <path d="M35 50 L35 70" stroke="#92400e" strokeWidth="4" />
    <path d="M50 50 L50 70" stroke="#6b3a1a" strokeWidth="3" />
    <path d="M65 50 L65 70" stroke="#92400e" strokeWidth="4" />
    <path d="M75 52 L75 70" stroke="#6b3a1a" strokeWidth="3" />
    <path d="M85 55 L85 68" stroke="#92400e" strokeWidth="4" />

    {/* Stump top */}
    <ellipse cx="50" cy="50" rx="38" ry="20" fill="url(#stumpTop)" filter="url(#stumpShadow)" />

    {/* Tree rings */}
    <ellipse cx="50" cy="50" rx="32" ry="16" fill="none" stroke="#78350f" strokeWidth="2" />
    <ellipse cx="50" cy="50" rx="25" ry="12" fill="none" stroke="#b45309" strokeWidth="1.5" />
    <ellipse cx="50" cy="50" rx="18" ry="9" fill="none" stroke="#78350f" strokeWidth="2" />
    <ellipse cx="50" cy="50" rx="11" ry="5" fill="none" stroke="#b45309" strokeWidth="1.5" />
    <ellipse cx="50" cy="50" rx="5" ry="2.5" fill="#78350f" />

    {/* Highlight on top */}
    <ellipse cx="40" cy="45" rx="12" ry="6" fill="#fbbf24" opacity="0.2" />
  </svg>
)

// Vertical Snake SVG component
const VerticalSnakeSVG = () => (
  <svg viewBox="0 0 40 100" className="snake-svg">
    <defs>
      <linearGradient id="snakeBody" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#14532d" />
        <stop offset="50%" stopColor="#166534" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
      <linearGradient id="snakeHead" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22543d" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
      <filter id="snakeShadow" x="-50%" y="-10%" width="200%" height="120%">
        <feDropShadow dx="2" dy="2" stdDeviation="1.5" floodOpacity="0.3"/>
      </filter>
    </defs>

    {/* Shadow */}
    <path
      d="M22 95 Q22 85 22 75 Q22 50 22 25 Q22 15 22 12"
      stroke="rgba(0,0,0,0.2)"
      strokeWidth="14"
      strokeLinecap="round"
      fill="none"
    />

    {/* Snake body - dark forest green */}
    <path
      d="M20 95 Q20 85 20 75 Q20 50 20 25 Q20 15 20 12"
      stroke="url(#snakeBody)"
      strokeWidth="12"
      strokeLinecap="round"
      fill="none"
      filter="url(#snakeShadow)"
    />

    {/* Snake scales/pattern - diamond shapes */}
    <path d="M20 85 L24 80 L20 75 L16 80 Z" fill="#15803d" opacity="0.7" />
    <path d="M20 70 L24 65 L20 60 L16 65 Z" fill="#15803d" opacity="0.7" />
    <path d="M20 55 L24 50 L20 45 L16 50 Z" fill="#15803d" opacity="0.7" />
    <path d="M20 40 L24 35 L20 30 L16 35 Z" fill="#15803d" opacity="0.7" />

    {/* Body highlight */}
    <path
      d="M17 90 Q17 50 17 20"
      stroke="#22543d"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
      opacity="0.5"
    />

    {/* Snake head */}
    <ellipse cx="20" cy="8" rx="13" ry="9" fill="url(#snakeHead)" filter="url(#snakeShadow)" />

    {/* Head highlight */}
    <ellipse cx="17" cy="5" rx="5" ry="3" fill="#22543d" opacity="0.4" />

    {/* Eyes */}
    <circle cx="14" cy="6" r="3.5" fill="#fef08a" />
    <circle cx="26" cy="6" r="3.5" fill="#fef08a" />
    <ellipse cx="14" cy="6" rx="1.5" ry="2.5" fill="#1a1a1a" />
    <ellipse cx="26" cy="6" rx="1.5" ry="2.5" fill="#1a1a1a" />

    {/* Tongue */}
    <path
      d="M20 0 L18 -6 M20 0 L22 -6"
      stroke="#dc2626"
      strokeWidth="1.5"
      strokeLinecap="round"
    />

    {/* Tail point */}
    <path
      d="M20 95 Q23 98 20 100"
      stroke="#14532d"
      strokeWidth="5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

// Horizontal Snake SVG component
const HorizontalSnakeSVG = () => (
  <svg viewBox="0 0 100 40" className="snake-svg-horizontal">
    <defs>
      <linearGradient id="snakeBodyH" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#14532d" />
        <stop offset="50%" stopColor="#166534" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
      <linearGradient id="snakeHeadH" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#22543d" />
        <stop offset="100%" stopColor="#14532d" />
      </linearGradient>
      <filter id="snakeShadowH" x="-10%" y="-50%" width="120%" height="200%">
        <feDropShadow dx="2" dy="2" stdDeviation="1.5" floodOpacity="0.3"/>
      </filter>
    </defs>

    {/* Shadow */}
    <path
      d="M5 22 Q15 22 25 22 Q50 22 75 22 Q85 22 88 22"
      stroke="rgba(0,0,0,0.2)"
      strokeWidth="14"
      strokeLinecap="round"
      fill="none"
    />

    {/* Snake body */}
    <path
      d="M5 20 Q15 20 25 20 Q50 20 75 20 Q85 20 88 20"
      stroke="url(#snakeBodyH)"
      strokeWidth="12"
      strokeLinecap="round"
      fill="none"
      filter="url(#snakeShadowH)"
    />

    {/* Snake scales */}
    <path d="M15 20 L20 24 L25 20 L20 16 Z" fill="#15803d" opacity="0.7" />
    <path d="M35 20 L40 24 L45 20 L40 16 Z" fill="#15803d" opacity="0.7" />
    <path d="M55 20 L60 24 L65 20 L60 16 Z" fill="#15803d" opacity="0.7" />
    <path d="M75 20 L80 24 L85 20 L80 16 Z" fill="#15803d" opacity="0.7" />

    {/* Snake head (on the right) */}
    <ellipse cx="92" cy="20" rx="9" ry="13" fill="url(#snakeHeadH)" filter="url(#snakeShadowH)" />

    {/* Eyes */}
    <circle cx="94" cy="14" r="3.5" fill="#fef08a" />
    <circle cx="94" cy="26" r="3.5" fill="#fef08a" />
    <ellipse cx="94" cy="14" rx="2.5" ry="1.5" fill="#1a1a1a" />
    <ellipse cx="94" cy="26" rx="2.5" ry="1.5" fill="#1a1a1a" />

    {/* Tongue */}
    <path
      d="M100 20 L106 18 M100 20 L106 22"
      stroke="#dc2626"
      strokeWidth="1.5"
      strokeLinecap="round"
    />

    {/* Tail */}
    <path
      d="M5 20 Q2 23 0 20"
      stroke="#14532d"
      strokeWidth="5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date()
  return today.toISOString().split('T')[0]
}


function App() {
  const [difficulty, setDifficulty] = useState('easy')
  const [levels, setLevels] = useState({})
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(getTodayDate())
  const gridRef = useRef(null)

  // Fetch levels for current date from Vercel Blob
  useEffect(() => {
    const fetchLevels = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API_BASE}/api/levels?date=${currentDate}`)
        if (response.ok) {
          const levelMap = await response.json()
          setLevels(levelMap)
        } else {
          console.error('Error fetching levels:', await response.text())
        }
      } catch (error) {
        console.error('Error fetching levels:', error)
      }
      setLoading(false)
    }

    fetchLevels()
  }, [currentDate])

  // Get level for current difficulty
  const currentLevel = levels[difficulty]
  const gridSize = currentLevel?.gridSize || 5

  // Initialize game state from current level
  const getInitialState = () => {
    if (!currentLevel) {
      return { frogs: [{ position: [0, 0], color: 'green' }], snakes: [], logs: [], lilyPads: [] }
    }
    // Support both old single-frog and new multi-frog format
    let frogs
    if (currentLevel.frogs) {
      frogs = currentLevel.frogs.map(f => ({
        position: [...f.position],
        color: f.color || 'green'
      }))
    } else if (currentLevel.frog) {
      frogs = [{ position: [...currentLevel.frog.position], color: 'green' }]
    } else {
      frogs = [{ position: [0, 0], color: 'green' }]
    }
    return {
      frogs,
      snakes: currentLevel.snakes.map(s => ({
        positions: s.positions.map(p => [...p]),
        orientation: s.orientation
      })),
      logs: currentLevel.logs.map(l => ({
        positions: l.positions.map(p => [...p])
      })),
      lilyPads: currentLevel.lilyPads.map(lp => ({
        position: [...lp.position]
      }))
    }
  }

  const [gameState, setGameState] = useState(getInitialState)

  // Reset game state when level changes
  useEffect(() => {
    if (currentLevel) {
      setGameState(getInitialState())
      setMoves(0)
      setTime(0)
    }
  }, [currentLevel?.name, currentLevel?.date, difficulty])

  const { frogs, snakes, logs, lilyPads } = gameState

  // Check win condition - all frogs on separate lily pads
  const isLilyPad = (col, row) => {
    return lilyPads.some(lp => lp.position[0] === col && lp.position[1] === row)
  }

  // Check if a frog is at a position
  const isFrogAt = (col, row, excludeFrogIndex = -1) => {
    return frogs.some((f, idx) => idx !== excludeFrogIndex && f.position[0] === col && f.position[1] === row)
  }

  // Win condition: all frogs must be on separate lily pads
  const isGameWon = frogs.length > 0 && frogs.every((frog, idx) => {
    const [col, row] = frog.position
    if (!isLilyPad(col, row)) return false
    // Check no other frog on same lily pad
    for (let j = idx + 1; j < frogs.length; j++) {
      if (frogs[j].position[0] === col && frogs[j].position[1] === row) return false
    }
    return true
  })

  // Level editor state
  const [showEditor, setShowEditor] = useState(false)

  // Game stats
  const [moves, setMoves] = useState(0)
  const [time, setTime] = useState(0)

  // Timer effect
  useEffect(() => {
    if (isGameWon) return

    const interval = setInterval(() => {
      setTime(t => t + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isGameWon])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleReset = () => {
    setGameState(getInitialState())
    setMoves(0)
    setTime(0)
  }

  // Snake drag state - track which snake is being dragged
  const [draggingSnakeIndex, setDraggingSnakeIndex] = useState(null)
  const [snakeDragOffset, setSnakeDragOffset] = useState(0)
  const snakeDragStartRef = useRef({ y: 0, x: 0, startPos: 0 })

  // Frog drag state - track which frog index is being dragged
  const [draggingFrogIndex, setDraggingFrogIndex] = useState(null)
  const [frogDragPos, setFrogDragPos] = useState({ x: 0, y: 0 })
  const frogDragStartRef = useRef({ x: 0, y: 0 })

  // Check if cell is occupied by any snake
  const isSnakeCell = (col, row) => {
    return snakes.some(snake =>
      snake.positions.some(pos => pos[0] === col && pos[1] === row)
    )
  }

  // Check if cell is occupied by any log
  const isLogCell = (col, row) => {
    return logs.some(log =>
      log.positions.some(pos => pos[0] === col && pos[1] === row)
    )
  }

  // Get cell content
  const getCellContent = (col, row) => {
    const frogAtCell = frogs.findIndex(f => f.position[0] === col && f.position[1] === row)
    const hasLilyPad = isLilyPad(col, row)

    if (frogAtCell !== -1) {
      return { type: 'frog', frogIndex: frogAtCell, frog: frogs[frogAtCell], hasLilyPad }
    }

    if (hasLilyPad) {
      return { type: 'lilypad' }
    }

    if (isLogCell(col, row)) {
      return { type: 'log' }
    }

    return null
  }

  // Check if a cell has an obstacle that can be jumped over (for a specific frog)
  const isObstacle = (col, row, excludeFrogIndex = -1) => {
    if (isSnakeCell(col, row)) return true
    if (isLogCell(col, row)) return true
    // Other frogs are obstacles
    if (isFrogAt(col, row, excludeFrogIndex)) return true
    return false
  }

  const canLandOn = (col, row, excludeFrogIndex = -1) => {
    if (isSnakeCell(col, row)) return false
    if (isLogCell(col, row)) return false
    // Can't land on another frog
    if (isFrogAt(col, row, excludeFrogIndex)) return false
    // Can't land on a lily pad that another frog is on (but OK if same frog)
    if (isLilyPad(col, row) && isFrogAt(col, row, excludeFrogIndex)) return false
    return true
  }

  // Calculate valid frog jump destinations for a specific frog
  const getValidFrogMoves = (frogIndex) => {
    if (frogIndex === null || frogIndex === undefined || !frogs[frogIndex]) return []
    const [frogCol, frogRow] = frogs[frogIndex].position
    const validMoves = []

    const directions = [
      { dc: 1, dr: 0 },
      { dc: -1, dr: 0 },
      { dc: 0, dr: 1 },
      { dc: 0, dr: -1 },
    ]

    for (const { dc, dr } of directions) {
      let col = frogCol + dc
      let row = frogRow + dr

      if (col < 0 || col >= gridSize || row < 0 || row >= gridSize) continue
      if (!isObstacle(col, row, frogIndex)) continue

      col += dc
      row += dr
      while (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
        if (canLandOn(col, row, frogIndex)) {
          validMoves.push([col, row])
          break
        }
        if (!isObstacle(col, row, frogIndex)) {
          // Empty cell without jumping over anything - not valid
          break
        }
        col += dc
        row += dr
      }
    }

    return validMoves
  }

  const validFrogMoves = draggingFrogIndex !== null ? getValidFrogMoves(draggingFrogIndex) : []

  const isValidFrogDestination = (col, row) => {
    return validFrogMoves.some(move => move[0] === col && move[1] === row)
  }

  const getCellSize = () => {
    if (!gridRef.current) return 0
    const gridRect = gridRef.current.getBoundingClientRect()
    return gridRect.height / gridSize
  }

  // Calculate snake overlay style
  const getSnakeStyle = (snake, snakeIndex) => {
    const positions = snake.positions
    const minCol = Math.min(...positions.map(p => p[0]))
    const maxCol = Math.max(...positions.map(p => p[0]))
    const minRow = Math.min(...positions.map(p => p[1]))
    const maxRow = Math.max(...positions.map(p => p[1]))

    const cellPercent = 100 / gridSize
    const gapAdjust = 0.8

    const isDragging = draggingSnakeIndex === snakeIndex
    const isVertical = snake.orientation === 'vertical'

    let dragOffsetPercent = 0
    if (isDragging && gridRef.current) {
      const gridHeight = gridRef.current.getBoundingClientRect().height
      dragOffsetPercent = (snakeDragOffset / gridHeight) * 100
    }

    return {
      left: `${minCol * cellPercent + gapAdjust + (isVertical ? 0 : dragOffsetPercent)}%`,
      top: `${minRow * cellPercent + gapAdjust + (isVertical ? dragOffsetPercent : 0)}%`,
      width: `${(maxCol - minCol + 1) * cellPercent - gapAdjust * 2}%`,
      height: `${(maxRow - minRow + 1) * cellPercent - gapAdjust * 2}%`,
      cursor: isDragging ? 'grabbing' : 'grab',
      transition: isDragging ? 'none' : 'top 0.15s ease-out, left 0.15s ease-out',
    }
  }

  // Snake drag handlers
  const handleSnakePointerDown = (e, snakeIndex) => {
    if (isGameWon) return
    e.preventDefault()
    const snake = snakes[snakeIndex]
    const isVertical = snake.orientation === 'vertical'
    setDraggingSnakeIndex(snakeIndex)
    const startPos = isVertical ? snake.positions[0][1] : snake.positions[0][0]
    snakeDragStartRef.current = {
      y: e.clientY,
      x: e.clientX,
      startPos
    }
    setSnakeDragOffset(0)
  }

  const handleSnakePointerMove = (e) => {
    if (draggingSnakeIndex === null) return

    const snake = snakes[draggingSnakeIndex]
    const isVertical = snake.orientation === 'vertical'
    const cellSize = getCellSize()
    const delta = isVertical
      ? e.clientY - snakeDragStartRef.current.y
      : e.clientX - snakeDragStartRef.current.x

    const snakeLength = snake.positions.length
    const minPos = 0
    const maxPos = gridSize - snakeLength

    const currentPos = snakeDragStartRef.current.startPos
    const minOffset = (minPos - currentPos) * cellSize
    const maxOffset = (maxPos - currentPos) * cellSize

    const constrainedOffset = Math.max(minOffset, Math.min(maxOffset, delta))
    setSnakeDragOffset(constrainedOffset)
  }

  const handleSnakePointerUp = () => {
    if (draggingSnakeIndex === null) return

    const snake = snakes[draggingSnakeIndex]
    const isVertical = snake.orientation === 'vertical'
    const cellSize = getCellSize()
    const posDelta = Math.round(snakeDragOffset / cellSize)

    if (posDelta !== 0) {
      setGameState(prev => ({
        ...prev,
        snakes: prev.snakes.map((s, i) =>
          i === draggingSnakeIndex
            ? {
                ...s,
                positions: s.positions.map(([col, row]) =>
                  isVertical ? [col, row + posDelta] : [col + posDelta, row]
                )
              }
            : s
        )
      }))
      setMoves(m => m + 1)
    }

    setDraggingSnakeIndex(null)
    setSnakeDragOffset(0)
  }

  // Frog drag handlers
  const handleFrogPointerDown = (e, frogIndex) => {
    if (isGameWon) return
    e.preventDefault()
    e.stopPropagation()
    setDraggingFrogIndex(frogIndex)
    frogDragStartRef.current = { x: e.clientX, y: e.clientY }
    setFrogDragPos({ x: 0, y: 0 })
  }

  const handleFrogPointerMove = (e) => {
    if (draggingFrogIndex === null) return
    const deltaX = e.clientX - frogDragStartRef.current.x
    const deltaY = e.clientY - frogDragStartRef.current.y
    setFrogDragPos({ x: deltaX, y: deltaY })
  }

  // Event listeners
  useEffect(() => {
    if (draggingSnakeIndex !== null) {
      window.addEventListener('pointermove', handleSnakePointerMove)
      window.addEventListener('pointerup', handleSnakePointerUp)
      return () => {
        window.removeEventListener('pointermove', handleSnakePointerMove)
        window.removeEventListener('pointerup', handleSnakePointerUp)
      }
    }
  }, [draggingSnakeIndex, snakeDragOffset, snakes])

  useEffect(() => {
    const onPointerMove = (e) => handleFrogPointerMove(e)
    const onPointerUp = (e) => {
      if (draggingFrogIndex === null) return

      const gridRect = gridRef.current?.getBoundingClientRect()
      if (gridRect) {
        const cellSize = gridRect.height / gridSize
        const dropX = e.clientX - gridRect.left
        const dropY = e.clientY - gridRect.top

        const dropCol = Math.floor(dropX / cellSize)
        const dropRow = Math.floor(dropY / cellSize)

        if (validFrogMoves.some(move => move[0] === dropCol && move[1] === dropRow)) {
          const frogIdx = draggingFrogIndex
          setGameState(prev => ({
            ...prev,
            frogs: prev.frogs.map((f, idx) =>
              idx === frogIdx ? { ...f, position: [dropCol, dropRow] } : f
            )
          }))
          setMoves(m => m + 1)
        }
      }

      setDraggingFrogIndex(null)
      setFrogDragPos({ x: 0, y: 0 })
    }

    if (draggingFrogIndex !== null) {
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      return () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }
    }
  }, [draggingFrogIndex, validFrogMoves, gridSize])

  // Show loading or no level message
  if (loading) {
    return (
      <div className="app">
        <h1 className="title">Frogs And Snakes</h1>
        <div className="loading-message">Loading puzzles...</div>
      </div>
    )
  }

  return (
    <div className="app">
      <h1 className="title">Frogs And Snakes</h1>

      {/* Difficulty selector */}
      <div className="difficulty-selector">
        <button
          className={`difficulty-btn ${difficulty === 'easy' ? 'active' : ''} ${!levels.easy ? 'disabled' : ''}`}
          onClick={() => levels.easy && setDifficulty('easy')}
          disabled={!levels.easy}
        >
          Easy
        </button>
        <button
          className={`difficulty-btn ${difficulty === 'medium' ? 'active' : ''} ${!levels.medium ? 'disabled' : ''}`}
          onClick={() => levels.medium && setDifficulty('medium')}
          disabled={!levels.medium}
        >
          Medium
        </button>
        <button
          className={`difficulty-btn ${difficulty === 'hard' ? 'active' : ''} ${!levels.hard ? 'disabled' : ''}`}
          onClick={() => levels.hard && setDifficulty('hard')}
          disabled={!levels.hard}
        >
          Hard
        </button>
      </div>

      {!currentLevel ? (
        <div className="no-level-message">
          No {difficulty} puzzle available for today.
          <br />
          Check back later!
        </div>
      ) : (
      <>
      <div className="grid-container">
        <div className="grid" ref={gridRef} style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)` }}>
          {Array(gridSize).fill(null).map((_, rowIndex) => (
            Array(gridSize).fill(null).map((_, colIndex) => {
              const content = getCellContent(colIndex, rowIndex)
              const snakeCell = isSnakeCell(colIndex, rowIndex)
              const isFrogCell = content?.type === 'frog'
              const isThisFrogDragging = isFrogCell && draggingFrogIndex === content.frogIndex
              const isValidDest = isValidFrogDestination(colIndex, rowIndex)

              return (
                <div
                  key={`${colIndex}-${rowIndex}`}
                  className={`cell ${content ? `cell-${content.type}` : ''} ${snakeCell ? 'cell-snake' : ''} ${isThisFrogDragging ? 'cell-frog-active' : ''} ${draggingFrogIndex !== null && isValidDest ? 'cell-valid-dest' : ''}`}
                >
                  {content && content.type === 'frog' && content.hasLilyPad && (
                    <span className="piece-icon lilypad-under">
                      <LilyPadSVG />
                    </span>
                  )}
                  {content && content.type === 'frog' ? (
                    <span
                      className={`piece-icon frog-piece ${isThisFrogDragging ? 'dragging' : ''}`}
                      onPointerDown={!isGameWon ? (e) => handleFrogPointerDown(e, content.frogIndex) : undefined}
                      style={isThisFrogDragging ? {
                        transform: `translate(${frogDragPos.x}px, ${frogDragPos.y}px)`,
                        zIndex: 100,
                      } : {}}
                    >
                      <FrogSVG color={content.frog.color} />
                    </span>
                  ) : content && content.type === 'lilypad' ? (
                    <span className="piece-icon">
                      <LilyPadSVG />
                    </span>
                  ) : content && content.type === 'log' ? (
                    <span className="piece-icon">
                      <StumpSVG />
                    </span>
                  ) : null}
                </div>
              )
            })
          ))}

          {/* Snake overlays */}
          {snakes.map((snake, index) => (
            <div
              key={`snake-${index}`}
              className={`snake-overlay ${draggingSnakeIndex === index ? 'dragging' : ''}`}
              style={getSnakeStyle(snake, index)}
              onPointerDown={(e) => handleSnakePointerDown(e, index)}
            >
              {snake.orientation === 'vertical' ? <VerticalSnakeSVG /> : <HorizontalSnakeSVG />}
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <button className="reset-btn" onClick={handleReset}>
          Reset
        </button>
        <div className="stats">
          <span className="stat">
            <span className="stat-label">Time:</span> {formatTime(time)}
          </span>
          <span className="stat">
            <span className="stat-label">Moves:</span> {moves}
            {currentLevel.par && <span className="par"> (Par: {currentLevel.par})</span>}
          </span>
        </div>
      </div>

      {/* Win message */}
      {isGameWon && (
        <div className="win-message">
          You Win!
        </div>
      )}
      </>
      )}

      {/* Editor button - dev only */}
      {import.meta.env.DEV && (
        <button
          className="editor-toggle-btn"
          onClick={() => setShowEditor(true)}
        >
          Level Editor
        </button>
      )}

      {/* Level Editor - dev only */}
      {import.meta.env.DEV && showEditor && (
        <LevelEditor
          onClose={() => setShowEditor(false)}
          existingLevel={currentLevel}
        />
      )}
    </div>
  )
}

export default App
