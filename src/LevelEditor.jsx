import { useState, useEffect, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import './LevelEditor.css'
import { solveLevel } from './solver.js'
import { solveGreedy, NUM_COLORS } from './colorJumpSolver.js'
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


// Campaign editor sidebar: chapter/level tree, reorder, rename, export/import, bulk generate.
function CampaignPanel({ campaign, setCampaign, selectedChapterId, selectedCampaignLevelId, setSelectedChapterId, actions, serverStatus, bulkProgress, instructions, setInstructions }) {
  const fileInputRef = useRef(null)
  const selectedChapter = campaign.chapters.find(c => c.id === selectedChapterId) || null
  const levelCount = campaign.chapters.reduce((n, c) => n + c.levels.length, 0)
  const [bulk, setBulk] = useState({
    count: 5,
    gridSize: 5,
    minMoves: 4,
    maxMoves: 8,
    numFrogs: 1,
    snakesMin: 1,
    snakesMax: 2,
    maxSnakeSize: 3,
    logsMin: 0,
    logsMax: 2,
    lilyPadsMin: 0,
    lilyPadsMax: 1,
  })
  const bulkNum = (key, min, max) => (
    <input
      type="number"
      min={min}
      max={max}
      value={bulk[key]}
      onChange={e => {
        const v = parseInt(e.target.value, 10)
        setBulk(b => ({ ...b, [key]: isNaN(v) ? b[key] : v }))
      }}
      style={{ width: 52, padding: '2px 4px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 3, color: 'white' }}
    />
  )
  const isBulkRunning = bulkProgress && bulkProgress.current < bulkProgress.total
  return (
    <div className="campaign-panel">
      <div className="editor-section">
        <label>Campaign name</label>
        <input
          type="text"
          value={campaign.name}
          onChange={e => setCampaign(c => ({ ...c, name: e.target.value }))}
          style={{ width: '100%', padding: '6px 8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: 'white' }}
        />
        <div style={{ marginTop: 6, fontSize: '0.85em', opacity: 0.7 }}>
          {campaign.chapters.length} chapters, {levelCount} levels
        </div>
      </div>

      <div className="editor-section">
        <div className="action-btn-row">
          <button
            className="action-btn export"
            onClick={actions.saveToServer}
            disabled={levelCount === 0 || serverStatus?.kind === 'saving'}
          >
            {serverStatus?.kind === 'saving' ? 'Saving...' : serverStatus?.kind === 'saved' ? 'Saved ✓' : 'Save to Server'}
          </button>
          <button className="action-btn" onClick={actions.loadFromServer}>Load from Server</button>
        </div>
        {serverStatus?.kind === 'error' && (
          <div className="save-error" style={{ marginTop: 6 }}>{serverStatus.message}</div>
        )}
        <div className="action-btn-row" style={{ marginTop: 8 }}>
          <button className="action-btn" onClick={actions.exportJSON} disabled={levelCount === 0}>Export JSON</button>
          <button className="action-btn" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) actions.importJSON(f)
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="editor-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={{ margin: 0 }}>Chapters</label>
          <button className="tool-btn" onClick={actions.addChapter}>+ Chapter</button>
        </div>
        {campaign.chapters.length === 0 && (
          <div style={{ opacity: 0.6, fontSize: '0.9em', padding: '8px 0' }}>No chapters yet. Add one to get started.</div>
        )}
        {campaign.chapters.map((chapter, chIdx) => {
          const isSelected = chapter.id === selectedChapterId
          return (
            <div key={chapter.id} className={`campaign-chapter ${isSelected ? 'selected' : ''}`} style={{
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 4,
              marginBottom: 8,
              padding: 6,
              background: isSelected ? 'rgba(253,224,71,0.08)' : 'transparent',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  className="tool-btn"
                  style={{ flex: 1, textAlign: 'left' }}
                  onClick={() => setSelectedChapterId(chapter.id)}
                >
                  {chapter.name} <span style={{ opacity: 0.6 }}>({chapter.levels.length})</span>
                </button>
                <button className="tool-btn" title="Rename" onClick={() => actions.renameChapter(chapter.id)}>✎</button>
                <button className="tool-btn" title="Move up" disabled={chIdx === 0} onClick={() => actions.moveChapter(chapter.id, -1)}>↑</button>
                <button className="tool-btn" title="Move down" disabled={chIdx === campaign.chapters.length - 1} onClick={() => actions.moveChapter(chapter.id, 1)}>↓</button>
                <button className="tool-btn" title="Delete" onClick={() => actions.deleteChapter(chapter.id)}>✕</button>
              </div>

              {isSelected && (
                <div style={{ marginTop: 8, paddingLeft: 8, borderLeft: '2px solid rgba(253,224,71,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 4 }}>
                    <span style={{ fontSize: '0.85em', opacity: 0.7 }}>Levels</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="tool-btn" onClick={() => actions.addBlankLevel(chapter.id)} title="Add a new empty level">
                        + Blank
                      </button>
                      <button className="tool-btn" onClick={() => actions.addLevel(chapter.id)} title="Add current canvas as new level">
                        + From Canvas
                      </button>
                    </div>
                  </div>
                  {chapter.levels.length === 0 && (
                    <div style={{ opacity: 0.6, fontSize: '0.85em' }}>No levels. Click “+ Blank” for an empty level, or build a puzzle and use “+ From Canvas”.</div>
                  )}
                  {chapter.levels.map((level, lvIdx) => {
                    const isLevelSelected = level.id === selectedCampaignLevelId
                    return (
                      <div key={level.id} style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
                        <button
                          className={`tool-btn ${isLevelSelected ? 'active' : ''}`}
                          style={{ flex: 1, textAlign: 'left', fontSize: '0.9em' }}
                          onClick={() => actions.selectLevel(chapter.id, level.id)}
                        >
                          {lvIdx + 1}. {level.name} <span style={{ opacity: 0.6 }}>par {level.par}</span>
                        </button>
                        <button className="tool-btn" title="Rename" onClick={() => actions.renameLevel(chapter.id, level.id)}>✎</button>
                        <button className="tool-btn" title="Move up" disabled={lvIdx === 0} onClick={() => actions.moveLevel(chapter.id, level.id, -1)}>↑</button>
                        <button className="tool-btn" title="Move down" disabled={lvIdx === chapter.levels.length - 1} onClick={() => actions.moveLevel(chapter.id, level.id, 1)}>↓</button>
                        <button className="tool-btn" title="Delete" onClick={() => actions.deleteLevel(chapter.id, level.id)}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedCampaignLevelId && (
        <div className="editor-section">
          <label style={{ display: 'block', marginBottom: 4 }}>Instructions (optional)</label>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            rows={3}
            placeholder="e.g. Tap a frog to select it, then tap a target to jump."
            style={{ width: '100%', padding: '6px 8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: 'white', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9em' }}
          />
          <button className="action-btn generate" onClick={actions.saveSelected} style={{ width: '100%', marginTop: 8 }}>
            Save canvas to selected level
          </button>
          <div style={{ marginTop: 4, fontSize: '0.8em', opacity: 0.6 }}>
            Edits on the canvas are kept separate until you save.
          </div>
        </div>
      )}

      {selectedChapter && (
        <div className="editor-section">
          <label style={{ fontWeight: 'bold' }}>Bulk generate into “{selectedChapter.name}”</label>
          <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'auto 1fr', rowGap: 6, columnGap: 8, alignItems: 'center', fontSize: '0.9em' }}>
            <span>Count</span>
            <span>{bulkNum('count', 1, 50)}</span>

            <span>Grid size</span>
            <span>{bulkNum('gridSize', 4, 9)}</span>

            <span>Moves</span>
            <span>{bulkNum('minMoves', 1, 200)} – {bulkNum('maxMoves', 1, 200)}</span>

            <span>Frogs</span>
            <span>{bulkNum('numFrogs', 1, 3)}</span>

            <span>Snakes</span>
            <span>{bulkNum('snakesMin', 0, 20)} – {bulkNum('snakesMax', 0, 20)}</span>

            <span>Max snake size</span>
            <span>{bulkNum('maxSnakeSize', 2, 5)}</span>

            <span>Stumps</span>
            <span>{bulkNum('logsMin', 0, 20)} – {bulkNum('logsMax', 0, 20)}</span>

            <span>Extra lilies</span>
            <span>{bulkNum('lilyPadsMin', 0, 10)} – {bulkNum('lilyPadsMax', 0, 10)}</span>
          </div>
          <button
            className="action-btn generate"
            style={{ width: '100%', marginTop: 8 }}
            disabled={isBulkRunning}
            onClick={() => actions.bulkGenerate(selectedChapterId, bulk, bulk.count)}
          >
            {isBulkRunning ? `Generating ${bulkProgress.current}/${bulkProgress.total}...` : `Generate ${bulk.count} levels`}
          </button>
          {bulkProgress && !isBulkRunning && (
            <div style={{ marginTop: 6, fontSize: '0.85em', opacity: 0.8 }}>
              Done: {bulkProgress.total - bulkProgress.failed} added
              {bulkProgress.failed > 0 && `, ${bulkProgress.failed} failed (try widening ranges or raising max moves)`}
            </div>
          )}
          {isBulkRunning && bulkProgress.failed > 0 && (
            <div style={{ marginTop: 6, fontSize: '0.85em', opacity: 0.7 }}>
              {bulkProgress.failed} failed so far
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const LevelEditor = ({ onClose, existingLevel = null, onSave }) => {
  const { user, isAuthenticated, isLoading, loginWithRedirect } = useAuth0()

  // Check authorization
  const isAuthorized = isAuthenticated && user?.email && ALLOWED_EMAILS.includes(user.email)

  const [editorGame, setEditorGame] = useState('jf') // 'jf' or 'cj'
  const [gridSize, setGridSize] = useState(existingLevel?.gridSize || 5)
  const [difficulty, setDifficulty] = useState(existingLevel?.difficulty || 'easy')
  const [par, setPar] = useState(existingLevel?.par || 3)
  const [levelDate, setLevelDate] = useState(existingLevel?.date || getLocalDateString(new Date()))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [checkResult, setCheckResult] = useState(null)
  const [checking, setChecking] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [autoFilling, setAutoFilling] = useState(false)
  const [autoFillDays, setAutoFillDays] = useState(7)
  const [autoFillProgress, setAutoFillProgress] = useState(null) // { current, total, currentSlot }
  // Color Jump editor state
  const [cjGrid, setCjGrid] = useState(null)
  const [cjPar, setCjPar] = useState(null)
  const [cjGenerating, setCjGenerating] = useState(false)
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
  const [allCJLevels, setAllCJLevels] = useState([])
  const [loadingLevels, setLoadingLevels] = useState(true)
  const dateRange = generateDateRange()

  // ---------- Campaign editor state ----------
  // Campaign data lives in localStorage while editing. Shape:
  //   { name, chapters: [{ id, name, levels: [{ id, name, gridSize, frogs, snakes, logs, lilyPads, par }] }] }
  const CAMPAIGN_KEY = 'jf_campaign_v1'
  const newCampaignId = () => `c_${Math.random().toString(36).slice(2, 10)}`
  const [campaign, setCampaign] = useState(() => {
    try {
      const raw = localStorage.getItem(CAMPAIGN_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (!parsed.id) parsed.id = newCampaignId()
        return parsed
      }
    } catch {}
    return { id: newCampaignId(), name: 'Untitled Campaign', chapters: [] }
  })
  const [selectedChapterId, setSelectedChapterId] = useState(null)
  const [selectedCampaignLevelId, setSelectedCampaignLevelId] = useState(null)
  const [campaignServerStatus, setCampaignServerStatus] = useState(null) // { kind: 'saving'|'saved'|'error', message?: string }
  const [campaignBulkProgress, setCampaignBulkProgress] = useState(null) // { current, total, failed } | null
  // Instructions are optional per-level text shown alongside the puzzle.
  // Edited as canvas state and committed via "Save canvas to selected level".
  const [instructions, setInstructions] = useState('')
  useEffect(() => {
    try { localStorage.setItem(CAMPAIGN_KEY, JSON.stringify(campaign)) } catch {}
  }, [campaign])

  const uid = () => Math.random().toString(36).slice(2, 10)
  const currentPuzzleData = () => ({ gridSize, frogs, snakes, logs, lilyPads, par, instructions })
  const loadPuzzleIntoCanvas = (p) => {
    setGridSize(p.gridSize || 5)
    setFrogs(p.frogs || [])
    setSnakes(p.snakes || [])
    setLogs(p.logs || [])
    setLilyPads(p.lilyPads || [])
    setPar(p.par || 0)
    setInstructions(p.instructions || '')
  }

  const campaignAddChapter = () => {
    const name = prompt('Chapter name?', `Chapter ${campaign.chapters.length + 1}`)
    if (!name) return
    const chapter = { id: uid(), name, levels: [] }
    setCampaign(c => ({ ...c, chapters: [...c.chapters, chapter] }))
    setSelectedChapterId(chapter.id)
  }
  const campaignRenameChapter = (id) => {
    const chapter = campaign.chapters.find(ch => ch.id === id)
    const name = prompt('New name?', chapter?.name || '')
    if (!name) return
    setCampaign(c => ({ ...c, chapters: c.chapters.map(ch => ch.id === id ? { ...ch, name } : ch) }))
  }
  const campaignDeleteChapter = (id) => {
    if (!confirm('Delete this chapter and all its levels?')) return
    setCampaign(c => ({ ...c, chapters: c.chapters.filter(ch => ch.id !== id) }))
    if (selectedChapterId === id) { setSelectedChapterId(null); setSelectedCampaignLevelId(null) }
  }
  const campaignMoveChapter = (id, dir) => {
    setCampaign(c => {
      const chs = [...c.chapters]
      const i = chs.findIndex(ch => ch.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= chs.length) return c
      ;[chs[i], chs[j]] = [chs[j], chs[i]]
      return { ...c, chapters: chs }
    })
  }
  const campaignAddLevel = (chapterId) => {
    const chapter = campaign.chapters.find(ch => ch.id === chapterId)
    if (!chapter) return
    const level = {
      id: uid(),
      name: `Level ${chapter.levels.length + 1}`,
      ...currentPuzzleData(),
    }
    setCampaign(c => ({
      ...c,
      chapters: c.chapters.map(ch => ch.id === chapterId ? { ...ch, levels: [...ch.levels, level] } : ch),
    }))
    setSelectedChapterId(chapterId)
    setSelectedCampaignLevelId(level.id)
  }
  const campaignAddBlankLevel = (chapterId) => {
    const chapter = campaign.chapters.find(ch => ch.id === chapterId)
    if (!chapter) return
    const blank = {
      gridSize: 5,
      frogs: [],
      snakes: [],
      logs: [],
      lilyPads: [],
      par: 0,
      instructions: '',
    }
    const level = {
      id: uid(),
      name: `Level ${chapter.levels.length + 1}`,
      ...blank,
    }
    setCampaign(c => ({
      ...c,
      chapters: c.chapters.map(ch => ch.id === chapterId ? { ...ch, levels: [...ch.levels, level] } : ch),
    }))
    setSelectedChapterId(chapterId)
    setSelectedCampaignLevelId(level.id)
    loadPuzzleIntoCanvas(blank)
  }
  const campaignSaveSelected = () => {
    if (!selectedChapterId || !selectedCampaignLevelId) return
    setCampaign(c => ({
      ...c,
      chapters: c.chapters.map(ch => ch.id !== selectedChapterId ? ch : {
        ...ch,
        levels: ch.levels.map(lv => lv.id !== selectedCampaignLevelId ? lv : { ...lv, ...currentPuzzleData() }),
      }),
    }))
  }
  const campaignSelectLevel = (chapterId, levelId) => {
    const chapter = campaign.chapters.find(ch => ch.id === chapterId)
    const level = chapter?.levels.find(lv => lv.id === levelId)
    if (!level) return
    setSelectedChapterId(chapterId)
    setSelectedCampaignLevelId(levelId)
    loadPuzzleIntoCanvas(level)
  }
  const campaignRenameLevel = (chapterId, levelId) => {
    const chapter = campaign.chapters.find(ch => ch.id === chapterId)
    const level = chapter?.levels.find(lv => lv.id === levelId)
    const name = prompt('Level name?', level?.name || '')
    if (!name) return
    setCampaign(c => ({
      ...c,
      chapters: c.chapters.map(ch => ch.id !== chapterId ? ch : {
        ...ch,
        levels: ch.levels.map(lv => lv.id !== levelId ? lv : { ...lv, name }),
      }),
    }))
  }
  const campaignDeleteLevel = (chapterId, levelId) => {
    if (!confirm('Delete this level?')) return
    setCampaign(c => ({
      ...c,
      chapters: c.chapters.map(ch => ch.id !== chapterId ? ch : {
        ...ch,
        levels: ch.levels.filter(lv => lv.id !== levelId),
      }),
    }))
    if (selectedCampaignLevelId === levelId) setSelectedCampaignLevelId(null)
  }
  const campaignMoveLevel = (chapterId, levelId, dir) => {
    setCampaign(c => ({
      ...c,
      chapters: c.chapters.map(ch => {
        if (ch.id !== chapterId) return ch
        const lvls = [...ch.levels]
        const i = lvls.findIndex(lv => lv.id === levelId)
        const j = i + dir
        if (i < 0 || j < 0 || j >= lvls.length) return ch
        ;[lvls[i], lvls[j]] = [lvls[j], lvls[i]]
        return { ...ch, levels: lvls }
      }),
    }))
  }
  const campaignExport = () => {
    // Strip editor-only ids for shipping, keep stable ordering.
    const shipped = {
      name: campaign.name,
      chapters: campaign.chapters.map(ch => ({
        name: ch.name,
        levels: ch.levels.map(lv => ({
          name: lv.name,
          ...(lv.instructions ? { instructions: lv.instructions } : {}),
          gridSize: lv.gridSize,
          frogs: lv.frogs,
          snakes: lv.snakes,
          logs: lv.logs,
          lilyPads: lv.lilyPads,
          par: lv.par,
        })),
      })),
    }
    const json = JSON.stringify(shipped, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${(campaign.name || 'campaign').replace(/\s+/g, '_')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const campaignImport = async (file) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      // Re-hydrate editor ids so we can select levels.
      const rehydrated = {
        id: parsed.id || newCampaignId(),
        name: parsed.name || 'Imported Campaign',
        chapters: (parsed.chapters || []).map(ch => ({
          id: uid(),
          name: ch.name,
          levels: (ch.levels || []).map(lv => ({ id: uid(), ...lv })),
        })),
      }
      setCampaign(rehydrated)
      setSelectedChapterId(null)
      setSelectedCampaignLevelId(null)
    } catch (err) {
      alert('Failed to import: ' + err.message)
    }
  }
  const campaignSaveToServer = async () => {
    const payload = {
      name: campaign.name,
      chapters: campaign.chapters.map(ch => ({
        name: ch.name,
        levels: ch.levels.map(lv => ({
          name: lv.name,
          ...(lv.instructions ? { instructions: lv.instructions } : {}),
          gridSize: lv.gridSize,
          frogs: lv.frogs,
          snakes: lv.snakes,
          logs: lv.logs,
          lilyPads: lv.lilyPads,
          par: lv.par,
        })),
      })),
    }
    setCampaignServerStatus({ kind: 'saving' })
    try {
      const res = await fetch(`${API_BASE}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: campaign.id, campaign: payload }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      setCampaignServerStatus({ kind: 'saved' })
      setTimeout(() => setCampaignServerStatus(null), 2500)
    } catch (err) {
      setCampaignServerStatus({ kind: 'error', message: err.message })
    }
  }
  const campaignLoadFromServer = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/campaigns`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const list = await res.json()
      if (!list.length) {
        alert('No campaigns on the server yet.')
        return
      }
      const options = list.map((c, i) => `${i + 1}. ${c.name} (${c.chapterCount} ch, ${c.levelCount} lv)`).join('\n')
      const pick = prompt(`Load which campaign?\n\n${options}\n\nEnter number:`)
      if (!pick) return
      const idx = parseInt(pick, 10) - 1
      if (isNaN(idx) || idx < 0 || idx >= list.length) {
        alert('Invalid selection.')
        return
      }
      const chosen = list[idx]
      const fullRes = await fetch(`${API_BASE}/api/campaigns?id=${encodeURIComponent(chosen.id)}`)
      if (!fullRes.ok) throw new Error(`HTTP ${fullRes.status}`)
      const data = await fullRes.json()
      setCampaign({
        id: chosen.id,
        name: data.name || chosen.name,
        chapters: (data.chapters || []).map(ch => ({
          id: uid(),
          name: ch.name,
          levels: (ch.levels || []).map(lv => ({ id: uid(), ...lv })),
        })),
      })
      setSelectedChapterId(null)
      setSelectedCampaignLevelId(null)
    } catch (err) {
      alert('Failed to load: ' + err.message)
    }
  }

  // Bulk-generate `count` levels matching `criteria` and append to the chapter.
  // Each attempted level may fail (no solvable board found) — we track failed count.
  const campaignBulkGenerate = async (chapterId, criteria, count) => {
    if (!chapterId || !count || count < 1) return
    if (criteria.minMoves > criteria.maxMoves) {
      alert('Min moves must be ≤ max moves.')
      return
    }
    if (criteria.snakesMin > criteria.snakesMax || criteria.logsMin > criteria.logsMax || criteria.lilyPadsMin > criteria.lilyPadsMax) {
      alert('Range min must be ≤ max for snakes, stumps, and lily pads.')
      return
    }
    setCampaignBulkProgress({ current: 0, total: count, failed: 0 })
    let failed = 0
    for (let i = 0; i < count; i++) {
      setCampaignBulkProgress({ current: i, total: count, failed })
      // Yield so UI can paint progress between (potentially slow) solver runs.
      await new Promise(r => setTimeout(r, 10))
      const level = generateLevelWithCriteria(criteria)
      if (!level) {
        failed++
        continue
      }
      setCampaign(c => ({
        ...c,
        chapters: c.chapters.map(ch => {
          if (ch.id !== chapterId) return ch
          const name = `Level ${ch.levels.length + 1}`
          return { ...ch, levels: [...ch.levels, { id: uid(), name, ...level }] }
        }),
      }))
    }
    setCampaignBulkProgress({ current: count, total: count, failed })
    setTimeout(() => setCampaignBulkProgress(null), 4000)
  }

  // CJ difficulty grid sizes
  const CJ_GRID_SIZES = { easy: 5, medium: 8, hard: 15, expert: 20 }

  // Fetch all levels on mount
  useEffect(() => {
    fetchAllLevels()
  }, [])

  const fetchAllLevels = async () => {
    setLoadingLevels(true)
    try {
      const [jfRes, cjRes] = await Promise.all([
        fetch(`${API_BASE}/api/levels?all=true`),
        fetch(`${API_BASE}/api/levels?all=true&game=cj`),
      ])
      if (jfRes.ok) {
        const all = await jfRes.json()
        setAllLevels(all.filter(l => !l.grid)) // Exclude CJ levels by structure
      }
      if (cjRes.ok) {
        const all = await cjRes.json()
        setAllCJLevels(all.filter(l => Array.isArray(l.grid))) // Only CJ levels
      }
    } catch (err) {
      console.error('Error fetching levels:', err)
    }
    setLoadingLevels(false)
  }

  // Get level for a specific date and difficulty (respects current game mode)
  const getLevel = (date, diff, game) => {
    const levels = (game || editorGame) === 'cj' ? allCJLevels : allLevels
    return levels.find(l => l.date === date && l.difficulty === diff)
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
    if (editorGame === 'cj') {
      setLevelDate(date)
      setDifficulty(diff)
      if (existing) {
        setCjGrid(existing.grid)
        setCjPar(existing.par)
      } else {
        setCjGrid(null)
        setCjPar(null)
      }
    } else if (existing) {
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
    expert: { frogs: [2, 3], snakes: [3, 5], maxSnakeSize: 3, logs: [2, 5], extraLilyPads: [1, 3], moves: { min: 40, max: 60 } }
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

    // Pre-flight sanity check: a frog needs something (another frog, a snake,
    // or a log) adjacent to jump over. If the caller has forced every
    // jumpable category to 0, generation is mathematically impossible.
    const forcedNumFrogs = genNumFrogs === 'default' ? null : parseInt(genNumFrogs)
    const forcedNumSnakes = genNumSnakes === 'default' ? null : parseInt(genNumSnakes)
    const forcedNumLogs = genNumLogs === 'default' ? null : parseInt(genNumLogs)
    if (forcedNumSnakes === 0 && forcedNumLogs === 0 && (forcedNumFrogs ?? 2) < 2) {
      setGenerating(false)
      alert('With 0 snakes and 0 stumps, you need at least 2 frogs so they can jump over each other. Increase one of them and try again.')
      return
    }

    // Run in setTimeout to allow UI to update
    setTimeout(() => {
      const isExpertGen = difficulty === 'expert'
      const maxAttempts = isExpertGen ? 2000 : 1000
      let attempts = 0
      let found = false

      while (!found && attempts < maxAttempts) {
        attempts++

        // Use generation options from state (resolve 'default' to difficulty-based values)
        const numFrogs = getGenValue(genNumFrogs, 'frogs', true)
        let numSnakes = getGenValue(genNumSnakes, 'snakes', true)
        let numLogs = getGenValue(genNumLogs, 'logs', true)
        const extraLilyPads = getGenValue(genExtraLilyPads, 'extraLilyPads', true)
        const maxSnakeSize = getGenValue(genMaxSnakeSize, 'maxSnakeSize', false)

        // If the player explicitly removed all snakes, make sure there are
        // enough stumps for the frog to hop across — at least ceil(minMoves/2)
        // stepping-stones, floored at 2 so there's real choice on the board.
        // Only nudges the "default" range; an explicit user choice is respected.
        if (forcedNumSnakes === 0 && forcedNumLogs === null && (numFrogs < 2)) {
          const floor = Math.max(2, Math.ceil(range.min / 2))
          if (numLogs < floor) numLogs = floor
        }

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

        // For expert: quick reject boards solvable in too few moves, then full solve promising ones
        const isExpert = difficulty === 'expert'
        if (isExpert) {
          // Quick check: can it be solved in fewer than minMoves? If so, skip.
          const quickResult = solveLevel(gridSize, newFrogs, newSnakes, newLogs, newLilyPads, { trackPath: false, maxIterations: 100000 })
          if (quickResult.solvable && quickResult.moves < range.min) continue
          // If quick check found no easy solution, do full solve with higher limit
          const result = solveLevel(gridSize, newFrogs, newSnakes, newLogs, newLilyPads, { trackPath: false, maxIterations: 2000000 })
          if (result.solvable && result.moves >= range.min && result.moves <= range.max) {
            const fullResult = solveLevel(gridSize, newFrogs, newSnakes, newLogs, newLilyPads, { maxIterations: 2000000 })
            setFrogs(newFrogs)
            setSnakes(newSnakes)
            setLogs(newLogs)
            setLilyPads(newLilyPads)
            setPar(fullResult.moves)
            setCheckResult(fullResult)
            found = true
          }
        } else {
          const result = solveLevel(gridSize, newFrogs, newSnakes, newLogs, newLilyPads, { trackPath: false })
          if (result.solvable && result.moves >= range.min && result.moves <= range.max) {
            const fullResult = solveLevel(gridSize, newFrogs, newSnakes, newLogs, newLilyPads)
            setFrogs(newFrogs)
            setSnakes(newSnakes)
            setLogs(newLogs)
            setLilyPads(newLilyPads)
            setPar(fullResult.moves)
            setCheckResult(fullResult)
            found = true
          }
        }
      }

      if (!found) {
        alert(`Could not generate a valid ${difficulty} level after ${maxAttempts} attempts. Try again or adjust grid size.`)
      }

      setGenerating(false)
    }, 10)
  }

  const saveLevel = async () => {
    if (editorGame === 'jf') {
      if (frogs.length === 0) {
        alert('Please place at least one frog!')
        return
      }
      if (lilyPads.length < frogs.length) {
        alert(`Please place at least ${frogs.length} lily pad${frogs.length > 1 ? 's' : ''} (one per frog)!`)
        return
      }
    }

    setSaving(true)
    setSaveError(null)

    const levelData = editorGame === 'cj'
      ? { difficulty, date: levelDate, grid: cjGrid, gridSize: CJ_GRID_SIZES[difficulty], par: cjPar }
      : {
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
      const body = {
        date: levelDate,
        difficulty,
        level: levelData
      }
      if (editorGame === 'cj') body.game = 'cj'
      const response = await fetch(`${API_BASE}/api/levels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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

  // Generate a level for a specific difficulty without using React state
  const generateLevelForDifficulty = (diff, size) => {
    const defaults = difficultyDefaults[diff]
    const minMoves = defaults.moves.min
    const maxMoves = defaults.moves.max
    const range = { min: minMoves, max: maxMoves }

    const maxAttempts = 1000
    let attempts = 0

    while (attempts < maxAttempts) {
      attempts++

      const numFrogs = defaults.frogs[0] + Math.floor(Math.random() * (defaults.frogs[1] - defaults.frogs[0] + 1))
      const numSnakes = defaults.snakes[0] + Math.floor(Math.random() * (defaults.snakes[1] - defaults.snakes[0] + 1))
      const numLogs = defaults.logs[0] + Math.floor(Math.random() * (defaults.logs[1] - defaults.logs[0] + 1))
      const extraLilyPads = defaults.extraLilyPads[0] + Math.floor(Math.random() * (defaults.extraLilyPads[1] - defaults.extraLilyPads[0] + 1))
      const maxSnakeSize = defaults.maxSnakeSize
      const numLilyPads = numFrogs + extraLilyPads

      const occupied = new Set()
      const isOccupied = (col, row) => occupied.has(`${col},${row}`)
      const markOccupied = (col, row) => occupied.add(`${col},${row}`)

      const newFrogs = []
      for (let i = 0; i < numFrogs; i++) {
        let placed = false
        for (let tries = 0; tries < 50 && !placed; tries++) {
          const col = Math.floor(Math.random() * size)
          const row = Math.floor(Math.random() * size)
          if (!isOccupied(col, row)) {
            newFrogs.push({ position: [col, row], color: FROG_COLORS[i] })
            markOccupied(col, row)
            placed = true
          }
        }
      }
      if (newFrogs.length !== numFrogs) continue

      const newSnakes = []
      for (let i = 0; i < numSnakes; i++) {
        const orientation = Math.random() < 0.5 ? 'vertical' : 'horizontal'
        const length = Math.floor(Math.random() * (maxSnakeSize - 1)) + 2
        let placed = false
        for (let tries = 0; tries < 50 && !placed; tries++) {
          const col = Math.floor(Math.random() * (orientation === 'horizontal' ? size - length + 1 : size))
          const row = Math.floor(Math.random() * (orientation === 'vertical' ? size - length + 1 : size))
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

      const newLogs = []
      for (let i = 0; i < numLogs; i++) {
        let placed = false
        for (let tries = 0; tries < 50 && !placed; tries++) {
          const col = Math.floor(Math.random() * size)
          const row = Math.floor(Math.random() * size)
          if (!isOccupied(col, row)) {
            newLogs.push({ positions: [[col, row]] })
            markOccupied(col, row)
            placed = true
          }
        }
      }

      const newLilyPads = []
      for (let i = 0; i < numLilyPads; i++) {
        let placed = false
        for (let tries = 0; tries < 50 && !placed; tries++) {
          const col = Math.floor(Math.random() * size)
          const row = Math.floor(Math.random() * size)
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

      const isExpert = diff === 'expert'
      if (isExpert) {
        // Quick reject boards solvable in too few moves
        const quickResult = solveLevel(size, newFrogs, newSnakes, newLogs, newLilyPads, { trackPath: false, maxIterations: 100000 })
        if (quickResult.solvable && quickResult.moves < range.min) continue
        // Full solve with higher limit for promising boards
        const result = solveLevel(size, newFrogs, newSnakes, newLogs, newLilyPads, { trackPath: false, maxIterations: 2000000 })
        if (result.solvable && result.moves >= range.min && result.moves <= range.max) {
          return {
            gridSize: size,
            frogs: newFrogs,
            snakes: newSnakes,
            logs: newLogs,
            lilyPads: newLilyPads,
            par: result.moves
          }
        }
      } else {
        const result = solveLevel(size, newFrogs, newSnakes, newLogs, newLilyPads, { trackPath: false })
        if (result.solvable && result.moves >= range.min && result.moves <= range.max) {
          return {
            gridSize: size,
            frogs: newFrogs,
            snakes: newSnakes,
            logs: newLogs,
            lilyPads: newLilyPads,
            par: result.moves
          }
        }
      }
    }
    return null
  }

  // Generate one level from explicit criteria. Used by campaign bulk generate.
  // Ranges are inclusive. Returns { gridSize, frogs, snakes, logs, lilyPads, par } or null.
  const generateLevelWithCriteria = ({
    gridSize: size,
    minMoves,
    maxMoves,
    numFrogs,
    snakesMin, snakesMax,
    maxSnakeSize,
    logsMin, logsMax,
    lilyPadsMin, lilyPadsMax,
  }) => {
    const range = { min: minMoves, max: maxMoves }
    const isHardSolve = maxMoves >= 20
    const maxAttempts = isHardSolve ? 2000 : 1000
    const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))

    for (let attempts = 0; attempts < maxAttempts; attempts++) {
      const numSnakes = rand(snakesMin, snakesMax)
      const numLogs = rand(logsMin, logsMax)
      const extraLilyPads = rand(lilyPadsMin, lilyPadsMax)
      const numLilyPads = numFrogs + extraLilyPads

      const occupied = new Set()
      const isOccupied = (col, row) => occupied.has(`${col},${row}`)
      const markOccupied = (col, row) => occupied.add(`${col},${row}`)

      const newFrogs = []
      for (let i = 0; i < numFrogs; i++) {
        let placed = false
        for (let tries = 0; tries < 50 && !placed; tries++) {
          const col = Math.floor(Math.random() * size)
          const row = Math.floor(Math.random() * size)
          if (!isOccupied(col, row)) {
            newFrogs.push({ position: [col, row], color: FROG_COLORS[i] })
            markOccupied(col, row)
            placed = true
          }
        }
      }
      if (newFrogs.length !== numFrogs) continue

      const newSnakes = []
      for (let i = 0; i < numSnakes; i++) {
        const orientation = Math.random() < 0.5 ? 'vertical' : 'horizontal'
        const length = Math.floor(Math.random() * (maxSnakeSize - 1)) + 2
        let placed = false
        for (let tries = 0; tries < 50 && !placed; tries++) {
          const col = Math.floor(Math.random() * (orientation === 'horizontal' ? size - length + 1 : size))
          const row = Math.floor(Math.random() * (orientation === 'vertical' ? size - length + 1 : size))
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

      const newLogs = []
      for (let i = 0; i < numLogs; i++) {
        let placed = false
        for (let tries = 0; tries < 50 && !placed; tries++) {
          const col = Math.floor(Math.random() * size)
          const row = Math.floor(Math.random() * size)
          if (!isOccupied(col, row)) {
            newLogs.push({ positions: [[col, row]] })
            markOccupied(col, row)
            placed = true
          }
        }
      }

      const newLilyPads = []
      for (let i = 0; i < numLilyPads; i++) {
        let placed = false
        for (let tries = 0; tries < 50 && !placed; tries++) {
          const col = Math.floor(Math.random() * size)
          const row = Math.floor(Math.random() * size)
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

      if (isHardSolve) {
        const quick = solveLevel(size, newFrogs, newSnakes, newLogs, newLilyPads, { trackPath: false, maxIterations: 100000 })
        if (quick.solvable && quick.moves < range.min) continue
        const result = solveLevel(size, newFrogs, newSnakes, newLogs, newLilyPads, { trackPath: false, maxIterations: 2000000 })
        if (result.solvable && result.moves >= range.min && result.moves <= range.max) {
          return { gridSize: size, frogs: newFrogs, snakes: newSnakes, logs: newLogs, lilyPads: newLilyPads, par: result.moves }
        }
      } else {
        const result = solveLevel(size, newFrogs, newSnakes, newLogs, newLilyPads, { trackPath: false })
        if (result.solvable && result.moves >= range.min && result.moves <= range.max) {
          return { gridSize: size, frogs: newFrogs, snakes: newSnakes, logs: newLogs, lilyPads: newLilyPads, par: result.moves }
        }
      }
    }
    return null
  }

  // Generate a Color Jump level for a specific difficulty
  const generateCJLevel = (diff) => {
    const gs = CJ_GRID_SIZES[diff]
    const totalCells = gs * gs
    const maxAttempts = 50

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const grid = Array.from({ length: totalCells }, () => Math.floor(Math.random() * NUM_COLORS))
      const par = solveGreedy(grid, gs)
      if (par !== null && par >= 3) {
        return { grid, gridSize: gs, par }
      }
    }
    return null
  }

  // Auto-fill: generate and save E, M, H levels for the next X days
  const autoFillLevels = async () => {
    const days = autoFillDays
    if (days < 1 || days > 30) {
      alert('Please enter a number of days between 1 and 30.')
      return
    }

    const isCJ = editorGame === 'cj'
    const getDiffsForDate = (date) => {
      const isSunday = date.getDay() === 0
      return isSunday ? ['easy', 'medium', 'hard', 'expert'] : ['easy', 'medium', 'hard']
    }

    // Find the first unfilled date, then fill X days from there
    const today = new Date()
    let startDate = null
    for (let d = 0; d < 365; d++) {
      const date = new Date(today)
      date.setDate(today.getDate() + d)
      const dateStr = getLocalDateString(date)
      const diffs = getDiffsForDate(date)
      if (diffs.some(diff => !getLevel(dateStr, diff))) {
        startDate = date
        break
      }
    }

    if (!startDate) {
      alert('All slots are filled for the foreseeable future!')
      return
    }

    // Build list of slots to fill starting from the first unfilled date
    const slots = []
    let daysCollected = 0
    let d = 0
    while (daysCollected < days) {
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + d)
      d++
      const dateStr = getLocalDateString(date)
      const diffs = getDiffsForDate(date)
      for (const diff of diffs) {
        if (!getLevel(dateStr, diff)) {
          slots.push({ date: dateStr, difficulty: diff })
        }
      }
      daysCollected++
    }

    if (slots.length === 0) {
      alert('All slots are already filled!')
      return
    }

    const startStr = getLocalDateString(startDate)
    const endDate = new Date(startDate)
    endDate.setDate(startDate.getDate() + days - 1)
    const endStr = getLocalDateString(endDate)
    const gameLabel = isCJ ? 'Color Jump' : 'Jumping Frogs'
    if (!confirm(`Generate and save ${slots.length} ${gameLabel} levels from ${startStr} to ${endStr}? This may take a while.`)) {
      return
    }

    setAutoFilling(true)
    setAutoFillProgress({ current: 0, total: slots.length, currentSlot: '' })

    let filled = 0
    let failed = 0

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i]
      const diffLabel = slot.difficulty === 'expert' ? 'X' : slot.difficulty.charAt(0).toUpperCase()
      setAutoFillProgress({ current: i + 1, total: slots.length, currentSlot: `${slot.date} ${diffLabel}` })

      // Yield to UI
      await new Promise(r => setTimeout(r, 10))

      let level
      if (isCJ) {
        level = generateCJLevel(slot.difficulty)
      } else {
        level = generateLevelForDifficulty(slot.difficulty, gridSize)
      }
      if (!level) {
        failed++
        continue
      }

      const levelData = {
        ...level,
        difficulty: slot.difficulty,
        date: slot.date
      }

      try {
        const body = {
          date: slot.date,
          difficulty: slot.difficulty,
          level: levelData
        }
        if (isCJ) body.game = 'cj'
        const response = await fetch(`${API_BASE}/api/levels`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (response.ok) {
          filled++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }

    await fetchAllLevels()
    setAutoFilling(false)
    setAutoFillProgress(null)
    alert(`Auto-fill complete! ${filled} levels saved${failed > 0 ? `, ${failed} failed` : ''}.`)
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

        <div className="game-toggle" style={{ display: 'flex', gap: '8px', marginBottom: '12px', padding: '0 12px' }}>
          <button
            className={`tool-btn ${editorGame === 'jf' ? 'active' : ''}`}
            onClick={() => setEditorGame('jf')}
          >
            Jumping Frogs
          </button>
          <button
            className={`tool-btn ${editorGame === 'cj' ? 'active' : ''}`}
            onClick={() => setEditorGame('cj')}
          >
            Color Jump
          </button>
          <button
            className={`tool-btn ${editorGame === 'campaign' ? 'active' : ''}`}
            onClick={() => setEditorGame('campaign')}
          >
            Campaign
          </button>
        </div>

        <div className={`editor-layout ${editorGame === 'campaign' ? 'campaign-mode' : ''}`}>
          {/* Left side - Editor */}
          <div className="editor-main">
            <div className="editor-content">
              <div className={`editor-sidebar ${editorGame === 'campaign' ? 'campaign-mode' : ''}`}>
                {editorGame === 'campaign' && (
                  <CampaignPanel
                    campaign={campaign}
                    setCampaign={setCampaign}
                    selectedChapterId={selectedChapterId}
                    selectedCampaignLevelId={selectedCampaignLevelId}
                    setSelectedChapterId={setSelectedChapterId}
                    serverStatus={campaignServerStatus}
                    bulkProgress={campaignBulkProgress}
                    instructions={instructions}
                    setInstructions={setInstructions}
                    actions={{
                      addChapter: campaignAddChapter,
                      renameChapter: campaignRenameChapter,
                      deleteChapter: campaignDeleteChapter,
                      moveChapter: campaignMoveChapter,
                      addLevel: campaignAddLevel,
                      addBlankLevel: campaignAddBlankLevel,
                      selectLevel: campaignSelectLevel,
                      renameLevel: campaignRenameLevel,
                      deleteLevel: campaignDeleteLevel,
                      moveLevel: campaignMoveLevel,
                      saveSelected: campaignSaveSelected,
                      exportJSON: campaignExport,
                      importJSON: campaignImport,
                      saveToServer: campaignSaveToServer,
                      loadFromServer: campaignLoadFromServer,
                      bulkGenerate: campaignBulkGenerate,
                    }}
                  />
                )}
                {editorGame !== 'campaign' && (
                <div className="current-editing">
                  Editing: <strong>{formatDate(levelDate)}</strong> - <span className={`difficulty-tag ${difficulty}`}>{difficulty}</span>
                  {editorGame === 'cj' && <span style={{ marginLeft: '8px', opacity: 0.6 }}>(Color Jump {CJ_GRID_SIZES[difficulty]}x{CJ_GRID_SIZES[difficulty]})</span>}
                </div>
                )}

                {editorGame === 'cj' ? (
                  <>
                    <div className="editor-section">
                      <label>Grid Size: {CJ_GRID_SIZES[difficulty]}x{CJ_GRID_SIZES[difficulty]} (fixed per difficulty)</label>
                    </div>
                    {cjGrid && (
                      <div className="editor-section">
                        <label>Par: {cjPar}</label>
                      </div>
                    )}
                    <div className="action-btn-row">
                      <button
                        className="action-btn generate"
                        onClick={() => {
                          setCjGenerating(true)
                          setTimeout(() => {
                            const level = generateCJLevel(difficulty)
                            if (level) {
                              setCjGrid(level.grid)
                              setCjPar(level.par)
                            } else {
                              alert('Could not generate a valid Color Jump level. Try again.')
                            }
                            setCjGenerating(false)
                          }, 10)
                        }}
                        disabled={cjGenerating}
                      >
                        {cjGenerating ? '...' : 'Generate'}
                      </button>
                      <button
                        className="action-btn export"
                        onClick={saveLevel}
                        disabled={saving || !cjGrid}
                      >
                        {saving ? '...' : 'Save'}
                      </button>
                    </div>
                    {saveError && (
                      <div className="save-error">{saveError}</div>
                    )}
                  </>
                ) : (
                <>
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
                </>
                )}
              </div>

              <div className="editor-grid-area">
                {editorGame === 'cj' ? (
                  cjGrid ? (
                    <div className="cj-preview-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${CJ_GRID_SIZES[difficulty]}, 1fr)`,
                      gridTemplateRows: `repeat(${CJ_GRID_SIZES[difficulty]}, 1fr)`,
                      gap: CJ_GRID_SIZES[difficulty] <= 5 ? '3px' : CJ_GRID_SIZES[difficulty] <= 8 ? '2px' : '1px',
                      width: '100%',
                      maxWidth: '400px',
                      aspectRatio: '1',
                    }}>
                      {cjGrid.map((colorIdx, i) => {
                        const CJ_COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e', '#a855f7', '#f97316']
                        return (
                          <div
                            key={i}
                            style={{
                              backgroundColor: CJ_COLORS[colorIdx],
                              borderRadius: CJ_GRID_SIZES[difficulty] <= 5 ? '4px' : '2px',
                            }}
                          />
                        )
                      })}
                    </div>
                  ) : (
                    <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>
                      Click Generate to create a Color Jump level
                    </div>
                  )
                ) : tryItMode ? (
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

          {/* Right side - Level Schedule (hidden for campaign mode) */}
          {editorGame !== 'campaign' && (
          <div className="level-schedule">
            <h3>Level Schedule</h3>

            <div className="auto-fill-section">
              <div className="auto-fill-row">
                <label>Next</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={autoFillDays}
                  onChange={(e) => setAutoFillDays(parseInt(e.target.value) || 7)}
                  className="auto-fill-days"
                  disabled={autoFilling}
                />
                <label>days</label>
                <button
                  className="action-btn auto-fill"
                  onClick={autoFillLevels}
                  disabled={autoFilling || loadingLevels}
                >
                  {autoFilling ? 'Filling...' : 'Auto-Fill'}
                </button>
              </div>
              {autoFillProgress && (
                <div className="auto-fill-progress">
                  <div className="auto-fill-progress-bar">
                    <div
                      className="auto-fill-progress-fill"
                      style={{ width: `${(autoFillProgress.current / autoFillProgress.total) * 100}%` }}
                    />
                  </div>
                  <span className="auto-fill-progress-text">
                    {autoFillProgress.current}/{autoFillProgress.total} — {autoFillProgress.currentSlot}
                  </span>
                </div>
              )}
            </div>

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
          )}
        </div>
      </div>
    </div>
  )
}

export default LevelEditor
