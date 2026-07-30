# Report Version Comparison

CAS never overwrites a report. Each upload creates an immutable report version with preserved source files and a checksum or object identity.

## What Is Compared

Phase 10.7 compares structured extracted fields when both versions are available:

- Effective date
- Value conclusion
- Subject address
- GLA
- Site size
- Bedrooms and bathrooms
- Condition commentary
- Reconciliation commentary
- Signed certification
- Exhibit presence
- Resolved and unresolved finding IDs from the revised version

## Confidence Labels

- Verified structured change: both versions have comparable extracted fields.
- Textual change: reserved for future text-diff support.
- Potential change: reserved for future partial extraction support.
- Unable to compare: a field or version is missing.

## Reviewer Use

The comparison answers "what changed?" without claiming complete visual comparison. Reviewers still make the final call, especially when extraction is incomplete or source coordinates are missing.

## Delivery Protection

The workspace makes the active version obvious and keeps prior review results. Client download should remain limited to an explicitly released final version.
