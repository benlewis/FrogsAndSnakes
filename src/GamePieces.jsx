// Shared SVG game piece components

// Frog color schemes - cartoony glossy style
export const FROG_COLORS = {
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
// Palette giving each frog in a multi-frog level a distinct color. Index 0 is
// the plain green frog, so single-frog levels are unchanged.
export const FROG_PALETTE = ['green', 'blue', 'purple', 'red', 'yellow']

// Map a frog color to its iOS sprite (green is the base frog.png).
const FROG_IMAGE = {
  green: '/art/frog.png',
  blue: '/art/frog_blue.png',
  purple: '/art/frog_purple.png',
  red: '/art/frog_red.png',
  yellow: '/art/frog_yellow.png',
}

export const FrogSVG = ({ color = 'green' }) => (
  <svg viewBox="0 0 100 100" className="piece-svg">
    <image href={FROG_IMAGE[color] || FROG_IMAGE.green} x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet" />
  </svg>
)

// Triumphant frog: shown when the level is beaten in exactly par moves.
// Closed happy eyes, open grin with tongue, blushing cheeks, sparkles around the head.
export const HappyFrogSVG = ({ color = 'green' }) => {
  const colors = FROG_COLORS[color] || FROG_COLORS.green
  const id = `frog-happy-${color}`

  return (
    <svg viewBox="0 0 100 100" className="piece-svg frog-happy">
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
      </defs>

      <ellipse cx="22" cy="78" rx="14" ry="10" fill={colors.outline} />
      <ellipse cx="22" cy="77" rx="12" ry="8" fill={`url(#${id}-body)`} />
      <ellipse cx="78" cy="78" rx="14" ry="10" fill={colors.outline} />
      <ellipse cx="78" cy="77" rx="12" ry="8" fill={`url(#${id}-body)`} />

      <ellipse cx="12" cy="88" rx="10" ry="6" fill={colors.outline} />
      <ellipse cx="12" cy="87" rx="8" ry="5" fill={colors.toes} />
      <ellipse cx="88" cy="88" rx="10" ry="6" fill={colors.outline} />
      <ellipse cx="88" cy="87" rx="8" ry="5" fill={colors.toes} />

      <ellipse cx="50" cy="62" rx="32" ry="28" fill={colors.outline} />
      <ellipse cx="50" cy="60" rx="30" ry="26" fill={`url(#${id}-body)`} />

      <ellipse cx="50" cy="68" rx="18" ry="14" fill={colors.outline} />
      <ellipse cx="50" cy="67" rx="16" ry="12" fill={`url(#${id}-belly)`} />
      <ellipse cx="50" cy="64" rx="8" ry="5" fill={colors.belly} opacity="0.6" />

      {/* Front legs raised in a cheer */}
      <ellipse cx="22" cy="60" rx="9" ry="6" fill={colors.outline} transform="rotate(-30 22 60)" />
      <ellipse cx="22" cy="59" rx="7" ry="4" fill={`url(#${id}-body)`} transform="rotate(-30 22 59)" />
      <ellipse cx="78" cy="60" rx="9" ry="6" fill={colors.outline} transform="rotate(30 78 60)" />
      <ellipse cx="78" cy="59" rx="7" ry="4" fill={`url(#${id}-body)`} transform="rotate(30 78 59)" />
      <ellipse cx="14" cy="50" rx="6" ry="4" fill={colors.outline} />
      <ellipse cx="14" cy="49" rx="4" ry="3" fill={colors.toes} />
      <ellipse cx="86" cy="50" rx="6" ry="4" fill={colors.outline} />
      <ellipse cx="86" cy="49" rx="4" ry="3" fill={colors.toes} />

      <ellipse cx="50" cy="35" rx="28" ry="24" fill={colors.outline} />
      <ellipse cx="50" cy="34" rx="26" ry="22" fill={`url(#${id}-body)`} />

      <circle cx="35" cy="22" r="15" fill={colors.outline} />
      <circle cx="35" cy="21" r="13" fill={`url(#${id}-body)`} />
      <ellipse cx="32" cy="16" rx="5" ry="3" fill="white" opacity="0.7" />

      <circle cx="65" cy="22" r="15" fill={colors.outline} />
      <circle cx="65" cy="21" r="13" fill={`url(#${id}-body)`} />
      <ellipse cx="62" cy="16" rx="5" ry="3" fill="white" opacity="0.7" />

      {/* Happy closed eyes — upward arcs (^ ^) */}
      <path d="M27 26 Q35 18 43 26" stroke={colors.outline} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M57 26 Q65 18 73 26" stroke={colors.outline} strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Nostrils */}
      <circle cx="44" cy="38" r="2" fill={colors.outline} />
      <circle cx="56" cy="38" r="2" fill={colors.outline} />

      {/* Wide open grin with tongue */}
      <path d="M34 44 Q50 60 66 44 Q58 54 50 55 Q42 54 34 44 Z" fill="#4a0e0e" stroke={colors.outline} strokeWidth="2" strokeLinejoin="round" />
      <path d="M40 49 Q50 58 60 49 Q55 56 50 56 Q45 56 40 49 Z" fill="#ef4444" />
      <ellipse cx="50" cy="53" rx="3" ry="1.5" fill="#f87171" opacity="0.8" />

      {/* Rosy cheeks */}
      <ellipse cx="26" cy="40" rx="5" ry="3" fill="#fb7185" opacity="0.55" />
      <ellipse cx="74" cy="40" rx="5" ry="3" fill="#fb7185" opacity="0.55" />

      {/* Body shine highlights */}
      <ellipse cx="40" cy="58" rx="10" ry="6" fill="white" opacity="0.3" />
      <ellipse cx="38" cy="56" rx="5" ry="3" fill="white" opacity="0.5" />

      {/* Sparkle stars */}
      <g fill="#fde047" stroke="#facc15" strokeWidth="0.8">
        <path d="M14 18 L16 22 L20 22 L17 25 L18 29 L14 27 L10 29 L11 25 L8 22 L12 22 Z" />
        <path d="M86 16 L87.4 19 L90.5 19 L88 21 L89 24 L86 22.4 L83 24 L84 21 L81.5 19 L84.6 19 Z" />
        <path d="M82 70 L83 72.4 L85.5 72.4 L83.5 74 L84.4 76.4 L82 75 L79.6 76.4 L80.5 74 L78.5 72.4 L81 72.4 Z" />
      </g>
    </svg>
  )
}

// Defeated frog: shown when the level is beaten in 10x par moves or worse.
// Droopy eyes, frown, tear drops, slumped posture.
export const SadFrogSVG = ({ color = 'green' }) => {
  const colors = FROG_COLORS[color] || FROG_COLORS.green
  const id = `frog-sad-${color}`

  return (
    <svg viewBox="0 0 100 100" className="piece-svg frog-sad">
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
        <linearGradient id={`${id}-tear`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#bae6fd" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      <ellipse cx="22" cy="80" rx="14" ry="9" fill={colors.outline} />
      <ellipse cx="22" cy="79" rx="12" ry="7" fill={`url(#${id}-body)`} />
      <ellipse cx="78" cy="80" rx="14" ry="9" fill={colors.outline} />
      <ellipse cx="78" cy="79" rx="12" ry="7" fill={`url(#${id}-body)`} />

      <ellipse cx="12" cy="89" rx="10" ry="5" fill={colors.outline} />
      <ellipse cx="12" cy="88" rx="8" ry="4" fill={colors.toes} />
      <ellipse cx="88" cy="89" rx="10" ry="5" fill={colors.outline} />
      <ellipse cx="88" cy="88" rx="8" ry="4" fill={colors.toes} />

      {/* Slumped body — slightly squashed and lower */}
      <ellipse cx="50" cy="66" rx="32" ry="26" fill={colors.outline} />
      <ellipse cx="50" cy="64" rx="30" ry="24" fill={`url(#${id}-body)`} />

      <ellipse cx="50" cy="72" rx="18" ry="13" fill={colors.outline} />
      <ellipse cx="50" cy="71" rx="16" ry="11" fill={`url(#${id}-belly)`} />
      <ellipse cx="50" cy="68" rx="8" ry="5" fill={colors.belly} opacity="0.6" />

      {/* Drooped front legs */}
      <ellipse cx="25" cy="76" rx="10" ry="6" fill={colors.outline} />
      <ellipse cx="25" cy="75" rx="8" ry="4" fill={`url(#${id}-body)`} />
      <ellipse cx="75" cy="76" rx="10" ry="6" fill={colors.outline} />
      <ellipse cx="75" cy="75" rx="8" ry="4" fill={`url(#${id}-body)`} />

      <ellipse cx="18" cy="82" rx="8" ry="4" fill={colors.outline} />
      <ellipse cx="18" cy="81" rx="6" ry="3" fill={colors.toes} />
      <ellipse cx="82" cy="82" rx="8" ry="4" fill={colors.outline} />
      <ellipse cx="82" cy="81" rx="6" ry="3" fill={colors.toes} />

      {/* Head — tilted/lowered */}
      <ellipse cx="50" cy="40" rx="28" ry="22" fill={colors.outline} />
      <ellipse cx="50" cy="39" rx="26" ry="20" fill={`url(#${id}-body)`} />

      {/* Drooping eye bumps */}
      <circle cx="35" cy="28" r="14" fill={colors.outline} />
      <circle cx="35" cy="27" r="12" fill={`url(#${id}-body)`} />
      <ellipse cx="32" cy="22" rx="4" ry="2.5" fill="white" opacity="0.5" />

      <circle cx="65" cy="28" r="14" fill={colors.outline} />
      <circle cx="65" cy="27" r="12" fill={`url(#${id}-body)`} />
      <ellipse cx="62" cy="22" rx="4" ry="2.5" fill="white" opacity="0.5" />

      {/* Open eyes with pupils glancing down */}
      <ellipse cx="35" cy="30" rx="8" ry="9" fill={colors.outline} />
      <ellipse cx="35" cy="30" rx="7" ry="8" fill={`url(#${id}-eye)`} />
      <ellipse cx="35" cy="34" rx="3.5" ry="4.5" fill="#1a1a1a" />
      <circle cx="34" cy="32" r="1.5" fill="white" />

      <ellipse cx="65" cy="30" rx="8" ry="9" fill={colors.outline} />
      <ellipse cx="65" cy="30" rx="7" ry="8" fill={`url(#${id}-eye)`} />
      <ellipse cx="65" cy="34" rx="3.5" ry="4.5" fill="#1a1a1a" />
      <circle cx="64" cy="32" r="1.5" fill="white" />

      {/* Sad slanted brow lines above each eye */}
      <path d="M24 18 Q32 16 42 22" stroke={colors.outline} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M76 18 Q68 16 58 22" stroke={colors.outline} strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Nostrils */}
      <circle cx="44" cy="44" r="2" fill={colors.outline} />
      <circle cx="56" cy="44" r="2" fill={colors.outline} />

      {/* Frown — curve dips upward at the corners */}
      <path d="M38 56 Q50 49 62 56" stroke={colors.outline} strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Tear drops — one on each cheek */}
      <path d="M28 38 Q26 44 28 48 Q30 44 28 38 Z" fill={`url(#${id}-tear)`} stroke="#0369a1" strokeWidth="0.6" />
      <ellipse cx="27.5" cy="42" rx="0.8" ry="1.5" fill="white" opacity="0.8" />
      <path d="M72 38 Q70 44 72 48 Q74 44 72 38 Z" fill={`url(#${id}-tear)`} stroke="#0369a1" strokeWidth="0.6" />
      <ellipse cx="71.5" cy="42" rx="0.8" ry="1.5" fill="white" opacity="0.8" />

      {/* Body shine highlights — dimmer */}
      <ellipse cx="40" cy="62" rx="10" ry="5" fill="white" opacity="0.18" />
    </svg>
  )
}

// Cartoony glossy Lily Pad SVG component
export const LilyPadSVG = () => (
  <svg viewBox="0 0 100 100" className="piece-svg">
    <image href="/art/lilypad.png" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet" />
  </svg>
)

// Frog on Lily Pad combined SVG (for when frog is on goal)
export const FrogOnPadSVG = ({ color = 'green' }) => {
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
export const LogSVG = () => (
  <svg viewBox="0 0 100 100" className="piece-svg">
    <image href="/art/stump.png" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMid meet" />
  </svg>
)

// A western saddle drawn on a snake's middle segment (a frog can ride it).
// Centered at (cx, cy); `rotate` aligns its long (front-to-back) axis along the
// snake's body — 0 for a vertical snake, 90 for a horizontal one. Glossy
// cartoon styling to match the frog/snake pieces: a leather seat with a raised
// cantle and front horn, gold trim and stitching, and a soft highlight.
export const SaddleMark = ({ cx, cy, scale = 1, rotate = 0 }) => {
  const gid = `sdl${Math.round(cx)}_${Math.round(cy)}_${rotate}`
  const skirt = 'M0,-22 C11,-22 18,-15 18,-6 C18,3 17,13 12,20 C8,24 4,23 0,23 C-4,23 -8,24 -12,20 C-17,13 -18,3 -18,-6 C-18,-15 -11,-22 0,-22 Z'
  const seat = 'M0,-14 C7,-14 12,-8 12,-1 C12,8 8,18 0,19 C-8,18 -12,8 -12,-1 C-12,-8 -7,-14 0,-14 Z'
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rotate}) scale(${scale})`} className="snake-saddle">
      <defs>
        <radialGradient id={`${gid}-l`} cx="42%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#b56a3a" />
          <stop offset="55%" stopColor="#8a3d12" />
          <stop offset="100%" stopColor="#4d2308" />
        </radialGradient>
        <radialGradient id={`${gid}-s`} cx="44%" cy="28%" r="82%">
          <stop offset="0%" stopColor="#e0975a" />
          <stop offset="50%" stopColor="#a8531c" />
          <stop offset="100%" stopColor="#67300e" />
        </radialGradient>
        <linearGradient id={`${gid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#d4961f" />
        </linearGradient>
      </defs>

      {/* Drop shadow */}
      <ellipse cx="0" cy="3" rx="18" ry="23" fill="#000" opacity="0.18" />

      {/* Skirt / under-leather */}
      <path d={skirt} fill={`url(#${gid}-l)`} stroke="#3d1c06" strokeWidth="1.6" strokeLinejoin="round" />
      {/* Gold border just inside the skirt */}
      <path d="M0,-18 C9,-18 15,-12 15,-4 C15,3 14,11 10,17 C7,20 4,19 0,19 C-4,19 -7,20 -10,17 C-14,11 -15,3 -15,-4 C-15,-12 -9,-18 0,-18 Z"
        fill="none" stroke={`url(#${gid}-g)`} strokeWidth="1.4" opacity="0.85" />

      {/* Seat */}
      <path d={seat} fill={`url(#${gid}-s)`} stroke="#5b2c0a" strokeWidth="1.3" strokeLinejoin="round" />
      {/* Stitching */}
      <path d="M0,-10 C6,-10 9,-5 9,1 C9,8 6,15 0,16 C-6,15 -9,8 -9,1 C-9,-5 -6,-10 0,-10 Z"
        fill="none" stroke="#f7d6a3" strokeWidth="0.8" strokeDasharray="1.6 1.9" opacity="0.7" />

      {/* Cantle — raised back rim */}
      <path d="M-12,6 C-9,16 -4,20 0,20 C4,20 9,16 12,6" fill="none" stroke="#67300e" strokeWidth="5" strokeLinecap="round" />
      <path d="M-10.5,6 C-8,14 -4,18 0,18 C4,18 8,14 10.5,6" fill="none" stroke={`url(#${gid}-g)`} strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />

      {/* Swell + horn at the front */}
      <path d="M-9,-8 C-6,-14 -3,-16 0,-16 C3,-16 6,-14 9,-8" fill="none" stroke="#67300e" strokeWidth="4.5" strokeLinecap="round" />
      <ellipse cx="0" cy="-15.5" rx="4" ry="3.4" fill="#7a3a12" stroke="#3d1c06" strokeWidth="1" />
      <ellipse cx="-1" cy="-16.6" rx="1.6" ry="0.9" fill="#fff" opacity="0.4" />

      {/* Glossy seat highlight */}
      <ellipse cx="-3.5" cy="-3" rx="5.5" ry="3.6" fill="#fff" opacity="0.22" />
    </g>
  )
}

