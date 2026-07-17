# Sartre 新仓库 Master Plan

> 本计划描述目标生产仓库的 MS0-MS8。所有状态初始为“未开始”；当前 legacy 仓库的旧 MS、OpenSpec 完成标记和历史 PASS 不继承。

## 1. 北极星

让开发、Java 测试、质量等岗位在同一 Workspace 和 Requirement 下，通过各自可控的 Sartre Agent 协作，并共享同一 Goal Contract、决定、放弃项、岗位任务、文件、执行结果和证据，避免人工下载报告、反复拉代码和不同本地 Agent 上下文失配。

首个生产版本必须形成一条用户可操作的完整链路：

```text
注册/登录/加入 Workspace
-> 创建 Requirement 并多岗位自然对话
-> 确认同一 goal-contract.md Baseline
-> 接受岗位任务
-> mention Sartre Agent
-> 只读分析或受 Lease 保护地修改本地 Project
-> 回传 ExecutionResult、Attachment 和 Evidence
-> 岗位负责人确认
-> Requirement Owner 验收或发起需求变更
```

## 2. 已确认决策

- 当前仓库是 legacy MVP，生产结论 **NO-GO**。
- 生产版本在 `/Users/xy/xykj/sartre` 重建；该目录已存在但尚未初始化 Git。不在旧状态机和 Migration 上渐进改造。
- legacy 应用代码自 2026-07-17 起功能冻结；目标 spec/设计文档在迁入新仓库前仍可修订。MS0 首先对 tracked/untracked 参考文件生成 freeze manifest，不把当前 dirty HEAD 冒充完整不可变基线。
- 不迁移旧测试/演示数据，不建立 Phase/Dispatch/Delivery 到新模型的兼容、双写或事件桥。
- 只按 PortingLedger 白名单移植基础设施代码；默认不迁移。
- Hub 是团队服务，Local Runtime 是用户设备上的执行器；只运行 Sartre Agent。
- 共享 Agent 只共享锁定版本的 Agent/Skill/MCP 定义；每次 mention 在调用者 Runtime 使用其自己的 ProjectBinding 和公司网关 Key 创建无状态 AgentRun。
- 同一逻辑 Project 同时最多一个 active 写 Lease；首版不支持 Lease transfer。
- 首版不建设 Git Server、PR/Merge、代码发布、外部部署编排、完整仓库同步和用户可见时间回溯。

完整设计和理由见 `docs/plans/2026-07-16-multi-user-ai-native-workspace-design.md`，权威约束见 `spec/README.md`。

## 3. 目标模块

| 模块 | 只负责 |
| --- | --- |
| `apps/hub-api` | 同步 Command/Query、认证授权、SSE、signed URL。 |
| `apps/hub-worker` | Outbox、Steward、通知、Attachment 后处理和投影。 |
| `apps/electron-app` | 登录、需求/会话/岗位任务 UI、Human Approval、Runtime 管理。 |
| `apps/local-runtime` | 本地 Project、个人 ProviderProfile、隔离 AgentRun、工具执行和离线队列。 |
| `packages/domain` | 纯状态机、不变量和领域错误。 |
| `packages/contracts` | Zod DTO、Command、EventEnvelope、Result 和错误合同。 |
| `packages/sdk` | Electron/Runtime 访问 Hub 的唯一客户端。 |
| `packages/runtime-core` | RepoRegistry、Execution、Lease、File/Command/Git/MCP。 |

任何 MS 都不得通过复制合同、绕过 SDK、把团队状态放进 Pod/Renderer/Runtime 内存，或把真实本地路径上传 Hub 来缩短实现。

## 4. 状态定义

| 状态 | 进入条件 |
| --- | --- |
| 未开始 | 尚无批准的实施计划或施工未开始。 |
| 进行中 | 当前 MS 有批准计划和 owner，正在产出代码与证据。 |
| Blocked | required 依赖或门禁无法满足，已记录 blocker、owner 和解除条件。 |
| 已关闭 | 用户可见结果、合同、真实依赖测试、故障/权限证据和 Harness 报告全部满足关闭条件。 |

