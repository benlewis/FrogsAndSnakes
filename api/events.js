import { query } from './_db.js';

// Anonymous product-analytics ingestion for the iOS client (AnalyticsService).
//
// POST /api/events
//   { installId, appVersion, build, platform, debug, events: [{ event, ts, props }] }
//
// The client buffers events, persists them across app kills, and batch-POSTs.
// It drops a batch only on a 2xx; any other status (or a network failure) keeps
// the batch buffered and retries on the next flush. Delivery is therefore
// at-least-once: a batch may arrive more than once if our 2xx is lost. That's
// acceptable for product analytics (we don't dedupe here).
//
// This endpoint is unauthenticated (the app has no admin token), so it's
// guarded by: a strict body-size cap, a per-batch event cap, a known-vocabulary
// filter, per-event prop-size caps, and best-effort per-IP rate limiting.
// `props` is stored verbatim as JSONB and never evaluated.

const KNOWN_EVENTS = new Set([
  'app_launch', 'level_start', 'level_complete', 'level_abandon', 'chapter_complete',
  'daily_puzzle_start', 'daily_puzzle_complete', 'hint_used', 'hints_purchased',
  'super_hints_purchased', 'secret_chapter_purchased', 'skin_purchased', 'skin_equipped',
  'stars_granted_debug', 'chapter_selected', 'daily_difficulty_picked',
]);

// Guardrails.
const MAX_BODY_BYTES = 256 * 1024;   // reject batches larger than 256 KB
const MAX_EVENTS = 200;              // per batch
const MAX_PROPS_BYTES = 8 * 1024;    // per event; oversized props are dropped to {}
const MAX_ID_LEN = 128;              // installId / appVersion / build / platform

// Best-effort, per-instance rate limit. Serverless instances are ephemeral and
// there can be many, so this only throttles a single warm instance — it is a
// cheap abuse speed-bump, not a hard guarantee. For a strict limit, back it
// with a shared store (Vercel KV / Upstash). Legitimate traffic is tiny: each
// install flushes ~every 30s, so this only trips on clearly abnormal volume.
const RATE_LIMIT = 300;              // requests per window per IP
const RATE_WINDOW_MS = 60 * 1000;
const rateBuckets = new Map();       // ip -> { count, windowStart }

function rateLimited(ip) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    // Opportunistic cleanup so the map can't grow without bound.
    if (rateBuckets.size > 5000) {
      for (const [k, v] of rateBuckets) {
        if (now - v.windowStart >= RATE_WINDOW_MS) rateBuckets.delete(k);
      }
    }
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

const clientIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress || 'unknown';

// A short string field, trimmed to a max length. Non-strings -> null.
const str = (v, max = MAX_ID_LEN) => (typeof v === 'string' ? v.slice(0, max) : null);

// A valid timestamp -> ISO string; anything unparseable -> null.
function isoTs(v) {
  if (typeof v !== 'string') return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

// props must be a plain (non-array) object and fit the size cap; else {}.
function safeProps(v) {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
  try {
    const s = JSON.stringify(v);
    if (s.length > MAX_PROPS_BYTES) return {};
    return v;
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Strict body-size cap (declared length; the platform also enforces its own).
  const declaredLen = Number(req.headers['content-length'] || 0);
  if (declaredLen > MAX_BODY_BYTES) return res.status(413).json({ error: 'Payload too large' });

  if (rateLimited(clientIp(req))) return res.status(429).json({ error: 'Too many requests' });

  const body = req.body || {};
  const installId = str(body.installId);
  const events = body.events;
  if (!installId || !Array.isArray(events)) {
    return res.status(400).json({ error: 'installId (string) and events (array) required' });
  }
  if (events.length > MAX_EVENTS) return res.status(413).json({ error: 'Too many events in batch' });

  const appVersion = str(body.appVersion);
  const build = str(body.build);
  const platform = str(body.platform);
  const debug = body.debug === true;

  // Keep only well-formed events in the known vocabulary with a valid timestamp.
  const rows = [];
  for (const e of events) {
    if (!e || typeof e !== 'object') continue;
    if (!KNOWN_EVENTS.has(e.event)) continue;
    const ts = isoTs(e.ts);
    if (!ts) continue;
    rows.push([installId, e.event, safeProps(e.props), appVersion, build, platform, debug, ts]);
  }

  // Nothing valid to store: still ack so the client drops the (junk) batch.
  if (rows.length === 0) return res.status(200).json({ ok: true, stored: 0 });

  try {
    // Multi-row parameterized insert. `props` is passed as a JSON string cast to
    // jsonb so there's no ambiguity in array/object serialization.
    const cols = 8;
    const placeholders = rows
      .map((_, r) => {
        const b = r * cols;
        return `($${b + 1}, $${b + 2}, $${b + 3}::jsonb, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8})`;
      })
      .join(', ');
    const params = rows.flatMap(([iid, ev, props, ver, bld, plat, dbg, ts]) =>
      [iid, ev, JSON.stringify(props), ver, bld, plat, dbg, ts]);

    await query(
      `INSERT INTO events (install_id, event, props, app_version, build, platform, debug, event_ts)
       VALUES ${placeholders}`,
      params,
    );

    return res.status(200).json({ ok: true, stored: rows.length });
  } catch (error) {
    console.error('Error storing events:', error);
    // Non-2xx so the client keeps the batch buffered and retries.
    return res.status(500).json({ error: 'Failed to store events' });
  }
}
