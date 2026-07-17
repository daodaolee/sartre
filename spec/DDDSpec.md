# Domain-Driven Design 规范

## 1. 通用语言

- Workspace：公司内部协作租户。
- Requirement：需求完整生命周期容器，UI 显示“需求”。
- Goal Contract：需求共识 Markdown。
- AlignmentBaseline：被 requiredAligners 确认的 Goal Contract 版本。
- Session：Hub 持久化的一段正式对话记录，UI 显示“会话”；消息被记录不代表其自然语言主张已经确认。
- Steward：与 Session 同生命周期的管家。
- CodexAgentEngine：Local Runtime 中工作 Agent 的唯一首版执行引擎。
- StewardPipeline：Hub Worker 中的确定性投影与受限结构化推理流程，不是 AgentDefinition 或 Execution。
- AgentDefinitionVersion：共享 Agent 一次不可变发布快照，包含 instructions、model policy、capabilities 和精确 Skill/MCP DefinitionVersion 引用。
- ProviderProfile：调用者 Runtime 本地的 Codex 公司网关配置；Hub 只知道脱敏 profile/credential ref，不保存 URL 中的敏感参数或 API Key 明文。
- Workstream：岗位责任线，UI 显示“岗位任务”。
- Project：团队共享的逻辑项目。
- LocalProjectBinding：Hub 对某用户、Endpoint 和逻辑 Project 绑定关系的记录；真实绝对路径只保存在 Runtime 本地 Registry。
- AgentInvocation：成员触发 Agent 的调用请求，锁定定义版本并路由到调用者当前 Endpoint。
- Execution：一次 Sartre Agent 运行。
- AgentRun：调用者 Local Runtime 对某个 Execution 的一次临时 Provider 尝试；用于运行隔离、序列和诊断，不是 Hub 业务聚合，也不自行决定 Execution 状态。
- ExecutionPlan：写入前必须确认的目标、Project 和范围。
- ProjectLease：逻辑 Project 的独占写授权。
- ContextEntry：带 type、authority、status、来源和版本的共享语义内容。
- ContextSnapshot：某次 Execution 的不可变上下文清单。
- AttentionItem：需要指定用户处理、由 Hub 唯一维护状态的业务动作。

Phase、Dispatch、WorkItem、TaskHandoff、Delivery、Memory 和 FailureRecord 是 legacy 术语，不得进入新领域模型。

## 2. 限界上下文

1. Identity & Access：User、AuthIdentity、UserSession、EndpointIdentity。
2. Workspace：Workspace、Membership、Invitation、ProjectAccess、WorkspacePolicy。
3. Requirement：Requirement、AlignmentBaseline、Workstream、RequirementChangeProposal。
4. Conversation：Folder、Session、Message、Attachment、Mention。
5. Agent Runtime：AgentDefinition、AgentInvocation、Execution、ExecutionPlan、ProjectLease、LocalProjectBinding。
6. Context & Steward：ContextEntry、Finding、ContextSnapshot、EvidenceRef、AttentionItem。
7. Platform Reliability：DomainEvent、OutboxEvent、AuditEvent、DeadLetterRecord、Projection。

上下文只能通过 `packages/contracts` 的 Command、DTO 和 EventEnvelope 交互，不能跨模块直接读写 repository。

## 3. 聚合规则

- Requirement 管理生命周期和当前 baselineVersion，不保存 Session 全量消息。
- AlignmentBaseline 绑定不可变 Goal Contract artifact、contentHash 和确认记录。
- Workstream 管理岗位责任和结果，不拥有 Project Lease。
- Session 管理单调 messageSeq；Steward 是投影参与者，不是隐藏会话。
- AgentDefinition 管理所有权和发布指针；AgentDefinitionVersion、SkillDefinitionVersion 和 MCPDefinitionVersion 发布后不可原地修改。
- AgentInvocation 锁定 agent/skill/mcp version id 和 executionConfigHash；定义更新不修改运行中的 Invocation。
- Execution 管理运行状态；ProjectLease 独立维护全局写互斥和 fencingToken。
- AttentionItem 是跨 UI 入口共享的动作事实，读取通知不能修改它。
- Codex thread 只属于当前 Execution 的 provider runtime state；Hub Session/Execution 才拥有团队历史和业务状态。
- 共享 Agent 的调用不路由到创建者 Runtime；每个调用者在自己 Endpoint 上使用自己的 LocalProjectBinding、ProviderProfile 和 CredentialRef。
- StewardPipeline 不创建自由运行的 AgentInvocation/Execution；确定性 Projector 先维护事实投影，结构化推理只能产生 suggested Finding。

聚合更新必须通过领域方法和 expectedVersion。Application Service 不得直接设置 status。

## 4. 记录与语义权威

Canonical Record 表示 Hub 对消息、事件和状态的唯一正式记录，不保证记录中的自然语言主张正确。ContextEntry 的语义权威按以下顺序处理：

```text
policy
> human_confirmed
> tool_observed
> agent_reported
> steward_inferred
```

低权威内容不能覆盖高权威内容。LLM 输出只能创建 suggested 内容；只有有权 Human 确认后才成为 Confirmed Context。身份、权限、确认记录、状态转换、hash、cursor、Lease 和 fencingToken 是 Mechanical Fact。

## 5. 岗位扩展

平台只固定公共 ExecutionResult 和 Evidence 合同。开发、Java 测试、质量等岗位通过 Agent/Skill 扩展专业 payload，禁止把 repo、branch、测试报告等岗位字段固定进全局 Requirement。