MS 状态由当次 Production Gate 证据更新，不能因“代码大致存在”“接口返回 200”或计划作者手工声明而改变。

## 5. MS0：Repository Constitution 与证据基线

**依赖：** 无。它是所有后续 MS 的前置。

**用户可见结果：** 内部开发者能从干净环境启动 Hub API、Worker、Electron 和 Local Runtime；Electron 能明确显示四个进程的连接/健康状态，但不提供虚假的业务入口。

**核心交付：**

- 在 `/Users/xy/xykj/sartre` 初始化新 Git repository、模块边界、根 AGENTS、权威 spec 和 architecture check。
- CI、四层 Harness 骨架、证据 schema、fail-closed 自测、secret/SAST/依赖策略。
- PostgreSQL 17.6 baseline migration 工具、独立 Migration Job 骨架、精确版本检查和配置 crash-fast。
- PortingLedger，以及 legacy tracked/untracked freeze manifest、代码冻结说明和 README 新仓库指向。
- DiagnosticContext、稳定 errorCode、结构化边界日志、`ops:trace-*` CLI 骨架和基础 health 监测。

**本 MS 不做：** 身份、Requirement、聊天或 Agent 业务功能。

**关闭信号：** 空库可建立；四进程 health loop 可操作；模拟请求能按 correlationId 输出边界时间线；必需命令缺失、服务不可达、degraded、SKIPPED 时 Harness 确实失败；报告绑定当前 commit 和构建产物。

**状态：** 未开始。

## 6. MS1：Identity、Workspace 与 Tenant Boundary

**依赖：** MS0 已关闭；运维提供飞书 OAuth、公司邮箱、Secret 和内部 TLS 接入方式。

**用户可见结果：** 用户可以通过飞书或公司邮箱注册/登录，创建 Workspace，发送/接受邀请，查看成员和 Project Access，并把本机 Runtime 配对到已授权 Workspace。

**核心交付：**

- User/AuthIdentity/UserSession、Invitation/Membership、Workspace Role、ProjectAccess。
- Human Access/Refresh Token、Endpoint Credential/Token、撤销和 actor 审计。
- PostgreSQL RLS/FORCE RLS、集中 AuthorizationService、跨租户 deny-by-default。
- Electron 登录、Workspace Selector、成员管理和 Endpoint 配对最小流程。
- `ops.diagnostics.read` 平台运维权限、跨 Workspace 用户诊断审计和 User/Endpoint/System actor chain。

**本 MS 不做：** Requirement 对话、Agent 执行、业务 credential 共享。

**关闭信号：** 两个 Workspace、多个真实 User/Endpoint 的正反权限矩阵通过；IDOR/RLS/Token 重放与撤销真实测试通过；renderer 无法读取 Refresh/Endpoint Credential；普通成员/admin 不能执行用户诊断，平台运维查询会形成不可变审计。

**状态：** 未开始。

## 7. MS2：Requirement、Session 与正式会话账本

**依赖：** MS1 已关闭。

**用户可见结果：** 多名成员可以创建 Requirement，在系统/自定义文件夹中聊天、mention、上传共享文件；断线重连后消息顺序和未读状态保持一致。

**核心交付：**

- Requirement Draft、SessionFolder、Session、Message、Mention 和 Attachment 元数据。
- Workspace 内 `workspaceCursor`、DomainEvent、Transactional Outbox、SSE replay/resync。
- SDK REST/SSE 边界和 Electron 左侧需求/会话导航、中间对话区。
- Message 原子 seq、Command 幂等、expectedVersion 和对象上传状态机。
- 用户诊断时间线覆盖 Electron critical action/IPC、Command、DomainEvent、Outbox 和 SSE，并能指出 UI 到消息同步链的首个失败点。

**本 MS 不做：** Goal Contract 确认、岗位任务、Agent 读取本地 Project。

