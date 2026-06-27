// Convert a generator level (iOS/Swift shape: position objects, snake
// `segments`) into the web app's legacy shape. The website's getInitialState
// (src/App.jsx) does [...frog.position] and reads snake.positions /
// snake.orientation / log.positions, so daily blobs must be in this shape or
// the site throws "position is not iterable". Idempotent: a level already in
// web shape passes through unchanged.

const toArr = (p) => (Array.isArray(p) ? [p[0], p[1]] : [p.col, p.row])

export function toWebLevel(level) {
  return {
    gridSize: level.gridSize,
    frogs: (level.frogs || []).map((f) => ({ position: toArr(f.position), color: f.color || 'green' })),
    snakes: (level.snakes || []).map((s) => {
      const positions = (s.segments || s.positions || []).map(toArr)
      const orientation =
        s.orientation ||
        (positions.length >= 2
          ? positions[0][1] === positions[1][1]
            ? 'horizontal'
            : 'vertical'
          : 'horizontal')
      const out = { positions, orientation }
      if (s.saddle === true) out.saddle = true
      return out
    }),
    // A generator log is a single cell; the web shape stores log cells under
    // `positions` (an array), matching multi-cell logs in hand-authored levels.
    logs: (level.logs || []).map((l) =>
      l.positions ? { positions: l.positions.map(toArr) } : { positions: [toArr(l.position)] }
    ),
    lilyPads: (level.lilyPads || []).map((lp) => ({ position: toArr(lp.position) })),
    par: level.par,
  }
}
