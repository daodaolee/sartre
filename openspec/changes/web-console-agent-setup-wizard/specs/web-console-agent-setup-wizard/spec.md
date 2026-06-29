## ADDED Requirements

### Requirement: Web Console derives a guided agent setup model

The Web Console SHALL derive a setup wizard model from selected actor profile and endpoint diagnostics.

#### Scenario: Ready endpoint setup

- **WHEN** diagnostics are passed or warning-only
- **THEN** setup wizard shows role, executor, capabilities, permission, health, and trial steps
- **AND** `manual_confirm` remains the recommended permission mode

#### Scenario: Blocked endpoint setup

- **WHEN** diagnostics contain blocked items
- **THEN** setup wizard shows the health step as blocked
- **AND** recovery actions remain visible

### Requirement: Setup wizard is visible and actionable

The Web Console SHALL render the setup wizard without requiring complex JSON.

#### Scenario: User follows setup actions

- **WHEN** the user selects QA
- **THEN** the setup panel shows QA endpoint setup steps
- **AND** register, connect, and trial handoff actions are available through existing Web operations

#### Scenario: Page remains isolated

- **WHEN** architecture checks run
- **THEN** Web Console still does not import Hub API internals
- **AND** no Hub API route or database schema changes are required
