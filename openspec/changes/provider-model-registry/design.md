## Context

Sartre now has three adjacent facts:

- AgentEndpoint manifests describe what a role endpoint can do through `CapabilitySource`, `ExecutorBinding`, and `ApprovalPolicy`.
- Platform Chat Runtime stores provider/model metadata on `ContextProjection` and `ModelRun`, while keeping conversation history provider-neutral.
- Web Console can switch local dev/qa endpoint identity and render endpoint-scoped projections.

The missing boundary is a durable registry for provider/model/executor choices. If the next goal jumps directly to local Codex execution, provider/model facts would be hard-coded into the executor or UI. That would make model switching brittle and would reintroduce provider-owned session assumptions.

Prior art from `/Users/xy/xykj/superagentai` keeps provider/model administration separate from session/message persistence (`admin/providers`, `admin/provider-models`, `admin/platform-models`). Sartre should keep the same conceptual split, but with a smaller Hub-first registry suited to local role Agents.

## Goals / Non-Goals

**Goals:**

- Define versioned contracts for provider/model/executor profiles, model capabilities, health reports, endpoint-scoped registry list, and selection resolution.
- Persist registry profiles in Hub API with additive Postgres tables.
- Expose minimal HTTP APIs to register profiles, report health, list endpoint-visible profiles, and resolve a default/compatible selection.
- Add SDK helpers for the new APIs.
- Add a Web Console read-only capability surface for current endpoint's model/executor registry.
- Keep the registry free of API keys, tokens, provider session ids, and rendered prompts.

**Non-Goals:**

- Do not call Codex, Claude, OpenAI-compatible APIs, or any real model provider.
- Do not implement provider gateway routing, quota, billing, or admin approval workflows.
- Do not persist provider secrets or local credentials.
- Do not change `ConversationLedger`, `ContextProjection`, or `ModelRun` contracts in this slice.
- Do not add Web Console composer, streaming transcript, or executor controls.

## Decisions

### Decision 1: Registry profile is endpoint-scoped

`ProviderModelProfile` belongs to a tenant and an `agent_endpoint_id`. It describes one executable provider/model combination exposed by that endpoint: provider id, model id, executor kind, capability list, context limits, default flag, status, metadata, and timestamps.

Alternative considered: global tenant-wide provider catalog. Rejected for the first slice because Sartre's immediate need is local role Agent execution; a QA endpoint and a Dev endpoint may expose different local executors and health.

### Decision 2: Health is separate from static capability declaration

The profile stores durable capability facts. `ProviderModelHealthReport` stores latest observed health and checks. A profile can be configured but currently blocked.

Alternative considered: store `online: boolean` directly on the profile. Rejected because debugging local executor readiness requires check-level evidence such as command availability, workspace access, and provider CLI status.

### Decision 3: Selection resolution is deterministic and read-only

`ResolveProviderModelSelection` accepts tenant, endpoint, optional preferred provider/model, required capabilities, and optional minimum context window. It returns the default compatible available profile or a classified `Unavailable` error. It does not execute the model.

Alternative considered: defer selection until executor implementation. Rejected because Web Console and future executor goals need a stable contract for "which model would be used" before any model call.

### Decision 4: Registry and chat runtime remain loosely coupled

`ContextProjection` and `ModelRun` still carry provider/model strings. Future goals can add optional registry profile references if needed, but this goal does not change the conversation schema.

Alternative considered: immediately add `provider_model_profile_id` to `ModelRun`. Rejected because the chat runtime change just closed, and the current provider/model fields are sufficient to audit first provider switches.

### Decision 5: Web Console remains read-first

The UI shows current endpoint's registry profiles, model capabilities, status, health, and default selection. It does not expose API key editing or execution buttons.

Alternative considered: build a full model settings page. Rejected because secret management and provider gateway routing are separate products and would expand the blast radius.

## Risks / Trade-offs

- Profile schema may be too local-executor oriented -> Keep provider/model identifiers generic and executor kind extensible.
- Health reports can become stale -> Expose `reported_at` and status, and let selection ignore blocked/disabled profiles.
- Capabilities can drift from real executor behavior -> Future executor goal must validate declared capabilities before running.
- Default selection can hide ambiguity -> Resolve response includes `selection_reason` so the UI and logs can explain why a profile was selected.
- Secrets accidentally entering metadata -> Reuse secret-like metadata validation from existing contracts and avoid storing credentials by design.

## Migration Plan

1. Add contract tests and schemas for registry profiles, health, list, and resolve responses.
2. Add BDD/acceptance artifacts and PLAN_LEDGER for the goal.
3. Add SDK tests and helpers for registry APIs.
4. Add additive migration `006_provider_model_registry.sql`.
5. Add Hub `provider-registry` bounded context with repository port, Postgres implementation, application service, and HTTP controller.
6. Add Web Console tests and read-only UI projection under capability surfaces.
7. Run package tests/builds, architecture check, OpenSpec strict validation, diff check, and live Hub/Postgres smoke.

Rollback is additive: existing Handoff and Conversation tables/endpoints keep working. If no profiles are registered, clients receive an empty registry list and selection returns a classified unavailable error.

## Open Questions

- Whether long-term provider catalogs should become tenant-wide admin-managed resources or remain endpoint-first.
- Whether registry profile ids should be referenced by future `ModelRun` records after the first local Codex executor exists.
- Whether default model selection should eventually account for tenant policy, cost, or quotas.
