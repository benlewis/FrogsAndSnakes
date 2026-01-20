// Dev server that connects to Vercel Blob storage
// Run with: node dev-server.js

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express from 'express';
import cors from 'cors';
import { put, list } from '@vercel/blob';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

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

    const blob = await put(filename, JSON.stringify(level), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    console.log(`Saved level to Vercel Blob: ${blob.url}`);
    res.json({ success: true, url: blob.url });
  } catch (error) {
    console.error('Error saving level:', error);
    res.status(500).json({ error: 'Failed to save level: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Dev API server running at http://localhost:${PORT}`);
  console.log('Using Vercel Blob storage');
});
