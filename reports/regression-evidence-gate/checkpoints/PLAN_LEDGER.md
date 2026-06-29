# Regression Evidence Gate Plan Ledger

## Current Gate

- Active step: complete
- Last completed checkpoint: 02-closeout-20260623T095905Z.md
- Blockers: none
- Changed assumptions: automated evidence reports need their own machine gate if manual review is skipped.
- Next step: optional archive after user approval.

## Plan Index

| ID | Step | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| 01 | governance | DONE | OpenSpec/BDD/acceptance/ledger files | Change created |
| 02 | red-tests | DONE | `pnpm exec vitest run scripts/evidence-gate.test.ts` failed before implementation, then passed | Evidence parser tests |
| 03 | implementation | DONE | `scripts/evidence-gate.ts`; `harness:evidence`; Lane A `finish_report` gate | Evidence validator |
| 04 | verification | DONE | `reports/lane-a-service-baseline/regression/20260623T095905Z-regression-report.md` | Unit test, CLI, Lane A harness |
| 05 | closeout | DONE | `02-closeout-20260623T095905Z.md` | Acceptance and checkpoint |
