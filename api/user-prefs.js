import { query } from './_db.js';

const VALID_MODES = new Set(['casual', 'competitive']);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    try {
      const result = await query(
        `SELECT play_mode FROM users WHERE user_id = $1`,
        [userId]
      );
      const playMode = result.rows[0]?.play_mode || null;
      return res.status(200).json({ playMode });
    } catch (error) {
      console.error('Error fetching user prefs:', error);
      return res.status(500).json({ error: 'Failed to fetch user prefs: ' + error.message });
    }
  }

  if (req.method === 'POST') {
    const { userId, playMode } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    if (!VALID_MODES.has(playMode)) {
      return res.status(400).json({ error: 'playMode must be casual or competitive' });
    }
    try {
      await query(
        `UPDATE users SET play_mode = $2, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
        [userId, playMode]
      );
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving user prefs:', error);
      return res.status(500).json({ error: 'Failed to save user prefs: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
