import { sql } from '@vercel/postgres';

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

  const { puzzleDate } = req.query;

  try {
    const result = await sql`
      SELECT difficulty,
             COUNT(*) as total_completions,
             AVG(moves)::numeric(10,1) as avg_moves,
             MIN(moves) as min_moves
      FROM completions
      WHERE puzzle_date = ${puzzleDate}
      GROUP BY difficulty
    `;

    const aggregates = {};
    for (const row of result.rows) {
      aggregates[row.difficulty.toLowerCase()] = {
        totalCompletions: parseInt(row.total_completions),
        avgMoves: parseFloat(row.avg_moves),
        minMoves: parseInt(row.min_moves),
      };
    }

    return res.status(200).json(aggregates);
  } catch (error) {
    console.error('Error fetching aggregates:', error);
    return res.status(500).json({ error: 'Failed to fetch aggregates' });
  }
}
