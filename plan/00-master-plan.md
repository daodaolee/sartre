# Master Plan

## 北极星

Sartre 当前目标是内部岗位协同工具：

> 一个岗位的工作结果，可以可靠变成另一个岗位的 Agent 可执行上下文，并且全过程可确认、可回传、可诊断、可恢复。

当前首版聚焦本地可用闭环。

## 当前模块

| ID | 模块 | 路径 | 职责 |
| --- | --- | --- | --- |
| M01 | Domain | `packages/domain` | 领域模型、Delivery 状态机、不变量、领域错误。 |
| M02 | Contracts | `packages/contracts` | API schema、DTO、event type、contract tests。 |
| M03 | SDK | `packages/sdk` | Hub client，供 Web Console 和 Connector 使用。 |
| M04 | Hub API | `apps/hub-api` | NestJS 服务端、PostgreSQL、REST/SSE、审计、conversation。 |
| M05 | Web Console | `apps/web-console` | 岗位切换、任务看板、创建、详情、回传、设置、能力页。 |
| M06 | Connector Core | `packages/connector-core` | inbox/replay/health/execution/role capability。 |
| M07 | Connector CLI | `apps/connector-cli` | 本地端点命令入口。 |
| M08 | Role Capabilities | `.agents/capabilities` | 从真实业务仓抽取的岗位能力包。 |
| M09 | Evidence Harness | `scripts`, `reports`, `openspec`, `bdd`, `acceptance` | 证据门禁与可恢复计划。 |

## 当前端到端路径

```text
Developer endpoint
  creates task with title / rich description / capability refs
      |
      v
Hub stores handoff + delivery + audit events
      |
      v
QA endpoint receives task after role switch or connector replay
      |
      v
QA user accepts / releases to Agent
      |
      v
Connector executes fake or Codex adapter and writes report_ready
      |
      v
QA sends result to Developer endpoint
      |
      v
Developer receives result and can continue or close
```

## 执行顺序

当前 9 个 goal 已完成为首版闭环：

1. 服务端事实源与 PostgreSQL/NestJS Hub 可运行。
2. Delivery 状态机、事件审计、离线重放可诊断。
3. Dev/QA 角色能力包、endpoint manifest、能力引用可用。
4. Provider-neutral conversation ledger、model run、context projection 可用。
5. Web Console 任务发布、收发、详情、回传闭环可用。
6. Local Connector inbox/replay/health 与本地端点恢复可用。
7. Codex executor adapter 与 connector execute 可执行并回写。
8. 聊天入口与能力上下文引用可用，支持后续 LLM 切换保留上下文。
9. UI polish、启动脚本、端到端真实验收与证据包。

后续新 goal 应在这个闭环上增量推进。

## 当前验收门禁

```bash
pnpm run web:smoke:hub
CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression
pnpm run architecture:check
```

`lane-a-service-baseline` 是当前产品候选。

## 范围纪律

当前焦点：**只做开发与质量两个岗位的协同闭环**。其他岗位（产品、算法等）在两岗位协同稳定后再逐步加入，不在首版承诺内。

允许：

- 扩展 AgentEndpoint、RoleCapabilityPack、Delivery lifecycle、Conversation ledger。
- 增加新的 provider adapter，但 canonical history 必须留在平台层。
- 增强 Web Console 的自然交互和诊断能力。

禁止：

- 将 PRD、repo、branch、commit range 等岗位专用字段固化为全局 delivery schema。
- 让 Web Console 直接 import Hub 内部实现。
- 把 Claude/Codex provider session 当成唯一事实记录。
- 跳过 evidence harness 直接宣称完成。
- 在两岗位协同跑通前，提前做脊柱 / 前置对齐 / 平台自学习沉淀等前置能力——协作先跑通，前置对齐留到之后。
