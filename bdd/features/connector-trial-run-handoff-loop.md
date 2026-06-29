# Feature: Connector trial-run handoff loop

## Scenario: Connector runs a local trial handoff

Given a QA profile has a pending handoff
When the user runs the Connector trial command
Then Connector writes the handoff to inbox
And acknowledges the delivery
And submits a deterministic trial report artifact

Evidence: REAL_TEST via `pnpm --filter @sartre/connector-core test` and `CHANGE_NAME=connector-trial-run-handoff-loop pnpm harness:regression`.

## Scenario: Trial run fails clearly with no pending handoff

Given reconnect returns no entries
When the user runs the Connector trial command
Then Connector reports that no pending handoff is available
And no ack or artifact upload is attempted

Evidence: REAL_TEST via `pnpm --filter @sartre/connector-core test` and `CHANGE_NAME=connector-trial-run-handoff-loop pnpm harness:regression`.

## Scenario: CLI exposes trial command

Given a user runs `connector trial qa`
When the command completes
Then it prints JSON with handoff id, delivery id, inbox path, and report path
And invalid usage shows `connector trial <dev|qa>`

Evidence: REAL_TEST via `pnpm --filter @sartre/connector-cli test` and `CHANGE_NAME=connector-trial-run-handoff-loop pnpm harness:regression`.
