# AI-Assisted Review Pilot

Phase 10.7 adds a controlled AI-assisted review pilot behind the existing provider boundary.

## Production Default

Production AI review is disabled by default. If no organization settings are configured, CAS runs deterministic checks only.

## Demo Provider

Demo mode can use `cas-demo-ai`, a deterministic mock provider. It uses fictional extracted report fixtures and creates evidence-grounded reviewer questions. It does not call an external service and has zero demo cost.

## Implemented Pilot Categories

- Reconciliation-quality review
- Assignment-instruction response detection
- FHA condition-description review question
- VA condition-description review question
- Retrospective-date methodology concern

The type system also reserves the remaining pilot categories for future provider-backed work.

## Safety Rules

- Every AI finding is labeled AI-assisted.
- Every AI finding requires human judgment.
- AI findings default to internal visibility and are never client-visible by default.
- CAS does not auto-approve, auto-reject, rewrite reports, or change value conclusions.
- External provider failure does not block deterministic checks.
- Raw provider output is not rendered as trusted HTML.

## Audit Metadata

Each AI run records provider id, model id, prompt version, categories requested, report version id, review-pack ids, accepted finding count, rejected finding count, status, timing, and usage/cost placeholder data.
