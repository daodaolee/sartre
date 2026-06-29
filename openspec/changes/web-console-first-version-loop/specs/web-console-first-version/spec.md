## ADDED Requirements

### Requirement: Web Console reads Hub overview through public SDK

The Web Console SHALL load Handoff Hub overview state through `@sartre/sdk` and public contracts.

#### Scenario: Overview page renders Hub-backed state

- **WHEN** Web Console receives a populated overview response
- **THEN** it renders metrics, endpoints, handoff queue, delivery timeline, and reports
- **AND** it does not import Hub API internals

#### Scenario: Empty and error states are visible

- **WHEN** the overview response is empty
- **THEN** the page shows an empty state
- **WHEN** the Hub request fails
- **THEN** the page shows the Hub URL and failure reason

### Requirement: Web Console can trigger first-version operations

The Web Console SHALL expose basic Dev/QA operations through public SDK methods.

#### Scenario: User registers an endpoint

- **WHEN** the user selects QA and clicks register
- **THEN** the app calls `registerAgentEndpoint` with QA profile facts
- **AND** it records the operation result in the UI

#### Scenario: User creates and manages local demo handoff

- **WHEN** the user creates a demo handoff
- **THEN** the app calls `createHandoff` with a free-form handoff pack
- **AND** delivery ack/fail/expire actions call the SDK delivery command methods

### Requirement: Web Console is an independent app package

The Web Console SHALL be testable and buildable as its own app package.

#### Scenario: Web package stays isolated

- **WHEN** architecture checks run
- **THEN** Web Console must not import `apps/hub-api`
- **AND** Web Console package dependencies must not include another `apps/*` package such as `@sartre/connector-cli`
