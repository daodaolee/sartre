# Sartre 目标数据库模型

> 本文是新生产仓库的逻辑 Schema，不代表当前 Migration 已实现。字段名可在 MS 实施计划中细化，但数据所有权、租户边界、唯一性和不可变规则不得改变。

## 1. 存储职责

| 存储 | 保存内容 | 不保存 |
| --- | --- | --- |
| PostgreSQL | 团队共享状态、Goal Contract Markdown/版本/确认、Message ledger、ExecutionResult 公共摘要、文件元数据、DomainEvent、Outbox 和 Audit。 | 本地绝对路径、业务 Secret、raw chain-of-thought。 |
| 对象存储 | Attachment 正文、大文件执行报告、飞书内容快照。 | 整份本地仓库、未明确共享的文件。 |
| Runtime 本地 Registry/安全存储 | `bindingId -> absolutePath`、credential value、CLI 登录态、Scratchpad、本地 Checkpoint 和待回传队列。 | Workspace 的最终业务状态。 |

`goal-contract.md` 正文保存在 PostgreSQL，而不是对象存储，以保证版本、contentHash、requiredAligners 和确认记录可以在同一事务边界内校验。ExecutionResult 公共摘要也保存在 PostgreSQL；只有大文件报告正文进入对象存储。

## 2. 全局身份表

以下表不属于某个 Workspace：

- `users`
- `auth_identities`
- `user_sessions`
- `oauth_provider_configs`
- `endpoint_identities`
- `endpoint_credentials`
- `platform_operator_grants`
- `system_audit_events`
- `system_security_events`
- `system_diagnostic_events`
- `schema_migrations`

`endpoint_credentials` 只保存 `credential_hash`、`credential_version`、创建/轮换/撤销时间和状态。明文 Endpoint Credential 只在配对成功时返回一次，不进入日志、AuditEvent、对象存储或普通配置表。

全局表仍受系统级权限和审计约束。它们不能借“全局”绕过 Workspace Membership、EndpointWorkspaceGrant 或资源授权读取 tenant-owned 数据。

`platform_operator_grants` 只授予窄范围系统权限，例如 `ops.diagnostics.read`。`system_audit_events` 记录跨 Workspace 运维查询的 operator、reason、timeRange、accessedWorkspaces、resultCount 和 correlationId；普通 Workspace owner/admin 不进入该授权表。

`system_security_events` 和 `system_diagnostic_events` 只处理尚未建立 Workspace Scope 的登录、Token、Workspace Selector 和客户端启动边界。建立 TenantContext 后必须写入对应 Workspace 的 `security_events` 或 `client_diagnostic_events`，不能继续把租户业务事件写入全局表。

## 3. Tenant-owned 表

### 3.1 Workspace 与资源

- `workspaces`
- `workspace_memberships`
- `workspace_invitations`
- `workspace_policies`
- `projects`
- `project_access_grants`
- `local_project_bindings`
- `endpoint_workspace_grants`
- `agent_definitions`
- `agent_definition_versions`
- `agent_usage_policies`
- `skill_definitions`
- `skill_definition_versions`
- `mcp_definitions`
- `mcp_definition_versions`
- `credential_refs`

`local_project_bindings` 只保存 `binding_id`、`workspace_id`、`project_id`、`user_id`、`endpoint_id`、fingerprint、状态和健康时间，不包含 `absolute_path` 或可还原本地路径的值。

`credential_refs` 是“某能力可用”的授权元数据，不是 Secret 表；业务 credential value 只保存在对应 Runtime 的系统安全存储中。

`agent_definitions` 只保存 owner、usage policy 关联和 currentPublishedVersionId。Agent/Skill/MCP DefinitionVersion 发布后不可原地更新；AgentDefinitionVersion 引用精确 Skill/MCP version id，保存 AgentModelPolicy(requested model、reasoning effort、model policy version、catalog digest、reference type、expected alias target) 和 executionConfigHash。共享定义不包含 ProviderProfile、API Key、LocalProjectBinding 或 provider session。

### 3.2 Requirement 与对齐

- `requirements`
- `goal_contract_artifacts`
- `alignment_baselines`
- `alignment_checkpoints`
- `baseline_confirmations`
- `workstreams`
- `workstream_proposals`
- `requirement_change_proposals`
- `success_criteria_evidence`

`goal_contract_artifacts` 至少保存 `body_markdown`、`version`、`content_hash`、`source_cursor`、`source_refs`、生成模型/prompt 版本和 `supersedes_id`。`alignment_baselines` 引用唯一 Goal Contract 版本；`baseline_confirmations` 只能由 Human actor 创建。

Baseline 不支持强制确认。requiredAligners 名单变化创建新 Draft，并保留变更原因和 AuditEvent；不能直接补一条“管理员代确认”记录。

### 3.3 Conversation 与共享内容

- `session_folders`
- `sessions`
- `session_message_counters`
- `messages`
- `mentions`
- `attachments`
- `attachment_versions`

