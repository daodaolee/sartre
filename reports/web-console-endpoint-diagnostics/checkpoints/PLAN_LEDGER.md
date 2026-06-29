# Web Console Endpoint Diagnostics Plan Ledger

## Current Gate

- Active step: complete
- Last completed checkpoint: `02-closeout-20260623T105708Z.md`
- Blockers: none
- Changed assumptions: none
- Next step: plan guided setup wizard or service-contract health fields

## Plan Calibration

### Before Goal

- Web Console can reconnect selected actors.
- Setup guidance is static and not data-driven.
- Hub overview already contains endpoint, capability, status, and delivery data.

### After Goal Result

- Existing overview data was sufficient for first-version diagnostics.
- No service-contract change is needed for registration/online/capability/permission/pending-delivery checks.
- Next goal can turn diagnostics into a guided setup wizard.

## Plan Index

| ID | Step | Status | Depends On | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 01 | governance | DONE | web-console-agent-reconnect-control | `pnpm exec openspec validate web-console-endpoint-diagnostics --type change --strict --no-interactive` | Create change chain |
| 02 | red-tests | DONE | 01 | missing `endpoint-diagnostics` module and diagnostics region | TDD Red |
| 03 | implementation | DONE | 02 | `pnpm --filter @sartre/web-console test` | Pure diagnostics + page panel |
| 04 | harness | DONE | 03 | `reports/lane-a-service-baseline/regression/20260623T105819Z-regression-report.md` | Add to aggregate loop |
| 05 | closeout | DONE | 04 | `02-closeout-20260623T105708Z.md` | Post-goal plan calibration |

## Cross-Step Contracts

- Input: `HandoffOverviewResponse`.
- Profiles: `localDemoProfiles`.
- UI: selected actor controls diagnostics panel.
- Architecture: no Hub API internals in Web Console.
- Evidence: Web tests/build and Lane A harness.

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
