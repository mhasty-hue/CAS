# Dashboard Financial Visibility

Dashboard financial visibility is permission-driven and relationship-aware.

## Field Concepts

The Operations Center does not treat all money as one generic fee. It distinguishes:

- client fee
- vendor or appraiser fee
- own assignment fee
- invoice balance
- payroll payout
- gross spread or margin

## Authorization

Financial policy is derived from `getAuthorizedOrderFees` and existing permission helpers. Unauthorized fields are omitted from the model instead of being set to zero.

Examples:

- Lender users may receive client fee when authorized.
- Individual appraisers may receive `Your Assignment Fee`.
- Reviewers receive no financial cards by default.
- AMC administrators with fee permissions may receive client fee, vendor fee, and gross spread.
- AMC staff do not receive executive margin by default.

## Payload Rules

Unauthorized financial values must not appear in:

- dashboard cards
- mission details
- activity text
- capacity or vendor scorecard panels
- quick actions
- serialized Operations Center payloads

The Phase 10.5 regression test checks that lender, appraiser, reviewer, and property-owner payloads omit restricted fee labels and margin concepts.
