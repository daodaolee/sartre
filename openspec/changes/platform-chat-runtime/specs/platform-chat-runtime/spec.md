## ADDED Requirements

### Requirement: Provider-neutral conversation ledger

The system SHALL persist conversations as provider-neutral ledgers owned by Sartre, not by a specific LLM provider session.

#### Scenario: Conversation survives provider switch

- **WHEN** a conversation contains messages created while using one provider and a later model run targets another provider
- **THEN** the system SHALL keep both runs attached to the same conversation ledger id
- **AND** the canonical message history SHALL remain readable without either provider session id

#### Scenario: Conversation is endpoint-scoped

- **WHEN** an endpoint reads conversations for a tenant
- **THEN** the system SHALL return only conversations where that endpoint is the owner or a participant

### Requirement: Ordered message ledger

The system SHALL store conversation messages in a stable sequence with role, author endpoint, content, creation time, and optional references.

#### Scenario: Append message assigns sequence

- **WHEN** a message is appended to a conversation
- **THEN** the system SHALL assign the next sequence number within that conversation
- **AND** later reads SHALL return messages in ascending sequence order

#### Scenario: Message references task artifacts

- **WHEN** a message references a handoff, delivery, task, or artifact
- **THEN** the system SHALL preserve those references as structured data attached to the message

### Requirement: Tool invocation audit

The system SHALL record tool invocations as ledger facts linked to a conversation and optionally to a source message.

#### Scenario: Tool invocation records lifecycle

- **WHEN** a tool invocation is recorded
- **THEN** the system SHALL persist its tool name, status, input summary, output summary, creation time, and classified error when present

### Requirement: Summary checkpoints

The system SHALL support summary checkpoints that condense earlier conversation context without replacing canonical messages.

#### Scenario: Summary checkpoint keeps provenance

- **WHEN** a summary checkpoint is created
- **THEN** the system SHALL store the covered message sequence range and the author endpoint
- **AND** original messages SHALL remain readable

### Requirement: Model run audit

The system SHALL record model runs separately from conversations so every provider/model attempt can be audited.

#### Scenario: Model run references projection

- **WHEN** a model run is recorded for a provider and model
- **THEN** the system SHALL link it to the conversation and the context projection used for that run
- **AND** the system SHALL persist status, timestamps, executor endpoint, and classified failure metadata when present

### Requirement: Context projection from ledger

The system SHALL create provider-specific context projections from ledger facts rather than storing provider sessions as canonical history.

#### Scenario: Projection records selected context

- **WHEN** a context projection is created for a provider/model pair
- **THEN** the system SHALL persist selected message ids, summary checkpoint ids, reference ids, token budget, and rendered context text

#### Scenario: Projection is reproducible

- **WHEN** a conversation detail is read
- **THEN** each context projection SHALL expose its source ids so the projection can be traced back to ledger facts

### Requirement: Minimal Web Console read projection

The Web Console SHALL expose a read-only view of the current endpoint's conversation ledgers and context projection summaries.

#### Scenario: Selected endpoint scopes conversations

- **WHEN** the user switches endpoint identity in Web Console
- **THEN** the conversation list SHALL refresh to show only conversations visible to that endpoint

#### Scenario: Conversation detail shows provider context

- **WHEN** the user selects a conversation
- **THEN** the Web Console SHALL show ordered messages, references, model runs, summary checkpoints, and context projections for that conversation
