# Sartre 产品宪法

## 1. 产品目标

Sartre 是公司内部的多人 AI Native 协作平台，解决不同岗位使用本地 Agent 时目标、文件、决定、变更、进度和结果无法持续同步的问题。

Sartre 必须让成员在同一 Workspace 和需求下：

- 通过自然对话完成多岗位需求理解。
- 将共识沉淀为版本化 `goal-contract.md`。
- 由各岗位负责人承担独立岗位任务。
- 使用 Sartre Agent 读取和修改本人负责的本地 Project。
- 通过 Project Lease 阻止同一 Project 多 Agent 同时写入。
- 通过 Session Steward 汇总决定、放弃项、冲突、进展和证据。
- 在需求变更、Agent 崩溃或成员切换会话后仍共享同一正式记录和 Confirmed Context。
- 让受权平台运维在已知 userId、时间范围和问题现象时，沿正式记录与诊断上下文定位首个失败点并验证修复结果。

## 2. 产品边界

首版包含 Electron App、Hub API、Hub Worker、Local Runtime、PostgreSQL、对象存储和 Sartre Agent。用户创建的工作 Agent 只支持 CodexAgentEngine；Steward 是系统级 Agent 身份和内容管理流程，不属于用户 Agent provider。

共享 Agent 共享的是不可变 AgentDefinitionVersion 及其锁定的 Skill/MCP DefinitionVersion，不共享创建者的 Runtime、ProjectBinding、credential 或 provider session。每次 mention 都在调用者当前 Endpoint 的 Local Runtime 创建独立 AgentRun，并使用调用者自己的公司网关 URL 和 API Key。

Steward 的主动检测和用户 `@Steward` 触发的语义分析均由 Hub Worker 执行，统一使用平台专用 Steward Service Credential，不使用 Session 创建者、mention 调用者或其他 Human 的个人 Key，也不在 Service Credential 不可用时自动回退到个人 Key。

首版不包含：

- Windows/Linux/Intel Mac 桌面发行；首个生产 Release 只支持 Apple Silicon arm64、最低 macOS 14。
- Git Server、PR/发布流水线和业务系统部署编排。
- 外部 Agent 平台或通用远程执行市场。
- 完整本地仓库同步、向量数据库和用户可见时间回溯。
- raw chain-of-thought 保存或共享。
- 某岗位专用报告字段的全局固化。
- 第一版完整 OpenTelemetry Span 覆盖、多套 Dashboard、成本分析和高级采样；第一版只建设用户全链路诊断与基础监测。
- PI、LangChain、通用多 Provider Agent Loop 和其他 Coding Agent Engine。

## 3. 信息保存边界

Hub 保存多人需要共同查看和依赖的正式记录：身份与权限、需求与 Goal Contract、会话消息、岗位任务、人工确认、Agent/Skill/MCP 定义版本、Execution 计划/状态/结果、Project Lease、共享文件索引、证据和审计。Hub 还保存有限保留期的脱敏 Runtime/Client 诊断记录；它们不参与业务聚合版本和 DomainEvent replay。

用户或 Agent 明确共享的文件正文保存到对象存储；Hub 数据库保存文件名称、版本、hash、权限和来源。Hub 不同步整份本地代码仓库。

Local Runtime 保存本地目录、未共享代码、调用者的网关 ProviderProfile/credential、进程、provider session、Scratchpad 和离线事件队列。这些内容在明确共享前不会进入其他成员或 Agent 的上下文。

工作 Agent Provider 返回的 usage 以调用者为权限边界保存脱敏摘要，不因 ExecutionResult 共享而对其他 Workspace 成员开放。Human 的 API Key 明文不进入 Hub、Renderer、AgentDefinition 或会话消息。Steward Service Credential 只由 Secret Manager/Kubernetes Secret 注入 Hub Worker，不写入业务数据库、Renderer、日志、Agent 输出或会话消息；Steward usage 归属系统并按 workspaceId、sessionId 和 analysisId 关联诊断。

## 4. 记录与权威

- Hub 是团队共享记录、权限和程序状态的唯一权威源，但“消息已被正式记录”不等于“消息内容为真”。
- Canonical Record 表示 Hub 对消息、事件和状态的唯一正式记录；Confirmed Context 才是经有权 Human 确认、团队可以依赖的语义约束。
- 本地目录、credential、环境变量和 Execution Scratchpad 不自动进入 Hub 共享记录。
- provider session 不是团队历史；Session Message ledger 才是正式会话记录。
- AgentRun 跨 Invocation 无状态；终态持久化且 reconciliation 完成后销毁 Codex thread、临时 Profile 和 Scratchpad，不把上一轮 provider state 带入下一轮。
- Agent 或 Steward 的结论先是 Suggested Context，经人确认后才能成为 Confirmed Context。
- Human Approval、Lease、fencingToken、aggregateVersion 和权限由程序维护，LLM 不得生成或修改。
- Codex thread 和 Steward 推理调用都不是团队历史或业务状态所有者。

## 5. 生产定义

功能可演示不等于生产可用。发布必须同时满足身份、租户隔离、资源授权、事务、幂等、审计、故障恢复、用户全链路诊断、基础监测、备份、签名安装包和四层生产门禁。

当前 legacy MVP 为 NO-GO。生产版本在新仓库重建，采用零历史数据迁移和白名单代码移植。
