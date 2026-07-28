# CAS Review Profile Design

Review profiles define the report-type-specific shape of an appraisal review. They are versioned so CAS can evolve without scattering changing guidance across UI components or ad hoc rules.

## Initial Profiles

- Legacy Conventional Single-Family
- UAD 3.6 Dynamic URAR
- Condominium
- 2-4 Unit
- Manufactured Home
- Desktop
- Hybrid
- Land
- Estate / Retrospective
- Divorce / Litigation
- General-Purpose Narrative

Each profile defines:

- Stable `profile_key`
- Name and version
- Report standard
- Product match terms
- Required sections
- Required exhibits
- Deterministic rule IDs
- AI review categories for future provider prompts
- Active overlays
- Effective dates
- Status: draft, active, or retired

## Overlay Layers

CAS applies overlays in this order:

1. Universal
2. Profile
3. Program
4. Client
5. Organization
6. Order

Initial overlays:

- Universal CAS QC
- Legacy Conventional
- UAD 3.6
- FHA
- VA
- Private Client
- Estate
- Divorce / Litigation
- Lender-Specific
- AMC-Specific
- Organization Default
- Order-Specific

## Selection Rules

`selectReportProfile()` uses product type, file name, and identified file kind to choose a profile. `selectReviewOverlays()` uses the order loan type, product type, AMC/client relationship, organization type, and profile defaults to add overlays.

This keeps the profile decision explicit and testable while avoiding new database tables unless the workflow actually needs them.

## Future Work

- Admin UI to manage profile versions.
- Overlay import/version approval workflow.
- Effective-date handling for external guideline changes.
- Organization-specific rule publishing with audit approval.
