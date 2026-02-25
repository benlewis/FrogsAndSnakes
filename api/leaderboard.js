import { query } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { date, userId } = req.query;

  if (!date) {
    return res.status(400).json({ error: 'date query parameter required' });
  }

  try {
    // Get aggregates per difficulty
    const aggResult = await query(
      `SELECT difficulty,
              COUNT(*) as total_completions,
              AVG(moves)::numeric(10,1) as avg_moves,
              MIN(moves) as min_moves
       FROM completions
       WHERE puzzle_date = $1
       GROUP BY difficulty`,
      [date]
    );

    const leaderboard = {};
    for (const row of aggResult.rows) {
      leaderboard[row.difficulty.toLowerCase()] = {
        totalCompletions: parseInt(row.total_completions),
        avgMoves: parseFloat(row.avg_moves),
        minMoves: parseInt(row.min_moves),
        userMoves: null,
        userRank: null,
      };
    }

    // If userId provided, get user's moves and rank per difficulty
    if (userId) {
      const userResult = await query(
        `SELECT difficulty, moves
         FROM completions
         WHERE puzzle_date = $1 AND user_id = $2`,
        [date, userId]
      );

      for (const row of userResult.rows) {
        const diff = row.difficulty.toLowerCase();
        if (leaderboard[diff]) {
          leaderboard[diff].userMoves = parseInt(row.moves);
        }
      }

      // Compute rank for each difficulty the user completed
      for (const diff of Object.keys(leaderboard)) {
        if (leaderboard[diff].userMoves !== null) {
          const rankResult = await query(
            `SELECT COUNT(*) + 1 as rank
             FROM completions
             WHERE puzzle_date = $1 AND LOWER(difficulty) = $2 AND moves < $3`,
            [date, diff, leaderboard[diff].userMoves]
          );
          leaderboard[diff].userRank = parseInt(rankResult.rows[0].rank);
        }
      }
    }

    return res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return res.status(500).json({ error: 'Failed to fetch leaderboard: ' + error.message });
  }
}
