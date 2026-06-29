# Acceptance Checklist: Web Console Health Refresh Affordance

## Boundary

- [x] Web Console uses Hub overview only.
- [x] No Hub API internals are imported.
- [x] No Connector Core/CLI internals are imported into Web Console.
- [x] No polling, SSE, or realtime stream is added.
- [x] Refresh failure does not clear current overview.

## Behavior

- [x] Refresh button calls the overview loader again.
- [x] Refreshed overview updates Agent health summary.
- [x] Failed refresh shows visible detail.
- [x] Passed health report shows passed summary and report timestamp.
- [x] Blocked health report shows blocked summary and diagnostics remain detailed.
- [x] Missing health report shows a missing-report summary.
- [x] Connector health command is included in setup guidance.

## Verification

- [x] `pnpm --filter @sartre/web-console test`
- [x] `pnpm --filter @sartre/web-console build`
- [x] `pnpm run lint:lane-a`
- [x] `pnpm run architecture:check`
- [x] `CHANGE_NAME=web-console-health-refresh-affordance pnpm harness:regression`
- [x] `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] `pnpm exec openspec validate web-console-health-refresh-affordance --type change --strict --no-interactive`
- [x] `git diff --check`

## Evidence

- Closeout: `reports/web-console-health-refresh-affordance/checkpoints/02-closeout-20260623T120250Z.md`
- Scoped regression: `reports/web-console-health-refresh-affordance/regression/20260623T120118Z-regression-report.md`
- Lane A regression: `reports/lane-a-service-baseline/regression/20260623T120140Z-regression-report.md`
- Evidence gate: `pnpm harness:evidence -- --change lane-a-service-baseline` passed with 45 checks / 27 REAL_TEST.
