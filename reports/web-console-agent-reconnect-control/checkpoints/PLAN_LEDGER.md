# Web Console Agent Reconnect Control Plan Ledger

## Current Gate

- Active step: complete
- Last completed checkpoint: `02-closeout-20260623T104758Z.md`
- Blockers: none
- Changed assumptions: none
- Next step: model endpoint health diagnostics and setup wizard steps

## Plan Calibration

### Before Goal

- `web-console-hub-real-smoke` passed.
- Web operation layer has `connectActor`.
- The page does not expose reconnect as a user operation.

### After Goal Result

- The reconnect page action passed Web tests/build and Lane A regression.
- No service contract gap was found.
- Next goal should model endpoint health diagnostics and setup wizard steps.

## Plan Index

| ID | Step | Status | Depends On | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 01 | governance | DONE | web-console-hub-real-smoke | `pnpm exec openspec validate web-console-agent-reconnect-control --type change --strict --no-interactive` | Create change chain |
| 02 | red-ui-test | DONE | 01 | missing `Connect endpoint` button | TDD Red |
| 03 | implementation | DONE | 02 | `pnpm --filter @sartre/web-console test` | Add existing action control |
| 04 | harness | DONE | 03 | `reports/lane-a-service-baseline/regression/20260623T104902Z-regression-report.md` | Add to aggregate loop |
| 05 | closeout | DONE | 04 | `02-closeout-20260623T104758Z.md` | Post-goal plan calibration |

## Cross-Step Contracts

- Identity: selected actor is `dev` or `qa`.
- UI: reconnect appears in existing operations panel.
- Operations: `connectActor(actor, currentCursor)` returns `OperationResult`.
- State: `nextCursor` updates `cursorByActor[selectedActor]`.
- Architecture: no Hub API internals in Web Console.

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
