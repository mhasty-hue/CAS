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
- Phase 7 production foundation with Supabase Auth screens, invite acceptance, protected production shell behavior, public order-request links, notification preferences, assignment-level invoicing, invoice settings, and vendor-neutral LOS integration scaffolding

## Local setup

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and set Supabase values when connecting to a real project.

## Supabase

CAS now has a Supabase foundation while still keeping demo mode as the default fallback.

- Leave `NEXT_PUBLIC_CAS_DATA_SOURCE=demo` to use the current local demo state.
- Leave `NEXT_PUBLIC_CAS_DEMO_MODE=true` to keep the demo role switcher available.
- Set `NEXT_PUBLIC_CAS_DATA_SOURCE=supabase` and `NEXT_PUBLIC_CAS_DEMO_MODE=false`, then provide `NEXT_PUBLIC_SUPABASE_URL` plus `NEXT_PUBLIC_SUPABASE_ANON_KEY`, when testing authenticated production mode.
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only. It is for seed/admin scripts, not browser code.
- Email notifications use a development-log provider by default. Configure a real provider later through `CAS_EMAIL_PROVIDER` plus the relevant provider token.

The schema starts in `supabase/migrations/202606290001_initial_schema.sql`; Phase 5 backend extensions are in `supabase/migrations/202607090001_phase5_backend_foundation.sql`; Phase 7 production foundations are in `supabase/migrations/202607100001_phase7_production_foundation.sql`. Demo seed data is in `supabase/seed.sql`.

The schema is intentionally automation-ready and AI-ready: workflow steps, required fields/documents, automation rules, review state, audit logs, and notification records are first-class tables instead of hard-coded UI-only state.

The app data-access layer lives in `src/lib/repositories`. It returns demo data by default and can load from Supabase once auth, tenant membership, and project environment variables are configured.

Phase 7 adds:

- `/login`, `/forgot-password`, `/reset-password`, `/auth/callback`, and `/invite/[token]` routes for Supabase Auth-ready access.
- `/order/[organization-slug]` for public appraisal requests that staff can later convert into full orders.
- Notification service interfaces that log safely in development until a real provider is configured.
- Invoice service utilities for assignment-level line items, totals, invoice numbers, and draft invoice creation.
- LOS provider interfaces plus a mock LendingQB / MeridianLink Mortgage adapter for future lender-system imports, status updates, document delivery, and vendor messages.

## Validation

Validated locally with:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

The build compiles the app as static content and generates the typed route references used by Next.js.
