// Art pipeline API — a single serverless function dispatched by ?action=...
// (keeps us within Vercel's function budget). Mounted in dev-server.js too.
//
// Flow:  upload-token → (browser uploads file straight to Vercel Blob) → record
//        → submit → review(approve|reject) → finalize.  App side reads manifest.
import crypto from 'node:crypto';
import { handleUpload } from '@vercel/blob/client';
import { del } from '@vercel/blob';
import { query } from './_db.js';
import { requireUser, verifyTokenOrBypass, ADMIN_EMAILS } from './_artAuth.js';
import {
  setCors, sha256, allowedContentTypes, getSlot, latestUpload, nextVersion,
  validateAsset, publicUpload, MAX_BYTES,
} from './_art.js';

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = String(req.query?.action || '').trim();
  try {
    switch (action) {
      case 'slots':         return await listSlots(req, res);
      case 'history':       return await slotHistory(req, res);
      case 'upload-token':  return await uploadToken(req, res);
      case 'record':        return await recordUpload(req, res);
      case 'submit':        return await submitUpload(req, res);
      case 'review':        return await reviewUpload(req, res);
      case 'finalize':      return await finalizeUpload(req, res);
      case 'pairing':       return await getPairing(req, res);
      case 'pairing-rotate':return await rotatePairing(req, res);
      case 'manifest':      return await getManifest(req, res);
      case 'users':         return await listUsers(req, res);
      case 'set-artist':    return await setArtist(req, res);
      default:
        return res.status(400).json({ error: `unknown action "${action}"` });
    }
  } catch (err) {
    console.error(`[art:${action}]`, err);
    return res.status(err.status || 500).json({ error: err.message || 'server error' });
  }
}

// GET ?action=slots — registry + latest upload per slot (portal user).
async function listSlots(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const slots = (await query('SELECT * FROM art_slots ORDER BY sort_order, slot_id')).rows;
  const ups = (await query(
    'SELECT DISTINCT ON (slot_id) * FROM art_uploads ORDER BY slot_id, version DESC'
  )).rows;
  const bySlot = new Map(ups.map((u) => [u.slot_id, u]));
  const out = slots.map((s) => {
    const cur = bySlot.get(s.slot_id) || null;
    return {
      slotId: s.slot_id,
      category: s.category,
      displayName: s.display_name,
      spec: s.spec,
      sortOrder: s.sort_order,
      status: cur ? cur.status : 'placeholder',
      current: publicUpload(cur),
    };
  });
  return res.status(200).json({ role: user.role, slots: out });
}

// GET ?action=history&slotId=X — all uploads for one slot (portal user).
async function slotHistory(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const slotId = String(req.query.slotId || '');
  const slot = await getSlot(slotId);
  if (!slot) return res.status(404).json({ error: 'unknown slot' });
  const rows = (await query(
    'SELECT * FROM art_uploads WHERE slot_id = $1 ORDER BY version DESC', [slotId]
  )).rows;
  return res.status(200).json({ slot: { slotId, spec: slot.spec, displayName: slot.display_name, category: slot.category },
                                uploads: rows.map(publicUpload) });
}

// POST ?action=upload-token — Vercel Blob client-upload handshake. The browser
// uploads the file directly to Blob; auth rides in clientPayload.token.
async function uploadToken(req, res) {
  const json = await handleUpload({
    body: req.body,
    request: req,
    onBeforeGenerateToken: async (pathname, clientPayload) => {
      let payload = {};
      try { payload = JSON.parse(clientPayload || '{}'); } catch { /* ignore */ }
      const user = await verifyTokenOrBypass(payload.token); // throws 401/403
      if (user.role !== 'admin' && user.role !== 'artist') {
        throw new Error('not allowed to upload');
      }
      const slot = await getSlot(payload.slotId);
      if (!slot) throw new Error('unknown slot');
      return {
        allowedContentTypes: allowedContentTypes(slot),
        addRandomSuffix: true,
        maximumSizeInBytes: MAX_BYTES,
        tokenPayload: JSON.stringify({ slotId: slot.slot_id, email: user.email }),
      };
    },
    // onUploadCompleted does not fire on localhost; we record explicitly via ?action=record.
    onUploadCompleted: async () => {},
  });
  return res.status(200).json(json);
}

