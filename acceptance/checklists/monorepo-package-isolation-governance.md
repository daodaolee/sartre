# Acceptance Checklist: Monorepo Package Isolation Governance

## Boundary

- [x] `apps/hub-api` does not import `@sartre/connector-cli`.
- [x] `apps/hub-api/package.json` does not depend on `@sartre/connector-cli`.
- [x] Architecture check fails on app-to-app imports.
- [x] Shared local demo profile facts live in `@sartre/contracts`.

## Verification

- [x] `pnpm exec vitest run scripts/architecture-check.test.ts`
- [x] `pnpm --filter @sartre/contracts test`
- [x] `pnpm --filter @sartre/connector-core test`
- [x] `pnpm --filter @sartre/connector-cli test`
- [x] `pnpm --filter @sartre/hub-api test`
- [x] `pnpm --filter @sartre/hub-api build`
- [x] `pnpm run lint:lane-a`
- [x] `pnpm run architecture:check`
- [x] `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`

## Evidence

- Closeout: `reports/monorepo-package-isolation-governance/checkpoints/02-closeout-20260623T093047Z.md`
- Lane A regression: `reports/lane-a-service-baseline/regression/20260623T093047Z-regression-report.md`
