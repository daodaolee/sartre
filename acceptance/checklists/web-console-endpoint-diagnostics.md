# Acceptance Checklist: Web Console Endpoint Diagnostics

## Boundary

- [x] Diagnostics logic is in a pure Web module.
- [x] React page renders diagnostics but does not own diagnostic rules.
- [x] The page does not import Hub API internals.
- [x] No Hub API route or database schema changes are made.

## Behavior

- [x] Registered endpoint shows a registration diagnostic.
- [x] Online/offline state shows ready or warning diagnostic.
- [x] Required capabilities are checked.
- [x] `manual_confirm` permission mode is visible.
- [x] Pending deliveries are visible.
- [x] Switching selected actor updates diagnostics.

## Verification

- [x] `pnpm --filter @sartre/web-console test`
- [x] `pnpm --filter @sartre/web-console build`
- [x] `pnpm run lint:lane-a`
- [x] `pnpm run architecture:check`
- [x] `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] `pnpm exec openspec validate web-console-endpoint-diagnostics --type change --strict --no-interactive`
- [x] `git diff --check`

## Evidence

- Closeout: `reports/web-console-endpoint-diagnostics/checkpoints/02-closeout-20260623T105708Z.md`
- Scoped regression: `reports/web-console-endpoint-diagnostics/regression/20260623T105600Z-regression-report.md`
- Lane A regression: `reports/lane-a-service-baseline/regression/20260623T105819Z-regression-report.md`
