// Dev server that connects to Vercel Blob storage and local Postgres
// Run with: node dev-server.js

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from 'express';
import cors from 'cors';
import { put, list, del } from '@vercel/blob';
import { query, initializeSchema } from './lib/db.js';

const app = express();
const PORT = 3002;

// Initialize database schema on startup
initializeSchema().catch(console.error);

app.use(cors());
app.use(express.json());

// Prevent caching
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// Get blob prefix based on game type
const getPrefix = (game) => game === 'cj' ? 'cj-level-' : 'level-';

// Simple regex patterns (no lookbehinds for max compatibility)
const LEVEL_PATTERN = /level-(\d{4}-\d{2}-\d{2})-(\w+)\.json/;
const DIFF_PATTERN = /level-\d{4}-\d{2}-\d{2}-(\w+)\.json/;

// Check if a blob pathname belongs to the requested game type
const matchesGame = (pathname, game) => {
  const isCJ = pathname.startsWith('cj-level-') || pathname.includes('/cj-level-');
  return game === 'cj' ? isCJ : !isCJ;
};

// GET /api/levels?date=2025-01-20 or GET /api/levels?all=true or GET /api/levels?date=X&game=cj
app.get('/api/levels', async (req, res) => {
  const { date, all, game } = req.query;
  const prefix = getPrefix(game);

  // If "all" param is set, return all levels
  if (all === 'true') {
    try {
      const { blobs } = await list({ prefix });
      const levels = [];

      for (const blob of blobs) {
        if (!matchesGame(blob.pathname, game)) continue;
        const match = blob.pathname.match(LEVEL_PATTERN);
        if (match) {
          const response = await fetch(blob.url);
          const levelData = await response.json();
          levels.push({
            ...levelData,
            date: match[1],
            difficulty: match[2]
          });
        }
      }

      // Sort by date descending
      levels.sort((a, b) => b.date.localeCompare(a.date));
      return res.json(levels);
    } catch (error) {
      console.error('Error fetching all levels:', error);
      return res.status(500).json({ error: 'Failed to fetch levels' });
    }
  }

  if (!date) {
    return res.status(400).json({ error: 'Date parameter required' });
  }

  try {
    const { blobs } = await list({ prefix: `${prefix}${date}-` });
    const levels = {};

    for (const blob of blobs) {
      if (!matchesGame(blob.pathname, game)) continue;
      const match = blob.pathname.match(DIFF_PATTERN);
      if (match) {
        const difficulty = match[1];
        const response = await fetch(blob.url);
        const levelData = await response.json();
        levels[difficulty] = levelData;
      }
    }

    res.json(levels);
  } catch (error) {
    console.error('Error fetching levels:', error);
    res.status(500).json({ error: 'Failed to fetch levels' });
  }
});

// POST /api/levels
app.post('/api/levels', async (req, res) => {
  const { date, difficulty, level, game } = req.body;

  if (!date || !difficulty || !level) {
    return res.status(400).json({ error: 'Date, difficulty, and level data required' });
  }

  try {
    const prefix = getPrefix(game);
    const filename = `${prefix}${date}-${difficulty}.json`;

    // Delete any existing blobs with this name to avoid caching issues
    const { blobs } = await list({ prefix: filename.replace('.json', '') });
    for (const existingBlob of blobs) {
      try {
        await del(existingBlob.url);
        console.log(`Deleted old blob: ${existingBlob.url}`);
      } catch (e) {
        console.log('Could not delete old blob:', e);
      }
    }

    const blob = await put(filename, JSON.stringify(level), {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 0,
    });

    console.log(`Saved level to Vercel Blob: ${blob.url}`);
    res.json({ success: true, url: blob.url });
  } catch (error) {
    console.error('Error saving level:', error);
    res.status(500).json({ error: 'Failed to save level: ' + error.message });
  }
});

