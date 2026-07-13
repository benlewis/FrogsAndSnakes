import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw, AlertCircle, BarChart3 } from 'lucide-react'

// Admin analytics dashboard, rendered as the "Analytics" tab of the /users
// portal. Reads aggregates from GET /api/event-stats (admin-gated) using the
// caller's portal session token, and renders core metrics + simple charts.

const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''
const ACCENT = '#2a78d6'   // validated sequential blue (single-series marks)
const RANGES = [{ label: '7d', days: 7 }, { label: '30d', days: 30 }, { label: '90d', days: 90 }]

const nf = new Intl.NumberFormat('en-US')
const fmt = (n) => (n == null ? '—' : nf.format(n))
const pct = (n) => (n == null ? '—' : `${n}%`)
const num = (v) => (v == null ? '—' : String(Number(v)))
const fmtDuration = (s) => {
  if (s == null) return '—'
  const n = Math.round(Number(s))
  if (n < 60) return `${n}s`
  return `${Math.floor(n / 60)}m${String(n % 60).padStart(2, '0')}s`
}

async function fetchStats(token, days, includeDebug) {
  const qs = new URLSearchParams({ days: String(days), debug: includeDebug ? 'true' : 'false' })
  const res = await fetch(`${API_BASE}/api/event-stats?${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { status: res.status })
  return data
}

export default function EventStats({ token }) {
  const [days, setDays] = useState(30)
  const [includeDebug, setIncludeDebug] = useState(false)
  const [state, setState] = useState({ loading: true, error: null, data: null })

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fetchStats(token, days, includeDebug)
      setState({ loading: false, error: null, data })
    } catch (e) {
      setState({ loading: false, error: e, data: null })
    }
  }, [token, days, includeDebug])

  useEffect(() => { load() }, [load])

  const { loading, error, data } = state
  const chapterNames = Object.fromEntries((data?.chapterNames || []).map((c) => [c.chapter, c.title]))
  const chapterLabel = (id) => chapterNames[id] || `Chapter ${id}`
  const funnelRate = data?.dailyPuzzleFunnel?.starts
    ? Math.round((100 * data.dailyPuzzleFunnel.completes) / data.dailyPuzzleFunnel.starts)
    : null

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={`px-3 py-1.5 text-sm ${days === r.days ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={includeDebug} onChange={(e) => setIncludeDebug(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
          Include debug builds
        </label>
        <button onClick={load} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
        {data && <span className="text-xs text-slate-400">last {data.days} days{data.includeDebug ? ' · incl. debug' : ''}</span>}
      </div>

      {loading && !data && (
        <div className="grid place-items-center py-16 text-slate-500"><span className="inline-flex items-center gap-2"><Loader2 className="animate-spin" /> Loading analytics…</span></div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error.message}
        </div>
      )}

      {data && (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Tile label="Events" value={fmt(data.totals?.events)} />
            <Tile label="Active installs" value={fmt(data.totals?.installs)} />
            <Tile label="Daily-puzzle completion" value={pct(funnelRate)} sub={`${fmt(data.dailyPuzzleFunnel?.completes)} / ${fmt(data.dailyPuzzleFunnel?.starts)}`} />
            <Tile label="Level abandon rate" value={pct(data.abandon?.abandon_pct)} sub={`${fmt(data.abandon?.abandons)} abandons`} />
          </div>

          {/* Daily volume */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card title="Daily events">
              <DailyBars points={(data.dailyVolume || []).map((d) => ({ x: d.day, y: d.events }))} />
            </Card>
            <Card title="Daily active installs">
              <DailyBars points={(data.dailyVolume || []).map((d) => ({ x: d.day, y: d.installs }))} />
            </Card>
          </div>

          {/* Hardest levels */}
          <Card title="Hardest levels" subtitle="lowest win rate first — win% = completes ÷ starts">
            {data.hardestLevels?.length ? (
              <div className="space-y-1.5">
                {data.hardestLevels.map((r) => (
                  <BarRow
                    key={`${r.chapter}-${r.level}`}
                    label={`${chapterLabel(r.chapter)} · L${r.level}`}
                    valuePct={r.win_pct ?? 0}
                    display={`${pct(r.win_pct)} · ${fmt(r.wins)}/${fmt(r.attempts)}`}
                    title={`${r.attempts} starts, ${r.wins} completions`}
                  />
                ))}
              </div>
            ) : <Empty />}
          </Card>

          {/* Per-puzzle stats (campaign levels only) */}
          <Card title="Per-puzzle stats" subtitle="campaign levels only · daily puzzles excluded · click a column to sort">
            <PerPuzzleTable rows={data.perPuzzle} chapterLabel={chapterLabel} />
          </Card>

          {/* Event volume + hint usage */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card title="Event volume by type">
              {data.eventVolume?.length ? (
                <div className="space-y-1.5">
                  {(() => {
                    const max = Math.max(1, ...data.eventVolume.map((e) => e.count))
                    return data.eventVolume.map((e) => (
                      <BarRow key={e.event} label={e.event} valuePct={(100 * e.count) / max} display={fmt(e.count)} title={`${e.count} events`} mono />
                    ))
                  })()}
                </div>
              ) : <Empty />}
            </Card>

            <Card title="Hint usage by chapter">
              {data.hintsByChapter?.length ? (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                    <th className="py-1.5">Chapter</th><th className="py-1.5 text-right">Hints</th><th className="py-1.5 text-right">Players</th>
                  </tr></thead>
                  <tbody>
                    {data.hintsByChapter.map((h) => (
                      <tr key={h.chapter} className="border-b border-slate-100">
                        <td className="py-1.5">{chapterLabel(h.chapter)}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmt(h.hints_used)}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmt(h.players)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <Empty />}
            </Card>
          </div>

          {/* Top hint users */}
          <Card title="Top hint users" subtitle="anonymous install IDs — candidates for a Relaxed-mode nudge">
            {data.topHintUsers?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                  <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
                    <th className="py-1.5">Install ID</th><th className="py-1.5 text-right">Hints used</th>
                  </tr></thead>
                  <tbody>
                    {data.topHintUsers.map((u) => (
                      <tr key={u.install_id} className="border-b border-slate-100">
                        <td className="py-1.5 font-mono text-xs text-slate-500">{u.install_id}</td>
                        <td className="py-1.5 text-right tabular-nums">{fmt(u.hints)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <Empty />}
          </Card>
        </>
      )}
    </div>
  )
}

function Tile({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5 tabular-nums">{sub}</div>}
    </div>
  )
}

function Card({ title, subtitle, children }) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 font-semibold text-slate-800"><BarChart3 className="h-4 w-4 text-slate-400" /> {title}</div>
      {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Empty() {
  return <div className="text-sm text-slate-400 py-6 text-center">No data in this range yet.</div>
}

// Sortable per-puzzle table. Columns after the label are numeric; clicking a
// header sorts by it (numeric desc first), clicking the label sorts by Ch·L.
const PUZZLE_COLS = [
  { key: 'attempts', label: 'Attempts' },
  { key: 'completes', label: 'Completes' },
  { key: 'win_pct', label: 'Win %', fmt: (v) => (v == null ? '—' : `${num(v)}%`) },
  { key: 'abandons', label: 'Abandons' },
  { key: 'avg_moves', label: 'Avg moves', fmt: num },
  { key: 'perfect_pct', label: 'Perfect %', fmt: (v) => (v == null ? '—' : `${num(v)}%`) },
  { key: 'avg_seconds', label: 'Avg time', fmt: fmtDuration },
]

function PerPuzzleTable({ rows, chapterLabel }) {
  const [sort, setSort] = useState({ key: 'puzzle', dir: 'asc' })
  if (!rows || rows.length === 0) return <Empty />

  const sortVal = (r, key) =>
    key === 'puzzle'
      ? Number(r.chapter) * 100000 + Number(r.level)
      : (r[key] == null ? -Infinity : Number(r[key]))
  const sorted = [...rows].sort((a, b) => {
    const d = sortVal(a, sort.key) - sortVal(b, sort.key)
    return sort.dir === 'asc' ? d : -d
  })
  const clickSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'puzzle' ? 'asc' : 'desc' }))
  const arrow = (key) => (sort.key === key ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : '')

  return (
    <div className="overflow-x-auto max-h-[28rem] overflow-y-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead className="sticky top-0 bg-white">
          <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-200">
            <th className="py-1.5 pr-2">
              <button onClick={() => clickSort('puzzle')} className="hover:text-slate-700">Puzzle{arrow('puzzle')}</button>
            </th>
            {PUZZLE_COLS.map((c) => (
              <th key={c.key} className="py-1.5 px-2 text-right">
                <button onClick={() => clickSort(c.key)} className="hover:text-slate-700 whitespace-nowrap">{c.label}{arrow(c.key)}</button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={`${r.chapter}-${r.level}`} className="border-b border-slate-100 hover:bg-slate-50/60">
              <td className="py-1.5 pr-2 font-medium text-slate-700 whitespace-nowrap">{chapterLabel(r.chapter)} · L{r.level}</td>
              {PUZZLE_COLS.map((c) => (
                <td key={c.key} className="py-1.5 px-2 text-right tabular-nums text-slate-600">
                  {c.fmt ? c.fmt(r[c.key]) : fmt(r[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Horizontal bar row: label · track+fill · value. Single hue, direct-labeled.
function BarRow({ label, valuePct, display, title, mono }) {
  const w = Math.max(0, Math.min(100, valuePct))
  return (
    <div className="flex items-center gap-3" title={title}>
      <div className={`w-28 shrink-0 truncate text-xs text-slate-600 ${mono ? 'font-mono' : ''}`}>{label}</div>
      <div className="flex-1 h-4 rounded bg-slate-100 overflow-hidden">
        <div className="h-full rounded" style={{ width: `${w}%`, backgroundColor: ACCENT }} />
      </div>
      <div className="w-28 shrink-0 text-right text-xs text-slate-500 tabular-nums">{display}</div>
    </div>
  )
}

// Single-series daily bar chart in a responsive SVG. One bar per day, so it
// stays legible with only a handful of days (a line chart looks empty there).
// Hover titles on each bar.
function DailyBars({ points }) {
  if (!points || points.length === 0) return <Empty />
  const W = 640, H = 116, padL = 28, padR = 6, padT = 10, padB = 18
  const max = Math.max(1, ...points.map((p) => p.y))
  const n = points.length
  const band = (W - padL - padR) / n
  const barW = Math.max(2, Math.min(band * 0.7, 40))
  const yAt = (v) => padT + (1 - v / max) * (H - padT - padB)
  const baseline = H - padB
  const tickIdx = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="daily bar chart">
      {/* max gridline + baseline */}
      <line x1={padL} y1={padT} x2={W - padR} y2={padT} stroke="#e1e0d9" strokeWidth="1" />
      <line x1={padL} y1={baseline} x2={W - padR} y2={baseline} stroke="#c3c2b7" strokeWidth="1" />
      <text x={padL - 6} y={padT + 4} textAnchor="end" fontSize="10" fill="#898781">{max}</text>
      <text x={padL - 6} y={baseline} textAnchor="end" fontSize="10" fill="#898781">0</text>
      {points.map((p, i) => {
        const x = padL + i * band + (band - barW) / 2
        const y = yAt(p.y)
        return (
          <rect key={p.x} x={x} y={y} width={barW} height={Math.max(0, baseline - y)} rx="1.5" fill={ACCENT}>
            <title>{p.x}: {p.y}</title>
          </rect>
        )
      })}
      {tickIdx.map((i) => (
        <text key={points[i].x} x={padL + i * band + band / 2} y={H - 5} textAnchor="middle" fontSize="10" fill="#898781">
          {points[i].x.slice(5)}
        </text>
      ))}
    </svg>
  )
}