Message 是 Canonical Record，表示 Hub 正式记录了这条消息，不表示消息内容已经成为 Confirmed Context。`session_message_counters` 或等价原子机制分配 `message_seq`，禁止 `max(seq) + 1`。

Attachment 表只保存名称、MIME、size、contentHash、objectVersion、权限、来源和状态；正文位于对象存储。

### 3.4 Runtime 与 Execution

- `agent_invocations`
- `executions`
- `execution_plans`
- `project_leases`
- `execution_checkpoints`
- `execution_results`
- `execution_usage`
- `runtime_events`

`execution_checkpoints` 保存 Runtime 回传的脱敏 checkpoint 摘要和 hash；完整本地工具中间状态仍在 Runtime。`execution_results` 保存公共字段：goal、changes、decisions、rejectedApproaches、blockers、verification、nextActions、evidenceRefs、attachmentRefs、status 和 namespaced extension。

`runtime_events` 保存 Runtime 上报的归一化 `AgentRunEvent`，用于 DiagnosticTimeline 和活动投影。它不保存 Codex 原始 event、raw chain-of-thought、未脱敏工具输入/输出、credential 或本地绝对路径，也不参与业务聚合版本和 Workspace DomainEvent replay。

`agent_invocations` 必须保存 initiating_user_id、caller_endpoint_id、agent_definition_version_id、skill_definition_version_ids、mcp_definition_version_ids、execution_config_hash 和锁定的 AgentModelPolicy。`execution_usage` 保存 requested/resolved model、reasoning effort、expected alias target、catalog digest，以及 Provider 返回或 Gateway 对账的 input/cached input/output/reasoning output token、projection_version 和 observed_at；它使用 user-scoped RLS，不因 Workspace admin、ProjectAccess 或 ExecutionResult 共享而对其他成员开放。`provider_reported` 投影对每个 AgentRun 只取最大 run_sequence 的 usageSnapshot，再按 Execution 求和；重放旧 RuntimeEvent 不得重复累加。

同一 Project 同时最多一个 active Lease。首版没有 transfer 状态或字段；换 holder 使用 release/revoke 后重新 acquire。

### 3.5 Context 与 Steward

- `steward_instances`
- `steward_findings`
- `context_entries`
- `evidence_refs`
- `context_snapshots`
- `context_snapshot_entries`
- `attention_items`
- `user_inbox_entries`

`context_entries` 必须分开保存：

- `type`：decision、rejected_approach、blocker、risk、observation、progress、result_summary 等。
- `authority`：policy、human_confirmed、tool_observed、agent_reported、steward_inferred。
- `status`：suggested、active、dismissed、superseded，只表示生命周期。

只有 `authority=human_confirmed AND status=active` 的记录属于 Confirmed Context。不得把 `conversation_fact` 同时当成内容类型和确认状态。Session Message 仍在 `messages` 表；从消息中提取 ContextEntry 时通过 sourceRefs 关联。

### 3.6 Reliability 与 Audit

- `workspace_event_counters`
- `client_diagnostic_events`
- `domain_events`
- `outbox_events`
- `idempotency_records`
- `audit_events`
- `security_events`
- `dead_letter_records`
- `projection_failures`

`domain_events` 是 SSE 的持久重放来源，每个事件获得 Workspace 内单调递增的 `workspace_cursor`。`outbox_events` 引用 `event_id`，只维护 claim、attempt、nextAttemptAt、lastError 和 deliveredAt，不复制出一份可独立修改的业务事实。

`client_diagnostic_events` 只保存关键 Electron action/IPC 的受控枚举、DiagnosticContext 和脱敏错误，不保存输入正文或普通交互轨迹。它是有保留期、允许丢失的诊断数据，不参与 Requirement/Execution 状态机，也不能证明用户实际执行了某个动作。

DiagnosticTimeline 是对身份、Membership、System/Client DiagnosticEvent、Domain/Audit/System/Tenant Security/Runtime Event、Execution/Lease 和结构化边界日志的只读聚合 Projection，不建立第二套可写事实表。

## 4. 租户约束

所有 tenant-owned 表必须同时满足：

- `workspace_id NOT NULL`。
- 启用 RLS 和 `FORCE ROW LEVEL SECURITY`。
- Application Role 不拥有表、没有 `BYPASSRLS`；Migration Role 独立。
- 唯一键和外键包含 Workspace Scope，或通过复合外键验证相同 Workspace。
- Repository 只通过 `{workspaceId, resourceId}` 访问 tenant-owned 资源。

每个 tenant 请求在数据库事务中执行：

```sql
SET LOCAL app.current_workspace_id = '<workspace-id>';
SET LOCAL app.current_actor_id = '<actor-id>';
```

普通连接级 `SET` 禁止使用，避免连接池复用时泄漏 TenantContext。RLS 是第二道防线，不能替代 AuthorizationService 的 actor/action/resource 判定。

## 5. 关键唯一性与索引

