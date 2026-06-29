## ADDED Requirements

### Requirement: Web Console derives endpoint diagnostics from Hub overview

The Web Console SHALL derive selected endpoint diagnostics from public Hub overview data.

#### Scenario: Registered online endpoint is ready

- **WHEN** the selected actor endpoint exists, is online, has required capabilities, and uses `manual_confirm`
- **THEN** diagnostics show registration, connection, capability, and permission checks as ready

#### Scenario: Offline or pending endpoint needs attention

- **WHEN** the selected actor endpoint is offline or has pending deliveries
- **THEN** diagnostics show warning states with concrete details

#### Scenario: Missing endpoint or capability is blocked

- **WHEN** the selected actor endpoint is missing or lacks a required capability
- **THEN** diagnostics show blocked states with concrete recovery guidance

### Requirement: Endpoint diagnostics are visible in the Web page

The Web Console SHALL render endpoint diagnostics for the selected actor.

#### Scenario: User switches actor

- **WHEN** the user switches between Dev and QA
- **THEN** the diagnostics panel reflects the selected actor endpoint
- **AND** the page continues to use public contracts and Web-only view models
