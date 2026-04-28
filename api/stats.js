import { query } from './_db.js';

const VALID_MODES = new Set(['casual', 'competitive']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST /api/stats - Save a completion
  if (req.method === 'POST') {
    const { userId, visitorId, puzzleDate, difficulty, moves, hintsUsed, mode, timeMs } = req.body;
    const finalUserId = userId || visitorId;
    const finalMode = VALID_MODES.has(mode) ? mode : 'casual';
    const finalTimeMs = finalMode === 'competitive' && Number.isFinite(timeMs) ? Math.max(0, Math.round(timeMs)) : null;

    if (!finalUserId || !puzzleDate || !difficulty || moves === undefined) {
      return res.status(400).json({ error: 'userId/visitorId, puzzleDate, difficulty, and moves required' });
    }

    try {
      // Casual: keep best (lowest) moves and lowest hints — same behavior as before.
      // Competitive: keep best (lowest) time_ms; also store moves/hints from the best run.
      if (finalMode === 'competitive') {
        await query(
          `INSERT INTO completions (user_id, puzzle_date, difficulty, moves, hints_used, mode, time_ms)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (user_id, puzzle_date, difficulty, mode)
           DO UPDATE SET
             time_ms = LEAST(completions.time_ms, EXCLUDED.time_ms),
             moves = CASE
               WHEN EXCLUDED.time_ms < completions.time_ms THEN EXCLUDED.moves
               ELSE completions.moves
             END,
             hints_used = CASE
               WHEN EXCLUDED.time_ms < completions.time_ms THEN EXCLUDED.hints_used
               ELSE completions.hints_used
             END`,
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
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving completion:', error);
      return res.status(500).json({ error: 'Failed to save completion: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
