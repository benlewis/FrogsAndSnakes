// Shared helpers for the art pipeline endpoint (api/art.js + dev-server).
import crypto from 'node:crypto';
import sharp from 'sharp';
import { query } from './_db.js';

export const MAX_BYTES = 25 * 1024 * 1024; // 25 MB ceiling for any single asset

export function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
}

export function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

// MIME types the Blob upload will accept for a given slot's spec.
export function allowedContentTypes(slot) {
  const kind = slot?.spec?.kind;
  if (kind === 'audio') return ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac'];
  if (kind === 'json') return ['application/json', 'text/plain'];
  return ['image/png', 'image/jpeg']; // image (default)
}

export async function getSlot(slotId) {
  const r = await query('SELECT * FROM art_slots WHERE slot_id = $1', [slotId]);
  return r.rows[0] || null;
}

export async function latestUpload(slotId) {
  const r = await query(
    'SELECT * FROM art_uploads WHERE slot_id = $1 ORDER BY version DESC LIMIT 1',
    [slotId]
  );
  return r.rows[0] || null;
}

export async function nextVersion(slotId) {
  const r = await query(
    'SELECT COALESCE(MAX(version), 0) + 1 AS v FROM art_uploads WHERE slot_id = $1',
    [slotId]
  );
  return r.rows[0].v;
}

// Validate uploaded bytes against the slot spec. Returns { ok, meta?, error? }.
export async function validateAsset(buffer, slot) {
  const spec = slot.spec || {};
  const bytes = buffer.length;
  if (bytes === 0) return { ok: false, error: 'file is empty' };
  if (bytes > MAX_BYTES) return { ok: false, error: `file too large (${(bytes / 1048576).toFixed(1)}MB > 25MB)` };

  if (spec.kind === 'image') {
    let meta;
    try {
      meta = await sharp(buffer).metadata();
    } catch {
      return { ok: false, error: 'not a readable image' };
    }
    const formats = spec.formats || ['png'];
    if (!formats.includes(meta.format)) {
      return { ok: false, error: `format "${meta.format}" not allowed (expected ${formats.join(' / ')})` };
    }
    if (spec.transparent && !meta.hasAlpha) {
      return { ok: false, error: 'image must keep a transparent (alpha) channel' };
    }
    if (spec.width && spec.height) {
      const wOk = Math.abs(meta.width - spec.width) <= 2;
      const hOk = Math.abs(meta.height - spec.height) <= 2;
      if (!wOk || !hOk) {
        return { ok: false, error: `expected ${spec.width}×${spec.height}px, got ${meta.width}×${meta.height}px` };
      }
    }
    return { ok: true, meta: { width: meta.width, height: meta.height, format: meta.format, bytes, hasAlpha: !!meta.hasAlpha } };
  }

  if (spec.kind === 'json') {
    let parsed;
    try {
      parsed = JSON.parse(buffer.toString('utf8'));
    } catch {
      return { ok: false, error: 'not valid JSON' };
    }
    if (typeof parsed !== 'object' || parsed === null) {
      return { ok: false, error: 'JSON must be an object or array' };
    }
    return { ok: true, meta: { bytes } };
  }

  // audio (and any other kind): accept bytes; container is gated by content-type at upload.
  return { ok: true, meta: { bytes } };
}

// Map a DB upload row to the camelCase shape the portal/manifest consume.
export function publicUpload(u) {
  if (!u) return null;
  return {
    id: u.id,
    slotId: u.slot_id,
    version: u.version,
    status: u.status,
    url: u.blob_url,
    pathname: u.blob_pathname,
    contentType: u.content_type,
    width: u.width,
    height: u.height,
    bytes: u.bytes,
    uploadedBy: u.uploaded_by,
    notes: u.notes,
    reviewNotes: u.review_notes,
    reviewedBy: u.reviewed_by,
    createdAt: u.created_at,
    submittedAt: u.submitted_at,
    reviewedAt: u.reviewed_at,
    finalizedAt: u.finalized_at,
  };
}
