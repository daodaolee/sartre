# Regression Report: real-codex-executor-adapter

Date: 2026-06-25

## Commands Run

- `pnpm exec openspec validate real-codex-executor-adapter --type change --strict --no-interactive`
  - Result: passed.
- `pnpm run architecture:check`
  - Result: passed.
- `git diff --check`
  - Result: passed.
- `pnpm --filter @sartre/connector-core test`
  - Result: passed, 22 tests.
- `pnpm --filter @sartre/connector-core build`
  - Result: passed.
- `pnpm --filter @sartre/connector-cli test`
  - Result: passed, 15 tests.
- `pnpm --filter @sartre/connector-cli build`
  - Result: passed.
- `SARTRE_CODEX_TIMEOUT_MS=60000 pnpm --filter @sartre/connector-cli start -- codex-smoke --exec`
  - Result: `REAL_TEST`, `codex exec`, `SARTRE_CODEX_SMOKE_OK`.

## RED Evidence

- connector-core RED failed because `createCodexCliExecutor` did not exist.
- connector-cli RED failed because real executor selection and exec smoke were not implemented.

## Change Surface

- `packages/connector-core/src/index.ts`
- `packages/connector-core/src/index.test.ts`
- `apps/connector-cli/src/index.ts`
- `apps/connector-cli/src/index.test.ts`
- `openspec/changes/real-codex-executor-adapter/**`
- `bdd/features/real-codex-executor-adapter.md`
- `acceptance/checklists/real-codex-executor-adapter.md`
- `reports/real-codex-executor-adapter/**`

## Result

The first real Codex CLI executor adapter slice is verified. Unit tests remain deterministic, real execution is explicit, and a real local `codex exec` smoke completed successfully.
