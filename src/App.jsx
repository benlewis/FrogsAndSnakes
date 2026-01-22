import { useState, useRef, useEffect } from 'react'
import './App.css'
import LevelEditor from './LevelEditor.jsx'
import { solveLevel } from './solver.js'
import {
  isSnakeAt,
  isLogAt,
  isLilyPadAt,
  isFrogAt,
  isCellBlockedForSnake,
  getValidFrogMoves,
  getMaxSnakeDelta,
  checkWinCondition
} from './gameRules.js'

// API base URL - use relative path for production, localhost for dev
const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

// Frog color schemes - cartoony glossy style
const FROG_COLORS = {
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

// Cartoony glossy Frog SVG component
const FrogSVG = ({ color = 'green' }) => {
  const colors = FROG_COLORS[color] || FROG_COLORS.green
  const id = `frog-${color}`

  return (
    <svg viewBox="0 0 100 100" className="piece-svg">
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
          <stop offset="70%" stopColor="#f0f0f0" />
          <stop offset="100%" stopColor="#d0d0d0" />
        </radialGradient>
      </defs>

      {/* Back legs */}
      <ellipse cx="22" cy="78" rx="14" ry="10" fill={colors.outline} />
      <ellipse cx="22" cy="77" rx="12" ry="8" fill={`url(#${id}-body)`} />
      <ellipse cx="78" cy="78" rx="14" ry="10" fill={colors.outline} />
      <ellipse cx="78" cy="77" rx="12" ry="8" fill={`url(#${id}-body)`} />

      {/* Back feet with toes */}
      <ellipse cx="12" cy="88" rx="10" ry="6" fill={colors.outline} />
      <ellipse cx="12" cy="87" rx="8" ry="5" fill={colors.toes} />
      <ellipse cx="88" cy="88" rx="10" ry="6" fill={colors.outline} />
      <ellipse cx="88" cy="87" rx="8" ry="5" fill={colors.toes} />

      {/* Body outline */}
      <ellipse cx="50" cy="62" rx="32" ry="28" fill={colors.outline} />
      {/* Body main */}
      <ellipse cx="50" cy="60" rx="30" ry="26" fill={`url(#${id}-body)`} />

      {/* Belly */}
      <ellipse cx="50" cy="68" rx="18" ry="14" fill={colors.outline} />
      <ellipse cx="50" cy="67" rx="16" ry="12" fill={`url(#${id}-belly)`} />
      {/* Belly highlight */}
      <ellipse cx="50" cy="64" rx="8" ry="5" fill={colors.belly} opacity="0.6" />

      {/* Front legs */}
      <ellipse cx="25" cy="70" rx="10" ry="7" fill={colors.outline} />
      <ellipse cx="25" cy="69" rx="8" ry="5" fill={`url(#${id}-body)`} />
      <ellipse cx="75" cy="70" rx="10" ry="7" fill={colors.outline} />
      <ellipse cx="75" cy="69" rx="8" ry="5" fill={`url(#${id}-body)`} />

      {/* Front feet with toes */}
      <ellipse cx="18" cy="78" rx="8" ry="5" fill={colors.outline} />
      <ellipse cx="18" cy="77" rx="6" ry="4" fill={colors.toes} />
      <ellipse cx="82" cy="78" rx="8" ry="5" fill={colors.outline} />
      <ellipse cx="82" cy="77" rx="6" ry="4" fill={colors.toes} />

      {/* Head outline */}
      <ellipse cx="50" cy="35" rx="28" ry="24" fill={colors.outline} />
      {/* Head main */}
      <ellipse cx="50" cy="34" rx="26" ry="22" fill={`url(#${id}-body)`} />

      {/* Eye bumps - left */}
      <circle cx="35" cy="22" r="15" fill={colors.outline} />
      <circle cx="35" cy="21" r="13" fill={`url(#${id}-body)`} />
      {/* Eye bump shine */}
      <ellipse cx="32" cy="16" rx="5" ry="3" fill="white" opacity="0.7" />

      {/* Eye bumps - right */}
      <circle cx="65" cy="22" r="15" fill={colors.outline} />
      <circle cx="65" cy="21" r="13" fill={`url(#${id}-body)`} />
      {/* Eye bump shine */}
      <ellipse cx="62" cy="16" rx="5" ry="3" fill="white" opacity="0.7" />

      {/* Eyes - left */}
      <ellipse cx="35" cy="24" rx="9" ry="10" fill={colors.outline} />
      <ellipse cx="35" cy="24" rx="8" ry="9" fill={`url(#${id}-eye)`} />
      <ellipse cx="36" cy="25" rx="4" ry="5" fill="#1a1a1a" />
      <circle cx="34" cy="22" r="2.5" fill="white" />

      {/* Eyes - right */}
      <ellipse cx="65" cy="24" rx="9" ry="10" fill={colors.outline} />
      <ellipse cx="65" cy="24" rx="8" ry="9" fill={`url(#${id}-eye)`} />
      <ellipse cx="66" cy="25" rx="4" ry="5" fill="#1a1a1a" />
      <circle cx="64" cy="22" r="2.5" fill="white" />

      {/* Nostrils */}
      <circle cx="44" cy="38" r="2" fill={colors.outline} />
      <circle cx="56" cy="38" r="2" fill={colors.outline} />

      {/* Mouth - happy smile */}
      <path d="M38 45 Q50 52 62 45" stroke={colors.outline} strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Body shine highlights */}
      <ellipse cx="40" cy="50" rx="10" ry="6" fill="white" opacity="0.3" />
      <ellipse cx="38" cy="48" rx="5" ry="3" fill="white" opacity="0.5" />
    </svg>
  )
}

