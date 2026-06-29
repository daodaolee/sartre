## ADDED Requirements

### Requirement: Failed execution writes provider-neutral failure facts

The local Codex executor orchestration SHALL record failed execution facts in Sartre-owned Hub records when Codex execution fails after the delivery has entered `running`.

#### Scenario: Codex failure records failed model run

- **WHEN** Codex execution fails after Connector starts an accepted delivery
- **THEN** Connector records a model run with status `failed`
- **AND** the model run metadata includes the classified error category, safe message, provider profile id, handoff id, and delivery id

#### Scenario: Failed execution marks delivery failed

- **WHEN** the failed model run has been recorded
- **THEN** Connector calls the public Hub delivery failure API
- **AND** Hub persists a `delivery.failed` lifecycle event visible to overview/timeline readers

### Requirement: Successful real execution reaches report ready

The real Codex CLI executor SHALL be usable in a full handoff delivery execution path that starts from an accepted delivery and ends at report ready.

#### Scenario: Real accepted delivery reaches report ready

- **GIVEN** a local demo delivery has been accepted for a role endpoint
- **WHEN** Connector executes it with the real Codex CLI executor
- **THEN** Hub records `delivery.running`
- **AND** Connector records a succeeded model run and report artifact
- **AND** Hub moves the delivery to `report_ready`

### Requirement: Failure metadata is safe

Execution failure writeback SHALL use classified categories and redacted messages, never raw provider secrets.

#### Scenario: Secret-like Codex failure is redacted

- **WHEN** Codex execution fails with a message containing token, secret, API key, or private key material
- **THEN** the model run metadata and delivery failure reason use a redacted safe message
- **AND** the raw secret-like value is not persisted through Connector writeback
