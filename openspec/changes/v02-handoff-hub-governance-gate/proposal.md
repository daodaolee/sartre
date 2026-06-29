# Proposal: v02-handoff-hub-governance-gate

## Why

v0.2 Handoff Hub 服务端基础闭环已经有代码、测试和 checkpoint，但还没有纳入当前仓库既有的 OpenSpec / BDD / acceptance / PLAN_LEDGER 约束链。继续推进 Web Console 或 Connector 前，必须先把新主线的行为期望和真实检查门禁固化，否则后续目标会在文档事实、测试事实和验收事实之间漂移。

## What Changes

- 新增 v0.2 Handoff Hub governance gate change，用于约束后续所有 v0.2 服务端、Web Console、Connector、Electron shell 目标。
- 补齐 v0.2 Handoff Hub 的 BDD feature，覆盖 Dev -> QA -> Dev、离线补发、ack、artifact、架构边界和 current candidate boundary 隔离。
- 补齐 v0.2 Handoff Hub 的 acceptance checklist，要求每个后续目标在完成前写明 `REAL_TEST` / `STRUCTURAL_CHECK` / `SKIPPED` / `MANUAL_REQUIRED`。
- 固化 v0.2 scoped regression 入口，真实执行 PostgreSQL 17 连通、domain/contracts/sdk/hub 测试、架构检查、lint、构建、demo、secret scan 和 scoped diff check。
- 新增 Goal 9.2 文档和 checkpoint ledger，记录为什么先补治理门禁，再继续做 Web Console / Connector。
- 不把非候选路径的遗留 lint/build 问题混入当前候选 gate。

## Capabilities

### New Capabilities

- `handoff-governance-gate`: 约束后续目标必须具备 OpenSpec、BDD、acceptance、PLAN_LEDGER、真实回归和 scoped boundary 说明。

### Modified Capabilities

- 无。当前 `openspec/specs/` 尚无已归档主规格，本 change 只新增 v0.2 governance gate 能力。

## Impact

- 新增 `openspec/changes/v02-handoff-hub-governance-gate/**`。
- 新增 `bdd/features/v02-handoff-hub-governance-gate.md`。
- 新增 `acceptance/checklists/v02-handoff-hub-governance-gate.md`。
- 新增 `plan/v0.2-handoff-hub-governance-gate-goal.md`。
- 新增 `reports/v0.2-handoff-hub-governance-gate/checkpoints/**`。
- 更新 `scripts/harness-regression.sh`，让 `CHANGE_NAME=v02-handoff-hub-governance-gate pnpm harness:regression` 执行真实 v0.2 scoped gate。
- 可能更新 `package.json` 增加更明确的 v0.2 回归入口。
