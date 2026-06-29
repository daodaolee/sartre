# Monorepo Package Isolation Governance Plan Ledger

## Current Gate

- Active step: complete
- Last completed checkpoint: 02-closeout-20260623T093047Z.md
- Blockers: none
- Changed assumptions: Lane A now depends on `@sartre/connector-core` as a public package boundary; Connector CLI is no longer a service baseline build dependency.
- Next step: optional archive after user approval.

## Plan Index

| ID | Step | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| 01 | governance | DONE | OpenSpec/BDD/acceptance/ledger files | Change created |
| 02 | red-tests | DONE | `pnpm exec vitest run scripts/architecture-check.test.ts` failed before implementation, then passed | App-to-app import and package dependency checks |
| 03 | implementation | DONE | `@sartre/connector-core`; Hub API imports/dependency moved from CLI to core | Shared profiles and dependency removal |
| 04 | verification | DONE | `reports/lane-a-service-baseline/regression/20260623T093047Z-regression-report.md` | Lane A harness |
| 05 | closeout | DONE | `02-closeout-20260623T093047Z.md` | Acceptance and checkpoint |
