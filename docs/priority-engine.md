# Priority Engine

The Phase 10.5 priority engine is deterministic. It does not use AI scoring.

## Risk Factors

Visible orders may receive risk points for:

- past due
- due within 24 hours
- inspection not confirmed near due date
- waiting in review
- revision waiting
- assignment needed
- document gap
- assigned appraiser at capacity

## Levels

- Critical
- High Risk
- Medium Risk
- Low Risk

## Redaction

Client and private-customer roles receive simplified risk wording. Internal review, capacity, appraiser, and vendor details are not exposed unless the role is allowed to see them.

## Mission Items

Mission items are built from visible scoped data and carry:

- priority
- category
- count
- next action
- destination action
- permission/source label
- scoped order IDs

This makes card counts auditable and keeps dashboard totals aligned with the filtered queues they open.
