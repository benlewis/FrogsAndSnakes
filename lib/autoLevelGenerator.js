// Procedural Auto-chapter level generator (server side).
//
// This is a faithful JavaScript port of the iOS app's Swift generator
// (AutoLevelGenerator.swift) and its bitboard BFS solver
// (GameRules.findHint). It exists so we can pre-generate a large pool of
// levels on the server (via a Vercel cron) and have phones download them,
// rather than burning battery solving BFS on-device.
//
// IMPORTANT: the output JSON must match the Swift `Level` Codable shape
// exactly, because the iOS app decodes these directly:
//
//   {
//     gridSize: Int,
//     frogs:    [{ id, position: { col, row }, facing: "up" }],
//     snakes:   [{ id, segments: [{ col, row }, ...] }],
//     logs:     [{ position: { col, row } }],
//     lilyPads: [{ position: { col, row } }],
//     par:      Int,
//     targetTimeMs: null,
//     instructions: null
//   }
//
// Positions are packed into a single integer cell index `col * 8 + row`
// for the solver's hot loop (col, row each 0..6 on the largest 7x7 board,
// so the index fits comfortably below 56). We avoid 64-bit bitboards
// because JS bitwise ops are only 32-bit; instead the visited-set key is a
// compact sorted string, which still collapses the two symmetries that
// dominate the search space (see canonicalKey).

// MARK: - Themes (mirror AutoLevelGenerator.Theme)
//
// These are the built-in defaults. The admin can override any field per
// tier; overrides are stored in the auto_level_config table and merged
// over these at generation time (see api/_autoPool.js getEffectiveConfig).

import { solveLevel } from '../src/solver.js';

export const DEFAULT_THEMES = {
  auto1: {
    gridSize: 5,
    frogCount: [1, 1],
    snakeCount: [1, 3],
    logCount: [1, 5],
    lilyPadCount: [1, 2],
    snakeLength: [2, 4],
    saddles: true,
    parRange: [6, 7],
    maxBFSNodes: 60_000,
    maxAttemptsPerLevel: 400,
    minTotalFrogToPadDistance: null,
  },
  auto2: {
    gridSize: 5,
    frogCount: [1, 3],
    snakeCount: [1, 4],
    logCount: [1, 5],
    lilyPadCount: [1, 3],
    snakeLength: [2, 4],
    saddles: true,
    parRange: [11, 14],
    maxBFSNodes: 200_000,
    maxAttemptsPerLevel: 800,
    minTotalFrogToPadDistance: null,
  },
  auto3: {
    gridSize: 5,
    frogCount: [1, 3],
    snakeCount: [1, 4],
    logCount: [1, 6],
    lilyPadCount: [1, 3],
    snakeLength: [2, 4],
    saddles: true,
    parRange: [15, 17],
    maxBFSNodes: 250_000,
    maxAttemptsPerLevel: 3000,
    minTotalFrogToPadDistance: null,
  },
  auto4: {
    gridSize: 6,
    frogCount: [1, 3],
    snakeCount: [1, 4],
    logCount: [1, 7],
    lilyPadCount: [1, 3],
    snakeLength: [2, 4],
    saddles: true,
    parRange: [20, 25],
    maxBFSNodes: 250_000,
    maxAttemptsPerLevel: 2500,
    minTotalFrogToPadDistance: null,
  },
  auto5: {
    gridSize: 7,
    frogCount: [2, 3],
    snakeCount: [1, 5],
    logCount: [1, 8],
    lilyPadCount: [2, 3],
    snakeLength: [2, 4],
    saddles: true,
    parRange: [25, 30],
    maxBFSNodes: 300_000,
    maxAttemptsPerLevel: 4000,
    minTotalFrogToPadDistance: 8,
    // Slow to generate, so stockpile fewer than the cheap tiers.
    defaultTarget: 50,
  },
  auto6: {
    gridSize: 6,
    frogCount: [2, 4],
    snakeCount: [2, 5],
    logCount: [1, 8],
    lilyPadCount: [2, 4],
    snakeLength: [2, 4],
    saddles: true,
    parRange: [30, 60],
    maxBFSNodes: 400_000,
    maxAttemptsPerLevel: 6000,
    minTotalFrogToPadDistance: 12,
    // The most expensive tier to generate — keep a smaller stockpile target.
    defaultTarget: 30,
  },
  // "Cowboy" — every level carries a rideable saddle (a frog boards the
  // snake's middle, rides it into place, then hops off). snakeLength 3–4 keeps
  // every snake saddle-eligible. This is the standing range for cron top-ups;
  // the curated curriculum (teaching levels + 10–15 / 15–20 / 20+ bands) is
  // seeded by scripts/seed-cowboy-pool.js.
  cowboy: {
    gridSize: 7,
    frogCount: [1, 2],
    snakeCount: [2, 4],
    logCount: [2, 7],
    lilyPadCount: [1, 3],
    snakeLength: [3, 4],
    saddles: true,
    parRange: [12, 26],
    maxBFSNodes: 400_000,
    maxAttemptsPerLevel: 6000,
    minTotalFrogToPadDistance: 8,
    defaultTarget: 60,
  },
  // "Wizard" — every level requires hopping through a portal pair to reach an
  // otherwise-isolated pad. Constructed + validated (see generateWizardLevel).
  wizard: {
    gridSize: 6,
    mechanic: 'wizard',
    parRange: [2, 12],
    maxAttemptsPerLevel: 4000,
    defaultTarget: 30,
  },
  // "Treasure Hunter" — a frog latches a pressure-plate switch to raise a stone
  // its teammate must leap. Constructed + validated (see generateTreasureLevel).
  treasure: {
    gridSize: 6,
    mechanic: 'treasure',
    parRange: [3, 14],
    maxAttemptsPerLevel: 4000,
    defaultTarget: 30,
  },
};

