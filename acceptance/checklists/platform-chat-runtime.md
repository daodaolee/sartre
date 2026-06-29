# Acceptance Checklist: Platform Chat Runtime

## Contract

- [x] Contracts expose versioned schemas for conversations, messages, references, tool invocations, summary checkpoints, model runs, and context projections.
- [x] Contracts reject metadata containing secret-like keys or values.
- [x] Provider/model data is metadata on model runs or projections, not the canonical conversation identity.

## Hub API

- [x] Hub can create a conversation ledger for a tenant and endpoint.
- [x] Hub appends messages with stable per-conversation sequence numbers.
- [x] Hub records tool invocations, summary checkpoints, model runs, and context projections.
- [x] Hub reads conversation detail with ordered messages and projection provenance.
- [x] Endpoint-scoped list returns only visible conversations.

## Web Console

- [x] Web Console shows the selected endpoint's conversations.
- [x] Web Console detail shows ordered messages, references, summary checkpoints, model runs, and context projections.
- [x] Web Console does not present fake LLM execution or streaming controls in this slice.

## Evidence

- [x] Contract, SDK, Hub API, and Web Console tests pass.
- [x] Builds and architecture checks pass.
- [x] OpenSpec strict validation passes.
- [x] Live Hub/Postgres smoke confirms write/read/projection behavior.
