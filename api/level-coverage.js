import { list } from '@vercel/blob';

const LEVEL_PATTERN = /level-(\d{4}-\d{2}-\d{2})-(\w+)\.json/;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // List all level blobs for both game types
    const [jfResult, cjResult] = await Promise.all([
      list({ prefix: 'level-' }),
      list({ prefix: 'cj-level-' }),
    ]);

    const allBlobs = [...jfResult.blobs, ...cjResult.blobs];

    // Extract unique future dates that have levels
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

    // Count consecutive days from tomorrow
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
}