// Cartoony glossy Lily Pad SVG component
const LilyPadSVG = () => (
  <svg viewBox="0 0 100 100" className="piece-svg">
    <defs>
      <radialGradient id="lilypadMain" cx="40%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#4ade80" />
        <stop offset="50%" stopColor="#22c55e" />
        <stop offset="100%" stopColor="#166534" />
      </radialGradient>
      <radialGradient id="lilypadCenter" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fde047" />
        <stop offset="100%" stopColor="#ca8a04" />
      </radialGradient>
    </defs>

    {/* Shadow */}
    <ellipse cx="52" cy="55" rx="44" ry="38" fill="rgba(0,0,0,0.2)" />

    {/* Main pad outline */}
    <ellipse cx="50" cy="52" rx="44" ry="38" fill="#14532d" />

    {/* Main pad */}
    <ellipse cx="50" cy="50" rx="42" ry="36" fill="url(#lilypadMain)" />

    {/* Notch/cut */}
    <path d="M50 50 L50 12 L30 28 Z" fill="#1e3a5f" />
    <path d="M50 50 L50 16 L34 30 Z" fill="#2d4a6f" />

    {/* Veins */}
    <path d="M50 50 L20 30" stroke="#166534" strokeWidth="3" fill="none" opacity="0.5" />
    <path d="M50 50 L80 30" stroke="#166534" strokeWidth="3" fill="none" opacity="0.5" />
    <path d="M50 50 L10 50" stroke="#166534" strokeWidth="3" fill="none" opacity="0.5" />
    <path d="M50 50 L90 50" stroke="#166534" strokeWidth="3" fill="none" opacity="0.5" />
    <path d="M50 50 L25 75" stroke="#166534" strokeWidth="3" fill="none" opacity="0.5" />
    <path d="M50 50 L75 75" stroke="#166534" strokeWidth="3" fill="none" opacity="0.5" />
    <path d="M50 50 L50 88" stroke="#166534" strokeWidth="3" fill="none" opacity="0.5" />

    {/* Center */}
    <circle cx="50" cy="50" r="8" fill="#14532d" />
    <circle cx="50" cy="49" r="6" fill="url(#lilypadCenter)" />
    <circle cx="48" cy="47" r="2" fill="white" opacity="0.6" />

    {/* Glossy highlights */}
    <ellipse cx="35" cy="38" rx="16" ry="10" fill="white" opacity="0.35" />
    <ellipse cx="32" cy="35" rx="8" ry="5" fill="white" opacity="0.5" />

    {/* Edge highlight */}
    <ellipse cx="50" cy="50" rx="40" ry="34" fill="none" stroke="#86efac" strokeWidth="2" opacity="0.5" />

    {/* Water droplets */}
    <circle cx="70" cy="40" r="4" fill="#86efac" opacity="0.6" />
    <circle cx="72" cy="38" r="1.5" fill="white" opacity="0.8" />
    <circle cx="30" cy="65" r="3" fill="#86efac" opacity="0.5" />
    <circle cx="31" cy="64" r="1" fill="white" opacity="0.7" />
  </svg>
)

