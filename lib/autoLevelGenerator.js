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
// for the solver's hot loop (col, row each 0..6 on the 7x7 Expert board,
// so the index fits comfortably below 56). We avoid 64-bit bitboards
// because JS bitwise ops are only 32-bit; instead the visited-set key is a
// compact sorted string, which still collapses the two symmetries that
// dominate the search space (see canonicalKey).

// MARK: - Themes (mirror AutoLevelGenerator.Theme)

export const THEMES = {
  auto1: {
    gridSize: 5,
    frogCount: [1, 1],
    snakeCount: [1, 3],
    logCount: [1, 5],
    lilyPadCount: [1, 2],
    snakeLength: [2, 4],
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
    parRange: [25, 30],
    maxBFSNodes: 300_000,
    maxAttemptsPerLevel: 4000,
    minTotalFrogToPadDistance: 8,
  },
  auto6: {
    gridSize: 7,
    frogCount: [2, 4],
    snakeCount: [2, 5],
    logCount: [1, 8],
    lilyPadCount: [2, 4],
    snakeLength: [2, 4],
    parRange: [30, 50],
    maxBFSNodes: 400_000,
    maxAttemptsPerLevel: 6000,
    minTotalFrogToPadDistance: 12,
  },
};

export const THEME_KEYS = ['auto1', 'auto2', 'auto3', 'auto4', 'auto5', 'auto6'];

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

function solvePar(gridSize, frogCells, snakeCellsList, logCells, padCells, maxDepth, maxNodes, deadlineMs) {
  const logSet = new Set(logCells);
  const padSet = new Set(padCells);

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

    // Frog moves
    for (let fi = 0; fi < frogs.length; fi++) {
      const cell = frogs[fi];
      const fc = colOf(cell);
      const fr = rowOf(cell);

      for (const [dc, dr] of dirs) {
        let c = fc + dc;
        let r = fr + dr;
        let jumped = false;
        while (c >= 0 && c < gridSize && r >= 0 && r < gridSize) {
          const here = cellOf(c, r);
          if (isJumpover(here)) {
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
          const key = canonicalKey(frogs, newSnakes);
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ frogs, snakes: newSnakes, depth: depth + 1 });
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

  // Bound BFS depth a few moves past the max accepted par.
  const depthCap = theme.parRange[1] + 2;
  const par = solvePar(n, frogCells, snakeCells, logCells, padCells, depthCap, theme.maxBFSNodes, deadlineMs);
  if (par < theme.parRange[0] || par > theme.parRange[1]) return null;

  return toSwiftLevel(n, frogCells, snakeCells, logCells, padCells, par);
}

// MARK: - Swift Level JSON shape

function pos(cell) {
  return { col: colOf(cell), row: rowOf(cell) };
}

function toSwiftLevel(gridSize, frogCells, snakeCells, logCells, padCells, par) {
  return {
    gridSize,
    frogs: frogCells.map((c, i) => ({ id: i, position: pos(c), facing: 'up' })),
    snakes: snakeCells.map((segs, i) => ({ id: i, segments: segs.map(pos) })),
    logs: logCells.map((c) => ({ position: pos(c) })),
    lilyPads: padCells.map((c) => ({ position: pos(c) })),
    par,
    targetTimeMs: null,
    instructions: null,
  };
}

// MARK: - Public API

/**
 * Generates a single accepted level for the given theme key, or null if no
 * valid layout was found within the theme's attempt budget.
 */
export function generateLevel(themeKey, deadlineMs) {
  const theme = THEMES[themeKey];
  if (!theme) return null;
  let attempts = theme.maxAttemptsPerLevel;
  while (attempts-- > 0) {
    if (deadlineMs !== undefined && Date.now() > deadlineMs) return null;
    const level = tryGenerate(theme, deadlineMs);
    if (level) return level;
  }
  return null;
}

/**
 * Generates accepted levels for `themeKey` until either `count` are
 * produced or `deadlineMs` (epoch ms from Date.now()) is reached. Returns
 * the array produced so far. Used by the cron so a single invocation can
 * stop cleanly before the serverless timeout.
 */
export function generateLevelsUntil(themeKey, count, deadlineMs) {
  const theme = THEMES[themeKey];
  if (!theme) return [];
  const out = [];
  while (out.length < count && Date.now() < deadlineMs) {
    const level = tryGenerate(theme, deadlineMs);
    if (level) out.push(level);
  }
  return out;
}
