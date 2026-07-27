# CAS AI Review Safety

Phase 10.4 creates an AI-provider abstraction but keeps AI-assisted report review disabled by default.

## Safety Position

CAS must not:

- Determine appraised value.
- Rewrite an appraiser's analysis or conclusion.
- Silently alter report content.
- Automatically reject a report solely from automated or AI-generated findings.
- Expose internal review findings to a client unless a reviewer approves client visibility.
- Send report content to an external AI provider without explicit organization configuration and server-side controls.

CAS may:

- Extract structured fields from report files.
- Compare extracted fields to the order.
- Run deterministic QC checks.
- Suggest places where a human reviewer or appraiser should look.
- Preserve evidence, source pages, XML paths, confidence, and audit history.

## Current Implementation

`src/lib/report-review/ai-provider.ts` exports a disabled provider. It returns no findings and explains that only deterministic checks ran.

The production database includes `report_ai_provider_settings`, with `enabled` defaulting to false. Browser code must receive only public configuration. Any future external AI provider must run through server-side code with tenant checks, audit logging, and explicit organization consent.

## Future AI Provider Requirements

- Server-side only.
- Organization-level enablement.
- No service-role secrets in browser code.
- Clear data-retention and provider disclosures.
- Prompt/version governance.
- Human reviewer approval for every finding that affects delivery or client communication.
- Redaction controls for nonessential private data.
- Regression tests proving AI disabled mode makes no external calls.
