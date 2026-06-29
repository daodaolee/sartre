# PLAN LEDGER: v0.2 Handoff Hub Governance Gate

## Current Gate

- Active step: complete
- Last completed checkpoint: `02-governance-gate-closeout.md`
- Blockers:
  - Full repo historical gate 仍有旧问题，不能作为本 goal 的完成 gate。
- Changed assumptions:
  - 无。
- Next step: 进入下一个 v0.2 功能目标，优先 Web Console / Local Connector。

## Plan Index

| ID | Step | Status | Depends On | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 01 | openspec-change | DONE | - | `openspec/changes/v02-handoff-hub-governance-gate/**` | 4/4 artifacts complete |
| 02 | bdd-acceptance | DONE | 01 | `bdd/features/v02-handoff-hub-governance-gate.md`; `acceptance/checklists/v02-handoff-hub-governance-gate.md` | 初始 evidence matrix 已登记 |
| 03 | initial-checkpoint | DONE | 01,02 | `01-governance-chain-setup.md` | 记录当前约束链状态 |
| 04 | regression-harness | DONE | 01,02 | `scripts/harness-regression.sh` | 增加 v0.2 scoped harness 分支 |
| 05 | real-verification | DONE | 04 | `reports/v0.2-handoff-hub-governance-gate/regression/latest.md` | fresh run，Failures: 0 |
| 06 | final-closeout | DONE | 05 | `02-governance-gate-closeout.md`; `pnpm exec openspec validate v02-handoff-hub-governance-gate --type change --strict --no-interactive`; scoped `git diff --check` | 更新 checklist、BDD、ledger |

## Cross-Step Contracts

- OpenSpec capability: `handoff-governance-gate`
- BDD feature: `bdd/features/v02-handoff-hub-governance-gate.md`
- Acceptance: `acceptance/checklists/v02-handoff-hub-governance-gate.md`
- Harness entry: `CHANGE_NAME=v02-handoff-hub-governance-gate pnpm harness:regression`
- PostgreSQL default: `/Library/PostgreSQL/17/bin/psql`
- Dev DB: `postgresql://xy@localhost:55432/sartre_hub`
- Scope boundary: v0.2 service/shared/web-console/connector paths only; historical desktop/Tauri/spine issues are not current blockers.

## Changed Assumptions

| Date | Assumption | Change | Affected Steps | Action |
| --- | --- | --- | --- | --- |

## Final Delivery Gate

- [x] All required steps are `DONE` or explicitly `SUPERSEDED`.
- [x] No unresolved `BLOCKED` steps.
- [x] No unresolved `CHANGED` assumptions.
- [x] Latest regression report is referenced.
- [x] Acceptance checklist is updated from fresh verification.
- [x] BDD evidence statuses are not overstated.
