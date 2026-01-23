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
import { solveLevel } from './solver.js'
import {
  isSnakeAt,
  isLogAt,
  isLilyPadAt,
  getValidFrogMoves,
  getMaxSnakeDelta,
  checkWinCondition
} from './gameRules.js'

const TUTORIAL_STEPS = [
  { text: 'The goal of the game is to move all of the frogs to a lily pad.', type: 'info' },
  { text: 'Frogs move by jumping. They must jump over at least one object and only move in a line.', type: 'info' },
  { text: 'Select the frog and jump to the indicated cell.', type: 'frog', moveIndex: 0 },
  { text: 'Snakes move by sliding. Slide the snake to the indicated place.', type: 'snake', moveIndex: 1 },
  { text: 'Jump the frog over the snake.', type: 'frog', moveIndex: 2 },
  { text: 'Jump the frog to the lily pad!', type: 'frog', moveIndex: 3 },
]

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

  // Override frog start position for tutorial
  const TUTORIAL_FROG_START = [3, 3]

  const getInitialState = () => {
    if (!level) {
      return { frogs: [{ position: [0, 0], color: 'green', direction: 'up' }], snakes: [], logs: [], lilyPads: [] }
    }
    const frogs = [{ position: [...TUTORIAL_FROG_START], color: 'green', direction: 'up' }]
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
  const [step, setStep] = useState(0)
  const [solutionPath, setSolutionPath] = useState([])

  useEffect(() => {
    if (level) {
      setGameState(getInitialState())
      setStep(0)
      // Compute solution path from tutorial start position
      const solverFrogs = [{ position: [...TUTORIAL_FROG_START], color: 'green' }]
      const result = solveLevel(
        level.gridSize || 5,
        solverFrogs,
        level.snakes,
        level.logs,
        level.lilyPads
      )
      if (result.solvable) {
        setSolutionPath(result.path)
      }
    }
  }, [level])

  const { frogs, snakes, logs, lilyPads } = gameState
  const gameStateForRules = { frogs, snakes, logs, lilyPads }
  const isGameWon = frogs.length > 0 && checkWinCondition(frogs, lilyPads)

  // Current step's expected move from the solution path
  const currentStepDef = TUTORIAL_STEPS[step]
  const currentHint = currentStepDef?.moveIndex !== undefined ? solutionPath[currentStepDef.moveIndex] : null

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
    if (currentStepDef?.type !== 'snake') return
    if (currentHint && snakeIndex !== currentHint.snakeIdx) return
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
      const newPositions = snake.positions.map(([col, row]) => isVertical ? [col, row + posDelta] : [col + posDelta, row])
      setGameState(prev => ({
        ...prev,
        snakes: prev.snakes.map((s, i) =>
          i === draggingSnakeIndex
            ? { ...s, positions: newPositions }
            : s
        )
      }))
      // Advance tutorial on any snake move during a snake step
      if (currentStepDef?.type === 'snake') {
        setStep(s => s + 1)
      }
    }
    setDraggingSnakeIndex(null)
    setSnakeDragOffset(0)
  }

  // Frog handlers
  const handleFrogClick = (frogIndex) => {
    if (justFinishedDragRef.current) { justFinishedDragRef.current = false; return }
    // Only allow selecting the hinted frog during frog steps
    if (currentStepDef?.type === 'frog' && currentHint && frogIndex !== currentHint.frogIdx) return
    setSelectedFrogIndex(selectedFrogIndex === frogIndex ? null : frogIndex)
  }

  const advanceAfterMove = (type, from, to) => {
    if (!currentStepDef || currentStepDef.type !== type) return
    if (type === 'frog') {
      if (!currentHint || (to[0] === currentHint.to[0] && to[1] === currentHint.to[1])) {
        setStep(s => s + 1)
        setSelectedFrogIndex(null)
      }
    }
  }

  const handleCellClick = (col, row) => {
    if (isGameWon) return
    if (currentStepDef?.type === 'snake' || currentStepDef?.type === 'info') { setSelectedFrogIndex(null); return }
    // Only allow moving to the hinted destination
    if (currentHint && (col !== currentHint.to[0] || row !== currentHint.to[1])) { return }
    if (selectedFrogIndex !== null && isValidFrogDestination(col, row)) {
      const oldPos = frogs[selectedFrogIndex].position
      setGameState(prev => {
        let direction = prev.frogs[selectedFrogIndex].direction
        const dx = col - oldPos[0], dy = row - oldPos[1]
        if (Math.abs(dx) > Math.abs(dy)) { direction = dx > 0 ? 'right' : 'left' }
        else { direction = dy > 0 ? 'down' : 'up' }
        return { ...prev, frogs: prev.frogs.map((f, idx) => idx === selectedFrogIndex ? { ...f, position: [col, row], direction } : f) }
      })
      advanceAfterMove('frog', oldPos, [col, row])
      setSelectedFrogIndex(null)
      return
    }
    setSelectedFrogIndex(null)
  }

  const handleFrogPointerDown = (e, frogIndex) => {
    if (isGameWon) return
    if (currentStepDef?.type === 'snake' || currentStepDef?.type === 'info') return
    if (currentStepDef?.type === 'frog' && currentHint && frogIndex !== currentHint.frogIdx) return
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
          if (currentValidMoves.some(m => m[0] === dropCol && m[1] === dropRow) && (!currentHint || (dropCol === currentHint.to[0] && dropRow === currentHint.to[1]))) {
            const oldPos = frogs[frogIndex].position
            setGameState(prev => {
              let direction = prev.frogs[frogIndex].direction
              const dx = dropCol - oldPos[0], dy = dropRow - oldPos[1]
              if (Math.abs(dx) > Math.abs(dy)) { direction = dx > 0 ? 'right' : 'left' }
              else { direction = dy > 0 ? 'down' : 'up' }
              return { ...prev, frogs: prev.frogs.map((f, idx) => idx === frogIndex ? { ...f, position: [dropCol, dropRow], direction } : f) }
            })
            advanceAfterMove('frog', oldPos, [dropCol, dropRow])
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
    setStep(0)
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
              const isValidDest = isValidFrogDestination(colIndex, rowIndex) && (!currentHint || (colIndex === currentHint.to[0] && rowIndex === currentHint.to[1]))

              const isHintSource = currentHint?.type === 'frog' && selectedFrogIndex === null && currentHint.from[0] === colIndex && currentHint.from[1] === rowIndex
              const isHintDest = currentHint?.type === 'frog' && selectedFrogIndex === currentHint.frogIdx && currentHint.to[0] === colIndex && currentHint.to[1] === rowIndex

              return (
                <div
                  key={`${colIndex}-${rowIndex}`}
                  className={`cell ${content ? `cell-${content.type}` : ''} ${snakeCell ? 'cell-snake' : ''} ${isThisFrogSelected || isThisFrogDragging ? 'cell-frog-active' : ''} ${activeFrogIndex !== null && isValidDest ? 'cell-valid-dest' : ''} ${isHintSource ? 'cell-hint-source' : ''} ${isHintDest ? 'cell-hint-dest' : ''}`}
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
              className={`snake-overlay ${draggingSnakeIndex === index ? 'dragging' : ''} ${currentHint?.type === 'snake' && currentHint.snakeIdx === index ? 'snake-hint' : ''}`}
              style={getSnakeStyle(snake, index)}
              onPointerDown={(e) => handleSnakePointerDown(e, index)}
            >
              {snake.orientation === 'vertical' ? <VerticalSnakeSVG length={snake.positions.length} /> : <HorizontalSnakeSVG length={snake.positions.length} />}
            </div>
          ))}
        </div>
      </div>

      <div className="learn-instructions">
        {step < TUTORIAL_STEPS.length ? (
          <>
            <p>{TUTORIAL_STEPS[step].text}</p>
            {TUTORIAL_STEPS[step].type === 'info' && (
              <button className="learn-next-btn" onClick={() => setStep(s => s + 1)}>
                Next &rarr;
              </button>
            )}
          </>
        ) : (
          <>
            <p className="learn-complete">You did it! You're ready to play.</p>
            <a className="learn-play-btn" href="/">Play Now &rarr;</a>
          </>
        )}
      </div>
    </div>
  )
}

export default Learn
