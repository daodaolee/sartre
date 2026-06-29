## ADDED Requirements

### Requirement: Endpoint capability manifest is versioned
The system SHALL define a versioned Agent capability manifest that can be shared by Hub, SDK, Connector, and Web Console.

#### Scenario: Endpoint registration includes capability sources
- **WHEN** an Agent endpoint registers with `capability_sources`, `executor`, and `approval_policy`
- **THEN** the public contract accepts the request and preserves those fields in a versioned shape

#### Scenario: Legacy endpoint registration remains valid
- **WHEN** an Agent endpoint registers with only `capabilities` and `execution_mode`
- **THEN** the public contract accepts the request and applies safe defaults for the structured manifest

### Requirement: Capability sources describe readable and executable abilities
The system SHALL represent `skill`, `hook`, `plugin`, `mcp`, `command`, `manual_prompt`, and `local_resource` as Agent-owned capability sources.

#### Scenario: Skill and hook are capability sources
- **WHEN** a QA endpoint declares one `skill` source and one `hook` source
- **THEN** the endpoint overview exposes both sources with id, type, display name, summary, capabilities, enabled state, and approval mode

#### Scenario: Task model remains source-agnostic
- **WHEN** a handoff is created for an endpoint with multiple capability source types
- **THEN** the handoff pack remains role-neutral and does not embed skill, hook, plugin, MCP, or command configuration

### Requirement: Approval policy is explicit
The system SHALL expose an endpoint-level approval policy independent from executor type.

#### Scenario: Manual confirmation is preserved
- **WHEN** an endpoint declares `approval_policy.mode` as `manual_confirm`
- **THEN** lifecycle actions that release work to the Agent remain auditable as user-approved transitions

#### Scenario: Future automatic modes are representable
- **WHEN** an endpoint declares `approval_policy.mode` as `prompt_only` or `auto_read_only`
- **THEN** the public contract preserves the mode without requiring Hub to execute the task automatically

### Requirement: Executor binding is model-neutral
The system SHALL describe how an Agent endpoint executes work using an executor binding that is not coupled to the endpoint role.

#### Scenario: Codex and manual prompt are executor options
- **WHEN** a developer endpoint declares `executor.kind` as `codex_cli` and a QA endpoint declares `executor.kind` as `manual_prompt`
- **THEN** both endpoints remain valid role Agents and expose their executor metadata in overview

### Requirement: Hub persists endpoint manifests
Handoff Hub SHALL persist capability sources, executor binding, and approval policy for registered endpoints.

#### Scenario: Overview returns persisted manifest
- **WHEN** an endpoint registers with capability sources, executor, and approval policy
- **THEN** `GET /overview` returns the same endpoint manifest fields for that endpoint

#### Scenario: Manifest persistence is additive
- **WHEN** existing endpoint rows do not contain manifest fields
- **THEN** migrations provide defaults and existing overview responses remain valid
