# Feature: Web Console health refresh affordance

## Scenario: User refreshes overview after Connector health submission

Given Web Console has loaded Hub overview
When the user clicks refresh
Then Web Console calls the overview loader again
And the Agent health card reflects the refreshed endpoint health report

Evidence: REAL_TEST via `pnpm --filter @sartre/web-console test` and `CHANGE_NAME=web-console-health-refresh-affordance pnpm harness:regression`.

## Scenario: Refresh failure keeps current overview visible

Given Web Console already displays Hub overview
When a manual refresh fails
Then the current overview remains visible
And the refresh failure detail is shown

Evidence: REAL_TEST via `pnpm --filter @sartre/web-console test` and `CHANGE_NAME=web-console-health-refresh-affordance pnpm harness:regression`.

## Scenario: Connector health command is discoverable

Given a user opens Connector setup
When they review the command guidance
Then `connector health <dev|qa>` is shown as a manual command
And Web Console does not invoke local Connector internals

Evidence: REAL_TEST via `pnpm --filter @sartre/web-console test` and `CHANGE_NAME=web-console-health-refresh-affordance pnpm harness:regression`.