// Backwards-compatible alias.
export const THEMES = DEFAULT_THEMES;

export const THEME_KEYS = ['auto1', 'auto2', 'auto3', 'auto4', 'auto5', 'auto6', 'cowboy'];

// User-facing tier names, for admin display.
export const THEME_TITLES = {
  auto1: 'Easy',
  auto2: 'Medium',
  auto3: 'Hard',
  auto4: 'Very Hard',
  auto5: 'Extra Hard',
  auto6: 'Expert',
  cowboy: 'Cowboy',
};

// Hand-crafted teaching levels that open the Cowboy tier (ported from the iOS
// CowboyChapter "ferry" levels). Each genuinely requires the ride: board the
// saddle, slide the snake beside the log, then hop over the log to the pad —
// you can't jump over the snake you're riding. Stored in the iOS `Level` JSON
// shape (par verified by the solver in the seeder). Seeded first so the pool's
// oldest-first ordering opens with the tutorial.
export const COWBOY_TEACHING_LEVELS = [
  {
    gridSize: 7,
    frogs: [{ id: 0, position: { col: 0, row: 4 }, facing: 'up' }],
    snakes: [{ id: 0, segments: [{ col: 1, row: 4 }, { col: 2, row: 4 }, { col: 3, row: 4 }], saddle: true }],
    logs: [{ position: { col: 5, row: 3 } }],
    lilyPads: [{ position: { col: 5, row: 2 } }],
    par: 3,
    targetTimeMs: null,
    instructions: "Snakes with a saddle can be ridden. Hop on, slide the snake beside the log, then hop off to the pad — you can't jump over the snake you're riding.",
  },
  {
    gridSize: 7,
    frogs: [{ id: 0, position: { col: 0, row: 2 }, facing: 'up' }],
    snakes: [{ id: 0, segments: [{ col: 1, row: 2 }, { col: 2, row: 2 }, { col: 3, row: 2 }], saddle: true }],
    logs: [{ position: { col: 5, row: 3 } }],
    lilyPads: [{ position: { col: 5, row: 4 } }],
    par: 3,
    targetTimeMs: null,
    instructions: 'Board the saddle, ride to the right, then hop down to the pad.',
  },
  {
    gridSize: 7,
    frogs: [{ id: 0, position: { col: 6, row: 3 }, facing: 'up' }],
    snakes: [{ id: 0, segments: [{ col: 5, row: 3 }, { col: 4, row: 3 }, { col: 3, row: 3 }], saddle: true }],
    logs: [{ position: { col: 1, row: 2 } }],
    lilyPads: [{ position: { col: 1, row: 1 } }],
    par: 3,
    targetTimeMs: null,
    instructions: 'Ride the other way: board from the right, slide left past the log, and hop up.',
  },
];

