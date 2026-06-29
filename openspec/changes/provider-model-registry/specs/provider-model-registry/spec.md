## ADDED Requirements

### Requirement: Endpoint-scoped provider model profile
The system SHALL persist provider/model/executor profiles as tenant-scoped and endpoint-scoped registry facts.

#### Scenario: Register provider model profile
- **WHEN** an endpoint registers a provider/model/executor profile with provider id, model id, executor kind, capabilities, token limits, default flag, and metadata
- **THEN** the system SHALL persist a versioned profile record for that tenant and endpoint
- **AND** the persisted profile SHALL NOT contain API keys, tokens, provider session ids, or rendered prompt text

#### Scenario: Upsert profile by stable identity
- **WHEN** the same tenant, endpoint, provider, model, and executor kind are registered again
- **THEN** the system SHALL update the existing profile instead of creating a duplicate profile
- **AND** the profile updated timestamp SHALL change

### Requirement: Explicit model capabilities
The system SHALL expose model capability declarations so callers can choose compatible providers without trial-and-error runtime failures.

#### Scenario: Capabilities are visible in registry list
- **WHEN** a registry list is read for an endpoint
- **THEN** each profile SHALL include capability flags or names for chat, streaming, tool use, vision, embedding, and local command support when declared
- **AND** each profile SHALL include context window and max output token limits when declared

### Requirement: Provider model health report
The system SHALL record health reports separately from static profile declarations.

#### Scenario: Health report updates latest health
- **WHEN** an endpoint reports checks for a provider/model profile
- **THEN** the system SHALL persist the report with status, check list, reported time, and metadata
- **AND** subsequent registry reads SHALL include the latest health report for that profile

#### Scenario: Health metadata rejects secrets
- **WHEN** a health report metadata key or value looks like a secret
- **THEN** the system SHALL reject the report as invalid input

### Requirement: Endpoint-scoped registry visibility
The system SHALL return only profiles visible to the requested endpoint.

#### Scenario: Endpoint reads own registry
- **WHEN** an endpoint reads provider model registry entries for a tenant
- **THEN** the system SHALL return profiles where `agent_endpoint_id` equals the requested endpoint id
- **AND** profiles from other endpoints SHALL NOT be returned

### Requirement: Selection resolution
The system SHALL resolve a compatible provider/model/executor selection without executing any provider call.

#### Scenario: Resolve default compatible profile
- **WHEN** an endpoint asks to resolve a selection with required capabilities and no preferred provider/model
- **THEN** the system SHALL return the endpoint's default available profile that satisfies the requested capabilities and limits
- **AND** the response SHALL include a selection reason and the selected profile id

#### Scenario: Resolve preferred provider model
- **WHEN** an endpoint asks to resolve a selection with a preferred provider and model
- **THEN** the system SHALL return the matching available compatible profile
- **AND** if the matching profile is blocked, disabled, or incompatible, the system SHALL return a classified unavailable error

### Requirement: Minimal Web Console registry projection
The Web Console SHALL expose a read-only view of the current endpoint's provider/model registry.

#### Scenario: Selected endpoint scopes model registry
- **WHEN** the user switches endpoint identity in Web Console
- **THEN** the provider/model registry view SHALL refresh to show only profiles for the selected endpoint

#### Scenario: Registry projection is read-only
- **WHEN** the Web Console displays provider/model registry profiles
- **THEN** it SHALL show provider, model, executor kind, capabilities, health, token limits, and default selection
- **AND** it SHALL NOT show API key controls, provider secret values, chat composer, streaming output, or execute buttons