// Frog on Lily Pad combined SVG (for when frog is on goal)
const FrogOnPadSVG = ({ color = 'green' }) => {
  const colors = FROG_COLORS[color] || FROG_COLORS.green
  const id = `frogpad-${color}`

  return (
    <svg viewBox="0 0 100 100" className="piece-svg">
      <defs>
        <radialGradient id={`${id}-lilypad`} cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="50%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#166534" />
        </radialGradient>
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
          <stop offset="70%" stopColor="#f0f0f0" />
          <stop offset="100%" stopColor="#d0d0d0" />
        </radialGradient>
      </defs>

      {/* Lily pad shadow */}
      <ellipse cx="52" cy="82" rx="40" ry="14" fill="rgba(0,0,0,0.2)" />

      {/* Lily pad outline */}
      <ellipse cx="50" cy="78" rx="42" ry="18" fill="#14532d" />
      {/* Lily pad */}
      <ellipse cx="50" cy="76" rx="40" ry="16" fill={`url(#${id}-lilypad)`} />
      {/* Lily pad notch */}
      <path d="M50 76 L50 60 L38 66 Z" fill="#1e3a5f" />
      {/* Lily pad highlight */}
      <ellipse cx="35" cy="72" rx="12" ry="5" fill="white" opacity="0.3" />

      {/* Frog - scaled down and positioned on pad */}
      {/* Back feet */}
      <ellipse cx="18" cy="75" rx="7" ry="4" fill={colors.outline} />
      <ellipse cx="18" cy="74" rx="5" ry="3" fill={colors.toes} />
      <ellipse cx="82" cy="75" rx="7" ry="4" fill={colors.outline} />
      <ellipse cx="82" cy="74" rx="5" ry="3" fill={colors.toes} />

      {/* Body outline */}
      <ellipse cx="50" cy="52" rx="24" ry="20" fill={colors.outline} />
      {/* Body */}
      <ellipse cx="50" cy="50" rx="22" ry="18" fill={`url(#${id}-body)`} />

      {/* Belly */}
      <ellipse cx="50" cy="56" rx="12" ry="9" fill={colors.outline} />
      <ellipse cx="50" cy="55" rx="10" ry="7" fill={`url(#${id}-belly)`} />

      {/* Front feet */}
      <ellipse cx="30" cy="65" rx="6" ry="4" fill={colors.outline} />
      <ellipse cx="30" cy="64" rx="4" ry="3" fill={colors.toes} />
      <ellipse cx="70" cy="65" rx="6" ry="4" fill={colors.outline} />
      <ellipse cx="70" cy="64" rx="4" ry="3" fill={colors.toes} />

      {/* Head outline */}
      <ellipse cx="50" cy="30" rx="22" ry="18" fill={colors.outline} />
      {/* Head */}
      <ellipse cx="50" cy="29" rx="20" ry="16" fill={`url(#${id}-body)`} />

      {/* Eye bumps */}
      <circle cx="38" cy="18" r="11" fill={colors.outline} />
      <circle cx="38" cy="17" r="9" fill={`url(#${id}-body)`} />
      <circle cx="62" cy="18" r="11" fill={colors.outline} />
      <circle cx="62" cy="17" r="9" fill={`url(#${id}-body)`} />

      {/* Eyes */}
      <ellipse cx="38" cy="20" rx="6" ry="7" fill={colors.outline} />
      <ellipse cx="38" cy="20" rx="5" ry="6" fill={`url(#${id}-eye)`} />
      <ellipse cx="39" cy="21" rx="2.5" ry="3.5" fill="#1a1a1a" />
      <circle cx="37" cy="18" r="2" fill="white" />

      <ellipse cx="62" cy="20" rx="6" ry="7" fill={colors.outline} />
      <ellipse cx="62" cy="20" rx="5" ry="6" fill={`url(#${id}-eye)`} />
      <ellipse cx="63" cy="21" rx="2.5" ry="3.5" fill="#1a1a1a" />
      <circle cx="61" cy="18" r="2" fill="white" />

      {/* Nostrils */}
      <circle cx="46" cy="32" r="1.5" fill={colors.outline} />
      <circle cx="54" cy="32" r="1.5" fill={colors.outline} />

      {/* Smile */}
      <path d="M42 38 Q50 44 58 38" stroke={colors.outline} strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Shine highlights */}
      <ellipse cx="42" cy="44" rx="6" ry="4" fill="white" opacity="0.3" />
      <ellipse cx="35" cy="14" rx="3" ry="2" fill="white" opacity="0.6" />
      <ellipse cx="59" cy="14" rx="3" ry="2" fill="white" opacity="0.6" />
    </svg>
  )
}