// The ordered list of editable theme fields and their kinds, so the admin
// UI and the config validator agree on the shape without duplicating it.
//   range  → [lo, hi] pair of ints
//   int    → single int
//   intOrNull → single int or null (disabled)
export const THEME_FIELD_SPEC = [
  { key: 'gridSize', kind: 'int', min: 3, max: 10 },
  { key: 'frogCount', kind: 'range', min: 1, max: 12 },
  { key: 'snakeCount', kind: 'range', min: 0, max: 12 },
  { key: 'logCount', kind: 'range', min: 0, max: 20 },
  { key: 'lilyPadCount', kind: 'range', min: 1, max: 12 },
  { key: 'snakeLength', kind: 'range', min: 2, max: 7 },
  { key: 'parRange', kind: 'range', min: 1, max: 200 },
  { key: 'maxBFSNodes', kind: 'int', min: 1000, max: 5_000_000 },
  { key: 'maxAttemptsPerLevel', kind: 'int', min: 1, max: 100_000 },
  { key: 'minTotalFrogToPadDistance', kind: 'intOrNull', min: 0, max: 100 },
  // When on (default), generation puts a rideable saddle on one eligible
  // (length-3+) snake; the BFS par accounts for the ride.
  { key: 'saddles', kind: 'bool' },
];

// MARK: - Cell packing helpers

const cellOf = (col, row) => col * 8 + row;
const colOf = (cell) => cell >> 3;
const rowOf = (cell) => cell & 7;

const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

// MARK: - Solver (port of GameRules.findHint bitboard BFS)
//
// Returns the minimum number of moves to win, or -1 if unsolvable within
// the depth/node caps. We only need the move count (par), so unlike the
// Swift version we don't track the first move.

function canonicalKey(frogCells, snakeCellsList) {
  // Frogs are interchangeable (the win condition only cares that each
  // frog sits on a distinct pad), so sort their cells. Same-shape snakes
  // are interchangeable too, so sort each snake's cells and then sort the
  // snakes against each other. This collapses the permutation symmetry
  // that otherwise blows the search up by N! in the frog count.
  const frogs = frogCells.slice().sort((a, b) => a - b);
  const snakes = snakeCellsList.map((s) => s.slice().sort((a, b) => a - b));
  snakes.sort((a, b) => {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return a.length - b.length;
  });

  let key = frogs.join(',') + '|';
  for (const s of snakes) key += s.join('.') + ';';
  return key;
}

