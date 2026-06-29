## ADDED Requirements

### Requirement: Connector runs a local handoff trial

Connector SHALL provide a local trial run that processes one pending handoff for a selected profile.

#### Scenario: Trial run processes first pending handoff

- **WHEN** a selected profile reconnects and receives pending deliveries
- **THEN** Connector writes the first handoff to inbox
- **AND** acknowledges that delivery
- **AND** writes a local trial report artifact
- **AND** submits the report through Hub artifact boundary

#### Scenario: No pending handoff is available

- **WHEN** reconnect returns no inbox entries
- **THEN** Connector fails with a clear `No pending handoff` error
- **AND** it does not acknowledge or report any artifact

### Requirement: Trial run is explicit and provider neutral

Connector trial run SHALL remain a manual/mock validation path and SHALL NOT invoke real LLM providers.

#### Scenario: Trial report is deterministic

- **WHEN** Connector writes the trial report
- **THEN** the report content is generated from handoff, delivery, endpoint, and inbox path facts
- **AND** it does not require Codex, Claude, MCP, plugin, hook, command, or subagent execution

### Requirement: Connector CLI exposes trial command

Connector CLI SHALL expose `trial <dev|qa>` for local first-version validation.

#### Scenario: CLI runs QA trial

- **WHEN** a user runs `connector trial qa`
- **THEN** the CLI runs the trial for the QA profile
- **AND** prints machine-readable JSON containing handoff id, delivery id, inbox path, and report path

#### Scenario: CLI usage includes trial command

- **WHEN** the CLI is called with invalid trial usage
- **THEN** usage output includes `connector trial <dev|qa>`
- **AND** no Hub call is made
