# Goal: Web Console Health Refresh Affordance

## Objective

Let users refresh Hub overview after running local Connector health submission and see reported endpoint health summarized in Web Console.

## Scope

- Add refresh UI and preserve current overview on refresh failure.
- Derive health summary from existing overview `health_report`.
- Add Connector health command guidance.
- Add tests, harness coverage, and closeout evidence.

## Non-Scope

- No polling, SSE, or realtime stream.
- No Hub API or SDK contract change.
- No Connector Core/CLI import into Web Console.
- No page-wide visual redesign.

## Verification Gate

- `pnpm --filter @sartre/web-console test`
- `pnpm --filter @sartre/web-console build`
- `pnpm run lint:lane-a`
- `pnpm run architecture:check`
- `CHANGE_NAME=web-console-health-refresh-affordance pnpm harness:regression`
- `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- `pnpm harness:evidence -- --change lane-a-service-baseline`
- `pnpm exec openspec validate web-console-health-refresh-affordance --type change --strict --no-interactive`
- `git diff --check`
