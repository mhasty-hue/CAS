# Review Workspace

Phase 10.7 turns report QC into a single order-level workspace instead of separate review fragments.

## Reused Architecture

- Immutable report versions from `src/types/report-review.ts`
- Deterministic ingestion and rules from `src/lib/report-review/ingestion.ts` and `src/lib/report-review/rules.ts`
- Review pack/profile selection from Phase 10.6
- Finding visibility helpers from `src/lib/report-review/permissions.ts`
- Order detail integration through `src/components/cas/order-detail.tsx`

## Workspace Regions

- Report Viewer: selected version, page navigation, zoom, text search, and page-level evidence focus.
- Findings Panel: severity, status, category, rule pack, human judgment, visibility, source page, and responsible-party filters.
- Finding Detail: explanation, why it matters, report evidence, order evidence, appraiser response, reviewer response, AI metadata where present, and disposition controls.
- Version/Readiness Panel: immutable versions, structured comparison, delivery-readiness reasons, and revision-request draft.

On smaller screens the workspace switches to tabs so the report remains readable.

## Permissions

The workspace asks the existing visibility helper for findings. Phase 10.7 adds an organization guard for internal/reviewer/appraiser findings and preserves client access only for their own client-visible order items.

The workspace model does not include client fees, vendor fees, company margin, bid data, hidden prompts, provider credentials, or raw audit payloads.

## Current Limits

- PDF highlighting is page-level, not coordinate-perfect.
- Extraction values are still demo fixtures unless a production parser is configured.
- Profile and overlay correction is represented by the review-pack architecture but not yet a full settings drawer.
