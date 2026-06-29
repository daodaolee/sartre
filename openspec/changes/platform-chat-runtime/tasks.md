## 1. G1 Change Skeleton and Scenarios

- [x] 1.1 Add BDD scenarios and acceptance checklist for provider-neutral conversation continuity.
- [x] 1.2 Add PLAN_LEDGER checkpoint structure for the platform chat runtime goal.

## 2. G2 Contract Foundation

- [x] 2.1 Add failing contract tests for `ConversationLedger`, messages, references, tool invocations, summary checkpoints, model runs, and context projections.
- [x] 2.2 Implement shared contract schemas and exported types in `packages/contracts`.
- [x] 2.3 Update SDK tests and helpers so chat runtime commands parse and round-trip.

## 3. G3 Hub API Persistence

- [x] 3.1 Add failing Hub API tests for conversation creation, ordered message append, model run audit, and context projection detail.
- [x] 3.2 Extract a shared Hub database module while keeping existing Handoff tests green.
- [x] 3.3 Add additive Postgres migration for platform chat runtime tables.
- [x] 3.4 Implement Conversation repository, application service, and HTTP controller.

## 4. G4 Web Console Projection

- [x] 4.1 Add failing Web Console tests for endpoint-scoped conversation list/detail and provider projection summary.
- [x] 4.2 Implement Hub operations and UI mapping for read-only conversation ledger projection.
- [x] 4.3 Keep composer/executor UI out of scope until a real executor goal exists.

## 5. G5 Verification and Closeout

- [x] 5.1 Run contracts, SDK, hub-api, and web-console tests.
- [x] 5.2 Run build, architecture check, OpenSpec strict validation, and `git diff --check`.
- [x] 5.3 Run live Hub/Postgres smoke for conversation creation, message append, projection creation, and endpoint-scoped read.
- [x] 5.4 Record remaining limitations and next-goal candidates for provider gateway, local Codex executor, streaming UI, and memory recall.