// Cartoony glossy Vertical Snake SVG component
// Pick the sprite for a snake of the given length (2-5, clamped). The _saddle
// variant carries the drawn-on saddle for a rideable snake (length 3+).
const snakeSprite = (length, saddle) => {
  const L = Math.max(2, Math.min(5, length))
  // Saddled snakes use the straight-body variant; plain snakes the wavy one.
  return '/art/snake' + L + (saddle && length >= 3 ? '_saddle' : '') + '.png'
}

// The saddle is a separate overlay (matching the iOS renderer) sitting on the
// snake's middle segment. Centered at (cx, cy); `rotate` aligns it to the
// snake's axis (0 for vertical, 90 for horizontal).
const SaddleImage = ({ cx, cy, rotate = 0, sz = 38 }) => (
  <image
    href="/art/saddle.png"
    x={cx - sz / 2}
    y={cy - sz / 2}
    width={sz}
    height={sz}
    preserveAspectRatio="xMidYMid meet"
    transform={rotate ? `rotate(${rotate} ${cx} ${cy})` : undefined}
  />
)

export const VerticalSnakeSVG = ({ length = 2, blinkDelay = 0, saddle = false }) => {
  const viewHeight = length * 50
  const showSaddle = saddle && length >= 3
  return (
    <svg viewBox={"0 0 40 " + viewHeight} className="snake-svg">
      <image href={snakeSprite(length, saddle)} x="0" y="0" width="40" height={viewHeight} preserveAspectRatio="xMidYMid meet" />
      {showSaddle && <SaddleImage cx={20} cy={Math.floor(length / 2) * 50 + 25} />}
    </svg>
  )
}

