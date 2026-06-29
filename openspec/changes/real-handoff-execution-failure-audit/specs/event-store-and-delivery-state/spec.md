## ADDED Requirements

### Requirement: Executor-driven delivery failure is auditable

Handoff Hub SHALL persist executor-driven delivery failures as delivery lifecycle events and expose them through overview/timeline projections.

#### Scenario: Running delivery fails from executor

- **WHEN** Connector marks a running delivery failed because local execution failed
- **THEN** Hub stores the failure reason and metadata
- **AND** Hub appends a `delivery.failed` event with the actor endpoint and classified error category when supplied

#### Scenario: Overview shows execution failure

- **WHEN** a delivery has an executor-driven failed event
- **THEN** overview includes a red failed timeline entry for the task
- **AND** task detail projections can show the failed model run category and safe message
