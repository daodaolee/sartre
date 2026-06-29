# 架构总览

Sartre 当前采用 TypeScript monorepo。核心结构是 Hub 事实源、Web Console 操作面、Local Connector 本地执行面，以及共享 domain/contracts/sdk/connector-core 包。

## 运行拓扑

```text
Browser
  apps/web-console
      |
      v
packages/sdk + packages/contracts
      |
      v
apps/hub-api  <---- PostgreSQL
      |
      | REST / SSE
      v
apps/connector-cli
      |
      v
packages/connector-core
      |
      v
Codex CLI / fake executor / manual prompt
```

## 包边界

```text
packages/domain
  Delivery / TaskHandoff / HandoffPack / errors / state machines

packages/contracts
  Zod schemas, request/response contracts, lifecycle event schemas

packages/sdk
  Hub HTTP client used by Web Console and Connector

packages/connector-core
  local inbox, replay cursor, health probe, executor adapter, role capability loading

apps/hub-api
  NestJS application, PostgreSQL repository, REST controllers, SSE stream

apps/web-console
  React UI, task board, detail panel, creation flow, role switching, settings, capability pages

apps/connector-cli
  CLI wrapper around connector-core
```

## 依赖规则

- `packages/domain` 不依赖任何 app、HTTP、Nest、DB、React 或 Connector。
- `packages/contracts` 可以依赖 `zod`，不得依赖 app 内部实现。
- `packages/sdk` 只依赖 contracts 和 fetch 边界，不 import Hub 内部代码。
- `apps/web-console` 只能通过 SDK/contract 访问 Hub。
- `apps/connector-cli` 只能通过 connector-core/SDK 访问 Hub。
- `apps/hub-api` 可以依赖 domain/contracts/sdk 类型，但不被任何 app 反向 import。

## 服务端分层

```text
interfaces/http       Controller, DTO parsing, exception filter
interfaces/stream     SSE event stream
application           Use case orchestration and transaction boundaries
ports                 Repository abstractions
infrastructure        PostgreSQL, migrations, SSE service
domain package        Pure aggregate/state machine rules
```

## 数据与状态

PostgreSQL 是服务端事实源。主要事实类型：

- agent endpoints
- handoffs
- deliveries
- artifacts
- lifecycle events
- conversations
- messages
- model runs
- context projections
- health reports

Delivery 状态机由 `packages/domain` 约束，Hub repository 只负责持久化与重放。

## Web Console 信息架构

当前保留三个主区域：

- 工作区：收件箱、会话。
- 能力：Agent、模型、Hooks、Skills。
- 设置：引导、权限模式、连接、重放。

任务面板按当前 endpoint 视角计算：

- 已发送：当前岗位发出的 delivery/result。
- 已接收：当前岗位收到并需要处理的 delivery。
- 已结束：关闭、失败、过期或完成的任务。

## Connector 执行模型

Connector 的职责是把 Hub delivery 转换为本地 Agent 可消费上下文，并把执行结果写回 Hub。

默认策略：

- `manual_confirm`：用户确认后放行。
- `fake`：测试用确定性 executor。
- `codex_cli`：当前真实执行器边界。

Connector 不负责：

- 托管 provider 长会话。
- 替用户做无确认的高风险写操作。
- 解析所有岗位业务 payload。

## 当前启动与验证

```bash
pnpm run hub:dev
pnpm run web:dev
pnpm run web:smoke:hub
CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression
```

当前验收候选证据在：

```text
reports/lane-a-service-baseline/regression/latest.md
reports/lane-a-service-baseline/screenshots/
```
