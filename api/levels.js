import { put, list } from '@vercel/blob';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
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
      // List all blobs and filter by date prefix
      const { blobs } = await list({ prefix: `level-${date}-` });

      const levels = {};

      for (const blob of blobs) {
        // Extract difficulty from pathname: level-2025-01-20-easy.json
        const match = blob.pathname.match(/level-\d{4}-\d{2}-\d{2}-(\w+)\.json/);
        if (match) {
          const difficulty = match[1];
          // Fetch the actual content
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
    // Save a new level
    const { date, difficulty, level } = req.body;

    if (!date || !difficulty || !level) {
      return res.status(400).json({ error: 'Date, difficulty, and level data required' });
    }

    try {
      const filename = `level-${date}-${difficulty}.json`;

      const blob = await put(filename, JSON.stringify(level), {
        access: 'public',
        addRandomSuffix: false,
      });

      return res.status(200).json({ success: true, url: blob.url });
    } catch (error) {
      console.error('Error saving level:', error);
      return res.status(500).json({ error: 'Failed to save level' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
