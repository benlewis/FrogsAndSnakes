import { useState, useRef, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import './App.css'
import { Button } from '@/components/ui/button'
import AccountMenu from './components/AccountMenu.jsx'
import StatsModal from './components/StatsModal.jsx'
import DailyStreakModal from './components/DailyStreakModal.jsx'
import WelcomeModal from './components/WelcomeModal.jsx'
import CalendarModal from './components/CalendarModal.jsx'
import LeaderboardModal from './components/LeaderboardModal.jsx'
import PlayModeDialog from './components/PlayModeDialog.jsx'
import ColorJump from './ColorJump.jsx'
import { solveLevel } from './solver.js'
import { resolvePlayMode, savePlayMode } from './lib/playMode.js'
import { useGameTimer, formatTime } from './lib/useGameTimer.js'
import {
  FrogSVG,
  FROG_PALETTE,
  HappyFrogSVG,
  SadFrogSVG,
  LilyPadSVG,
  LogSVG,
  VerticalSnakeSVG,
  HorizontalSnakeSVG,
  PortalSVG,
  StoneSVG,
  SwitchSVG,
} from './GamePieces.jsx'
import {
  isSnakeAt,
  isLogAt,
  isLilyPadAt,
  isFrogAt,
  getValidFrogMoves,
  getMaxSnakeDelta,
  checkWinCondition,
  saddleCellOf,
  riddenSnakeIndexAt,
  isStoneRaised,
  isSwitchDisabled,
  resolveFrogDestination,
  applySwitchLanding,
  portalExitOf,
} from './gameRules.js'

// API base URL - use relative path for production, localhost for dev
const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

// Allowed emails for level editor access
const ALLOWED_EMAILS = ['ben.lewis@gmail.com']


// Helper to get a date in YYYY-MM-DD format using local timezone
const getLocalDateString = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  return getLocalDateString(new Date())
}

// Helper to get the most recent Sunday (for Expert level)
const getMostRecentSunday = (fromDate = new Date()) => {
  const date = new Date(fromDate)
  const day = date.getDay()
  date.setDate(date.getDate() - day) // Go back to Sunday
  return getLocalDateString(date)
}

// Helper to get the Saturday after a given Sunday
const getSaturdayAfter = (sundayDate) => {
  const date = new Date(sundayDate + 'T12:00:00')
  date.setDate(date.getDate() + 6)
  return getLocalDateString(date)
}

