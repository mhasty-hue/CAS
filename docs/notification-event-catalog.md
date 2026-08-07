# Notification Event Catalog

Notification definitions live in `src/lib/notifications/catalog.ts`.

Each event has:

- event key
- label
- category
- priority
- default audience
- action-required flag
- mandatory flag where applicable
- template version
- visibility classification

Covered categories are orders, assignments, bids, inspections, review, revisions, documents, accounting, compliance, messages, delivery, and system/security.

Accounting events are marked `accounting_restricted`. Client-safe events never include vendor fee, margin, payroll, other bid amounts, internal review notes, storage paths, or permanent signed URLs.
