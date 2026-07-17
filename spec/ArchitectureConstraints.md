# 架构约束

## 1. 目标仓库边界

```text
apps/electron-app
apps/local-runtime
apps/hub-api
apps/hub-worker
packages/sdk
packages/contracts
packages/runtime-core
packages/domain
```

依赖方向：

```text
electron-app -> sdk -> contracts
local-runtime -> runtime-core -> sdk/contracts/domain
hub-api/hub-worker -> contracts/domain
sdk -> contracts
domain -> no framework dependency
```

禁止 app 之间源码互相 import，禁止 renderer 直接访问 Hub 或 Runtime，禁止 domain 依赖 Nest、TypeORM、HTTP、Electron 或文件系统。

## 2. Hub 约束

- Controller 只做认证、Zod 解析、action 声明和 Result 映射。
- Application Service 编排事务与 port，不直接设置领域 status。
- Repository 查询必须包含 Workspace Scope，不提供 tenant-owned `findById(id)`。
- State、DomainEvent 和 OutboxEvent 同事务写入。
- Worker 使用 claim/TTL/idempotency，不依赖进程内状态。
- Migration 独立执行，应用启动不自动修改生产 Schema。
- 新纵向链路必须传播 DiagnosticContext、稳定 errorCode 和 initiatedByUserId，并进入统一用户诊断 Projection。

## 3. 租户与身份

- Human、Endpoint、System actor 严格分离。
- Workspace Role、Project Access、Work Role 严格分离。
- tenant-owned table 强制 workspace_id 和 PostgreSQL RLS。
- 第一版 PostgreSQL required test 基线固定为 17.6；Migration、RLS、事务和恢复不得只在其他 minor 版本验证。
- 请求体中的 workspaceId、userId、actorId 不是授权来源。
- Workspace owner/admin 不自动获得 Project 原始内容权限。

## 4. Electron 与 Runtime

- BrowserWindow 必须启用 contextIsolation、sandbox、webSecurity，关闭 nodeIntegration。
- IPC 只暴露 contextBridge 具名方法；入参经 Zod 校验，统一 Result。
- Refresh Token 和 Endpoint Credential 不进入 renderer。
- Runtime 是 Electron 管理的 companion daemon，不是外部 Connector 产品。
- Runtime 写工具只在有效 ExecutionPlan、scope、Lease 和 fencingToken 下开放。
- 用户工作 Agent 第一版只使用 `@openai/codex-sdk`；一个 Runtime 服务承载多个 AgentRun，不按 Agent 启动独立服务。
- 共享 Agent 在调用者 Runtime 执行，不读取创建者的 Runtime、ProjectBinding、credential 或 provider session。
- 每个 Invocation 必须锁定 AgentDefinitionVersion、SkillDefinitionVersion、MCPDefinitionVersion 和 executionConfigHash；不允许运行中漂移。
- 公司网关 API Key 只保存在调用者 Runtime 的 OS 安全存储，通过单次 AgentRun 的隔离 ProviderProfile 注入；不进入 Hub、Renderer、全局环境变量或共享 Agent 定义。
- ProviderProfile baseUrl 必须为 HTTPS 且匹配公司网关 host allowlist；禁止 TLS bypass、非 allowlist redirect 和仓库级配置覆盖 provider auth。
- Codex 保持 read-only sandbox；文件写入、命令、Git 和 MCP 副作用只能经 Runtime 管理的 Sartre MCP/ToolBroker。
- Codex SDK 不拥有 Execution、Lease、权限、ContextSnapshot、Result 或 Audit 状态。
- Steward 使用确定性 Projector + 单次结构化推理，不运行通用工具型 Agent Loop。
- Steward 的主动检测和 `@Steward` 语义 Job 统一由 Hub Worker 使用平台专用 Service Credential；禁止使用或回退到 Session 创建者、mention 调用者或其他 Human 的个人 Key。Service Credential 只能从受管 Secret 注入，不得进入业务数据库、Renderer、日志或模型输出。
- 第一版工作 Agent 创建时允许 `gpt-5.5-2026-04-23`/`gpt-5.6-sol` 与 `medium/high` reasoning effort，默认 `gpt-5.5-2026-04-23 + high`；Steward 固定 `sa-quality-2026-03 + high`。required test 必须记录 requested/resolved model、reasoning effort、catalog digest 和 alias_of，不得只记录可漂移 alias。

## 5. 团队记录与确认语义

- Hub 的 Session Message ledger 和团队状态不依赖 provider session。
- 未共享文件、credential、本地路径和 Scratchpad 不进入其他 Agent Context。
- Steward、Inbox、需求分析和岗位任务视图只投影 Hub 权威状态表与 Confirmed Context，不维护第二份可编辑数据源。
- Confirmed Context 不可原地修改，使用 version/supersedes。

## 6. 禁止项

- 新旧领域双写。
- Phase/Dispatch/Delivery 等 legacy 模型进入目标仓库。
- 静默 catch、随机 Token usage、成功响应后补写核心事实。
- 用内存 Subject、sticky session 或单 Pod 作为正确性前提。
- 生产 remote renderer URL、明文 Secret、开发默认安全配置。
- 普通 Workspace 角色访问跨 Workspace 用户诊断，或诊断 CLI 直连生产数据库。
- PI/LangChain/其他 Agent Loop 包裹 Codex SDK，或让 Steward 自由循环调用工具。
- 将共享 Agent 解释为共享创建者 Runtime/credential，或在定义变更后静默执行旧/新混合版本。
