import { Package, ArrowRight, Archive } from 'lucide-react'

// The Frogs & Snakes asset portal has been retired. Asset uploads and review now
// live on Molta (https://molta.dev). This page is a deprecation notice that
// redirects artists to the new home; the old upload/review UI has been removed.
const MOLTA_URL = 'https://molta.dev'

export default function AssetPortal() {
  return (
    <div className="h-full overflow-y-auto overscroll-contain select-text bg-slate-50 text-slate-900">
      <main className="min-h-full grid place-items-center px-4 py-16">
        <div className="max-w-lg w-full text-center space-y-6 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-amber-100 grid place-items-center">
            <Archive className="h-7 w-7 text-amber-600" />
          </div>

          <div className="space-y-2">
            <span className="inline-block text-xs font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 rounded-full px-3 py-1">
              Deprecated
            </span>
            <h1 className="text-2xl font-bold">This asset portal has moved</h1>
            <p className="text-slate-500">
              The Frogs &amp; Snakes asset portal is no longer in use. Asset
              uploads, review, and previews now happen on{' '}
              <span className="font-semibold text-slate-700">Molta</span>.
            </p>
          </div>

          <a
            href={MOLTA_URL}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700"
          >
            <Package className="h-4 w-4" />
            Go to molta.dev to upload
            <ArrowRight className="h-4 w-4" />
          </a>

          <p className="text-xs text-slate-400">
            Make all new uploads at{' '}
            <a href={MOLTA_URL} className="underline hover:text-slate-600">molta.dev</a>.
            Need access? Ask the developer for your Molta access code.
          </p>
        </div>
      </main>
    </div>
  )
}
