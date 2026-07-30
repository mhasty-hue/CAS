# CAS Review Rule Governance

CAS review findings are QC aids. Rules must be traceable, versioned, and reviewable before they can affect production workflows.

## Deterministic Rules Added

- Subject address matches the order
- Client and intended user align with the order
- Report type matches ordered product
- Effective date present
- Inspection date present when required
- Signature date present
- Date ordering
- Appraiser signature present
- Final value is numeric
- Final value matches reconciliation
- Required sections present
- Required exhibits present
- GLA consistency
- Site-size consistency
- Bedroom/bath consistency
- Comparable sale adjusted values complete
- Net/gross adjustment math consistency
- Order instructions addressed
- Revised version comparison
- FHA condition commentary
- VA exhibit placeholder
- Estate retrospective effective-date match
- Litigation purpose disclosure

## Finding Lifecycle

Findings use these severities:

- Critical
- Warning
- Advisory
- Passed

Findings use these statuses:

- Open
- Appraiser Responded
- Corrected
- Accepted Explanation
- Dismissed
- Escalated
- Revision Requested
- Resolved

## Governance Rules

- Every rule has a stable ID, title, category, source, effective date, default severity, and human-judgment flag.
- Phase 10.6 adds rule version, source type/reference, profile applicability, overlay applicability, default client visibility, suggested next step, and test-fixture metadata.
- A finding must include source evidence and suggested resolution.
- A finding must preserve rule source, version, why-it-matters text, deterministic/AI classification, and visibility.
- A rule can flag risk, inconsistency, or missing information. It cannot determine market value or reject a report by itself.
- Client visibility is opt-in per finding and controlled by reviewer permissions.
- Appraiser responses and reviewer decisions should be preserved in finding events.
- External client, AMC, agency, or program guidance must be represented as a versioned overlay with an effective date.

## Active Phase 10.6 Rule Packs

- Universal CAS QC `1.0`
- Legacy Conventional Single-Family `1.0`
- FHA Single-Family Overlay `1.0`
- VA Single-Family Overlay `1.0`
- Estate / Retrospective `1.0`
- UAD 3.6 Foundation `0.1`

## Release Checklist For New Rules

- Add or update the profile/overlay definition.
- Add deterministic test coverage.
- Confirm reviewer/appraiser/client visibility.
- Confirm fee fields are not introduced into review findings.
- Confirm malformed/large/duplicate files are handled safely.
- Document the rule source and effective date.
