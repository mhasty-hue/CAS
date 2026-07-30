# Operations Center Data Contract

The production dashboard receives `OperationsCenterModel`, not raw orders, invoices, accounting entries, clients, appraisers, vendors, or documents.

## Allowed Payload Shape

The model may contain:

- greeting, date label, active user summary, active organization summary
- active persona and role summary
- scoped order ids and authorized financial policy labels
- mission items, snapshots, risk queue, upcoming work, activity feed, quick actions
- capacity insights only when authorized
- vendor scorecards only when authorized
- recommendation summary
- empty state, generation timestamp, and freshness metadata

## Forbidden Payload Shape

The model must not serialize raw lists or hidden internal fields such as:

- `orders`, `accountingEntries`, `invoices`, `clients`, `companyUsers`, `appraisers`, `vendors`, `vendorDocuments`
- `clientFee`, `vendorFee`, `margin`, `companyMargin`, `appraiserPayout`, `commissionSplitOverride`
- internal notes, unrelated audit trails, unrelated users, or unapproved internal review data

`src/lib/operations-center/contract.ts` validates this boundary. Contract failure is a server-side access error, not a UI warning.

## Freshness

Every model includes `generatedAt` and `freshness`. Preview arrays can be capped, but scoped counts and mission totals must be calculated before capping.