// Cartoony glossy Horizontal Snake SVG component
export const HorizontalSnakeSVG = ({ length = 2, blinkDelay = 0, saddle = false }) => {
  const viewWidth = length * 50
  const showSaddle = saddle && length >= 3
  // Sprites are drawn vertically (head at top); rotate 90 degrees so a
  // horizontal snake lies head-to-the-right, matching the iOS renderer.
  return (
    <svg viewBox={"0 0 " + viewWidth + " 40"} className="snake-svg-horizontal">
      <g transform={"translate(" + viewWidth + " 0) rotate(90)"}>
        <image href={snakeSprite(length, saddle)} x="0" y="0" width="40" height={viewWidth} preserveAspectRatio="xMidYMid meet" />
      </g>
      {showSaddle && <SaddleImage cx={Math.floor(length / 2) * 50 + 25} cy={20} rotate={90} />}
    </svg>
  )
}

// MARK: - Wizard portals

const PORTAL_NAMES = ['violet', 'cyan', 'amber', 'pink']
export const portalColorName = (id) => PORTAL_NAMES[((((id | 0) % 4) + 4) % 4)]

// A single portal mouth. `deactivated` grays it out (its partner is blocked by
// a frog, so it can't be used as an exit) — matches the iOS renderer.
export const PortalSVG = ({ color = 0, deactivated = false }) => (
  <svg viewBox="0 0 100 100" className="piece-svg">
    <image
      href={'/art/portal_' + portalColorName(color) + '.png'}
      x="2" y="2" width="96" height="96"
      preserveAspectRatio="xMidYMid meet"
      style={deactivated ? { filter: 'grayscale(1)', opacity: 0.5 } : undefined}
    />
  </svg>
)