// Format date range for Expert level display
const formatDateRange = (sundayDate) => {
  const sunday = new Date(sundayDate + 'T12:00:00')
  const saturday = new Date(sundayDate + 'T12:00:00')
  saturday.setDate(saturday.getDate() + 6)

  const formatShort = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${formatShort(sunday)} - ${formatShort(saturday)}`
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
    hard: { current: 0, best: 0, lastDate: null },
    expert: { current: 0, best: 0, lastDate: null }
  }
}

// Update streak in cookies when a puzzle is completed
const updateStreakCookie = (difficulty, puzzleDate) => {
  const streaks = getStreaksFromCookie()

  // Initialize streak for this difficulty if it doesn't exist
  if (!streaks[difficulty]) {
    streaks[difficulty] = { current: 0, best: 0, lastDate: null }
  }
  const streak = streaks[difficulty]

  // For expert (weekly), compare against last Sunday; for daily levels, compare against yesterday
  const isExpert = difficulty === 'expert'
  const prevDate = new Date(puzzleDate + 'T12:00:00')
  if (isExpert) {
    prevDate.setDate(prevDate.getDate() - 7) // Last week's Sunday
  } else {
    prevDate.setDate(prevDate.getDate() - 1) // Yesterday
  }
  const prevDateStr = getLocalDateString(prevDate)

  if (streak.lastDate === puzzleDate) {
    // Already completed this puzzle, no change
    return streaks
  } else if (streak.lastDate === prevDateStr) {
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


function App({ initialGame = 'jumping-frogs' }) {
  const { user, isAuthenticated } = useAuth0()
  const [showStats, setShowStats] = useState(false)
  const [showStreakModal, setShowStreakModal] = useState(false)
  const [showWelcome, setShowWelcome] = useState(() => !getCookie('has_seen_welcome'))
  const [showCalendar, setShowCalendar] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [levelCoverage, setLevelCoverage] = useState(null)
  const [currentGame, setCurrentGame] = useState(initialGame)
  const [visitorId] = useState(() => getOrCreateVisitorId())
  const [currentDate, setCurrentDate] = useState(getTodayDate())

  // Play mode: 'casual' | 'competitive' | null (null = not yet chosen).
  // Resolved on mount from server (if logged in) → cookie. While null, the
  // PlayModeDialog is shown and cannot be dismissed.
  const [playMode, setPlayMode] = useState(null)
  const [playModeResolved, setPlayModeResolved] = useState(false)
  const [showPlayModeDialog, setShowPlayModeDialog] = useState(false)
  // The mode used for the level currently in play. Mode changes mid-game don't
  // affect an in-progress level — they take effect on reset / next puzzle.
  const [activeMode, setActiveMode] = useState(null)

  // Show streak modal on first visit of the day
  useEffect(() => {
    const lastVisitDate = getCookie('last_visit_date')
    const today = getTodayDate()

    if (lastVisitDate !== today && getCookie('has_seen_welcome')) {
      // First visit today - show the streak modal (but not on very first visit)
      setShowStreakModal(true)
      setCookie('last_visit_date', today, 7)
    }
  }, [])

  // Debug: expose function to show streak modal from console
  useEffect(() => {
    window.showStreakModal = () => setShowStreakModal(true)
    return () => { delete window.showStreakModal }
  }, [])

  // Update page title based on current game
  useEffect(() => {
    document.title = currentGame === 'color-jump' ? 'Color Jump' : 'Jumping Frogs'
  }, [currentGame])

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

  // Resolve play mode (server-first if logged in, then cookie). The user-sync
  // effect above runs in parallel; for new users the row may not be in the DB
  // yet when we fetch prefs. That's fine — we'll get null and fall back to the
  // cookie. If the cookie is also empty we open the chooser dialog.
  useEffect(() => {
    let cancelled = false
    const userId = isAuthenticated && user?.sub ? user.sub : null
    resolvePlayMode({ userId }).then((resolved) => {
      if (cancelled) return
      setPlayMode(resolved)
      setPlayModeResolved(true)
      if (!resolved) setShowPlayModeDialog(true)
    })
    return () => { cancelled = true }
  }, [isAuthenticated, user?.sub])

  const handleChoosePlayMode = (mode) => {
    setPlayMode(mode)
    setShowPlayModeDialog(false)
    const userId = isAuthenticated && user?.sub ? user.sub : null
    savePlayMode({ userId, mode })
  }

  // Fetch level coverage for admin users
  const isAdmin = isAuthenticated && user?.email && ALLOWED_EMAILS.includes(user.email)
  useEffect(() => {
    if (!isAdmin) return
    fetch(`${API_BASE}/api/level-coverage`)
      .then(r => r.json())
      .then(data => setLevelCoverage(data.consecutiveDays))
      .catch(err => console.error('Failed to fetch level coverage:', err))
  }, [isAdmin])

  const [difficulty, setDifficulty] = useState(() => {
    return getCookie(`difficulty_${getTodayDate()}`) || 'easy'
  })
  const [levels, setLevels] = useState({})
  const [cjLevels, setCjLevels] = useState({})
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
        // Fetch daily levels
        const response = await fetch(`${API_BASE}/api/levels?date=${currentDate}`, {
          cache: 'no-store'
        })
        let levelMap = {}
        if (response.ok) {
          levelMap = await response.json()
        } else {
          console.error('Error fetching levels:', await response.text())
        }

        // Fetch Expert level - in dev mode check current date first, then fall back to most recent Sunday
        if (!levelMap.expert) {
          const sundayDate = getMostRecentSunday(new Date(currentDate + 'T12:00:00'))
          if (sundayDate !== currentDate) {
            const expertResponse = await fetch(`${API_BASE}/api/levels?date=${sundayDate}`, {
              cache: 'no-store'
            })
            if (expertResponse.ok) {
              const sundayLevels = await expertResponse.json()
              if (sundayLevels.expert) {
                levelMap.expert = sundayLevels.expert
              }
            }
          }
        }

        setLevels(levelMap)

        // Also fetch Color Jump levels for difficulty buttons
        const cjResponse = await fetch(`${API_BASE}/api/levels?date=${currentDate}&game=cj`, {
          cache: 'no-store'
        })
        let cjMap = {}
        if (cjResponse.ok) {
          cjMap = await cjResponse.json()
        }
        // Fetch CJ Expert from most recent Sunday if not on current date
        if (!cjMap.expert) {
          const sundayDate = getMostRecentSunday(new Date(currentDate + 'T12:00:00'))
          if (sundayDate !== currentDate) {
            const cjExpertResponse = await fetch(`${API_BASE}/api/levels?date=${sundayDate}&game=cj`, {
              cache: 'no-store'
            })
            if (cjExpertResponse.ok) {
              const sundayCjLevels = await cjExpertResponse.json()
              if (sundayCjLevels.expert) {
                cjMap.expert = sundayCjLevels.expert
              }
            }
          }
        }
        setCjLevels(cjMap)
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
      frogs = currentLevel.frogs.map((f, i) => ({
        position: [...f.position],
        // Give each frog a distinct color in multi-frog levels (index 0 is
        // green, so single-frog levels are unchanged). An explicit non-green
        // color in the level data still wins.
        color: (f.color && f.color !== 'green') ? f.color : FROG_PALETTE[i % FROG_PALETTE.length],
        direction: 'up'
      }))
    } else if (currentLevel.frog) {
      frogs = [{ position: [...currentLevel.frog.position], color: 'green', direction: 'up' }]
    } else {
      frogs = [{ position: [0, 0], color: 'green', direction: 'up' }]
    }
    // Accept either [col,row] or {col,row} for mechanic-piece positions.
    const toArr = (p) => (Array.isArray(p) ? [p[0], p[1]] : [p.col, p.row])
    return {
      frogs,
      snakes: currentLevel.snakes.map(s => ({
        positions: s.positions.map(p => [...p]),
        orientation: s.orientation,
        saddle: s.saddle
      })),
      logs: currentLevel.logs.map(l => ({
        positions: l.positions.map(p => [...p])
      })),
      lilyPads: currentLevel.lilyPads.map(lp => ({
        position: [...lp.position]
      })),
      // Wizard portals + Treasure Hunter stones/switches (optional).
      portals: (currentLevel.portals || []).map(p => ({
        color: p.color,
        positions: p.positions.map(toArr),
      })),
      stones: (currentLevel.stones || []).map(s => ({
        position: toArr(s.position),
        color: s.color,
        startsRaised: s.startsRaised === true,
      })),
      pressurePlates: (currentLevel.pressurePlates || []).map(p => ({
        position: toArr(p.position),
        color: p.color,
      })),
      // Runtime latch: which switch colors are currently flicked on.
      toggledSwitchColors: [],
    }
  }

  const [gameState, setGameState] = useState(getInitialState)

  // Cookie key for current game state
  const gameStateKey = `game_${currentDate}_${difficulty}`

  // Competitive-mode stopwatch. Active only when the level is in progress in
  // competitive mode and the page is visible. addPenalty is called when the
  // player taps Hint (+10s).
  const isWonLocal = gameState.frogs.length > 0 && checkWinCondition(gameState.frogs, gameState.lilyPads)
  const timerActive = activeMode === 'competitive' && currentGame === 'jumping-frogs' && !isWonLocal
  const timer = useGameTimer({ active: timerActive })
  const [penaltyFlash, setPenaltyFlash] = useState(false)

  // Reset game state when level changes (or restore from cookie if available)
  useEffect(() => {
    // Temporarily disable rendering of any selection to prevent stale highlights
    setInitialized(false)

    // Clear all selection state
    setSelectedFrogIndex(null)
    setDraggingFrogIndex(null)
    setFrogDragPos({ x: 0, y: 0 })
    justFinishedDragRef.current = false

    setGameHistory([])

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
        // `saddle` is a static property of the level, not gameplay state, so
        // re-apply it from the fresh level — otherwise a saved game captured
        // before the level gained a saddle would restore saddle-less snakes.
        setGameState({
          ...saved.gameState,
          snakes: saved.gameState.snakes.map((s, i) => ({ ...s, saddle: initial.snakes[i]?.saddle })),
          // Portals/stones/plates are static level data — always take the fresh
          // copy; only the latch (toggledSwitchColors) is restored gameplay state.
          portals: initial.portals,
          stones: initial.stones,
          pressurePlates: initial.pressurePlates,
          toggledSwitchColors: saved.gameState.toggledSwitchColors || [],
        })
        setMoves(saved.moves || 0)
        setHintsUsed(saved.hints || 0)
        // The mode that the saved game is being played in. May differ from the
        // user's current playMode preference if they changed it mid-puzzle —
        // the in-progress level keeps its original mode until reset.
        const savedMode = saved.activeMode === 'competitive' || saved.activeMode === 'casual'
          ? saved.activeMode
          : (playMode || 'casual')
        setActiveMode(savedMode)
        if (savedMode === 'competitive' && saved.timer) {
          timer.restore(saved.timer)
        } else {
          timer.reset()
        }
      } else {
        setGameState(initial)
        setMoves(0)
        setHintsUsed(0)
        setActiveMode(playMode || null)
        timer.reset()
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
  const portals = gameState.portals || []
  const stones = gameState.stones || []
  const pressurePlates = gameState.pressurePlates || []
  const toggledSwitchColors = gameState.toggledSwitchColors || []

  // Convenience wrapper for shared game rules
  const gameStateForRules = { frogs, snakes, logs, lilyPads, portals, stones, pressurePlates, toggledSwitchColors }

  // Check win condition using shared rules
  const isGameWon = frogs.length > 0 && checkWinCondition(frogs, lilyPads)

  // Game stats
  const [moves, setMoves] = useState(0)

  // Win-state mood for the on-board frogs:
  //   par exact -> happy hop, 10x par or worse -> sad slump, otherwise neutral.
  const winMood = (() => {
    if (!isGameWon || !currentLevel?.par) return null
    if (moves === currentLevel.par) return 'happy'
    if (moves >= currentLevel.par * 10) return 'sad'
    return null
  })()
  const FrogPiece = winMood === 'happy' ? HappyFrogSVG : winMood === 'sad' ? SadFrogSVG : FrogSVG

  // Track completed levels with their stats for the current date
  const [completedLevels, setCompletedLevels] = useState(() => {
    return getCookie(`progress_${currentDate}`) || {}
  })

  // Best-moves for the current (date, difficulty) level. Source of truth is the
  // completions table on the server; we fetch on level change and optimistically
  // update on a new-best win so the "Best: N" chip can persist across resets.
  const [levelBest, setLevelBest] = useState(null)
  // Brief flash of "New best!" styling immediately after beating a prior best.
  const [newBestFlash, setNewBestFlash] = useState(false)

  // Save completedLevels to cookie whenever it changes
  useEffect(() => {
    if (Object.keys(completedLevels).length > 0) {
      setCookie(`progress_${currentDate}`, completedLevels)
    }
  }, [completedLevels, currentDate])

  // Fetch the server-stored best for this level + mode whenever the level
  // identity (or mode) changes. Casual tracks moves; competitive tracks time.
  useEffect(() => {
    const statsUserId = (isAuthenticated && user?.sub) ? user.sub : visitorId
    const bestMode = activeMode || playMode || 'casual'
    if (!statsUserId || !currentDate || !difficulty) return
    setLevelBest(null)
    setNewBestFlash(false)
    let cancelled = false
    fetch(`${API_BASE}/api/user-stats?userId=${encodeURIComponent(statsUserId)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled || !data?.completions) return
        const match = data.completions.find(c => {
          const d = new Date(c.puzzle_date).toISOString().slice(0, 10)
          const cMode = c.mode || 'casual'
          return d === currentDate && c.difficulty === difficulty && cMode === bestMode
        })
        if (match) {
          setLevelBest(
            bestMode === 'competitive'
              ? { mode: 'competitive', timeMs: match.time_ms != null ? Number(match.time_ms) : null, moves: match.moves }
              : { mode: 'casual', moves: match.moves }
          )
        }
      })
      .catch(err => console.error('Failed to fetch level best:', err))
    return () => { cancelled = true }
  }, [currentDate, difficulty, isAuthenticated, user?.sub, visitorId, activeMode, playMode])

  // Save stats when a level is won
  useEffect(() => {
    if (isGameWon) {
      // Keep the best (fewest moves) across attempts on this level in the cookie
      const existing = completedLevels[difficulty]
      if (!existing || moves < existing.moves) {
        setCompletedLevels(prev => ({
          ...prev,
          [difficulty]: { moves, hints: hintsUsed }
        }))
      }

      // Update levelBest optimistically; the server is authoritative but the
      // next fetch may be a page load away. Flash "New best!" if we improved.
      const finishedMode = activeMode || 'casual'
      const finishTimeMs = finishedMode === 'competitive' ? timer.snapshot().accumulatedMs : null
      setLevelBest(prev => {
        if (finishedMode === 'competitive') {
          if (prev?.timeMs == null) return { mode: 'competitive', timeMs: finishTimeMs, moves }
          if (finishTimeMs < prev.timeMs) {
            setNewBestFlash(true)
            setTimeout(() => setNewBestFlash(false), 2500)
            return { mode: 'competitive', timeMs: finishTimeMs, moves }
          }
          return prev
        }
        // casual
        if (prev?.moves == null) return { mode: 'casual', moves }
        if (moves < prev.moves) {
          setNewBestFlash(true)
          setTimeout(() => setNewBestFlash(false), 2500)
          return { mode: 'casual', moves }
        }
        return prev
      })

      // Update streak in cookies (for all users, enables offline tracking)
      updateStreakCookie(difficulty, currentDate)

      // Always save to database (DB handles duplicates with ON CONFLICT)
      // Use userId if logged in, otherwise use visitorId for anonymous tracking
      const userId = isAuthenticated && user?.sub ? user.sub : null
      const anonVisitorId = !userId ? getOrCreateVisitorId() : null

      const payload = {
        userId,
        visitorId: anonVisitorId,
        puzzleDate: currentDate,
        difficulty,
        moves,
        hintsUsed,
        mode: activeMode || 'casual',
      }
      if ((activeMode || 'casual') === 'competitive') {
        // Snapshot folds the live tick, so this is the final wall-clock time
        // including any +10s hint penalties.
        payload.timeMs = timer.snapshot().accumulatedMs
      }

      fetch(`${API_BASE}/api/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(err => console.error('Failed to save stats:', err))
    }
  }, [isGameWon])

  // Hint state
  const [hintMove, setHintMove] = useState(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [gameHistory, setGameHistory] = useState([])
  const hintTimerRef = useRef(null)

  // Transient "frog just jumped" state so we can briefly open the frog's mouth
  // on a click/tap move. Drag moves already use the .dragging class.
  const [jumpingFrogIndex, setJumpingFrogIndex] = useState(null)
  const jumpTimerRef = useRef(null)
  const triggerFrogJump = (frogIdx) => {
    if (jumpTimerRef.current) clearTimeout(jumpTimerRef.current)
    setJumpingFrogIndex(frogIdx)
    jumpTimerRef.current = setTimeout(() => setJumpingFrogIndex(null), 350)
  }

  // Transient "snake is sliding" state so we can animate the tongue flicking
  // in and out on a click/tap move. Drag moves already use the .dragging class.
  const [movingSnakeIdx, setMovingSnakeIdx] = useState(null)
  const snakeSlideTimerRef = useRef(null)
  const triggerSnakeSlide = (snakeIdx) => {
    if (snakeSlideTimerRef.current) clearTimeout(snakeSlideTimerRef.current)
    setMovingSnakeIdx(snakeIdx)
    snakeSlideTimerRef.current = setTimeout(() => setMovingSnakeIdx(null), 500)
  }

  // Big celebration fires only as the result of a real frog move that wins the
  // level. Loading/switching levels never triggers it.
  const [showBigCelebration, setShowBigCelebration] = useState(false)

  useEffect(() => {
    setShowBigCelebration(false)
  }, [currentDate, difficulty])

  const celebrateIfWon = (nextFrogs, nextLilyPads) => {
    if (!checkWinCondition(nextFrogs, nextLilyPads)) return
    setShowBigCelebration(true)
    setTimeout(() => setShowBigCelebration(false), 2800)
  }

  // Stable refs from the timer hook (the surrounding object is fresh every
  // render, but each method is wrapped in useCallback). Using these in deps
  // prevents the cookie-save effects from firing on every render.
  const timerSnapshot = timer.snapshot
  const timerStart = timer.start

  // Save game state to cookie whenever it changes (including won state).
  // Also persist the active mode and timer snapshot in competitive mode so
  // a reload picks up where the player left off.
  useEffect(() => {
    if (currentLevel) {
      const payload = { gameState, moves, hints: hintsUsed, activeMode }
      if (activeMode === 'competitive') {
        payload.timer = timerSnapshot()
      }
      setCookie(gameStateKey, payload)
    }
  }, [gameState, moves, hintsUsed, activeMode, gameStateKey, currentLevel, timerSnapshot])

  // Start the timer on the player's first move (only matters in competitive).
  useEffect(() => {
    if (moves > 0 && activeMode === 'competitive' && !timer.hasStarted) {
      timerStart()
    }
    // timer.hasStarted is read each render; we re-fire only on moves/mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moves, activeMode, timerStart])

  // Persist a fresh timer snapshot when the page is hidden / closed so a
  // reload during paused state doesn't undercount.
  useEffect(() => {
    if (!currentLevel) return
    const persist = () => {
      const payload = { gameState, moves, hints: hintsUsed, activeMode }
      if (activeMode === 'competitive') payload.timer = timerSnapshot()
      setCookie(gameStateKey, payload)
    }
    window.addEventListener('pagehide', persist)
    return () => window.removeEventListener('pagehide', persist)
  }, [currentLevel, gameStateKey, gameState, moves, hintsUsed, activeMode, timerSnapshot])

  // Keep activeMode in sync with the user's preference whenever the level is
  // fresh (no moves yet). In-progress levels keep their original mode.
  useEffect(() => {
    if (playMode && moves === 0 && activeMode !== playMode && !showPlayModeDialog) {
      setActiveMode(playMode)
    }
  }, [playMode, moves, activeMode, showPlayModeDialog])

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
    setGameHistory([])
    setSelectedFrogIndex(null)
    setDraggingFrogIndex(null)
    clearHint()
    // Reset puts the level into whatever mode the player currently prefers.
    const newMode = playMode || null
    setActiveMode(newMode)
    // In competitive mode, reset is a strategic choice that still costs time —
    // the stopwatch keeps running, accumulated +10s penalties stay, and the
    // hint counter persists since those hints were already paid for.
    // Outside competitive (or when switching away from it), clear them.
    if (newMode === 'competitive') {
      // keep timer + hintsUsed
    } else {
      setHintsUsed(0)
      timer.reset()
    }
  }

  const handleUndo = () => {
    if (gameHistory.length === 0 || isGameWon) return
    const prev = gameHistory[gameHistory.length - 1]
    setGameHistory(h => h.slice(0, -1))
    setGameState(prev.gameState)
    setMoves(prev.moves)
    setHintsUsed(prev.hintsUsed)
    setSelectedFrogIndex(null)
    setSelectedSnakeIndex(null)
    clearHint()
  }

  const handleHint = () => {
    if (isGameWon || !currentLevel || hintLoading) return
    clearHint()
    setHintLoading(true)

    // Apply the +10s penalty optimistically as soon as the player taps Hint.
    // We do this before solving so the punishment lands the moment they press
    // the button, not when the hint finishes computing.
    if (activeMode === 'competitive') {
      timer.addPenalty(10000)
      setPenaltyFlash(true)
      setTimeout(() => setPenaltyFlash(false), 600)
    }

    setTimeout(() => {
      const solverFrogs = frogs.map(f => ({ position: [...f.position], color: f.color }))
      const result = solveLevel(gridSize, solverFrogs, snakes, logs, lilyPads, { portals, stones, pressurePlates })

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
  const handleSnakeClick = (snakeIndex, e) => {
    if (isGameWon) return
    if (justFinishedSnakeDragRef.current) {
      justFinishedSnakeDragRef.current = false
      return
    }
    // With a frog selected, tapping this snake's free saddle boards the frog
    // (jumps it onto the saddle) instead of selecting the snake.
    if (selectedFrogIndex !== null && e) {
      const saddle = saddleCellOf(snakes[snakeIndex])
      const rect = gridRef.current?.getBoundingClientRect()
      if (saddle && rect && isValidFrogDestination(saddle[0], saddle[1])) {
        const col = Math.floor((e.clientX - rect.left) / (rect.width / gridSize))
        const row = Math.floor((e.clientY - rect.top) / (rect.height / gridSize))
        if (col === saddle[0] && row === saddle[1]) {
          handleCellClick(saddle[0], saddle[1])
          return
        }
      }
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

  // Slide a snake by `delta` along its axis, carrying any frog riding its
  // saddle (middle segment) to the snake's new middle.
  const slideSnakeCarryingRider = (prev, snakeIdx, delta, isVertical) => {
    const snake = prev.snakes[snakeIdx]
    const moved = {
      ...snake,
      positions: snake.positions.map(([c, r]) =>
        isVertical ? [c, r + delta] : [c + delta, r]
      )
    }
    const oldSaddle = saddleCellOf(snake)
    let frogs = prev.frogs
    if (oldSaddle) {
      const newSaddle = saddleCellOf(moved)
      frogs = prev.frogs.map(f =>
        f.position[0] === oldSaddle[0] && f.position[1] === oldSaddle[1]
          ? { ...f, position: [newSaddle[0], newSaddle[1]] }
          : f
      )
    }
    return {
      ...prev,
      frogs,
      snakes: prev.snakes.map((s, i) => (i === snakeIdx ? moved : s)),
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
        setGameHistory(prev => [...prev, { gameState, moves, hintsUsed }])
        setGameState(prev => slideSnakeCarryingRider(prev, snakeIndex, posDelta, isVertical))
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
      setGameHistory(prev => [...prev, { gameState, moves, hintsUsed }])
      const oldPos = gameState.frogs[frogIdx].position
      const dx = col - oldPos[0]
      const dy = row - oldPos[1]
      // Facing is toward the tapped cell (the portal mouth, for a portal move).
      const direction = Math.abs(dx) > Math.abs(dy)
        ? (dx > 0 ? 'right' : 'left')
        : (dy > 0 ? 'down' : 'up')
      // A portal move targets a mouth; the frog ends up at the linked exit.
      const finalPos = resolveFrogDestination([col, row], portals)
      const nextFrogs = gameState.frogs.map((f, idx) =>
        idx === frogIdx ? { ...f, position: finalPos, direction } : f
      )
      // Landing on a pressure plate flicks its switch (latch).
      const nextToggled = applySwitchLanding(finalPos, toggledSwitchColors, pressurePlates, nextFrogs, snakes, stones)
      setGameState(prev => ({ ...prev, frogs: nextFrogs, toggledSwitchColors: nextToggled }))
      setMoves(m => m + 1)
      setSelectedFrogIndex(null)
      triggerFrogJump(frogIdx)
      clearHint()
      celebrateIfWon(nextFrogs, gameState.lilyPads)
      return
    }

    // If a snake is selected and clicking a valid destination, move the snake
    if (selectedSnakeIndex !== null && isValidSnakeDestination(col, row)) {
      const snakeIdx = selectedSnakeIndex
      const delta = getSnakeDeltaForDestination(col, row)
      const snake = snakes[snakeIdx]
      const isVertical = snake.orientation === 'vertical'

      setGameHistory(prev => [...prev, { gameState, moves, hintsUsed }])
      setGameState(prev => slideSnakeCarryingRider(prev, snakeIdx, delta, isVertical))
      setMoves(m => m + 1)
      setSelectedSnakeIndex(null)
      triggerSnakeSlide(snakeIdx)
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
            setGameHistory(prev => [...prev, { gameState, moves, hintsUsed }])
            const oldPos = gameState.frogs[frogIndex].position
            const ddx = dropCol - oldPos[0]
            const ddy = dropRow - oldPos[1]
            const direction = Math.abs(ddx) > Math.abs(ddy)
              ? (ddx > 0 ? 'right' : 'left')
              : (ddy > 0 ? 'down' : 'up')
            const finalPos = resolveFrogDestination([dropCol, dropRow], portals)
            const nextFrogs = gameState.frogs.map((f, idx) =>
              idx === frogIndex ? { ...f, position: finalPos, direction } : f
            )
            const nextToggled = applySwitchLanding(finalPos, toggledSwitchColors, pressurePlates, nextFrogs, snakes, stones)
            setGameState(prev => ({ ...prev, frogs: nextFrogs, toggledSwitchColors: nextToggled }))
            celebrateIfWon(nextFrogs, gameState.lilyPads)
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
          <div className="header-right">
            {isAdmin && levelCoverage !== null && (
              <a href="/level-editor" className="level-coverage-badge" style={{ color: levelCoverage < 3 ? '#ef4444' : levelCoverage < 7 ? '#eab308' : '#4ade80' }} title={`${levelCoverage} day${levelCoverage !== 1 ? 's' : ''} of levels ahead`}>
                {levelCoverage}d
              </a>
            )}
            <button className="trophy-btn" onClick={() => setShowLeaderboard(true)} aria-label="Leaderboard">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
            </button>
            <button className="calendar-btn" onClick={() => setShowCalendar(true)} aria-label="Select date">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </button>
            <AccountMenu onShowStats={() => setShowStats(true)} onChangePlayMode={() => setShowPlayModeDialog(true)} playMode={playMode} isAdmin={isAdmin} currentGame={currentGame} />
          </div>
        </header>
        <div className="loading-message">Loading puzzles...</div>
        {showStats && <StatsModal onClose={() => setShowStats(false)} currentDate={currentDate} />}
        {showStreakModal && <DailyStreakModal onClose={() => setShowStreakModal(false)} visitorId={visitorId} />}
        {showWelcome && <WelcomeModal onClose={() => { setShowWelcome(false); setCookie('has_seen_welcome', true, 365); setCookie('last_visit_date', getTodayDate(), 7) }} />}
        {showCalendar && <CalendarModal currentDate={currentDate} onSelectDate={(d) => { setCurrentDate(d); setShowCalendar(false) }} onClose={() => setShowCalendar(false)} isAdmin={isAdmin} />}
        {showLeaderboard && <LeaderboardModal currentDate={currentDate} completedLevels={completedLevels} onClose={() => setShowLeaderboard(false)} mode={playMode || 'casual'} />}
        {playModeResolved && showPlayModeDialog && (
          <PlayModeDialog
            currentMode={playMode}
            allowDismiss={!!playMode}
            onChoose={handleChoosePlayMode}
            onClose={playMode ? () => setShowPlayModeDialog(false) : undefined}
          />
        )}
      </div>
    )
  }

  // Format current date for display
  const formattedDate = new Date(currentDate + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })

  const gameTitle = currentGame === 'color-jump' ? 'Color Jump' : 'Jumping Frogs'

  return (
    <>
    <div className="rotate-message">
      <div className="rotate-icon">📱</div>
      <div className="rotate-text">Please rotate your device to portrait mode</div>
    </div>
    <div className="app">
      <header className="app-header">
        <h1 className="title">Frogs And Snakes</h1>
        <div className="header-right">
          {isAdmin && levelCoverage !== null && (
            <a href="/level-editor" className="level-coverage-badge" style={{ color: levelCoverage < 3 ? '#ef4444' : levelCoverage < 7 ? '#eab308' : '#4ade80' }} title={`${levelCoverage} day${levelCoverage !== 1 ? 's' : ''} of levels ahead`}>
              {levelCoverage}d
            </a>
          )}
          <button className="trophy-btn" onClick={() => setShowLeaderboard(true)} aria-label="Leaderboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
          </button>
          <button className="calendar-btn" onClick={() => setShowCalendar(true)} aria-label="Select date">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          </button>
          <AccountMenu onShowStats={() => setShowStats(true)} onChangePlayMode={() => setShowPlayModeDialog(true)} playMode={playMode} isAdmin={isAdmin} currentGame={currentGame} />
        </div>
      </header>

      {showStats && <StatsModal onClose={() => setShowStats(false)} currentDate={currentDate} />}
      {showStreakModal && <DailyStreakModal onClose={() => setShowStreakModal(false)} visitorId={visitorId} />}
      {showWelcome && <WelcomeModal onClose={() => { setShowWelcome(false); setCookie('has_seen_welcome', true, 365); setCookie('last_visit_date', getTodayDate(), 7) }} />}
      {showCalendar && <CalendarModal currentDate={currentDate} onSelectDate={(d) => { setCurrentDate(d); setShowCalendar(false) }} onClose={() => setShowCalendar(false)} isAdmin={isAdmin} />}
      {showLeaderboard && <LeaderboardModal currentDate={currentDate} completedLevels={completedLevels} onClose={() => setShowLeaderboard(false)} mode={playMode || 'casual'} />}
      {playModeResolved && showPlayModeDialog && (
        <PlayModeDialog
          currentMode={playMode}
          allowDismiss={!!playMode}
          onChoose={handleChoosePlayMode}
          onClose={playMode ? () => setShowPlayModeDialog(false) : undefined}
        />
      )}

      {/* Difficulty selector with help button and date */}
      <div className="difficulty-row">
        <div className="difficulty-selector">
          {(() => {
            const activeLevels = currentGame === 'color-jump' ? cjLevels : levels
            return (
              <>
                <button
                  className={`difficulty-btn ${difficulty === 'easy' ? 'active' : ''} ${!activeLevels.easy ? 'disabled' : ''}`}
                  onClick={() => activeLevels.easy && setDifficulty('easy')}
                  disabled={!activeLevels.easy}
                >
                  Easy
                </button>
                <button
                  className={`difficulty-btn ${difficulty === 'medium' ? 'active' : ''} ${!activeLevels.medium ? 'disabled' : ''}`}
                  onClick={() => activeLevels.medium && setDifficulty('medium')}
                  disabled={!activeLevels.medium}
                >
                  Medium
                </button>
                <button
                  className={`difficulty-btn ${difficulty === 'hard' ? 'active' : ''} ${!activeLevels.hard ? 'disabled' : ''}`}
                  onClick={() => activeLevels.hard && setDifficulty('hard')}
                  disabled={!activeLevels.hard}
                >
                  Hard
                </button>
                {isAuthenticated && activeLevels.expert && (
                  <button
                    className={`difficulty-btn expert ${difficulty === 'expert' ? 'active' : ''}`}
                    onClick={() => setDifficulty('expert')}
                  >
                    Expert
                  </button>
                )}
              </>
            )
          })()}
        </div>
      </div>
      <div className="date-row">
        <div className="date-row-left">
          {/* Expert shows a long date range; drop the game name to save room. */}
          {difficulty !== 'expert' && (
            <>
              <span className="game-title">{gameTitle}</span>
              <span className="date-separator">&middot;</span>
            </>
          )}
          <span className="date-display">
            {difficulty === 'expert'
              ? formatDateRange(getMostRecentSunday(new Date(currentDate + 'T12:00:00')))
              : formattedDate
            }
          </span>
        </div>
        <div className="date-row-buttons">
          <button className="learn-btn" onClick={() => setShowWelcome(true)}>Learn</button>
        </div>
      </div>

      {currentGame === 'color-jump' ? (
        <ColorJump difficulty={difficulty} currentDate={currentDate} onChangeDifficulty={setDifficulty} />
      ) : !currentLevel ? (
        <div className="no-level-message">
          No {difficulty} puzzle available for today.
          <br />
          Check back later!
        </div>
      ) : (
      <>
      <div className={`grid-container ${showBigCelebration ? 'celebrating-big' : ''}`}>
        {showBigCelebration && (
          <div className="celebration-confetti" aria-hidden="true">
            {Array.from({ length: 28 }).map((_, i) => (
              <span
                key={i}
                className="confetti-piece"
                style={{
                  left: `${(i * 97) % 100}%`,
                  animationDelay: `${(i % 7) * 0.09}s`,
                  animationDuration: `${1.8 + ((i * 13) % 10) * 0.1}s`,
                  background: ['#fde047', '#22c55e', '#ef4444', '#3b82f6', '#f97316', '#ec4899'][i % 6],
                  transform: `rotate(${(i * 37) % 360}deg)`,
                }}
              />
            ))}
          </div>
        )}
        <div key={`${currentDate}-${difficulty}`} className="grid" ref={gridRef} style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)` }}>
          {Array(gridSize).fill(null).map((_, rowIndex) => (
            Array(gridSize).fill(null).map((_, colIndex) => {
              const content = getCellContent(colIndex, rowIndex)
              const snakeCell = isSnakeCell(colIndex, rowIndex)
              // Mechanic pieces on this cell (rendered behind any frog).
              const frogAtCellFn = (c, r) => frogs.some(f => f.position[0] === c && f.position[1] === r)
              const portalHere = portals.find(p => p.positions.some(m => m[0] === colIndex && m[1] === rowIndex))
              const portalBlocked = portalHere && portalHere.positions.some(m => frogAtCellFn(m[0], m[1]))
              const portalDeactivated = portalBlocked && !frogAtCellFn(colIndex, rowIndex)
              const stoneHere = stones.find(s => s.position[0] === colIndex && s.position[1] === rowIndex)
              const stoneRaised = stoneHere && isStoneRaised(stoneHere, toggledSwitchColors)
              const plateHere = pressurePlates.find(p => p.position[0] === colIndex && p.position[1] === rowIndex)
              const isFrogCell = content?.type === 'frog'
              const isThisFrogSelected = isFrogCell && validSelectedFrogIndex === content.frogIndex
              const isThisFrogDragging = isFrogCell && validDraggingFrogIndex === content.frogIndex
              // A frog riding the saddle of the snake being dragged follows it live.
              const isRidingDraggedSnake = isFrogCell && draggingSnakeIndex !== null &&
                riddenSnakeIndexAt(content.frog.position, snakes) === draggingSnakeIndex
              const ridingDragVertical = isRidingDraggedSnake && snakes[draggingSnakeIndex]?.orientation === 'vertical'
              const riderFollowTransform = isRidingDraggedSnake
                ? `translate(${ridingDragVertical ? 0 : snakeDragOffset}px, ${ridingDragVertical ? snakeDragOffset : 0}px)`
                : undefined
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
                  {/* Mechanic pieces render behind the frog/log/lilypad content. */}
                  {portalHere && (
                    <span className={`piece-icon portal-piece ${portalDeactivated ? 'portal-deactivated' : ''}`}>
                      <PortalSVG color={portalHere.color} deactivated={portalDeactivated} />
                    </span>
                  )}
                  {plateHere && (
                    <span className="piece-icon switch-piece">
                      <SwitchSVG
                        color={plateHere.color}
                        on={toggledSwitchColors.includes(plateHere.color)}
                        disabled={isSwitchDisabled(plateHere.color, frogs, snakes, stones)}
                      />
                    </span>
                  )}
                  {stoneHere && (
                    <span className={`piece-icon stone-piece ${stoneRaised ? 'stone-raised' : 'stone-flat'}`}>
                      <StoneSVG color={stoneHere.color} raised={stoneRaised} />
                    </span>
                  )}
                  {content && content.type === 'frog' && content.hasLilyPad ? (
                    /* Frog on lily pad - show lily pad stationary, frog moves */
                    <>
                      <span className="piece-icon lilypad-under-frog">
                        <LilyPadSVG />
                      </span>
                      <span
                        className={`piece-icon frog-piece frog-on-pad ${isThisFrogSelected ? 'selected' : ''} ${isThisFrogDragging ? 'dragging' : ''} ${jumpingFrogIndex === content.frogIndex ? 'jumping' : ''} ${winMood ? `frog-mood-${winMood}` : ''}`}
                        onPointerDown={!isGameWon ? (e) => handleFrogPointerDown(e, content.frogIndex) : undefined}
                        onClick={!isGameWon ? (e) => { e.stopPropagation(); handleFrogClick(content.frogIndex); } : undefined}
                        style={{
                          transform: isThisFrogDragging
                            ? `translate(${frogDragPos.x}px, ${frogDragPos.y}px)`
                            : riderFollowTransform,
                          zIndex: isThisFrogDragging ? 100 : isRidingDraggedSnake ? 50 : undefined,
                          transition: isRidingDraggedSnake ? 'none' : undefined,
                        }}
                      >
                        <FrogPiece color={content.frog.color} />
                      </span>
                    </>
                  ) : content && content.type === 'frog' ? (
                    /* Frog not on lily pad */
                    <span
                      className={`piece-icon frog-piece ${isThisFrogSelected ? 'selected' : ''} ${isThisFrogDragging ? 'dragging' : ''} ${jumpingFrogIndex === content.frogIndex ? 'jumping' : ''} ${winMood ? `frog-mood-${winMood}` : ''}`}
                      onPointerDown={!isGameWon ? (e) => handleFrogPointerDown(e, content.frogIndex) : undefined}
                      onClick={!isGameWon ? (e) => { e.stopPropagation(); handleFrogClick(content.frogIndex); } : undefined}
                      style={{
                        transform: isThisFrogDragging
                          ? `translate(${frogDragPos.x}px, ${frogDragPos.y}px)`
                          : riderFollowTransform,
                        zIndex: isThisFrogDragging ? 100 : isRidingDraggedSnake ? 50 : undefined,
                        transition: isRidingDraggedSnake ? 'none' : undefined,
                      }}
                    >
                      <FrogPiece color={content.frog.color} />
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
              className={`snake-overlay ${draggingSnakeIndex === index ? 'dragging' : ''} ${movingSnakeIdx === index ? 'moving' : ''} ${validSelectedSnakeIndex === index ? 'snake-selected' : ''} ${hintMove?.type === 'snake' && hintMove.snakeIdx === index ? 'snake-hint' : ''}`}
              style={getSnakeStyle(snake, index)}
              onPointerDown={(e) => handleSnakePointerDown(e, index)}
              onClick={(e) => { e.stopPropagation(); handleSnakeClick(index, e); }}
            >
              {snake.orientation === 'vertical' ? <VerticalSnakeSVG length={snake.positions.length} blinkDelay={index * 1.1} saddle={snake.saddle} /> : <HorizontalSnakeSVG length={snake.positions.length} blinkDelay={index * 1.1} saddle={snake.saddle} />}
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar: stats on top, action buttons on their own line below */}
      <div className="stats-bar">
        <div className="stats">
          <span className="stat">
            <span className="stat-label">Moves:</span> {moves}
          </span>
          {currentLevel?.par && (
            <span className="stat stat-min">
              <span className="stat-label">Min:</span> {currentLevel.par}
            </span>
          )}
          {levelBest && (
            <span className={`stat stat-best ${newBestFlash ? 'stat-best-new' : ''}`}>
              <span className="stat-label">
                {newBestFlash ? 'New best!' : 'Best:'}
              </span>{' '}
              {levelBest.mode === 'competitive' && levelBest.timeMs != null
                ? formatTime(levelBest.timeMs)
                : levelBest.moves}
            </span>
          )}
          {activeMode === 'competitive' && currentGame === 'jumping-frogs' && (
            <span
              className={`stat game-timer ${!timer.hasStarted ? 'game-timer-paused' : ''} ${penaltyFlash ? 'game-timer-penalty-flash' : ''}`}
              aria-label="Elapsed time"
            >
              ⏱ {formatTime(timer.elapsedMs)}
            </span>
          )}
        </div>
        <div className="stats-bar-actions">
          <Button variant="secondary" size="sm" onClick={handleReset}>
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={gameHistory.length === 0 || isGameWon}
          >
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleHint}
            disabled={isGameWon || !currentLevel || hintLoading}
            title={activeMode === 'competitive' ? 'Each hint adds 10 seconds to your time' : undefined}
          >
            {hintLoading ? 'Thinking...' : (
              <>
                <span>{hintsUsed > 0 ? `Hint (${hintsUsed})` : 'Hint'}</span>
                {activeMode === 'competitive' && (
                  <span className="hint-penalty-note">+10s</span>
                )}
              </>
            )}
          </Button>
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
            const hintsText = hintsUsed === 0 ? '' : (hintsUsed === 1 ? ', 1 hint' : `, ${hintsUsed} hints`)
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
            const difficultyLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
            const isCompetitive = activeMode === 'competitive'
            const headlineLine = isCompetitive
              ? `${difficultyLabel} ⏱ ${formatTime(timer.snapshot().accumulatedMs)} (${moves} moves${hintsText})`
              : `${difficultyLabel}: ${moves} moves${hintsText}`
            const shareText = `🐸 Frogs & Snakes\n${headlineLine}\n\n${gridText}\n\n${window.location.origin}`
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


    </div>
    </>
  )
}

export default App
