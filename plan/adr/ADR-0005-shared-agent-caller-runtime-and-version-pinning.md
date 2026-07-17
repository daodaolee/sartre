# ADR-0005：共享 Agent 在调用者 Runtime 执行并锁定定义版本

- 状态：已接受，2026-07-17
- 相关：`ADR-0004-codex-sdk-work-agent-and-bounded-steward.md`、`spec/LocalRuntimeSpec.md`、`spec/ExecutionArchitectureSpec.md`

## 背景

共享 Agent 需要被多个 Workspace 成员 mention。如果把共享理解为“在 Agent 创建者 Runtime 执行”，调用会隐式使用创建者的本地仓库、credential、Codex 网关账号和 provider state，与“每个成员只操作自己负责的 Project”冲突。

同时，Agent、Skill 和 MCP 定义会被持续更新。如果 Invocation 使用浮动 latest 引用，同一轮执行可能在计划、确认和工具调用之间使用不同配置。

## 决策

### 共享边界

- AgentDefinition 由 ownerUserId 管理所有权、发布和 AgentUsagePolicy，但不绑定 owner Runtime。
- 共享内容只包含不可变 AgentDefinitionVersion 及其锁定的 Skill/MCP DefinitionVersion。
- 共享内容不包含 Runtime、LocalProjectBinding、ProviderProfile、credential value、provider session 或 Scratchpad。

### 调用路由与并行

- 每次 mention 都创建独立 AgentInvocation，路由到 initiating Human 的 callerEndpointId。
- 调用者 Runtime 使用自己的 ProjectBinding、公司 Codex 网关 ProviderProfile 和 CredentialRef 创建 AgentRun。
- 同一 Session 中多人同时 mention 同一 Agent 会生成互相隔离的 Execution、Codex thread 和临时 Profile，不建立 per-Agent mutex。
- 只读运行可并行；同一逻辑 Project 的写 Execution 仍由 ProjectLease 全局串行。
- caller Runtime 离线时 Invocation 保持 pending 并允许取消/重试，不转移到创建者或其他成员设备。首版不处理同一 Human 多设备选择与 AgentRun 迁移。

### 版本和无状态

- Agent/Skill/MCP DefinitionVersion 发布后不可原地更新；AgentDefinitionVersion 只引用精确依赖版本。
- mention Command 携带 expectedAgentDefinitionVersionId 和 expectedExecutionConfigHash。只有展示元数据变化时 Hub 锁定最新版并返回非阻断 `agent_metadata_updated`；executionConfigHash 变更时返回 `agent_definition_changed` 和脱敏 Diff，不创建 Invocation。
- 执行配置变更时由调用者确认最新版后重试；权限扩大、新 credential slot 和新副作用 MCP 必须强提示。
- Invocation 创建后锁定全部版本。普通定义更新不影响运行中 AgentRun；授权撤销仍立即禁用新工具调用。
- ExecutionResult/runtime event 回传且 reconciliation 完成后，Runtime 销毁 Codex thread、临时 Profile/环境变量和 Scratchpad。下一 Invocation 只从 Hub ContextSnapshot 重建。

## Provider 与 usage

- 每个 Human 在自己 Runtime 配置公司 Codex 网关 `baseUrl + API Key`；baseUrl 必须为 HTTPS 并匹配公司网关 host allowlist，Key 明文只存在 OS 安全存储。
- Runtime 使用 `wire_api=responses` 和指向单次临时环境变量的 `env_key` 生成隔离 ProviderProfile。
- Provider 返回的 input、cached input、output 和 reasoning output token 归一化为 initiating user 私有 ExecutionUsage。Gateway 账单是计费权威，其他 Workspace 成员不能因可见 ExecutionResult 而读取该明细。

## 理由

1. 调用者 Runtime 与“每个成员只操作自己 Project”的信任边界一致。
2. 不共享 Key、路径和 provider state，才能让 AgentUsagePolicy 真正只表示“可以使用这份定义”。
3. 不可变版本和 CAS 提示使 Plan、Approval、Audit 和结果可复现。
4. 每次 Invocation 建立新 thread 能避免不同用户、Session 和 Requirement 的 provider context 串染。

## 参考依据

- OpenAI Codex Manual 的 Codex SDK 文档确认 TypeScript SDK 用于 server-side 内部工具和 coding-focused thread。
- OpenAI Codex 自定义 model provider 配置支持 `base_url`、`wire_api=responses`、`env_key` 和 command-backed auth；Sartre 首版只使用公司网关 API Key + `env_key`。
- OpenAI Codex 运行 usage 字段使用 `input_tokens`、`cached_input_tokens`、`output_tokens` 和 `reasoning_output_tokens`。
- `/Users/xy/xykj/superagentai/superagent-frontend/app/routes/codex-cli.tsx` 可作为网关配置 UI 参考；`app/lib/usage.ts`、`openspec/specs/usage-aggregation/spec.md` 可作为用量分项和缓存聚合参考。
- 只复用标准字段、归一化及展示思路；不复制 SuperAgentAI legacy Codex Token 解析、代理凭据或计费事实链。

## 重新评估条件

- 第一版上线后出现有证据的跨设备迁移需求。
- 多设备自动路由能在不混淆 ProjectBinding、credential 和本地环境的前提下保持可复现性。

“创建者设备正好在线”不构成把调用路由到 owner Runtime 的理由。
