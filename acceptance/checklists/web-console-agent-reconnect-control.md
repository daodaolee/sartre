# Acceptance Checklist: Web Console Agent Reconnect Control

## Boundary

- [x] The reconnect control lives in `apps/web-console`.
- [x] The page calls `operations.connectActor`.
- [x] The page does not import Hub API internals.
- [x] No Hub API route or database schema changes are made.

## Behavior

- [x] QA can be selected as the actor.
- [x] Clicking `Connect endpoint` calls `connectActor("qa", currentCursor)`.
- [x] Successful reconnect result appears in the operation log.
- [x] The actor cursor updates from `nextCursor`.
- [x] Later replay uses the updated cursor.

## Verification

- [x] `pnpm --filter @sartre/web-console test`
- [x] `pnpm --filter @sartre/web-console build`
- [x] `pnpm run lint:lane-a`
- [x] `pnpm run architecture:check`
- [x] `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] `pnpm exec openspec validate web-console-agent-reconnect-control --type change --strict --no-interactive`
- [x] `git diff --check`

## Evidence

- Closeout: `reports/web-console-agent-reconnect-control/checkpoints/02-closeout-20260623T104758Z.md`
- Scoped regression: `reports/web-console-agent-reconnect-control/regression/20260623T104649Z-regression-report.md`
- Lane A regression: `reports/lane-a-service-baseline/regression/20260623T104902Z-regression-report.md`
