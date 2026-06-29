## ADDED Requirements

### Requirement: Real Codex CLI executor is available behind the adapter boundary

The Connector SHALL provide a real `CodexExecutor` implementation that invokes the local Codex CLI through a dedicated adapter while returning provider-neutral execution results.

#### Scenario: Codex exec produces assistant output

- **WHEN** the real executor runs with a rendered delivery prompt
- **THEN** it invokes `codex exec` with an ephemeral non-interactive command
- **AND** it captures the final assistant message as `CodexExecutionResult.output`
- **AND** it returns command metadata without exposing credentials

#### Scenario: Codex process is unavailable

- **WHEN** the Codex binary cannot be started
- **THEN** the executor returns a classified `Unavailable` failure
- **AND** the safe message does not include secret-like substrings

### Requirement: Real executor failures are classified and redacted

The real Codex executor SHALL normalize process failures, timeouts, auth/action prompts, rate limits, and invalid input into stable executor error categories.

#### Scenario: Codex run times out

- **WHEN** the Codex process exceeds the configured timeout
- **THEN** the executor returns a classified `Timeout` failure
- **AND** the failure includes safe command metadata for diagnosis

#### Scenario: Codex requires user action

- **WHEN** Codex stderr indicates login, authentication, or confirmation is required
- **THEN** the executor returns `NeedUserAction`
- **AND** the caller can surface that reason without exposing raw secrets

### Requirement: Real smoke evidence is honest

The Connector SHALL provide a smoke path that attempts a small real Codex CLI invocation and labels the result according to what actually happened.

#### Scenario: Real Codex smoke invokes process

- **WHEN** the smoke command successfully invokes Codex
- **THEN** the output includes `REAL_TEST`
- **AND** the output includes the executor kind and final assistant message excerpt

#### Scenario: Real Codex smoke cannot run

- **WHEN** Codex is missing, unauthenticated, blocked, or times out
- **THEN** the output includes `SKIPPED` or a classified failure with the concrete reason
- **AND** it MUST NOT be reported as a passing real test
