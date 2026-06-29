## ADDED Requirements

### Requirement: Web Console refreshes Hub overview on demand

Web Console SHALL provide a user-triggered refresh affordance that reloads Hub overview data.

#### Scenario: User refreshes overview

- **WHEN** a user activates the refresh action
- **THEN** Web Console calls the overview loader again
- **AND** updates displayed endpoint health from the new overview

#### Scenario: Refresh failure preserves current overview

- **WHEN** a refresh fails after an overview is already displayed
- **THEN** Web Console keeps the current overview visible
- **AND** shows the refresh failure detail

### Requirement: Web Console summarizes reported endpoint health

Web Console SHALL summarize endpoint health reports in the Agent endpoint health panel using existing overview facts.

#### Scenario: Endpoint has passed health report

- **WHEN** an endpoint has a health report with all checks passed
- **THEN** the Agent health card shows a passed health summary
- **AND** it shows the report timestamp

#### Scenario: Endpoint has blocked health report

- **WHEN** an endpoint has any blocked health check
- **THEN** the Agent health card shows a blocked health summary
- **AND** the Endpoint diagnostics panel still lists the individual blocked check

#### Scenario: Endpoint has no health report

- **WHEN** an endpoint has no health report
- **THEN** the Agent health card shows that no health report has been submitted yet

### Requirement: Connector health command is discoverable

Web Console SHALL include the Connector health command in setup guidance without importing Connector internals.

#### Scenario: User reads setup commands

- **WHEN** a user opens Connector setup
- **THEN** the command list includes `connector health <dev|qa>` guidance
- **AND** the command is plain text guidance, not a direct local process invocation
