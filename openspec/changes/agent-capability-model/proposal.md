## Why

Sartre needs a stable way to describe what each role Agent can read, call, and execute before Codex, Claude, hooks, skills, plugins, MCP servers, and commands are connected as interchangeable executors. Today `AgentEndpoint` only exposes flat `capabilities` and `execution_mode`, which is not enough to explain where a capability comes from, whether it is safe to run automatically, or how the local Connector should prepare an agent-readable context.

## What Changes

- Introduce an Agent capability model that separates role identity, endpoint instance, capability source, executor binding, and approval policy.
- Extend endpoint registration and overview contracts with structured `capability_sources`, `executor`, and `approval_policy` metadata while keeping flat `capabilities` for matching and backward compatibility.
- Persist capability source metadata in Handoff Hub and expose it through overview so Web Console can render real Agent/Skill/Hook/Plugin/Command state.
- Extend Local Connector profiles so local Dev/QA endpoints can declare skill, hook, command, and manual prompt sources without coupling to a specific LLM vendor.
- Keep task payloads role-neutral: handoff packs continue to describe the task, while Agent endpoints describe how they can consume and act on it.

## Capabilities

### New Capabilities

- `agent-capability-model`: Defines AgentProfile, AgentEndpoint, CapabilitySource, ExecutorBinding, and ApprovalPolicy contracts used by Hub, Connector, and Web Console.

### Modified Capabilities

- `local-connector`: Local Connector SHALL register endpoint capability sources and prepare local agent-readable context from those sources.

## Impact

- Affected packages: `packages/contracts`, `packages/connector-core`, `packages/sdk`.
- Affected apps: `apps/hub-api`, `apps/connector-cli`, `apps/web-console`.
- Affected storage: `agent_endpoints` requires additive JSONB columns or equivalent backward-compatible persistence for capability sources, executor binding, and approval policy.
- Affected evidence: contracts tests, connector-core tests, Hub API e2e tests, Web Console tests, architecture check, and OpenSpec validation.
