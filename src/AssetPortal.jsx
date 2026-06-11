import { useState, useEffect, useCallback, useRef } from 'react'
import { upload } from '@vercel/blob/client'
import { usePortalAuth } from './lib/portalAuth.js'
import {
  Upload, Send, Check, X, Package, RefreshCw, KeyRound, Copy,
  ImageIcon, Music, FileJson, Loader2, AlertCircle, CheckCircle2,
  Circle, CircleDot, ChevronDown, ChevronRight, ExternalLink,
} from 'lucide-react'

// Localhost in dev, same-origin in production (mirrors LevelEditor).
const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

const CATEGORY_LABELS = {
  background: 'Backgrounds',
  snake: 'Snakes',
  piece: 'Pieces & characters',
  sound: 'Sounds',
  level: 'Level sets',
}
const CATEGORY_ORDER = ['background', 'piece', 'snake', 'sound', 'level']

const STATUS_LABELS = {
  placeholder: 'no upload',
  pending:     'draft',
  submitted:   'shared — awaiting review',
  approved:    'approved',
  rejected:    'changes requested',
  finalized:   'finalized',
}
const STATUS_STYLES = {
  placeholder: 'bg-slate-100 text-slate-500',
  pending:     'bg-amber-100 text-amber-800',
  submitted:   'bg-blue-100 text-blue-800',
  approved:    'bg-emerald-100 text-emerald-800',
  rejected:    'bg-rose-100 text-rose-800',
  finalized:   'bg-violet-100 text-violet-800',
}

const KIND_ICON = { image: ImageIcon, audio: Music, json: FileJson }

// To-do state for a slot: what (if anything) still needs to happen.
//   todo        — placeholder art in the app and nothing uploaded yet
//   inprogress  — a draft or rejected upload exists
//   shared      — shared, waiting on admin review
//   done        — approved/finalized upload
//   shipped     — real art already in the app, replacement optional
function todoState(slot) {
  const st = slot.status
  if (st === 'approved' || st === 'finalized') return 'done'
  if (st === 'submitted') return 'shared'
  if (st === 'pending' || st === 'rejected') return 'inprogress'
  return slot.spec?.state === 'baked' ? 'shipped' : 'todo'
}

const TODO_META = {
  todo:       { icon: Circle,       cls: 'text-amber-500',   label: 'Needs art' },
  inprogress: { icon: CircleDot,    cls: 'text-blue-500',    label: 'In progress' },
  shared:     { icon: Send,         cls: 'text-blue-600',    label: 'Shared' },
  done:       { icon: CheckCircle2, cls: 'text-emerald-600', label: 'Done' },
  shipped:    { icon: CheckCircle2, cls: 'text-slate-300',   label: 'In app (optional)' },
}

function acceptFor(spec) {
  if (spec?.kind === 'audio') return 'audio/*'
  if (spec?.kind === 'json') return 'application/json,.json'
  return 'image/png,image/jpeg'
}

function requiredSummary(spec) {
  if (!spec) return ''
  if (spec.kind === 'image') {
    const dims = spec.width && spec.height ? `${spec.width}×${spec.height}px` : 'any size'
    return `${dims} · ${(spec.formats || []).join('/').toUpperCase()}${spec.transparent ? ' · transparent' : ''}`
  }
  if (spec.kind === 'audio') {
    return `${spec.role === 'music' ? 'music loop' : 'sound effect'} · ${(spec.formats || []).join('/').toUpperCase()}`
  }
  if (spec.kind === 'json') return 'JSON'
  return ''
}

function formatCode(code) {
  return code ? String(code).replace(/(\d{3})(?=\d)/g, '$1 ').trim() : ''
}

// Bundle consecutive slots that share spec.group (frames/variants of one
// artwork — snake idle + blink, the four portal colors, ...) into one block.
function chunkByGroup(slots) {
  const out = []
  for (const s of slots) {
    const g = s.spec?.group || null
    const last = out[out.length - 1]
    if (g && last && last.group === g) last.slots.push(s)
    else out.push({ group: g, slots: [s] })
  }
  return out
}

