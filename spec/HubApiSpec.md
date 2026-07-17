# Hub API 与 Worker 规范

## 1. 运行职责

- Hub API：同步 Command/Query、认证授权、signed URL 和 SSE。
- Hub Worker：Outbox、Steward、通知、Attachment 后处理、索引和投影重建。
- PostgreSQL：团队共享状态、DomainEvent、OutboxEvent、AuditEvent 和 RLS；Goal Contract Markdown 与确认元数据保存在同一事务边界。
- 对象存储：版本化 Attachment 与 ExecutionResult 文件。

API 和 Worker 不保存依赖 Pod 生命周期的业务事实。

第一版 PostgreSQL 兼容性基线固定为 **17.6**。本地开发、Layer 2 Integration、公司测试和 Release Gate 必须至少在精确的 17.6 实例上执行 Migration、RLS、事务和恢复测试；只在更新的 minor 版本通过不能替代 17.6 证据。连接到非批准版本时 readiness/required Harness 必须明确失败，而不是静默继续。

## 2. Human 认证

- 飞书 OAuth 使用系统浏览器、Authorization Code + PKCE、state、nonce 和公司 tenant 校验。
- 手动注册只允许验证后的公司邮箱，密码使用 Argon2id。
- Access Token 建议 10 分钟，只携带 User/Session 身份。
- 256-bit opaque Refresh Token 建议最长 30 天、空闲 7 天失效，每次使用轮换。
- 服务端只保存 Refresh Token hash；旧 Token 重放撤销整个 family。
- Electron Refresh Token 保存在系统安全存储，renderer 不可见。

## 3. Endpoint 认证

- 配对成功后签发独立 256-bit Endpoint Credential，Hub 只保存 hash。
- Credential 换取建议 10 分钟的 Endpoint Token。
- Endpoint Token 使用独立 audience 和 route allowlist，不持有 Human 权限。
- 支持单设备、单 Workspace Grant 撤销；撤销同步处理 Lease 和 fencingToken。
- 首版内部部署不使用密钥对/DPoP；跨公网或外部成员时重新评估。

## 4. Tenant 与授权

- Workspace 是租户边界，tenant-owned table 强制 workspace_id、RLS 和 FORCE ROW LEVEL SECURITY。
- Application Role 不拥有表且无 BYPASSRLS；Migration Role 分离。
- 每次 tenant transaction 使用 `SET LOCAL app.current_workspace_id` 与 actor id。
- AuthorizationService deny-by-default，统一验证 actor、action、resource 和 Workspace 归属。
- Workspace Role、Project Access、Work Role、AgentUsagePolicy 分别判定。
- AgentUsagePolicy 只授予定义触发权。Invocation 必须路由到 Human caller 当前 Endpoint，不授予创建者 Runtime/credential 的使用权。

请求体中的 workspaceId/userId/actorId 不构成授权。flat-resource API 必须先按 `{workspaceId, resourceId}` 加载。

## 5. Command 事务

```text
authenticate
-> tenant scope
-> authorize
-> idempotency/requestHash
-> domain invariant/expectedVersion
-> transaction: state + domain event + outbox + audit
```

相同 idempotencyKey 与相同 requestHash 返回原结果；key 相同但 payload 不同返回 409。消息序号使用数据库原子分配，禁止 `max(seq)+1`。

## 6. SSE

- EventEnvelope 持久化后才能推送。
- DomainEvent 是持久重放来源；OutboxEvent 只引用已提交事件并维护投递状态。
- 客户端使用 Last-Event-ID；任意 API Pod 都能按已认证 Workspace 重放。
- PostgreSQL LISTEN/NOTIFY 只做唤醒，定期 cursor poll 防通知丢失。
- 超过在线窗口返回 resync_required，客户端读取权威 Snapshot。
- sticky session 和内存 Subject 不能成为正确性前提。

## 7. Worker

- Outbox 使用 FOR UPDATE SKIP LOCKED、claim TTL、attemptCount、nextAttemptAt。
- 消费者按 eventId 幂等。
- transient failure 指数退避加 jitter；permanent failure 不重试。
- 默认 8 次后进入 DLQ，产生告警和 AttentionItem。
- 禁止静默失败；可降级投影必须有 ProjectionFailure。

## 8. Attachment

上传使用分片、大小限制、MIME sniffing、恶意文件扫描、contentHash 和 Workspace 对象前缀。下载签发短时 signed URL 时重新验证 Workspace/Project Access。

Hub 只保存 CredentialRef 元数据，不保存业务 Secret。本地路径不上传。

用户 Codex 公司网关 URL/API Key 由 Local Runtime 管理。Hub 只保存脱敏 ProviderProfileRef、CredentialRef 可用状态和归一化 ExecutionUsage，不能代理使用创建者 Key。

Steward 使用独立的平台服务账号调用 Codex。Steward Service Credential 由 Secret Manager、External Secrets 或 Kubernetes Secret 注入 Hub Worker，不保存在 Hub 业务表；主动检测和 `@Steward` 使用同一服务身份，并以 workspaceId、sessionId、analysisId 记录脱敏 usage。凭据不可用时语义 Job 明确 degraded，禁止回退到 Human 个人 Key。

ExecutionUsage Query 默认只允许 initiating user 读取；Workspace owner/admin 不因管理身份获得他人 token/cost/call detail。平台运维的跨用户查询需要独立权限、reason 和不可变审计。

## 9. 健康与观测

- `/livez` 只判断进程。
- `/readyz` 验证配置、Migration 兼容和必要依赖。
- `/ops/health` 仅运维可见，返回 Outbox/Worker/SSE/Storage/Runtime/Provider 脱敏降级状态。
- 第一版使用统一 DiagnosticContext、稳定 errorCode 和结构化边界日志；完整 OpenTelemetry Metric/Trace 覆盖后续扩展。
- 日志和诊断结果禁止正文、Prompt、Secret、本地路径和原始命令输出。

第一版提供受保护的 ops-only Query：按 `userId + timeRange` 或 `correlationId` 汇聚 Electron critical action/IPC、身份、Command、DomainEvent、Outbox/SSE、Invocation、Runtime、Execution/Lease、Provider 和 Result 的脱敏时间线。登录和 Workspace Selector 等尚未建立 TenantContext 的事件进入全局 system diagnostic/security 记录；建立 Workspace Scope 后只读取对应 tenant-owned 记录。

诊断 Query 只生成可重建 Projection，不修改业务状态。CLI 必须调用相同 Hub API，不得直连数据库。跨 Workspace 用户诊断只允许 `ops.diagnostics.read` 平台权限；普通 Workspace owner/admin 无权调用。每次查询记录 operator、reason、timeRange、accessedWorkspaces、resultCount 和 correlationId 到不可变平台审计。

Smoke 在不可达、degraded、Migration 不兼容或核心依赖失败时必须非零退出。

## 10. Kubernetes 与发布

- Hub API 内部基线 1 replica，可配置为 2；正确性不依赖副本数。
- Worker 独立 Deployment；Migration 独立 Job。
- non-root、read-only filesystem、NetworkPolicy、资源限制、不可变镜像 digest。
- Migration expand-and-contract；生产不自动 down migration。
- 缺少认证、数据库、对象存储、加密或限流配置时 fail closed。

## 11. Legacy 禁止

生产模式禁止 Workspace Token、无 Guard Controller、local-demo tenant、Phase/Dispatch/Delivery API、内存 cursor、应用启动自动 Migration 和开发安全默认值。