**关闭信号：** 20 用户并发消息无重复/乱序副作用；API Pod 重启和 cursor gap 可恢复；跨 Workspace 消息、附件和 SSE 访问全部拒绝；对象存储失败不返回上传成功；给定 userId 和时间范围可以还原消息发送/投递状态。

**状态：** 未开始。

## 8. MS3：Goal Contract、岗位对齐与岗位任务

**依赖：** MS2 已关闭。

**用户可见结果：** 各岗位在独立 Alignment Session 中自然聊天，平台阶段性生成版本化 `goal-contract.md`；全员确认同一 version/hash 后接受岗位任务，并能从“需求分析”“岗位任务”两个入口找回共识和责任。

**核心交付：**

- GoalContractArtifact、AlignmentBaseline/Checkpoint/Confirmation 和 Markdown Diff。
- Workstream Proposal、岗位负责人接受、AttentionItem 和 Action-first Inbox。
- Requirement/Workstream 状态机及 Human-only confirmation。
- 需求分析、岗位任务视图和右侧上下文抽屉骨架。

**本 MS 不做：** 管理员强制确认、写 Agent、Steward LLM 主动检测。

**关闭信号：** 不同 hash 不能确认；缺失 requiredAligner/required Workstream 不能 active；名单变化必须新建 Draft 并重新确认；Agent/Endpoint 不能伪造 Human Approval。

**状态：** 未开始。

## 9. MS4：Local Runtime、Project Binding 与只读 Agent

**依赖：** MS1-MS3 已关闭。

**用户可见结果：** 用户能把本地目录绑定到逻辑 Project，创建/共享 Sartre Agent、Skill 和 MCP 定义；有权限的成员 mention Agent 后，Agent 在调用者 Runtime 中使用其个人公司网关 Key 读取真实 Project，并把只读分析回传原 Session。

**核心交付：**

- companion daemon、RepoRegistry、LocalProjectBinding、fingerprint 和 Runtime health。
- Agent/Skill/MCP Definition 不可变版本、AgentUsagePolicy、caller Runtime 路由、更新 Diff、CredentialRef。
- TypeScript `@openai/codex-sdk`、CodexAgentEngine、个人公司网关 ProviderProfile、隔离执行 Profile，以及真实 Codex 读取、取消、超时、usage、归一化 `AgentRunEvent`、脱敏和离线队列。
- 创建 Agent 时可配置 `gpt-5.5-2026-04-23`/`gpt-5.6-sol` 与 `medium/high` reasoning effort，锁定 model policy/catalog/alias target；汽车维修供销 SaaS 测试 Project 的前端/后端/测试三岗位完成真实只读分析链。
- 标准 input/cached input/output/reasoning output token 归一化、调用者私有用量明细和终态无状态清理。
- Hub 只保存 binding metadata；`bindingId -> absolutePath` 仅在 Runtime 本地。
- 诊断时间线贯通 initiatedByUserId、AgentInvocation、caller Endpoint、Runtime 和 Provider 错误。

**本 MS 不做：** 文件写入、Project Lease、外部 Agent provider 市场、PI/LangChain、通用多 Provider Agent Loop 或第二个 Coding Agent Engine。

**关闭信号：** 两个 Runtime、共享 Agent、private/allowlist/workspace_all 正反场景通过；同 Session 两个成员并发 mention 同一 Agent 只在各自 caller Runtime 执行；离线 caller 不会转移执行；创建者的 Key/Project/provider state 不泄露；定义更新有 Diff/锁定；Agent 能读真实 repo，但不能越权读取路径/Secret 或打开写工具。

**状态：** 未开始。

## 10. MS5：Write Execution 与 Project Lease

**依赖：** MS4 已关闭。

**用户可见结果：** Agent 在对话中提交可理解的 ExecutionPlan；用户确认 Project 和文件范围后，Agent 受独占 Lease 保护地修改本地 Project，并回传统一 ExecutionResult。锁异常时有人工 release/revoke/force release 恢复入口。

**核心交付：**

