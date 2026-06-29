# Feature: Web Console Hub real smoke

## Scenario: Web operations drive a real Hub API process

Given a local Hub API Nest app is started with a disposable test database
When Web Console operations register Dev and QA endpoints through the public SDK
Then Hub overview shows both endpoints
And the Web Console app package remains isolated from Hub API internals

Evidence: REAL_TEST via `pnpm run web:smoke:hub`.

## Scenario: QA receives and acknowledges a demo handoff

Given Dev and QA endpoints are registered against the real Hub API process
When Web Console operations create a demo handoff, replay QA events, and acknowledge the pending delivery
Then Hub overview shows the handoff
And the QA delivery is acknowledged
And delivery events are visible in the timeline

Evidence: REAL_TEST via `pnpm run web:smoke:hub`.

## Scenario: Lane A regression carries real smoke evidence

Given the real smoke test exists
When Lane A regression runs
Then the report includes the real smoke as REAL_TEST
And `harness:evidence` accepts the report

Evidence: REAL_TEST / STRUCTURAL_CHECK via `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression` and `pnpm harness:evidence -- --change lane-a-service-baseline`.
