# CAS Supabase Foundation

Phase 5 adds the production database foundation without replacing the current demo UI state.

## Environment

Use demo mode until a Supabase project is ready:

```bash
NEXT_PUBLIC_CAS_DATA_SOURCE=demo
```

To test Supabase-backed reads:

```bash
NEXT_PUBLIC_CAS_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key must stay server-side and should only be used for migrations, seeds, and trusted admin scripts.

## Phase 10 Development Project Setup

1. Keep `.env.local` out of git. It should include the Supabase URL, publishable key, `NEXT_PUBLIC_CAS_DATA_SOURCE=supabase`, and `NEXT_PUBLIC_CAS_DEMO_MODE=false`.
2. Link the project with the Supabase CLI after authenticating locally:

```bash
supabase login
supabase link --project-ref <project-ref>
```

The CLI requires a Supabase access token for `link`. If a direct database connection string is used instead, run `supabase db push --db-url <connection-string> --dry-run` before applying migrations.

3. Apply migrations only with `supabase db push`. Do not run `supabase db reset` against the remote development database unless the team explicitly approves a destructive reset.
4. Seed development data with `supabase db push --include-seed` or `supabase seed` after migrations have been verified.
5. Run `pnpm supabase:smoke` after migrations and seed data are in place. Optional authenticated checks require `CAS_TEST_USER_EMAIL` and `CAS_TEST_USER_PASSWORD` in the local environment.

## Schema

The initial migration creates organizations, profiles, roles, permissions, clients, appraisers, orders, review, accounting, vendors, workflow, audit logs, and notifications.

The Phase 5 migration extends that foundation with:

- company user permission overrides and invitation metadata
- client contacts and product fee defaults
- order assignment, access, commission, accounting, and calendar fields
- customizable order intake templates
- generic document metadata
- review item, payroll, payment history, and calendar tables
- indexes, updated-at triggers, and tenant-aware RLS policies

Later migrations add invite/public ordering infrastructure, production document management, workflow automation, smart order imports, hosted Supabase grants, auth profile creation, and storage bucket policies.

## Local Seed

`supabase/seed.sql` includes a realistic CAS demo organization, roles, permission catalog, clients, appraisers, vendors, orders, documents, review, payroll/accounting rows, notifications, and form/calendar configuration.

Auth users are not hard-coded into the seed because `public.user_profiles.id` is tied to `auth.users(id)`. When real auth is connected, create Supabase Auth users first, then attach them through `organization_members`.
