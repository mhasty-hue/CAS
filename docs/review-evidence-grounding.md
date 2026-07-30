# Review Evidence Grounding

CAS review findings must point back to report or order evidence. This applies to deterministic and AI-assisted findings.

## Evidence References

Findings may reference:

- Source file name
- PDF page
- XML path
- Extracted field label and value
- Order evidence such as assignment instructions or order address

## AI Grounding Rules

The demo AI provider accepts only findings with usable evidence. Evidence-free proposals are rejected before they reach the workspace.

AI-assisted findings must include:

- Provider and model identifier
- Prompt/template version
- Report version
- Review-pack context
- Evidence quality
- Confidence
- Human disposition
- Requires-human-judgment flag

## What CAS Must Not Do

- Treat extraction failure as proof that a report item is absent.
- Invent missing report content.
- Send unrelated fee, bid, payroll, or organization data to AI providers.
- Request hidden chain-of-thought.
- Display raw model output as trusted HTML.

## Current Demo Limits

The demo parser uses deterministic fictional fixtures. Exact PDF coordinates are not yet available, so the workspace focuses the cited page and evidence snippet.
