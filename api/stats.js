import { query } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST /api/stats - Save a completion
  if (req.method === 'POST') {
    const { userId, visitorId, puzzleDate, difficulty, moves, hintsUsed } = req.body;
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
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving completion:', error);
      return res.status(500).json({ error: 'Failed to save completion: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
