import { query } from './_db.js';

// Player-submitted fun ratings for procedurally generated Auto chapter levels.
// Each row captures the full level JSON so we can mine for the highest-rated
// layouts later (e.g. seed the campaign with the best procedural levels).
//
// Schema is created on first call via IF NOT EXISTS so production deployments
// don't need a separate migration step.
let schemaReady = false;
async function ensureSchema() {
  if (schemaReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS auto_level_ratings (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255),
      theme_key VARCHAR(64),
      chapter_id INTEGER,
      level_index INTEGER,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      par INTEGER,
      moves INTEGER,
      level JSONB NOT NULL,
      rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_auto_ratings_theme ON auto_level_ratings(theme_key)`);
  await query(`CREATE INDEX IF NOT EXISTS idx_auto_ratings_rating ON auto_level_ratings(rating DESC, rated_at DESC)`);
  schemaReady = true;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, visitorId, themeKey, chapterId, levelIndex, rating, par, moves, level } = req.body || {};
  const finalUserId = userId || visitorId;

  if (!finalUserId || !level || rating === undefined) {
    return res.status(400).json({ error: 'userId/visitorId, rating, and level required' });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be an integer between 1 and 5' });
  }

  try {
    await ensureSchema();
    await query(
      `INSERT INTO auto_level_ratings
         (user_id, theme_key, chapter_id, level_index, rating, par, moves, level)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        finalUserId,
        themeKey || null,
        Number.isInteger(chapterId) ? chapterId : null,
        Number.isInteger(levelIndex) ? levelIndex : null,
        rating,
        Number.isInteger(par) ? par : null,
        Number.isInteger(moves) ? moves : null,
        JSON.stringify(level),
      ]
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error saving auto level rating:', error);
    return res.status(500).json({ error: 'Failed to save rating: ' + error.message });
  }
}