- ContextSnapshot、ExecutionPlan、ProjectLease、heartbeat、TTL、fencingToken。
- read-only Codex sandbox、Runtime Sartre MCP/ToolBroker、File/Command/Git/MCP 写工具 enforcement、范围扩展和危险动作确认。
- ExecutionCheckpoint、EnvironmentDrift、ExecutionResult 摘要与大文件报告。
- Runtime/Hub 断线、崩溃、reconciliation 和旧 fencingToken 拒绝。
- `ops:trace-user` 与 `ops:trace-correlation` 贯通完整写链，并输出 lastSuccessfulStage、firstFailedStage、errorCode 和恢复建议。

**本 MS 不做：** Lease transfer、自动 Commit/PR/发布、多个 Project 的单次写 Execution。

**关闭信号：** 同 Project 双 Agent 竞争只有一个成功；scope 越界立即暂停；force release 后旧 Runtime 永久不能写；故障恢复不重复副作用；Result 持久化后才释放 Lease；诊断演练能在 10 分钟内从 userId 定位首个失败点并验证修复后的新链路。

**状态：** 未开始。

## 11. MS6：Steward、Context 与多人汇聚

**依赖：** MS3 与 MS5 已关闭。

**用户可见结果：** 每个 Session 的管家能在右侧抽屉中回答谁做了什么、当前决定/放弃项/阻塞/证据是什么，并通过弱交互请用户确认冲突、缺证和漂移；其他 Agent 读取同一已确认上下文。

**核心交付：**

- 每 Session StewardInstance、锚/账/集、Finding 和 Suggested/Confirmed Context。
- Deterministic Projector、Codex StructuredInferencePort 单次结构化推理和 Zod StewardAnalysis。
- 平台专用 Steward Service Credential、受管 Secret 注入、系统 usage 归属，以及主动检测/`@Steward` 禁止使用或回退 Human Key。
- 2 分钟软超时、5 分钟硬取消、每 Session 语义 Job 并发 1、debounce 和稳定 degraded/errorCode。
- 不设用户可配置 token/费用业务预算；保留 model context window、P0-P3 Working Set 和 payload 大小技术上限。
- ContextEntry `type/authority/status`、EvidenceRef、P0-P3 Assembly 和 Context Delta。
- 跨岗位冲突、目标漂移、重复放弃方案、结果缺失和 scope/Lease 异常检测。
- Requirement/Session/Workstream scope 的右侧抽屉与 Inbox 联动。

**本 MS 不做：** Steward 通用 Agent Loop、自由工具循环、raw chain-of-thought、隐藏 Steward 会话、向量数据库或无授权副作用插件。

**关闭信号：** 消息记录不会自动变成确认约束；P0 缺失/冲突/超技术上限时写 Execution 被阻断；Finding 可追溯来源；主动检测和不同成员 `@Steward` 只使用系统 Service Credential，Session 创建者退出、Human Key 撤销/轮换或服务凭据不可用时均不回退个人 Key；2/5 分钟超时语义正确；Provider 不可用时人工协作保持可用且不伪造总结。

**状态：** 未开始。

## 12. MS7：需求变更、两级验收与完整恢复

**依赖：** MS3-MS6 已关闭。

**用户可见结果：** 中途需求变化会展示 Markdown Diff 和岗位影响，受影响 Agent 暂停并重新确认；岗位负责人先验收岗位任务，Requirement Owner 再逐条核对成功标准。断线、崩溃和 Lease 异常都有一致恢复流程。

**核心交付：**

- RequirementChangeProposal、Impact Matrix、新 Baseline 重对齐和 Workstream reopen/cancel。
- Workstream completion claim/confirmation、Success Criteria Evidence Matrix、follow-up Requirement。
- Checkpoint reconciliation、SSE resync、DLQ retry、Lease force release 和完整 Audit。
- 多入口共用同一 AttentionItem 和恢复 action。

**本 MS 不做：** completed Requirement 原地重开、静默替换 Baseline、业务代码发布或外部系统部署编排。

**关闭信号：** blocking change 必定暂停受影响写入；旧 Snapshot/Plan 不能继续；Agent completed 不会自动完成岗位任务；岗位任务 done 不会自动完成 Requirement；恢复场景保持事实不丢、无重复副作用。

