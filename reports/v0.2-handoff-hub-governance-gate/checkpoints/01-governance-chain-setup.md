# Checkpoint: 01 Governance Chain Setup

- 时间：2026-06-22
- change-name：`v02-handoff-hub-governance-gate`
- 范围：为 v0.2 Handoff Hub 补齐 OpenSpec / BDD / acceptance / PLAN_LEDGER 初始约束链
- 结果：`READY_FOR_REGRESSION_HARNESS`

## 已完成

- 创建 OpenSpec change：`openspec/changes/v02-handoff-hub-governance-gate/`
- 创建 capability spec：`handoff-governance-gate`
- 创建 goal 文档：`plan/v0.2-handoff-hub-governance-gate-goal.md`
- 创建 BDD feature：`bdd/features/v02-handoff-hub-governance-gate.md`
- 创建 acceptance checklist：`acceptance/checklists/v02-handoff-hub-governance-gate.md`
- 创建 PLAN_LEDGER：`reports/v0.2-handoff-hub-governance-gate/checkpoints/PLAN_LEDGER.md`

## OpenSpec Evidence

```text
pnpm exec openspec status --change v02-handoff-hub-governance-gate

Progress: 4/4 artifacts complete
[x] proposal
[x] design
[x] specs
[x] tasks
```

## 关键决策

- 本 goal 不做新业务功能，只补 v0.2 新主线治理门禁。
- full repo historical lint/build/diff blocker 不作为 v0.2 scoped gate 的失败。
- 后续 Web Console / Connector goal 必须继承本 goal 的 evidence chain。

## 下一步

实现 `CHANGE_NAME=v02-handoff-hub-governance-gate pnpm harness:regression`，让它真实执行 v0.2 scoped checks。