// POST /api/users - Sync user info on login
app.post('/api/users', async (req, res) => {
  const { userId, displayName, email, pictureUrl } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    await query(
      `INSERT INTO users (user_id, display_name, email, picture_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET display_name = $2, email = $3, picture_url = $4, updated_at = CURRENT_TIMESTAMP`,
      [userId, displayName || null, email || null, pictureUrl || null]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// GET /api/auto-level-ratings?themeKey=auto1&minRating=4&limit=10 - Top-rated levels
function clampInt(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

app.get('/api/auto-level-ratings', async (req, res) => {
  const themeKey = String(req.query.themeKey || '').trim();
  const minRating = clampInt(parseInt(req.query.minRating, 10), 1, 5, 4);
  const limit = clampInt(parseInt(req.query.limit, 10), 1, 50, 10);

  if (!themeKey) {
    return res.status(400).json({ error: 'themeKey required' });
  }

  try {
    const result = await query(
      `SELECT level, AVG(rating)::float AS avg_rating, COUNT(*)::int AS rating_count
       FROM auto_level_ratings
       WHERE theme_key = $1 AND rating >= $2
       GROUP BY level
       ORDER BY avg_rating DESC, rating_count DESC
       LIMIT $3`,
      [themeKey, minRating, limit]
    );
    res.json({ levels: result.rows.map((r) => r.level) });
  } catch (error) {
    console.error('Error fetching top rated levels:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

// POST /api/auto-level-ratings - Save a fun rating for a procedurally generated level
app.post('/api/auto-level-ratings', async (req, res) => {
  const { userId, visitorId, themeKey, chapterId, levelIndex, rating, par, moves, level } = req.body || {};
  const finalUserId = userId || visitorId;

  if (!finalUserId || !level || rating === undefined) {
    return res.status(400).json({ error: 'userId/visitorId, rating, and level required' });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
  }

  try {
    await query(
      `INSERT INTO auto_level_ratings
         (user_id, theme_key, chapter_id, level_index, rating, par, moves, level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        finalUserId,
        themeKey || null,
        Number.isInteger(chapterId) ? chapterId : null,
        Number.isInteger(levelIndex) ? levelIndex : null,
        rating,
        Number.isInteger(par) ? par : null,
        Number.isInteger(moves) ? moves : null,
        JSON.stringify(level),
      ]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving auto level rating:', error);
    res.status(500).json({ error: 'Failed to save rating' });
  }
});

// POST /api/stats - Save a completion
const VALID_MODES = new Set(['casual', 'competitive']);
app.post('/api/stats', async (req, res) => {
  const { userId, visitorId, puzzleDate, difficulty, moves, hintsUsed, mode, timeMs } = req.body;
  const finalUserId = userId || visitorId;
  const finalMode = VALID_MODES.has(mode) ? mode : 'casual';
  const finalTimeMs = finalMode === 'competitive' && Number.isFinite(timeMs) ? Math.max(0, Math.round(timeMs)) : null;

  if (!finalUserId || !puzzleDate || !difficulty || moves === undefined) {
    return res.status(400).json({ error: 'userId/visitorId, puzzleDate, difficulty, and moves required' });
  }

  try {
    if (finalMode === 'competitive') {
      await query(
        `INSERT INTO completions (user_id, puzzle_date, difficulty, moves, hints_used, mode, time_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, puzzle_date, difficulty, mode)
         DO UPDATE SET
           time_ms = LEAST(completions.time_ms, EXCLUDED.time_ms),
           moves = CASE WHEN EXCLUDED.time_ms < completions.time_ms THEN EXCLUDED.moves ELSE completions.moves END,
           hints_used = CASE WHEN EXCLUDED.time_ms < completions.time_ms THEN EXCLUDED.hints_used ELSE completions.hints_used END`,
        [finalUserId, puzzleDate, difficulty, moves, hintsUsed || 0, finalMode, finalTimeMs]
      );
    } else {
      await query(
        `INSERT INTO completions (user_id, puzzle_date, difficulty, moves, hints_used, mode)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, puzzle_date, difficulty, mode)
         DO UPDATE SET moves = LEAST(completions.moves, $4), hints_used = LEAST(completions.hints_used, $5)`,
        [finalUserId, puzzleDate, difficulty, moves, hintsUsed || 0, finalMode]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving completion:', error);
    res.status(500).json({ error: 'Failed to save completion' });
  }
});

// GET/POST /api/user-prefs
app.get('/api/user-prefs', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  try {
    const result = await query(`SELECT play_mode FROM users WHERE user_id = $1`, [userId]);
    res.json({ playMode: result.rows[0]?.play_mode || null });
  } catch (error) {
    console.error('Error fetching user prefs:', error);
    res.status(500).json({ error: 'Failed to fetch user prefs' });
  }
});

app.post('/api/user-prefs', async (req, res) => {
  const { userId, playMode } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (!VALID_MODES.has(playMode)) return res.status(400).json({ error: 'playMode must be casual or competitive' });
  try {
    await query(
      `UPDATE users SET play_mode = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId, playMode]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving user prefs:', error);
    res.status(500).json({ error: 'Failed to save user prefs' });
  }
});

// GET /api/user-stats?userId=xxx - Get user's personal stats
app.get('/api/user-stats', async (req, res) => {
  const { userId } = req.query;

  try {
    // Get all completions for user
    const completions = await query(
      `SELECT puzzle_date, difficulty, moves, hints_used, completed_at, mode, time_ms
       FROM completions
       WHERE user_id = $1
       ORDER BY puzzle_date DESC`,
      [userId]
    );

    // Calculate streaks and totals per difficulty
    const stats = {
      easy: { total: 0, currentStreak: 0, bestStreak: 0 },
      medium: { total: 0, currentStreak: 0, bestStreak: 0 },
      hard: { total: 0, currentStreak: 0, bestStreak: 0 },
      expert: { total: 0, currentStreak: 0, bestStreak: 0 },
    };

    // Group completions by difficulty
    const byDifficulty = { easy: [], medium: [], hard: [], expert: [] };
    for (const row of completions.rows) {
      const diff = row.difficulty.toLowerCase();
      if (byDifficulty[diff]) {
        byDifficulty[diff].push(row.puzzle_date);
      }
    }

    // Calculate streaks for each difficulty
    for (const [difficulty, dates] of Object.entries(byDifficulty)) {
      stats[difficulty].total = dates.length;

      if (dates.length === 0) continue;

      const isExpert = difficulty === 'expert';
      const streakInterval = isExpert ? 7 : 1;

      // Sort dates ascending for streak calculation
      const sortedDates = dates.map(d => new Date(d)).sort((a, b) => a - b);

      let bestStreak = 1;
      let tempStreak = 1;

      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = sortedDates[i - 1];
        const currDate = sortedDates[i];
        const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

        if (diffDays === streakInterval) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastPlayed = sortedDates[sortedDates.length - 1];
      lastPlayed.setHours(0, 0, 0, 0);

      const daysSinceLast = Math.round((today - lastPlayed) / (1000 * 60 * 60 * 24));

      let currentStreak = 0;
      if (daysSinceLast <= streakInterval) {
        currentStreak = tempStreak;
      }

      stats[difficulty].currentStreak = currentStreak;
      stats[difficulty].bestStreak = bestStreak;
    }

    res.json({ stats, completions: completions.rows });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/aggregates?date=xxx - Get average and min moves for a puzzle
app.get('/api/aggregates', async (req, res) => {
  const { date: puzzleDate } = req.query;

  try {
    const result = await query(
      `SELECT difficulty,
              COUNT(*) as total_completions,
              AVG(moves)::numeric(10,1) as avg_moves,
              MIN(moves) as min_moves
       FROM completions
       WHERE puzzle_date = $1
       GROUP BY difficulty`,
      [puzzleDate]
    );

    const aggregates = {};
    for (const row of result.rows) {
      aggregates[row.difficulty.toLowerCase()] = {
        totalCompletions: parseInt(row.total_completions),
        avgMoves: parseFloat(row.avg_moves),
        minMoves: parseInt(row.min_moves),
      };
    }

    res.json(aggregates);
  } catch (error) {
    console.error('Error fetching aggregates:', error);
    res.status(500).json({ error: 'Failed to fetch aggregates' });
  }
});

// GET /api/leaderboard?date=xxx&userId=xxx&mode=casual|competitive
app.get('/api/leaderboard', async (req, res) => {
  const { date: puzzleDate, userId } = req.query;
  const mode = VALID_MODES.has(req.query.mode) ? req.query.mode : 'casual';

  if (!puzzleDate) {
    return res.status(400).json({ error: 'date query parameter required' });
  }

  try {
    if (mode === 'competitive') {
      const aggResult = await query(
        `SELECT difficulty,
                COUNT(*) as total_completions,
                AVG(time_ms)::numeric(12,1) as avg_time_ms,
                MIN(time_ms) as min_time_ms
         FROM completions
         WHERE puzzle_date = $1 AND mode = 'competitive' AND time_ms IS NOT NULL
         GROUP BY difficulty`,
        [puzzleDate]
      );

      const leaderboard = {};
      for (const row of aggResult.rows) {
        leaderboard[row.difficulty.toLowerCase()] = {
          mode: 'competitive',
          totalCompletions: parseInt(row.total_completions),
          avgTimeMs: parseFloat(row.avg_time_ms),
          minTimeMs: parseInt(row.min_time_ms),
          userTimeMs: null,
          userMoves: null,
          userRank: null,
        };
      }

      if (userId) {
        const userResult = await query(
          `SELECT difficulty, time_ms, moves
           FROM completions
           WHERE puzzle_date = $1 AND user_id = $2 AND mode = 'competitive' AND time_ms IS NOT NULL`,
          [puzzleDate, userId]
        );
        for (const row of userResult.rows) {
          const diff = row.difficulty.toLowerCase();
          if (leaderboard[diff]) {
            leaderboard[diff].userTimeMs = parseInt(row.time_ms);
            leaderboard[diff].userMoves = parseInt(row.moves);
          }
        }
        for (const diff of Object.keys(leaderboard)) {
          if (leaderboard[diff].userTimeMs !== null) {
            const rankResult = await query(
              `SELECT COUNT(*) + 1 as rank
               FROM completions
               WHERE puzzle_date = $1 AND LOWER(difficulty) = $2
                     AND mode = 'competitive' AND time_ms IS NOT NULL AND time_ms < $3`,
              [puzzleDate, diff, leaderboard[diff].userTimeMs]
            );
            leaderboard[diff].userRank = parseInt(rankResult.rows[0].rank);
          }
        }
      }

      return res.json(leaderboard);
    }

    // Casual (default)
    const aggResult = await query(
      `SELECT difficulty,
              COUNT(*) as total_completions,
              AVG(moves)::numeric(10,1) as avg_moves,
              MIN(moves) as min_moves
       FROM completions
       WHERE puzzle_date = $1 AND mode = 'casual'
       GROUP BY difficulty`,
      [puzzleDate]
    );

    const leaderboard = {};
    for (const row of aggResult.rows) {
      leaderboard[row.difficulty.toLowerCase()] = {
        mode: 'casual',
        totalCompletions: parseInt(row.total_completions),
        avgMoves: parseFloat(row.avg_moves),
        minMoves: parseInt(row.min_moves),
        userMoves: null,
        userRank: null,
      };
    }

    if (userId) {
      const userResult = await query(
        `SELECT difficulty, moves
         FROM completions
         WHERE puzzle_date = $1 AND user_id = $2 AND mode = 'casual'`,
        [puzzleDate, userId]
      );
      for (const row of userResult.rows) {
        const diff = row.difficulty.toLowerCase();
        if (leaderboard[diff]) {
          leaderboard[diff].userMoves = parseInt(row.moves);
        }
      }
      for (const diff of Object.keys(leaderboard)) {
        if (leaderboard[diff].userMoves !== null) {
          const rankResult = await query(
            `SELECT COUNT(*) + 1 as rank
             FROM completions
             WHERE puzzle_date = $1 AND LOWER(difficulty) = $2
                   AND mode = 'casual' AND moves < $3`,
            [puzzleDate, diff, leaderboard[diff].userMoves]
          );
          leaderboard[diff].userRank = parseInt(rankResult.rows[0].rank);
        }
      }
    }

    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/level-coverage - Count consecutive future days with levels
app.get('/api/level-coverage', async (req, res) => {
  try {
    const [jfResult, cjResult] = await Promise.all([
      list({ prefix: 'level-' }),
      list({ prefix: 'cj-level-' }),
    ]);

    const allBlobs = [...jfResult.blobs, ...cjResult.blobs];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().slice(0, 10);

    const datesWithLevels = new Set();
    for (const blob of allBlobs) {
      const match = blob.pathname.match(LEVEL_PATTERN);
      if (match && match[1] > todayStr) {
        datesWithLevels.add(match[1]);
      }
    }

    let consecutiveDays = 0;
    const checkDate = new Date(today);
    while (true) {
      checkDate.setDate(checkDate.getDate() + 1);
      const dateStr = checkDate.toISOString().slice(0, 10);
      if (datesWithLevels.has(dateStr)) {
        consecutiveDays++;
      } else {
        break;
      }
    }

    res.json({ consecutiveDays });
  } catch (error) {
    console.error('Error checking level coverage:', error);
    res.status(500).json({ error: 'Failed to check level coverage' });
  }
});

// ---------- Campaigns ----------
const CAMPAIGN_PREFIX = 'campaign-';
const CAMPAIGN_PATTERN = /campaign-([\w-]+)\.json/;

app.get('/api/campaigns', async (req, res) => {
  const { id } = req.query;
  try {
    if (id) {
      const filename = `${CAMPAIGN_PREFIX}${id}.json`;
      const { blobs } = await list({ prefix: filename.replace('.json', '') });
      const match = blobs.find(b => b.pathname === filename || b.pathname.endsWith(`/${filename}`));
      if (!match) return res.status(404).json({ error: 'Campaign not found' });
      const response = await fetch(match.url);
      const data = await response.json();
      return res.json(data);
    }

    const { blobs } = await list({ prefix: CAMPAIGN_PREFIX });
    const summaries = [];
    for (const blob of blobs) {
      const m = blob.pathname.match(CAMPAIGN_PATTERN);
      if (!m) continue;
      const response = await fetch(blob.url);
      const data = await response.json();
      const levelCount = (data.chapters || []).reduce((n, c) => n + (c.levels?.length || 0), 0);
      summaries.push({
        id: m[1],
        name: data.name || 'Untitled',
        chapterCount: (data.chapters || []).length,
        levelCount,
        updatedAt: blob.uploadedAt,
      });
    }
    summaries.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    res.json(summaries);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

app.post('/api/campaigns', async (req, res) => {
  const { id, campaign } = req.body || {};
  if (!id || !campaign) return res.status(400).json({ error: 'id and campaign required' });
  if (!/^[\w-]+$/.test(id)) return res.status(400).json({ error: 'id must match [\\w-]+' });
  try {
    const filename = `${CAMPAIGN_PREFIX}${id}.json`;
    const { blobs } = await list({ prefix: filename.replace('.json', '') });
    for (const existing of blobs) {
      try { await del(existing.url); } catch (e) { /* ignore */ }
    }
    const blob = await put(filename, JSON.stringify(campaign), {
      access: 'public',
      addRandomSuffix: false,
      cacheControlMaxAge: 0,
    });
    console.log(`Saved campaign to Vercel Blob: ${blob.url}`);
    res.json({ success: true, url: blob.url, id });
  } catch (error) {
    console.error('Error saving campaign:', error);
    res.status(500).json({ error: 'Failed to save campaign: ' + error.message });
  }
});

app.delete('/api/campaigns', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });
  try {
    const filename = `${CAMPAIGN_PREFIX}${id}.json`;
    const { blobs } = await list({ prefix: filename.replace('.json', '') });
    for (const existing of blobs) {
      try { await del(existing.url); } catch (e) { /* ignore */ }
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

app.listen(PORT, () => {
  console.log(`Dev API server running at http://localhost:${PORT}`);
  console.log('Using Vercel Blob storage and local Postgres');
});
