# Local Runtime 规范

## 1. 定位

Local Runtime 是 Electron 管理的本地 companion daemon，为 Sartre Agent 提供文件、命令、Git 和 MCP 能力。它不是外部 Connector 产品，也不提供独立业务 UI。

## 2. 身份与配对

- Electron 使用 authenticated local IPC 发现 Runtime。
- 用户登录后通过一次性 challenge 配对。
- Hub 签发独立 Endpoint Credential，Runtime 保存在系统安全存储。
- Runtime 使用 Credential 换取短期 Endpoint Token；不持有 Human Refresh Token。
- Endpoint Token 只能访问 Runtime allowlist API，不能执行人工确认。
- 每台设备的每个 OS 用户环境最多一个 Runtime daemon；同一 daemon 可承载该 Human 发起的多个隔离 AgentRun，包括自建 Agent 和获准的共享 Agent。
- 首版不允许多个 Human Account 在同一 OS 用户环境中并发共享 Runtime 身份、RepoRegistry、CredentialRef 或运行状态。
- 切换 Human Account 必须显式 reset/re-pair；有 active AgentRun 时先阻止切换，完成 cancel/reconciliation 后才能撤销旧 Endpoint Credential 并清理账号绑定的本地状态。

## 3. Project Binding

Hub Project 是团队逻辑项目；每个用户设备创建 LocalProjectBinding。

```text
选择 Project -> 选择本地目录 -> fingerprint 校验 -> 权限/漂移检查 -> healthy
```

真实绝对路径只保存在 Runtime。fingerprint 不匹配、目录离线或权限不足时禁止写 Execution。

Hub 侧合同只包含 bindingId、projectId、endpointId、fingerprint 和 status；Runtime 本地 Registry 单独保存 `bindingId -> absolutePath`。Hub API、日志、AuditEvent 和 Agent 上下文不得返回真实绝对路径。

## 4. Agent 调用

AgentDefinition 由创建者管理所有权和发布，但不绑定创建者 Runtime。允许成员 mention 后，Hub 将 Invocation 路由到调用者当前 callerEndpointId；调用者 Runtime 离线时保持 pending 并给出取消/重试入口，不转移到 Agent 创建者或其他成员设备。

AgentUsagePolicy 只控制 private、workspace_allowlist、workspace_all 的触发权，不授予 Project 写权限或 credential 读取权。

第一版 AgentEngine 固定为 `CodexAgentEngine`，通过 TypeScript `@openai/codex-sdk` 启动和控制本地 Codex thread。一个 Runtime daemon 承载多个按需创建的 AgentRun；创建 AgentDefinition 不启动 Node 服务或 Codex 进程。

创建 Agent 时必须选择受管 `AgentModelPolicy`。第一版 allowlist 为 `gpt-5.5-2026-04-23` 和 `gpt-5.6-sol`，reasoning effort 允许 `medium/high`，默认 `gpt-5.5-2026-04-23 + high`。Invocation 锁定 requestedModelId、reasoningEffort、modelPolicyVersion、catalogDigest 和 managed alias 的 expectedAliasOf；禁止只锁定会静默漂移的 alias 字符串。`sa-coder`/`sa-coder-2026-03` 在当前公司网关真实 Responses 调用返回 502，不进入第一版策略。

`gpt-5.6-sol` 当前目录声明 `alias_of=gpt-5.6-sol-2026-07-10`，但该目标 ID 不能直接请求。Hub/Runtime 必须在 Invocation 前重新读取已认证 catalog；alias_of 或 catalog digest 变化时返回 `agent_model_alias_changed` 和 Diff，不启动 AgentRun。运行事件与 usage 同时记录 requestedModelId、expectedAliasOf、providerResolvedModelId 和 reasoningEffort。

每次 AgentRun 使用隔离执行 Profile，只装配当前 Invocation 锁定的 AgentDefinitionVersion、SkillDefinitionVersion、MCPDefinitionVersion、ContextSnapshot，以及调用者获准的 ProjectBinding、ProviderProfile 和 CredentialRef。不得默认继承完整 `~/.codex`、未授权 MCP、全局环境变量、个人 Skill 或 Agent 创建者的本地状态。

同一 AgentDefinition 被多个成员在同一 Session 同时 mention 时，每个 Invocation 创建独立 Execution、AgentRun、Codex thread 和调用者 Profile，不建立 per-Agent mutex。它们可在资源上限内并行；只有本地 Runtime 容量队列和同一逻辑 Project 的写 Lease 会使某个 Execution 等待。

Codex thread 是当前 Execution 的临时 provider state，不是 Hub Session history。Baseline/Context stale、恢复或重新计划时，Runtime 必须基于 Hub 状态重新装配，不得只 resume Codex thread。

AgentRun 跨 Invocation 无状态。终态、ExecutionResult/runtime event 回传和 reconciliation 都完成后，Runtime 必须销毁 Codex thread、临时 `CODEX_HOME`/Profile、临时环境变量和 Scratchpad；仅保留按策略需要的脱敏诊断与回传队列。

