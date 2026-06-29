# Event Store and Delivery State Plan Ledger

## Current Gate

- Active step: complete
- Last completed checkpoint: reports/event-store-and-delivery-state/checkpoints/02-final-closeout-20260623T062658Z.md
- Blockers: none
- Changed assumptions: Delivery lifecycle facts are persisted in `delivery_events`; Web Console failed/expired rendering was already generic and needed coverage, not production UI changes.
- Next step: Ready for user acceptance or archive.

## Plan Index

| ID | Step | Status | Depends On | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 01 | governance-skeleton | DONE | - | OpenSpec/BDD/acceptance/goal/ledger files; OpenSpec validate | Create recoverable change shell |
| 02 | test-first | DONE | 01 | Red runs: domain/contracts/Hub API/SDK; Web coverage run | Web coverage was already green after assertion fix because renderer was generic |
| 03 | domain-contracts | DONE | 02 | `pnpm --filter @sartre/domain test`; `pnpm --filter @sartre/contracts test` | Delivery status machine and DTOs |
| 04 | hub-event-store | DONE | 03 | `pnpm --filter @sartre/hub-api test`; Hub API build | Postgres event store and command endpoints |
| 05 | sdk-web-consumer | DONE | 04 | `pnpm --filter @sartre/sdk test`; `pnpm --filter @sartre/web-console test` | SDK commands and Web overview rendering |
| 06 | verification | DONE | 05 | reports/event-store-and-delivery-state/regression/20260623T062918Z-regression-report.md | scoped regression and build gates |
| 07 | closeout | DONE | 06 | reports/event-store-and-delivery-state/checkpoints/02-final-closeout-20260623T062658Z.md | acceptance + checkpoint |

## Cross-Step Contracts

- Identity: tenant scoped by `tenant_id`, default `local-demo`.
- Traits/Contracts: delivery status and event DTOs in `@sartre/contracts`.
- Data/Storage: current state in `deliveries`; append-only lifecycle facts in `delivery_events`.
- External adapters: none.
- State machine: Delivery terminal states are `acknowledged`, `failed`, `expired`.
- Diagnostics: tests plus scoped harness regression.

## Changed Assumptions

| Date | Assumption | Change | Affected Steps | Action |
| --- | --- | --- | --- | --- |
| 2026-06-23 | Overview timeline can be derived from current rows | Timeline must read persisted lifecycle facts | 02-07 | Add event table, tests, and overview query update |

## Final Delivery Gate

- [x] All required steps are `DONE` or explicitly `SUPERSEDED`.
- [x] No unresolved `BLOCKED` steps.
- [x] No unresolved `CHANGED` assumptions.
- [x] Latest regression report is referenced.
- [x] Acceptance checklist is updated.