**状态：** 未开始。

## 13. MS8：Production Qualification

**依赖：** MS0-MS7 全部关闭；运维输入和签名账号可用。

**用户可见结果：** 内部试用成员安装签名应用，在公司 Kubernetes 环境完成完整多岗位需求流程；故障时看得到降级、恢复动作和状态，不依赖研发手工修库。

**核心交付：**

- Kubernetes Workload、Migration Job、不可变镜像、配置/Secret、发布回滚。
- 生产诊断 CLI、集中结构化日志、一个内部健康视图、基础告警、Runbook 和 PITR/对象存储恢复。
- 容量、8 小时 soak、故障注入、跨租户、安全和多岗位人工验收。
- Electron Apple Silicon arm64、最低 macOS 14 的签名、公证、安装升级和版本兼容矩阵；Intel Mac、Windows/Linux 不进入第一版 Release Gate。

**本 MS 不做：** 补做前置 MS 遗漏的租户、事务、幂等、审计或恢复基础；发现缺失时退回对应 MS。完整 OpenTelemetry Span 覆盖、多套 Dashboard、成本分析和高级采样不作为第一版门禁。

**关闭信号：** 四层 required gate 全部 PASS 且无 SKIPPED；P0 defect 与安全 High/Critical 为 0；证据绑定待发布镜像/安装包/Schema/环境；真实恢复、回滚、容量和三岗位人工验收通过。

**状态：** 未开始。

## 14. 跨 MS 红线

1. 安全、租户、事务、幂等、审计、失败可见和测试随能力首次出现时实现，不能统一推迟到 MS8。
2. 每个业务 MS 必须同时交付 Domain、Contract、Hub、SDK 和可操作入口，禁止只完成表、Controller 或静态 UI。
3. 所有 Human Approval 的 actor 来自 Human Session；Endpoint/Agent payload 不能代填 userId。
4. DomainEvent 是 SSE 重放来源，Outbox 只是投递；Pod 内存和 sticky session 不承担正确性。
5. Hub 不保存真实本地路径和业务 credential；Runtime 不拥有团队最终状态。
6. 不得把 STRUCTURAL_CHECK、历史报告或 optional SKIPPED 当作 required REAL_TEST PASS。
7. 每个新纵向流程必须携带 userId/initiatedByUserId、correlationId、causationId 和稳定 errorCode，并能进入统一用户诊断时间线。

## 15. 通用关闭条件

每个 MS 除专属关闭信号外，还必须具备：

- 批准的 spec、明确 nonGoals、被放弃方案与原因。
- 领域不变量、Contract、Migration 和真实依赖测试。
- 至少一个目标用户可操作的端到端纵向切片。
- 权限、并发、失败恢复和可观测证据。
- 给定 userId、时间范围和现象时，能定位该 MS 引入链路的最后成功步骤和首个失败步骤。
- 报告绑定当前 commit、dirty hash、镜像/Artifact hash、Schema version 和环境。
- required gate 无 SKIPPED；未完成项和风险有 owner、到期时间和下一 MS 输入合同。

## 16. 实施前置

1. 用户批准本轮同步后的权威规格和解释性文档。
2. 新 repository 固定为 `/Users/xy/xykj/sartre`；legacy 应用代码的功能冻结日期为 2026-07-17，MS0 创建覆盖 tracked/untracked 文件的 freeze manifest。
3. 使用 `superpowers:writing-plans` 为 MS0 生成文件级实施计划。
4. 建立 PortingLedger；禁止整目录复制 legacy 代码后再清理。
5. 与运维确认 PostgreSQL 形态、对象存储、Secret Manager、内部 DNS/TLS、观测平台和签名/更新源。

## 17. Legacy

旧 MS1-MS9、旧 plan、active OpenSpec change、BDD/Acceptance PASS 和 PLAN_LEDGER 状态不复制到新仓库。legacy 代码和报告仅作为问题证据与白名单移植来源，不是新 MS 的完成证据。