## 5. 定义版本与更新检测

- AgentDefinitionVersion、SkillDefinitionVersion 和 MCPDefinitionVersion 发布后不可原地修改。
- AgentDefinitionVersion 引用精确 Skill/MCP version id，不使用“始终最新”浮动引用。
- Electron 发起 mention 时提交 expectedAgentDefinitionVersionId 和 expectedExecutionConfigHash。如只有 name/avatar/description 等展示元数据变化且 executionConfigHash 相同，Hub 锁定最新版并返回非阻断 `agent_metadata_updated` 提示。如 executionConfigHash 变更，Hub 返回 `agent_definition_changed`，不创建 Invocation。
- 执行配置变更时，UI 必须显示 instructions、model/reasoning policy、managed alias resolution、capability、Skill/MCP 和 credential slot 差异，由调用者确认使用最新版后重试。权限扩大、新 credential slot、新副作用 MCP 或 model alias 目标变化必须强提示，不允许静默继续旧版。
- Invocation 创建后锁定全部版本。普通定义更新不影响运行中 AgentRun；capability/credential/Project 授权撤销仍立即禁用新的工具调用。

## 6. Codex 网关与个人 Credential

首版每个 Human 在本机 Runtime 配置自己的公司 Codex 网关 ProviderProfile：`baseUrl`、`wireApi=responses`、model policy 和 API Key CredentialRef。API Key 明文保存在 OS 安全存储，不保存到 Hub、AgentDefinition、Renderer、文件型 `config.toml` 或全局 shell profile。

`baseUrl` 必须使用 HTTPS 并匹配 Platform/Workspace Policy 下发的公司网关 host allowlist；禁止任意外部 host、URL userinfo、未授权 query credential 和跳转到非 allowlist host。公司私有 CA 通过受管 `CODEX_CA_CERTIFICATE`/系统信任链配置，不允许关闭 TLS 校验。

Runtime 为每个 AgentRun 生成隔离 Codex 配置，使用实时临时环境变量向 `env_key` 注入 credential；不允许 Agent Prompt、Skill、MCP 或仓库 `.codex/config.toml` 修改 provider auth/baseUrl。共享 Agent 始终使用调用者 ProviderProfile，不使用创建者 Key。

## 7. 写工具门禁

Runtime 开放写工具前必须验证：

- Endpoint/Workspace Grant 有效。
- Execution 状态允许写入。
- ContextSnapshot 与 Baseline 未 stale。
- ExecutionPlan 已由有权 Human 确认。
- LocalProjectBinding healthy。
- ProjectLease active 且 fencingToken 匹配。
- 文件路径位于 allowedPathGlobs。
- CredentialRef 已授权给当前 Agent/MCP。

任何一项变化后完成当前原子调用并禁用新的写操作。

Codex 运行在 read-only sandbox。内置文件/命令能力不得绕过上述门禁产生副作用；文件写入、命令、Git 和其他 MCP 副作用统一通过 Runtime 管理的 Sartre MCP/ToolBroker。ToolBroker 在每次调用时重新验证 Execution、Lease、fencingToken、scope、capability 和 CredentialRef。

## 8. 本地持久状态

Runtime 持久保存 RepoRegistry、Endpoint Credential 引用、用户 ProviderProfile/API Key CredentialRef、LocalProjectBinding、待回传事件队列和 ExecutionCheckpoint。不得保存 raw chain-of-thought。

Checkpoint 只在原子工具调用结束后更新。调用中崩溃进入 reconciliation_required，不自动重放副作用命令。

## 9. 用户体验

- Runtime 启动、更新和退出由 Electron 管理。
- 离线、版本不兼容、目录移动、credential 失效和 EnvironmentDrift 在原 Execution 卡片中给出修复入口。
- 设置中提供策略 allowlist 内的个人 Codex 网关 URL、API Key 录入/轮换、连通性校验和脱敏状态；Renderer 永远不能回读 Key 明文。
- Agent 执行配置更新时，原消息位置显示差异与“使用最新版”确认；不把 `agent_definition_changed` 隐藏为通用失败 toast。
- 用户可查看健康、队列和绑定状态，但不能直接编辑 Lease status 或 fencingToken。
- Runtime 本机诊断 CLI 只能调用同一 Runtime API，不实现第二套执行路径。平台级 `ops:trace-*` 调用 Hub ops Query API，不由 Runtime CLI 跨 Workspace 聚合。

## 10. 明确不做

- 外部 Agent/Connector 接入。
- PI、LangChain、通用多 Provider Agent Loop 或第二个 Coding Agent Engine。
- 自动 accept-and-execute 写任务。
- 在临时空目录替代真实 Project 施工。
- 把本地 credential、路径或未共享文件上传 Hub。
- 将共享 Agent 路由到创建者 Runtime，或共享创建者 ProviderProfile/API Key。
