# 模块合同规范

## 1. 合同载体

跨模块 DTO、Command、Query、Result 和 Event 必须在 `packages/contracts` 中使用 Zod 定义，TypeScript 类型由 schema 推导。禁止 app 内复制同名接口。

contracts 按 bounded context 拆分文件；根 index 只做受控导出，不承载业务实现。

## 2. Command Envelope

```text
commandId
workspaceId
actorType
actorId
commandType
idempotencyKey
requestHash
expectedVersion
correlationId
causationId
payload
```

workspaceId 必须与认证 TenantContext 和目标资源一致。Human approval 的 actor 只能来自 Human Session。

## 3. EventEnvelope

本节 `EventEnvelope` 专指 Hub 持久的 DomainEvent envelope。Local Runtime 运行诊断使用 5.1 的 `AgentRunEvent`，不伪装成 DomainEvent。

```text
eventId
workspaceId
workspaceCursor
aggregateType
aggregateId
aggregateVersion
eventType
actorType
actorId
correlationId
causationId
occurredAt
payload
```

workspaceCursor 在 Workspace 内持久、单调递增且唯一，是 SSE replay 位置。Event 不允许携带 credential、完整本地路径或 raw chain-of-thought。事件版本演进必须向后兼容或提供显式 upcaster。

### 3.1 第一版诊断合同

用户发起或可归因到用户的关键边界记录必须携带 DiagnosticContext：

```text
requestId
correlationId
causationId
workspaceId
userId
initiatedByUserId
actorType
actorId
component
operation
stage
status
resourceType
resourceId
requirementId
sessionId
executionId
leaseId
endpointId
occurredAt
errorCode
retryable
```

字段不适用于当前资源时可以为空，但 `correlationId`、actor chain、`component/operation/stage/status`、`occurredAt` 和稳定 `errorCode` 不得由自由文本替代。Endpoint/System 代表用户继续链路时必须保存 `initiatedByUserId`。

内部用户诊断结果使用可重建 DiagnosticTimeline Projection，至少返回：

```text
timelineItems
lastSuccessfulStage
firstFailedStage
currentState
suggestedRecoveryAction
evidenceRefs
correlationIds
```

DiagnosticTimeline 不是 Canonical Record，不允许包含完整消息、Prompt、文件内容、credential、本地路径或原始命令输出。

Electron ClientDiagnosticEvent 只允许记录关键业务 action 枚举、IPC/SDK 边界、status、errorCode 和 DiagnosticContext。它是最佳努力诊断数据，不证明用户行为；缺失时只能返回 `no_client_action_observed`。

## 4. Result 与错误

IPC 使用：

```ts
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };
```

HTTP 使用统一 Problem Details，至少包含 code、status、message、requestId、correlationId。生产 message 不泄露资源存在性、Secret、SQL 或内部堆栈。

`code` 必须来自受控 error catalog。自然语言 `message` 只用于解释，不能承担聚合、告警、重试或诊断判断。

错误分类：

- 400 validation_failed
- 401 unauthenticated
- 403 forbidden
- 404 resource_not_found
- 409 version_conflict / state_conflict / idempotency_conflict / lease_conflict / agent_definition_changed。`agent_metadata_updated` 是成功响应中的非阻断 notice，不是错误。
- 413 payload_too_large
- 422 invariant_failed
- 429 rate_limited
- 503 dependency_unavailable / degraded

## 5. 核心公共合同

