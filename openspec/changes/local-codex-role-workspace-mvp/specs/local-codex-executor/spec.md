# Local Codex Executor Specification

## Purpose

Local Codex Executor lets a role Agent execute an accepted delivery through the local Codex runtime while the Hub remains the durable fact source for task state, conversation context, model runs, transcript, artifacts, and audit events.

## ADDED Requirements

### Requirement: Executor starts only from accepted deliveries

The local executor SHALL start a delivery only after the delivery has been human-released to the role Agent and the Hub has recorded it as `accepted`.

#### Scenario: Accepted delivery enters running

- **GIVEN** a delivery is `accepted`
- **WHEN** the local executor claims it for the recipient endpoint
- **THEN** the Hub records a `delivery.running` event
- **AND** the delivery status becomes `running`

#### Scenario: Delivered delivery cannot be started directly

- **GIVEN** a delivery is `delivered`
- **WHEN** the local executor tries to start it
- **THEN** the Hub rejects the transition with a classified invalid transition error

### Requirement: Executor resolves Codex runtime binding

The local executor SHALL resolve a provider/model profile for the executing endpoint before invoking Codex.

#### Scenario: Default Codex profile is selected

- **GIVEN** the endpoint has an available default provider/model profile with `provider=codex`
- **WHEN** execution starts
- **THEN** the executor records the selected profile id, provider, model, and executor kind in run metadata

#### Scenario: Missing compatible profile blocks execution

- **GIVEN** no compatible Codex profile is available
- **WHEN** execution starts
- **THEN** the executor marks the run as failed with category `Unavailable`
- **AND** the delivery remains auditable through timeline events

### Requirement: Executor writes provider-neutral run facts

The local executor SHALL write execution facts to Sartre-owned records instead of relying on Codex session history as canonical state.

#### Scenario: Successful execution writes transcript and result

- **WHEN** Codex execution succeeds
- **THEN** the executor records conversation messages for prompt and assistant output
- **AND** records a model run with status `succeeded`
- **AND** uploads or registers a report artifact
- **AND** moves the delivery to `report_ready`

#### Scenario: Failed execution writes classified failure

- **WHEN** Codex execution fails
- **THEN** the executor records a model run with status `failed`
- **AND** stores a classified error category and safe message without secrets
- **AND** marks the delivery failed or leaves it running with an explicit failure event according to the failure point

### Requirement: Codex adapter is testable without real Codex

The Codex execution adapter SHALL have a fake app-server implementation for deterministic tests and a real app-server smoke path that is clearly separated from unit tests.

#### Scenario: Fake Codex app-server returns transcript

- **WHEN** connector tests run
- **THEN** they execute the fake adapter without spawning a real Codex process
- **AND** they verify prompt, transcript, status, and writeback behavior

#### Scenario: Real Codex smoke is evidence-labeled

- **WHEN** a real Codex smoke is run locally
- **THEN** the report labels it as `REAL_TEST` only if `codex app-server` was actually invoked
- **AND** labels it as `SKIPPED` with a reason when Codex is unavailable

### Requirement: Product model hides computer management

The Web Console and public contracts SHALL NOT introduce `computer` as a first-class product object for this slice.

#### Scenario: Runtime is shown as agent binding

- **WHEN** the user views a role Agent
- **THEN** the UI describes its runtime binding/provider profile
- **AND** does not require the user to manage a computer page
