# PLAN_LEDGER: Connector Health Probe Submission

## Goal

Build the Connector-side local health probe and submission path so a local `dev` or `qa` profile can report endpoint readiness to Hub using the existing health report contract.

## Plan Calibration Before Goal

- Previous completed goal: `agent-endpoint-health-report-contract` made Hub, SDK, and Web overview capable of receiving and displaying endpoint health reports.
- Current gap: Connector does not yet generate or submit those reports from a user's workstation.
- Adjustment: do not expand Hub API or Web UI in this goal unless tests reveal a contract break. Implement Connector Core and CLI only.
- Out of scope: true Codex/Claude/MCP adapter execution, PRD upstream constraints, repo/branch/commit payload packaging.

## Ledger

| Step | Status | Evidence |
| --- | --- | --- |
| Governance artifacts | Complete | OpenSpec, BDD, acceptance, plan created before implementation; `pnpm exec openspec validate connector-health-probe-submission --type change --strict --no-interactive` passed |
| TDD red tests | Complete | `pnpm --filter @sartre/connector-core test` failed on missing `probeEndpointHealth`/`submitProfileHealth`; `pnpm --filter @sartre/connector-cli test` failed on missing `runConnectorCli` |
| Connector Core health probe | Complete | `pnpm --filter @sartre/connector-core test` passed 6 tests; build passed |
| Connector CLI health command | Complete | `pnpm --filter @sartre/connector-cli test` passed 5 tests; build passed |
| Harness integration | Complete | Standalone regression and Lane A regression include this change |
| Verification | Complete | Tests/build/lint/architecture/harness/evidence/diff-check passed |

## Post-Goal Calibration

Completed calibration:

1. Next preferred goal: Web Console health refresh/empty-state affordance, because Connector can now submit reports but the page still needs a clear user-facing path to refresh and interpret the newly submitted state.
2. Defer Connector trial-run handoff loop until after the page makes reported health state visible and actionable.
3. Defer service-side tenant/user hardening unless a verification run exposes auth/tenant ambiguity.
