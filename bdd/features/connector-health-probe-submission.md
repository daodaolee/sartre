# Feature: Connector health probe submission

## Scenario: Connector probes local profile readiness

Given a local demo Connector profile
When Connector probes a writeable workspace
Then it produces executor, workspace, inbox, artifact, and trial-run checks
And the report remains role and provider neutral

Evidence: REAL_TEST via `pnpm --filter @sartre/connector-core test` and `CHANGE_NAME=connector-health-probe-submission pnpm harness:regression`.

## Scenario: Connector submits health through Hub SDK

Given a Connector profile has an AgentEndpoint id
When Connector submits the generated health report
Then it calls the SDK health report boundary with that endpoint id
And returns the submitted report response to the caller

Evidence: REAL_TEST via `pnpm --filter @sartre/connector-core test` and `CHANGE_NAME=connector-health-probe-submission pnpm harness:regression`.

## Scenario: CLI exposes health command for local roles

Given a user runs `connector health qa`
When the command completes
Then it probes the QA local profile
And prints the submitted health report as JSON

Evidence: REAL_TEST via `pnpm --filter @sartre/connector-cli test` and `CHANGE_NAME=connector-health-probe-submission pnpm harness:regression`.
