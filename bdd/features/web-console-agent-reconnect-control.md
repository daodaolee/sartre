# Feature: Web Console agent reconnect control

## Scenario: QA reconnects from the operations panel

Given the Web Console operations panel is showing the QA actor
When the user clicks Connect endpoint
Then Web Console calls `connectActor("qa", currentCursor)`
And the operation log records the reconnect result

Evidence: REAL_TEST via `pnpm --filter @sartre/web-console test`.

## Scenario: Reconnect advances the replay cursor

Given `connectActor` returns a next cursor
When the reconnect operation succeeds
Then the selected actor cursor updates
And the next replay uses that updated cursor

Evidence: REAL_TEST via `pnpm --filter @sartre/web-console test`.
