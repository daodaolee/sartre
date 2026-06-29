# Checkpoint 03: Codex executor boundary

## Scope

- Added connector-core Codex executor boundary.
- Added deterministic fake executor for tests.
- Added prompt renderer with role Agent, endpoint identity, runtime binding, delivery, and capability source context.
- Added safe executor error classification.
- Added `connector codex-smoke` command for real Codex app-server availability checks without making CI depend on Codex.

## Evidence

- `pnpm --filter @sartre/connector-core test`
  - Result: PASS, 1 test file, 16 tests.
- `pnpm --filter @sartre/connector-core build`
  - Result: PASS.
- `pnpm --filter @sartre/connector-cli test`
  - Result: PASS, 1 test file, 9 tests.
- `pnpm --filter @sartre/connector-cli build`
  - Result: PASS.
- `pnpm --filter @sartre/connector-cli start -- codex-smoke`
  - Result: PASS.
  - Smoke label: `REAL_TEST`.
  - Command: `codex app-server --help`.

## Notes

- The fake executor is CI-safe and does not spawn Codex.
- The real smoke only proves Codex app-server entrypoint availability.
- Full task execution writeback remains pending in the Connector `execute` command step.
