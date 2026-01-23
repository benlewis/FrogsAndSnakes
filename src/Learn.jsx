import { useState, useRef, useEffect } from 'react'
import './App.css'
import './Learn.css'
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

const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

function Learn() {
  const gridRef = useRef(null)
  const [level, setLevel] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch the Easy level from 2026-01-22
  useEffect(() => {
    const fetchLevel = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/levels?date=2026-01-22`)
        if (response.ok) {
          const levelMap = await response.json()
          if (levelMap.easy) {
            setLevel(levelMap.easy)
          }
        }
      } catch (error) {
        console.error('Error fetching tutorial level:', error)
      }
      setLoading(false)
    }
    fetchLevel()
  }, [])

  const gridSize = level?.gridSize || 5

  const getInitialState = () => {
    if (!level) {
      return { frogs: [{ position: [0, 0], color: 'green', direction: 'up' }], snakes: [], logs: [], lilyPads: [] }
    }
    let frogs
    if (level.frogs) {
      frogs = level.frogs.map(f => ({
        position: [...f.position],
        color: f.color || 'green',
        direction: 'up'
      }))
    } else if (level.frog) {
      frogs = [{ position: [...level.frog.position], color: 'green', direction: 'up' }]
    } else {
      frogs = [{ position: [0, 0], color: 'green', direction: 'up' }]
    }
    return {
      frogs,
      snakes: level.snakes.map(s => ({
        positions: s.positions.map(p => [...p]),
        orientation: s.orientation
      })),
      logs: level.logs.map(l => ({
        positions: l.positions.map(p => [...p])
      })),
      lilyPads: level.lilyPads.map(lp => ({
        position: [...lp.position]
      }))
    }
  }

  const [gameState, setGameState] = useState(getInitialState)

  useEffect(() => {
    if (level) {
      setGameState(getInitialState())
    }
  }, [level])

  const { frogs, snakes, logs, lilyPads } = gameState
  const gameStateForRules = { frogs, snakes, logs, lilyPads }
  const isGameWon = frogs.length > 0 && checkWinCondition(frogs, lilyPads)

  // Selection/drag state
  const [selectedFrogIndex, setSelectedFrogIndex] = useState(null)
  const [draggingFrogIndex, setDraggingFrogIndex] = useState(null)
  const [frogDragPos, setFrogDragPos] = useState({ x: 0, y: 0 })
  const frogDragStartRef = useRef({ x: 0, y: 0 })
  const justFinishedDragRef = useRef(false)

  const [draggingSnakeIndex, setDraggingSnakeIndex] = useState(null)
  const [snakeDragOffset, setSnakeDragOffset] = useState(0)
  const snakeDragStartRef = useRef({ y: 0, x: 0, startPos: 0 })

  // Game rules wrappers
  const isSnakeCell = (col, row) => isSnakeAt(col, row, snakes)
  const isLogCell = (col, row) => isLogAt(col, row, logs)
  const isLilyPad = (col, row) => isLilyPadAt(col, row, lilyPads)

  const calcMaxSnakeDelta = (snakeIndex, direction) => {
    return getMaxSnakeDelta(snakeIndex, direction, gridSize, gameStateForRules)
  }

  const getCellContent = (col, row) => {
    const frogAtCell = frogs.findIndex(f => f.position[0] === col && f.position[1] === row)
    const hasLilyPad = isLilyPad(col, row)
    if (frogAtCell !== -1) {
      return { type: 'frog', frogIndex: frogAtCell, frog: frogs[frogAtCell], hasLilyPad }
    }
    if (isLogCell(col, row)) return { type: 'log' }
    if (hasLilyPad) return { type: 'lilypad' }
    return null
  }

  const calcValidFrogMoves = (frogIndex) => {
    return getValidFrogMoves(frogIndex, gridSize, gameStateForRules)
  }

  const activeFrogIndex = draggingFrogIndex !== null ? draggingFrogIndex : selectedFrogIndex
  const validFrogMoves = activeFrogIndex !== null ? calcValidFrogMoves(activeFrogIndex) : []
  const isValidFrogDestination = (col, row) => validFrogMoves.some(m => m[0] === col && m[1] === row)

  const getCellSize = () => {
    if (!gridRef.current) return 0
    return gridRef.current.getBoundingClientRect().height / gridSize
  }

  // Snake style
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
    snakeDragStartRef.current = { y: e.clientY, x: e.clientX, startPos }
    setSnakeDragOffset(0)
  }

  const handleSnakePointerMove = (e) => {
    if (draggingSnakeIndex === null) return
    const snake = snakes[draggingSnakeIndex]
    const isVertical = snake.orientation === 'vertical'
    const cellSize = getCellSize()
    const delta = isVertical ? e.clientY - snakeDragStartRef.current.y : e.clientX - snakeDragStartRef.current.x
    const snakeLength = snake.positions.length
    const currentPos = snakeDragStartRef.current.startPos
    const minBoundOffset = (0 - currentPos) * cellSize
    const maxBoundOffset = (gridSize - snakeLength - currentPos) * cellSize
    const maxDeltaPositive = calcMaxSnakeDelta(draggingSnakeIndex, 1)
    const maxDeltaNegative = calcMaxSnakeDelta(draggingSnakeIndex, -1)
    const minCollisionOffset = maxDeltaNegative * cellSize
    const maxCollisionOffset = maxDeltaPositive * cellSize
    const minOffset = Math.max(minBoundOffset, minCollisionOffset)
    const maxOffset = Math.min(maxBoundOffset, maxCollisionOffset)
    setSnakeDragOffset(Math.max(minOffset, Math.min(maxOffset, delta)))
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
            ? { ...s, positions: s.positions.map(([col, row]) => isVertical ? [col, row + posDelta] : [col + posDelta, row]) }
            : s
        )
      }))
    }
    setDraggingSnakeIndex(null)
    setSnakeDragOffset(0)
  }

  // Frog handlers
  const handleFrogClick = (frogIndex) => {
    if (justFinishedDragRef.current) { justFinishedDragRef.current = false; return }
    setSelectedFrogIndex(selectedFrogIndex === frogIndex ? null : frogIndex)
  }

  const handleCellClick = (col, row) => {
    if (isGameWon) return
    if (selectedFrogIndex !== null && isValidFrogDestination(col, row)) {
      setGameState(prev => {
        const oldPos = prev.frogs[selectedFrogIndex].position
        let direction = prev.frogs[selectedFrogIndex].direction
        const dx = col - oldPos[0], dy = row - oldPos[1]
        if (Math.abs(dx) > Math.abs(dy)) { direction = dx > 0 ? 'right' : 'left' }
        else { direction = dy > 0 ? 'down' : 'up' }
        return { ...prev, frogs: prev.frogs.map((f, idx) => idx === selectedFrogIndex ? { ...f, position: [col, row], direction } : f) }
      })
      setSelectedFrogIndex(null)
      return
    }
    setSelectedFrogIndex(null)
  }

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
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) hasDragged = true
      setFrogDragPos({ x: deltaX, y: deltaY })
    }

    const onUp = (upEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (hasDragged) {
        const gridRect = gridRef.current?.getBoundingClientRect()
        if (gridRect) {
          const cellSize = gridRect.height / gridSize
          const dropCol = Math.floor((upEvent.clientX - gridRect.left) / cellSize)
          const dropRow = Math.floor((upEvent.clientY - gridRect.top) / cellSize)
          const currentValidMoves = calcValidFrogMoves(frogIndex)
          if (currentValidMoves.some(m => m[0] === dropCol && m[1] === dropRow)) {
            setGameState(prev => {
              const oldPos = prev.frogs[frogIndex].position
              let direction = prev.frogs[frogIndex].direction
              const dx = dropCol - oldPos[0], dy = dropRow - oldPos[1]
              if (Math.abs(dx) > Math.abs(dy)) { direction = dx > 0 ? 'right' : 'left' }
              else { direction = dy > 0 ? 'down' : 'up' }
              return { ...prev, frogs: prev.frogs.map((f, idx) => idx === frogIndex ? { ...f, position: [dropCol, dropRow], direction } : f) }
            })
          }
        }
        justFinishedDragRef.current = true
      }
      setDraggingFrogIndex(null)
      setFrogDragPos({ x: 0, y: 0 })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

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

  const handleReset = () => {
    setGameState(getInitialState())
    setSelectedFrogIndex(null)
    setDraggingFrogIndex(null)
  }

  if (loading) {
    return (
      <div className="app learn-page">
        <h1 className="title">Learn to Play</h1>
        <div className="loading-message">Loading...</div>
      </div>
    )
  }

  return (
    <div className="app learn-page">
      <h1 className="title">Learn to Play</h1>

      <div className="grid-container">
        <div className="grid" ref={gridRef} style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)`, gridTemplateRows: `repeat(${gridSize}, 1fr)` }}>
          {Array(gridSize).fill(null).map((_, rowIndex) => (
            Array(gridSize).fill(null).map((_, colIndex) => {
              const content = getCellContent(colIndex, rowIndex)
              const snakeCell = isSnakeCell(colIndex, rowIndex)
              const isFrogCell = content?.type === 'frog'
              const isThisFrogSelected = isFrogCell && selectedFrogIndex === content.frogIndex
              const isThisFrogDragging = isFrogCell && draggingFrogIndex === content.frogIndex
              const isValidDest = isValidFrogDestination(colIndex, rowIndex)

              return (
                <div
                  key={`${colIndex}-${rowIndex}`}
                  className={`cell ${content ? `cell-${content.type}` : ''} ${snakeCell ? 'cell-snake' : ''} ${isThisFrogSelected || isThisFrogDragging ? 'cell-frog-active' : ''} ${activeFrogIndex !== null && isValidDest ? 'cell-valid-dest' : ''}`}
                  onClick={() => handleCellClick(colIndex, rowIndex)}
                >
                  {content && content.type === 'frog' && content.hasLilyPad ? (
                    <>
                      <span className="piece-icon lilypad-under-frog"><LilyPadSVG /></span>
                      <span
                        className={`piece-icon frog-piece frog-on-pad ${isThisFrogSelected ? 'selected' : ''} ${isThisFrogDragging ? 'dragging' : ''}`}
                        onPointerDown={(e) => handleFrogPointerDown(e, content.frogIndex)}
                        onClick={(e) => { e.stopPropagation(); handleFrogClick(content.frogIndex); }}
                        style={{ transform: isThisFrogDragging ? `translate(${frogDragPos.x}px, ${frogDragPos.y}px)` : undefined, zIndex: isThisFrogDragging ? 100 : undefined }}
                      >
                        <FrogSVG color={content.frog.color} />
                      </span>
                    </>
                  ) : content && content.type === 'frog' ? (
                    <span
                      className={`piece-icon frog-piece ${isThisFrogSelected ? 'selected' : ''} ${isThisFrogDragging ? 'dragging' : ''}`}
                      onPointerDown={(e) => handleFrogPointerDown(e, content.frogIndex)}
                      onClick={(e) => { e.stopPropagation(); handleFrogClick(content.frogIndex); }}
                      style={{ transform: isThisFrogDragging ? `translate(${frogDragPos.x}px, ${frogDragPos.y}px)` : undefined, zIndex: isThisFrogDragging ? 100 : undefined }}
                    >
                      <FrogSVG color={content.frog.color} />
                    </span>
                  ) : content && content.type === 'lilypad' ? (
                    <span className="piece-icon"><LilyPadSVG /></span>
                  ) : content && content.type === 'log' ? (
                    <span className="piece-icon"><LogSVG /></span>
                  ) : null}
                </div>
              )
            })
          ))}

          {snakes.map((snake, index) => (
            <div
              key={`snake-${index}`}
              className={`snake-overlay ${draggingSnakeIndex === index ? 'dragging' : ''}`}
              style={getSnakeStyle(snake, index)}
              onPointerDown={(e) => handleSnakePointerDown(e, index)}
            >
              {snake.orientation === 'vertical' ? <VerticalSnakeSVG length={snake.positions.length} /> : <HorizontalSnakeSVG length={snake.positions.length} />}
            </div>
          ))}
        </div>
      </div>

      <div className="learn-controls">
        <button className="reset-btn" onClick={handleReset}>Reset</button>
      </div>

      {isGameWon && (
        <div className="learn-win-message">You did it!</div>
      )}

      <div className="learn-instructions">
        <p>Get the frog to the lily pad!</p>
      </div>

      <a className="learn-back-link" href="/">Back to Game</a>
    </div>
  )
}

export default Learn
