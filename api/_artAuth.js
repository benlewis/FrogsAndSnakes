// Server-side Auth0 verification + role resolution for the art portal.
//
// The portal sends the Auth0 ID token (raw JWT, from getIdTokenClaims().__raw)
// as `Authorization: Bearer <token>`. We verify it against Auth0's JWKS
// (issuer + audience), then map the verified email to a role via env allowlists.
//
// Required server env (Vercel): AUTH0_DOMAIN, AUTH0_CLIENT_ID
//   (falls back to the VITE_* names if those are the only ones set).
// Optional: ART_ADMIN_EMAILS (csv, default ben), ART_ARTIST_EMAILS (csv).
// Local only: ART_DEV_BYPASS_EMAIL — when set and NODE_ENV!=='production',
//   skips token verification and treats the request as that user.
import { createRemoteJWKSet, jwtVerify } from 'jose';

const DOMAIN = process.env.AUTH0_DOMAIN || process.env.VITE_AUTH0_DOMAIN || '';
const CLIENT_ID = process.env.AUTH0_CLIENT_ID || process.env.VITE_AUTH0_CLIENT_ID || '';

const csv = (v) => (v || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
const ADMIN_EMAILS = csv(process.env.ART_ADMIN_EMAILS || 'ben.lewis@gmail.com');
const ARTIST_EMAILS = csv(process.env.ART_ARTIST_EMAILS);

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

export function roleForEmail(email) {
  const e = (email || '').toLowerCase();
  if (ADMIN_EMAILS.includes(e)) return 'admin';
  if (ARTIST_EMAILS.includes(e)) return 'artist';
  return null;
}

function bearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}

function devBypass() {
  const bypass = process.env.ART_DEV_BYPASS_EMAIL;
  if (bypass && process.env.NODE_ENV !== 'production') {
    const email = bypass.toLowerCase();
    return { email, sub: `dev|${email}`, role: roleForEmail(email) || 'admin' };
  }
  return null;
}

// Verify a raw Auth0 ID token string and resolve the caller's role.
// Returns { email, sub, role } or throws an error with a .status.
export async function verifyToken(token) {
  if (!token) throw httpError(401, 'missing token');
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
  const role = roleForEmail(email);
  if (!role) throw httpError(403, 'this account is not authorized for the art portal');
  return { email, sub: payload.sub, role };
}

// Same, but honors the local dev bypass first. Used by the Blob upload-token
// route, which receives the token via clientPayload rather than a header.
export async function verifyTokenOrBypass(token) {
  return devBypass() || (await verifyToken(token));
}

// Verify from the request's Authorization header (with dev bypass).
export async function verifyRequest(req) {
  return devBypass() || (await verifyToken(bearer(req)));
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