// POST ?action=record — fetch the just-uploaded blob, validate against the
// slot spec, and create a pending art_uploads row. Deletes the blob if invalid.
async function recordUpload(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const { slotId, blobUrl, pathname, contentType, notes } = req.body || {};
  if (!slotId || !blobUrl) return res.status(400).json({ error: 'slotId and blobUrl required' });

  const slot = await getSlot(slotId);
  if (!slot) return res.status(404).json({ error: 'unknown slot' });

  let buffer;
  try {
    const r = await fetch(blobUrl);
    if (!r.ok) throw new Error(`fetch ${r.status}`);
    buffer = Buffer.from(await r.arrayBuffer());
  } catch (e) {
    return res.status(400).json({ error: `could not read uploaded file: ${e.message}` });
  }

  const v = await validateAsset(buffer, slot);
  if (!v.ok) {
    try { await del(blobUrl); } catch { /* best effort */ }
    return res.status(422).json({ error: v.error });
  }

  const version = await nextVersion(slotId);
  const row = (await query(
    `INSERT INTO art_uploads
       (slot_id, version, status, blob_url, blob_pathname, content_type, width, height, bytes, sha256, uploaded_by, notes)
     VALUES ($1,$2,'pending',$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [slotId, version, blobUrl, pathname || null, contentType || null,
     v.meta.width || null, v.meta.height || null, v.meta.bytes || buffer.length,
     sha256(buffer), user.email, notes || null]
  )).rows[0];

  return res.status(200).json({ upload: publicUpload(row), validation: v.meta });
}

// Look up an upload by id (body.uploadId) or the latest for body.slotId.
async function resolveUpload(body) {
  if (body?.uploadId) {
    const r = await query('SELECT * FROM art_uploads WHERE id = $1', [body.uploadId]);
    return r.rows[0] || null;
  }
  if (body?.slotId) return latestUpload(body.slotId);
  return null;
}

// POST ?action=submit — pending|rejected → submitted (uploader or admin).
// "Ready to share" in the portal: makes the upload visible to reviewers and
// on the admins' paired devices at their next sync (see getManifest).
async function submitUpload(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const up = await resolveUpload(req.body);
  if (!up) return res.status(404).json({ error: 'upload not found' });
  if (user.role !== 'admin' && up.uploaded_by !== user.email) {
    return res.status(403).json({ error: 'not your upload' });
  }
  if (!['pending', 'rejected'].includes(up.status)) {
    return res.status(409).json({ error: `cannot submit from status "${up.status}"` });
  }
  const row = (await query(
    `UPDATE art_uploads SET status='submitted', submitted_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
    [up.id]
  )).rows[0];
  return res.status(200).json({ upload: publicUpload(row) });
}

// POST ?action=review { uploadId, decision:'approve'|'reject', notes } — admin only.
async function reviewUpload(req, res) {
  const user = await requireUser(req, res, { admin: true });
  if (!user) return;
  const { decision, notes } = req.body || {};
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
  }
  const up = await resolveUpload(req.body);
  if (!up) return res.status(404).json({ error: 'upload not found' });
  if (up.status !== 'submitted') {
    return res.status(409).json({ error: `cannot review from status "${up.status}"` });
  }
  const status = decision === 'approve' ? 'approved' : 'rejected';
  const row = (await query(
    `UPDATE art_uploads
       SET status=$2, reviewed_by=$3, review_notes=$4, reviewed_at=CURRENT_TIMESTAMP
     WHERE id=$1 RETURNING *`,
    [up.id, status, user.email, notes || null]
  )).rows[0];
  return res.status(200).json({ upload: publicUpload(row) });
}

// POST ?action=finalize { uploadId } — approved → finalized (admin only).
// Phase 3's pull script bakes finalized assets into the app.
async function finalizeUpload(req, res) {
  const user = await requireUser(req, res, { admin: true });
  if (!user) return;
  const up = await resolveUpload(req.body);
  if (!up) return res.status(404).json({ error: 'upload not found' });
  if (up.status !== 'approved') {
    return res.status(409).json({ error: `cannot finalize from status "${up.status}"` });
  }
  const row = (await query(
    `UPDATE art_uploads SET status='finalized', finalized_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`,
    [up.id]
  )).rows[0];
  return res.status(200).json({ upload: publicUpload(row) });
}