- GoalContractArtifact：artifactId、baselineVersion、contentHash、sourceRefs。
- AgentModelPolicy：requestedModelId、reasoningEffort、modelPolicyVersion、catalogDigest、referenceType(`version/managed_alias`)、expectedAliasOf?。第一版 reasoningEffort 只允许 `medium/high`；managed_alias 必须带 expectedAliasOf。全部字段进入 AgentDefinitionVersion 和 executionConfigHash。
- AgentVersionSnapshot：agentId、agentDefinitionVersionId、skillDefinitionVersionIds、mcpDefinitionVersionIds、agentModelPolicy、executionConfigHash、publishedAt。所有 version id 不可变，Invocation 不使用浮动 latest 引用。
- AgentInvocationRequest：triggerMessageId、agentId、callerEndpointId、expectedAgentDefinitionVersionId、expectedExecutionConfigHash、projectId?、idempotencyKey。callerUserId 由 Human Session 派生，不接受 Renderer 自报；Hub 必须重新验证 callerEndpointId 属于当前 Human、具有 Workspace Grant 且版本/健康可用。
- ExecutionResult：goal、changes、decisions、rejectedApproaches、blockers、verification、nextActions、evidenceRefs、attachmentRefs、status、extension。
- ContextEntry：scope、type、authority、status、version、sourceRefs、evidenceRefs、supersedes；status 仅为 suggested/active/dismissed/superseded。只有 authority=human_confirmed 且 status=active 才是 Confirmed Context。
- EvidenceRef：sourceType、sourceId、version/hash、location、observedAt。
- LocalProjectBinding：bindingId、projectId、endpointId、fingerprint、status，不传真实路径；Runtime 本地 Registry 单独保存 bindingId 到 absolutePath 的映射。
- Lease：projectId、executionId、holder、expiresAt、heartbeatAt、fencingToken、status。
- ExecutionUsage：executionId、userId、requestedModelId、providerResolvedModelId、reasoningEffort、expectedAliasOf?、modelCatalogDigest、usageSource、inputTokens、cachedInputTokens、outputTokens、reasoningOutputTokens、totalTokens、cacheHit、cacheHitTokenRate、latencyMs、providerRequestRefs[]、observedAt。userId 由已持久化 Invocation 派生，不信任 Runtime 自报。providerRequestRefs 只保存脱敏不可猜测引用，不保存请求 URL、认证头或上游响应正文。
- UserUsageSummary：requestCount、cacheHitRequestCount、cacheHitRequestRate、inputTokens、cachedInputTokens、outputTokens、reasoningOutputTokens、totalTokens、cacheHitTokenRate、byModel[]、timeRange。

岗位专业字段通过 namespaced extension 扩展，公共消费者必须能忽略未知 extension。

Agent definition 冲突返回受控 details：`expectedVersionId`、`latestVersionId`、`latestExecutionConfigHash`、`changeSummary`、`modelPolicyDiff`、`aliasResolutionDiff`、`capabilityDiff`、`skillDiff` 和 `mcpDiff`。不返回 instructions 中无权查看的内容、credential 或创建者本地配置。managed alias 目标变化使用稳定错误 `agent_model_alias_changed`。

`ExecutionUsage` 的 `usageSource` 只允许 `provider_reported / gateway_reconciled`。`cachedInputTokens` 是 `inputTokens` 的子集，`reasoningOutputTokens` 是 `outputTokens` 的子集；`totalTokens = inputTokens + outputTokens`，不得重复加上两个子集。`cacheHit = cachedInputTokens > 0`；`cacheHitTokenRate = cachedInputTokens / inputTokens`，当 inputTokens 为 0 时返回 null。聚合视图的 `cacheHitRequestRate = cacheHitRequestCount / requestCount`，`cacheHitTokenRate = sum(cachedInputTokens) / sum(inputTokens)`。该合同只对调用者和具有审计权限的平台运维开放，不进入共享 ExecutionResult DTO。Gateway 账单仍是计费权威，缺失字段保持 null，禁止使用随机数或估算值冒充 provider usage。

### 5.1 AgentRunEvent

`AgentRunEvent` 是 Local Runtime 向 Hub 上报的稳定、可脱离 Provider 的运行诊断事件。它是独立的受控 discriminated union，持久化到 `runtime_events`，不是 DomainEvent，也不是 Codex SDK 私有 event 的镜像。

所有 variant 至少包含：

