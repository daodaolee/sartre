# ADR-0004：工作 Agent 使用 Codex SDK，Steward 使用受限分析流程

- 状态：已接受，2026-07-17
- 相关：`spec/ProgramSpec.md`、`spec/LocalRuntimeSpec.md`、`spec/ExecutionArchitectureSpec.md`

## 背景

Sartre 本质上是在多人 IM 和正式会话账本上增加 Agent 工作能力。用户创建的工作 Agent 需要读取真实 Project、修改文件、执行命令、使用 Git/MCP，并受 ContextSnapshot、Human Approval、ProjectLease、scope 和 fencingToken 约束。

Steward 与 Session 同生命周期，负责维护锚、账、集，回答谁做了什么，并发现目标漂移、冲突、重复放弃方案和证据缺失。它不拥有项目施工责任。

候选方案包括：

1. Codex SDK 作为唯一 Coding Agent Engine。
2. Codex SDK 外再包 PI、LangChain 或自研通用 Agent Loop。
3. Steward 也运行完整 Coding Agent Loop。
4. Steward 使用确定性投影和单次结构化推理。

## 决策

### 用户工作 Agent

- 第一版只实现 `CodexAgentEngine`，通过 TypeScript `@openai/codex-sdk` 启动和控制本地 Codex thread。
- 每台设备的每个 OS 用户环境只运行一个 Local Runtime Node daemon，承载该 Human 的多个 AgentRun；AgentDefinition 创建时不启动独立服务或 Codex 进程。
- 首版不允许多 Human Account 并发共享同一 daemon；切换账号必须在 active AgentRun 停止并 reconciliation 后显式 reset/re-pair。
- 每次 AgentRun 使用隔离 Profile，只装配当前 Agent 获准的 instructions、ContextSnapshot、Skill、MCP、Project 和 CredentialRef。
- Codex 保持 read-only sandbox；文件写入、命令、Git 和其他 MCP 副作用只通过 Runtime 管理的 Sartre MCP/ToolBroker。
- ToolBroker 每次调用都重新检查 Execution、Lease、fencingToken、scope、capability 和 CredentialRef。
- Codex SDK/thread 只拥有模型推理、coding loop 和临时 provider state；Hub/Runtime 分别拥有团队状态和本地执行治理。

### Steward

- Steward 不是 AgentDefinition、AgentInvocation 或 Execution，不运行 `CodexAgentEngine`。
- Message、DomainEvent、Execution 和 Lease 先由确定性 Projector 更新 Timeline 与 Working Set。
- 只有目标漂移、冲突、决定、放弃项和证据语义等问题进入 `StructuredInferencePort` 单次调用。
- Worker 在推理前绑定 `StewardAnalysis.envelope` 的 scope、cursor 和 inputDigest；模型只能返回经 Zod 校验的 content。
- 推理结果只能创建 Suggested Finding/Context。
- 用户 mention Steward 时先执行确定性 Query，再可选调用一次模型组织表达。
- 主动检测和用户 mention Steward 的语义调用统一使用平台专用 Steward Service Credential；不使用 Session 创建者、mention 调用者或其他 Human 的个人 Key，也不自动回退到个人 Key。
- Service Credential 通过 Secret Manager/Kubernetes Secret 注入 Hub Worker，不进入业务数据库、Renderer、日志、模型输出或会话消息；usage 归属系统并关联 workspaceId、sessionId 和 analysisId。
- 后续副作用插件使用 `detect -> propose -> human confirm -> execute -> audit` 显式 Workflow，不允许自由工具循环。

### 第一版不采用

- PI Agent Harness。
- LangChain 或其他通用 Agent 框架。
- 通用多 Provider Agent Loop。
- 第二个 Coding Agent Engine。
- Steward 的 `while(model requests tools)` 自由循环。
- legacy `codex exec` 临时空目录执行链。

## 理由

1. Codex SDK 已提供 coding-focused thread 和 Agent Loop，再叠加 Agent 框架会重复 session、tool-call、取消、重试、context compaction 和错误状态。
2. Sartre 的差异化价值是多人共享记录、Context、权限、Lease、恢复和审计，不是重新实现 Coding Agent Loop。
3. read-only Codex + Runtime ToolBroker 能防止模型通过原生 shell/file 能力绕过已批准 scope。
4. Steward 的机械检测可以确定性完成；语义检测只需受限结构化推理。完整 Agent Loop 增加成本、不可预测性和副作用风险。
5. provider session 不是 canonical history。每次恢复都必须从 Hub Session、ContextSnapshot、ExecutionCheckpoint 和当前文件状态重建。
6. Steward 生命周期属于 Session/Workspace，而不是 Session 创建者；使用 Human Key 会造成离职、退出、轮换、费用归属和主动 Job 无调用者时的错误耦合。

## 影响

- `apps/local-runtime` 需要 CodexAgentEngine、隔离 Profile、Sartre MCP/ToolBroker 和 Codex event adapter。
- `apps/hub-worker` 需要 Steward Projector、幂等语义分析 Job、StructuredInferencePort 和 Zod StewardAnalysis。
- 生产环境需要独立 Steward 服务账号、受管 Secret 注入、轮换、网关限流和系统 usage 诊断；凭据不可用时语义 Job degraded，不回退到 Human Key。
- `packages/contracts` 需要稳定的 AgentRunEvent、StewardAnalysis 和错误合同，但不复制 Codex 私有协议。
- Architecture Check 拒绝 PI/LangChain/第二套 Agent Loop 进入第一版依赖图。
- Steward 模型不可用时，Timeline、Working Set、机械检测和人工协作继续工作；仅语义 Finding degraded。

## 重新评估条件

仅在以下条件之一有真实证据时重新评估：

- 明确需要 Codex 无法支持的模型 Provider。
- Codex SDK 缺少完成已确认工作流所必需的取消、事件、工具或恢复能力，且 adapter 无法弥补。
- Steward 出现无法通过确定性 Workflow、Query 和单次结构化推理完成的真实用例。

“其他框架功能更多”“未来可能多模型”或“开源项目都在用”不构成重新评估理由。
