import { query } from '../_db.js';

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

  const { userId } = req.query;

  try {
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

    const byDifficulty = { easy: [], medium: [], hard: [] };
    for (const row of completions.rows) {
      const diff = row.difficulty.toLowerCase();
      if (byDifficulty[diff]) {
        byDifficulty[diff].push(row.puzzle_date);
      }
    }

    for (const [difficulty, dates] of Object.entries(byDifficulty)) {
      stats[difficulty].total = dates.length;

      if (dates.length === 0) continue;

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

    return res.status(200).json({ stats, completions: completions.rows });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({ error: 'Failed to fetch stats: ' + error.message });
  }
}
