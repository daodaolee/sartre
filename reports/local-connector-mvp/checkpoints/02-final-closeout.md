# Checkpoint 02: Local Connector MVP Closeout

## Scope Completed

- Implemented connector local profiles for `dev` and `qa`.
- Implemented connector inbox rendering under `.sartre/inbox/<handoff-id>/`.
- Implemented connector `connect`, `listen --once`, `inbox`, `ack`, and `report` behavior through SDK/public Hub APIs.
- Added SDK wrappers for register/connect/get/ack/report and stream URL generation.
- Added Hub `GET /handoffs/:handoffId`.
- Added local connector demo covering:
  - offline Dev -> QA redelivery
  - agent-readable local inbox
  - delivery acknowledgement
  - QA report artifact return
  - online SSE `listenOnce` delivery
- Extended `CHANGE_NAME=local-connector-mvp pnpm harness:regression`.

## Debug Finding

The local connector demo exposed that `HandoffEventsController` did not receive `EventStreamService` at runtime. Root cause was unsafe reliance on inferred Nest metadata in the current TS/Vitest execution path. The fix uses explicit `@Inject(EventStreamService)`, and the hub test now covers controller wiring.

## Evidence

- `pnpm run hub:test` -> 2 files, 3 tests passed.
- `pnpm --filter @sartre/connector-cli test` -> 1 file, 3 tests passed.
- `pnpm run connector:demo:local` -> offline redelivery, ack/report, and SSE inbox succeeded.
- `CHANGE_NAME=local-connector-mvp pnpm harness:regression` -> 0 failures.
- Latest regression report: `reports/local-connector-mvp/regression/20260622T111457Z-regression-report.md`.

## Boundary

- No `apps/desktop/**`, `apps/desktop/src-tauri/**`, or `crates/**` changes were made for this goal.
- No git commit, push, or publish was performed.
