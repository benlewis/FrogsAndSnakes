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
export const FrogSVG = ({ color = 'green' }) => {
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

      {/* Eyes - open (animated via CSS for idle blink) */}
      <g className="frog-eyes-open">
        <ellipse cx="35" cy="24" rx="9" ry="10" fill={colors.outline} />
        <ellipse cx="35" cy="24" rx="8" ry="9" fill={`url(#${id}-eye)`} />
        <ellipse cx="36" cy="25" rx="4" ry="5" fill="#1a1a1a" />
        <circle cx="34" cy="22" r="2.5" fill="white" />
        <ellipse cx="65" cy="24" rx="9" ry="10" fill={colors.outline} />
        <ellipse cx="65" cy="24" rx="8" ry="9" fill={`url(#${id}-eye)`} />
        <ellipse cx="66" cy="25" rx="4" ry="5" fill="#1a1a1a" />
        <circle cx="64" cy="22" r="2.5" fill="white" />
      </g>

      {/* Eyes - closed (eyelid arcs, hidden by default; shown during blink) */}
      <g className="frog-eyes-closed">
        <path d="M27 24 Q35 30 43 24" stroke={colors.outline} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M57 24 Q65 30 73 24" stroke={colors.outline} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Nostrils */}
      <circle cx="44" cy="38" r="2" fill={colors.outline} />
      <circle cx="56" cy="38" r="2" fill={colors.outline} />

      {/* Mouth - closed smile (default) */}
      <path className="frog-mouth-closed" d="M38 45 Q50 52 62 45" stroke={colors.outline} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Idle tongue flick — periodically pokes out past the smile. */}
      <g className="frog-tongue">
        <ellipse cx="50" cy="54" rx="3" ry="5" fill="#ef4444" />
        <ellipse cx="50" cy="55" rx="1.2" ry="3.5" fill="#f87171" opacity="0.7" />
      </g>
      {/* Mouth - open (shown while dragging or jumping) */}
      <g className="frog-mouth-open">
        <ellipse cx="50" cy="47" rx="9" ry="6" fill="#4a0e0e" stroke={colors.outline} strokeWidth="2" />
        <path d="M44 48 Q50 52 56 48" stroke="#ff6b6b" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
      </g>

      {/* Body shine highlights */}
      <ellipse cx="40" cy="50" rx="10" ry="6" fill="white" opacity="0.3" />
      <ellipse cx="38" cy="48" rx="5" ry="3" fill="white" opacity="0.5" />
    </svg>
  )
}

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
export const VerticalSnakeSVG = ({ length = 2, blinkDelay = 0, saddle = false }) => {
  const cellHeight = 50
  const viewHeight = length * cellHeight
  const bodyEnd = viewHeight - 5
  const tailY = viewHeight - 6

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

      {/* Eyes - open (CSS blink animation cross-fades to closed) */}
      <g className="snake-eyes-open" style={{ animationDelay: `${blinkDelay}s` }}>
        <ellipse cx="13" cy="8" rx="5" ry="6" fill="#14532d" />
        <ellipse cx="13" cy="8" rx="4" ry="5" fill="url(#snakeEyeV)" />
        <ellipse cx="14" cy="9" rx="2" ry="3" fill="#1a1a1a" />
        <circle cx="12" cy="7" r="1.5" fill="white" />
        <ellipse cx="27" cy="8" rx="5" ry="6" fill="#14532d" />
        <ellipse cx="27" cy="8" rx="4" ry="5" fill="url(#snakeEyeV)" />
        <ellipse cx="28" cy="9" rx="2" ry="3" fill="#1a1a1a" />
        <circle cx="26" cy="7" r="1.5" fill="white" />
      </g>
      <g className="snake-eyes-closed" style={{ animationDelay: `${blinkDelay}s` }}>
        <path d="M8 8 Q13 11 18 8" stroke="#14532d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M22 8 Q27 11 32 8" stroke="#14532d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Nostrils */}
      <circle cx="16" cy="14" r="1.5" fill="#14532d" />
      <circle cx="24" cy="14" r="1.5" fill="#14532d" />

      {/* Tongue */}
      <path className="snake-tongue" d="M20 -2 L20 -6 L17 -10 M20 -6 L23 -10" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Smile */}
      <path d="M15 16 Q20 19 25 16" stroke="#14532d" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* Tail */}
      <path d={`M20 ${tailY} Q23 ${tailY + 3} 21 ${tailY + 5} Q19 ${tailY + 6} 18 ${tailY + 4}`} stroke="#14532d" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Saddle on the middle segment (length 3+ only) */}
      {saddle && length >= 3 && (
        <SaddleMark cx={20} cy={Math.floor(length / 2) * cellHeight + cellHeight / 2} scale={1} rotate={0} />
      )}
    </svg>
  )
}

// Cartoony glossy Horizontal Snake SVG component
export const HorizontalSnakeSVG = ({ length = 2, blinkDelay = 0, saddle = false }) => {
  const cellWidth = 50
  const viewWidth = length * cellWidth
  const bodyEnd = viewWidth - 18
  const headX = viewWidth - 10

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

      {/* Eyes - open (CSS blink animation cross-fades to closed) */}
      <g className="snake-eyes-open" style={{ animationDelay: `${blinkDelay}s` }}>
        <ellipse cx={headX + 2} cy="13" rx="6" ry="5" fill="#14532d" />
        <ellipse cx={headX + 2} cy="13" rx="5" ry="4" fill="url(#snakeEyeH)" />
        <ellipse cx={headX + 3} cy="14" rx="3" ry="2" fill="#1a1a1a" />
        <circle cx={headX + 1} cy="12" r="1.5" fill="white" />
        <ellipse cx={headX + 2} cy="27" rx="6" ry="5" fill="#14532d" />
        <ellipse cx={headX + 2} cy="27" rx="5" ry="4" fill="url(#snakeEyeH)" />
        <ellipse cx={headX + 3} cy="28" rx="3" ry="2" fill="#1a1a1a" />
        <circle cx={headX + 1} cy="26" r="1.5" fill="white" />
      </g>
      <g className="snake-eyes-closed" style={{ animationDelay: `${blinkDelay}s` }}>
        <path d={`M${headX - 3} 13 Q${headX + 2} 16 ${headX + 7} 13`} stroke="#14532d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d={`M${headX - 3} 27 Q${headX + 2} 30 ${headX + 7} 27`} stroke="#14532d" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Nostrils */}
      <circle cx={headX + 8} cy="17" r="1.5" fill="#14532d" />
      <circle cx={headX + 8} cy="23" r="1.5" fill="#14532d" />

      {/* Tongue */}
      <path className="snake-tongue" d={`M${headX + 12} 20 L${headX + 16} 20 L${headX + 20} 17 M${headX + 16} 20 L${headX + 20} 23`} stroke="#ef4444" strokeWidth="2" strokeLinecap="round" fill="none" />

      {/* Tail */}
      <path d="M6 20 Q3 22 1 21 Q-1 20 1 19 Q3 18 6 20" stroke="#14532d" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Saddle on the middle segment (length 3+ only) */}
      {saddle && length >= 3 && (
        <SaddleMark cx={Math.floor(length / 2) * cellWidth + cellWidth / 2} cy={20} scale={1} rotate={90} />
      )}
    </svg>
  )
}