function solvePar(gridSize, frogCells, snakeCellsList, logCells, padCells, maxDepth, maxNodes, deadlineMs, snakeSaddled = []) {
  const logSet = new Set(logCells);
  const padSet = new Set(padCells);
  // Middle-segment index of each snake (where a saddle sits). Static: snake
  // lengths never change during the search.
  const snakeMid = snakeCellsList.map((segs) => segs.length >> 1);

  const isWin = (frogs) => {
    for (const c of frogs) if (!padSet.has(c)) return false;
    return true;
  };

  if (isWin(frogCells)) return 0;

  // Queue entries: { frogs: int[], snakes: int[][], depth }
  const queue = [{ frogs: frogCells, snakes: snakeCellsList, depth: 0 }];
  let head = 0;
  const visited = new Set();
  visited.add(canonicalKey(frogCells, snakeCellsList));

  const dirs = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ];

  while (head < queue.length) {
    if (queue.length > maxNodes) return -1;
    // Wall-clock guard: a single Expert BFS that runs to the node cap can
    // take many seconds, so we check the deadline periodically and bail
    // (treated as a rejection) rather than risk overrunning the cron's
    // serverless timeout mid-attempt.
    if (deadlineMs !== undefined && (head & 8191) === 0 && Date.now() > deadlineMs) return -1;
    const node = queue[head++];
    const { frogs, snakes, depth } = node;

    if (depth >= maxDepth) continue;

    // Occupancy: jumpover = frogs ∪ snakes ∪ logs (NOT lily pads — a bare
    // pad cannot be jumped over, but can be landed on; matches Swift).
    const frogSet = new Set(frogs);
    const snakeSet = new Set();
    for (const s of snakes) for (const c of s) snakeSet.add(c);

    const isJumpover = (cell) => frogSet.has(cell) || snakeSet.has(cell) || logSet.has(cell);

    // Saddle (middle) cell of each saddled snake -> the snake's orientation
    // (true = horizontal). A frog may land here after a jump and then ride, but
    // only when boarding PERPENDICULAR to the snake (a horizontal snake can only
    // be boarded by a vertical jump, and vice versa), matching the runtime rule
    // in gameRules.getValidFrogMoves.
    const saddleHorizontal = new Map();
    for (let si = 0; si < snakes.length; si++) {
      if (!snakeSaddled[si]) continue;
      const segs = snakes[si];
      const horizontal = segs.length >= 2 ? rowOf(segs[0]) === rowOf(segs[1]) : true;
      saddleHorizontal.set(segs[snakeMid[si]], horizontal);
    }

    // Frog moves
    for (let fi = 0; fi < frogs.length; fi++) {
      const cell = frogs[fi];
      const fc = colOf(cell);
      const fr = rowOf(cell);

      // If this frog rides a saddle, the snake it's on is its mount: it can't
      // jump over its own mount, so those cells are walls.
      let mountSet = null;
      for (let si = 0; si < snakes.length; si++) {
        if (snakeSaddled[si] && snakes[si][snakeMid[si]] === cell) {
          mountSet = new Set(snakes[si]);
          break;
        }
      }

      for (const [dc, dr] of dirs) {
        let c = fc + dc;
        let r = fr + dr;
        let jumped = false;
        while (c >= 0 && c < gridSize && r >= 0 && r < gridSize) {
          const here = cellOf(c, r);
          if (mountSet && mountSet.has(here)) break;
          if (isJumpover(here)) {
            // A free saddle is landable after a jump — but only when boarded
            // perpendicular to the snake. It's still jump-over-able either way,
            // so the scan continues past it regardless.
            if (jumped && saddleHorizontal.has(here) && !frogSet.has(here)) {
              const jumpIsVertical = dc === 0;
              const boardable = saddleHorizontal.get(here) ? jumpIsVertical : !jumpIsVertical;
              if (boardable) {
                const newFrogs = frogs.slice();
                newFrogs[fi] = here;
                const key = canonicalKey(newFrogs, snakes);
                if (!visited.has(key)) {
                  visited.add(key);
                  queue.push({ frogs: newFrogs, snakes, depth: depth + 1 });
                }
              }
            }
            jumped = true;
          } else {
            // Bare lily pad or empty cell: landable iff we've jumped, and
            // the scan stops here either way.
            if (jumped) {
              const newFrogs = frogs.slice();
              newFrogs[fi] = here;
              if (isWin(newFrogs)) return depth + 1;
              const key = canonicalKey(newFrogs, snakes);
              if (!visited.has(key)) {
                visited.add(key);
                queue.push({ frogs: newFrogs, snakes, depth: depth + 1 });
              }
            }
            break;
          }
          c += dc;
          r += dr;
        }
      }
    }

    // Snake moves
    for (let si = 0; si < snakes.length; si++) {
      const segs = snakes[si];
      if (segs.length < 2) continue;

      const own = new Set(segs);
      // Blockers: every other piece, including all lily pads, minus this
      // snake's own cells.
      const blocked = (cell) =>
        !own.has(cell) &&
        (frogSet.has(cell) || snakeSet.has(cell) || logSet.has(cell) || padSet.has(cell));

      const horizontal = rowOf(segs[0]) === rowOf(segs[1]);
      const snakeDirs = horizontal
        ? [
            [-1, 0],
            [1, 0],
          ]
        : [
            [0, -1],
            [0, 1],
          ];

      for (const [dc, dr] of snakeDirs) {
        let offset = 1;
        while (true) {
          const newSegs = new Array(segs.length);
          let inBounds = true;
          for (let k = 0; k < segs.length; k++) {
            const nc = colOf(segs[k]) + dc * offset;
            const nr = rowOf(segs[k]) + dr * offset;
            if (nc < 0 || nc >= gridSize || nr < 0 || nr >= gridSize) {
              inBounds = false;
              break;
            }
            newSegs[k] = cellOf(nc, nr);
          }
          if (!inBounds) break;

          // Only the cells newly entered need to clear blockers.
          let collides = false;
          for (const c of newSegs) {
            if (blocked(c)) {
              collides = true;
              break;
            }
          }
          if (collides) break;

          const newSnakes = snakes.slice();
          newSnakes[si] = newSegs;

          // A frog riding this snake's saddle slides along to the new middle.
          let nextFrogs = frogs;
          if (snakeSaddled[si]) {
            const oldMid = segs[snakeMid[si]];
            const newMid = newSegs[snakeMid[si]];
            if (oldMid !== newMid) {
              for (let fi = 0; fi < frogs.length; fi++) {
                if (frogs[fi] === oldMid) {
                  if (nextFrogs === frogs) nextFrogs = frogs.slice();
                  nextFrogs[fi] = newMid;
                }
              }
            }
          }

          const key = canonicalKey(nextFrogs, newSnakes);
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ frogs: nextFrogs, snakes: newSnakes, depth: depth + 1 });
          }
          offset += 1;
        }
      }
    }
  }

  return -1;
}

