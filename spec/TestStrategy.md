# 测试与生产准入规范

## 1. 四层门禁

- Layer 1 PR：format、lint、typecheck、build、unit、contract、architecture、secret、SAST。
- Layer 2 Integration：真实 PostgreSQL 17.6/RLS、对象存储、Migration、Outbox、SSE、Endpoint、Lease。
- Layer 3 Staging：Kubernetes 多用户、两个 Runtime、需求全流程、故障注入和多岗位体验。
- Layer 4 Release：最终镜像与签名、公证的 macOS Electron Artifact、安装升级、兼容、恢复状态和发布 smoke。

## 2. 证据

证据等级为 REAL_TEST、STRUCTURAL_CHECK、SCENARIO_REGISTERED、SKIPPED、MANUAL_REQUIRED；结果为 PASS、FAIL、BLOCKED、SKIPPED。两者不能混用。

报告必须绑定 commitSha、dirtyWorktreeHash、imageDigest、electronArtifactHash、schemaVersion、environmentId 和 toolVersions。代码或产物变化后旧报告 stale。

服务不可达、degraded、断言未运行、依赖缺失或 required step 跳过时 Harness 必须非零退出。

## 3. 容量基线

- 50 注册用户、20 同时在线用户。
- 10 个不同 Project 的并发 Execution。
- 100 条 SSE connection。
- 50 RPS 稳态、100 RPS 五分钟突发。
- 30 分钟稳定负载与 8 小时 soak。

Hub 读取 P95 < 500ms，写 Command P95 < 1000ms，SSE 可见 P95 < 2 秒，1000 Event replay < 10 秒，成功事实丢失为 0。

## 4. 必测风险

- 全部状态机合法/非法转换和并发冲突。
- Human/Endpoint/System actor 与角色权限矩阵。
- 每张 tenant-owned table 的 RLS CRUD。
- PostgreSQL 17.6 精确版本上的 Migration、RLS、事务、备份恢复和版本门禁；只在其他 minor 版本通过不得关闭 required gate。
- Idempotency、CAS、messageSeq、双 Worker claim 和 DLQ。
- Baseline 变更、P0 Context Delta、Lease/fencing、EnvironmentDrift。
- Electron IPC/navigation/CSP、Token rotation、IDOR、signed URL、Prompt Injection 和日志 Secret。
- Hub/Worker/DB/Object Store/Provider/Runtime 故障恢复。
- Codex SDK 使用真实 Project 和隔离 Profile；read-only sandbox 不能直接产生写副作用。
- 同一 OS 用户环境中多 AgentDefinition 共享单 Runtime 但 AgentRun/Profile 隔离；第二 Human Account 并发复用被拒绝，active AgentRun 存在时 reset/re-pair 失败关闭。
- 同一共享 Agent 被多个 Human 在同一 Session 并发 mention 时，每个 Invocation 只路由到各自 caller Endpoint，且不泄露创建者 ProjectBinding、ProviderProfile、credential 或 provider session。
- Agent/Skill/MCP 定义发布不可变、展示元数据变化的非阻断 `agent_metadata_updated`、执行配置变化的 `agent_definition_changed` Diff/重试、Invocation 版本锁定、运行中更新不漂移，以及授权撤销立即 fail closed。
- 正常终态后 Codex thread、临时 Profile/环境变量/Scratchpad 清理；后续 Invocation 不能读取前一 AgentRun 的 provider state。
- 个人网关 API Key 写入 OS 安全存储、Renderer/Hub/日志不可读，自定义 baseUrl/env_key 注入隔离，轮换/撤销后旧 Key 不能发起新 Provider 调用；非 HTTPS、非 allowlist host、redirect 逃逸和 TLS bypass 全部失败关闭。
- Codex SDK event 到 `AgentRunEvent` 的归一化、幂等 runSequence、终态映射和敏感字段脱敏；Hub 拒绝 Provider 原始 event。
- ExecutionUsage 准确归一 input/cached input/output/reasoning output token，验证 cached/reasoning 为子集且 total 不重复计数、缺失值不伪造、Gateway reconciliation 幂等，并拒绝其他成员和 Workspace admin 读取调用者 usage/cost 明细。
- Sartre MCP/ToolBroker 对 Execution、Lease、fencingToken、scope、capability 和 CredentialRef 的逐调用拒绝测试。
- Steward Projector 幂等、StructuredInference Zod 失败、Provider 降级、模型伪造 scope/cursor 被拒绝，以及“模型输出不能直接变更业务状态”。
- Steward Codex 单次推理在 2 分钟软超时后标记 delayed/degraded，5 分钟硬超时取消；不因“业务预算无上限”取消 context window、payload 大小、debounce 和并发保护。
- Steward 主动检测和 `@Steward` 均只使用平台 Service Credential；测试 Session 创建者退出、个人 Key 撤销/轮换、不同成员 mention 和 Service Credential 不可用时不会读取或回退到 Human Key，凭据明文不进入数据库、Renderer、日志、模型输出或诊断结果。
- 工作 Agent 使用 `gpt-5.5-2026-04-23`/`gpt-5.6-sol` 与 `medium/high` reasoning effort、Steward 使用 `sa-quality-2026-03 + high` 完成真实 Responses API 调用；报告同时记录 requested/resolved model id、expectedAliasOf、catalogDigest、reasoningEffort、ProviderProfile 和 usage，不以 `/models` 可见或 mock response 替代推理成功。`sa-coder` 只有在真实 Responses 与 Codex SDK 工具链都通过后才能重新进入候选策略。
- Agent 创建、发布和 mention 必须验证 model/reasoning 进入 executionConfigHash；Sol alias_of 变化返回 `agent_model_alias_changed` 和 Diff，旧 Invocation 不启动。运行中 catalog 变化不替换当前模型，但新的工具调用按安全撤销规则处理。
- 依赖与 architecture check 拒绝 PI/LangChain/第二套 Agent Loop 进入第一版运行链。

