import { useState, useEffect, useCallback } from 'react'
import { Users as UsersIcon, RefreshCw, Loader2, AlertCircle, Palette, ShieldCheck, KeyRound, Copy, Check, Eye, EyeOff } from 'lucide-react'
import { usePortalAuth } from './lib/portalAuth.js'

function accountAge(createdAt) {
  const ms = Date.now() - new Date(createdAt).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const days = Math.floor(ms / 86_400_000)
  if (days < 1) return 'today'
  if (days < 31) return `${days} day${days === 1 ? '' : 's'}`
  const months = Math.floor(days / 30.44)
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return `${years} yr${years === 1 ? '' : 's'}${rem ? ` ${rem} mo` : ''}`
}

export default function Users() {
  const { status, error: authError, user, token, api, login, logout } = usePortalAuth()
  const [state, setState] = useState({ loading: true, error: null, users: [] })
  const [busy, setBusy] = useState({})   // userId -> true while toggling
  const [toast, setToast] = useState(null)

  const loadUsers = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await api('users')
      setState({ loading: false, error: null, users: data.users })
    } catch (e) {
      setState({ loading: false, error: e, users: [] })
    }
  }, [api])

  useEffect(() => {
    if (status === 'ready') loadUsers()
  }, [status, loadUsers])

  const flash = (msg, kind = 'ok') => { setToast({ msg, kind }); setTimeout(() => setToast(null), 4000) }

  async function toggleArtist(u) {
    const next = !u.isArtist
    setBusy((b) => ({ ...b, [u.userId]: true }))
    try {
      await api('set-artist', { method: 'POST', body: { userId: u.userId, isArtist: next } })
      setState((s) => ({
        ...s,
        users: s.users.map((x) => (x.userId === u.userId ? { ...x, isArtist: next } : x)),
      }))
      flash(next
        ? `${u.email || u.displayName} can now use the asset portal`
        : `Artist access removed for ${u.email || u.displayName}`)
    } catch (e) {
      flash(e.message || 'Failed', 'err')
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[u.userId]; return n })
    }
  }

  // ---- gates ----
  if (status === 'loading') return <Centered><Loader2 className="animate-spin" /> Loading…</Centered>
  if (status === 'signedout' || state.error?.status === 401) {
    return (
      <Centered>
        <div className="text-center space-y-4">
          <UsersIcon className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="text-2xl font-bold">Frogs &amp; Snakes — Users</h1>
          <p className="text-slate-500">Sign in to manage user accounts.</p>
          <button onClick={login} className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700">Log In</button>
        </div>
      </Centered>
    )
  }
  if (status === 'forbidden' || state.error?.status === 403) {
    return (
      <Centered>
        <div className="text-center space-y-3">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="text-xl font-bold">Not authorized</h1>
          <p className="text-slate-500">{user?.email || 'This account'} can’t manage users.</p>
          <button onClick={logout} className="text-sm text-slate-500 underline">Log out</button>
        </div>
      </Centered>
    )
  }
  if (status === 'error') {
    return (
      <Centered>
        <div className="text-center space-y-3">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="text-xl font-bold">Something went wrong</h1>
          <p className="text-slate-500">{authError?.message || 'Could not sign in.'}</p>
          <button onClick={() => window.location.reload()} className="text-sm text-slate-500 underline">Retry</button>
        </div>
      </Centered>
    )
  }

  const artists = state.users.filter((u) => u.isArtist).length

  // The game's global CSS pins <body> (position: fixed, overflow: hidden),
  // so the page must be its own scroll container.
  return (
    <div className="h-full overflow-y-auto overscroll-contain select-text bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold"><UsersIcon className="h-5 w-5 text-emerald-600" /> Users</div>
          <div className="flex items-center gap-3 text-sm">
            <a href="/asset-portal" className="text-slate-500 hover:text-slate-900">Asset Portal</a>
            <button onClick={loadUsers} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900"><RefreshCw className="h-4 w-4" /> Refresh</button>
            <span className="text-slate-500 hidden sm:inline">{user?.email}</span>
            <button onClick={logout} className="text-slate-400 hover:text-slate-700">Log out</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {state.loading && <Centered><Loader2 className="animate-spin" /> Loading users…</Centered>}
        {state.error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">{state.error.message}</div>
        )}

        {user?.role === 'admin' && token && <CliTokenCard token={token} flash={flash} />}

        {!state.loading && !state.error && (
          <>
            <div className="text-sm text-slate-500">
              {state.users.length} account{state.users.length === 1 ? '' : 's'}, oldest first · {artists} with artist access
            </div>
            <section className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                    <th className="px-3 py-2">Account</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Joined</th>
                    <th className="px-3 py-2">Account age</th>
                    <th className="px-3 py-2 text-center whitespace-nowrap">Artist access</th>
                  </tr>
                </thead>
                <tbody>
                  {state.users.map((u) => (
                    <tr key={u.userId} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-3 py-2 align-middle">
                        <div className="flex items-center gap-2 font-medium">
                          {u.pictureUrl
                            ? <img src={u.pictureUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full border border-slate-200 bg-slate-100 object-cover" />
                            : <span className="h-7 w-7 rounded-full bg-slate-100 grid place-items-center text-xs text-slate-400">{(u.displayName || u.email || '?')[0]?.toUpperCase()}</span>}
                          {u.displayName || '—'}
                          {u.isAdmin && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-violet-100 text-violet-800"><ShieldCheck className="h-3 w-3" /> admin</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 align-middle text-slate-600">{u.email || '—'}</td>
                      <td className="px-3 py-2 align-middle text-slate-600 whitespace-nowrap">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-2 align-middle text-slate-600 whitespace-nowrap">{u.createdAt ? accountAge(u.createdAt) : '—'}</td>
                      <td className="px-3 py-2 align-middle text-center">
                        {u.isAdmin ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-400" title="Admins always have portal access"><Palette className="h-3.5 w-3.5" /> always</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={u.isArtist}
                            disabled={!!busy[u.userId]}
                            onChange={() => toggleArtist(u)}
                            className="h-4 w-4 accent-emerald-600 cursor-pointer disabled:cursor-wait"
                            title={u.isArtist ? 'Revoke asset-portal access' : 'Grant asset-portal access'}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                  {!state.users.length && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">No user accounts yet.</td></tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${toast.kind === 'err' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function Centered({ children }) {
  return <div className="min-h-screen grid place-items-center text-slate-500"><div className="inline-flex items-center gap-2">{children}</div></div>
}

// Surfaces the long-lived portal session token so the admin can paste it into
// the headless level generator (Authorization: Bearer <token>). This is the
// same token the /api/art session uses; the levels endpoint accepts it too and
// it stays valid as long as it's used at least every 30 days — unlike the raw
// Auth0 ID token, which expires within hours.
function CliTokenCard({ token, flash }) {
  const [revealed, setRevealed] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      flash('CLI token copied to clipboard')
    } catch {
      flash('Couldn’t copy — reveal it and copy manually', 'err')
    }
  }

  const masked = `${token.slice(0, 6)}${'•'.repeat(24)}${token.slice(-4)}`

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <div className="flex items-center gap-2 font-semibold text-slate-800">
        <KeyRound className="h-4 w-4 text-emerald-600" /> Level-generator CLI token
      </div>
      <p className="text-sm text-slate-500">
        Paste this as <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700">Authorization: Bearer &lt;token&gt;</code> when your
        generator POSTs to <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700">/api/levels</code>. It stays valid as long as
        it’s used at least every 30 days. Treat it like a password — anyone with it can publish daily levels as you.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
          {revealed ? token : masked}
        </code>
        <button
          onClick={() => setRevealed((r) => !r)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm text-slate-600 hover:bg-slate-50"
          title={revealed ? 'Hide token' : 'Reveal token'}
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {copied ? <><Check className="h-4 w-4" /> Copied</> : <><Copy className="h-4 w-4" /> Copy</>}
        </button>
      </div>
    </section>
  )
}