// MARK: - Placement + acceptance (port of tryGenerate)

function randomFreeCell(gridSize, occupied) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const c = Math.floor(Math.random() * gridSize);
    const r = Math.floor(Math.random() * gridSize);
    const cell = cellOf(c, r);
    if (!occupied.has(cell)) return cell;
  }
  return -1;
}

function placeSnake(gridSize, occupied, lengthRange) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const length = randInt(lengthRange[0], lengthRange[1]);
    const horizontal = Math.random() < 0.5;
    const maxCol = horizontal ? gridSize - length : gridSize - 1;
    const maxRow = horizontal ? gridSize - 1 : gridSize - length;
    if (maxCol < 0 || maxRow < 0) continue;
    const col = randInt(0, maxCol);
    const row = randInt(0, maxRow);
    const segs = [];
    for (let k = 0; k < length; k++) {
      segs.push(horizontal ? cellOf(col + k, row) : cellOf(col, row + k));
    }
    if (segs.every((c) => !occupied.has(c))) {
      for (const c of segs) occupied.add(c);
      return segs;
    }
  }
  return null;
}

function tryGenerate(theme, deadlineMs) {
  const n = theme.gridSize;
  const frogCount = randInt(theme.frogCount[0], theme.frogCount[1]);
  const snakeCount = randInt(theme.snakeCount[0], theme.snakeCount[1]);
  const logCount = randInt(theme.logCount[0], theme.logCount[1]);
  // Need at least one pad per frog for a win to be possible.
  const lilyPadCount = Math.max(frogCount, randInt(theme.lilyPadCount[0], theme.lilyPadCount[1]));

  const occupied = new Set();

  const padCells = [];
  for (let i = 0; i < lilyPadCount; i++) {
    const cell = randomFreeCell(n, occupied);
    if (cell < 0) return null;
    padCells.push(cell);
    occupied.add(cell);
  }

  const frogCells = [];
  for (let i = 0; i < frogCount; i++) {
    const cell = randomFreeCell(n, occupied);
    if (cell < 0) return null;
    frogCells.push(cell);
    occupied.add(cell);
  }

  // Cheap pre-filter for the hard tiers: bail before BFS if frogs and pads
  // landed close together (those almost never reach the par window).
  if (theme.minTotalFrogToPadDistance != null) {
    let total = 0;
    for (const f of frogCells) {
      let nearest = Infinity;
      for (const p of padCells) {
        const d = Math.abs(colOf(p) - colOf(f)) + Math.abs(rowOf(p) - rowOf(f));
        if (d < nearest) nearest = d;
      }
      if (nearest !== Infinity) total += nearest;
    }
    if (total < theme.minTotalFrogToPadDistance) return null;
  }

  const snakeCells = [];
  for (let i = 0; i < snakeCount; i++) {
    const segs = placeSnake(n, occupied, theme.snakeLength);
    if (!segs) return null;
    snakeCells.push(segs);
  }

  const logCells = [];
  for (let i = 0; i < logCount; i++) {
    const cell = randomFreeCell(n, occupied);
    if (cell < 0) return null;
    logCells.push(cell);
    occupied.add(cell);
  }

  // When saddles are enabled (default), make one eligible (length-3+) snake
  // rideable so the BFS par accounts for the ride. A saddle only adds frog
  // options, so it can't turn a solvable board unsolvable.
  const snakeSaddled = snakeCells.map(() => false);
  if (theme.saddles !== false) {
    const eligible = [];
    for (let i = 0; i < snakeCells.length; i++) {
      if (snakeCells[i].length >= 3) eligible.push(i);
    }
    if (eligible.length > 0) {
      snakeSaddled[eligible[randInt(0, eligible.length - 1)]] = true;
    }
  }

  // Bound BFS depth a few moves past the max accepted par.
  const depthCap = theme.parRange[1] + 2;
  const par = solvePar(n, frogCells, snakeCells, logCells, padCells, depthCap, theme.maxBFSNodes, deadlineMs, snakeSaddled);
  if (par < theme.parRange[0] || par > theme.parRange[1]) return null;

  return toSwiftLevel(n, frogCells, snakeCells, logCells, padCells, par, snakeSaddled);
}

