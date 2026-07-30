# AI Review Provider Boundary

CAS has an AI provider interface, but deterministic checks remain the trusted core. The default provider is disabled and returns no findings.

## Requirements Before Any External Provider

- Organization-level enablement
- Server-side execution only
- No report content sent externally without explicit organization configuration
- Provider id, model id, configuration, timestamp, and report version recorded
- AI findings labeled as AI-assisted
- Human judgment required for every AI-assisted finding
- No automatic report rejection, value change, or report rewrite
- No hidden chain-of-thought stored or displayed
- Client visibility controlled by reviewer approval

The app must work fully when no external AI provider is configured.
