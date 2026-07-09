# CAS

CAS is the Appraisal Operating System: a modern SaaS foundation for appraisal firms, solo appraisers, AMCs, lenders, reviewers, and office teams.

## First implementation phase

This branch establishes the first commercial-demo foundation for CAS:

- Next.js app router with TypeScript and Tailwind CSS
- Responsive SaaS shell with sidebar, topbar, global command search, dashboard, orders, intake, review, appraiser, vendor, accounting, analytics, documents, notifications, clients, and settings surfaces
- Demo order, appraiser, client, vendor, KPI, notification, and chart data
- Orders table with search, saved views, filters, sorting, selection, quick assignment, status chips, due warnings, and export/bulk action controls
- Order detail panel with summary, quick actions, sections, timeline, notes, documents, accounting, and review context
- Supabase-ready auth helper and environment variables
- Multi-tenant Supabase schema with organizations, members, roles, permissions, invitations, orders, documents, reviews, accounting, vendor panel, workflow, automation, audit, and notification tables
- RLS helpers and policies for tenant membership, admin access, permissions, vendor panel visibility, and sensitive accounting access
- Seed data for a demo appraisal firm and AMC workspace

## Local setup

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and set Supabase values when connecting to a real project.

## Supabase

CAS now has a Supabase foundation while still keeping demo mode as the default fallback.

- Leave `NEXT_PUBLIC_CAS_DATA_SOURCE=demo` to use the current local demo state.
- Set `NEXT_PUBLIC_CAS_DATA_SOURCE=supabase` and provide `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_ANON_KEY` when testing against a Supabase project.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. It is for seed/admin scripts, not browser code.

The schema starts in `supabase/migrations/202606290001_initial_schema.sql` and Phase 5 backend extensions are in `supabase/migrations/202607090001_phase5_backend_foundation.sql`. Demo seed data is in `supabase/seed.sql`.

The schema is intentionally automation-ready and AI-ready: workflow steps, required fields/documents, automation rules, review state, audit logs, and notification records are first-class tables instead of hard-coded UI-only state.

The app data-access layer lives in `src/lib/repositories`. It returns demo data by default and can load from Supabase once auth, tenant membership, and project environment variables are configured.

## Validation

Validated locally with:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

The build compiles the app as static content and generates the typed route references used by Next.js.