// MARK: - Swift Level JSON shape

function pos(cell) {
  return { col: colOf(cell), row: rowOf(cell) };
}

function toSwiftLevel(gridSize, frogCells, snakeCells, logCells, padCells, par, snakeSaddled = []) {
  return {
    gridSize,
    frogs: frogCells.map((c, i) => ({ id: i, position: pos(c), facing: 'up' })),
    // `saddle` is omitted unless true, matching the iOS Snake Codable's
    // optional-and-omitted-when-nil field.
    snakes: snakeCells.map((segs, i) =>
      snakeSaddled[i]
        ? { id: i, segments: segs.map(pos), saddle: true }
        : { id: i, segments: segs.map(pos) }
    ),
    logs: logCells.map((c) => ({ position: pos(c) })),
    lilyPads: padCells.map((c) => ({ position: pos(c) })),
    par,
    targetTimeMs: null,
    instructions: null,
  };
}

// MARK: - Public API

/**
 * Generates a single accepted level for the given theme key (using the
 * built-in defaults), or null if none found. Convenience wrapper used by
 * the standalone smoke test.
 */
// MARK: - Mechanic level generators (Wizard portals, Treasure Hunter stones)
//
// Unlike the base themes (random placement validated by the bitboard solvePar),
// these CONSTRUCT a skeleton that requires the mechanic, then validate it with
// the shared runtime solver (src/solver.js): the level must be solvable, and
// UNSOLVABLE once the mechanic is removed. Output is in web shape ([col,row]
// positions) — toWebLevel is a no-op on it.

// One of 8 grid symmetries, for visual variety.
function gridSymmetry(t, n) {
  return ([c, r]) => {
    let x = c, y = r;
    if (t & 1) x = n - 1 - x;
    if (t & 2) y = n - 1 - y;
    if (t & 4) { const tmp = x; x = y; y = tmp; }
    return [x, y];
  };
}

function webSolve(level, overrides = {}) {
  const frogs = level.frogs.map((f) => ({ position: f.position }));
  return solveLevel(level.gridSize, frogs, level.snakes || [], level.logs || [], level.lilyPads || [], {
    trackPath: false,
    portals: level.portals || [],
    stones: level.stones || [],
    pressurePlates: level.pressurePlates || [],
    ...overrides,
  });
}

