## Why

Sartre now has a provider-neutral conversation ledger, but it does not yet have a durable source of truth for which providers, models, and local executors are available to each AgentEndpoint. Without a registry, the next local Codex executor and streaming UI would either hard-code provider choices or treat provider session state as canonical.

## What Changes

- Add a provider/model/executor registry contract that records provider identity, model capabilities, executor bindings, endpoint ownership, health, and default selection facts.
- Add Hub API persistence and HTTP endpoints for registering executor profiles, listing registry entries scoped by tenant/endpoint, reporting health, and resolving a model selection for a conversation projection.
- Add SDK helpers for registry registration, health reporting, listing, and selection resolution.
- Add a minimal Web Console read projection that shows the current endpoint's available executors/models and default selection without exposing secrets or execution controls.
- Keep real Codex/Claude/OpenAI execution, API key storage, provider gateway routing, and streaming model output out of this first registry slice.

## Capabilities

### New Capabilities

- `provider-model-registry`: Defines the provider/model/executor registry, endpoint-scoped visibility, capability/health facts, and selection read behavior.

### Modified Capabilities

- None.

## Impact

- Contracts: new versioned schemas and exported types for provider ids, model profiles, executor profiles, health reports, registry list responses, and selection resolution.
- SDK: new client helpers for registry registration, health report, list, and resolve operations.
- Hub API: new registry bounded context, additive Postgres migration, repository port, application service, and HTTP controller.
- Web Console: new read-only capability surface under the existing "能力" area, reusing endpoint identity and Vercel Geist styling.
- Platform Chat Runtime: no schema change; future `ContextProjection` and `ModelRun` can reference registry facts by provider/model/executor ids.
- No existing Handoff Hub or Conversation endpoint is removed or changed.
