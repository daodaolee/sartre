# Feature: local Codex role workspace MVP

Evidence level before implementation: `SCENARIO_REGISTERED`.

## Scenario: human releases a QA delivery and local Codex starts it

- **GIVEN** Dev has sent a handoff to QA
- **AND** QA has received and accepted the delivery after human review
- **WHEN** QA runs the local connector execution command for that delivery
- **THEN** the Hub records `delivery.running`
- **AND** the selected QA role Agent runtime binding is recorded in run metadata

## Scenario: successful Codex execution produces task facts

- **GIVEN** a QA delivery is running through local Codex
- **WHEN** Codex returns a successful result
- **THEN** Sartre records prompt and assistant output in the conversation ledger
- **AND** records a succeeded model run
- **AND** registers a report artifact
- **AND** marks the delivery `report_ready` for human check

## Scenario: failed Codex execution is auditable

- **GIVEN** a QA delivery is running through local Codex
- **WHEN** the Codex adapter fails
- **THEN** Sartre records a failed model run with a classified error
- **AND** no secret-like value is written to metadata or error output
- **AND** the delivery timeline contains enough information to recover or retry

## Scenario: reconnecting sender sees task change

- **GIVEN** Dev sent a handoff while QA was working offline
- **WHEN** QA reconnects and writes report-ready facts
- **THEN** Dev can refresh the task detail and see the latest delivery status, run summary, transcript excerpt, and report artifact

## Scenario: product model avoids computer management

- **WHEN** a user opens the Web Console
- **THEN** the primary concepts are role Agent, endpoint identity, runtime binding, task inbox, and timeline
- **AND** the UI does not expose a computer management workflow for the first slice
