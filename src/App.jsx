import { useState, useRef, useEffect } from 'react'
import './App.css'

// Top-down frog SVG component - Yellow-green/lime frog
const FrogSVG = () => (
  <svg viewBox="0 0 100 100" className="piece-svg">
    <defs>
      <radialGradient id="frogBody" cx="40%" cy="30%" r="60%">
        <stop offset="0%" stopColor="#bef264" />
        <stop offset="100%" stopColor="#65a30d" />
      </radialGradient>
      <radialGradient id="frogLeg" cx="40%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#a3e635" />
        <stop offset="100%" stopColor="#4d7c0f" />
      </radialGradient>
      <filter id="frogShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="3" stdDeviation="2" floodOpacity="0.3"/>
      </filter>
    </defs>

    {/* Shadow under frog */}
    <ellipse cx="52" cy="58" rx="32" ry="36" fill="rgba(0,0,0,0.2)" />

    {/* Back legs */}
    <ellipse cx="15" cy="75" rx="18" ry="10" fill="url(#frogLeg)" transform="rotate(-30 15 75)" />
    <ellipse cx="85" cy="75" rx="18" ry="10" fill="url(#frogLeg)" transform="rotate(30 85 75)" />
    {/* Back feet */}
    <ellipse cx="5" cy="85" rx="10" ry="6" fill="#4d7c0f" transform="rotate(-20 5 85)" />
    <ellipse cx="95" cy="85" rx="10" ry="6" fill="#4d7c0f" transform="rotate(20 95 85)" />

    {/* Front legs */}
    <ellipse cx="20" cy="30" rx="15" ry="8" fill="url(#frogLeg)" transform="rotate(-45 20 30)" />
    <ellipse cx="80" cy="30" rx="15" ry="8" fill="url(#frogLeg)" transform="rotate(45 80 30)" />
    {/* Front feet */}
    <ellipse cx="8" cy="20" rx="8" ry="5" fill="#4d7c0f" transform="rotate(-30 8 20)" />
    <ellipse cx="92" cy="20" rx="8" ry="5" fill="#4d7c0f" transform="rotate(30 92 20)" />

    {/* Body */}
    <ellipse cx="50" cy="55" rx="30" ry="35" fill="url(#frogBody)" filter="url(#frogShadow)" />

    {/* Body spots */}
    <ellipse cx="40" cy="50" rx="6" ry="8" fill="#84cc16" opacity="0.6" />
    <ellipse cx="60" cy="55" rx="5" ry="7" fill="#84cc16" opacity="0.6" />
    <ellipse cx="50" cy="70" rx="7" ry="5" fill="#84cc16" opacity="0.6" />

    {/* Head */}
    <ellipse cx="50" cy="25" rx="22" ry="18" fill="url(#frogBody)" />

    {/* Eyes - bulging */}
    <circle cx="38" cy="18" r="11" fill="url(#frogBody)" />
    <circle cx="62" cy="18" r="11" fill="url(#frogBody)" />
    <circle cx="38" cy="18" r="7" fill="white" />
    <circle cx="62" cy="18" r="7" fill="white" />
    <circle cx="38" cy="17" r="4" fill="#1a1a1a" />
    <circle cx="62" cy="17" r="4" fill="#1a1a1a" />
    {/* Eye highlights */}
    <circle cx="36" cy="15" r="2" fill="white" opacity="0.8" />
    <circle cx="60" cy="15" r="2" fill="white" opacity="0.8" />

    {/* Nostrils */}
    <circle cx="45" cy="28" r="2" fill="#4d7c0f" />
    <circle cx="55" cy="28" r="2" fill="#4d7c0f" />
  </svg>
)

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

// Initial positions
const INITIAL_FROG = { position: [1, 1] }
const INITIAL_SNAKE = { positions: [[2, 1], [2, 2]] }

