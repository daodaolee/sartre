# Goal 9.3: Local Connector MVP

## 背景

Goal 9.1 已完成 Handoff Hub 服务端基础闭环，Goal 9.2 已补齐 v0.2 governance gate。当前缺口是：服务端能投递任务，但岗位人员本地 Codex/Claude/manual 工作区还不能直接收到 agent-readable 文件。

本 goal 做 Local Connector MVP，让本机模拟 `Dev -> QA -> local inbox -> ack/report` 闭环。

## 目标

1. `apps/connector-cli` 成为可执行 CLI。
2. 支持 `dev` / `qa` 本地 profile。
3. 支持连接 Hub 并接收 pending delivery。
4. 支持 `listen qa --once` 监听一个 SSE event，拉取 handoff 详情并写入 inbox。
5. 支持 `.sartre/inbox/<handoff-id>/handoff.md`、`pack.json`、`delivery.json`。
6. 支持 `ack <delivery-id>`。
7. 支持 `report <handoff-id> <file>` 回传 artifact。
8. 通过真实回归证明 Dev -> QA -> local inbox -> ack/report 闭环。

## 非目标

- 不自动调用真实 Codex/Claude。
- 不做 daemon / launch agent。
- 不做 Electron UI。
- 不做完整 Web Console。
- 不做复杂权限或真实多租户登录。
- 不提交、不推送、不发布。

## 约束

- Connector 只能通过 `packages/sdk` / `packages/contracts` 访问 Hub。
- Connector 不得 import `apps/hub-api/src/**`。
- 本地 inbox 使用普通文件，便于 Codex/Claude/manual 读取。
- `handoff.md` 必须是 agent-readable。
- 回归必须真实执行，不得把 BDD 文档登记伪装成通过。

## 执行范围

允许新增或修改：

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

非必要不修改：

- runtime packaging shell
- non-candidate native app paths
- unrelated legacy implementation paths

## 验证门禁

完成前必须 fresh 执行：

```bash
pnpm exec openspec validate local-connector-mvp --type change --strict --no-interactive
CHANGE_NAME=local-connector-mvp pnpm harness:regression
pnpm run architecture:check
git diff --check -- <local-connector scoped paths>
```

## 完成标准

- OpenSpec / BDD / acceptance / PLAN_LEDGER 完整。
- Connector CLI 命令可执行。
- 本地 inbox 能生成 agent-readable handoff。
- ack/report 能回传到 Hub。
- regression harness 通过并生成报告。
