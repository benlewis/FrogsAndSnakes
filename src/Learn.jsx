import { useState, useRef } from 'react'
import './App.css'
import './Learn.css'
import AccountMenu from './components/AccountMenu.jsx'
import StatsModal from './components/StatsModal.jsx'
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
  getValidFrogMoves,
  getMaxSnakeDelta,
  checkWinCondition
} from './gameRules.js'

const TUTORIAL_LEVELS = [
  {
    title: 'Frog Jumping',
    instruction: 'The goal of this game is to place all the frogs on a lily pad. Frogs jump over objects. Tap the frog, then tap the lily pad.',
    gridSize: 5,
    frogs: [{ position: [2, 3], color: 'green' }],
    logs: [{ positions: [[2, 2]] }],
    snakes: [],
    lilyPads: [{ position: [2, 1] }],
  },
  {
    title: 'Jumping Over Multiple',
    instruction: 'Frogs can only move by jumping over at least one object. They can also jump over multiple objects at once. Jump the frog to the lily pad.',
    gridSize: 5,
    frogs: [{ position: [1, 0], color: 'green' }],
    logs: [{ positions: [[1, 1]] }, { positions: [[1, 2]] }, { positions: [[2, 3]] }, { positions: [[3, 3]] }],
    snakes: [],
    lilyPads: [{ position: [4, 3] }],
  },
  {
    title: 'Jumping Over Frogs',
    instruction: 'Frogs can also jump over other frogs. Move each frog to a lily pad.',
    gridSize: 5,
    frogs: [{ position: [2, 3], color: 'green' }, { position: [1, 1], color: 'green' }],
    logs: [{ positions: [[2, 2]] }],
    snakes: [],
    lilyPads: [{ position: [2, 1] }, { position: [3, 1] }],
  },
  {
    title: 'Sliding Snakes',
    instruction: 'Snakes slide along their body. Drag or tap to move them. Rearrange the snakes to create a jumping path for the frog.',
    gridSize: 5,
    frogs: [{ position: [0, 2], color: 'green' }],
    logs: [],
    snakes: [
      { positions: [[1, 0], [1, 1]], orientation: 'vertical' },
      { positions: [[1, 2], [2, 2]], orientation: 'horizontal' },
    ],
    lilyPads: [{ position: [4, 2] }],
  },
  // Future levels added here
]

