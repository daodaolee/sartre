## ADDED Requirements

### Requirement: Connector provides real handoff execution smoke

The connector CLI SHALL provide a smoke path that exercises public Hub APIs and the real Codex executor against a local demo handoff lifecycle.

#### Scenario: Real handoff execution smoke succeeds

- **WHEN** the local Hub is available and local Codex can execute
- **THEN** the smoke registers local demo endpoints, creates or receives a handoff, accepts the delivery, executes with real Codex, and reports `REAL_TEST`
- **AND** the smoke output includes delivery id, handoff id, final delivery status, provider profile id, and model run id

#### Scenario: Real handoff execution smoke cannot run

- **WHEN** Hub or Codex prerequisites are unavailable
- **THEN** the smoke output reports `SKIPPED` or a classified failure with concrete reason
- **AND** it MUST NOT be reported as a passing real test

### Requirement: Connector preserves execution boundary

The connector CLI SHALL use SDK/public contracts for all Hub writeback during execution and failure audit.

#### Scenario: Execution writeback uses SDK boundary

- **WHEN** Connector writes success or failure facts
- **THEN** it calls SDK/public Hub methods
- **AND** it does not import Hub API implementation files
