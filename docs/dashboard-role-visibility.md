# Dashboard Role Visibility

The Operations Center centralizes dashboard scope in `src/lib/operations-center/service.ts`.

## Scope Rules

- Order visibility reuses `filterOrdersForWorkflow`.
- Mission items carry their scoped order IDs for auditability.
- Counts are calculated only from orders visible to the active user.
- Appraiser capacity is visible only to authorized manager/vendor roles or to the individual appraiser for their own capacity.
- Vendor scorecards are visible only to AMC/vendor-management style roles.
- Client and private-customer activity uses redacted wording.

## Role Behavior

- AMC admin: AMC operations, vendor compliance, review/delivery, and authorized finance.
- AMC staff: order operations, assignment, scheduling, review/delivery support, no executive margin by default.
- Lender using AMC: own orders, client-visible status, requested documents, delivered reports, client fee only when authorized.
- Internal lender: internal appraisal department workflow without AMC margin language.
- Hybrid lender: classified as a separate persona so future UI can separate internal and AMC-managed work.
- Appraisal company owner: company operations, capacity, and authorized company finance.
- Appraisal company staff: operational queue without owner-level financials.
- Individual appraiser: assigned/offered work, personal inspections, revisions, and own assignment fee.
- Reviewer: review queue, findings, revisions, no financial cards by default.
- Attorney/private professional client: matter tracking and client-facing actions.
- Property owner/private customer: simplified status, documents, payment/report access only.

## Current Limitation

The demo shell is still client-rendered and imports fictional fixtures in the browser. The dashboard component itself no longer consumes raw financial/vendor/order lists, but the long-term production target is a server route or repository method that returns only `OperationsCenterModel`.