// --- Pairing ("magic number") ---
async function allocatePairingCode(user) {
  for (let i = 0; i < 8; i++) {
    const code = String(crypto.randomInt(100_000_000, 1_000_000_000)); // 9 digits, no leading zero
    try {
      await query(
        `INSERT INTO art_pairing (code, user_id, email, role) VALUES ($1,$2,$3,$4)`,
        [code, user.sub, user.email, user.role]
      );
      return code;
    } catch (e) {
      if (!/duplicate key/i.test(e.message)) throw e; // retry only on code collision
    }
  }
  throw Object.assign(new Error('could not allocate a pairing code'), { status: 500 });
}

// GET ?action=pairing — the caller's magic number (creates one if absent).
async function getPairing(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  const existing = (await query(
    'SELECT code FROM art_pairing WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [user.sub]
  )).rows[0];
  const code = existing ? existing.code : await allocatePairingCode(user);
  return res.status(200).json({ code, role: user.role, email: user.email });
}

// POST ?action=pairing-rotate — replace the caller's magic number.
async function rotatePairing(req, res) {
  const user = await requireUser(req, res);
  if (!user) return;
  await query('DELETE FROM art_pairing WHERE user_id = $1', [user.sub]);
  const code = await allocatePairingCode(user);
  return res.status(200).json({ code, role: user.role });
}

// --- User management (the /users admin page) ---

// GET ?action=users — every account, oldest first (account age descending).
async function listUsers(req, res) {
  const user = await requireUser(req, res, { admin: true });
  if (!user) return;
  const rows = (await query(
    `SELECT user_id, display_name, email, picture_url, created_at, is_artist
       FROM users
      ORDER BY created_at ASC, user_id`
  )).rows;
  const users = rows.map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    email: r.email,
    pictureUrl: r.picture_url,
    createdAt: r.created_at,
    isArtist: r.is_artist,
    isAdmin: ADMIN_EMAILS.includes((r.email || '').toLowerCase()),
  }));
  return res.status(200).json({ users });
}

// POST ?action=set-artist { userId, isArtist } — grant/revoke portal access.
async function setArtist(req, res) {
  const user = await requireUser(req, res, { admin: true });
  if (!user) return;
  const { userId, isArtist } = req.body || {};
  if (!userId || typeof isArtist !== 'boolean') {
    return res.status(400).json({ error: 'userId and isArtist (boolean) required' });
  }
  const row = (await query(
    `UPDATE users SET is_artist = $2, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING user_id, is_artist`,
    [userId, isArtist]
  )).rows[0];
  if (!row) return res.status(404).json({ error: 'user not found' });
  return res.status(200).json({ userId: row.user_id, isArtist: row.is_artist });
}

// GET ?action=manifest&code=XXXX — app-facing. Resolves the magic number to a
// user and returns the assets they should preview in-game. No Auth0 (the code
// is the credential). Pending uploads are visible only to their own uploader.
async function getManifest(req, res) {
  const code = String(req.query.code || '').replace(/\D/g, '');
  if (!code) return res.status(400).json({ error: 'code required' });
  const pairing = (await query('SELECT * FROM art_pairing WHERE code = $1', [code])).rows[0];
  if (!pairing) return res.status(404).json({ error: 'unknown code' });
  await query('UPDATE art_pairing SET last_used_at = CURRENT_TIMESTAMP WHERE code = $1', [code]);

  const rows = (await query(
    `SELECT DISTINCT ON (u.slot_id) u.*, s.category, s.spec, s.display_name
       FROM art_uploads u
       JOIN art_slots s ON s.slot_id = u.slot_id
      WHERE u.status <> 'rejected'
        AND (u.status <> 'pending' OR u.uploaded_by = $1)
      ORDER BY u.slot_id, u.version DESC`,
    [pairing.email]
  )).rows;

  const assets = rows.map((r) => ({
    slotId: r.slot_id,
    category: r.category,
    version: r.version,
    status: r.status,
    url: r.blob_url,
    contentType: r.content_type,
    width: r.width,
    height: r.height,
    sha256: r.sha256,
    spec: r.spec,
  }));
  return res.status(200).json({ role: pairing.role, count: assets.length, assets });
}
