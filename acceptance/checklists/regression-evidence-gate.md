# Acceptance Checklist: Regression Evidence Gate

## Boundary

- [x] Adds machine validation for generated regression reports.
- [x] Does not replace underlying tests/builds/lint.
- [x] Does not touch domain, service, Web, runtime packaging, or connector behavior.

## Verification

- [x] `pnpm exec vitest run scripts/evidence-gate.test.ts`
- [x] `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] `pnpm run lint:lane-a`
- [x] `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] `pnpm exec openspec validate regression-evidence-gate --type change --strict --no-interactive`
- [x] `git diff --check`

## Evidence

- Closeout: `reports/regression-evidence-gate/checkpoints/02-closeout-20260623T095905Z.md`
- Lane A regression with evidence gate: `reports/lane-a-service-baseline/regression/20260623T095905Z-regression-report.md`
