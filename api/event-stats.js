import { query } from './_db.js';
import { requireUser } from './_artAuth.js';

// Admin-only analytics read side for the events ingested by api/events.js.
//
// GET /api/event-stats?days=30&debug=false
//   days   1..365 window (default 30), by event_ts
//   debug  'true' to include debug-build events (default: exclude them)
//
// Auth: Authorization: Bearer <portal session token> (or Auth0 ID token),
// admin role required — same credential as the /users portal. All aggregation
// happens here; raw per-event rows never leave the server.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const user = await requireUser(req, res, { admin: true });
  if (!user) return; // requireUser already wrote 401/403

  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  const includeDebug = req.query.debug === 'true';
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();

  // Boolean literal, never user input — safe to inline into the WHERE clause.
  const debugClause = includeDebug ? 'TRUE' : 'debug = FALSE';

  try {
    const [totals, hardestLevels, abandon, hintsByChapter, topHintUsers, eventVolume, dailyVolume, dailyFunnel, perPuzzle, chapterNames] =
      await Promise.all([
        query(
          `SELECT count(*)::int AS events, count(DISTINCT install_id)::int AS installs
           FROM events WHERE ${debugClause} AND event_ts >= $1`,
          [cutoff],
        ),
        query(
          `SELECT props->>'chapter_id' AS chapter,
                  (props->>'level_index')::int AS level,
                  count(*) FILTER (WHERE event = 'level_start')::int    AS attempts,
                  count(*) FILTER (WHERE event = 'level_complete')::int AS wins,
                  round(100.0 * count(*) FILTER (WHERE event = 'level_complete')
                        / nullif(count(*) FILTER (WHERE event = 'level_start'), 0), 1) AS win_pct
           FROM events
           WHERE ${debugClause} AND event IN ('level_start','level_complete')
             AND event_ts >= $1
             AND props ? 'chapter_id' AND props->>'level_index' ~ '^-?[0-9]+$'
             AND coalesce(props->>'is_daily', 'false') <> 'true'
           GROUP BY 1, 2
           HAVING count(*) FILTER (WHERE event = 'level_start') > 0
           ORDER BY win_pct ASC NULLS LAST, attempts DESC
           LIMIT 40`,
          [cutoff],
        ),
        query(
          `SELECT count(*) FILTER (WHERE event = 'level_abandon')::int AS abandons,
                  count(*) FILTER (WHERE event = 'level_start')::int   AS starts,
                  round(100.0 * count(*) FILTER (WHERE event = 'level_abandon')
                        / nullif(count(*) FILTER (WHERE event = 'level_start'), 0), 1) AS abandon_pct
           FROM events WHERE ${debugClause} AND event_ts >= $1`,
          [cutoff],
        ),
        query(
          `SELECT props->>'chapter_id' AS chapter,
                  count(*)::int AS hints_used,
                  count(DISTINCT install_id)::int AS players
           FROM events
           WHERE ${debugClause} AND event = 'hint_used' AND event_ts >= $1 AND props ? 'chapter_id'
           GROUP BY 1 ORDER BY hints_used DESC LIMIT 40`,
          [cutoff],
        ),
        query(
          `SELECT install_id, count(*)::int AS hints
           FROM events
           WHERE ${debugClause} AND event = 'hint_used' AND event_ts >= $1
           GROUP BY 1 ORDER BY hints DESC LIMIT 25`,
          [cutoff],
        ),
        query(
          `SELECT event, count(*)::int AS count
           FROM events WHERE ${debugClause} AND event_ts >= $1
           GROUP BY 1 ORDER BY count DESC`,
          [cutoff],
        ),
        query(
          `SELECT to_char(date_trunc('day', event_ts), 'YYYY-MM-DD') AS day,
                  count(*)::int AS events,
                  count(DISTINCT install_id)::int AS installs
           FROM events WHERE ${debugClause} AND event_ts >= $1
           GROUP BY 1 ORDER BY 1`,
          [cutoff],
        ),
        query(
          `SELECT count(*) FILTER (WHERE event = 'daily_puzzle_start')::int    AS starts,
                  count(*) FILTER (WHERE event = 'daily_puzzle_complete')::int AS completes
           FROM events WHERE ${debugClause} AND event_ts >= $1`,
          [cutoff],
        ),
        // Per-puzzle breakdown for campaign levels only (daily puzzles excluded
        // via is_daily). Numeric props are regex-guarded before casting so a
        // malformed value can't error the whole query.
        query(
          `SELECT props->>'chapter_id' AS chapter,
                  (props->>'level_index')::int AS level,
                  count(*) FILTER (WHERE event = 'level_start')::int    AS attempts,
                  count(*) FILTER (WHERE event = 'level_complete')::int AS completes,
                  count(*) FILTER (WHERE event = 'level_abandon')::int  AS abandons,
                  round(100.0 * count(*) FILTER (WHERE event = 'level_complete')
                        / nullif(count(*) FILTER (WHERE event = 'level_start'), 0), 1) AS win_pct,
                  round(avg((props->>'moves')::numeric)
                        FILTER (WHERE event = 'level_complete' AND props->>'moves' ~ '^-?[0-9]+$'), 1) AS avg_moves,
                  round(avg((props->>'elapsed_seconds')::numeric)
                        FILTER (WHERE event = 'level_complete' AND props->>'elapsed_seconds' ~ '^-?[0-9]+$'), 0) AS avg_seconds,
                  round(100.0 * count(*) FILTER (WHERE event = 'level_complete' AND props->>'is_perfect' = 'true')
                        / nullif(count(*) FILTER (WHERE event = 'level_complete'), 0), 0) AS perfect_pct
           FROM events
           WHERE ${debugClause} AND event IN ('level_start','level_complete','level_abandon')
             AND event_ts >= $1
             AND props ? 'chapter_id' AND props->>'level_index' ~ '^-?[0-9]+$'
             AND coalesce(props->>'is_daily', 'false') <> 'true'
           GROUP BY 1, 2
           HAVING count(*) FILTER (WHERE event = 'level_start') > 0
           ORDER BY chapter, level
           LIMIT 500`,
          [cutoff],
        ),
        // chapter_id -> chapter_title lookup. Any event carrying chapter_title
        // contributes; we keep the most recent title seen per chapter so a
        // renamed chapter shows its current name.
        query(
          `SELECT DISTINCT ON (props->>'chapter_id')
                  props->>'chapter_id' AS chapter, props->>'chapter_title' AS title
           FROM events
           WHERE ${debugClause} AND event_ts >= $1
             AND props ? 'chapter_title' AND props->>'chapter_title' <> ''
           ORDER BY props->>'chapter_id', event_ts DESC`,
          [cutoff],
        ),
      ]);

    return res.status(200).json({
      days,
      includeDebug,
      generatedAt: new Date().toISOString(),
      totals: totals.rows[0],
      hardestLevels: hardestLevels.rows,
      abandon: abandon.rows[0],
      hintsByChapter: hintsByChapter.rows,
      topHintUsers: topHintUsers.rows,
      eventVolume: eventVolume.rows,
      dailyVolume: dailyVolume.rows,
      dailyPuzzleFunnel: dailyFunnel.rows[0],
      perPuzzle: perPuzzle.rows,
      chapterNames: chapterNames.rows,
    });
  } catch (error) {
    console.error('Error building event stats:', error);
    return res.status(500).json({ error: 'Failed to build stats' });
  }
}
