# Handoff Hub Service Hardening Goal

## Goal

Make Handoff Hub reliable enough for the next Web Console user-operation goal by adding migration, classified error responses, event replay, and stable local Dev/QA fixtures.

## Scope

- Migration path for current PostgreSQL schema.
- HTTP error mapping for domain/repository failures.
- Replay API and SDK support for persisted lifecycle events by cursor.
- Local demo fixture for Dev/QA identities.
- Tests, builds, lint, architecture check, and scoped harness.

## Non-Goals

- No Web Console production UI changes.
- No runtime packaging changes.
- No auth/multi-tenant UI.
- No scheduler/worker.
- No fixed role payload fields.

## Evidence Chain

- OpenSpec: `openspec/changes/handoff-hub-service-hardening/`
- BDD: `bdd/features/handoff-hub-service-hardening.md`
- Acceptance: `acceptance/checklists/handoff-hub-service-hardening.md`
- Ledger: `reports/handoff-hub-service-hardening/checkpoints/PLAN_LEDGER.md`
- Regression: `reports/handoff-hub-service-hardening/regression/latest.md`
