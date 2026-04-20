import { put, list, del } from '@vercel/blob';

const CAMPAIGN_PREFIX = 'campaign-';
const CAMPAIGN_PATTERN = /campaign-([\w-]+)\.json/;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { id } = req.query;
    try {
      if (id) {
        const filename = `${CAMPAIGN_PREFIX}${id}.json`;
        const { blobs } = await list({ prefix: filename.replace('.json', '') });
        const match = blobs.find(b => b.pathname === filename || b.pathname.endsWith(`/${filename}`));
        if (!match) return res.status(404).json({ error: 'Campaign not found' });
        const response = await fetch(match.url);
        const data = await response.json();
        return res.status(200).json(data);
      }

      const { blobs } = await list({ prefix: CAMPAIGN_PREFIX });
      const summaries = [];
      for (const blob of blobs) {
        const m = blob.pathname.match(CAMPAIGN_PATTERN);
        if (!m) continue;
        const response = await fetch(blob.url);
        const data = await response.json();
        const levelCount = (data.chapters || []).reduce((n, c) => n + (c.levels?.length || 0), 0);
        summaries.push({
          id: m[1],
          name: data.name || 'Untitled',
          chapterCount: (data.chapters || []).length,
          levelCount,
          updatedAt: blob.uploadedAt,
        });
      }
      summaries.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      return res.status(200).json(summaries);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return res.status(500).json({ error: 'Failed to fetch campaigns' });
    }
  }

  if (req.method === 'POST') {
    const { id, campaign } = req.body || {};
    if (!id || !campaign) {
      return res.status(400).json({ error: 'id and campaign required' });
    }
    if (!/^[\w-]+$/.test(id)) {
      return res.status(400).json({ error: 'id must match [\\w-]+' });
    }
    try {
      const filename = `${CAMPAIGN_PREFIX}${id}.json`;
      const { blobs } = await list({ prefix: filename.replace('.json', '') });
      for (const existing of blobs) {
        try { await del(existing.url); } catch (e) { /* ignore */ }
      }
      const blob = await put(filename, JSON.stringify(campaign), {
        access: 'public',
        addRandomSuffix: false,
        cacheControlMaxAge: 0,
      });
      return res.status(200).json({ success: true, url: blob.url, id });
    } catch (error) {
      console.error('Error saving campaign:', error);
      return res.status(500).json({ error: 'Failed to save campaign' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    try {
      const filename = `${CAMPAIGN_PREFIX}${id}.json`;
      const { blobs } = await list({ prefix: filename.replace('.json', '') });
      for (const existing of blobs) {
        try { await del(existing.url); } catch (e) { /* ignore */ }
      }
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting campaign:', error);
      return res.status(500).json({ error: 'Failed to delete campaign' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
