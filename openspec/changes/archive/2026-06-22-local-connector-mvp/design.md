# Design: local-connector-mvp

## Context

Goal 9.1 建立了 Handoff Hub 服务端基础闭环，Goal 9.2 固化了 v0.2 的治理门禁。当前仍缺的是本地岗位入口：任务虽然能在服务端投递，但还没有进入岗位人员本地 Codex 工作区。

Local Connector MVP 的本质不是替代 Codex/Claude，也不是自动控制本地 agent，而是把服务端 handoff 转成 agent-readable 本地文件，并把人工或 agent 产物回传到 Hub。

## Goals / Non-Goals

**Goals:**

- 提供 `apps/connector-cli` 可执行命令。
- 支持本地 `dev` / `qa` profile。
- 支持连接 Hub 并接收离线补发 delivery。
- 支持 SSE `listen --once`，收到事件后拉取 handoff 详情并写入 inbox。
- 支持 `inbox` 列出本地任务。
- 支持 `ack <delivery-id>` 回传确认。
- 支持 `report <handoff-id> <file>` 以 artifact 形式回传 QA 报告。
- 通过真实脚本验证 Dev -> QA -> local inbox -> ack/report 闭环。

**Non-Goals:**

- 不自动调用 Codex/Claude。
- 不做完整 daemon / launch agent。
- 不做 Electron UI。
- 不做多租户鉴权。
- 不做复杂任务状态机 UI。

## Decisions

### 1. Inbox 用普通文件目录

选择：connector 将任务写入 `.sartre/inbox/<handoff-id>/`。

理由：Codex、Claude、manual workflow 都能读取普通文件。文件目录也是最容易调试、diff、打包证据的形式。

替代方案：写 SQLite。放弃原因：MVP 阶段会增加本地 DB 迁移和调试成本，且不利于让不同 agent 直接读取。

### 2. Connector 使用 SDK，不 import hub internals

选择：扩展 `packages/sdk`，提供 register/connect/get/ack/report 基础方法。

理由：Web Console、Connector、Electron shell 都应该通过同一 SDK/contract 接入 Hub。直接 import `apps/hub-api/src/**` 会破坏服务端部署边界。

### 3. SSE 事件只做触发，详情通过 GET 拉取

选择：SSE 事件保持 lightweight delivery event，connector 收到 `handoff_id` 后用 `GET /handoffs/:id` 拉完整 handoff。

理由：避免把大 pack 放进 SSE；服务端只需要提供一个只读接口，兼容离线补发和未来 Web Console 详情页。

### 4. `listen --once` 是 MVP 的自动化入口

选择：先实现一次性监听，适合测试和用户手动运行。

理由：长期后台 daemon 需要进程生命周期、重连退避、系统通知和日志轮转，不适合这个 goal 一次做完。

## Data Layout

```text
.sartre/
  profiles/
    dev.json
    qa.json
  inbox/
    <handoff-id>/
      handoff.md
      pack.json
      delivery.json
      artifacts/
```

`handoff.md` 必须适合 agent 直接阅读：

```markdown
# <title>

From: developer / dev_user
To: qa / qa_user
Delivery: <delivery-id>

## Summary

...

## Instructions

Read pack.json and produce the requested report.
Ack with: pnpm --filter @sartre/connector-cli start -- ack <delivery-id>
Report with: pnpm --filter @sartre/connector-cli start -- report <handoff-id> <file>
```

## Risks / Trade-offs

- SSE 长连接测试容易挂住 → MVP 用 `--once` 和 timeout，收到一个事件后退出。
- Hub 需要新增 `GET /handoffs/:id` → 只读接口，scope 小；SDK 统一封装。
- 本地 inbox 可能重复写入 → 以 `handoff-id` 为幂等目录，重复接收覆盖同名 metadata。
- Artifact report 只登记文件 URL/checksum，不上传二进制 → MVP 足够验证 QA report 回传，后续可接 artifact store。

## Verification

- OpenSpec strict validate。
- Connector unit tests 覆盖 profile、inbox rendering、CLI parsing。
- Hub API test 覆盖 `GET /handoffs/:id`。
- Regression harness 启动 Hub 测试链路或通过 local demo script 验证 connector 写 inbox、ack、report。
- Architecture check 确认 connector 不 import hub internals。