- `sessions`: `UNIQUE(workspace_id, requirement_id, id)`。
- `messages`: `UNIQUE(workspace_id, session_id, message_seq)`。
- `baseline_confirmations`: `UNIQUE(workspace_id, baseline_id, aligner_user_id)`。
- `idempotency_records`: `UNIQUE(workspace_id, actor_id, command_type, idempotency_key)`。
- `agent_definition_versions`: `UNIQUE(workspace_id, agent_id, version)`；另建 `(workspace_id, agent_id, execution_config_hash)` 普通索引，允许展示元数据新版本复用相同 executionConfigHash。
- `skill_definition_versions`: `UNIQUE(workspace_id, skill_id, version)`。
- `mcp_definition_versions`: `UNIQUE(workspace_id, mcp_id, version)`。
- `domain_events`: `UNIQUE(workspace_id, workspace_cursor)`。
- `domain_events`: `UNIQUE(workspace_id, aggregate_type, aggregate_id, aggregate_version)`。
- `outbox_events`: `UNIQUE(event_id)`；消费者另外按 `event_id` 幂等去重。
- `runtime_events`: `UNIQUE(workspace_id, agent_run_id, run_sequence)`。
- `execution_usage`: `UNIQUE(workspace_id, execution_id, user_id, usage_source)`；gateway reconciliation 使用 version/observedAt 幂等更新，不重复累加。
- `project_leases`: 对 `(workspace_id, project_id)` 建 active partial unique index。
- `local_project_bindings`: 至少唯一约束 `(workspace_id, project_id, endpoint_id)`。

为第一版用户诊断建立以下查询索引，具体索引类型由真实查询计划验证：

- `domain_events`: `(workspace_id, actor_id, occurred_at)`、`(workspace_id, correlation_id, occurred_at)`。
- `client_diagnostic_events`: `(workspace_id, user_id, occurred_at)`、`(workspace_id, correlation_id, occurred_at)`。
- `audit_events`: `(workspace_id, actor_id, occurred_at)`、`(workspace_id, correlation_id, occurred_at)`。
- `security_events`: `(workspace_id, actor_id, occurred_at)`、`correlation_id`。
- `executions`: `(workspace_id, initiated_by_user_id, created_at)`、`correlation_id`。
- `agent_invocations`: `(workspace_id, initiated_by_user_id, created_at)`、`correlation_id`。
- `runtime_events`: `(workspace_id, endpoint_id, occurred_at)`、`(workspace_id, execution_id, occurred_at)`、`correlation_id`。
- `system_audit_events`: `(operator_user_id, occurred_at)`、`correlation_id`。
- `system_security_events`: `(user_id, occurred_at)`、`correlation_id`。
- `system_diagnostic_events`: `(user_id, occurred_at)`、`correlation_id`。

Metric label 不使用 userId、workspaceId、executionId 或其他高基数字段；这些字段只用于受权日志、Trace 和诊断查询。

所有外键都必须验证相同 `workspace_id`。只验证 UUID 存在但不验证租户归属属于 IDOR 缺陷。

## 6. 事务、不变与版本

一个成功 Command 在同一事务中提交：

```text
aggregate state
+ DomainEvent
+ OutboxEvent referencing DomainEvent
+ required AuditEvent
+ IdempotencyRecord response summary
```

API 只能在事务成功后返回。聚合表保存 `aggregate_version`，Command 使用 expectedVersion + compare-and-set 或显式行锁。

Goal Contract、ContextSnapshot、DomainEvent 和 AuditEvent 不原地修改。confirmed 内容变化创建新 version 并通过 `supersedes_id` 关联。Attachment 新正文创建 `attachment_versions`，保留 contentHash 和 objectVersion。

## 7. 对象存储

建议对象 key：

```text
workspaces/{workspaceId}/attachments/{attachmentId}/{version}
workspaces/{workspaceId}/execution-results/{executionId}/{artifactId}/{version}
workspaces/{workspaceId}/source-snapshots/{sourceId}/{version}
```

对象存储启用 versioning、服务端加密、恶意文件扫描和生命周期规则。下载只使用短时 signed URL，并在每次签发时重新验证 Workspace 和 ProjectAccess。

数据库事务与对象上传不能伪装成单一 ACID 事务。上传采用 `pending -> available / failed` 状态：对象写入和 hash 校验成功后才能把 Attachment 标记 available；失败必须可见、可重试，不能返回假成功。

## 8. Migration 与恢复

- 新仓库从全新 baseline migration 建立，不执行 legacy MS1-MS8 Migration。
- 生产 Migration 由 Kubernetes Job 独立执行，应用启动不自动 migrate。
- Schema 演进使用 expand-and-contract；应用回滚只回到仍兼容当前 Schema 的版本。
- 测试覆盖空库建立、上一生产版本升级、RLS policy、对象引用和真实恢复。
- PostgreSQL 使用 PITR；对象存储启用 versioning；季度演练验证 RPO/RTO 和 contentHash。

## 9. Legacy 数据

当前 `workspaces/requirements/phases/dispatches/work_items/task_handoffs/deliveries/memories/failure_records` 等表不迁移。旧数据只可导出为非权威、只读归档，不能导入新数据库后参与 Baseline、权限、审计或 Agent Context。
