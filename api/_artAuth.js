// Server-side auth for the art portal.
//
// Two credentials are accepted in `Authorization: Bearer <token>`:
//   1. A portal session token (64 hex chars) minted by ?action=session — the
//      normal case. Sessions live in art_sessions and stay valid as long as
//      they're used at least every SESSION_IDLE_DAYS, so sign-in is rare.
//   2. A raw Auth0 ID token (JWT, from getIdTokenClaims().__raw) — used once
//      right after login to mint a session, verified against Auth0's JWKS
//      (issuer + audience).
// Either way, the caller's email resolves to a role on every request:
//   admin  — Ben (hardcoded below); manages users at /users
//   artist — any account with users.is_artist set (granted from /users)
//
// Required server env (Vercel): AUTH0_DOMAIN, AUTH0_CLIENT_ID
//   (falls back to the VITE_* names if those are the only ones set).
// Local only: ART_DEV_BYPASS_EMAIL — when set and NODE_ENV!=='production',
//   skips token verification and treats the request as that user.
import crypto from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { query } from './_db.js';

const DOMAIN = process.env.AUTH0_DOMAIN || process.env.VITE_AUTH0_DOMAIN || '';
const CLIENT_ID = process.env.AUTH0_CLIENT_ID || process.env.VITE_AUTH0_CLIENT_ID || '';

export const ADMIN_EMAILS = ['ben.lewis@gmail.com'];

const SESSION_IDLE_DAYS = 30;

let _jwks = null;
function jwks() {
  if (!DOMAIN) throw httpError(500, 'AUTH0_DOMAIN not configured on the server');
  if (!_jwks) _jwks = createRemoteJWKSet(new URL(`https://${DOMAIN}/.well-known/jwks.json`));
  return _jwks;
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

export async function roleForEmail(email) {
  const e = (email || '').toLowerCase();
  if (!e) return null;
  if (ADMIN_EMAILS.includes(e)) return 'admin';
  const r = await query('SELECT 1 FROM users WHERE LOWER(email) = $1 AND is_artist LIMIT 1', [e]);
  return r.rows.length ? 'artist' : null;
}

export function bearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

// --- Portal sessions ---

const isSessionToken = (t) => /^[0-9a-f]{64}$/.test(t || '');

export async function createSession(user) {
  // Lazy cleanup so the table doesn't accumulate dead sessions.
  await query(
    `DELETE FROM art_sessions WHERE last_used_at < CURRENT_TIMESTAMP - INTERVAL '${SESSION_IDLE_DAYS} days'`
  );
  const token = crypto.randomBytes(32).toString('hex');
  await query(
    'INSERT INTO art_sessions (token, user_id, email) VALUES ($1, $2, $3)',
    [token, user.sub, user.email]
  );
  return token;
}

export async function deleteSession(token) {
  if (isSessionToken(token)) await query('DELETE FROM art_sessions WHERE token = $1', [token]);
}

// Resolve a session token, sliding its expiry forward on use.
async function sessionUser(token) {
  const r = await query(
    `UPDATE art_sessions SET last_used_at = CURRENT_TIMESTAMP
      WHERE token = $1 AND last_used_at > CURRENT_TIMESTAMP - INTERVAL '${SESSION_IDLE_DAYS} days'
      RETURNING user_id, email`,
    [token]
  );
  if (!r.rows.length) throw httpError(401, 'session expired — please sign in again');
  const { user_id: sub, email } = r.rows[0];
  // Role is re-resolved per request so granting/revoking artist access on
  // /users applies immediately, even to existing sessions.
  const role = await roleForEmail(email);
  if (!role) throw httpError(403, 'this account is not authorized for the art portal');
  return { email, sub, role };
}

// --- Verification ---

async function devBypass() {
  const bypass = process.env.ART_DEV_BYPASS_EMAIL;
  if (bypass && process.env.NODE_ENV !== 'production') {
    const email = bypass.toLowerCase();
    return { email, sub: `dev|${email}`, role: (await roleForEmail(email)) || 'admin' };
  }
  return null;
}

// Verify a portal session token or a raw Auth0 ID token and resolve the
// caller's role. Returns { email, sub, role } or throws with a .status.
export async function verifyToken(token) {
  if (!token) throw httpError(401, 'missing token');
  if (isSessionToken(token)) return sessionUser(token);
  let payload;
  try {
    ({ payload } = await jwtVerify(token, jwks(), {
      issuer: `https://${DOMAIN}/`,
      audience: CLIENT_ID,
    }));
  } catch {
    throw httpError(401, 'invalid or expired token');
  }
  const email = (payload.email || '').toLowerCase();
  const role = await roleForEmail(email);
  if (!role) throw httpError(403, 'this account is not authorized for the art portal');
  return { email, sub: payload.sub, role };
}

// Same, but honors the local dev bypass first. Used by the Blob upload-token
// route, which receives the token via clientPayload rather than a header.
export async function verifyTokenOrBypass(token) {
  return (await devBypass()) || (await verifyToken(token));
}

// Verify from the request's Authorization header (with dev bypass).
export async function verifyRequest(req) {
  return (await devBypass()) || (await verifyToken(bearer(req)));
}

// Guard: returns the verified user, or writes an error response and returns null.
// Pass { admin: true } to require the admin role.
export async function requireUser(req, res, { admin = false } = {}) {
  try {
    const user = await verifyRequest(req);
    if (admin && user.role !== 'admin') {
      res.status(403).json({ error: 'admin only' });
      return null;
    }
    return user;
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message || 'unauthorized' });
    return null;
  }
}