// Cartoony glossy Log/Stump SVG component
const LogSVG = () => (
  <svg viewBox="0 0 100 100" className="piece-svg">
    <defs>
      <radialGradient id="logTop" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stopColor="#fcd34d" />
        <stop offset="40%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>
      <linearGradient id="logBark" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#78350f" />
        <stop offset="20%" stopColor="#92400e" />
        <stop offset="50%" stopColor="#a16207" />
        <stop offset="80%" stopColor="#92400e" />
        <stop offset="100%" stopColor="#78350f" />
      </linearGradient>
      <radialGradient id="logCenter" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#92400e" />
        <stop offset="100%" stopColor="#451a03" />
      </radialGradient>
    </defs>

    {/* Shadow */}
    <ellipse cx="52" cy="94" rx="42" ry="8" fill="rgba(0,0,0,0.25)" />

    {/* Bark base/bottom */}
    <ellipse cx="50" cy="90" rx="44" ry="10" fill="#451a03" />

    {/* Bark body */}
    <path d="M6 28 L6 88 Q50 98 94 88 L94 28 Q50 38 6 28" fill="url(#logBark)" />

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
    <ellipse cx="50" cy="26" rx="44" ry="16" fill="url(#logTop)" />

    {/* Tree rings */}
    <ellipse cx="50" cy="26" rx="36" ry="12" fill="none" stroke="#b45309" strokeWidth="2" opacity="0.6" />
    <ellipse cx="50" cy="26" rx="26" ry="8" fill="none" stroke="#92400e" strokeWidth="2" opacity="0.7" />
    <ellipse cx="50" cy="26" rx="16" ry="5" fill="none" stroke="#b45309" strokeWidth="2" opacity="0.6" />
    <ellipse cx="50" cy="26" rx="8" ry="2.5" fill="none" stroke="#92400e" strokeWidth="2" opacity="0.7" />

    {/* Center */}
    <ellipse cx="50" cy="26" rx="4" ry="1.5" fill="url(#logCenter)" />

    {/* Top glossy highlights */}
    <ellipse cx="35" cy="20" rx="14" ry="6" fill="white" opacity="0.3" />
    <ellipse cx="32" cy="18" rx="7" ry="3" fill="white" opacity="0.5" />

    {/* Bark highlight */}
    <path d="M14 38 Q18 55 14 75" stroke="#d97706" strokeWidth="3" fill="none" opacity="0.4" />
  </svg>
)

