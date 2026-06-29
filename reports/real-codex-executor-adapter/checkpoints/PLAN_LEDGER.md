# Plan Ledger: real-codex-executor-adapter

## Goal

Complete the real Codex local executor adapter slice while keeping Hub/Web boundaries unchanged and avoiding a first-class computer product model.

## Status

- 2026-06-25: Started governance artifacts for `real-codex-executor-adapter`.
- 2026-06-25: Completed Codex CLI executor adapter, explicit CLI selection, exec smoke, and verification chain.

## Evidence Rules

- Unit tests are CI-safe and MUST NOT require a live Codex process.
- Real smoke can be reported as `REAL_TEST` only if a Codex process actually ran.
- If Codex is missing, unauthenticated, blocked, or times out, evidence MUST say `SKIPPED` or failed with the classified reason.
- Do not claim manual or environment validation that was not executed.

## Checkpoints

- [x] Governance artifacts complete.
- [x] RED tests observed.
- [x] Implementation complete.
- [x] Verification complete.

## Verification Summary

- RED: `pnpm --filter @sartre/connector-core test` failed 6 new tests because `createCodexCliExecutor` was missing.
- RED: `pnpm --filter @sartre/connector-cli test` failed 4 new tests because real executor selection and `codex-smoke --exec` were missing.
- GREEN: `pnpm --filter @sartre/connector-core test` passed 22/22.
- GREEN: `pnpm --filter @sartre/connector-core build` passed.
- GREEN: `pnpm --filter @sartre/connector-cli test` passed 15/15.
- GREEN: `pnpm --filter @sartre/connector-cli build` passed.
- Governance: `pnpm exec openspec validate real-codex-executor-adapter --type change --strict --no-interactive` passed.
- Architecture: `pnpm run architecture:check` passed.
- Diff hygiene: `git diff --check` passed.
- Real smoke: `SARTRE_CODEX_TIMEOUT_MS=60000 pnpm --filter @sartre/connector-cli start -- codex-smoke --exec` returned `REAL_TEST` with `SARTRE_CODEX_SMOKE_OK`.
