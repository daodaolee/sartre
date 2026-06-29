# Sartre

Sartre 是一个面向公司内部岗位协同的 AI Native 工作台，用来把开发、质量等岗位之间的工作交接变成可投递、可确认、可执行、可回传、可审计的事实链。

## 当前产品边界

当前主线是本地可运行的岗位协同闭环：

```text
Web Console
  -> Handoff Hub (NestJS + PostgreSQL)
  -> Local Connector
  -> Codex executor adapter / manual_confirm
  -> report / result sent back
  -> conversation ledger + audit timeline
```

核心问题：

- 开发把任务、改动背景和能力引用发送给质量岗位的某个 Agent。
- 质量切换到自己的身份后能收到任务、查看详情、放行给 Agent、写回传或结束任务。
- 结果回传后，开发身份能收到状态变化和报告上下文。
- 聊天、任务、模型运行、能力引用都落到平台自己的 conversation ledger，后续切换 LLM provider 时上下文不丢失。

## Monorepo 结构

```text
apps/
  hub-api/          NestJS Hub，负责投递、审计、conversation、role capability API
  web-console/      岗位协同 Web 控制台
  connector-cli/    本地 Connector CLI

packages/
  domain/           纯领域模型、状态机、不变量
  contracts/        DTO / zod schema / API contract
  sdk/              Web 和 Connector 使用的 Hub SDK
  connector-core/   Connector inbox、health、execution、role capability 逻辑

.agents/
  capabilities/     从真实业务仓抽取的岗位能力包

docs/               当前领域与架构事实
spec/               项目宪法和硬约束
workflow/           OpenSpec、证据等级、长计划 SOP
openspec/           当前能力变更事实
reports/            当前 goal 证据包
```

## 快速启动

前置：PostgreSQL 17 已可用。本地默认开发库可用脚本管理。

```bash
pnpm install
pnpm run pg:dev:status

pnpm run hub:dev
pnpm run web:dev
```

默认访问：

- Web Console: http://localhost:5173
- Hub API: http://localhost:3000

常用验证：

```bash
pnpm run web:smoke:hub
CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression
pnpm run architecture:check
```

`pnpm run harness:regression` 默认也会跑 `lane-a-service-baseline`。

## 当前验收信号

当前首版以 `lane-a-service-baseline` 为验收候选：

- Dev / QA 双身份可切换。
- Agent、Hooks、Skills、Models、Settings 按当前身份展示。
- 创建任务支持富文本描述和 `@` 能力引用。
- 任务按当前岗位展示为已发送、已接收、已结束。
- 任务详情包含收发方、状态、conversation、runtime binding、时间线、人工放行、人工回传和结束入口。
- Connector smoke 覆盖 Dev -> QA -> fake Codex -> report_ready -> result sent to Dev。

最新证据锚点：

- `reports/lane-a-service-baseline/regression/latest.md`
- `reports/lane-a-service-baseline/screenshots/`

## 设计原则

- 事实源在 Hub，岗位本地工具通过 Connector 接入。
- 领域规则放 `packages/domain`，跨边界契约放 `packages/contracts`，外部调用走 `packages/sdk`。
- Web Console 不直接 import Hub 内部代码。
- Connector 不替代 Codex、Claude、MCP、hook、plugin、command，只把 Hub 事件转换为本地 Agent 可消费上下文并写回审计事实。

## License

Private - Internal Use Only
