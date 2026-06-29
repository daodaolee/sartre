# Web Console Hub Real Smoke Plan Ledger

## Current Gate

- Active step: complete
- Last completed checkpoint: `02-closeout-20260623T103858Z.md`
- Blockers: none
- Changed assumptions: none
- Next step: plan Agent setup/health-check service wiring

## Plan Calibration

### Before Goal

- `web-console-first-version-loop` is complete.
- Lane A regression already covers Hub API tests and Web Console tests separately.
- The missing evidence is a cross-boundary real smoke from Web operations to a real Hub API process.

### After Goal Result

- The smoke passed without Hub API route or schema changes.
- The implementation added Web operation reconnect support through the public SDK.
- Next goal should wire Agent setup/health-check UX to real service data.

## Plan Index

| ID | Step | Status | Depends On | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 01 | governance | DONE | web-console-first-version-loop | `pnpm exec openspec validate web-console-hub-real-smoke --type change --strict --no-interactive` | Create change chain |
| 02 | red-smoke | DONE | 01 | `operations.connectActor is not a function` | TDD Red |
| 03 | implementation | DONE | 02 | `pnpm run web:smoke:hub` | Keep app boundaries isolated |
| 04 | harness | DONE | 03 | `reports/lane-a-service-baseline/regression/20260623T104022Z-regression-report.md` | Add to aggregate loop |
| 05 | closeout | DONE | 04 | `02-closeout-20260623T103858Z.md` | Post-goal plan calibration |

## Cross-Step Contracts

- Identity: local Dev and QA demo profiles.
- Contracts: public `@sartre/sdk`, `@sartre/contracts`, and Web Console operations only.
- Config: disposable Hub API test database via existing `SARTRE_TEST_RESET` path.
- Data/Storage: local PostgreSQL test database only.
- State machine: delivery must move from pending/delivered to acknowledged through public command.
- Diagnostics: regression report and evidence gate must record real command output.

## Changed Assumptions

| Date | Assumption | Change | Affected Steps | Action |
| --- | --- | --- | --- | --- |

## Final Delivery Gate

- [x] All required steps are `DONE` or explicitly `SUPERSEDED`.
- [x] No unresolved `BLOCKED` steps.
- [x] No unresolved `CHANGED` assumptions.
- [x] Latest regression report is referenced.
- [x] Latest acceptance evidence is referenced.
- [x] Latest evidence gate is referenced.
