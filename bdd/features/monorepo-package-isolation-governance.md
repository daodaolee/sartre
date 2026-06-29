# Feature: Monorepo package isolation governance

## Scenario: App package import boundary is enforced

Given the monorepo contains multiple app packages
When architecture checks scan TypeScript sources
Then an app package must not import another app package
And shared facts must be imported from public packages

Evidence: `pnpm exec vitest run scripts/architecture-check.test.ts` and `pnpm run architecture:check` passed on 2026-06-23.

## Scenario: Hub API is independent from Connector CLI

Given Hub API has a local connector demo script
When Hub API is built
Then it must not require `@sartre/connector-cli`
And Connector CLI remains separately buildable and testable

Evidence: `pnpm --filter @sartre/hub-api build`, `pnpm --filter @sartre/connector-cli test`, and `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression` passed on 2026-06-23.
