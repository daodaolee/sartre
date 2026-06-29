# AGENTS.md

> 本文件为在本仓库工作的 AI 助手提供根级协作指引。
>
> 项目：Sartre（萨特）— AI Native 岗位协同平台。
> 当前主线：服务端 Hub + Web Console + Local Connector + role capability + conversation ledger。

## 核心理念

- 简洁至上：避免过度工程化，优先保住端到端可用链路。
- 第一性原理：从岗位协同问题出发，保持架构选择服务目标。
- 事实为本：以代码、测试、报告、真实服务状态为准。
- 渐进式开发：每个 goal 都要有可验证结果。
- 中文沟通：面向用户的回复、任务清单和报告摘要使用中文。

## 必读优先级

1. `README.md`
2. `docs/00-domain-model.md`
3. `docs/01-architecture-overview.md`
4. `spec/` 下全部项目宪法
5. `workflow/` 下工作流与证据规则
6. `openspec/changes/` 与 `openspec/specs/`
7. `plan/00-master-plan.md` 与当前 goal 文件
8. 实际代码

冲突裁决顺序：`spec/` 项目宪法 > `workflow/` 证据规则 > `plan/` 当前计划 > `docs/` 描述性设计 > 代码注释。

## 当前架构边界

- `packages/domain`：纯领域模型、状态机和不变量，不依赖 Nest、DB、HTTP、Web、Connector。
- `packages/contracts`：跨 app 的 DTO/schema/API contract。
- `packages/sdk`：Web Console 和 Connector 调用 Hub 的唯一 SDK 边界。
- `packages/connector-core`：Connector inbox、health、execution、role capability 逻辑。
- `apps/hub-api`：NestJS + PostgreSQL + SSE/REST，负责事实源、审计、conversation、role capability API。
- `apps/web-console`：用户操作界面，不直接 import `apps/hub-api/src/**`。
- `apps/connector-cli`：本地端点接入和执行入口。
- `.agents/capabilities`：从真实业务仓抽取的岗位能力包。

## 当前验证入口

```bash
pnpm run web:smoke:hub
CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression
pnpm run architecture:check
```

不得把未执行的测试、环境验收或人工验收写成已通过。报告证据等级遵循 `workflow/harness-sop.md`。

## 版本控制约定

- 默认不主动 commit / push。
- 提交信息使用中文。
- 不回滚用户的无关改动。
- 工作区可能很脏，只处理当前 goal 相关文件。
- 用户明确要求发布时，再使用项目发布脚本或用户指定路径。

## UI 与前端约束

- React 代码遵循 Vercel/Geist 风格和 `spec/UISpec.md`。
- 工作台界面要服务重复操作，不做营销页。
- message、tooltip、popover、modal 只在降低理解成本时使用。
- 创建任务、查看详情、放行、回传、结束等高频动作必须符合人的自然操作路径。

## 当前约束

- 不把某岗位的业务 payload 固定成全局结构。
- 不把 Codex/Claude 的 provider session 当成 canonical history；canonical history 在 conversation ledger。
- 不让 Web Console 绕过 SDK 直接访问 Hub 内部实现。

## 重要索引

- 项目总览：`README.md`
- 领域模型：`docs/00-domain-model.md`
- 架构事实：`docs/01-architecture-overview.md`
- 主计划：`plan/00-master-plan.md`
- 当前验收证据：`reports/lane-a-service-baseline/regression/latest.md`
