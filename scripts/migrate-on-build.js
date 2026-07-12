// Runs on every Vercel deploy via the `vercel-build` npm script, before the
// frontend build, so the database schema always tracks the deployed code.
//
// It calls the canonical initializeSchema() (the same one dev-server runs on
// boot), which is fully idempotent — every statement is CREATE ... IF NOT
// EXISTS / ADD COLUMN IF NOT EXISTS — so re-running it on each deploy only adds
// what's missing (e.g. the new `events` table) and never touches existing data.
//
// It DELIBERATELY never fails the build. A transient database outage shouldn't
// block a frontend deploy: if the migration can't run, the build still ships,
// the schema converges on the next successful deploy, and any endpoint needing
// a not-yet-created table simply returns an error the client retries against.
//
// Requires POSTGRES_URL (or DATABASE_URL) to be available at BUILD time. On
// Vercel, project Environment Variables are exposed to the build unless you've
// scoped them to runtime-only; if it's missing here we skip with a warning.
import { initializeSchema } from '../lib/db.js'

if (!process.env.POSTGRES_URL && !process.env.DATABASE_URL) {
  console.warn('[migrate-on-build] No POSTGRES_URL/DATABASE_URL at build time — skipping schema migration.')
  process.exit(0)
}

try {
  await initializeSchema()
  console.log('[migrate-on-build] Schema is up to date.')
} catch (err) {
  console.warn('[migrate-on-build] Schema migration failed (continuing build anyway):', err?.message || err)
}
process.exit(0)
