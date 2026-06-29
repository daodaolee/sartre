# Feature: Web Console first version loop

## Scenario: Web Console renders Hub-backed collaboration state

Given Handoff Hub exposes overview state through public SDK/contracts
When Web Console loads the overview
Then it renders metrics, endpoints, handoff queue, timeline, and reports
And empty/error states are visible

Evidence: REAL_TEST via `pnpm --filter @sartre/web-console test` and `pnpm --filter @sartre/web-console build`.

## Scenario: Web Console triggers first-version Hub operations

Given Dev and QA local profiles are available
When the user registers an endpoint, creates a demo handoff, replays events, or changes delivery state
Then Web Console calls public SDK operations
And records a visible operation result

Evidence: REAL_TEST via `pnpm --filter @sartre/web-console test`.

## Scenario: Web Console package remains isolated

Given the monorepo contains multiple app packages
When architecture checks run
Then Web Console must not import Hub API internals
And Web Console must not depend on Connector CLI as a package

Evidence: REAL_TEST via `pnpm exec vitest run scripts/architecture-check.test.ts` and `pnpm run architecture:check`.