export default function AssetPortal() {
  const { status, error: authError, user, token, api, login, logout } = usePortalAuth()
  const [state, setState] = useState({ loading: true, error: null, role: null, slots: [] })
  const [pairing, setPairing] = useState(null)
  const [busy, setBusy] = useState({})   // slotId -> message
  const [toast, setToast] = useState(null)
  const [open, setOpen] = useState({})   // slotId -> expanded instructions row
  const [collapsed, setCollapsed] = useState({})   // category -> section collapsed

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
    if (status === 'ready') { loadSlots(); loadPairing() }
  }, [status, loadSlots, loadPairing])

  const flash = (msg, kind = 'ok') => { setToast({ msg, kind }); setTimeout(() => setToast(null), 4000) }
  const mark = (slotId, msg) => setBusy((b) => ({ ...b, [slotId]: msg }))
  const clear = (slotId) => setBusy((b) => { const n = { ...b }; delete n[slotId]; return n })
  const toggle = (slotId) => setOpen((o) => ({ ...o, [slotId]: !o[slotId] }))
  const toggleSection = (cat) => setCollapsed((c) => ({ ...c, [cat]: !c[cat] }))

  async function onUpload(slot, file) {
    if (!file) return
    mark(slot.slotId, 'Uploading…')
    try {
      const blob = await upload(`art/${slot.slotId}/${Date.now()}-${file.name}`, file, {
        access: 'public',
        handleUploadUrl: `${API_BASE}/api/art?action=upload-token`,
        clientPayload: JSON.stringify({ slotId: slot.slotId, token }),
      })
      mark(slot.slotId, 'Validating…')
      await api('record', { method: 'POST', body: {
        slotId: slot.slotId, blobUrl: blob.url, pathname: blob.pathname, contentType: file.type,
      } })
      flash(`Uploaded ${slot.displayName} — mark it “Ready to share” when you’re happy with it`)
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
  if (status === 'loading') return <Centered><Loader2 className="animate-spin" /> Loading…</Centered>
  if (status === 'signedout' || state.error?.status === 401) {
    return (
      <Centered>
        <div className="text-center space-y-4">
          <Package className="mx-auto h-10 w-10 text-emerald-600" />
          <h1 className="text-2xl font-bold">Frogs &amp; Snakes — Asset Portal</h1>
          <p className="text-slate-500">Sign in to manage game art.</p>
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
          <p className="text-slate-500">This account doesn’t have access to the art portal.</p>
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

  const isAdmin = state.role === 'admin'
  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, slots: state.slots.filter((s) => s.category === cat) }))
    .filter((g) => g.slots.length)

  const counts = state.slots.reduce((acc, s) => {
    acc[todoState(s)] = (acc[todoState(s)] || 0) + 1
    return acc
  }, {})

  // The game's global CSS pins <body> (position: fixed, overflow: hidden),
  // so the portal must be its own scroll container.
  return (
    <div className="h-full overflow-y-auto overscroll-contain select-text bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold"><Package className="h-5 w-5 text-emerald-600" /> Asset Portal</div>
          <div className="flex items-center gap-3 text-sm">
            {isAdmin && <a href="/users" className="text-slate-500 hover:text-slate-900">Users</a>}
            <button onClick={loadSlots} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900"><RefreshCw className="h-4 w-4" /> Refresh</button>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{state.role}</span>
            <span className="text-slate-500 hidden sm:inline">{user?.email}</span>
            <button onClick={logout} className="text-slate-400 hover:text-slate-700">Log out</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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

        {/* To-do summary */}
        {!state.loading && !state.error && (
          <section className="flex flex-wrap gap-2 text-sm">
            {['todo', 'inprogress', 'shared', 'done', 'shipped'].map((k) => {
              const m = TODO_META[k]; const Icon = m.icon
              return (
                <span key={k} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-3 py-1">
                  <Icon className={`h-4 w-4 ${m.cls}`} />
                  <b>{counts[k] || 0}</b> {m.label.toLowerCase()}
                </span>
              )
            })}
          </section>
        )}

        {state.loading && <Centered><Loader2 className="animate-spin" /> Loading assets…</Centered>}
        {state.error && state.error.status !== 403 && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm">{state.error.message}</div>
        )}

        {!state.loading && !state.error && (
          <section className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                  <th className="px-3 py-2 w-8"></th>
                  <th className="px-3 py-2">Artwork</th>
                  <th className="px-3 py-2">Current art</th>
                  <th className="px-3 py-2">Required</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              {grouped.map(({ cat, slots }) => {
                const isCollapsed = !!collapsed[cat]
                const done = slots.filter((s) => ['done', 'shipped'].includes(todoState(s))).length
                return (
                  <tbody key={cat}>
                    <tr className="bg-slate-50/80 border-y border-slate-200 cursor-pointer hover:bg-slate-100/80 select-none"
                      onClick={() => toggleSection(cat)}>
                      <td colSpan={6} className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          {isCollapsed
                            ? <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                          {CATEGORY_LABELS[cat] || cat}
                          <span className="font-normal normal-case tracking-normal text-slate-400">
                            — {done}/{slots.length} done
                          </span>
                        </span>
                      </td>
                    </tr>
                    {!isCollapsed && chunkByGroup(slots).map((chunk) => (
                      chunk.group ? (
                        <GroupRows key={chunk.group} group={chunk.group} slots={chunk.slots}
                          isAdmin={isAdmin} busy={busy} open={open} toggle={toggle}
                          onUpload={onUpload} act={act} />
                      ) : (
                        chunk.slots.map((slot) => (
                          <SlotRows key={slot.slotId} slot={slot} isAdmin={isAdmin} busy={busy[slot.slotId]}
                            open={!!open[slot.slotId]} onToggle={() => toggle(slot.slotId)}
                            onUpload={onUpload} act={act} />
                        ))
                      )
                    ))}
                  </tbody>
                )
              })}
            </table>
          </section>
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

// A group block: one header row naming the artwork, then a row per frame /
// variant. Frames of one piece stay together — upload each, they must match.
function GroupRows({ group, slots, isAdmin, busy, open, toggle, onUpload, act }) {
  const Icon = KIND_ICON[slots[0].spec?.kind] || ImageIcon
  return (
    <>
      <tr className="border-b border-slate-100 bg-emerald-50/40">
        <td className="px-3 py-1.5"></td>
        <td colSpan={5} className="px-3 py-1.5">
          <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
            <Icon className="h-4 w-4 text-emerald-600" /> {group}
            <span className="text-xs font-normal text-slate-400">
              {slots.length} images: {slots.map((s) => s.spec?.frame || s.displayName).join(' · ')}
            </span>
          </span>
        </td>
      </tr>
      {slots.map((slot) => (
        <SlotRows key={slot.slotId} slot={slot} isAdmin={isAdmin} busy={busy[slot.slotId]}
          open={!!open[slot.slotId]} onToggle={() => toggle(slot.slotId)}
          onUpload={onUpload} act={act} inGroup />
      ))}
    </>
  )
}

// One slot = a main table row + an expandable instructions/details row.
function SlotRows({ slot, isAdmin, busy, open, onToggle, onUpload, act, inGroup }) {
  const fileRef = useRef(null)
  const cur = slot.current
  const spec = slot.spec || {}
  const Icon = KIND_ICON[spec.kind] || ImageIcon
  const status = slot.status
  const tstate = todoState(slot)
  const T = TODO_META[tstate]
  const TIcon = T.icon

  return (
    <>
      <tr className="border-b border-slate-100 hover:bg-slate-50/60 cursor-pointer" onClick={onToggle}>
        <td className="px-3 py-2 align-middle">
          <TIcon className={`h-5 w-5 ${T.cls}`} title={T.label} />
        </td>
        <td className={`px-3 py-2 align-middle ${inGroup ? 'pl-8 border-l-2 border-emerald-100' : ''}`}>
          <div className="flex items-center gap-2 font-medium">
            {open ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
            {!inGroup && <Icon className="h-4 w-4 text-slate-400 shrink-0" />}
            {inGroup ? (slot.spec?.frame || slot.displayName) : slot.displayName}
          </div>
          <div className={`text-xs text-slate-400 ${inGroup ? 'ml-6' : 'ml-10'}`}>{slot.slotId}</div>
        </td>
        <td className="px-3 py-2 align-middle"><CurrentArtThumb slot={slot} /></td>
        <td className="px-3 py-2 align-middle text-slate-600 whitespace-nowrap">{requiredSummary(spec)}</td>
        <td className="px-3 py-2 align-middle">
          <span className={`px-1.5 py-0.5 rounded text-xs whitespace-nowrap ${STATUS_STYLES[status] || STATUS_STYLES.placeholder}`}>
            {STATUS_LABELS[status] || status}
          </span>
          {cur?.version ? <span className="ml-1.5 text-xs text-slate-400">v{cur.version}</span> : null}
        </td>
        <td className="px-3 py-2 align-middle text-right" onClick={(e) => e.stopPropagation()}>
          <div className="inline-flex flex-wrap justify-end gap-1.5">
            <input ref={fileRef} type="file" accept={acceptFor(spec)} className="hidden"
              onChange={(e) => { onUpload(slot, e.target.files?.[0]); e.target.value = '' }} />
            <Btn onClick={() => fileRef.current?.click()} disabled={!!busy} icon={Upload}>Upload</Btn>

            {cur && ['pending', 'rejected'].includes(status) && (
              <Btn onClick={() => act(slot, 'submit', { uploadId: cur.id }, 'Shared with Ben — it will show up on his device at his next Artist Studio sync')}
                disabled={!!busy} icon={Send} tone="share">Ready to share</Btn>
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
        </td>
      </tr>

      {open && (
        <tr className="border-b border-slate-100 bg-slate-50/40">
          <td></td>
          <td colSpan={5} className="px-3 pb-3 pt-1">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Instructions for the artist</div>
                <p className="text-sm text-slate-700 whitespace-pre-line max-w-3xl">
                  {spec.instructions || spec.notes || 'No specific instructions — match the existing art style.'}
                </p>
                {cur?.reviewNotes && status === 'rejected' && (
                  <div className="mt-2 text-sm text-rose-600">Requested changes: {cur.reviewNotes}</div>
                )}
                {cur && (
                  <div className="mt-2 text-xs text-slate-400">
                    Latest upload: v{cur.version}
                    {cur.width && cur.height ? ` · ${cur.width}×${cur.height}px` : ''}
                    {cur.bytes ? ` · ${(cur.bytes / 1024).toFixed(0)} KB` : ''}
                    {cur.uploadedBy ? ` · by ${cur.uploadedBy}` : ''}
                  </div>
                )}
              </div>
              <div className="flex gap-4 items-start">
                <ReferencePreview spec={spec} />
                <UploadPreview cur={cur} spec={spec} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// "Current art" thumbnail — the art the game will actually show this user:
// their live upload when one exists (slot.live, server mirrors the manifest
// rule), otherwise the baked in-app art.
function CurrentArtThumb({ slot }) {
  const spec = slot.spec || {}
  const live = slot.live
  if (live) {
    if (spec.kind === 'image') {
      return (
        <div className="flex items-center gap-2">
          <img src={live.url} alt="" loading="lazy"
            className="h-12 max-w-[72px] object-contain rounded border border-emerald-300 bg-slate-100" />
          <span className="text-xs text-emerald-600 whitespace-nowrap">upload v{live.version}</span>
        </div>
      )
    }
    return <span className="text-xs text-emerald-600 whitespace-nowrap">upload v{live.version} in use</span>
  }
  return <ReferenceThumb spec={spec} />
}

// Small thumbnail of the art baked into the app (from /art-reference).
function ReferenceThumb({ spec }) {
  if (spec.reference?.url) {
    return (
      <div className="flex items-center gap-2">
        <img src={spec.reference.url} alt="" loading="lazy"
          className="h-12 max-w-[72px] object-contain rounded border border-slate-200 bg-slate-100" />
        <span className="text-xs text-slate-400 whitespace-nowrap">{spec.reference.width}×{spec.reference.height}</span>
      </div>
    )
  }
  if (spec.kind === 'image') return <span className="text-xs text-slate-400">procedural — needs art</span>
  if (spec.kind === 'audio') return <span className="text-xs text-slate-400">synthesized — needs audio</span>
  return <span className="text-xs text-slate-400">—</span>
}

// Reference image inside the expanded row — small, click opens the full file.
function ReferencePreview({ spec }) {
  if (!spec.reference?.url) return null
  return (
    <a href={spec.reference.url} target="_blank" rel="noreferrer" className="shrink-0" title="Baked app art (reference) — click for full size">
      <img src={spec.reference.url} alt="baked app art" loading="lazy"
        className="h-20 max-w-[96px] object-contain rounded border border-slate-200 bg-slate-100" />
    </a>
  )
}

// Latest upload (image or audio) inside the expanded row — small, click opens.
function UploadPreview({ cur, spec }) {
  if (!cur) return null
  if (spec.kind === 'image') {
    return (
      <a href={cur.url} target="_blank" rel="noreferrer" className="shrink-0" title="Latest upload — click for full size">
        <img src={cur.url} alt="latest upload" loading="lazy"
          className="h-20 max-w-[96px] object-contain rounded border border-emerald-300 bg-slate-100" />
      </a>
    )
  }
  if (spec.kind === 'audio') {
    return (
      <div className="shrink-0">
        <audio controls src={cur.url} className="h-9 max-w-[240px]" />
        <div className="mt-1 text-center text-xs text-slate-400">latest upload</div>
      </div>
    )
  }
  return (
    <a href={cur.url} target="_blank" rel="noreferrer" className="text-xs text-slate-500 underline inline-flex items-center gap-1">
      latest upload <ExternalLink className="h-3 w-3" />
    </a>
  )
}

function Btn({ children, onClick, disabled, icon: Icon, tone }) {
  const tones = {
    ok: 'bg-emerald-600 text-white hover:bg-emerald-700',
    bad: 'bg-rose-600 text-white hover:bg-rose-700',
    done: 'bg-violet-600 text-white hover:bg-violet-700',
    share: 'bg-blue-600 text-white hover:bg-blue-700',
    default: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  }
  return (
    <button onClick={onClick} disabled={disabled}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium disabled:opacity-50 whitespace-nowrap ${tones[tone] || tones.default}`}>
      {Icon && <Icon className="h-3.5 w-3.5" />}{children}
    </button>
  )
}

function Centered({ children }) {
  return <div className="min-h-screen grid place-items-center text-slate-500"><div className="inline-flex items-center gap-2">{children}</div></div>
}