// Cartoony glossy Vertical Snake SVG component
const VerticalSnakeSVG = ({ length = 2 }) => {
  // Scale viewBox height based on length (50 per cell)
  const cellHeight = 50
  const viewHeight = length * cellHeight
  const bodyEnd = viewHeight - 5
  const tailY = viewHeight - 6

  // Generate scale pattern based on length
  const scales = []
  const scaleSpacing = (viewHeight - 30) / (length + 1)
  for (let i = 1; i <= length; i++) {
    const y = 20 + i * scaleSpacing
    scales.push(`M14 ${y} Q20 ${y - 4} 26 ${y}`)
  }

  return (
    <svg viewBox={`0 0 40 ${viewHeight}`} className="snake-svg">
      <defs>
        <linearGradient id="snakeBodyV" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#166534" />
          <stop offset="25%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#4ade80" />
          <stop offset="75%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <linearGradient id="snakeBellyV" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="50%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <radialGradient id="snakeHeadV" cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="60%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#166534" />
        </radialGradient>
        <radialGradient id="snakeEyeV" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e0e0" />
        </radialGradient>
      </defs>

      {/* Body shadow */}
      <path d={`M22 ${bodyEnd} L22 18`} stroke="rgba(0,0,0,0.3)" strokeWidth="14" strokeLinecap="round" />

      {/* Body outline */}
      <path d={`M20 ${bodyEnd} L20 18`} stroke="#14532d" strokeWidth="16" strokeLinecap="round" />

      {/* Body main */}
      <path d={`M20 ${bodyEnd - 1} L20 19`} stroke="url(#snakeBodyV)" strokeWidth="13" strokeLinecap="round" />

      {/* Belly stripe */}
      <path d={`M20 ${bodyEnd - 3} L20 22`} stroke="url(#snakeBellyV)" strokeWidth="5" strokeLinecap="round" opacity="0.7" />

      {/* Body shine */}
      <path d={`M15 ${bodyEnd - 5} L15 25`} stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

      {/* Scale pattern */}
      {scales.map((d, i) => (
        <path key={i} d={d} stroke="#166534" strokeWidth="1.5" fill="none" opacity="0.5" />
      ))}

      {/* Head outline */}
      <ellipse cx="20" cy="10" rx="15" ry="12" fill="#14532d" />
      {/* Head */}
      <ellipse cx="20" cy="9" rx="13" ry="10" fill="url(#snakeHeadV)" />

      {/* Head shine */}
      <ellipse cx="16" cy="5" rx="5" ry="3" fill="white" opacity="0.5" />

      {/* Eyes */}
      <ellipse cx="13" cy="8" rx="5" ry="6" fill="#14532d" />
      <ellipse cx="13" cy="8" rx="4" ry="5" fill="url(#snakeEyeV)" />
      <ellipse cx="14" cy="9" rx="2" ry="3" fill="#1a1a1a" />
      <circle cx="12" cy="7" r="1.5" fill="white" />

      <ellipse cx="27" cy="8" rx="5" ry="6" fill="#14532d" />
      <ellipse cx="27" cy="8" rx="4" ry="5" fill="url(#snakeEyeV)" />
      <ellipse cx="28" cy="9" rx="2" ry="3" fill="#1a1a1a" />
      <circle cx="26" cy="7" r="1.5" fill="white" />

      {/* Nostrils */}
      <circle cx="16" cy="14" r="1.5" fill="#14532d" />
      <circle cx="24" cy="14" r="1.5" fill="#14532d" />

      {/* Tongue */}
      <path d="M20 -2 L20 -6 L17 -10 M20 -6 L23 -10" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Smile */}
      <path d="M15 16 Q20 19 25 16" stroke="#14532d" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Tail */}
      <path d={`M20 ${tailY} Q23 ${tailY + 3} 21 ${tailY + 5} Q19 ${tailY + 6} 18 ${tailY + 4}`} stroke="#14532d" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// Cartoony glossy Horizontal Snake SVG component
