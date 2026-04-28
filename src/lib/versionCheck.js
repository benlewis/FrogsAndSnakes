const VERSION_URL = '/version.txt'
const POLL_MS = 10 * 60 * 1000

let initialVersion = null
let checking = false

async function fetchVersion() {
  try {
    const res = await fetch(VERSION_URL, { cache: 'no-store' })
    if (!res.ok) return null
    const text = await res.text()
    return text.trim() || null
  } catch {
    return null
  }
}

async function checkAndReload() {
  if (!initialVersion || checking) return
  if (document.visibilityState !== 'visible') return
  checking = true
  try {
    const current = await fetchVersion()
    if (current && current !== initialVersion) {
      window.location.reload()
    }
  } finally {
    checking = false
  }
}

export async function startVersionCheck() {
  if (!import.meta.env.PROD) return
  initialVersion = await fetchVersion()
  if (!initialVersion) return

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkAndReload()
  })
  window.addEventListener('focus', checkAndReload)
  setInterval(checkAndReload, POLL_MS)
}
