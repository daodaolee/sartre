# PLAN_LEDGER: Connector Trial-Run Handoff Loop

## Goal

Add a Connector Core/CLI trial command that proves one pending handoff can be received, acknowledged, and returned with a deterministic report artifact.

## Plan Calibration Before Goal

- Previous completed goals: Connector health submission and Web Console health refresh are complete.
- Current gap: users can see endpoint readiness, but still need a simple local trial command for the first report-return loop.
- Adjustment: build on existing Hub primitives; do not add service routes or real provider execution.

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| Governance artifacts | Complete | `pnpm exec openspec validate connector-trial-run-handoff-loop --type change --strict --no-interactive` passed |
| TDD red tests | Complete | Core failed on missing `runTrialHandoff`; CLI failed on missing `trial` command/re-export |
| Trial-run Core | Complete | `pnpm --filter @sartre/connector-core test` passed 8 tests |
| Trial-run CLI | Complete | `pnpm --filter @sartre/connector-cli test` passed 8 tests |
| Harness integration | Complete | Standalone and Lane A regression include this change |
| Verification | Complete | Tests/build/lint/architecture/harness/evidence/diff-check passed |

## Post-Goal Calibration

Completed calibration:

1. First-version implementation is ready for user acceptance from the collaboration-loop perspective: endpoint health can be reported, Web can refresh and interpret it, and Connector can run one pending handoff through ack/report.
2. Tenant/user hardening remains a follow-up service goal, but no concrete failure was exposed by this trial-run slice.
3. Optional UX follow-up: add `connector trial qa` to Web setup command guidance.
