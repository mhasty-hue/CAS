# Notification Privacy

Role-aware rendering lives in `src/lib/notifications/privacy.ts`.

The same event can render differently by recipient:

- AMC/internal staff can see operational names and next actions.
- Appraisers can see assignment, due date, bid, and revision action content, but not client fee, AMC margin, other bidders, payroll, or internal ranking.
- Lenders and private clients receive client-safe status wording.
- Review-only findings stay reviewer/appraiser scoped until explicitly released.

Restricted content patterns include service-role keys, storage paths, permanent signed URLs, client fee, margin, payroll, competing bid details, and internal review notes.

Client users only see communication history rows classified as `client_safe` or `shared`.
