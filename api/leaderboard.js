import { query } from './_db.js';

const VALID_MODES = new Set(['casual', 'competitive']);

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
  const mode = VALID_MODES.has(req.query.mode) ? req.query.mode : 'casual';

  if (!date) {
    return res.status(400).json({ error: 'date query parameter required' });
  }

  try {
    if (mode === 'competitive') {
      // Aggregate by time_ms; ignore rows without a time (shouldn't happen for competitive, but be safe).
      const aggResult = await query(
        `SELECT difficulty,
                COUNT(*) as total_completions,
                AVG(time_ms)::numeric(12,1) as avg_time_ms,
                MIN(time_ms) as min_time_ms
         FROM completions
         WHERE puzzle_date = $1 AND mode = 'competitive' AND time_ms IS NOT NULL
         GROUP BY difficulty`,
        [date]
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
          [date, userId]
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
              [date, diff, leaderboard[diff].userTimeMs]
            );
            leaderboard[diff].userRank = parseInt(rankResult.rows[0].rank);
          }
        }
      }

      return res.status(200).json(leaderboard);
    }

    // Casual (default) — aggregate by moves.
    const aggResult = await query(
      `SELECT difficulty,
              COUNT(*) as total_completions,
              AVG(moves)::numeric(10,1) as avg_moves,
              MIN(moves) as min_moves
       FROM completions
       WHERE puzzle_date = $1 AND mode = 'casual'
       GROUP BY difficulty`,
      [date]
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
        [date, userId]
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
