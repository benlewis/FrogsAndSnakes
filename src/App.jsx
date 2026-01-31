import { useState, useRef, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import './App.css'
import { Button } from '@/components/ui/button'
import LevelEditor from './LevelEditor.jsx'
import AccountMenu from './components/AccountMenu.jsx'
import StatsModal from './components/StatsModal.jsx'
import DailyStreakModal from './components/DailyStreakModal.jsx'
import { solveLevel } from './solver.js'
import {
  FrogSVG,
  LilyPadSVG,
  LogSVG,
  VerticalSnakeSVG,
  HorizontalSnakeSVG,
} from './GamePieces.jsx'
import {
  isSnakeAt,
  isLogAt,
  isLilyPadAt,
  isFrogAt,
  getValidFrogMoves,
  getMaxSnakeDelta,
  checkWinCondition
} from './gameRules.js'

// API base URL - use relative path for production, localhost for dev
const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''


// Helper to get a date in YYYY-MM-DD format using local timezone
const getLocalDateString = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  return getLocalDateString(new Date())
}

// Cookie helpers for persisting progress
const setCookie = (name, value, days = 3) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(JSON.stringify(value))}; expires=${expires}; path=/; SameSite=Lax`
}

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  if (match) {
    try {
      return JSON.parse(decodeURIComponent(match[2]))
    } catch {
      return null
    }
  }
  return null
}

// Get or create a persistent visitor ID for anonymous tracking
const getOrCreateVisitorId = () => {
  const cookieName = 'visitor_id'
  const match = document.cookie.match(new RegExp('(^| )' + cookieName + '=([^;]+)'))
  if (match) {
    return match[2]
  }
  // Generate a UUID-like ID
  const id = 'anon_' + crypto.randomUUID()
  // Store for 365 days
  const expires = new Date(Date.now() + 365 * 864e5).toUTCString()
  document.cookie = `${cookieName}=${id}; expires=${expires}; path=/; SameSite=Lax`
  return id
}

// Get streak data from cookies (for anonymous users)
const getStreaksFromCookie = () => {
  return getCookie('streaks') || {
    easy: { current: 0, best: 0, lastDate: null },
    medium: { current: 0, best: 0, lastDate: null },
    hard: { current: 0, best: 0, lastDate: null }
  }
}

// Update streak in cookies when a puzzle is completed
const updateStreakCookie = (difficulty, puzzleDate) => {
  const streaks = getStreaksFromCookie()
  const streak = streaks[difficulty]

  // Calculate if this continues the streak
  const yesterday = new Date(puzzleDate + 'T12:00:00')
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = getLocalDateString(yesterday)

  if (streak.lastDate === puzzleDate) {
    // Already completed today, no change
    return streaks
  } else if (streak.lastDate === yesterdayStr) {
    // Continues the streak
    streak.current += 1
    streak.best = Math.max(streak.best, streak.current)
  } else {
    // Streak broken or first completion
    streak.current = 1
    streak.best = Math.max(streak.best, 1)
  }
  streak.lastDate = puzzleDate

  setCookie('streaks', streaks, 365)
  return streaks
}


function App() {
  const { user, isAuthenticated } = useAuth0()
  const [showStats, setShowStats] = useState(false)
  const [showStreakModal, setShowStreakModal] = useState(false)
  const [visitorId] = useState(() => getOrCreateVisitorId())
  const [currentDate, setCurrentDate] = useState(getTodayDate())

  // Show streak modal on first visit of the day
  useEffect(() => {
    const lastVisitDate = getCookie('last_visit_date')
    const today = getTodayDate()

    if (lastVisitDate !== today) {
      // First visit today - show the streak modal
      setShowStreakModal(true)
      setCookie('last_visit_date', today, 7)
    }
  }, [])

  // Debug: expose function to show streak modal from console
  useEffect(() => {
    window.showStreakModal = () => setShowStreakModal(true)
    return () => { delete window.showStreakModal }
  }, [])

  // Sync user info to database on login
  useEffect(() => {
    if (isAuthenticated && user?.sub) {
      fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.sub,
          displayName: user.name,
          email: user.email,
          pictureUrl: user.picture
        })
      }).catch(err => console.error('Failed to sync user:', err))
    }
  }, [isAuthenticated, user?.sub])
  const [difficulty, setDifficulty] = useState(() => {
    return getCookie(`difficulty_${getTodayDate()}`) || 'easy'
  })
  const [levels, setLevels] = useState({})
  const [loading, setLoading] = useState(true)
  const gridRef = useRef(null)

  // Save difficulty to cookie when it changes
  useEffect(() => {
    setCookie(`difficulty_${currentDate}`, difficulty)
  }, [difficulty, currentDate])

  // Fetch levels for current date from Vercel Blob
  useEffect(() => {
    const fetchLevels = async () => {
      setLoading(true)
      setCompletedLevels(getCookie(`progress_${currentDate}`) || {})
      try {
        const response = await fetch(`${API_BASE}/api/levels?date=${currentDate}`, {
          cache: 'no-store'
        })
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
      return { frogs: [{ position: [0, 0], color: 'green', direction: 'up' }], snakes: [], logs: [], lilyPads: [] }
    }
    // Support both old single-frog and new multi-frog format
    let frogs
    if (currentLevel.frogs) {
      frogs = currentLevel.frogs.map(f => ({
        position: [...f.position],
        color: f.color || 'green',
        direction: 'up' // Default direction facing up
      }))
    } else if (currentLevel.frog) {
      frogs = [{ position: [...currentLevel.frog.position], color: 'green', direction: 'up' }]
    } else {
      frogs = [{ position: [0, 0], color: 'green', direction: 'up' }]
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

  // Cookie key for current game state
  const gameStateKey = `game_${currentDate}_${difficulty}`

  // Reset game state when level changes (or restore from cookie if available)
  useEffect(() => {
    // Temporarily disable rendering of any selection to prevent stale highlights
    setInitialized(false)

    // Clear all selection state
    setSelectedFrogIndex(null)
    setDraggingFrogIndex(null)
    setFrogDragPos({ x: 0, y: 0 })
    justFinishedDragRef.current = false

    if (currentLevel) {
      // Try to restore saved game state
      const saved = getCookie(gameStateKey)
      const initial = getInitialState()

      // Validate saved state matches current level structure
      // Check counts AND that each snake has the correct number of positions
      const snakesMatch = saved?.gameState?.snakes?.length === initial.snakes.length &&
        saved.gameState.snakes.every((s, i) => s.positions?.length === initial.snakes[i].positions.length)
      const isValidSavedState = saved?.gameState &&
        saved.gameState.frogs?.length === initial.frogs.length &&
        snakesMatch &&
        saved.gameState.lilyPads?.length === initial.lilyPads.length

      if (isValidSavedState) {
        setGameState(saved.gameState)
        setMoves(saved.moves || 0)
        setHintsUsed(saved.hints || 0)
      } else {
        setGameState(initial)
        setMoves(0)
        setHintsUsed(0)
      }
      clearHint()
    }

    // Re-enable selection rendering after state is cleared
    // Use requestAnimationFrame to ensure React has processed the state updates
    requestAnimationFrame(() => {
      setInitialized(true)
    })
  }, [levels, difficulty, currentDate])

  const { frogs, snakes, logs, lilyPads } = gameState

  // Convenience wrapper for shared game rules
  const gameStateForRules = { frogs, snakes, logs, lilyPads }

  // Check win condition using shared rules
  const isGameWon = frogs.length > 0 && checkWinCondition(frogs, lilyPads)

  // Level editor state
  const [showEditor, setShowEditor] = useState(false)

  // Game stats
  const [moves, setMoves] = useState(0)

  // Track completed levels with their stats for the current date
  const [completedLevels, setCompletedLevels] = useState(() => {
    return getCookie(`progress_${currentDate}`) || {}
  })

  // Save completedLevels to cookie whenever it changes
  useEffect(() => {
    if (Object.keys(completedLevels).length > 0) {
      setCookie(`progress_${currentDate}`, completedLevels)
    }
  }, [completedLevels, currentDate])

  // Save stats when a level is won
  useEffect(() => {
    if (isGameWon) {
      // Update local state (only first time for cookie storage)
      if (!completedLevels[difficulty]) {
        setCompletedLevels(prev => ({
          ...prev,
          [difficulty]: { moves, hints: hintsUsed }
        }))
      }

      // Update streak in cookies (for all users, enables offline tracking)
      updateStreakCookie(difficulty, currentDate)

      // Always save to database (DB handles duplicates with ON CONFLICT)
      // Use userId if logged in, otherwise use visitorId for anonymous tracking
      const userId = isAuthenticated && user?.sub ? user.sub : null
      const visitorId = !userId ? getOrCreateVisitorId() : null

      fetch(`${API_BASE}/api/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          visitorId,
          puzzleDate: currentDate,
          difficulty,
          moves,
          hintsUsed
        })
      }).catch(err => console.error('Failed to save stats:', err))
    }
  }, [isGameWon])

  // Hint state
  const [hintMove, setHintMove] = useState(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const hintTimerRef = useRef(null)

  // Save game state to cookie whenever it changes (but not when game is won)
  // Save game state to cookie whenever it changes (including won state)
  useEffect(() => {
    if (currentLevel) {
      setCookie(gameStateKey, { gameState, moves, hints: hintsUsed })
    }
  }, [gameState, moves, hintsUsed, gameStateKey, currentLevel])

  // Frog selection state - track which frog is selected for tap-to-move
  const [selectedFrogIndex, setSelectedFrogIndex] = useState(null)

  // Frog drag state - track which frog index is being dragged
  const [draggingFrogIndex, setDraggingFrogIndex] = useState(null)
  const [frogDragPos, setFrogDragPos] = useState({ x: 0, y: 0 })
  const frogDragStartRef = useRef({ x: 0, y: 0 })
  const justFinishedDragRef = useRef(false)

  // Track mount state to prevent showing stale HMR selection
  const [initialized, setInitialized] = useState(false)

  // Clear selection state on mount (handles HMR stale state)
  useEffect(() => {
    setSelectedFrogIndex(null)
    setDraggingFrogIndex(null)
    setInitialized(true)
  }, [])

  const clearHint = () => {
    setHintMove(null)
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current)
      hintTimerRef.current = null
    }
  }

  const handleReset = () => {
    setGameState(getInitialState())
    setMoves(0)
    setHintsUsed(0)
    setSelectedFrogIndex(null)
    setDraggingFrogIndex(null)
    clearHint()
  }

  const handleHint = () => {
    if (isGameWon || !currentLevel || hintLoading) return
    clearHint()
    setHintLoading(true)

    setTimeout(() => {
      const solverFrogs = frogs.map(f => ({ position: [...f.position], color: f.color }))
      const result = solveLevel(gridSize, solverFrogs, snakes, logs, lilyPads)

      if (result.solvable && result.path.length > 0) {
        setHintMove(result.path[0])
        setHintsUsed(h => h + 1)
        hintTimerRef.current = setTimeout(() => {
          setHintMove(null)
          hintTimerRef.current = null
        }, 3000)
      } else if (!result.solvable) {
        setHintMove({ type: 'unsolvable' })
        hintTimerRef.current = setTimeout(() => {
          setHintMove(null)
          hintTimerRef.current = null
        }, 2000)
      }
      setHintLoading(false)
    }, 10)
  }

  // Snake selection state - track which snake is selected for tap-to-move
  const [selectedSnakeIndex, setSelectedSnakeIndex] = useState(null)

  // Snake drag state - track which snake is being dragged
  const [draggingSnakeIndex, setDraggingSnakeIndex] = useState(null)
  const [snakeDragOffset, setSnakeDragOffset] = useState(0)
  const justFinishedSnakeDragRef = useRef(false)

  // Convenience wrappers for shared game rules
  const isSnakeCell = (col, row) => isSnakeAt(col, row, snakes)
  const isLogCell = (col, row) => isLogAt(col, row, logs)
  const isLilyPad = (col, row) => isLilyPadAt(col, row, lilyPads)
  const localIsFrogAt = (col, row, excludeFrogIndex = -1) => isFrogAt(col, row, frogs, excludeFrogIndex)

  // Calculate the maximum delta a snake can move without hitting obstacles
  const calcMaxSnakeDelta = (snakeIndex, direction) => {
    return getMaxSnakeDelta(snakeIndex, direction, gridSize, gameStateForRules)
  }

  // Get cell content
  const getCellContent = (col, row) => {
    const frogAtCell = frogs.findIndex(f => f.position[0] === col && f.position[1] === row)
    const hasLilyPad = isLilyPad(col, row)

    if (frogAtCell !== -1) {
      return { type: 'frog', frogIndex: frogAtCell, frog: frogs[frogAtCell], hasLilyPad }
    }

    // Logs take priority over lily pads
    if (isLogCell(col, row)) {
      return { type: 'log' }
    }

    if (hasLilyPad) {
      return { type: 'lilypad' }
    }

    return null
  }

  // Calculate valid frog jump destinations using shared rules
  const calcValidFrogMoves = (frogIndex) => {
    return getValidFrogMoves(frogIndex, gridSize, gameStateForRules)
  }

  // Calculate valid snake destinations for tap-to-move
  // Returns all cells the snake can touch (not just head positions)
  const calcValidSnakeDestinations = (snakeIndex) => {
    if (snakeIndex === null || !snakes[snakeIndex]) return []
    const snake = snakes[snakeIndex]
    const isVertical = snake.orientation === 'vertical'
    const positions = snake.positions

    // Get current snake range on its axis
    const axisPositions = positions.map(p => isVertical ? p[1] : p[0])
    const currentMin = Math.min(...axisPositions)
    const currentMax = Math.max(...axisPositions)
    const fixedAxis = isVertical ? positions[0][0] : positions[0][1] // col for vertical, row for horizontal

    const maxPositive = calcMaxSnakeDelta(snakeIndex, 1)
    const maxNegative = calcMaxSnakeDelta(snakeIndex, -1)

    const destinations = []

    // All cells the snake can reach by moving
    const reachableMin = currentMin + maxNegative
    const reachableMax = currentMax + maxPositive

    for (let pos = reachableMin; pos <= reachableMax; pos++) {
      // Skip cells the snake currently occupies
      if (pos >= currentMin && pos <= currentMax) continue

      if (pos >= 0 && pos < gridSize) {
        const col = isVertical ? fixedAxis : pos
        const row = isVertical ? pos : fixedAxis
        destinations.push([col, row])
      }
    }
    return destinations
  }

  // Calculate the delta needed to make the snake touch a specific cell
  const calcSnakeDeltaForCell = (snakeIndex, col, row) => {
    if (snakeIndex === null || !snakes[snakeIndex]) return 0
    const snake = snakes[snakeIndex]
    const isVertical = snake.orientation === 'vertical'
    const positions = snake.positions

    const targetPos = isVertical ? row : col
    const axisPositions = positions.map(p => isVertical ? p[1] : p[0])
    const currentMin = Math.min(...axisPositions)
    const currentMax = Math.max(...axisPositions)

    const maxPositive = calcMaxSnakeDelta(snakeIndex, 1)
    const maxNegative = calcMaxSnakeDelta(snakeIndex, -1)

    // If target is ahead of snake (beyond head), move forward to touch it with head
    if (targetPos > currentMax) {
      const neededDelta = targetPos - currentMax
      return Math.min(neededDelta, maxPositive)
    }
    // If target is behind snake (before tail), move backward to touch it with tail
    if (targetPos < currentMin) {
      const neededDelta = targetPos - currentMin
      return Math.max(neededDelta, maxNegative)
    }

    return 0 // Already touching
  }

  // Validate that selected/dragging frog index is valid for current level
  // Don't show any selection until after initialization (prevents HMR stale state flash)
  const validSelectedFrogIndex = initialized && selectedFrogIndex !== null && selectedFrogIndex < frogs.length ? selectedFrogIndex : null
  const validDraggingFrogIndex = initialized && draggingFrogIndex !== null && draggingFrogIndex < frogs.length ? draggingFrogIndex : null

  const activeFrogIndex = validDraggingFrogIndex !== null ? validDraggingFrogIndex : validSelectedFrogIndex
  const validFrogMoves = activeFrogIndex !== null ? calcValidFrogMoves(activeFrogIndex) : []

  const isValidFrogDestination = (col, row) => {
    return validFrogMoves.some(move => move[0] === col && move[1] === row)
  }

  // Snake selection validation
  const validSelectedSnakeIndex = initialized && selectedSnakeIndex !== null && selectedSnakeIndex < snakes.length ? selectedSnakeIndex : null
  const validSnakeDestinations = validSelectedSnakeIndex !== null ? calcValidSnakeDestinations(validSelectedSnakeIndex) : []

  const isValidSnakeDestination = (col, row) => {
    return validSnakeDestinations.some(dest => dest[0] === col && dest[1] === row)
  }

  const getSnakeDeltaForDestination = (col, row) => {
    return calcSnakeDeltaForCell(validSelectedSnakeIndex, col, row)
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

  // Snake click handler for tap-to-select
  const handleSnakeClick = (snakeIndex) => {
    if (isGameWon) return
    if (justFinishedSnakeDragRef.current) {
      justFinishedSnakeDragRef.current = false
      return
    }
    // Clear frog selection when selecting a snake
    setSelectedFrogIndex(null)
    // Toggle snake selection
    if (selectedSnakeIndex === snakeIndex) {
      setSelectedSnakeIndex(null)
    } else {
      setSelectedSnakeIndex(snakeIndex)
    }
  }

  // Snake drag handler - uses same inline listener pattern as frog drag
  const handleSnakePointerDown = (e, snakeIndex) => {
    if (isGameWon) return
    e.preventDefault()
    e.stopPropagation()

    const snake = snakes[snakeIndex]
    const isVertical = snake.orientation === 'vertical'
    const startPos = isVertical ? snake.positions[0][1] : snake.positions[0][0]
    const startY = e.clientY
    const startX = e.clientX
    let currentOffset = 0
    let hasDragged = false

    setDraggingSnakeIndex(snakeIndex)
    setSnakeDragOffset(0)

    const onPointerMove = (moveEvent) => {
      const cellSize = getCellSize()
      const delta = isVertical
        ? moveEvent.clientY - startY
        : moveEvent.clientX - startX

      if (Math.abs(delta) > 5) {
        hasDragged = true
      }

      const snakeLength = snake.positions.length
      const minPos = 0
      const maxPos = gridSize - snakeLength
      const minBoundOffset = (minPos - startPos) * cellSize
      const maxBoundOffset = (maxPos - startPos) * cellSize

      const maxDeltaPositive = calcMaxSnakeDelta(snakeIndex, 1)
      const maxDeltaNegative = calcMaxSnakeDelta(snakeIndex, -1)

      const minCollisionOffset = maxDeltaNegative * cellSize
      const maxCollisionOffset = maxDeltaPositive * cellSize

      const minOffset = Math.max(minBoundOffset, minCollisionOffset)
      const maxOffset = Math.min(maxBoundOffset, maxCollisionOffset)

      currentOffset = Math.max(minOffset, Math.min(maxOffset, delta))
      setSnakeDragOffset(currentOffset)
    }

    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)

      const cellSize = getCellSize()
      const posDelta = Math.round(currentOffset / cellSize)

      if (posDelta !== 0) {
        setGameState(prev => ({
          ...prev,
          snakes: prev.snakes.map((s, i) =>
            i === snakeIndex
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
        setSelectedSnakeIndex(null)
        clearHint()
      }

      if (hasDragged) {
        justFinishedSnakeDragRef.current = true
      }

      setDraggingSnakeIndex(null)
      setSnakeDragOffset(0)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  // Frog click handler for tap-to-select
  const handleFrogClick = (frogIndex) => {
    if (isGameWon) return
    // Skip if we just finished a drag
    if (justFinishedDragRef.current) {
      justFinishedDragRef.current = false
      return
    }
    // Clear snake selection when selecting a frog
    setSelectedSnakeIndex(null)
    // Toggle selection
    if (selectedFrogIndex === frogIndex) {
      setSelectedFrogIndex(null)
    } else {
      setSelectedFrogIndex(frogIndex)
    }
  }

  // Cell click handler for tap-to-move or deselect
  const handleCellClick = (col, row) => {
    if (isGameWon) return

    // If a frog is selected and clicking a valid destination, move the frog
    if (selectedFrogIndex !== null && isValidFrogDestination(col, row)) {
      const frogIdx = selectedFrogIndex
      setGameState(prev => {
        const oldPos = prev.frogs[frogIdx].position
        let direction = prev.frogs[frogIdx].direction
        const dx = col - oldPos[0]
        const dy = row - oldPos[1]
        if (Math.abs(dx) > Math.abs(dy)) {
          direction = dx > 0 ? 'right' : 'left'
        } else {
          direction = dy > 0 ? 'down' : 'up'
        }
        return {
          ...prev,
          frogs: prev.frogs.map((f, idx) =>
            idx === frogIdx ? { ...f, position: [col, row], direction } : f
          )
        }
      })
      setMoves(m => m + 1)
      setSelectedFrogIndex(null)
      clearHint()
      return
    }

    // If a snake is selected and clicking a valid destination, move the snake
    if (selectedSnakeIndex !== null && isValidSnakeDestination(col, row)) {
      const snakeIdx = selectedSnakeIndex
      const delta = getSnakeDeltaForDestination(col, row)
      const snake = snakes[snakeIdx]
      const isVertical = snake.orientation === 'vertical'

      setGameState(prev => ({
        ...prev,
        snakes: prev.snakes.map((s, i) =>
          i === snakeIdx
            ? {
                ...s,
                positions: s.positions.map(([c, r]) =>
                  isVertical ? [c, r + delta] : [c + delta, r]
                )
              }
            : s
        )
      }))
      setMoves(m => m + 1)
      setSelectedSnakeIndex(null)
      clearHint()
      return
    }

    // Clicking anywhere else deselects both
    setSelectedFrogIndex(null)
    setSelectedSnakeIndex(null)
  }

  // Frog pointer handlers - for drag only
  const handleFrogPointerDown = (e, frogIndex) => {
    if (isGameWon) return
    e.preventDefault()

    setDraggingFrogIndex(frogIndex)
    frogDragStartRef.current = { x: e.clientX, y: e.clientY }
    setFrogDragPos({ x: 0, y: 0 })
    let hasDragged = false

    const onMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - frogDragStartRef.current.x
      const deltaY = moveEvent.clientY - frogDragStartRef.current.y
      // Only consider it a drag if moved more than 5 pixels
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasDragged = true
      }
      setFrogDragPos({ x: deltaX, y: deltaY })
    }

    const onUp = (upEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)

      // Only process as drag if there was actual movement
      if (hasDragged) {
        const gridRect = gridRef.current?.getBoundingClientRect()
        if (gridRect) {
          const cellSize = gridRect.height / gridSize
          const dropX = upEvent.clientX - gridRect.left
          const dropY = upEvent.clientY - gridRect.top

          const dropCol = Math.floor(dropX / cellSize)
          const dropRow = Math.floor(dropY / cellSize)

          const currentValidMoves = calcValidFrogMoves(frogIndex)
          if (currentValidMoves.some(move => move[0] === dropCol && move[1] === dropRow)) {
            setGameState(prev => {
              const oldPos = prev.frogs[frogIndex].position
              let direction = prev.frogs[frogIndex].direction
              const dx = dropCol - oldPos[0]
              const dy = dropRow - oldPos[1]
              if (Math.abs(dx) > Math.abs(dy)) {
                direction = dx > 0 ? 'right' : 'left'
              } else {
                direction = dy > 0 ? 'down' : 'up'
              }
              return {
                ...prev,
                frogs: prev.frogs.map((f, idx) =>
                  idx === frogIndex ? { ...f, position: [dropCol, dropRow], direction } : f
                )
              }
            })
            setMoves(m => m + 1)
            clearHint()
          }
        }
        // Block the click event that follows a drag
        justFinishedDragRef.current = true
      }

      setDraggingFrogIndex(null)
      setFrogDragPos({ x: 0, y: 0 })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }


  // Show loading or no level message
  if (loading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1 className="title">Frogs And Snakes</h1>
          <AccountMenu onShowStats={() => setShowStats(true)} />
        </header>
        <div className="loading-message">Loading puzzles...</div>
        {showStats && <StatsModal onClose={() => setShowStats(false)} currentDate={currentDate} />}
        {showStreakModal && <DailyStreakModal onClose={() => setShowStreakModal(false)} visitorId={visitorId} />}
      </div>
    )
  }

  // Format current date for display
  const formattedDate = new Date(currentDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <>
    <div className="rotate-message">
      <div className="rotate-icon">📱</div>
      <div className="rotate-text">Please rotate your device to portrait mode</div>
    </div>
    <div className="app">
      <header className="app-header">
        <h1 className="title">Frogs And Snakes</h1>
        <AccountMenu onShowStats={() => setShowStats(true)} />
      </header>

      {showStats && <StatsModal onClose={() => setShowStats(false)} currentDate={currentDate} />}
      {showStreakModal && <DailyStreakModal onClose={() => setShowStreakModal(false)} visitorId={visitorId} />}

      {/* Difficulty selector with help button and date */}
      <div className="difficulty-row">
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
      </div>
      <div className="date-row">
        {import.meta.env.DEV ? (
          <div className="date-picker-row">
            <button
              className="date-nav-btn"
              onClick={() => {
                const d = new Date(currentDate + 'T00:00:00')
                d.setDate(d.getDate() - 1)
                setCurrentDate(getLocalDateString(d))
              }}
            >
              &lt;
            </button>
            <input
              type="date"
              className="date-picker"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
            />
            <button
              className="date-nav-btn"
              onClick={() => {
                const d = new Date(currentDate + 'T00:00:00')
                d.setDate(d.getDate() + 1)
                setCurrentDate(getLocalDateString(d))
              }}
            >
              &gt;
            </button>
          </div>
        ) : (
          <div className="date-display">{formattedDate}</div>
        )}
        <a className="learn-btn" href="/learn">Learn</a>
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
        <div key={`${currentDate}-${difficulty}`} className="grid" ref={gridRef} style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)` }}>
          {Array(gridSize).fill(null).map((_, rowIndex) => (
            Array(gridSize).fill(null).map((_, colIndex) => {
              const content = getCellContent(colIndex, rowIndex)
              const snakeCell = isSnakeCell(colIndex, rowIndex)
              const isFrogCell = content?.type === 'frog'
              const isThisFrogSelected = isFrogCell && validSelectedFrogIndex === content.frogIndex
              const isThisFrogDragging = isFrogCell && validDraggingFrogIndex === content.frogIndex
              const isValidFrogDest = isValidFrogDestination(colIndex, rowIndex)
              const isValidSnakeDest = isValidSnakeDestination(colIndex, rowIndex)

              const isHintSource = hintMove?.type === 'frog' && hintMove.from[0] === colIndex && hintMove.from[1] === rowIndex
              const isHintDest = hintMove?.type === 'frog' && hintMove.to[0] === colIndex && hintMove.to[1] === rowIndex

              return (
                <div
                  key={`${colIndex}-${rowIndex}`}
                  className={`cell ${content ? `cell-${content.type}` : ''} ${snakeCell ? 'cell-snake' : ''} ${isThisFrogSelected || isThisFrogDragging ? 'cell-frog-active' : ''} ${activeFrogIndex !== null && isValidFrogDest ? 'cell-valid-dest' : ''} ${validSelectedSnakeIndex !== null && isValidSnakeDest ? 'cell-valid-snake-dest' : ''} ${isHintSource ? 'cell-hint-source' : ''} ${isHintDest ? 'cell-hint-dest' : ''}`}
                  onClick={() => handleCellClick(colIndex, rowIndex)}
                >
                  {content && content.type === 'frog' && content.hasLilyPad ? (
                    /* Frog on lily pad - show lily pad stationary, frog moves */
                    <>
                      <span className="piece-icon lilypad-under-frog">
                        <LilyPadSVG />
                      </span>
                      <span
                        className={`piece-icon frog-piece frog-on-pad ${isThisFrogSelected ? 'selected' : ''} ${isThisFrogDragging ? 'dragging' : ''}`}
                        onPointerDown={!isGameWon ? (e) => handleFrogPointerDown(e, content.frogIndex) : undefined}
                        onClick={!isGameWon ? (e) => { e.stopPropagation(); handleFrogClick(content.frogIndex); } : undefined}
                        style={{
                          transform: isThisFrogDragging
                            ? `translate(${frogDragPos.x}px, ${frogDragPos.y}px)`
                            : undefined,
                          zIndex: isThisFrogDragging ? 100 : undefined,
                        }}
                      >
                        <FrogSVG color={content.frog.color} />
                      </span>
                    </>
                  ) : content && content.type === 'frog' ? (
                    /* Frog not on lily pad */
                    <span
                      className={`piece-icon frog-piece ${isThisFrogSelected ? 'selected' : ''} ${isThisFrogDragging ? 'dragging' : ''}`}
                      onPointerDown={!isGameWon ? (e) => handleFrogPointerDown(e, content.frogIndex) : undefined}
                      onClick={!isGameWon ? (e) => { e.stopPropagation(); handleFrogClick(content.frogIndex); } : undefined}
                      style={{
                        transform: isThisFrogDragging
                          ? `translate(${frogDragPos.x}px, ${frogDragPos.y}px)`
                          : undefined,
                        zIndex: isThisFrogDragging ? 100 : undefined,
                      }}
                    >
                      <FrogSVG color={content.frog.color} />
                    </span>
                  ) : content && content.type === 'lilypad' ? (
                    <span className="piece-icon">
                      <LilyPadSVG />
                    </span>
                  ) : content && content.type === 'log' ? (
                    <span className="piece-icon">
                      <LogSVG />
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
              className={`snake-overlay ${draggingSnakeIndex === index ? 'dragging' : ''} ${validSelectedSnakeIndex === index ? 'snake-selected' : ''} ${hintMove?.type === 'snake' && hintMove.snakeIdx === index ? 'snake-hint' : ''}`}
              style={getSnakeStyle(snake, index)}
              onPointerDown={(e) => handleSnakePointerDown(e, index)}
              onClick={(e) => { e.stopPropagation(); handleSnakeClick(index); }}
            >
              {snake.orientation === 'vertical' ? <VerticalSnakeSVG length={snake.positions.length} /> : <HorizontalSnakeSVG length={snake.positions.length} />}
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stats-bar-actions">
          <Button variant="secondary" size="xs" onClick={handleReset}>
            Reset
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={handleHint}
            disabled={isGameWon || !currentLevel || hintLoading}
          >
            {hintLoading ? 'Thinking...' : hintsUsed > 0 ? `Hint (${hintsUsed})` : 'Hint'}
          </Button>
        </div>
        <div className="stats">
          <span className="stat">
            <span className="stat-label">Moves:</span> {moves}
          </span>
        </div>
      </div>
      {hintMove?.type === 'unsolvable' && (
        <div className="hint-feedback">No solution from here!</div>
      )}

      {/* Win message */}
      {isGameWon && (
        <div className="win-buttons">
          {difficulty !== 'hard' ? (
            <button className="win-message" onClick={() => {
              const nextDifficulty = difficulty === 'easy' ? 'medium' : 'hard'
              setDifficulty(nextDifficulty)
            }}>
              <span>You Win!</span>
              <span className="next-arrow">→</span>
            </button>
          ) : (
            <div className="win-message win-message-static">
              <span>You Win!</span>
            </div>
          )}
          <button className="share-btn" onClick={() => {
            const hintsText = hintsUsed === 1 ? ', 1 hint' : `, ${hintsUsed} hints`
            // Build grid visualization with directional snakes
            const getSnakeEmoji = (col, row) => {
              for (const snake of snakes) {
                const idx = snake.positions.findIndex(p => p[0] === col && p[1] === row)
                if (idx === -1) continue
                // Check if snake is horizontal or vertical based on positions
                const isHorizontal = snake.positions.length > 1 &&
                  snake.positions[0][1] === snake.positions[1][1]
                return isHorizontal ? '🟢' : '🟩'
              }
              return null
            }
            const gridLines = []
            for (let row = 0; row < gridSize; row++) {
              let line = ''
              for (let col = 0; col < gridSize; col++) {
                const hasFrog = frogs.some(f => f.position[0] === col && f.position[1] === row)
                const hasLilyPad = lilyPads.some(lp => lp.position[0] === col && lp.position[1] === row)
                const snakeEmoji = getSnakeEmoji(col, row)
                const hasLog = logs.some(l => l.positions.some(p => p[0] === col && p[1] === row))
                if (hasFrog) line += '🐸'
                else if (hasLilyPad) line += '🪷'
                else if (snakeEmoji) line += snakeEmoji
                else if (hasLog) line += '🪵'
                else line += '🟦'
              }
              gridLines.push(line)
            }
            const gridText = gridLines.join('\n')
            const shareText = `🐸 Frogs & Snakes\n${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}: ${moves} moves${hintsText}\n\n${gridText}\n\n${window.location.origin}`
            if (navigator.share) {
              navigator.share({ text: shareText }).catch(() => {})
            } else {
              navigator.clipboard.writeText(shareText)
              alert('Copied to clipboard!')
            }
          }}>
            <svg viewBox="0 0 24 24" className="share-icon">
              <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
            </svg>
          </button>
        </div>
      )}
      </>
      )}

      {/* Editor button - dev only */}
      {import.meta.env.DEV && (
        <Button
          variant="ghost"
          size="xs"
          className="editor-toggle-btn"
          onClick={() => setShowEditor(true)}
        >
          Level Editor
        </Button>
      )}

      {/* Level Editor - dev only */}
      {import.meta.env.DEV && showEditor && (
        <LevelEditor
          onClose={() => setShowEditor(false)}
          existingLevel={currentLevel}
        />
      )}

    </div>
    </>
  )
}

export default App
