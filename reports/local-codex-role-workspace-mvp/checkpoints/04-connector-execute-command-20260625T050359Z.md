# Checkpoint 04: Connector execute command

## Scope

- Added `executeDelivery` orchestration in connector-core.
- Added `connector execute <dev|qa> <delivery-id>` CLI route.
- Execution flow uses public SDK boundaries:
  - local inbox delivery cache lookup
  - Hub handoff fetch
  - provider/model selection with preferred provider `codex`
  - delivery `start`
  - conversation creation
  - prompt message append
  - context projection creation
  - Codex executor adapter invocation
  - assistant message append
  - model run record
  - local report artifact registration
  - delivery `report-ready`

## Evidence

- `pnpm --filter @sartre/connector-core test`
  - Result: PASS, 1 test file, 16 tests.
- `pnpm --filter @sartre/connector-cli test`
  - Result: PASS, 1 test file, 10 tests.
- `pnpm --filter @sartre/connector-core build`
  - Result: PASS.
- `pnpm --filter @sartre/connector-cli build`
  - Result: PASS.

## Notes

- Unit tests use the deterministic fake Codex executor.
- CLI has a fake executor fallback for local packaging while the real Codex app-server execution adapter remains behind the adapter boundary.
- Real Codex app-server entrypoint was smoke-tested in checkpoint 03 only.
