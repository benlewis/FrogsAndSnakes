import { THEME_KEYS, THEME_TITLES, THEME_FIELD_SPEC } from '../lib/autoLevelGenerator.js';
import { getEffectiveConfig, saveConfig } from './_autoPool.js';

// GET  /api/auto-level-config
//   → { themes: { auto1: { ...fields, target }, ... }, keys, titles, fieldSpec }
// POST /api/auto-level-config  { themes: { auto6: { ...fields, target }, ... } }
//   → { ok: true, themes: <effective config after save> }
//
// The full per-tier generation recipe is editable here; overrides persist
// in auto_level_config and drive both the cron and manual generate runs.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const themes = await getEffectiveConfig();
      return res.status(200).json({
        themes,
        keys: THEME_KEYS,
        titles: THEME_TITLES,
        fieldSpec: THEME_FIELD_SPEC,
      });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (!body.themes || typeof body.themes !== 'object') {
        return res.status(400).json({ error: 'themes object required' });
      }
      await saveConfig(body.themes);
      const themes = await getEffectiveConfig();
      return res.status(200).json({ ok: true, themes });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in auto-level-config:', error);
    return res.status(500).json({ error: 'Config error: ' + error.message });
  }
}
