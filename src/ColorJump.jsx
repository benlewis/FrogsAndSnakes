import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { FrogSVG } from './GamePieces.jsx'
import { getConnectedCells, NUM_COLORS } from './colorJumpSolver.js'
import './ColorJump.css'

// API base URL - use relative path for production, localhost for dev
const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

const COLORS = [
  { name: 'red', fill: '#ef4444', light: '#fca5a5', dark: '#991b1b', vein: '#b91c1c', center: '#fbbf24', centerDark: '#b45309' },
  { name: 'blue', fill: '#3b82f6', light: '#93c5fd', dark: '#1e3a8a', vein: '#1d4ed8', center: '#fbbf24', centerDark: '#b45309' },
  { name: 'yellow', fill: '#eab308', light: '#fde68a', dark: '#713f12', vein: '#a16207', center: '#f97316', centerDark: '#9a3412' },
  { name: 'green', fill: '#22c55e', light: '#86efac', dark: '#14532d', vein: '#166534', center: '#fde047', centerDark: '#ca8a04' },
  { name: 'purple', fill: '#a855f7', light: '#d8b4fe', dark: '#581c87', vein: '#7e22ce', center: '#fbbf24', centerDark: '#b45309' },
  { name: 'orange', fill: '#f97316', light: '#fdba74', dark: '#7c2d12', vein: '#c2410c', center: '#fde047', centerDark: '#ca8a04' },
]

const DIFFICULTY_GRID = {
  easy: 5,
  medium: 8,
  hard: 15,
  expert: 20,
}

