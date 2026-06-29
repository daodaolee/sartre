# Acceptance Checklist: Web Console First Version Loop

## Boundary

- [x] `apps/web-console` exists as an independently managed app package.
- [x] Web Console uses `@sartre/sdk` / `@sartre/contracts`.
- [x] Web Console does not import `apps/hub-api` or depend on `@sartre/connector-cli`.
- [x] Lane A harness includes Web Console test/build.

## Verification

- [x] `pnpm --filter @sartre/web-console test`
- [x] `pnpm --filter @sartre/web-console build`
- [x] `pnpm exec vitest run scripts/architecture-check.test.ts`
- [x] `pnpm run architecture:check`
- [x] `pnpm run lint:lane-a`
- [x] `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] `pnpm exec openspec validate web-console-first-version-loop --type change --strict --no-interactive`
- [x] `git diff --check`

## Evidence

- Closeout: `reports/web-console-first-version-loop/checkpoints/02-closeout-20260623T101946Z.md`
- Lane A regression: `reports/lane-a-service-baseline/regression/20260623T101946Z-regression-report.md`
