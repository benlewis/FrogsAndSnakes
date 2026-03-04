import { put, list, del } from '@vercel/blob';

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

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Prevent caching
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
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
        return res.status(200).json(levels);
      } catch (error) {
        console.error('Error fetching all levels:', error);
        return res.status(500).json({ error: 'Failed to fetch levels' });
      }
    }

    // Get levels for a specific date
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

      return res.status(200).json(levels);
    } catch (error) {
      console.error('Error fetching levels:', error);
      return res.status(500).json({ error: 'Failed to fetch levels' });
    }
  }

  if (req.method === 'POST') {
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
        } catch (e) {
          console.log('Could not delete old blob:', e);
        }
      }

      const blob = await put(filename, JSON.stringify(level), {
        access: 'public',
        addRandomSuffix: false,
        cacheControlMaxAge: 0,
      });

      return res.status(200).json({ success: true, url: blob.url });
    } catch (error) {
      console.error('Error saving level:', error);
      return res.status(500).json({ error: 'Failed to save level' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
