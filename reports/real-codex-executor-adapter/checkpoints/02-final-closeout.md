# Final Closeout: real-codex-executor-adapter

## Scope

Implemented the first real local Codex execution slice for Sartre role Agents:

- `createCodexCliExecutor()` in `packages/connector-core`.
- Injectable Codex CLI runner for tests and future packaging.
- Explicit connector execution selection through env/CLI option.
- `connector codex-smoke --exec` for real `codex exec` smoke evidence.
- No Hub API, Web Console, database schema, or first-class `computer` product object changes.

## TDD Evidence

- RED core: `pnpm --filter @sartre/connector-core test`
  - Failed 6 new tests with `TypeError: createCodexCliExecutor is not a function`.
- GREEN core: `pnpm --filter @sartre/connector-core test`
  - Passed: 1 file, 22 tests.
- RED CLI: `pnpm --filter @sartre/connector-cli test`
  - Failed 4 new tests because env/flag real executor selection and `codex-smoke --exec` were not implemented.
- GREEN CLI: `pnpm --filter @sartre/connector-cli test`
  - Passed: 1 file, 15 tests.

## Verification

- `pnpm exec openspec validate real-codex-executor-adapter --type change --strict --no-interactive`
  - Passed: `Change 'real-codex-executor-adapter' is valid`.
- `pnpm run architecture:check`
  - Passed: `architecture check passed`.
- `git diff --check`
  - Passed with no output.
- `pnpm --filter @sartre/connector-core build`
  - Passed.
- `pnpm --filter @sartre/connector-cli build`
  - Passed.

## Real Smoke

Command:

```bash
SARTRE_CODEX_TIMEOUT_MS=60000 pnpm --filter @sartre/connector-cli start -- codex-smoke --exec
```

Observed result:

```json
{
  "status": "REAL_TEST",
  "command": "codex exec",
  "detail": "SARTRE_CODEX_SMOKE_OK",
  "observedAt": "2026-06-25T05:52:48.418Z",
  "metadata": {
    "adapter": "codex_cli",
    "command": "codex exec",
    "exit_code": "0",
    "executor_kind": "codex_cli",
    "provider_profile_id": "codex_smoke_profile",
    "provider": "codex",
    "model": "default"
  }
}
```

## Residual Risk

- `codex exec` smoke proves local Codex invocation and output capture, not quality on a full handoff task.
- `codex app-server` streaming remains a future executor implementation behind the same `CodexExecutor` contract.
- Failed execution writeback to Hub is not expanded in this slice; adapter failures are classified locally and ready for a future failure-audit goal.
