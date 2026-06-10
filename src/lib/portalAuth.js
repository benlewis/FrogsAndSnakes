import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

// Long-lived sign-in for the asset portal and /users pages.
//
// Auth0 is only used for the initial login: we exchange its ID token for a
// server-side session token (?action=session) that stays valid as long as
// it's used at least every 30 days. The token is kept in localStorage and
// sent as `Authorization: Bearer <token>`, so Auth0's short session lifetime
// (no refresh tokens on this plan) no longer signs people out.

const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''
const STORAGE_KEY = 'art-portal-session'

function readStored() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return s?.token ? s : null
  } catch { return null }
}

async function rawFetch(action, token, { method = 'GET', body, query } = {}) {
  const qs = new URLSearchParams({ action, ...(query || {}) }).toString()
  const res = await fetch(`${API_BASE}/api/art?${qs}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status })
  return data
}

// status: 'loading' | 'signedout' | 'forbidden' | 'error' | 'ready'
export function usePortalAuth() {
  const { isAuthenticated, isLoading, getIdTokenClaims, loginWithRedirect, logout: auth0Logout } = useAuth0()
  const [session, setSession] = useState(readStored)
  const [status, setStatus] = useState(session ? 'ready' : 'loading')
  const [error, setError] = useState(null)
  const mintingRef = useRef(null)

  const save = useCallback((s) => {
    if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    else localStorage.removeItem(STORAGE_KEY)
    setSession(s)
  }, [])

  // Exchange the Auth0 ID token for a portal session. Deduped via a shared
  // promise so the initial effect and a 401 retry can't mint twice.
  const mint = useCallback(() => {
    if (!mintingRef.current) {
      mintingRef.current = (async () => {
        const claims = await getIdTokenClaims()
        if (!claims?.__raw) throw Object.assign(new Error('not signed in'), { status: 401 })
        const s = await rawFetch('session', claims.__raw, { method: 'POST' })
        save(s)
        return s
      })().finally(() => { mintingRef.current = null })
    }
    return mintingRef.current
  }, [getIdTokenClaims, save])

  useEffect(() => {
    if (session) { setStatus('ready'); return }   // portal session beats Auth0 state
    if (isLoading) { setStatus('loading'); return }
    if (!isAuthenticated) { setStatus('signedout'); return }
    setStatus('loading')
    let stale = false
    mint().then(() => { if (!stale) setStatus('ready') }).catch((e) => {
      if (stale) return
      setError(e)
      setStatus(e.status === 403 ? 'forbidden' : e.status === 401 ? 'signedout' : 'error')
    })
    return () => { stale = true }
  }, [session, isLoading, isAuthenticated, mint])

  const api = useCallback(async (action, opts) => {
    if (!session) throw Object.assign(new Error('not signed in'), { status: 401 })
    try {
      return await rawFetch(action, session.token, opts)
    } catch (e) {
      if (e.status !== 401) throw e
      // Session expired or was revoked — re-mint from the Auth0 login if it's
      // still alive (the effect above flips to 'signedout' otherwise).
      save(null)
      const s = await mint().catch(() => { throw e })
      return rawFetch(action, s.token, opts)
    }
  }, [session, save, mint])

  const login = useCallback(() => loginWithRedirect(), [loginWithRedirect])

  const logout = useCallback(async () => {
    const cur = session
    save(null)
    if (cur) { try { await rawFetch('session-logout', cur.token, { method: 'POST' }) } catch { /* best effort */ } }
    auth0Logout({ logoutParams: { returnTo: window.location.origin } })
  }, [session, save, auth0Logout])

  return {
    status,
    error,
    user: session ? { email: session.email, role: session.role } : null,
    token: session?.token || null,
    api,
    login,
    logout,
  }
}
