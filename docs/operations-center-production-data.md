# Operations Center Production Data

Phase 10.6 moves the production dashboard behind a server/repository boundary. The browser requests `/api/operations-center` with the signed-in Supabase access token and receives only a validated `OperationsCenterModel`.

## Flow

1. Authenticated request includes a bearer token.
2. Server creates a Supabase client scoped to that token.
3. Repository resolves user profile, active organization, role, and permissions.
4. Repository loads the active organization's records through RLS-protected Supabase queries.
5. `buildOperationsCenterModel` applies workflow scope, shared-order visibility, fee authorization, activity redaction, capacity rules, and vendor visibility.
6. `validateOperationsCenterModel` rejects raw lists or hidden fields before the response is returned.

The route fails closed with `401` when authentication is missing and `403` when organization, role, permission, or model validation fails.

## Query Strategy

The current Supabase repository still supports the broader workspace bootstrap for non-dashboard pages. The Operations Center boundary centralizes dashboard shaping now and caps preview lists for mission, risk, upcoming work, activity, capacity, and vendor scorecards. Counts are calculated before display caps.

Future scaling work should move mission counts, at-risk queues, activity, and financial summaries into narrower repository queries or RPC functions. Cache keys, if added, must include user id, organization id, role, permissions, and active data source.

## Demo Separation

Demo mode remains fictional and session-local. Demo role switching may build the model in the browser because the fixture data is not production data. Production mode must not silently fall back to demo data when the endpoint fails.

## Supabase Access Notes

New Supabase projects may require explicit grants before public-schema tables are reachable through the Data API. RLS still controls rows; grants control whether a role can reach the table at all. Any future dashboard-specific tables or functions must include explicit grants and RLS policies in the same migration.
