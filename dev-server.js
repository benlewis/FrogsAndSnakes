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

// GET /api/levels?date=2025-01-20 or GET /api/levels?all=true
app.get('/api/levels', async (req, res) => {
  const { date, all } = req.query;

  // If "all" param is set, return all levels
  if (all === 'true') {
    try {
      const { blobs } = await list({ prefix: 'level-' });
      const levels = [];

      for (const blob of blobs) {
        const match = blob.pathname.match(/level-(\d{4}-\d{2}-\d{2})-(\w+)\.json/);
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
    const { blobs } = await list({ prefix: `level-${date}-` });
    const levels = {};

    for (const blob of blobs) {
      const match = blob.pathname.match(/level-\d{4}-\d{2}-\d{2}-(\w+)\.json/);
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
  const { date, difficulty, level } = req.body;

  if (!date || !difficulty || !level) {
    return res.status(400).json({ error: 'Date, difficulty, and level data required' });
  }

  try {
    const filename = `level-${date}-${difficulty}.json`;

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

// POST /api/stats - Save a completion
app.post('/api/stats', async (req, res) => {
  const { userId, visitorId, puzzleDate, difficulty, moves, hintsUsed } = req.body;

  // visitorId is used for anonymous visitors, but we prefer userId if available
  const finalUserId = userId || visitorId;

  if (!finalUserId || !puzzleDate || !difficulty || moves === undefined) {
    return res.status(400).json({ error: 'userId/visitorId, puzzleDate, difficulty, and moves required' });
  }

  try {
    await query(
      `INSERT INTO completions (user_id, puzzle_date, difficulty, moves, hints_used)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, puzzle_date, difficulty)
       DO UPDATE SET moves = LEAST(completions.moves, $4), hints_used = LEAST(completions.hints_used, $5)`,
      [finalUserId, puzzleDate, difficulty, moves, hintsUsed || 0]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving completion:', error);
    res.status(500).json({ error: 'Failed to save completion' });
  }
});

// GET /api/stats/user/:userId - Get user's personal stats
app.get('/api/stats/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Get all completions for user
    const completions = await query(
      `SELECT puzzle_date, difficulty, moves, hints_used, completed_at
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
    };

    // Group completions by difficulty
    const byDifficulty = { easy: [], medium: [], hard: [] };
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

      // Sort dates ascending for streak calculation
      const sortedDates = dates.map(d => new Date(d)).sort((a, b) => a - b);

      let currentStreak = 1;
      let bestStreak = 1;
      let tempStreak = 1;

      for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = sortedDates[i - 1];
        const currDate = sortedDates[i];
        const diffDays = Math.round((currDate - prevDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }

      // Check if current streak includes today or yesterday
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastPlayed = sortedDates[sortedDates.length - 1];
      lastPlayed.setHours(0, 0, 0, 0);

      if (lastPlayed.getTime() === today.getTime() || lastPlayed.getTime() === yesterday.getTime()) {
        currentStreak = tempStreak;
      } else {
        currentStreak = 0;
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

// GET /api/stats/aggregates/:puzzleDate - Get average and min moves for a puzzle
app.get('/api/stats/aggregates/:puzzleDate', async (req, res) => {
  const { puzzleDate } = req.params;

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

app.listen(PORT, () => {
  console.log(`Dev API server running at http://localhost:${PORT}`);
  console.log('Using Vercel Blob storage and local Postgres');
});