function Learn() {
  const gridRef = useRef(null)
  const [showStats, setShowStats] = useState(false)
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0)

  const currentLevel = TUTORIAL_LEVELS[currentLevelIndex]
  const gridSize = currentLevel.gridSize

  const getInitialState = () => {
    return {
      frogs: currentLevel.frogs.map(f => ({
        position: [...f.position],
        color: f.color,
        direction: 'up',
      })),
      snakes: currentLevel.snakes.map(s => ({
        positions: s.positions.map(p => [...p]),
        orientation: s.orientation,
      })),
      logs: currentLevel.logs.map(l => ({
        positions: l.positions.map(p => [...p]),
      })),
      lilyPads: currentLevel.lilyPads.map(lp => ({
        position: [...lp.position],
      })),
    }
  }

  const [gameState, setGameState] = useState(getInitialState)

  const { frogs, snakes, logs, lilyPads } = gameState
  const gameStateForRules = { frogs, snakes, logs, lilyPads }
  const isGameWon = frogs.length > 0 && checkWinCondition(frogs, lilyPads)

  // Selection/drag state
  const [selectedFrogIndex, setSelectedFrogIndex] = useState(null)
  const [draggingFrogIndex, setDraggingFrogIndex] = useState(null)
  const [frogDragPos, setFrogDragPos] = useState({ x: 0, y: 0 })
  const frogDragStartRef = useRef({ x: 0, y: 0 })
  const justFinishedDragRef = useRef(false)

  const [selectedSnakeIndex, setSelectedSnakeIndex] = useState(null)
  const [draggingSnakeIndex, setDraggingSnakeIndex] = useState(null)
  const [snakeDragOffset, setSnakeDragOffset] = useState(0)
  const justFinishedSnakeDragRef = useRef(false)

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

  // Calculate valid snake destinations for tap-to-move
  const calcValidSnakeDestinations = (snakeIndex) => {
    if (snakeIndex === null || !snakes[snakeIndex]) return []
    const snake = snakes[snakeIndex]
    const isVertical = snake.orientation === 'vertical'
    const positions = snake.positions
    const axisPositions = positions.map(p => isVertical ? p[1] : p[0])
    const currentMin = Math.min(...axisPositions)
    const currentMax = Math.max(...axisPositions)
    const fixedAxis = isVertical ? positions[0][0] : positions[0][1]
    const maxPositive = calcMaxSnakeDelta(snakeIndex, 1)
    const maxNegative = calcMaxSnakeDelta(snakeIndex, -1)
    const destinations = []
    const reachableMin = currentMin + maxNegative
    const reachableMax = currentMax + maxPositive
    for (let pos = reachableMin; pos <= reachableMax; pos++) {
      if (pos >= currentMin && pos <= currentMax) continue
      if (pos >= 0 && pos < gridSize) {
        const col = isVertical ? fixedAxis : pos
        const row = isVertical ? pos : fixedAxis
        destinations.push([col, row])
      }
    }
    return destinations
  }

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
    if (targetPos > currentMax) {
      const neededDelta = targetPos - currentMax
      return Math.min(neededDelta, maxPositive)
    }
    if (targetPos < currentMin) {
      const neededDelta = targetPos - currentMin
      return Math.max(neededDelta, maxNegative)
    }
    return 0
  }

  const validSelectedSnakeIndex = selectedSnakeIndex !== null && selectedSnakeIndex < snakes.length ? selectedSnakeIndex : null
  const validSnakeDestinations = validSelectedSnakeIndex !== null ? calcValidSnakeDestinations(validSelectedSnakeIndex) : []
  const isValidSnakeDestination = (col, row) => validSnakeDestinations.some(dest => dest[0] === col && dest[1] === row)
  const getSnakeDeltaForDestination = (col, row) => calcSnakeDeltaForCell(validSelectedSnakeIndex, col, row)

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

  // Snake click handler for tap-to-select
  const handleSnakeClick = (snakeIndex) => {
    if (isGameWon) return
    if (justFinishedSnakeDragRef.current) {
      justFinishedSnakeDragRef.current = false
      return
    }
    setSelectedFrogIndex(null)
    setSelectedSnakeIndex(selectedSnakeIndex === snakeIndex ? null : snakeIndex)
  }

  // Snake drag handler
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
      const delta = isVertical ? moveEvent.clientY - startY : moveEvent.clientX - startX

      if (Math.abs(delta) > 5) hasDragged = true

      const snakeLength = snake.positions.length
      const minBoundOffset = (0 - startPos) * cellSize
      const maxBoundOffset = (gridSize - snakeLength - startPos) * cellSize
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
        const newPositions = snake.positions.map(([col, row]) => isVertical ? [col, row + posDelta] : [col + posDelta, row])
        setGameState(prev => ({
          ...prev,
          snakes: prev.snakes.map((s, i) => i === snakeIndex ? { ...s, positions: newPositions } : s)
        }))
        setSelectedSnakeIndex(null)
      }

      if (hasDragged) justFinishedSnakeDragRef.current = true
      setDraggingSnakeIndex(null)
      setSnakeDragOffset(0)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  // Frog handlers
  const handleFrogClick = (frogIndex) => {
    if (isGameWon) return
    if (justFinishedDragRef.current) { justFinishedDragRef.current = false; return }
    setSelectedSnakeIndex(null)
    setSelectedFrogIndex(selectedFrogIndex === frogIndex ? null : frogIndex)
  }

  const handleCellClick = (col, row) => {
    if (isGameWon) return

    // Handle frog moves
    if (selectedFrogIndex !== null && isValidFrogDestination(col, row)) {
      const oldPos = frogs[selectedFrogIndex].position
      setGameState(prev => {
        let direction = prev.frogs[selectedFrogIndex].direction
        const dx = col - oldPos[0], dy = row - oldPos[1]
        if (Math.abs(dx) > Math.abs(dy)) { direction = dx > 0 ? 'right' : 'left' }
        else { direction = dy > 0 ? 'down' : 'up' }
        return { ...prev, frogs: prev.frogs.map((f, idx) => idx === selectedFrogIndex ? { ...f, position: [col, row], direction } : f) }
      })
      setSelectedFrogIndex(null)
      return
    }

    // Handle snake moves via tap-to-select
    if (selectedSnakeIndex !== null && isValidSnakeDestination(col, row)) {
      const snakeIdx = selectedSnakeIndex
      const delta = getSnakeDeltaForDestination(col, row)
      const snake = snakes[snakeIdx]
      const isVertical = snake.orientation === 'vertical'

      setGameState(prev => ({
        ...prev,
        snakes: prev.snakes.map((s, i) =>
          i === snakeIdx
            ? { ...s, positions: s.positions.map(([c, r]) => isVertical ? [c, r + delta] : [c + delta, r]) }
            : s
        )
      }))
      setSelectedSnakeIndex(null)
      return
    }

    setSelectedFrogIndex(null)
    setSelectedSnakeIndex(null)
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
            const oldPos = frogs[frogIndex].position
            setGameState(prev => {
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

  const handleReset = () => {
    setGameState(getInitialState())
    setSelectedFrogIndex(null)
    setDraggingFrogIndex(null)
    setSelectedSnakeIndex(null)
  }

  const handleNextLevel = () => {
    setCurrentLevelIndex(i => i + 1)
    setGameState(() => {
      const nextLevel = TUTORIAL_LEVELS[currentLevelIndex + 1]
      return {
        frogs: nextLevel.frogs.map(f => ({
          position: [...f.position],
          color: f.color,
          direction: 'up',
        })),
        snakes: nextLevel.snakes.map(s => ({
          positions: s.positions.map(p => [...p]),
          orientation: s.orientation,
        })),
        logs: nextLevel.logs.map(l => ({
          positions: l.positions.map(p => [...p]),
        })),
        lilyPads: nextLevel.lilyPads.map(lp => ({
          position: [...lp.position],
        })),
      }
    })
    setSelectedFrogIndex(null)
    setDraggingFrogIndex(null)
    setSelectedSnakeIndex(null)
  }

  const isLastLevel = currentLevelIndex >= TUTORIAL_LEVELS.length - 1

  return (
    <div className="app learn-page">
      <header className="app-header">
        <h1 className="title">Learn to Play</h1>
        <AccountMenu onShowStats={() => setShowStats(true)} />
      </header>

      {showStats && <StatsModal onClose={() => setShowStats(false)} currentDate="2026-01-22" />}

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
              const isValidSnakeDest = isValidSnakeDestination(colIndex, rowIndex)

              return (
                <div
                  key={`${colIndex}-${rowIndex}`}
                  className={`cell ${content ? `cell-${content.type}` : ''} ${snakeCell ? 'cell-snake' : ''} ${isThisFrogSelected || isThisFrogDragging ? 'cell-frog-active' : ''} ${activeFrogIndex !== null && isValidDest ? 'cell-valid-dest' : ''} ${validSelectedSnakeIndex !== null && isValidSnakeDest ? 'cell-valid-snake-dest' : ''}`}
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
              className={`snake-overlay ${draggingSnakeIndex === index ? 'dragging' : ''} ${validSelectedSnakeIndex === index ? 'snake-selected' : ''}`}
              style={getSnakeStyle(snake, index)}
              onPointerDown={(e) => handleSnakePointerDown(e, index)}
              onClick={(e) => { e.stopPropagation(); handleSnakeClick(index); }}
            >
              {snake.orientation === 'vertical' ? <VerticalSnakeSVG length={snake.positions.length} /> : <HorizontalSnakeSVG length={snake.positions.length} />}
            </div>
          ))}
        </div>
      </div>

      <div className="learn-instructions">
        {isGameWon ? (
          <>
            <p className="learn-complete">You did it!</p>
            {isLastLevel ? (
              <>
                <p>You're ready to play.</p>
                <a className="learn-play-btn" href="/">Play Now &rarr;</a>
              </>
            ) : (
              <button className="learn-next-btn" onClick={handleNextLevel}>
                Next Level &rarr;
              </button>
            )}
          </>
        ) : (
          <p>{currentLevel.instruction}</p>
        )}
      </div>
    </div>
  )
}

export default Learn
