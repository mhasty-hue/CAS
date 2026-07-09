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
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

The service role key must stay server-side and should only be used for migrations, seeds, and trusted admin scripts.

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

## Local Seed

`supabase/seed.sql` includes a realistic CAS demo organization, roles, permission catalog, clients, appraisers, vendors, orders, documents, review, payroll/accounting rows, notifications, and form/calendar configuration.

Auth users are not hard-coded into the seed because `public.user_profiles.id` is tied to `auth.users(id)`. When real auth is connected, create Supabase Auth users first, then attach them through `organization_members`.
