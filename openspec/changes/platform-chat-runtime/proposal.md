## Why

Sartre needs an in-platform chat/runtime boundary so role Agents can discuss work, invoke task capabilities, and later switch between Codex, Claude, and other LLM providers without losing context. Provider-owned sessions are not a durable source of truth; context continuity must come from a Sartre-owned conversation ledger.

## What Changes

- Add a model-neutral conversation ledger contract for conversations, messages, tool invocations, handoff/task/artifact references, summary checkpoints, model runs, and provider-specific context projections.
- Add Hub API persistence and HTTP endpoints for creating conversations, appending messages, recording tool/model artifacts, and reading conversation detail.
- Add a minimal Web Console projection so the current endpoint can inspect its conversation ledger and provider context projections.
- Reference `/Users/xy/xykj/superagentai` only as prior art for session messages, memory recall, summary refresh, provider/model administration, and projection separation; do not bind Sartre continuity to provider-specific session ids.
- Keep real Codex/Claude execution, streaming model responses, and provider gateway routing out of this first slice.

## Capabilities

### New Capabilities

- `platform-chat-runtime`: Defines the durable, provider-neutral chat runtime ledger and its Hub/Web projection behavior.

### Modified Capabilities

- None.

## Impact

- Contracts: new versioned schemas and exported types in `packages/contracts`.
- Hub API: new conversation bounded context, shared database module, additive Postgres migration, repository port, application service, and HTTP controller.
- Web Console: minimal conversation ledger projection and tests, reusing existing endpoint selection and Hub operations style.
- Agent capability model: no requirement changes; executor bindings remain endpoint metadata, and future executors can consume chat runtime projections as a separate capability.
- OpenSpec/BDD/Acceptance/Reports: new change artifacts, scenario registration, acceptance checklist, and verification closeout.
- No breaking API change to existing Handoff Hub endpoints.
