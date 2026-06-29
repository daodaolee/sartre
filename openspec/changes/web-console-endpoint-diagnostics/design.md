# Design: Web Console Endpoint Diagnostics

## Decision

Create `apps/web-console/src/endpoint-diagnostics.ts` as a pure module. It accepts:

- Hub `HandoffOverviewResponse`
- selected local actor profile
- required capability list

It returns a small diagnostic list:

- registration
- connection
- capabilities
- permission mode
- pending deliveries

The React page renders this diagnostic list as a compact panel. The page should not own diagnostic rules directly.

## Diagnostic Semantics

- `passed`: ready or healthy.
- `warning`: usable but needs attention, such as offline endpoint or pending deliveries.
- `blocked`: missing endpoint or missing required capability.

## Plan Calibration

Before this goal:

- Web operation layer can reconnect endpoints.
- The page exposes reconnect.
- Setup guidance is static.

After this goal:

- If diagnostics pass tests/build/harness, next goal should model a guided setup wizard using the same diagnostics.
- If diagnostics need data not present in overview, open a service-contract change.
