# PLAN LEDGER: local-connector-mvp

## Current Gate

- Active step: complete
- Last completed checkpoint: `02-final-closeout.md`
- Blockers:
  - 无。
- Changed assumptions:
  - 无。
- Next step: 等待用户决定是否 archive OpenSpec change 或进入下一个 goal。

## Plan Index

| ID | Step | Status | Depends On | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 01 | openspec-change | DONE | - | `openspec/changes/local-connector-mvp/**` | 4/4 artifacts complete |
| 02 | bdd-acceptance | DONE | 01 | `bdd/features/local-connector-mvp.md`; `acceptance/checklists/local-connector-mvp.md` | 初始为 SCENARIO_REGISTERED |
| 03 | initial-checkpoint | DONE | 01,02 | `01-governance-setup.md` | 记录初始约束链 |
| 04 | hub-sdk-boundary | DONE | 01,02 | `pnpm --filter @sartre/sdk test`; `pnpm run hub:test` | SDK register/connect/get/ack/report 与 hub detail endpoint 已通过 |
| 05 | connector-cli | DONE | 04 | `pnpm --filter @sartre/connector-cli test`; `pnpm --filter @sartre/connector-cli build` | profile/connect/listen/inbox/ack/report 已实现 |
| 06 | regression-harness | DONE | 05 | `reports/local-connector-mvp/regression/20260622T111457Z-regression-report.md` | harness 0 failures |
| 07 | final-closeout | DONE | 06 | `bdd/features/local-connector-mvp.md`; `acceptance/checklists/local-connector-mvp.md`; `02-final-closeout.md` | BDD/acceptance/ledger 已从真实输出更新 |

## Cross-Step Contracts

- Change: `local-connector-mvp`
- CLI package: `apps/connector-cli`
- SDK package: `packages/sdk`
- Hub API package: `apps/hub-api`
- Local inbox root default: `.sartre/inbox`
- Connector must not import `apps/hub-api/src/**`.

## Changed Assumptions

| Date | Assumption | Change | Affected Steps | Action |
| --- | --- | --- | --- | --- |

## Final Delivery Gate

- [x] All required steps are `DONE` or explicitly `SUPERSEDED`.
- [x] No unresolved `BLOCKED` steps.
- [x] No unresolved `CHANGED` assumptions.
- [x] Latest regression report is referenced.
- [x] BDD evidence statuses are updated from real commands.
- [x] Acceptance checklist is updated from real commands.
