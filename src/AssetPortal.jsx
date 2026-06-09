import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { upload } from '@vercel/blob/client'
import {
  Upload, Send, Check, X, Package, RefreshCw, KeyRound, Copy,
  ImageIcon, Music, FileJson, Loader2, AlertCircle, CheckCircle2,
} from 'lucide-react'

// Localhost in dev, same-origin in production (mirrors LevelEditor).
const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

const CATEGORY_LABELS = {
  background: 'Backgrounds',
  snake: 'Snakes',
  piece: 'Pieces',
  sound: 'Sounds',
  level: 'Level sets',
}
const CATEGORY_ORDER = ['background', 'snake', 'piece', 'sound', 'level']

const STATUS_STYLES = {
  placeholder: 'bg-slate-200 text-slate-600',
  pending:     'bg-amber-100 text-amber-800',
  submitted:   'bg-blue-100 text-blue-800',
  approved:    'bg-emerald-100 text-emerald-800',
  rejected:    'bg-rose-100 text-rose-800',
  finalized:   'bg-violet-100 text-violet-800',
}

const KIND_ICON = { image: ImageIcon, audio: Music, json: FileJson }

function acceptFor(spec) {
  if (spec?.kind === 'audio') return 'audio/*'
  if (spec?.kind === 'json') return 'application/json,.json'
  return 'image/png,image/jpeg'
}

function formatCode(code) {
  return code ? String(code).replace(/(\d{3})(?=\d)/g, '$1 ').trim() : ''
}