const HorizontalSnakeSVG = ({ length = 2 }) => {
  // Scale viewBox width based on length (50 per cell)
  const cellWidth = 50
  const viewWidth = length * cellWidth
  const bodyEnd = viewWidth - 18
  const headX = viewWidth - 10

  // Generate scale pattern based on length
  const scales = []
  const scaleSpacing = (viewWidth - 30) / (length + 1)
  for (let i = 1; i <= length; i++) {
    const x = 10 + i * scaleSpacing
    scales.push(`M${x} 14 Q${x + 4} 20 ${x} 26`)
  }

  return (
    <svg viewBox={`0 0 ${viewWidth} 40`} className="snake-svg-horizontal">
      <defs>
        <linearGradient id="snakeBodyH" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#166534" />
          <stop offset="25%" stopColor="#22c55e" />
          <stop offset="50%" stopColor="#4ade80" />
          <stop offset="75%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#166534" />
        </linearGradient>
        <linearGradient id="snakeBellyH" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a16207" />
          <stop offset="50%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <radialGradient id="snakeHeadH" cx="30%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="60%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#166534" />
        </radialGradient>
        <radialGradient id="snakeEyeH" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0e0e0" />
        </radialGradient>
      </defs>

      {/* Body shadow */}
      <path d={`M5 22 L${bodyEnd} 22`} stroke="rgba(0,0,0,0.3)" strokeWidth="14" strokeLinecap="round" />

      {/* Body outline */}
      <path d={`M5 20 L${bodyEnd} 20`} stroke="#14532d" strokeWidth="16" strokeLinecap="round" />

      {/* Body main */}
      <path d={`M6 20 L${bodyEnd - 1} 20`} stroke="url(#snakeBodyH)" strokeWidth="13" strokeLinecap="round" />

      {/* Belly stripe */}
      <path d={`M8 20 L${bodyEnd - 4} 20`} stroke="url(#snakeBellyH)" strokeWidth="5" strokeLinecap="round" opacity="0.7" />

      {/* Body shine */}
      <path d={`M10 15 L${bodyEnd - 7} 15`} stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.4" />

      {/* Scale pattern */}
      {scales.map((d, i) => (
        <path key={i} d={d} stroke="#166534" strokeWidth="1.5" fill="none" opacity="0.5" />
      ))}

      {/* Head outline */}
      <ellipse cx={headX} cy="20" rx="12" ry="15" fill="#14532d" />
      {/* Head */}
      <ellipse cx={headX + 1} cy="20" rx="10" ry="13" fill="url(#snakeHeadH)" />

      {/* Head shine */}
      <ellipse cx={headX + 5} cy="15" rx="3" ry="5" fill="white" opacity="0.5" />

      {/* Eyes */}
      <ellipse cx={headX + 2} cy="13" rx="6" ry="5" fill="#14532d" />
      <ellipse cx={headX + 2} cy="13" rx="5" ry="4" fill="url(#snakeEyeH)" />
      <ellipse cx={headX + 3} cy="14" rx="3" ry="2" fill="#1a1a1a" />
      <circle cx={headX + 1} cy="12" r="1.5" fill="white" />

      <ellipse cx={headX + 2} cy="27" rx="6" ry="5" fill="#14532d" />
      <ellipse cx={headX + 2} cy="27" rx="5" ry="4" fill="url(#snakeEyeH)" />
      <ellipse cx={headX + 3} cy="28" rx="3" ry="2" fill="#1a1a1a" />
      <circle cx={headX + 1} cy="26" r="1.5" fill="white" />

      {/* Nostrils */}
      <circle cx={headX + 8} cy="17" r="1.5" fill="#14532d" />
      <circle cx={headX + 8} cy="23" r="1.5" fill="#14532d" />

      {/* Tongue */}
      <path d={`M${headX + 12} 20 L${headX + 16} 20 L${headX + 20} 17 M${headX + 16} 20 L${headX + 20} 23`} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Tail */}
      <path d="M6 20 Q3 22 1 21 Q-1 20 1 19 Q3 18 6 20" stroke="#14532d" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  )
}

// Helper to get a date in YYYY-MM-DD format using local timezone
const getLocalDateString = (date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  return getLocalDateString(new Date())
}


