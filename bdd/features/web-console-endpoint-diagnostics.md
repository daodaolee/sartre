# Feature: Web Console endpoint diagnostics

## Scenario: Selected endpoint shows readiness diagnostics

Given Hub overview contains Dev and QA endpoints
When the user views the operations page
Then the selected endpoint diagnostics show registration, connection, capabilities, permission, and pending delivery status

Evidence: REAL_TEST via `pnpm --filter @sartre/web-console test`.

## Scenario: Missing or unhealthy endpoint is visible

Given Hub overview is missing the selected endpoint or the endpoint lacks required capabilities
When diagnostics are derived
Then the result includes blocked or warning items with concrete details

Evidence: REAL_TEST via `pnpm --filter @sartre/web-console test`.
