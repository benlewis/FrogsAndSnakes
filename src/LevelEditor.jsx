import { useState, useEffect, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import './LevelEditor.css'
import { solveLevel } from './solver.js'
import GameBoard from './GameBoard.jsx'

// API base URL - use relative path for production, localhost for dev
const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

// Allowed emails for level editor access
const ALLOWED_EMAILS = ['ben.lewis@gmail.com']

// Get date string in local timezone (YYYY-MM-DD format)
const getLocalDateString = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Generate array of dates from most recent Sunday through next 2 weeks
const generateDateRange = () => {
  const dates = []
  const today = new Date()

  // Start from the most recent Sunday (or today if it's Sunday)
  const dayOfWeek = today.getDay()
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - dayOfWeek)

  // Generate dates from last Sunday through 2 weeks from today
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + 14)

  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    dates.push(getLocalDateString(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
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

const VerticalSnakeSVG = ({ length = 2 }) => {
  const cellHeight = 50
  const viewHeight = length * cellHeight
  const bodyHeight = viewHeight - 32
  const tailY = viewHeight - 10

  // Generate body pattern based on length
  const patterns = []
  const patternSpacing = bodyHeight / (length + 0.5)
  for (let i = 0; i < length; i++) {
    const y = 28 + patternSpacing * (i + 0.5)
    patterns.push(y)
  }

  return (
    <svg viewBox={`0 0 40 ${viewHeight}`} className="editor-snake-svg-vertical">
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
      <ellipse cx="22" cy={tailY + 6} rx="16" ry="4" fill="rgba(0,0,0,0.2)" />
      {/* Tail */}
      <path d={`M14 ${tailY} Q20 ${tailY + 8} 26 ${tailY}`} fill="#5b21b6" />
      <path d={`M15 ${tailY - 1} Q20 ${tailY + 5} 25 ${tailY - 1}`} fill="#7c3aed" />
      {/* Body outline */}
      <rect x="6" y="22" width="28" height={bodyHeight} rx="14" fill="#5b21b6" />
      {/* Body */}
      <rect x="8" y="24" width="24" height={bodyHeight - 4} rx="12" fill="url(#editorSnakeBodyV)" />
      {/* Body pattern */}
      {patterns.map((y, i) => (
        <ellipse key={i} cx="20" cy={y} rx="10" ry="6" fill="#7c3aed" opacity="0.5" />
      ))}
      {/* Belly stripe */}
      <rect x="16" y="30" width="8" height={bodyHeight - 15} rx="4" fill="#e9d5ff" opacity="0.4" />
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
}

const HorizontalSnakeSVG = ({ length = 2 }) => {
  const cellWidth = 50
  const viewWidth = length * cellWidth
  const bodyWidth = viewWidth - 22
  const headX = viewWidth - 18

  // Generate body pattern based on length
  const patterns = []
  const patternSpacing = bodyWidth / (length + 0.5)
  for (let i = 0; i < length; i++) {
    const x = 15 + patternSpacing * (i + 0.5)
    patterns.push(x)
  }

  return (
    <svg viewBox={`0 0 ${viewWidth} 40`} className="editor-snake-svg-horizontal">
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
      <ellipse cx={viewWidth / 2} cy="38" rx={viewWidth / 2 - 5} ry="4" fill="rgba(0,0,0,0.2)" />
      {/* Tail */}
      <path d="M10 14 Q2 20 10 26" fill="#5b21b6" />
      <path d="M11 15 Q5 20 11 25" fill="#7c3aed" />
      {/* Body outline */}
      <rect x="8" y="6" width={bodyWidth} height="28" rx="14" fill="#5b21b6" />
      {/* Body */}
      <rect x="10" y="8" width={bodyWidth - 4} height="24" rx="12" fill="url(#editorSnakeBodyH)" />
      {/* Body pattern */}
      {patterns.map((x, i) => (
        <ellipse key={i} cx={x} cy="20" rx="6" ry="10" fill="#7c3aed" opacity="0.5" />
      ))}
      {/* Belly stripe */}
      <rect x="15" y="16" width={bodyWidth - 20} height="8" rx="4" fill="#e9d5ff" opacity="0.4" />
      {/* Head outline */}
      <ellipse cx={headX} cy="20" rx="14" ry="16" fill="#5b21b6" />
      {/* Head */}
      <ellipse cx={headX + 2} cy="20" rx="12" ry="14" fill="url(#editorSnakeBodyH)" />
      {/* Eyes */}
      <ellipse cx={headX + 4} cy="13" rx="6" ry="5" fill="#5b21b6" />
      <ellipse cx={headX + 5} cy="13" rx="5" ry="4" fill="url(#editorSnakeEyeH)" />
      <ellipse cx={headX + 6} cy="14" rx="3" ry="2" fill="#1a1a1a" />
      <circle cx={headX + 4} cy="12" r="1.5" fill="white" />
      <ellipse cx={headX + 4} cy="27" rx="6" ry="5" fill="#5b21b6" />
      <ellipse cx={headX + 5} cy="27" rx="5" ry="4" fill="url(#editorSnakeEyeH)" />
      <ellipse cx={headX + 6} cy="28" rx="3" ry="2" fill="#1a1a1a" />
      <circle cx={headX + 4} cy="26" r="1.5" fill="white" />
      {/* Nostrils */}
      <circle cx={headX + 12} cy="17" r="1.5" fill="#5b21b6" />
      <circle cx={headX + 12} cy="23" r="1.5" fill="#5b21b6" />
      {/* Tongue */}
      <path d={`M${headX + 14} 20 L${headX + 20} 20 M${headX + 22} 18 L${headX + 20} 20 L${headX + 22} 22`} stroke="#dc2626" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Shine */}
      <ellipse cx={headX + 2} cy="14" rx="3" ry="4" fill="white" opacity="0.3" />
    </svg>
  )
}


const LevelEditor = ({ onClose, existingLevel = null, onSave }) => {
  const { user, isAuthenticated, isLoading, loginWithRedirect } = useAuth0()

  // Check authorization
  const isAuthorized = isAuthenticated && user?.email && ALLOWED_EMAILS.includes(user.email)

  const [gridSize, setGridSize] = useState(existingLevel?.gridSize || 5)
  const [difficulty, setDifficulty] = useState(existingLevel?.difficulty || 'easy')
  const [par, setPar] = useState(existingLevel?.par || 3)
  const [levelDate, setLevelDate] = useState(existingLevel?.date || getLocalDateString(new Date()))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [checkResult, setCheckResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [tryItMode, setTryItMode] = useState(false)
  const [tryItHints, setTryItHints] = useState(0)
  const gameBoardRef = useRef(null)

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
    setLevelDate(level.date || getLocalDateString(new Date()))
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

  const resetGenOptionsToDefault = () => {
    setGenNumFrogs('default')
    setGenNumSnakes('default')
    setGenMaxSnakeSize('default')
    setGenNumLogs('default')
    setGenExtraLilyPads('default')
    setGenMinMoves('default')
    setGenMaxMoves('default')
  }

  const selectSlot = (date, diff) => {
    const existing = getLevel(date, diff)
    resetGenOptionsToDefault()
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

  // Generation options - difficulty defaults
  const difficultyDefaults = {
    easy: { frogs: [1, 1], snakes: [1, 2], maxSnakeSize: 3, logs: [0, 2], extraLilyPads: [0, 1], moves: { min: 4, max: 7 } },
    medium: { frogs: [1, 2], snakes: [2, 4], maxSnakeSize: 3, logs: [1, 3], extraLilyPads: [0, 2], moves: { min: 8, max: 13 } },
    hard: { frogs: [1, 3], snakes: [3, 6], maxSnakeSize: 4, logs: [2, 5], extraLilyPads: [0, 3], moves: { min: 14, max: 20 } },
    expert: { frogs: [2, 3], snakes: [5, 8], maxSnakeSize: 4, logs: [3, 6], extraLilyPads: [1, 3], moves: { min: 45, max: 60 } }
  }

  // "default" means use difficulty-based range, otherwise it's a specific number
  const [genNumFrogs, setGenNumFrogs] = useState('default')
  const [genNumSnakes, setGenNumSnakes] = useState('default')
  const [genMaxSnakeSize, setGenMaxSnakeSize] = useState('default')
  const [genNumLogs, setGenNumLogs] = useState('default')
  const [genExtraLilyPads, setGenExtraLilyPads] = useState('default')
  const [genMinMoves, setGenMinMoves] = useState('default')
  const [genMaxMoves, setGenMaxMoves] = useState('default')

  // Helper to get actual value from state (resolves 'default' to difficulty-based value)
  const getGenValue = (stateValue, difficultyKey, isRange = false) => {
    if (stateValue === 'default') {
      const defaults = difficultyDefaults[difficulty]
      const value = defaults[difficultyKey]
      if (isRange && Array.isArray(value)) {
        // Return random value in range
        return value[0] + Math.floor(Math.random() * (value[1] - value[0] + 1))
      }
      return Array.isArray(value) ? value[1] : value // Use max for non-range defaults
    }
    return parseInt(stateValue)
  }

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

  // Generate a random level that's solvable in the target move range
  const generateRandomLevel = () => {
    const defaults = difficultyDefaults[difficulty]
    const minMoves = genMinMoves === 'default' ? defaults.moves.min : parseInt(genMinMoves)
    const maxMoves = genMaxMoves === 'default' ? defaults.moves.max : parseInt(genMaxMoves)
    const range = { min: minMoves, max: maxMoves }

    setGenerating(true)
    setCheckResult(null)

    // Run in setTimeout to allow UI to update
    setTimeout(() => {
      const maxAttempts = 1000
      let attempts = 0
      let found = false

      while (!found && attempts < maxAttempts) {
        attempts++

        // Use generation options from state (resolve 'default' to difficulty-based values)
        const numFrogs = getGenValue(genNumFrogs, 'frogs', true)
        const numSnakes = getGenValue(genNumSnakes, 'snakes', true)
        const numLogs = getGenValue(genNumLogs, 'logs', true)
        const extraLilyPads = getGenValue(genExtraLilyPads, 'extraLilyPads', true)
        const maxSnakeSize = getGenValue(genMaxSnakeSize, 'maxSnakeSize', false)
        const numLilyPads = numFrogs + extraLilyPads

        // Track occupied cells
        const occupied = new Set()

        const isOccupied = (col, row) => occupied.has(`${col},${row}`)
        const markOccupied = (col, row) => occupied.add(`${col},${row}`)

        // Generate frogs
        const newFrogs = []
        for (let i = 0; i < numFrogs; i++) {
          let placed = false
          for (let tries = 0; tries < 50 && !placed; tries++) {
            const col = Math.floor(Math.random() * gridSize)
            const row = Math.floor(Math.random() * gridSize)
            if (!isOccupied(col, row)) {
              newFrogs.push({ position: [col, row], color: FROG_COLORS[i] })
              markOccupied(col, row)
              placed = true
            }
          }
        }
        if (newFrogs.length !== numFrogs) continue

        // Generate snakes
        const newSnakes = []
        for (let i = 0; i < numSnakes; i++) {
          const orientation = Math.random() < 0.5 ? 'vertical' : 'horizontal'
          const length = Math.floor(Math.random() * (maxSnakeSize - 1)) + 2 // 2 to maxSnakeSize

          let placed = false
          for (let tries = 0; tries < 50 && !placed; tries++) {
            const col = Math.floor(Math.random() * (orientation === 'horizontal' ? gridSize - length + 1 : gridSize))
            const row = Math.floor(Math.random() * (orientation === 'vertical' ? gridSize - length + 1 : gridSize))

            const positions = []
            let valid = true
            for (let j = 0; j < length && valid; j++) {
              const c = orientation === 'horizontal' ? col + j : col
              const r = orientation === 'vertical' ? row + j : row
              if (isOccupied(c, r)) valid = false
              else positions.push([c, r])
            }

            if (valid && positions.length === length) {
              newSnakes.push({ positions, orientation })
              positions.forEach(([c, r]) => markOccupied(c, r))
              placed = true
            }
          }
        }

        // Generate stumps (single-cell logs)
        const newLogs = []
        for (let i = 0; i < numLogs; i++) {
          let placed = false
          for (let tries = 0; tries < 50 && !placed; tries++) {
            const col = Math.floor(Math.random() * gridSize)
            const row = Math.floor(Math.random() * gridSize)

            if (!isOccupied(col, row)) {
              newLogs.push({ positions: [[col, row]] })
              markOccupied(col, row)
              placed = true
            }
          }
        }

        // Generate lily pads (not on frogs, but can check if solution works)
        const newLilyPads = []
        for (let i = 0; i < numLilyPads; i++) {
          let placed = false
          for (let tries = 0; tries < 50 && !placed; tries++) {
            const col = Math.floor(Math.random() * gridSize)
            const row = Math.floor(Math.random() * gridSize)
            // Lily pads can't be on snakes, logs, or other lily pads
            // But they CAN be where a frog currently is (trivial start)
            // We want them NOT on frogs for a real puzzle
            const onFrog = newFrogs.some(f => f.position[0] === col && f.position[1] === row)
            const onSnake = newSnakes.some(s => s.positions.some(p => p[0] === col && p[1] === row))
            const onLog = newLogs.some(l => l.positions.some(p => p[0] === col && p[1] === row))
            const onLilyPad = newLilyPads.some(lp => lp.position[0] === col && lp.position[1] === row)

            if (!onFrog && !onSnake && !onLog && !onLilyPad) {
              newLilyPads.push({ position: [col, row] })
              placed = true
            }
          }
        }
        if (newLilyPads.length !== numLilyPads) continue

        // Test the level
        const result = solveLevel(gridSize, newFrogs, newSnakes, newLogs, newLilyPads)

        if (result.solvable && result.moves >= range.min && result.moves <= range.max) {
          // Found a valid level!
          setFrogs(newFrogs)
          setSnakes(newSnakes)
          setLogs(newLogs)
          setLilyPads(newLilyPads)
          setPar(result.moves)
          setCheckResult(result)
          found = true
        }
      }

      if (!found) {
        alert(`Could not generate a valid ${difficulty} level after ${maxAttempts} attempts. Try again or adjust grid size.`)
      }

      setGenerating(false)
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

  // Show loading state
  if (isLoading) {
    return (
      <div className="level-editor-overlay">
        <div className="level-editor-auth">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="level-editor-overlay">
        <div className="level-editor-auth">
          <h2>Level Editor</h2>
          <p>Please log in to access the level editor.</p>
          <button className="auth-btn" onClick={() => loginWithRedirect()}>Log In</button>
        </div>
      </div>
    )
  }

  // Show access denied if not authorized
  if (!isAuthorized) {
    return (
      <div className="level-editor-overlay">
        <div className="level-editor-auth">
          <h2>Access Denied</h2>
          <p>You don't have permission to access the level editor.</p>
          <a href="/" className="auth-btn">Back to Game</a>
        </div>
      </div>
    )
  }

  return (
    <div className="level-editor-overlay">
      <div className="level-editor wide">
        <div className="editor-header">
          <h2>Level Editor</h2>
          <button className="close-btn" onClick={onClose || (() => window.location.href = '/')}>X</button>
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

                  <div className="generation-options">
                    <label>Generation Options</label>
                    <div className="gen-option-row">
                      <span>Frogs:</span>
                      <select value={genNumFrogs} onChange={(e) => setGenNumFrogs(e.target.value)}>
                        <option value="default">Default ({difficultyDefaults[difficulty].frogs[0]}-{difficultyDefaults[difficulty].frogs[1]})</option>
                        {[1, 2, 3].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="gen-option-row">
                      <span>Snakes:</span>
                      <select value={genNumSnakes} onChange={(e) => setGenNumSnakes(e.target.value)}>
                        <option value="default">Default ({difficultyDefaults[difficulty].snakes[0]}-{difficultyDefaults[difficulty].snakes[1]})</option>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="gen-option-row">
                      <span>Max Snake Size:</span>
                      <select value={genMaxSnakeSize} onChange={(e) => setGenMaxSnakeSize(e.target.value)}>
                        <option value="default">Default ({difficultyDefaults[difficulty].maxSnakeSize})</option>
                        {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="gen-option-row">
                      <span>Stumps:</span>
                      <select value={genNumLogs} onChange={(e) => setGenNumLogs(e.target.value)}>
                        <option value="default">Default ({difficultyDefaults[difficulty].logs[0]}-{difficultyDefaults[difficulty].logs[1]})</option>
                        {Array.from({ length: 16 }, (_, i) => i).map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="gen-option-row">
                      <span>Extra Lily Pads:</span>
                      <select value={genExtraLilyPads} onChange={(e) => setGenExtraLilyPads(e.target.value)}>
                        <option value="default">Default ({difficultyDefaults[difficulty].extraLilyPads[0]}-{difficultyDefaults[difficulty].extraLilyPads[1]})</option>
                        {[0, 1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="gen-option-row">
                      <span>Min Moves:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder={difficultyDefaults[difficulty].moves.min}
                        value={genMinMoves === 'default' ? '' : genMinMoves}
                        onChange={(e) => setGenMinMoves(e.target.value === '' ? 'default' : e.target.value)}
                      />
                      {genMinMoves === 'default' && <span className="default-hint">({difficultyDefaults[difficulty].moves.min})</span>}
                    </div>
                    <div className="gen-option-row">
                      <span>Max Moves:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        placeholder={difficultyDefaults[difficulty].moves.max}
                        value={genMaxMoves === 'default' ? '' : genMaxMoves}
                        onChange={(e) => setGenMaxMoves(e.target.value === '' ? 'default' : e.target.value)}
                      />
                      {genMaxMoves === 'default' && <span className="default-hint">({difficultyDefaults[difficulty].moves.max})</span>}
                    </div>
                  </div>

                  <div className="action-btn-row">
                    <button
                      className="action-btn generate"
                      onClick={generateRandomLevel}
                      disabled={generating}
                    >
                      {generating ? '...' : 'Generate'}
                    </button>
                    <button
                      className="action-btn check"
                      onClick={checkLevel}
                      disabled={checking}
                    >
                      {checking ? '...' : 'Check'}
                    </button>
                    <button
                      className="action-btn try-it"
                      onClick={() => {
                        if (frogs.length === 0) {
                          alert('Please place at least one frog!')
                          return
                        }
                        if (lilyPads.length < frogs.length) {
                          alert(`Please place at least ${frogs.length} lily pad${frogs.length > 1 ? 's' : ''} (one per frog)!`)
                          return
                        }
                        setTryItHints(0)
                        setTryItMode(true)
                      }}
                      disabled={frogs.length === 0 || lilyPads.length < frogs.length}
                    >
                      Try It
                    </button>
                    <button
                      className="action-btn export"
                      onClick={saveLevel}
                      disabled={saving}
                    >
                      {saving ? '...' : 'Save'}
                    </button>
                  </div>
                  {checkResult && (
                    <div className={`check-result ${checkResult.solvable ? 'solvable' : 'unsolvable'}`}>
                      {checkResult.solvable ? (
                        <>Solvable in <strong>{checkResult.moves}</strong> move{checkResult.moves !== 1 ? 's' : ''}</>
                      ) : (
                        <>Not solvable! {checkResult.reason && <small>({checkResult.reason})</small>}</>
                      )}
                    </div>
                  )}
                  {saveError && (
                    <div className="save-error">{saveError}</div>
                  )}
                </div>
              </div>

              <div className="editor-grid-area">
                {tryItMode ? (
                  <div className="try-it-container">
                    <div className="try-it-header">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => setTryItMode(false)}
                      >
                        Edit
                      </button>
                    </div>
                    <GameBoard
                      ref={gameBoardRef}
                      initialState={{
                        frogs: frogs.map(f => ({ position: [...f.position], color: f.color })),
                        snakes: snakes.map(s => ({ positions: s.positions.map(p => [...p]), orientation: s.orientation })),
                        logs: logs.map(l => ({ positions: l.positions.map(p => [...p]) })),
                        lilyPads: lilyPads.map(lp => ({ position: [...lp.position] }))
                      }}
                      gridSize={gridSize}
                      onHintUsed={() => setTryItHints(h => h + 1)}
                      showHintButton={true}
                      showMoveCounter={true}
                      className="editor-game-board"
                    />
                  </div>
                ) : (
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
                          <VerticalSnakeSVG length={snake.positions.length} />
                        ) : (
                          <HorizontalSnakeSVG length={snake.positions.length} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
                {dateRange.map(date => {
                  // Check if this date is a Sunday (Expert day)
                  const dateObj = new Date(date + 'T12:00:00')
                  const isSunday = dateObj.getDay() === 0
                  const difficulties = isSunday ? ['easy', 'medium', 'hard', 'expert'] : ['easy', 'medium', 'hard']

                  return (
                    <div key={date} className="schedule-day">
                      <div className="schedule-date">{formatDate(date)}</div>
                      <div className="schedule-slots">
                        {difficulties.map(diff => {
                          const level = getLevel(date, diff)
                          const isSelected = isCurrentSelection(date, diff)
                          return (
                            <div
                              key={diff}
                              className={`schedule-slot ${diff} ${level ? 'filled' : 'empty'} ${isSelected ? 'selected' : ''}`}
                              onClick={() => selectSlot(date, diff)}
                            >
                              <span className="slot-difficulty">{diff === 'expert' ? 'X' : diff.charAt(0).toUpperCase()}</span>
                              {!level && <span className="slot-needed">+</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LevelEditor
