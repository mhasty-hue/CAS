# CAS Report Ingestion Architecture

Phase 10.4 introduces the foundation for report-type-aware appraisal review. It does not create an autonomous appraisal reviewer and it does not replace the existing document, order, shared-order, review, revision, accounting, or CAS Connected workflows.

## Goals

- Preserve each uploaded report file as an immutable report version.
- Identify the report file kind: PDF report, legacy XML, UAD 3.6 XML/package, addendum, photo exhibit, sketch, map, invoice, or other support file.
- Extract a normalized report model with field-level provenance, confidence, extraction method, and verification status.
- Compare extracted report data against the master order without creating duplicate order records.
- Run deterministic universal, profile, program, client, organization, and order overlays.
- Produce structured findings for appraiser response and human reviewer action.
- Keep automated findings private unless a reviewer explicitly marks a finding client-visible.
- Keep AI-assisted review disabled unless a future server-side provider is configured.

## Data Flow

1. Appraiser or permitted staff uploads a report package.
2. CAS preserves the source file in private document storage.
3. The ingestion service identifies file kinds and rejects duplicate, malformed, empty, or oversized files in plain language.
4. CAS selects a versioned review profile from the order product/report type.
5. CAS applies active overlays such as universal, FHA, VA, private-client, estate, divorce, lender-specific, AMC-specific, organization, and order overlays.
6. The demo parser builds a normalized appraisal report with extracted fields.
7. The deterministic rule engine creates a review result and findings.
8. Appraisers may respond or upload corrected versions where permitted.
9. Reviewers may confirm, dismiss, change severity, request revisions, resolve, approve, or release client-visible findings.
10. Clients see only approved client-visible items and released report documents.

## Main Code Paths

- Types: `src/types/report-review.ts`
- Profile and overlay config: `src/lib/report-review/profiles.ts`
- Deterministic rules: `src/lib/report-review/rules.ts`
- Ingestion and demo parsing: `src/lib/report-review/ingestion.ts`
- Role visibility: `src/lib/report-review/permissions.ts`
- Disabled AI provider seam: `src/lib/report-review/ai-provider.ts`
- Demo scenarios: `src/data/report-review.ts`
- Order detail UI: `src/components/cas/report-review.tsx`
- Database foundation: `supabase/migrations/20260727160750_phase10_4_report_ingestion_review.sql`

## Database Foundation

The migration adds:

- `report_review_profiles`
- `report_review_overlays`
- `appraisal_report_versions`
- `normalized_appraisal_reports`
- `report_review_results`
- `report_review_findings`
- `report_review_finding_events`
- `report_ai_provider_settings`

The schema is additive. It does not reset data, replace existing `report_submissions`, or alter the one-master-order model.

## Known Limitations

- The parser is a deterministic demo parser. It is ready for provider adapters, but it does not perform production PDF OCR or AI extraction.
- AI review is disabled by default and returns no findings.
- Repository persistence for the new review tables is intentionally deferred; the UI demonstrates the workflow in local state.
- External guidance such as lender/AMC manuals must be entered as versioned overlays before CAS can enforce it.
