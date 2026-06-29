## Context

The current Handoff Hub can register role endpoints and deliver tasks, but endpoint capability data is only a flat string array plus `execution_mode`. Web Console already has Agents, Hooks, and Skills surfaces, and Connector health probes already mention an executor, but these are not backed by a shared contract. As a result, the platform cannot explain whether an Agent capability comes from a skill, hook, plugin, MCP server, command, local resource, or manual prompt, nor can it reason about approval mode consistently.

This change treats an Agent as a role endpoint with declared capability sources and a pluggable executor. The task model remains role-neutral: handoff packs describe the work, while endpoints describe how a local role Agent can consume and act on that work.

## Goals / Non-Goals

**Goals:**

- Define a versioned Agent capability contract shared by Hub, Connector, SDK, and Web Console.
- Preserve the existing `capabilities: string[]` field for matching and backward compatibility.
- Add structured `capability_sources`, `executor`, and `approval_policy` to endpoint registration and overview.
- Persist capability metadata as additive JSONB fields in `agent_endpoints`.
- Let Local Connector profiles provide capability sources for skills, hooks, commands, plugins, MCP, and manual prompt flows.
- Keep approval policy explicit so manual confirmation and future auto execution both produce auditable state.

**Non-Goals:**

- Do not implement a full in-platform LLM chat runtime in this change.
- Do not directly control the Codex UI process.
- Do not require all task payloads to use Dev-to-QA specific fields.
- Do not make hooks or skills first-class task targets; they remain capability sources owned by an Agent endpoint.

## Decisions

### Decision 1: CapabilitySource is the extension point

`skill`, `hook`, `plugin`, `mcp`, `command`, `manual_prompt`, and `local_resource` are represented as `CapabilitySource` records attached to an endpoint. Each source has an id, type, display name, summary, capabilities, approval mode, enabled state, and optional metadata.

Alternative considered: add separate tables and APIs for skills, hooks, plugins, and commands. That would be premature for the first durable model and would leak implementation details into task routing. A single source manifest keeps the task matcher simple while still exposing enough metadata for Web Console and Connector.

### Decision 2: ApprovalPolicy is separate from execution mode

Endpoint `execution_mode` remains for backward compatibility, but new clients send `approval_policy` with values such as `manual_confirm`, `prompt_only`, `auto_read_only`, and `auto_execute_low_risk`. This makes the UX setting explicit without overloading executor type.

Alternative considered: rename `execution_mode` immediately. That would be a breaking change across Hub, SDK, Connector, and Web Console. The additive policy field gives us a migration path.

### Decision 3: ExecutorBinding describes how work is run, not what role the Agent is

Endpoint `executor` describes `codex_cli`, `claude_code`, `command`, `mcp`, `manual_prompt`, or `mock`. Role remains `developer`, `qa`, `product`, `design`, `ops`, or custom. This prevents "QA Agent" from being coupled to "Codex".

Alternative considered: one endpoint type per LLM. That would make mixed local workflows hard and would force users into model-specific setup too early.

### Decision 4: Hub persists manifests but does not execute them

Handoff Hub stores endpoint capability metadata and returns it in overview. Local Connector interprets the manifest and prepares local context. Hub stays the delivery/audit fact source, not an execution host.

Alternative considered: Hub executes commands or Codex tasks remotely. That violates local trust boundaries and creates security risk before permissions are mature.

### Decision 5: Web Console renders real endpoint capability metadata

Agents, Hooks, and Skills pages should derive from endpoint `capability_sources` when available. Static fallback remains only for empty local demo state.

Alternative considered: keep UI-only hook/skill configuration. That makes the UI look configurable while the service cannot act on it.

### Decision 6: Platform chat runtime must be model-neutral

Future in-platform chat can reference `/Users/xy/xykj/superagentai` for Chat/Coding session persistence, memory recall, summary refresh, provider routing, and projection separation. The durable Sartre boundary should still be a platform-owned conversation ledger, not a provider-owned chat session. Messages, tool invocations, handoff/task/artifact references, summary checkpoints, and model run metadata should be stored in Sartre first; each LLM receives a provider-specific context projection rebuilt from that ledger.

This is intentionally a follow-up change. The current capability model can describe a `codex_cli`, `claude_code`, `manual_prompt`, `mcp`, or `plugin` executor, but it does not implement a chat runtime, provider gateway, streaming UI, or automatic local Codex execution.

## Risks / Trade-offs

- Capability metadata can grow into an unstructured dumping ground -> Keep a small contract and validate source type, capabilities, approval mode, and enabled state.
- JSONB columns defer relational modeling -> Accept for MVP because source types will evolve; add relational tables later only when querying becomes complex.
- Flat `capabilities` can drift from source capabilities -> Derive or validate union semantics in tests and helper functions.
- Auto execution settings can be unsafe -> Store policy now, but only implement `manual_confirm`, `prompt_only`, and read-only preparation in this change.
- Existing local data may miss new columns -> Add migrations with defaults and keep contract fields optional where needed.
- Provider-specific chat sessions can lose context when switching LLMs -> Future chat runtime must persist a model-neutral conversation ledger and rebuild context projections per provider/model.

## Migration Plan

1. Add contract schemas and tests for CapabilitySource, ExecutorBinding, and ApprovalPolicy.
2. Add Hub migration for endpoint manifest JSONB fields with safe defaults.
3. Update endpoint repository and overview response to round-trip manifest fields.
4. Update Connector profiles to declare capability sources and register them.
5. Update Web Console mapping to display backend capability sources when present.
6. Run contract, SDK, Connector, Hub API, Web Console, architecture, and OpenSpec validation.

Rollback is safe because the change is additive: old clients can keep sending only `capabilities` and `execution_mode`; new fields default to empty sources, `manual_prompt` executor, and `manual_confirm` approval.