```text
schemaVersion
agentRunId
agentInvocationId
executionId
endpointId
agentDefinitionVersionId
executionConfigHash
runSequence
phase
eventType
occurredAt
diagnosticContext
```

`diagnosticContext` 必须带有与 Invocation/Execution 一致的 workspaceId、initiatedByUserId、correlationId 和 causationId，Hub 按 Endpoint Token 和已持久化关联重新校验，不信任 Runtime 自报 scope。`runSequence` 在单个 AgentRun 内严格递增，Hub 以 `workspaceId + agentRunId + runSequence` 幂等接收。`phase` 只允许 `queued / context_loading / analyzing / awaiting_approval / executing / paused / finalizing / terminal`。首版 `eventType` 只允许：

```text
run_started
analysis_progressed
plan_proposed
tool_call_started
tool_call_finished
checkpoint_recorded
usage_updated
run_paused
run_resumed
run_completed
run_failed
run_cancelled
```

每个 variant 只携带完成该边界记录所需的 allowlisted 字段，例如 toolCallId、toolName、capability、resultStatus、durationMs、checkpointId、usageSnapshot、errorCode 和 retryable。`usage_updated.usageSnapshot` 是单个 AgentRun 截至当前 runSequence 的累计值，Hub 按新 sequence 幂等 upsert，不对重放事件反复累加。禁止携带 Codex 原始 event、raw chain-of-thought、完整 Prompt、未脱敏工具参数/输出、credential 或真实本地路径。

Provider adapter 可以在本地保留临时 Provider 调试信息，但 Hub 只接收上述归一化合同。`runtime_events` 用于 DiagnosticTimeline 和运行活动投影，不参与 aggregateVersion 或 Workspace DomainEvent replay。终态运行事件不能替代 `ExecutionResult` 或领域状态转换；Hub 仍由 Command 和领域服务判定 Execution 是否完成，并在状态真正变化时另行创建 DomainEvent。

### 5.2 StewardAnalysis

`StewardAnalysis` 是 Hub Worker 对 `StructuredInferencePort` 单次调用结果封装的 Zod 合同。它由 Worker 生成的可信 envelope 和模型只能返回的受限 content 组成：

```text
envelope
  schemaVersion
  analysisId
  workspaceId
  requirementId
  sessionId
  throughWorkspaceCursor
  inputDigest
content
  findings[]
  answerDraft?
```

`envelope` 必须由 Worker 根据当次 Job 和 Working Set 在模型调用前生成，不进入模型可写输出。`StructuredInferencePort` 只返回 `content`；模型自报的 workspace、actor、cursor、analysisId 或 inputDigest 一律忽略并不得持久化。

`content.findings[]` 每项只包含：

```text
findingType
severity
title
summary
sourceRefs[]
relatedContextEntryIds[]
suggestedContext?
```

`findingType` 只允许 `goal_drift / cross_role_conflict / decision_candidate / rejected_approach_repeated / evidence_missing / context_update_candidate`。`sourceRefs` 必须指向当次 Working Set 中已授权的 Message、Context、ExecutionResult 或 EvidenceRef；没有可追溯来源的项目不得创建 Finding。

`StewardAnalysis` 不允许包含 tool call、命令、自动状态转换、confirmed 标记、自报 actor 或 raw chain-of-thought。Hub Worker 在 schema、scope、cursor 和 sourceRefs 校验后，只能幂等创建 Suggested Finding/Context。schema 失败、超时或 Provider 不可用时，当次语义分析标记 degraded，不伪造结果，也不阻塞确定性投影和人工会话。

## 6. 版本与兼容

- REST/SSE/IPC contract 变更必须有兼容测试。
- Electron、Runtime、Hub 交换 min/max compatible version。
- 破坏性字段删除至少经过一个 release 的弃用期。
- Migration 采用 expand-and-contract；旧客户端不可理解的新行为必须明确返回 upgrade_required。
