# Local Connector Delta Specification

## Purpose

This delta extends Local Connector from inbox/report tooling into the local runtime boundary for accepted role-agent deliveries.

## MODIFIED Requirements

### Requirement: Connector executes accepted deliveries

The connector CLI SHALL support executing an accepted delivery for a selected local role profile through public SDK APIs and the local Codex executor.

#### Scenario: QA executes an accepted handoff

- **GIVEN** a QA delivery has been accepted by a human
- **WHEN** the user runs `connector execute qa <delivery-id>`
- **THEN** the connector starts the delivery, invokes the Codex executor, writes execution facts, and marks the report ready

### Requirement: Connector preserves SDK and package boundaries

The connector SHALL use `packages/sdk`, `packages/contracts`, and local executor abstractions only.

#### Scenario: Architecture check protects boundaries

- **WHEN** `pnpm run architecture:check` runs
- **THEN** connector code does not import Hub API internals, Web Console internals, or provider-specific UI code

### Requirement: Connector uses role Agent language

Connector help text, inbox markdown, and execution output SHALL refer to role Agent, endpoint identity, and runtime binding.

#### Scenario: Help text has no computer setup step

- **WHEN** the user runs connector help
- **THEN** the output explains profile, connect, listen, execute, health, and report commands
- **AND** does not expose `computer` as a required user concept
