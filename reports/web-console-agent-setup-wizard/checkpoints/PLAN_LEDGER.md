# Web Console Agent Setup Wizard Plan Ledger

## Current Gate

- Active step: complete
- Last completed checkpoint: `reports/web-console-agent-setup-wizard/checkpoints/02-closeout-20260623T111705Z.md`
- Blockers: none
- Changed assumptions: none
- Next step: calibrate next goal for executor command health ownership.

## Plan Calibration

### Before Goal

- Endpoint diagnostics are complete and data-driven.
- Setup panel is static and does not react to selected actor or diagnostics.
- AgentConnectorUXSpec requires a strong wizard without JSON-first setup.

### After Goal Target

- If tests and harness pass, next goal should decide executor command health ownership.
- If missing service health data blocks the wizard, create a service-contract goal.

## Plan Index

| ID | Step | Status | Depends On | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 01 | governance | DONE | web-console-endpoint-diagnostics | `pnpm exec openspec validate web-console-agent-setup-wizard --type change --strict --no-interactive` | Create change chain |
| 02 | red-tests | DONE | 01 | missing `agent-setup-wizard` module and setup wizard region | TDD Red |
| 03 | implementation | DONE | 02 | `pnpm --filter @sartre/web-console test` | Pure wizard model + page panel |
| 04 | harness | DONE | 03 | `reports/web-console-agent-setup-wizard/regression/20260623T111847Z-regression-report.md` and `reports/lane-a-service-baseline/regression/20260623T111533Z-regression-report.md` | Added to aggregate loop |
| 05 | closeout | DONE | 04 | `reports/web-console-agent-setup-wizard/checkpoints/02-closeout-20260623T111705Z.md` | Post-goal plan calibration |

## Cross-Step Contracts

- Input: selected actor, endpoint diagnostics, local profile facts.
- UI: setup panel follows selected actor.
- Operations: existing register/connect/create demo handoff actions only.
- Architecture: no Hub API internals in Web Console.
- Evidence: Web tests/build and Lane A harness.

## Changed Assumptions

| Date | Assumption | Change | Affected Steps | Action |
| --- | --- | --- | --- | --- |

## Post-Goal Plan Calibration

- Setup wizard can be supported by existing endpoint diagnostics and Web operations.
- No Hub API route or database migration is needed for this goal.
- Next goal should decide whether executor command health belongs to local Connector probing or a Hub health report contract.
- A first Lane A run at `reports/lane-a-service-baseline/regression/20260623T111302Z-regression-report.md` failed once in Hub API e2e; `pnpm --filter @sartre/hub-api test` then passed 5 consecutive isolated runs, and Lane A passed at `reports/lane-a-service-baseline/regression/20260623T111533Z-regression-report.md`.

## Final Delivery Gate

- [x] All required steps are `DONE` or explicitly `SUPERSEDED`.
- [x] No unresolved `BLOCKED` steps.
- [x] No unresolved `CHANGED` assumptions.
- [x] Latest regression report is referenced.
- [x] Latest acceptance evidence is referenced.
- [x] Latest evidence gate is referenced.
