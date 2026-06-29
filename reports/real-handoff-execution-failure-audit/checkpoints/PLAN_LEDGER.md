# Plan Ledger: real-handoff-execution-failure-audit

## Goal

Complete a real handoff execution and failure audit loop: accepted deliveries can run through real Codex to report ready, and failed executions write classified Hub facts for diagnosis and recovery.

## Status

- 2026-06-25: Started OpenSpec governance artifacts.
- 2026-06-25: Completed connector failure writeback, bounded real handoff smoke, Web Console failed facts projection, final validation, and closeout.

## Evidence Rules

- Do not report a real handoff execution as passed unless the command actually creates/uses a delivery and reaches the stated status.
- `codex-smoke --exec` alone is not sufficient for this goal; it proves Codex invocation, not handoff lifecycle writeback.
- If Hub/Postgres/Codex prerequisites are unavailable, mark smoke as `SKIPPED` or failed with the exact classified reason.
- No manual or environment validation may be written as passed unless it was run.

## Checkpoints

- [x] Governance artifacts complete.
- [x] Current path audit complete.
- [x] RED tests observed.
- [x] Implementation complete.
- [x] Verification complete.

## Final Evidence

- Closeout: `reports/real-handoff-execution-failure-audit/checkpoints/02-final-closeout-20260625T065948Z.md`
- Regression: `reports/real-handoff-execution-failure-audit/regression/latest.md`
- OpenSpec strict: PASS.
- Architecture check: PASS.
- Diff check: PASS.
- Connector Core: 24 tests PASS, build PASS.
- Connector CLI: 17 tests PASS, build PASS.
- Web Console: 29 tests PASS, build PASS.
- Real Codex executor smoke: `REAL_TEST`, `SARTRE_CODEX_SMOKE_OK`.
- Failed handoff smoke audit: delivery `delivery_9fecd8f1-53df-4391-8e69-850069d532a5`, model run `model_run_da62b999-a54d-491e-8491-340caa782b1a`, `Timeout`, `delivery.failed`.
- Successful bounded handoff smoke: delivery `delivery_25d4db59-4dd0-4b61-a28f-3fe9c9e65037`, model run `model_run_efd8bc66-02c5-4dd2-bbc9-1f692f07a9cc`, `delivery.report_ready`.

## Recovery Pointer

- If success smoke becomes flaky, first verify `apps/connector-cli/src/index.ts` still keeps the smoke handoff bounded with `Do not inspect the repository`.
- If failure facts disappear, inspect `packages/connector-core/src/index.ts` around executor failure catch/writeback.
- If UI loses failed error facts, inspect `apps/web-console/src/App.tsx` `toTaskExecutionFacts` and `ExecutionFactsPanel`.
