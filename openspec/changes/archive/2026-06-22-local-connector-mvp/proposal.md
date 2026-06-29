# Proposal: local-connector-mvp

## Why

Handoff Hub 已经能在服务端完成投递、离线补发、ack 和 artifact 回传，但目前主要靠 `hub:demo:local` 脚本证明。下一步需要一个本地 Local Connector，让岗位人员自己的 Codex/Claude/manual 工作区能真正接收 agent-readable handoff 文件，并把 ack/report 回传到服务端。

## What Changes

- 将 `apps/connector-cli` 从 profile skeleton 扩展为可执行 CLI。
- 支持本地 profile：`dev_user` / `qa_user`，默认租户 `local-demo`。
- 支持连接 Handoff Hub：
  - 注册 agent endpoint
  - 连接并接收 pending delivery
  - 监听 SSE delivery event
- 支持本地 inbox：
  - `.sartre/inbox/<handoff-id>/handoff.md`
  - `.sartre/inbox/<handoff-id>/pack.json`
  - `.sartre/inbox/<handoff-id>/delivery.json`
- 支持命令：
  - `profile <dev|qa>`
  - `connect <dev|qa>`
  - `listen <dev|qa> --once`
  - `inbox`
  - `ack <delivery-id>`
  - `report <handoff-id> <file>`
- 补齐 SDK/API 边界，不让 connector import `apps/hub-api/src/**`。
- 补齐真实回归入口：`CHANGE_NAME=local-connector-mvp pnpm harness:regression`。

## Capabilities

### New Capabilities

- `local-connector`: 本地岗位 connector CLI，可接收 Handoff Hub delivery，写入 agent-readable inbox，并回传 ack/report。

### Modified Capabilities

- 无。当前 OpenSpec 主规格尚未归档，Handoff Hub 服务端接口只做最小只读扩展以支持 connector 拉取 handoff 详情。

## Impact

- `apps/connector-cli/**`
- `packages/sdk/**`
- `packages/contracts/**`
- `apps/hub-api/src/modules/handoff/**`
- `scripts/harness-regression.sh`
- `openspec/changes/local-connector-mvp/**`
- `bdd/features/local-connector-mvp.md`
- `acceptance/checklists/local-connector-mvp.md`
- `reports/local-connector-mvp/**`
- `plan/local-connector-mvp-goal.md`