// Wizard: a frog must hop into a portal to reach an otherwise-isolated pad.
export function generateWizardLevel(gridSize = 6, deadlineMs) {
  const n = Math.max(5, gridSize);
  let attempts = 4000;
  while (attempts-- > 0) {
    if (deadlineMs !== undefined && Date.now() > deadlineMs) return null;
    const T = gridSymmetry(randInt(0, 7), n);
    const F = T([0, 0]), log1 = T([1, 0]), M1 = T([2, 0]);
    const M2 = T([n - 3, n - 1]), log2 = T([n - 2, n - 1]), P = T([n - 1, n - 1]);
    const level = {
      gridSize: n,
      frogs: [{ position: F, color: 'green' }],
      snakes: [],
      logs: [{ positions: [log1] }, { positions: [log2] }],
      lilyPads: [{ position: P }],
      portals: [{ color: 0, positions: [M1, M2] }],
      targetTimeMs: null,
    };
    const withPortal = webSolve(level);
    if (!withPortal.solvable) continue;
    // Must genuinely need the portal: unsolvable once it's removed.
    if (webSolve(level, { portals: [] }).solvable) continue;
    level.par = withPortal.moves;
    return level;
  }
  return null;
}

// Treasure Hunter: frog A latches a plate to raise a stone; frog B leaps the
// now-raised stone to its pad (impossible while the stone is flat).
export function generateTreasureLevel(gridSize = 6, deadlineMs) {
  const n = Math.max(5, gridSize);
  let attempts = 4000;
  while (attempts-- > 0) {
    if (deadlineMs !== undefined && Date.now() > deadlineMs) return null;
    const T = gridSymmetry(randInt(0, 7), n);
    const A = T([0, n - 1]), logA1 = T([1, n - 1]), plate = T([2, n - 1]), logA2 = T([3, n - 1]), padA = T([4, n - 1]);
    const B = T([0, 0]), logB = T([1, 0]), stone = T([2, 0]), padB = T([3, 0]);
    const level = {
      gridSize: n,
      frogs: [{ position: A, color: 'green' }, { position: B, color: 'green' }],
      snakes: [],
      logs: [{ positions: [logA1] }, { positions: [logA2] }, { positions: [logB] }],
      lilyPads: [{ position: padA }, { position: padB }],
      stones: [{ position: stone, color: 0, startsRaised: false }],
      pressurePlates: [{ position: plate, color: 0 }],
      targetTimeMs: null,
    };
    const withSwitch = webSolve(level);
    if (!withSwitch.solvable) continue;
    // Must need the switch: with no plate the stone stays flat and B is stuck.
    if (webSolve(level, { pressurePlates: [] }).solvable) continue;
    level.par = withSwitch.moves;
    return level;
  }
  return null;
}

// Dispatch to a mechanic generator (constructed) or the base random generator.
function generateForTheme(theme, deadlineMs) {
  if (theme.mechanic === 'wizard') return generateWizardLevel(theme.gridSize, deadlineMs);
  if (theme.mechanic === 'treasure') return generateTreasureLevel(theme.gridSize, deadlineMs);
  return tryGenerate(theme, deadlineMs);
}

export function generateLevel(themeKey, deadlineMs) {
  const theme = DEFAULT_THEMES[themeKey];
  if (!theme) return null;
  let attempts = theme.maxAttemptsPerLevel;
  while (attempts-- > 0) {
    if (deadlineMs !== undefined && Date.now() > deadlineMs) return null;
    const level = generateForTheme(theme, deadlineMs);
    if (level) return level;
  }
  return null;
}

/**
 * Generates accepted levels from a fully-resolved theme object (built-in
 * defaults merged with any admin overrides) until either `count` are
 * produced or `deadlineMs` (epoch ms) is reached. Returns the array
 * produced so far. Primary entry point for the server generation pass.
 */
export function generateLevelsFromTheme(theme, count, deadlineMs) {
  if (!theme) return [];
  const out = [];
  while (out.length < count && Date.now() < deadlineMs) {
    const level = generateForTheme(theme, deadlineMs);
    if (level) out.push(level);
  }
  return out;
}

/**
 * Backwards-compatible wrapper: generate from a theme key using defaults.
 */
export function generateLevelsUntil(themeKey, count, deadlineMs) {
  return generateLevelsFromTheme(DEFAULT_THEMES[themeKey], count, deadlineMs);
}
