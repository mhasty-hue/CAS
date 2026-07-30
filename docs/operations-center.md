# Operations Center

Phase 10.5 upgrades the dashboard into a role-aware Operations Center. The dashboard is intentionally a presentation layer: it renders an `OperationsCenterModel` produced by `src/lib/operations-center/service.ts`.

## Architecture

- Raw repository or demo data enters `buildOperationsCenterModel`.
- Orders are scoped first with the existing workflow visibility rules.
- Financial values are reduced through existing fee authorization helpers.
- Mission items, risk cards, upcoming work, activity, capacity, vendor scorecards, and quick actions are built only from scoped data.
- The dashboard component receives only the sanitized model.

This pattern is the production API boundary: Supabase mode should return the same sanitized model from a server-side repository/API path rather than sending raw tenant data to the browser and hiding fields in React.

## Greeting

The greeting is resolved from the active user:

- preferred name
- first name
- first token of display name
- neutral `Welcome back.` fallback

Time of day is calculated from user timezone, then organization timezone, then browser local timezone. The client app starts from a stable timestamp and updates after hydration so server-rendered output does not drift.

## Sections

- Today’s Mission
- At-Risk Work
- Upcoming Work
- Quick Actions
- Role-specific capacity, review, vendor, or activity panels
- Operational snapshots

Private customer views intentionally stay simple and omit professional operations panels.

## Demo Mode

Demo personas use the same model builder as production-like mode. Switching demo roles changes greeting, scope, mission items, financial policy, and visibility without using a second permission system.
