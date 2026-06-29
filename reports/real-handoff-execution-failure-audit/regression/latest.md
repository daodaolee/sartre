# Regression Report: real-handoff-execution-failure-audit

- Timestamp: 20260625T065948Z
- Evidence levels: REAL_TEST, STRUCTURAL_CHECK
- Worktree: `/Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline`

## OpenSpec strict validation

- Evidence: `STRUCTURAL_CHECK`
- Command: `pnpm exec openspec validate real-handoff-execution-failure-audit --type change --strict --no-interactive`
- Result: PASS
- Output: `Change 'real-handoff-execution-failure-audit' is valid`

## Architecture boundary check

- Evidence: `REAL_TEST`
- Command: `pnpm run architecture:check`
- Result: PASS
- Output: `architecture check passed`

## Diff whitespace check

- Evidence: `REAL_TEST`
- Command: `git diff --check`
- Result: PASS

## Connector Core tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-core test`
- Result: PASS
- Output: `Test Files 1 passed (1); Tests 24 passed (24)`

## Connector Core build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-core build`
- Result: PASS
- Output: `tsc -p tsconfig.json --noEmit`

## Connector CLI tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-cli test`
- Result: PASS
- Output: `Test Files 1 passed (1); Tests 17 passed (17)`

## Connector CLI build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/connector-cli build`
- Result: PASS
- Output: `tsc -p tsconfig.json --noEmit`

## Web Console tests

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/web-console test`
- Result: PASS
- Output: `Test Files 4 passed (4); Tests 29 passed (29)`

## Web Console build

- Evidence: `REAL_TEST`
- Command: `pnpm --filter @sartre/web-console build`
- Result: PASS
- Output: `tsc -p tsconfig.json --noEmit && vite build`

## Real Codex executor smoke

- Evidence: `REAL_TEST`
- Command: `SARTRE_CODEX_TIMEOUT_MS=60000 pnpm --filter @sartre/connector-cli start -- codex-smoke --exec`
- Result: PASS
- Output facts:
  - status: `REAL_TEST`
  - detail: `SARTRE_CODEX_SMOKE_OK`
  - command: `codex exec`

## Real handoff execution smoke: failure audit

- Evidence: `REAL_TEST`
- Command: `SARTRE_CODEX_TIMEOUT_MS=60000 pnpm --filter @sartre/connector-cli start -- handoff-smoke qa --real-codex`
- Result: PASS for failure-audit behavior; smoke outcome was `SKIPPED`.
- Output facts:
  - status: `SKIPPED`
  - category: `Timeout`
  - detail: `codex timed out after 60000ms`
- Hub facts verified:
  - delivery `delivery_9fecd8f1-53df-4391-8e69-850069d532a5`: `failed`
  - model run `model_run_da62b999-a54d-491e-8491-340caa782b1a`: `failed`
  - event replay: `delivery.accepted`, `delivery.running`, `delivery.failed`

## Real handoff execution smoke: success path

- Evidence: `REAL_TEST`
- Command: `SARTRE_CODEX_TIMEOUT_MS=180000 pnpm --filter @sartre/connector-cli start -- handoff-smoke qa --real-codex`
- Result: PASS
- Output facts:
  - status: `REAL_TEST`
  - delivery: `delivery_25d4db59-4dd0-4b61-a28f-3fe9c9e65037`
  - handoff: `handoff_ebef5065-349a-4ba7-95cd-7a4870edafc8`
  - final status: `report_ready`
  - model run: `model_run_efd8bc66-02c5-4dd2-bbc9-1f692f07a9cc`
- Hub facts verified:
  - conversation `conversation_0de1d1d4-e252-4847-8bc2-4df3b0ef4ca5` has assistant report containing `SARTRE_HANDOFF_SMOKE_OK`
  - model run status: `succeeded`
  - event replay: `delivery.accepted`, `delivery.running`, `artifact.report_returned`, `delivery.report_ready`

## Summary

- Failures: 0
- Skipped items: 0 final blockers. Earlier unbounded handoff smoke attempts timed out and were used as failure-audit evidence.