## 5. 统一真实验收项目

MS3-MS7 使用 `AcceptanceScenarioSpec.md` 定义的汽车维修供销 SaaS 纵向切片。前端、后端、测试三个真实用户必须在同一 Requirement 下分别使用各自 Agent 完成需求对齐、施工、报告、冲突处理、需求变更和两级验收；该项目的 mock、fixture 存在或单人串行脚本不能替代多人 REAL_TEST。

## 6. 第一版诊断门禁

每个 MS 引入的新纵向链路必须进入统一 DiagnosticTimeline。Staging 至少验证：

- 给定 `userId + timeRange`，能够定位相关 Workspace、Requirement/Session、Electron action/IPC、请求、事件和执行链。
- 能明确返回 lastSuccessfulStage、firstFailedStage、稳定 errorCode、currentState 和 suggestedRecoveryAction。
- Agent/Endpoint/System 事件能够通过 initiatedByUserId 回溯到发起用户。
- 未授权用户和 Workspace admin 调用跨 Workspace 诊断得到拒绝；平台运维查询产生不可变审计。
- 输出不包含完整消息、Prompt、文件内容、credential、本地路径或原始命令输出。
- 修复后使用新 correlationId 证明原失败点消失、目标终态达成且没有手工改库。

内部试运行前必须执行一次计时演练：已知 userId、大致时间和问题现象时，工程师或 Codex 在 10 分钟内定位首个失败点并给出证据和恢复建议。该项记录为 MANUAL_REQUIRED，不得用“CLI 文件存在”替代。

第一版只要求 `/readyz`、错误率、Outbox/DLQ、Runtime heartbeat、Execution stuck、Lease/fencing 和 Provider failure 基础监测。完整 OpenTelemetry Span 覆盖、多套 Dashboard、成本分析和高级采样不属于第一版 required gate。

## 7. 发布红线

跨租户、认证绕过、人工审批绕过、数据丢失、重复写副作用、旧 fencingToken 写入、Migration 不可恢复、Secret 泄露和签名产物失败不允许 waiver。

其他 P1 例外需 Requirement Owner、技术负责人和质量负责人共同批准，最长 7 天。Flaky required test 在修复前阻断发布，重跑不能隐藏首次失败。
