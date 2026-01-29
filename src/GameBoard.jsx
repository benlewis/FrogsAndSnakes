import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
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
import { solveLevel } from './solver.js'

/**
 * GameBoard - A reusable game board component for playing Frogs and Snakes
 *
 * Props:
 * - initialState: { frogs, snakes, logs, lilyPads } - the starting state
 * - gridSize: number - size of the grid
 * - onMove: (moves) => void - called when move count changes
 * - onWin: () => void - called when game is won
 * - onHintUsed: () => void - called when a hint is used
 * - showHintButton: boolean - whether to show the hint button
 * - showMoveCounter: boolean - whether to show move counter
 * - className: string - additional CSS class
 */
const GameBoard = forwardRef(({
  initialState,
  gridSize = 5,
  onMove,
  onWin,
  onHintUsed,
  showHintButton = true,
  showMoveCounter = true,
  className = '',
}, ref) => {
  const gridRef = useRef(null)

  // Game state
  const [gameState, setGameState] = useState(() => ({
    frogs: initialState.frogs.map(f => ({
      position: [...f.position],
      color: f.color || 'green',
      direction: f.direction || 'up'
    })),
    snakes: initialState.snakes.map(s => ({
      positions: s.positions.map(p => [...p]),
      orientation: s.orientation
    })),
    logs: initialState.logs.map(l => ({
      positions: l.positions.map(p => [...p])
    })),
    lilyPads: initialState.lilyPads.map(lp => ({
      position: [...lp.position]
    }))
  }))

  const [moves, setMoves] = useState(0)
  const [initialized, setInitialized] = useState(false)

  // Frog selection/drag state
  const [selectedFrogIndex, setSelectedFrogIndex] = useState(null)
  const [draggingFrogIndex, setDraggingFrogIndex] = useState(null)
  const [frogDragPos, setFrogDragPos] = useState({ x: 0, y: 0 })
  const frogDragStartRef = useRef({ x: 0, y: 0 })
  const justFinishedDragRef = useRef(false)

  // Snake selection state
  const [selectedSnakeIndex, setSelectedSnakeIndex] = useState(null)

  // Snake drag state
  const [draggingSnakeIndex, setDraggingSnakeIndex] = useState(null)
  const [snakeDragOffset, setSnakeDragOffset] = useState(0)
  const justFinishedSnakeDragRef = useRef(false)

  // Hint state
  const [hintMove, setHintMove] = useState(null)
  const [hintLoading, setHintLoading] = useState(false)
  const hintTimerRef = useRef(null)

  const { frogs, snakes, logs, lilyPads } = gameState
  const gameStateForRules = { frogs, snakes, logs, lilyPads }

  // Check win condition
  const isGameWon = frogs.length > 0 && checkWinCondition(frogs, lilyPads)

  // Notify parent of win
  useEffect(() => {
    if (isGameWon && onWin) {
      onWin()
    }
  }, [isGameWon])

  // Initialize
  useEffect(() => {
    setSelectedFrogIndex(null)
    setSelectedSnakeIndex(null)
    setDraggingFrogIndex(null)
    setInitialized(true)
  }, [])

  // Reset when initialState changes
  useEffect(() => {
    setGameState({
      frogs: initialState.frogs.map(f => ({
        position: [...f.position],
        color: f.color || 'green',
        direction: f.direction || 'up'
      })),
      snakes: initialState.snakes.map(s => ({
        positions: s.positions.map(p => [...p]),
        orientation: s.orientation
      })),
      logs: initialState.logs.map(l => ({
        positions: l.positions.map(p => [...p])
      })),
      lilyPads: initialState.lilyPads.map(lp => ({
        position: [...lp.position]
      }))
    })
    setMoves(0)
    setSelectedFrogIndex(null)
    setSelectedSnakeIndex(null)
    setDraggingFrogIndex(null)
    clearHint()
  }, [initialState])

  // Expose reset method to parent
  useImperativeHandle(ref, () => ({
    reset: () => {
      setGameState({
        frogs: initialState.frogs.map(f => ({
          position: [...f.position],
          color: f.color || 'green',
          direction: f.direction || 'up'
        })),
        snakes: initialState.snakes.map(s => ({
          positions: s.positions.map(p => [...p]),
          orientation: s.orientation
        })),
        logs: initialState.logs.map(l => ({
          positions: l.positions.map(p => [...p])
        })),
        lilyPads: initialState.lilyPads.map(lp => ({
          position: [...lp.position]
        }))
      })
      setMoves(0)
      setSelectedFrogIndex(null)
      setSelectedSnakeIndex(null)
      setDraggingFrogIndex(null)
      clearHint()
    },
    getMoves: () => moves,
    isWon: () => isGameWon
  }))

  // Hint functions
  const clearHint = () => {
    setHintMove(null)
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current)
      hintTimerRef.current = null
    }
  }

  const handleHint = () => {
    if (isGameWon || hintLoading) return
    clearHint()
    setHintLoading(true)

    setTimeout(() => {
      const solverFrogs = frogs.map(f => ({ position: [...f.position], color: f.color }))
      const result = solveLevel(gridSize, solverFrogs, snakes, logs, lilyPads)

      if (result.solvable && result.path.length > 0) {
        setHintMove(result.path[0])
        if (onHintUsed) onHintUsed()
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

  // Convenience wrappers
  const isSnakeCell = (col, row) => isSnakeAt(col, row, snakes)
  const isLogCell = (col, row) => isLogAt(col, row, logs)
  const isLilyPad = (col, row) => isLilyPadAt(col, row, lilyPads)

  const calcMaxSnakeDelta = (snakeIndex, direction) => {
    return getMaxSnakeDelta(snakeIndex, direction, gridSize, gameStateForRules)
  }

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

  // Validate selection indices
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

  // Get cell content
  const getCellContent = (col, row) => {
    const frogAtCell = frogs.findIndex(f => f.position[0] === col && f.position[1] === row)
    const hasLilyPad = isLilyPad(col, row)

    if (frogAtCell !== -1) {
      return { type: 'frog', frogIndex: frogAtCell, frog: frogs[frogAtCell], hasLilyPad }
    }

    if (isLogCell(col, row)) {
      return { type: 'log' }
    }

    if (hasLilyPad) {
      return { type: 'lilypad' }
    }

    return null
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
        setMoves(prev => {
          const newMoves = prev + 1
          if (onMove) onMove(newMoves)
          return newMoves
        })
        clearHint()
        setSelectedSnakeIndex(null)
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

  // Frog click handler
  const handleFrogClick = (frogIndex) => {
    if (isGameWon) return
    if (justFinishedDragRef.current) {
      justFinishedDragRef.current = false
      return
    }
    setSelectedSnakeIndex(null)
    if (selectedFrogIndex === frogIndex) {
      setSelectedFrogIndex(null)
    } else {
      setSelectedFrogIndex(frogIndex)
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
    if (selectedSnakeIndex === snakeIndex) {
      setSelectedSnakeIndex(null)
    } else {
      setSelectedSnakeIndex(snakeIndex)
    }
  }

  // Cell click handler
  const handleCellClick = (col, row) => {
    if (isGameWon) return

    // Handle frog move
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
      const newMoves = moves + 1
      setMoves(newMoves)
      if (onMove) onMove(newMoves)
      setSelectedFrogIndex(null)
      clearHint()
      return
    }

    // Handle snake move via tap-to-select
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
      const newMoves = moves + 1
      setMoves(newMoves)
      if (onMove) onMove(newMoves)
      setSelectedSnakeIndex(null)
      clearHint()
      return
    }

    setSelectedFrogIndex(null)
    setSelectedSnakeIndex(null)
  }

  // Frog drag handlers
  const handleFrogPointerDown = (e, frogIndex) => {
    if (isGameWon) return
    e.preventDefault()

    setDraggingFrogIndex(frogIndex)
    frogDragStartRef.current = { x: e.clientX, y: e.clientY }
    setFrogDragPos({ x: 0, y: 0 })
    let hasDragged = false

    const onPointerMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - frogDragStartRef.current.x
      const deltaY = moveEvent.clientY - frogDragStartRef.current.y
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasDragged = true
      }
      setFrogDragPos({ x: deltaX, y: deltaY })
    }

    const onPointerUp = (upEvent) => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)

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
            const newMoves = moves + 1
            setMoves(newMoves)
            if (onMove) onMove(newMoves)
            clearHint()
          }
        }
        justFinishedDragRef.current = true
      }

      setDraggingFrogIndex(null)
      setFrogDragPos({ x: 0, y: 0 })
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }


  return (
    <div className={`game-board-wrapper ${className}`}>
      {(showMoveCounter || showHintButton) && (
        <div className="game-board-stats">
          {showMoveCounter && (
            <div className="game-board-moves">
              Moves: <strong>{moves}</strong>
            </div>
          )}
          {showHintButton && (
            <button
              className="game-board-hint-btn"
              onClick={handleHint}
              disabled={hintLoading || isGameWon}
            >
              {hintLoading ? '...' : 'Hint'}
            </button>
          )}
        </div>
      )}

      {hintMove?.type === 'unsolvable' && (
        <div className="game-board-hint-message">No solution from here!</div>
      )}

      <div className="grid-container">
        <div
          className="grid"
          ref={gridRef}
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`
          }}
        >
          {Array(gridSize).fill(null).map((_, rowIndex) => (
            Array(gridSize).fill(null).map((_, colIndex) => {
              const content = getCellContent(colIndex, rowIndex)
              const snakeCell = isSnakeCell(colIndex, rowIndex)
              const isFrogCell = content?.type === 'frog'
              const isThisFrogSelected = isFrogCell && validSelectedFrogIndex === content.frogIndex
              const isThisFrogDragging = isFrogCell && validDraggingFrogIndex === content.frogIndex
              const isValidDest = isValidFrogDestination(colIndex, rowIndex)
              const isValidSnakeDest = isValidSnakeDestination(colIndex, rowIndex)

              const isHintSource = hintMove?.type === 'frog' && hintMove.from[0] === colIndex && hintMove.from[1] === rowIndex
              const isHintDest = hintMove?.type === 'frog' && hintMove.to[0] === colIndex && hintMove.to[1] === rowIndex
              const isSnakeHintDest = hintMove?.type === 'snake' && hintMove.to[0] === colIndex && hintMove.to[1] === rowIndex

              return (
                <div
                  key={`${colIndex}-${rowIndex}`}
                  className={`cell ${content ? `cell-${content.type}` : ''} ${snakeCell ? 'cell-snake' : ''} ${isThisFrogSelected || isThisFrogDragging ? 'cell-frog-active' : ''} ${activeFrogIndex !== null && isValidDest ? 'cell-valid-dest' : ''} ${validSelectedSnakeIndex !== null && isValidSnakeDest ? 'cell-valid-snake-dest' : ''} ${isHintSource ? 'cell-hint-source' : ''} ${isHintDest || isSnakeHintDest ? 'cell-hint-dest' : ''}`}
                  onClick={() => handleCellClick(colIndex, rowIndex)}
                >
                  {content?.type === 'frog' ? (
                    <>
                      {content.hasLilyPad && <LilyPadSVG className="cell-bg" />}
                      <div
                        className={`frog-wrapper ${isThisFrogDragging ? 'dragging' : ''}`}
                        style={isThisFrogDragging ? {
                          transform: `translate(${frogDragPos.x}px, ${frogDragPos.y}px)`,
                          zIndex: 100
                        } : {}}
                        onPointerDown={(e) => handleFrogPointerDown(e, content.frogIndex)}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleFrogClick(content.frogIndex)
                        }}
                      >
                        <FrogSVG color={content.frog.color} direction={content.frog.direction} />
                      </div>
                    </>
                  ) : content?.type === 'log' ? (
                    <LogSVG />
                  ) : content?.type === 'lilypad' ? (
                    <LilyPadSVG />
                  ) : null}
                </div>
              )
            })
          ))}

          {/* Snake overlays */}
          {snakes.map((snake, index) => {
            const isHintSnake = hintMove?.type === 'snake' && hintMove.snakeIdx === index
            const isThisSnakeSelected = validSelectedSnakeIndex === index
            return (
              <div
                key={`snake-${index}`}
                className={`snake-overlay ${isHintSnake ? 'snake-hint' : ''} ${isThisSnakeSelected ? 'snake-selected' : ''}`}
                style={getSnakeStyle(snake, index)}
                onPointerDown={(e) => handleSnakePointerDown(e, index)}
                onClick={(e) => {
                  e.stopPropagation()
                  handleSnakeClick(index)
                }}
              >
                {snake.orientation === 'vertical' ? (
                  <VerticalSnakeSVG length={snake.positions.length} />
                ) : (
                  <HorizontalSnakeSVG length={snake.positions.length} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {isGameWon && (
        <div className="game-board-win-overlay">
          <div className="game-board-win-text">You Win!</div>
        </div>
      )}
    </div>
  )
})

GameBoard.displayName = 'GameBoard'

export default GameBoard