// MARK: - Treasure Hunter stones + switches

const TREASURE_NAMES = ['amber', 'ruby', 'sapphire', 'emerald']
export const treasureColorName = (id) => TREASURE_NAMES[((((id | 0) % 4) + 4) % 4)]

// A colored stone. Raised = a tall gem (obstacle, leapt over); flat = an inlaid
// tile (landable ground).
export const StoneSVG = ({ color = 0, raised = false }) => (
  <svg viewBox="0 0 100 100" className="piece-svg">
    <image
      href={'/art/stone_' + treasureColorName(color) + (raised ? '' : '_flat') + '.png'}
      x="0" y="0" width="100" height="100"
      preserveAspectRatio="xMidYMid meet"
    />
  </svg>
)

// A latching switch (pressure plate). Lever flips (rotates 180) when off;
// grayed when disabled (a piece sits on a matching stone).
export const SwitchSVG = ({ color = 0, on = false, disabled = false }) => (
  <svg viewBox="0 0 100 100" className="piece-svg">
    <image
      href={'/art/switch_' + treasureColorName(color) + '.png'}
      x="12" y="12" width="76" height="76"
      preserveAspectRatio="xMidYMid meet"
      transform={on ? undefined : 'rotate(180 50 50)'}
      style={disabled ? { filter: 'grayscale(1)', opacity: 0.55 } : undefined}
    />
  </svg>
)
