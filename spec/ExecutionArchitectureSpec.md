# Execution、Lease 与 Context 架构规范

## 1. 端到端写流程

```text
Session 中 mention Agent
-> Hub/Runtime 组装只读 ContextSnapshot
-> 调用者 Runtime 按锁定定义与个人 ProviderProfile 创建 read-only Codex thread
-> Codex 只读分析并生成 ExecutionPlan
-> Human 确认 Project 和修改范围
-> Hub 获取 ProjectLease
-> Runtime ToolBroker 开放受限 Sartre MCP 写工具
-> heartbeat / checkpoint / event
-> 提交 ExecutionResult
-> Hub 持久化后释放 Lease
```

Codex SDK 只拥有模型推理、coding loop 和临时 thread。Sartre Runtime 拥有工具权限与运行控制，Hub 拥有 Execution、Lease、Context 和审计状态。Codex 内置能力不能绕过 Runtime ToolBroker 写文件或执行副作用命令。

## 2. ExecutionPlan

必须包含 triggerMessageId、requirementId、workstreamId、sessionId、agentId、agentDefinitionVersionId、skillDefinitionVersionIds、mcpDefinitionVersionIds、executionConfigHash、baselineVersion、contextSnapshotId、projectId、goal、allowedPathGlobs、plannedCommands、requestedCapabilities、riskSummary 和 expectedOutputs。

范围扩展必须阻塞新的写操作，经 Human 确认后创建新版 Plan。禁止仅记录警告后继续。

## 3. 共享 Agent 并行与版本门禁

- 每个 mention 只代表一个 AgentInvocation，并固定 initiatingUserId 和 callerEndpointId。
- 同一 Agent 被多人同时 mention 会在各自 Runtime 创建相互隔离的 Execution/AgentRun；没有共享 Codex thread、Scratchpad 或长期 Agent memory。
- mention Command 必须带 expectedAgentDefinitionVersionId 和 expectedExecutionConfigHash。仅展示元数据变更时锁定最新版并返回非阻断 `agent_metadata_updated`；executionConfigHash 变更时返回 `agent_definition_changed` 及可展示 Diff，不启动 Execution。
- Invocation 创建后锁定 Agent/Skill/MCP version id。普通新版本不注入运行中 AgentRun；授权撤销继续按安全规则立即生效。
- 同一 Project 的只读 AgentRun 可并行；写 Execution 仍通过全局 ProjectLease 串行。

## 4. ProjectLease

- Lease 作用于逻辑 projectId，不作用于绝对路径。
- 同一 Project 同时最多一个 active Lease。
- Lease 保存 holderUserId、holderAgentId、endpointId、executionId、expiresAt、heartbeatAt、fencingToken。
- release、revoke、force release、expire 都使旧 token 永久失效。
- force release 后必须先检查本地文件和 EnvironmentDrift，再允许新 Agent。

## 5. ContextSnapshot

Snapshot 是不可变引用清单，包含 baselineVersion、policyVersion、workspaceCursor、entries、budgetProfile 和 snapshotHash。它不复制来源正文。

权威顺序：policy > human_confirmed > tool_observed > agent_reported > steward_inferred。

P0 必须包含 Goal Contract、successCriteria、nonGoals、constraints、权限、范围和阻塞决策。P0 冲突、缺失或超预算时禁止写 Execution。

## 6. Context Delta

- P0 变化：Execution 进入 context_refresh_required，禁用新写操作。
- P1 变化：下一模型调用前注入并记录 acknowledgment。
- P2/P3 变化：更新可检索 handle，不打断执行。

Baseline 不得静默替换。继续写入前必须刷新 Snapshot 并重新确认 Plan，或终止后重建。

## 7. ExecutionResult

公共结果必须包含 goal、changes、decisions、rejectedApproaches、blockers、verification、nextActions、evidenceRefs、attachmentRefs、status 和 extension。岗位扩展只能写入 namespaced extension，公共消费者必须忽略未知扩展。

Execution completed 不等于 Workstream done。岗位负责人确认后岗位任务才完成；所有 required Workstream done 后由 Requirement Owner 最终验收。

Provider 返回的 `input_tokens`、`cached_input_tokens`、`output_tokens` 和 `reasoning_output_tokens` 归一化为调用者私有 ExecutionUsage。Gateway 账单是计费权威；Sartre 不伪造缺失 usage，也不向其他 Workspace 成员公开用量明细。

## 8. Steward

每个 Session 同步创建 Steward。Steward 读取当前 Session、所属 Requirement confirmed context、相关 Execution/Lease/Attachment/Evidence。

Steward 维护锚、账、集，检测 goal drift、重复放弃方案、跨岗位冲突、证据缺失、context stale、执行停滞、结果缺失、Lease 异常和 scope drift。

Steward 只能创建 suggested Finding；副作用能力默认需要 Human 确认。

首版 Steward 不运行 CodexAgentEngine 或通用 Agent Loop。确定性 Projector 先根据 Message/DomainEvent/Execution/Lease 更新 Timeline 与 Working Set；只有目标漂移、冲突、决定、放弃项和 Evidence 等语义问题进入 `StructuredInferencePort` 单次调用。Worker 在调用前绑定 analysisId、Workspace/Requirement/Session scope、cursor 和 inputDigest；模型只能返回经 Zod 校验的 `StewardAnalysis.content`。

首版 `StructuredInferencePort` 只实现 Codex 模型适配器。每次语义 Job 是 one-shot：2 分钟后将用户可见状态标记为 delayed/degraded，5 分钟到达硬 deadline 时取消当次调用并记录稳定 errorCode。第一版不设置用户可配置的 token/费用业务预算，但仍必须受模型 context window、P0-P3 Working Set、单次 payload 大小、debounce 和每 Session 并发 1 的技术上限保护。

用户 mention Steward 时先执行确定性 Query，再可选调用一次结构化推理组织表达。后续副作用插件使用显式 `detect -> propose -> human confirm -> execute -> audit` Workflow，不允许 `while(model requests tools)` 自由循环。

## 9. 故障恢复

Hub 断线、Runtime 崩溃、Provider 失败和未知工具结果都不能自动继续写入。恢复依据是 Session Message ledger、Snapshot、Checkpoint、工具结果和当前文件状态，不是 provider session。

正常终态不 resume Codex thread。ExecutionResult/runtime event 已持久化且 reconciliation 完成后，Runtime 销毁本轮 thread、临时 Profile 和 Scratchpad；后续 mention 从 Hub ContextSnapshot 创建新 AgentRun。

所有恢复、revoke、force release 和 fencing reject 必须形成 AuditEvent 与 AttentionItem。
