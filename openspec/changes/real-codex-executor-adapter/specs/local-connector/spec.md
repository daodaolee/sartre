## ADDED Requirements

### Requirement: Connector execution selects fake or real executor explicitly

The connector CLI SHALL allow local role execution to select the Codex executor implementation explicitly without changing Hub, SDK, or Web Console contracts.

#### Scenario: Fake executor remains deterministic

- **WHEN** the user runs `connector execute <profile> <delivery-id>` without selecting real Codex
- **THEN** the connector uses the deterministic fake executor path
- **AND** no local Codex process is spawned

#### Scenario: Real executor is selected

- **WHEN** the user runs `connector execute <profile> <delivery-id>` with real executor selection
- **THEN** the connector uses the real Codex CLI executor
- **AND** delivery lifecycle writeback still goes through the SDK and public Hub APIs

### Requirement: Connector does not introduce computer management

The connector CLI and public role execution flow SHALL describe execution through endpoint identity, runtime binding, and LLM adapter language only.

#### Scenario: Execution output omits computer product language

- **WHEN** connector execution reports the selected runtime
- **THEN** it describes the role endpoint and executor kind
- **AND** it does not require or mention a first-class computer management object