const ColorLilyPad = ({ color, onClick, btnRef }) => {
  const id = `cj-pad-${color.name}`
  return (
    <button className="cj-color-btn" onClick={onClick} aria-label={color.name} ref={btnRef}>
      <svg viewBox="0 0 100 100" className="cj-pad-svg">
        <defs>
          <radialGradient id={`${id}-main`} cx="40%" cy="35%" r="65%">
            <stop offset="0%" stopColor={color.light} />
            <stop offset="50%" stopColor={color.fill} />
            <stop offset="100%" stopColor={color.dark} />
          </radialGradient>
          <radialGradient id={`${id}-center`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={color.center} />
            <stop offset="100%" stopColor={color.centerDark} />
          </radialGradient>
        </defs>
        <ellipse cx="52" cy="55" rx="44" ry="38" fill="rgba(0,0,0,0.2)" />
        <ellipse cx="50" cy="52" rx="44" ry="38" fill={color.dark} />
        <ellipse cx="50" cy="50" rx="42" ry="36" fill={`url(#${id}-main)`} />
        <path d="M50 50 L50 12 L30 28 Z" fill="#1e3a5f" />
        <path d="M50 50 L50 16 L34 30 Z" fill="#2d4a6f" />
        <path d="M50 50 L20 30" stroke={color.vein} strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M50 50 L80 30" stroke={color.vein} strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M50 50 L10 50" stroke={color.vein} strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M50 50 L90 50" stroke={color.vein} strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M50 50 L25 75" stroke={color.vein} strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M50 50 L75 75" stroke={color.vein} strokeWidth="3" fill="none" opacity="0.5" />
        <path d="M50 50 L50 88" stroke={color.vein} strokeWidth="3" fill="none" opacity="0.5" />
        <circle cx="50" cy="50" r="8" fill={color.dark} />
        <circle cx="50" cy="49" r="6" fill={`url(#${id}-center)`} />
        <circle cx="48" cy="47" r="2" fill="white" opacity="0.6" />
        <ellipse cx="35" cy="38" rx="16" ry="10" fill="white" opacity="0.35" />
        <ellipse cx="32" cy="35" rx="8" ry="5" fill="white" opacity="0.5" />
        <ellipse cx="50" cy="50" rx="40" ry="34" fill="none" stroke={color.light} strokeWidth="2" opacity="0.5" />
      </svg>
    </button>
  )
}

const storageKey = (date, diff) => `cj_${date}_${diff}`

const saveState = (date, diff, state) => {
  try {
    localStorage.setItem(storageKey(date, diff), JSON.stringify(state))
  } catch {}
}

const loadState = (date, diff) => {
  try {
    const raw = localStorage.getItem(storageKey(date, diff))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const ColorJump = ({ difficulty, currentDate, onChangeDifficulty }) => {
  const gridSize = DIFFICULTY_GRID[difficulty] || 5

  // Level from API
  const [levelData, setLevelData] = useState(null)
  const [levelLoading, setLevelLoading] = useState(true)

  // Fetch level from API when date/difficulty changes
  useEffect(() => {
    let cancelled = false
    const fetchLevel = async () => {
      setLevelLoading(true)
      try {
        const response = await fetch(`${API_BASE}/api/levels?date=${currentDate}&game=cj`, {
          cache: 'no-store'
        })
        if (response.ok && !cancelled) {
          const levels = await response.json()
          setLevelData(levels[difficulty] || null)
        }
      } catch (err) {
        console.error('Error fetching CJ level:', err)
      }
      if (!cancelled) setLevelLoading(false)
    }
    fetchLevel()
    return () => { cancelled = true }
  }, [currentDate, difficulty])

  // Use level from API, or generate random fallback for dev
  const initialGrid = useMemo(() => {
    if (levelData?.grid) return levelData.grid
    // Fallback: random grid (for dev/missing levels)
    return Array(gridSize * gridSize).fill(null).map(() =>
      Math.floor(Math.random() * NUM_COLORS)
    )
  }, [levelData, gridSize, currentDate, difficulty])

  const levelPar = levelData?.par || null

  // Restore saved state or use initial
  const saved = useMemo(() => loadState(currentDate, difficulty), [currentDate, difficulty])
  const [grid, setGrid] = useState(() => saved?.grid?.length === gridSize * gridSize ? saved.grid : initialGrid)
  const [moves, setMoves] = useState(() => saved?.moves || 0)
  const [moveHistory, setMoveHistory] = useState(() => saved?.moveHistory || [])
  const [replayFrame, setReplayFrame] = useState(0)
  const [jumping, setJumping] = useState(false)
  const buttonsRef = useRef(null)
  const padRefs = useRef({})
  const [frogPos, setFrogPos] = useState(null)
  const [frogTarget, setFrogTarget] = useState(null)
  const initialGridRef = useRef(saved?.initialGrid?.length === gridSize * gridSize ? saved.initialGrid : initialGrid)

  // Reset when difficulty, date, or level data changes
  const prevKeyRef = useRef(`${currentDate}_${difficulty}`)
  useEffect(() => {
    const key = `${currentDate}_${difficulty}`
    if (key === prevKeyRef.current && initialGridRef.current === initialGrid) return
    prevKeyRef.current = key
    const s = loadState(currentDate, difficulty)
    if (s?.grid?.length === gridSize * gridSize) {
      setGrid(s.grid)
      setMoves(s.moves || 0)
      setMoveHistory(s.moveHistory || [])
      initialGridRef.current = s.initialGrid || s.grid
    } else {
      setGrid(initialGrid)
      setMoves(0)
      setMoveHistory([])
      initialGridRef.current = initialGrid
    }
  }, [currentDate, difficulty, gridSize, initialGrid])

  // Persist state on changes
  useEffect(() => {
    saveState(currentDate, difficulty, { grid, moves, moveHistory, initialGrid: initialGridRef.current })
  }, [grid, moves, moveHistory, currentDate, difficulty])

  const connected = useMemo(() => getConnectedCells(grid, gridSize), [grid, gridSize])

  // Check if the grid is all one color (won)
  const isWon = useMemo(() => {
    const c = grid[0]
    for (let i = 1; i < grid.length; i++) {
      if (grid[i] !== c) return false
    }
    return true
  }, [grid])

  // Replay animation: cycle through initial grid + each move when won
  const replayFrames = useMemo(() => {
    if (!isWon || moveHistory.length === 0) return []
    return [initialGridRef.current, ...moveHistory]
  }, [isWon, moveHistory])

  useEffect(() => {
    if (!isWon || replayFrames.length === 0) return
    setReplayFrame(0)
    const interval = setInterval(() => {
      setReplayFrame(f => (f + 1) % replayFrames.length)
    }, 800)
    return () => clearInterval(interval)
  }, [isWon, replayFrames.length])

  const displayGrid = isWon && replayFrames.length > 0 ? replayFrames[replayFrame] || grid : grid

  // Update frog position when grid changes (frog lands on current color's pad)
  useEffect(() => {
    if (jumping) return
    const currentPad = padRefs.current[grid[0]]
    const container = buttonsRef.current
    if (currentPad && container) {
      const padRect = currentPad.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      setFrogPos({
        left: padRect.left - containerRect.left,
        top: padRect.top - containerRect.top,
        width: padRect.width,
        height: padRect.height,
      })
    }
  }, [grid, jumping, gridSize])

  const handleColorPick = useCallback((colorIdx) => {
    if (colorIdx === grid[0] || jumping) return

    const destPad = padRefs.current[colorIdx]
    const container = buttonsRef.current
    if (!destPad || !container) return

    const padRect = destPad.getBoundingClientRect()
    const containerRect = container.getBoundingClientRect()
    const target = {
      left: padRect.left - containerRect.left,
      top: padRect.top - containerRect.top,
      width: padRect.width,
      height: padRect.height,
    }

    setFrogTarget(target)
    setJumping(true)

    setTimeout(() => {
      const conn = getConnectedCells(grid, gridSize)
      const newGrid = [...grid]
      for (const idx of conn) {
        newGrid[idx] = colorIdx
      }
      setGrid(newGrid)
      setMoves(m => m + 1)
      setMoveHistory(prev => [...prev, newGrid])
      setFrogPos(target)
      setFrogTarget(null)
      setJumping(false)
    }, 280)
  }, [grid, gridSize, jumping])

  const gap = gridSize <= 5 ? 4 : gridSize <= 8 ? 3 : 1
  const br = gridSize <= 5 ? 6 : gridSize <= 8 ? 4 : 2
  const halfGap = gap / 2

  // Compute per-cell styles: connected cells expand into the gap toward connected neighbors
  const displayConnected = useMemo(() => {
    if (!isWon || replayFrames.length === 0) return connected
    return getConnectedCells(displayGrid, gridSize)
  }, [isWon, replayFrames, displayGrid, gridSize, connected])

  const getCellStyle = (i) => {
    const colorIdx = displayGrid[i]
    const isConn = displayConnected.has(i)
    const col = i % gridSize
    const row = Math.floor(i / gridSize)

    if (!isConn) {
      return {
        backgroundColor: COLORS[colorIdx].fill,
        borderRadius: `${br}px`,
        margin: `${halfGap}px`,
      }
    }

    // Check which neighbors are also connected
    const up = row > 0 && displayConnected.has(i - gridSize)
    const down = row < gridSize - 1 && displayConnected.has(i + gridSize)
    const left = col > 0 && displayConnected.has(i - 1)
    const right = col < gridSize - 1 && displayConnected.has(i + 1)

    // Expand into gap toward connected neighbors
    const marginTop = up ? 0 : halfGap
    const marginBottom = down ? 0 : halfGap
    const marginLeft = left ? 0 : halfGap
    const marginRight = right ? 0 : halfGap

    // Only round corners that face a non-connected edge
    const tl = (!up && !left) ? br : 0
    const tr = (!up && !right) ? br : 0
    const blr = (!down && !left) ? br : 0
    const brr = (!down && !right) ? br : 0

    return {
      backgroundColor: COLORS[colorIdx].fill,
      borderRadius: `${tl}px ${tr}px ${brr}px ${blr}px`,
      margin: `${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px`,
    }
  }

  if (levelLoading) {
    return (
      <div className="color-jump-game">
        <div className="no-level-message">Loading...</div>
      </div>
    )
  }

  if (!levelData && !import.meta.env.DEV) {
    return (
      <div className="color-jump-game">
        <div className="no-level-message">
          No {difficulty} puzzle available for today.
          <br />
          Check back later!
        </div>
      </div>
    )
  }

  return (
    <div className="color-jump-game">
      <div className="cj-grid-container" style={{ position: 'relative' }}>
        <div
          className={`cj-grid${isWon && replayFrames.length > 0 ? ' replaying' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          }}
        >
          {displayGrid.map((colorIdx, i) => (
            <div
              key={i}
              className="cj-cell"
              style={getCellStyle(i)}
            />
          ))}
        </div>
        {isWon && replayFrames.length > 0 && (
          <div className="cj-replay-indicator">
            {replayFrame === 0 ? 'Start' : `Move ${replayFrame}/${replayFrames.length - 1}`}
          </div>
        )}
      </div>

      <div className="cj-stats">
        <button className="cj-reset-btn" onClick={() => { setGrid(initialGridRef.current); setMoves(0); setMoveHistory([]) }}>
          Reset
        </button>
        <div className="cj-stats-right">
          <span className="cj-stat">
            <span className="cj-stat-label">Moves:</span> {moves}
          </span>
          {levelPar !== null && (
            <span className="cj-stat cj-stat-min">
              <span className="cj-stat-label">Par:</span> {levelPar}
            </span>
          )}
        </div>
      </div>

      {isWon ? (
        <div className="win-buttons">
          {difficulty !== 'hard' && difficulty !== 'expert' ? (
            <button className="win-message" onClick={() => {
              const next = difficulty === 'easy' ? 'medium' : 'hard'
              if (onChangeDifficulty) onChangeDifficulty(next)
            }}>
              <span>You Win!</span>
              <span className="next-arrow">&rarr;</span>
            </button>
          ) : (
            <div className="win-message win-message-static">
              <span>You Win!</span>
            </div>
          )}
          <button className="share-btn" onClick={() => {
            const parText = levelPar !== null ? ` (par ${levelPar})` : ''
            const colorEmojis = ['🟥', '🟦', '🟨', '🟩', '🟪', '🟧']
            const wonColor = colorEmojis[grid[0]] || '🟩'
            const shareText = `🎨 Color Jump\n${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} (${gridSize}x${gridSize}): ${moves} moves${parText}\n\n${wonColor.repeat(Math.min(gridSize, 5))}\n\n${window.location.origin}/color-jump`
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
      ) : (
        <div className="cj-buttons" ref={buttonsRef}>
          {COLORS.map((color, idx) => (
            <ColorLilyPad
              key={color.name}
              color={color}
              btnRef={el => padRefs.current[idx] = el}
              onClick={() => handleColorPick(idx)}
            />
          ))}
          {frogPos && (
            <div
              className={`cj-floating-frog ${jumping ? 'cj-frog-jumping' : ''}`}
              style={jumping && frogTarget ? {
                '--from-left': `${frogPos.left + frogPos.width * 0.15}px`,
                '--from-top': `${frogPos.top - frogPos.height * 0.2}px`,
                '--to-left': `${frogTarget.left + frogTarget.width * 0.15}px`,
                '--to-top': `${frogTarget.top - frogTarget.height * 0.2}px`,
                '--frog-size': `${frogPos.width * 0.7}px`,
                '--mid-top': `${Math.min(frogPos.top, frogTarget.top) - frogPos.height * 0.8}px`,
                width: `${frogPos.width * 0.7}px`,
                height: `${frogPos.height * 0.7}px`,
              } : {
                left: `${frogPos.left + frogPos.width * 0.15}px`,
                top: `${frogPos.top - frogPos.height * 0.2}px`,
                width: `${frogPos.width * 0.7}px`,
                height: `${frogPos.height * 0.7}px`,
              }}
            >
              <FrogSVG color="green" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ColorJump