export default function AssetPortal() {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout, getIdTokenClaims } = useAuth0()
  const [state, setState] = useState({ loading: true, error: null, role: null, slots: [] })
  const [pairing, setPairing] = useState(null)
  const [busy, setBusy] = useState({})   // slotId -> message
  const [toast, setToast] = useState(null)

  const tokenRef = useRef(null)
  const getToken = useCallback(async () => {
    const claims = await getIdTokenClaims()
    tokenRef.current = claims?.__raw || null
    return tokenRef.current
  }, [getIdTokenClaims])

  const api = useCallback(async (action, { method = 'GET', body, query } = {}) => {
    const token = tokenRef.current || (await getToken())
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
  }, [getToken])

  const loadSlots = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await api('slots')
      setState({ loading: false, error: null, role: data.role, slots: data.slots })
    } catch (e) {
      setState({ loading: false, error: e, role: null, slots: [] })
    }
  }, [api])

  const loadPairing = useCallback(async () => {
    try { setPairing(await api('pairing')) } catch { /* shown via slots error */ }
  }, [api])

  useEffect(() => {
    if (isAuthenticated) { loadSlots(); loadPairing() }
  }, [isAuthenticated, loadSlots, loadPairing])

  const flash = (msg, kind = 'ok') => { setToast({ msg, kind }); setTimeout(() => setToast(null), 4000) }
  const mark = (slotId, msg) => setBusy((b) => ({ ...b, [slotId]: msg }))
  const clear = (slotId) => setBusy((b) => { const n = { ...b }; delete n[slotId]; return n })

  async function onUpload(slot, file) {
    if (!file) return
    mark(slot.slotId, 'Uploading…')
    try {
      const token = await getToken()
      const blob = await upload(`art/${slot.slotId}/${Date.now()}-${file.name}`, file, {
        access: 'public',
        handleUploadUrl: `${API_BASE}/api/art?action=upload-token`,
        clientPayload: JSON.stringify({ slotId: slot.slotId, token }),
      })
      mark(slot.slotId, 'Validating…')
      await api('record', { method: 'POST', body: {
        slotId: slot.slotId, blobUrl: blob.url, pathname: blob.pathname, contentType: file.type,
      } })
      flash(`Uploaded ${slot.displayName}`)
      await loadSlots()
    } catch (e) {
      flash(e.message || 'Upload failed', 'err')
    } finally { clear(slot.slotId) }
  }

  async function act(slot, action, body, okMsg) {
    mark(slot.slotId, '…')
    try {
      await api(action, { method: 'POST', body: { slotId: slot.slotId, ...body } })
      flash(okMsg)
      await loadSlots()
    } catch (e) {
      flash(e.message || 'Failed', 'err')
    } finally { clear(slot.slotId) }
  }

  async function rotateCode() {
    try { setPairing(await api('pairing-rotate', { method: 'POST' })); flash('New magic number generated') }
    catch (e) { flash(e.message, 'err') }
  }

  // ---- gates ----
  if (isLoading) return <Centered><Loader2 className="animate-spin" /> Loading…</Centered>
  if (!isAuthenticated) {
    return (
      <Centered>
        <div className="text-center space-y-4">
          <Package className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="text-2xl font-bold">Frogs &amp; Snakes — Asset Portal</h1>
          <p className="text-slate-500">Sign in to manage game art.</p>
          <button onClick={() => loginWithRedirect()} className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700">Log In</button>
        </div>
      </Centered>
    )
  }
  if (state.error?.status === 403) {
    return (
      <Centered>
        <div className="text-center space-y-3">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500" />
          <h1 className="text-xl font-bold">Not authorized</h1>
          <p className="text-slate-500">{user?.email} isn’t on the art-portal allowlist.</p>
          <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} className="text-sm text-slate-500 underline">Log out</button>
        </div>
      </Centered>
    )
  }

  const isAdmin = state.role === 'admin'
  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, slots: state.slots.filter((s) => s.category === cat) }))
    .filter((g) => g.slots.length)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold"><Package className="h-5 w-5 text-emerald-600" /> Asset Portal</div>
          <div className="flex items-center gap-3 text-sm">
            <button onClick={loadSlots} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900"><RefreshCw className="h-4 w-4" /> Refresh</button>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{state.role}</span>
            <span className="text-slate-500 hidden sm:inline">{user?.email}</span>
            <button onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })} className="text-slate-400 hover:text-slate-700">Log out</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Magic number */}
        <section className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-amber-500" />
            <div>
              <div className="text-sm text-slate-500">Your magic number — type this in the app’s Settings to preview your assets in-game</div>
              <div className="text-2xl font-mono font-bold tracking-wider">{pairing ? formatCode(pairing.code) : '— — —'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pairing && (
              <button onClick={() => { navigator.clipboard?.writeText(pairing.code); flash('Copied') }} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"><Copy className="h-4 w-4" /> Copy</button>
            )}
            <button onClick={rotateCode} className="text-sm text-slate-400 hover:text-slate-700">Rotate</button>
          </div>
        </section>

        {state.loading && <Centered><Loader2 className="animate-spin" /> Loading assets…</Centered>}
        {state.error && state.error.status !== 403 && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">{state.error.message}</div>
        )}

        {grouped.map(({ cat, slots }) => (
          <section key={cat}>
            <h2 className="text-lg font-semibold mb-3">{CATEGORY_LABELS[cat] || cat}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {slots.map((slot) => (
                <SlotCard key={slot.slotId} slot={slot} isAdmin={isAdmin} busy={busy[slot.slotId]}
                  onUpload={onUpload} act={act} />
              ))}
            </div>
          </section>
        ))}
      </main>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-sm text-white ${toast.kind === 'err' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

function SlotCard({ slot, isAdmin, busy, onUpload, act }) {
  const fileRef = useRef(null)
  const cur = slot.current
  const Icon = KIND_ICON[slot.spec?.kind] || ImageIcon
  const status = slot.status
  const needsArt = !cur && slot.spec?.state !== 'baked'

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex gap-3">
      <Thumb slot={slot} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="font-medium truncate">{slot.displayName}</div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          <span className={`px-1.5 py-0.5 rounded ${STATUS_STYLES[status] || STATUS_STYLES.placeholder}`}>{status}</span>
          {needsArt && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">needs art</span>}
          {slot.spec?.state === 'baked' && !cur && <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">in app</span>}
          {cur?.version && <span className="text-slate-400">v{cur.version}</span>}
        </div>
        <div className="mt-1 text-xs text-slate-400 truncate">{specSummary(slot.spec)}</div>
        {cur?.reviewNotes && status === 'rejected' && (
          <div className="mt-1 text-xs text-rose-600">Rejected: {cur.reviewNotes}</div>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
          <input ref={fileRef} type="file" accept={acceptFor(slot.spec)} className="hidden"
            onChange={(e) => { onUpload(slot, e.target.files?.[0]); e.target.value = '' }} />
          <Btn onClick={() => fileRef.current?.click()} disabled={!!busy} icon={Upload}>Upload</Btn>

          {cur && ['pending', 'rejected'].includes(status) && (
            <Btn onClick={() => act(slot, 'submit', { uploadId: cur.id }, 'Submitted for review')} disabled={!!busy} icon={Send}>Submit</Btn>
          )}
          {isAdmin && status === 'submitted' && (
            <>
              <Btn onClick={() => act(slot, 'review', { uploadId: cur.id, decision: 'approve' }, 'Approved')} disabled={!!busy} icon={Check} tone="ok">Approve</Btn>
              <Btn onClick={() => { const notes = prompt('Reason for rejection (optional):') ?? ''; act(slot, 'review', { uploadId: cur.id, decision: 'reject', notes }, 'Rejected') }} disabled={!!busy} icon={X} tone="bad">Reject</Btn>
            </>
          )}
          {isAdmin && status === 'approved' && (
            <Btn onClick={() => act(slot, 'finalize', { uploadId: cur.id }, 'Finalized — ready to bake')} disabled={!!busy} icon={CheckCircle2} tone="done">Finalize</Btn>
          )}
          {busy && <span className="text-xs text-slate-400 self-center inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> {busy}</span>}
        </div>
      </div>
    </div>
  )
}

function Thumb({ slot }) {
  const cur = slot.current
  if (cur && slot.spec?.kind === 'image') {
    return <div className="h-20 w-16 rounded-lg bg-slate-100 bg-center bg-cover shrink-0 border border-slate-200"
      style={{ backgroundImage: `url(${cur.url})` }} />
  }
  if (cur && slot.spec?.kind === 'audio') {
    return <div className="h-20 w-16 rounded-lg bg-slate-100 shrink-0 border border-slate-200 grid place-items-center"><Music className="h-6 w-6 text-slate-400" /></div>
  }
  const Icon = KIND_ICON[slot.spec?.kind] || ImageIcon
  return <div className="h-20 w-16 rounded-lg bg-slate-50 shrink-0 border border-dashed border-slate-300 grid place-items-center"><Icon className="h-6 w-6 text-slate-300" /></div>
}

function specSummary(spec) {
  if (!spec) return ''
  if (spec.kind === 'image') {
    const dims = spec.width && spec.height ? `${spec.width}×${spec.height}` : 'any size'
    return `${dims}${spec.transparent ? ' · transparent PNG' : ''} · ${(spec.formats || []).join('/')}`
  }
  if (spec.kind === 'audio') return `${spec.role || 'audio'} · ${(spec.formats || []).join('/')}`
  if (spec.kind === 'json') return 'JSON'
  return ''
}

function Btn({ children, onClick, disabled, icon: Icon, tone }) {
  const tones = {
    ok: 'bg-emerald-600 text-white hover:bg-emerald-700',
    bad: 'bg-rose-600 text-white hover:bg-rose-700',
    done: 'bg-violet-600 text-white hover:bg-violet-700',
    default: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-50 ${tones[tone] || tones.default}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}{children}
    </button>
  )
}

function Centered({ children }) {
  return <div className="min-h-screen grid place-items-center text-slate-500"><div className="inline-flex items-center gap-2">{children}</div></div>
}
