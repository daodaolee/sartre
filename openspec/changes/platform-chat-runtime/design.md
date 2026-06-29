## Context

Sartre already has Handoff Hub delivery, endpoint registration, capability manifests, and a Web Console control surface. It does not yet have an in-platform chat runtime, so a role Agent that wants to talk through the platform would otherwise have to rely on Codex, Claude, or another provider's own session history.

That would break the product goal: multiple roles and multiple LLM executors must be able to collaborate while preserving context across provider switches. The durable boundary must therefore be a Sartre-owned conversation ledger, with provider/model-specific context rebuilt as projections.

Reference input from `/Users/xy/xykj/superagentai`:

- Session persistence uses `agent_sessions`, `agent_session_messages`, and checkpoints.
- Memory design separates raw messages, daily logs, summaries, embeddings, and recall-before-run.
- Provider/model administration is a separate domain from conversations.
- UI projection separates pure store state, controller side effects, and selector-derived view models.

## Goals / Non-Goals

**Goals:**

- Define provider-neutral contracts for conversations, messages, tool invocations, references, summary checkpoints, model runs, and context projections.
- Persist the ledger in Hub API using additive Postgres tables.
- Expose minimal HTTP APIs for creating a conversation, appending a message, recording a tool invocation, recording a model run, creating a summary checkpoint, creating a context projection, and reading conversation detail.
- Keep provider-specific context as generated projection data, never as canonical history.
- Add Web Console read projection for the selected endpoint's conversations.
- Prove the slice with contract tests, Hub API tests, Web Console tests/build, OpenSpec strict validation, architecture check, and a live Hub/Postgres smoke.

**Non-Goals:**

- Do not call Codex, Claude, OpenAI-compatible APIs, or any real LLM in this change.
- Do not implement streaming token transport.
- Do not implement automatic memory embedding or semantic recall.
- Do not replace existing Handoff Hub task delivery.
- Do not make provider session ids mandatory.

## Decisions

### Decision 1: ConversationLedger is the canonical aggregate

`ConversationLedger` owns the stable facts: conversation identity, tenant, owning endpoint, participants, messages, tool invocations, handoff/task/artifact references, summary checkpoints, model runs, and context projections. Provider sessions are optional metadata on model runs or projections.

Alternative considered: use each provider's session id as the conversation id. Rejected because switching from Codex to Claude would fork context and make audit/replay provider-specific.

### Decision 2: ContextProjection is derived and provider-specific

`ContextProjection` records the exact context prepared for a provider/model pair, including selected message ids, summary checkpoint ids, reference ids, token budget, and rendered prompt text. It is a derived artifact from the ledger and can be regenerated.

Alternative considered: store only raw messages and rebuild prompt text at call time without persisting it. Rejected for first slice because debugging provider switches requires knowing what context was sent or would be sent.

### Decision 3: ModelRun records attempted execution without executing

`ModelRun` captures provider, model, executor endpoint, projection id, status, timestamps, and classified failure metadata. This gives the platform an auditable place to attach later Codex/Claude executor results without implementing the executor now.

Alternative considered: wait to add model runs until real provider execution exists. Rejected because model switching and audit semantics need a stable contract before execution adapters are added.

### Decision 4: Conversation context is separate from Handoff delivery

Tasks and reports still flow through Handoff Hub. Chat runtime can reference a handoff, delivery, task, or artifact, but it does not become the task state machine. This keeps Dev-to-QA handoff status independent from conversational discussion.

Alternative considered: add chat messages into delivery events. Rejected because delivery events are state-transition audit facts, while conversation messages are human/agent collaboration facts.

### Decision 5: Shared DatabaseModule replaces per-context DB ownership

Hub API currently keeps Postgres migration and pool setup under the handoff module. This change introduces a small shared database module so Handoff and Conversation bounded contexts can share one pool and one migration runner.

Alternative considered: instantiate the same DatabaseService in each module. Rejected because it would duplicate pools and migration runs.

### Decision 6: Web Console is read-first

The first Web Console slice shows the selected endpoint's conversation list/detail and context projection summary. Authoring a full chat composer and streaming transcript is deferred until executor behavior exists.

Alternative considered: build a complete chat UI now. Rejected because the core risk is continuity and ledger correctness, not visual composition.

## Risks / Trade-offs

- Ledger tables can become too broad -> Keep the first schema explicit and additive; split memory/embedding later when semantic recall is implemented.
- Persisted rendered prompts can contain sensitive data -> Reuse contract metadata secret checks, avoid storing secrets in metadata, and keep smoke data synthetic.
- Projection text can drift from ledger facts -> Store source ids and summary checkpoint ids with every projection so projection provenance is auditable.
- JSONB references defer relational modeling -> Accept for first slice because handoff/task/artifact reference shapes are still evolving.
- Web Console read-only slice may feel incomplete -> Explicitly mark composer/executor as next goal; do not fake execution.

## Migration Plan

1. Add shared contract schemas and tests for conversation ledger records and commands.
2. Add BDD and acceptance artifacts for ledger continuity and provider switch behavior.
3. Extract shared Hub `DatabaseModule` and keep existing Handoff tests green.
4. Add additive migration `005_platform_chat_runtime.sql` for conversations, messages, tool invocations, summary checkpoints, model runs, and context projections.
5. Add Conversation repository port, Postgres implementation, application service, and HTTP controller.
6. Add Web Console Hub operation and minimal read projection.
7. Run package tests/builds, architecture check, OpenSpec strict validation, diff check, and live smoke.

Rollback is additive: existing Handoff tables and endpoints keep working. If conversation tables are unused, clients can ignore them. No existing API contract is removed.

## Open Questions

- Whether provider/model administration should be a separate Hub module or remain executor metadata until real provider execution starts.
- Whether summary checkpoint generation should be human-triggered first or executor-triggered after each run.
- Whether long-term memory and semantic recall should live in Hub API or a local Connector-owned memory service.
