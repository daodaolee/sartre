# Handoff Hub Service Hardening Plan Ledger

## Current Gate

- Active step: complete
- Last completed checkpoint: `reports/handoff-hub-service-hardening/checkpoints/02-final-closeout-20260623T070811Z.md`
- Blockers: none
- Changed assumptions: service hardening is a separate server goal and must finish before Web Console user-operation integration.
- Next step: start a separate Web Console user-operation integration goal.

## Plan Index

| ID | Step | Status | Depends On | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 01 | governance | DONE | - | OpenSpec/BDD/acceptance/goal/ledger files | Established service hardening scope |
| 02 | test-first | DONE | 01 | Hub API/contracts/SDK failing tests were added before implementation | Red tests for errors, migration, replay, fixture |
| 03 | migration-path | DONE | 02 | `migrations.ts`, `001_handoff_hub_foundation.sql`, `002_delivery_events_replay_index.sql`, Hub API tests | SQL migrations and runner |
| 04 | error-mapping | DONE | 03 | `handoff-http-exception.filter.ts`, Hub API E2E 400/404 assertions | HTTP error envelope and filters |
| 05 | replay-fixtures | DONE | 04 | replay contracts/SDK/API tests, `local-demo.fixture.ts` | Replay API/SDK and local fixture |
| 06 | verification | DONE | 05 | `reports/handoff-hub-service-hardening/regression/20260623T070943Z-regression-report.md` | scoped regression and build gates |
| 07 | closeout | DONE | 06 | `reports/handoff-hub-service-hardening/checkpoints/02-final-closeout-20260623T070811Z.md` | acceptance + checkpoint |

## Cross-Step Contracts

- Error envelope: `schema_version: "1.0"`, `error.category`, `error.message`.
- Replay: tenant scoped, endpoint scoped, cursor filtered.
- Storage: SQL migration files are the service schema source for Hub tables.
- Fixture: `local-demo`, `dev_user`, `qa_user`, local Codex endpoints.
- Boundary: SDK/contracts for clients; no Web import from Hub internals.

## Changed Assumptions

| Date | Assumption | Change | Affected Steps | Action |
| --- | --- | --- | --- | --- |
| 2026-06-23 | Web operations can be built directly on current service | Service contracts need hardening first | 02-07 | Add service reliability change before UI operations |

## Final Delivery Gate

- [x] All required steps are `DONE` or explicitly `SUPERSEDED`.
- [x] No unresolved `BLOCKED` steps.
- [x] No unresolved `CHANGED` assumptions.
- [x] Latest regression report is referenced.
- [x] Acceptance checklist is updated.
