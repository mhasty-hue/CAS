# CAS Public Demo Deployment

## Current-State Audit

- Branch structure: this public showcase work is intended to live on `demo/public-showcase`, based on the completed `codex/bootstrap-cas` development branch. It should not be merged into `main` automatically.
- Vercel configuration: no `vercel.json` or checked-in `.vercel` project config exists. The app uses the Next.js framework preset from repository settings.
- Authentication flow: production mode loads Supabase Auth and organization membership context through `loadCasAuthContext`; unsigned or misconfigured production access shows `ProductionAccessGate`.
- Existing demo mode and role switcher: local/demo state already exists in `src/components/cas-app.tsx`, and the development role switcher is gated by demo mode.
- Demo/fallback data: fictional local fixtures live in `src/data/demo.ts`, `src/data/platform.ts`, and `src/data/connected.ts`; the demo repository returns those fixtures by default.
- Supabase usage: `src/lib/supabase.ts` selects Supabase only when `NEXT_PUBLIC_CAS_DATA_SOURCE=supabase` and public Supabase keys are configured.
- Running without Supabase: yes, when the app is using demo/local data. Production Supabase mode does not silently fall back when Supabase access fails.
- Role and organization preview logic: active user and active organization are derived from the selected `PortalUser`, then applied to role navigation, order filtering, fee visibility, order detail visibility, and dashboard views.
- Middleware/route protection: no middleware route guard is currently checked in. The production app-level auth gate lives in `CasApp`.
- Environment variables: `.env.example` documents data source, demo mode, Supabase URL/key values, app URL, notification provider, and development-only Supabase smoke-test users.
- Demo mutations: current demo mutations are local React state. They are session-local and reset on browser refresh or through the public demo reset action.

## Recommended Demo Architecture

Use a dedicated public demo deployment from the `demo/public-showcase` branch with both demo flags enabled:

- `NEXT_PUBLIC_CAS_DEMO_MODE=true`
- `CAS_DEMO_MODE=true`
- `NEXT_PUBLIC_CAS_DATA_SOURCE=demo`

The public demo uses static fictional fixtures and session-local state. It does not require Supabase Auth, does not create real users, does not connect to production data, and does not send email, SMS, payments, calendar writes, webhooks, analytics payloads, vendor invitations, or production document uploads.

Normal development and production deployments should leave `CAS_DEMO_MODE` unset or false and set `NEXT_PUBLIC_CAS_DATA_SOURCE=supabase` when using the real backend.

## Public Demo Features

- No-login landing page at the app root when the dedicated server-side demo flag is enabled.
- Role cards for AMC, lender, appraisal company, appraiser, reviewer, private client, and CAS Connected participant views.
- Persistent public demo banner with active role, active organization, Switch Demo Role, and Reset Demo.
- Review shortcuts for AMC workflow, lender workflow, appraiser workflow, private-client tracking, direct assignment, bid comparison, review, delivery, and accounting privacy.
- Fictional organizations only: National Valuation Services, HarborPoint Lending, First Carolina Community Bank, CAA Real Property Services, Upstate Appraisal Group, Blue Ridge Valuation, Rowan Legal Group, Private Property Owner, and Hollis Estate Representative.
- Fictional orders covering new intake, needs assignment, bidding, awaiting acceptance, active work, inspection scheduling, inspection scheduled, inspected, report in progress, submitted, in review, revisions, ready for delivery, delivered, completed, and cancelled.
- Fee privacy example: client fee `$600`, vendor/appraiser fee `$500`, gross spread `$100`.
- Reset Demo restores original local orders, statuses, assignments, fees, users, clients, vendors, documents, messages, invoices, tasks, notifications, and settings.

## Vercel Setup

1. Create the demo branch from the current development branch:

   ```bash
   git checkout codex/bootstrap-cas
   git pull
   git checkout -b demo/public-showcase
   git push -u origin demo/public-showcase
   ```

2. In Vercel, create a second project from the same GitHub repository.

3. Set the production branch for that Vercel project to:

   ```text
   demo/public-showcase
   ```

4. Set the framework preset to `Next.js`.

5. Configure only safe demo environment variables:

   ```text
   NEXT_PUBLIC_CAS_DATA_SOURCE=demo
   NEXT_PUBLIC_CAS_DEMO_MODE=true
   CAS_DEMO_MODE=true
   NEXT_PUBLIC_APP_URL=https://your-vercel-demo-url.vercel.app
   CAS_EMAIL_PROVIDER=development-log
   ```

6. Do not copy production-only secrets unless a future isolated demo database intentionally requires them.

7. Do not configure production Supabase service-role keys in the public demo project.

8. Disable Vercel Deployment Protection for this public demo project if the goal is a no-login public review URL.

9. Deploy the project.

10. Open the deployed URL in an incognito browser and confirm:

    - The public demo landing page appears.
    - No sign-in page is required.
    - Role cards are keyboard accessible.
    - Switch Demo Role works.
    - Reset Demo restores the original scenario.
    - Client, appraiser, reviewer, AMC, and lender fee visibility differs by role.

11. Use the Vercel-generated URL until a custom domain is worth locking in. A generated URL such as `https://cas-public-demo.vercel.app` is fine for review and does not require buying a domain.

12. To update the demo later, merge or cherry-pick approved development work into `demo/public-showcase`, test locally, and push that branch. Vercel will redeploy the public demo project from that branch.

## Safety Checklist

- `CAS_DEMO_MODE` must be true before the public no-login experience is treated as server-enabled.
- `NEXT_PUBLIC_CAS_DEMO_MODE` must be true before the browser renders the public demo shell.
- `NEXT_PUBLIC_CAS_DATA_SOURCE` should be `demo` for the public demo.
- Public demo data must stay fictional.
- Public demo actions must remain simulated or session-local.
- Production Supabase credentials, service-role keys, real customer data, real passwords, real email/SMS providers, payment credentials, calendar write credentials, and production webhooks must not be configured in the public demo project.
