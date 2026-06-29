# PLAN_LEDGER: Web Console Health Refresh Affordance

## Goal

Make Connector-submitted endpoint health visible and refreshable in Web Console without changing Hub or Connector contracts.

## Plan Calibration Before Goal

- Previous completed goal: `connector-health-probe-submission` added Connector local health report generation and submission.
- Current gap: Web Console can consume overview health facts, but user feedback after running `connector health <dev|qa>` is not explicit enough.
- Adjustment: add manual refresh and health summary only; avoid polling/realtime and avoid importing Connector internals.

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| Governance artifacts | Complete | `pnpm exec openspec validate web-console-health-refresh-affordance --type change --strict --no-interactive` passed |
| TDD red tests | Complete | `pnpm --filter @sartre/web-console test` failed on missing health command, refresh button, and health summary |
| Web refresh affordance | Complete | `pnpm --filter @sartre/web-console test` passed refresh success/failure tests |
| Health summary UI | Complete | `pnpm --filter @sartre/web-console test` passed health summary and command guidance tests |
| Harness integration | Complete | Standalone and Lane A regression include this change |
| Verification | Complete | Tests/build/lint/architecture/harness/evidence/diff-check passed |

## Post-Goal Calibration

Completed calibration:

1. Next preferred goal: Connector trial-run handoff loop, because health submission and Web refresh feedback are now both in place.
2. Defer service-side tenant/user hardening until the trial-run loop exposes a concrete tenant/auth edge case.
3. Keep avoiding realtime/polling until the manual loop proves insufficient in actual use.
