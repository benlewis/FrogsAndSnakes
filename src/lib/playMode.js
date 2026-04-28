// Play mode preference: 'casual' or 'competitive'.
//
// Resolution order on app load:
//   1. Account (server) if logged in
//   2. Cookie
//   3. null  -> caller shows the chooser dialog
//
// Writes always update the cookie; if logged in they also push to the server.

const COOKIE_NAME = 'play_mode'
const VALID = new Set(['casual', 'competitive'])
const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

const setCookie = (name, value, days = 365) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

export function getPlayModeFromCookie() {
  const v = getCookie(COOKIE_NAME)
  return VALID.has(v) ? v : null
}

export function setPlayModeCookie(mode) {
  if (!VALID.has(mode)) return
  setCookie(COOKIE_NAME, mode)
}

export async function fetchServerPlayMode(userId) {
  if (!userId) return null
  try {
    const res = await fetch(`${API_BASE}/api/user-prefs?userId=${encodeURIComponent(userId)}`)
    if (!res.ok) return null
    const data = await res.json()
    return VALID.has(data.playMode) ? data.playMode : null
  } catch {
    return null
  }
}

export async function saveServerPlayMode(userId, mode) {
  if (!userId || !VALID.has(mode)) return
  try {
    await fetch(`${API_BASE}/api/user-prefs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, playMode: mode }),
    })
  } catch (err) {
    console.error('Failed to save play mode:', err)
  }
}

export async function resolvePlayMode({ userId }) {
  if (userId) {
    const fromServer = await fetchServerPlayMode(userId)
    if (fromServer) {
      setPlayModeCookie(fromServer)
      return fromServer
    }
  }
  return getPlayModeFromCookie()
}

export async function savePlayMode({ userId, mode }) {
  if (!VALID.has(mode)) return
  setPlayModeCookie(mode)
  if (userId) {
    await saveServerPlayMode(userId, mode)
  }
}
