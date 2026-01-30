import { sql } from '@vercel/postgres';

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

  const { userId, displayName, email, pictureUrl } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    await sql`
      INSERT INTO users (user_id, display_name, email, picture_url)
      VALUES (${userId}, ${displayName || null}, ${email || null}, ${pictureUrl || null})
      ON CONFLICT (user_id)
      DO UPDATE SET display_name = ${displayName || null}, email = ${email || null}, picture_url = ${pictureUrl || null}, updated_at = CURRENT_TIMESTAMP
    `;
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error syncing user:', error);
    return res.status(500).json({ error: 'Failed to sync user' });
  }
}