function App() {
  const [difficulty, setDifficulty] = useState('easy')
  const [levels, setLevels] = useState({})
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(getTodayDate())
  const gridRef = useRef(null)

  // Fetch levels for current date from Vercel Blob
  useEffect(() => {
    const fetchLevels = async () => {
      setLoading(true)
      try {
        const response = await fetch(`${API_BASE}/api/levels?date=${currentDate}`)
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

  // Reset game state when level changes
  useEffect(() => {
    // Temporarily disable rendering of any selection to prevent stale highlights
    setInitialized(false)

    // Clear all selection state
    setSelectedFrogIndex(null)
    setDraggingFrogIndex(null)
    setFrogDragPos({ x: 0, y: 0 })
    justFinishedDragRef.current = false

    if (currentLevel) {
      setGameState(getInitialState())
      setMoves(0)
      setTime(0)
      setHintsUsed(0)
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
  const [showHelp, setShowHelp] = useState(false)

  // Game stats
  const [moves, setMoves] = useState(0)
  const [time, setTime] = useState(0)

  // Hint state
  const [hintMove, setHintMove] = useState(null)
  const [hintLoading, setHintLoading] = useState(false)
  const [hintsUsed, setHintsUsed] = useState(0)
  const hintTimerRef = useRef(null)

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

  // Timer effect
  useEffect(() => {
    if (isGameWon) return

    const interval = setInterval(() => {
      setTime(t => t + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isGameWon])

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

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
    setTime(0)
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

  // Snake drag state - track which snake is being dragged
  const [draggingSnakeIndex, setDraggingSnakeIndex] = useState(null)
  const [snakeDragOffset, setSnakeDragOffset] = useState(0)
  const snakeDragStartRef = useRef({ y: 0, x: 0, startPos: 0 })

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

  // Validate that selected/dragging frog index is valid for current level
  // Don't show any selection until after initialization (prevents HMR stale state flash)
  const validSelectedFrogIndex = initialized && selectedFrogIndex !== null && selectedFrogIndex < frogs.length ? selectedFrogIndex : null
  const validDraggingFrogIndex = initialized && draggingFrogIndex !== null && draggingFrogIndex < frogs.length ? draggingFrogIndex : null

  const activeFrogIndex = validDraggingFrogIndex !== null ? validDraggingFrogIndex : validSelectedFrogIndex
  const validFrogMoves = activeFrogIndex !== null ? calcValidFrogMoves(activeFrogIndex) : []

  const isValidFrogDestination = (col, row) => {
    return validFrogMoves.some(move => move[0] === col && move[1] === row)
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

  // Snake drag handlers
  const handleSnakePointerDown = (e, snakeIndex) => {
    if (isGameWon) return
    e.preventDefault()
    const snake = snakes[snakeIndex]
    const isVertical = snake.orientation === 'vertical'
    setDraggingSnakeIndex(snakeIndex)
    const startPos = isVertical ? snake.positions[0][1] : snake.positions[0][0]
    snakeDragStartRef.current = {
      y: e.clientY,
      x: e.clientX,
      startPos
    }
    setSnakeDragOffset(0)
  }

  const handleSnakePointerMove = (e) => {
    if (draggingSnakeIndex === null) return

    const snake = snakes[draggingSnakeIndex]
    const isVertical = snake.orientation === 'vertical'
    const cellSize = getCellSize()
    const delta = isVertical
      ? e.clientY - snakeDragStartRef.current.y
      : e.clientX - snakeDragStartRef.current.x

    const snakeLength = snake.positions.length
    const currentPos = snakeDragStartRef.current.startPos

    // Grid bounds constraints
    const minPos = 0
    const maxPos = gridSize - snakeLength
    const minBoundOffset = (minPos - currentPos) * cellSize
    const maxBoundOffset = (maxPos - currentPos) * cellSize

    // Collision constraints - calculate max movement in each direction
    const maxDeltaPositive = calcMaxSnakeDelta(draggingSnakeIndex, 1)
    const maxDeltaNegative = calcMaxSnakeDelta(draggingSnakeIndex, -1)

    // Convert cell deltas to pixel offsets
    const minCollisionOffset = maxDeltaNegative * cellSize
    const maxCollisionOffset = maxDeltaPositive * cellSize

    // Apply both bounds and collision constraints
    const minOffset = Math.max(minBoundOffset, minCollisionOffset)
    const maxOffset = Math.min(maxBoundOffset, maxCollisionOffset)

    const constrainedOffset = Math.max(minOffset, Math.min(maxOffset, delta))
    setSnakeDragOffset(constrainedOffset)
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
      clearHint()
    }

    setDraggingSnakeIndex(null)
    setSnakeDragOffset(0)
  }

  // Frog click handler for tap-to-select
  const handleFrogClick = (frogIndex) => {
    // Skip if we just finished a drag
    if (justFinishedDragRef.current) {
      justFinishedDragRef.current = false
      return
    }
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

    // Clicking anywhere else deselects
    setSelectedFrogIndex(null)
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

  // Event listeners
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

  // Show loading or no level message
  if (loading) {
    return (
      <div className="app">
        <h1 className="title">Frogs And Snakes</h1>
        <div className="loading-message">Loading puzzles...</div>
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
    <div className="app">
      <h1 className="title">Frogs And Snakes</h1>

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
        <button className="help-btn" onClick={() => setShowHelp(true)}>?</button>
      </div>
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
              const isValidDest = isValidFrogDestination(colIndex, rowIndex)

              const isHintSource = hintMove?.type === 'frog' && hintMove.from[0] === colIndex && hintMove.from[1] === rowIndex
              const isHintDest = hintMove?.type === 'frog' && hintMove.to[0] === colIndex && hintMove.to[1] === rowIndex

              return (
                <div
                  key={`${colIndex}-${rowIndex}`}
                  className={`cell ${content ? `cell-${content.type}` : ''} ${snakeCell ? 'cell-snake' : ''} ${isThisFrogSelected || isThisFrogDragging ? 'cell-frog-active' : ''} ${activeFrogIndex !== null && isValidDest ? 'cell-valid-dest' : ''} ${isHintSource ? 'cell-hint-source' : ''} ${isHintDest ? 'cell-hint-dest' : ''}`}
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
              className={`snake-overlay ${draggingSnakeIndex === index ? 'dragging' : ''} ${hintMove?.type === 'snake' && hintMove.snakeIdx === index ? 'snake-hint' : ''}`}
              style={getSnakeStyle(snake, index)}
              onPointerDown={(e) => handleSnakePointerDown(e, index)}
            >
              {snake.orientation === 'vertical' ? <VerticalSnakeSVG length={snake.positions.length} /> : <HorizontalSnakeSVG length={snake.positions.length} />}
            </div>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stats-bar-actions">
          <button className="reset-btn" onClick={handleReset}>
            Reset
          </button>
          <button
            className="hint-btn"
            onClick={handleHint}
            disabled={isGameWon || !currentLevel || hintLoading}
          >
            {hintLoading ? 'Thinking...' : hintsUsed > 0 ? `Hint (${hintsUsed})` : 'Hint'}
          </button>
        </div>
        <div className="stats">
          <span className="stat">
            <span className="stat-label">Time:</span> {formatTime(time)}
          </span>
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
        <button className="win-message" onClick={() => {
          const hintsText = hintsUsed > 0 ? ` (${hintsUsed} Hint${hintsUsed !== 1 ? 's' : ''})` : ''
          const shareText = `Frogs & Snakes: I solved ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} in ${moves} Moves and ${formatTime(time)}${hintsText}\n${window.location.origin}`
          if (navigator.share) {
            navigator.share({
              text: shareText
            }).catch(() => {})
          } else {
            navigator.clipboard.writeText(shareText)
            alert('Copied to clipboard!')
          }
        }}>
          <span>You Win!</span>
          <svg viewBox="0 0 24 24" className="share-icon">
            <path fill="currentColor" d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
          </svg>
        </button>
      )}
      </>
      )}

      {/* Editor button - dev only */}
      {import.meta.env.DEV && (
        <button
          className="editor-toggle-btn"
          onClick={() => setShowEditor(true)}
        >
          Level Editor
        </button>
      )}

      {/* Level Editor - dev only */}
      {import.meta.env.DEV && showEditor && (
        <LevelEditor
          onClose={() => setShowEditor(false)}
          existingLevel={currentLevel}
        />
      )}

      {/* Help Modal */}
      {showHelp && (
        <div className="help-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <button className="help-close-btn" onClick={() => setShowHelp(false)}>×</button>
            <h2>How to Play</h2>

            <div className="help-goal">
              <p>Get all frogs onto lily pads!</p>
            </div>

            <div className="help-section">
              <div className="help-item">
                <div className="help-icon">
                  <FrogSVG color="green" />
                </div>
                <div className="help-text">
                  <strong>Frogs</strong>
                  <p>Drag to jump over obstacles. Frogs can only jump over something - they can't move to empty spaces.</p>
                </div>
              </div>

              <div className="help-item">
                <div className="help-icon help-icon-wide">
                  <HorizontalSnakeSVG />
                </div>
                <div className="help-text">
                  <strong>Snakes</strong>
                  <p>Drag to slide back and forth. Use them to create jumping paths for frogs.</p>
                </div>
              </div>

              <div className="help-item">
                <div className="help-icon">
                  <LogSVG />
                </div>
                <div className="help-text">
                  <strong>Logs</strong>
                  <p>Fixed obstacles. Frogs can jump over them but can't land on them.</p>
                </div>
              </div>

              <div className="help-item">
                <div className="help-icon">
                  <LilyPadSVG />
                </div>
                <div className="help-text">
                  <strong>Lily Pads</strong>
                  <p>The goal! Get each frog onto a lily pad to win.</p>
                </div>
              </div>
            </div>

            <div className="help-tip">
              <strong>Tip:</strong> Frogs jump in a straight line and land on the first empty space after an obstacle.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
