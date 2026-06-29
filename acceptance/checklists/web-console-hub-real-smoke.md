# Acceptance Checklist: Web Console Hub Real Smoke

## Boundary

- [x] The smoke test is outside `apps/web-console`.
- [x] `apps/web-console` does not import Hub API internals.
- [x] The smoke uses `@sartre/sdk` and Web Console operations for user-facing actions.
- [x] No external service credentials are required.

## Behavior

- [x] Dev and QA endpoints are registered against a real local Hub API app.
- [x] A demo handoff is created through Web Console operations.
- [x] QA replay returns delivery events from the real service.
- [x] A QA delivery can be acknowledged.
- [x] Overview reflects endpoint, handoff, delivery, and timeline state changes.

## Verification

- [x] `pnpm exec vitest run scripts/web-console-hub-real-smoke.test.ts`
- [x] `pnpm run lint:lane-a`
- [x] `pnpm run architecture:check`
- [x] `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] `pnpm exec openspec validate web-console-hub-real-smoke --type change --strict --no-interactive`
- [x] `git diff --check`

## Evidence

- Closeout: `reports/web-console-hub-real-smoke/checkpoints/02-closeout-20260623T103858Z.md`
- Scoped regression: `reports/web-console-hub-real-smoke/regression/20260623T103709Z-regression-report.md`
- Lane A regression: `reports/lane-a-service-baseline/regression/20260623T104022Z-regression-report.md`