function App() {
  const [difficulty, setDifficulty] = useState('easy')
  const gridSize = 5
  const gridRef = useRef(null)

  // Game pieces: positions are [column, row] (x, y)
  const [frog, setFrog] = useState(INITIAL_FROG)
  const [snake, setSnake] = useState(INITIAL_SNAKE)
  const [log] = useState({ positions: [[3, 1]] }) // Log is length 1
  const [lilyPads] = useState({ positions: [[2, 4]] }) // Lily pads - win targets

  // Check win condition - all frogs on lily pads
  const isLilyPad = (col, row) => {
    return lilyPads.positions.some(pos => pos[0] === col && pos[1] === row)
  }

  const isGameWon = isLilyPad(frog.position[0], frog.position[1])

  // Game stats
  const [moves, setMoves] = useState(0)
  const [time, setTime] = useState(0)

  // Timer effect
  useEffect(() => {
    if (isGameWon) return // Stop timer when won

    const interval = setInterval(() => {
      setTime(t => t + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isGameWon])

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Reset game to initial state
  const handleReset = () => {
    setFrog({ ...INITIAL_FROG })
    setSnake({ positions: [...INITIAL_SNAKE.positions.map(p => [...p])] })
    setMoves(0)
    setTime(0)
  }

  // Snake drag state
  const [isSnakeDragging, setIsSnakeDragging] = useState(false)
  const [snakeDragOffset, setSnakeDragOffset] = useState(0)
  const snakeDragStartRef = useRef({ y: 0, startRow: 0 })

  // Frog drag state
  const [isFrogDragging, setIsFrogDragging] = useState(false)
  const [frogDragPos, setFrogDragPos] = useState({ x: 0, y: 0 })
  const frogDragStartRef = useRef({ x: 0, y: 0 })

  // Get what's on a cell at (column, row) - excludes multi-cell pieces like snake
  const getCellContent = (col, row) => {
    // Check for frog (render on top of lily pad if both present)
    const hasFrog = frog.position[0] === col && frog.position[1] === row
    const hasLilyPad = isLilyPad(col, row)

    if (hasFrog) {
      return { type: 'frog', hasLilyPad }
    }

    if (hasLilyPad) {
      return { type: 'lilypad' }
    }

    // Check for log
    for (let i = 0; i < log.positions.length; i++) {
      if (log.positions[i][0] === col && log.positions[i][1] === row) {
        return { type: 'log' }
      }
    }

    return null
  }

  // Check if cell is occupied by snake (for background highlighting)
  const isSnakeCell = (col, row) => {
    return snake.positions.some(pos => pos[0] === col && pos[1] === row)
  }

  // Check if a cell has an obstacle that can be jumped over (snake, log - NOT lily pad)
  const isObstacle = (col, row) => {
    if (snake.positions.some(pos => pos[0] === col && pos[1] === row)) return true
    if (log.positions.some(pos => pos[0] === col && pos[1] === row)) return true
    return false
  }

  // Check if frog can land on a cell (empty or lily pad, not occupied by obstacles)
  const canLandOn = (col, row) => {
    // Can't land on obstacles
    if (isObstacle(col, row)) return false
    // Can land on empty cells or lily pads
    return true
  }

  // Calculate valid frog jump destinations
  const getValidFrogMoves = () => {
    const [frogCol, frogRow] = frog.position
    const validMoves = []

    // Check each direction: right, left, down, up
    const directions = [
      { dc: 1, dr: 0 },  // right
      { dc: -1, dr: 0 }, // left
      { dc: 0, dr: 1 },  // down
      { dc: 0, dr: -1 }, // up
    ]

    for (const { dc, dr } of directions) {
      let col = frogCol + dc
      let row = frogRow + dr

      // First, check if adjacent cell has something to jump over (obstacle)
      if (col < 0 || col >= gridSize || row < 0 || row >= gridSize) continue
      if (!isObstacle(col, row)) continue // Nothing to jump over

      // Keep moving in this direction until we find a valid landing spot
      col += dc
      row += dr
      while (col >= 0 && col < gridSize && row >= 0 && row < gridSize) {
        if (canLandOn(col, row)) {
          // Found valid landing spot (empty or lily pad)
          validMoves.push([col, row])
          break
        }
        col += dc
        row += dr
      }
    }

    return validMoves
  }

  const validFrogMoves = isFrogDragging ? getValidFrogMoves() : []

  // Check if a cell is a valid frog destination
  const isValidFrogDestination = (col, row) => {
    return validFrogMoves.some(move => move[0] === col && move[1] === row)
  }

  // Get cell size in pixels
  const getCellSize = () => {
    if (!gridRef.current) return 0
    const gridRect = gridRef.current.getBoundingClientRect()
    return gridRect.height / gridSize
  }

  // Calculate snake overlay position and dimensions
  const getSnakeStyle = () => {
    const positions = snake.positions
    const minCol = Math.min(...positions.map(p => p[0]))
    const maxCol = Math.max(...positions.map(p => p[0]))
    const minRow = Math.min(...positions.map(p => p[1]))
    const maxRow = Math.max(...positions.map(p => p[1]))

    const cellPercent = 100 / gridSize
    const gapAdjust = 0.8 // Adjust for grid gaps

    // Add drag offset when dragging
    const dragOffsetPercent = isSnakeDragging ? (snakeDragOffset / (gridRef.current?.getBoundingClientRect().height || 1)) * 100 : 0

    return {
      left: `${minCol * cellPercent + gapAdjust}%`,
      top: `${minRow * cellPercent + gapAdjust + dragOffsetPercent}%`,
      width: `${(maxCol - minCol + 1) * cellPercent - gapAdjust * 2}%`,
      height: `${(maxRow - minRow + 1) * cellPercent - gapAdjust * 2}%`,
      cursor: isSnakeDragging ? 'grabbing' : 'grab',
      transition: isSnakeDragging ? 'none' : 'top 0.15s ease-out',
    }
  }

  // Snake drag handlers
  const handleSnakePointerDown = (e) => {
    if (isGameWon) return // Don't allow moves after winning
    e.preventDefault()
    setIsSnakeDragging(true)
    const headRow = snake.positions[0][1]
    snakeDragStartRef.current = { y: e.clientY, startRow: headRow }
    setSnakeDragOffset(0)
  }

  const handleSnakePointerMove = (e) => {
    if (!isSnakeDragging) return

    const cellSize = getCellSize()
    const deltaY = e.clientY - snakeDragStartRef.current.y

    // Calculate the constrained offset
    const snakeLength = snake.positions.length
    const minRow = 0 // Head can't go above row 0
    const maxRow = gridSize - snakeLength // Head can't go beyond this or tail goes off grid

    const currentRow = snakeDragStartRef.current.startRow
    const minOffset = (minRow - currentRow) * cellSize
    const maxOffset = (maxRow - currentRow) * cellSize

    const constrainedOffset = Math.max(minOffset, Math.min(maxOffset, deltaY))
    setSnakeDragOffset(constrainedOffset)
  }

  const handleSnakePointerUp = () => {
    if (!isSnakeDragging) return

    const cellSize = getCellSize()
    const rowDelta = Math.round(snakeDragOffset / cellSize)

    // Update snake positions and increment moves if snake actually moved
    if (rowDelta !== 0) {
      setSnake(prev => ({
        ...prev,
        positions: prev.positions.map(([col, row]) => [col, row + rowDelta])
      }))
      setMoves(m => m + 1)
    }

    setIsSnakeDragging(false)
    setSnakeDragOffset(0)
  }

  // Frog drag handlers
  const handleFrogPointerDown = (e) => {
    if (isGameWon) return // Don't allow moves after winning
    e.preventDefault()
    e.stopPropagation()
    setIsFrogDragging(true)
    frogDragStartRef.current = { x: e.clientX, y: e.clientY }
    setFrogDragPos({ x: 0, y: 0 })
  }

  const handleFrogPointerMove = (e) => {
    if (!isFrogDragging) return

    const deltaX = e.clientX - frogDragStartRef.current.x
    const deltaY = e.clientY - frogDragStartRef.current.y
    setFrogDragPos({ x: deltaX, y: deltaY })
  }

  // Add global pointer event listeners when dragging
  useEffect(() => {
    if (isSnakeDragging) {
      window.addEventListener('pointermove', handleSnakePointerMove)
      window.addEventListener('pointerup', handleSnakePointerUp)
      return () => {
        window.removeEventListener('pointermove', handleSnakePointerMove)
        window.removeEventListener('pointerup', handleSnakePointerUp)
      }
    }
  }, [isSnakeDragging, snakeDragOffset])

  useEffect(() => {
    const onPointerMove = (e) => handleFrogPointerMove(e)
    const onPointerUp = (e) => {
      if (!isFrogDragging) return

      const gridRect = gridRef.current?.getBoundingClientRect()
      if (gridRect) {
        const cellSize = gridRect.height / gridSize
        const dropX = e.clientX - gridRect.left
        const dropY = e.clientY - gridRect.top

        const dropCol = Math.floor(dropX / cellSize)
        const dropRow = Math.floor(dropY / cellSize)

        if (validFrogMoves.some(move => move[0] === dropCol && move[1] === dropRow)) {
          setFrog({ position: [dropCol, dropRow] })
          setMoves(m => m + 1)
        }
      }

      setIsFrogDragging(false)
      setFrogDragPos({ x: 0, y: 0 })
    }

    if (isFrogDragging) {
      window.addEventListener('pointermove', onPointerMove)
      window.addEventListener('pointerup', onPointerUp)
      return () => {
        window.removeEventListener('pointermove', onPointerMove)
        window.removeEventListener('pointerup', onPointerUp)
      }
    }
  }, [isFrogDragging, validFrogMoves, gridSize])

  return (
    <div className="app">
      <h1 className="title">Frogs And Snakes</h1>

      <div className="difficulty-selector">
        <button
          className={`difficulty-btn ${difficulty === 'easy' ? 'active' : ''}`}
          onClick={() => setDifficulty('easy')}
        >
          Easy
        </button>
        <button
          className={`difficulty-btn ${difficulty === 'medium' ? 'active' : ''}`}
          onClick={() => setDifficulty('medium')}
        >
          Medium
        </button>
        <button
          className={`difficulty-btn ${difficulty === 'hard' ? 'active' : ''}`}
          onClick={() => setDifficulty('hard')}
        >
          Hard
        </button>
      </div>

      <div className="grid-container">
        <div className="grid" ref={gridRef}>
          {Array(gridSize).fill(null).map((_, rowIndex) => (
            Array(gridSize).fill(null).map((_, colIndex) => {
              const content = getCellContent(colIndex, rowIndex)
              const snakeCell = isSnakeCell(colIndex, rowIndex)
              const isFrogCell = frog.position[0] === colIndex && frog.position[1] === rowIndex
              const isValidDest = isValidFrogDestination(colIndex, rowIndex)

              return (
                <div
                  key={`${colIndex}-${rowIndex}`}
                  className={`cell ${content ? `cell-${content.type}` : ''} ${snakeCell ? 'cell-snake' : ''} ${isFrogDragging && isFrogCell ? 'cell-frog-active' : ''} ${isFrogDragging && isValidDest ? 'cell-valid-dest' : ''}`}
                >
                  {/* Render lily pad underneath if frog is on it */}
                  {content && content.type === 'frog' && content.hasLilyPad && (
                    <span className="piece-icon lilypad-under">
                      <LilyPadSVG />
                    </span>
                  )}
                  {content && content.type === 'frog' ? (
                    <span
                      className={`piece-icon frog-piece ${isFrogDragging ? 'dragging' : ''}`}
                      onPointerDown={!isGameWon ? handleFrogPointerDown : undefined}
                      style={isFrogDragging ? {
                        transform: `translate(${frogDragPos.x}px, ${frogDragPos.y}px)`,
                        zIndex: 100,
                      } : {}}
                    >
                      <FrogSVG />
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
          {/* Snake overlay - SVG spanning all snake cells */}
          <div
            className={`snake-overlay ${isSnakeDragging ? 'dragging' : ''}`}
            style={getSnakeStyle()}
            onPointerDown={handleSnakePointerDown}
          >
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
              <path
                d="M20 85 L24 80 L20 75 L16 80 Z"
                fill="#15803d"
                opacity="0.7"
              />
              <path
                d="M20 70 L24 65 L20 60 L16 65 Z"
                fill="#15803d"
                opacity="0.7"
              />
              <path
                d="M20 55 L24 50 L20 45 L16 50 Z"
                fill="#15803d"
                opacity="0.7"
              />
              <path
                d="M20 40 L24 35 L20 30 L16 35 Z"
                fill="#15803d"
                opacity="0.7"
              />

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
          </div>
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
          </span>
        </div>
      </div>

      {/* Win message */}
      {isGameWon && (
        <div className="win-message">
          You Win!
        </div>
      )}
    </div>
  )
}

export default App
