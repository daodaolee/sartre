# Sartre 多用户 AI Native Workspace 目标设计

> 日期：2026-07-16
>
> 状态：目标设计 1-13 与第 14 节范围决策已经用户确认，并已同步到 `spec/` 权威规格。
>
> 目的：保存完整设计、决策理由和被放弃方案，不描述当前代码实现完成度。
>
> 阅读边界：发生冲突时以 `spec/` 为准；当前 legacy 代码的历史问题以
> `reports/production-readiness-audit-2026-07-16.md` 为准；新仓库的实施顺序以
> `plan/00-master-plan.md` 为准。设计已确认不等于代码已实现或生产门禁已通过。

## 阅读摘要

**要解决的问题：** 多个岗位分别使用本地 Agent 时，需求、决定、文件、进度和结果依靠人工下载、拉取和转发，导致重复劳动、信息遗漏和不同 Agent 的上下文分叉。

**目标运行形态：** 公司内部 Hub 保存团队共享记录和治理状态；每个用户通过 Electron App 工作；每次 Sartre Agent mention 在调用者 Local Runtime 中使用其自己的本地 Project 和公司网关 credential 创建独立 AgentRun。Hub 不同步整份仓库，Runtime 不自行决定团队状态。

**核心协作流程：**

```text
自然对话创建 Requirement
-> 多岗位确认同一 goal-contract.md
-> 接受岗位任务
-> mention Sartre Agent
-> 只读分析或确认 ExecutionPlan 后获取 Project Lease
-> 本地施工并回传 ExecutionResult / Attachment / Evidence
-> 岗位负责人确认
-> Requirement Owner 验收或发起需求变更
```

**权威边界：** Message 是 Canonical Record，只证明系统记录了该消息；经 Human 确认的内容才是 Confirmed Context；身份、权限、版本、hash、cursor 和 Lease 是 Mechanical Fact。PostgreSQL 保存共享状态和文本记录，对象存储保存明确共享的大文件正文，本地路径和 credential 只在 Runtime。

**当前结论：** 目标设计可进入 MS0 实施计划；当前 legacy 代码和尚未创建的新仓库都不能发布。只有 MS0-MS8 关闭并以待发布产物通过四层门禁，才能重新判断生产可用。

## 1. 目标设计 1：系统边界与领域所有权

### 1.1 核心问题

Sartre 要解决的是多名真实用户分别使用自己的 Sartre Agent 完成不同 Project 的工作时，如何共享同一 Requirement 下的目标、约束、决定、放弃项、文件、进度、报告和证据，避免不同 Agent 形成认知分叉。

Sartre 的产品定义是：

> 为多人 Agent 协作提供共享认知、执行边界、状态账本、证据关系和治理能力的团队级 Harness。

Sartre 不是普通聊天工具，也不是只负责启动 Agent 的桌面壳。

### 1.2 首版明确不做

- 不建设 Git Server。
- 不管理 Branch、Commit、PR、Merge、代码发布或外部系统部署；Sartre 仍负责 Requirement 与岗位任务的完成验收和证据关联。
- 不接入外部 Agent；只运行 Sartre Agent。
- 不允许同一 Project 存在多个并发写 Execution。
- 不自动同步完整本地仓库。
- 不保存 raw chain-of-thought。
- 不建设用户可见的时间回溯和历史状态恢复。
- 不统一开发、Java 测试、质量等岗位的专业报告格式。
- 不在首版引入向量数据库。
- 不在首版建设完整 OpenTelemetry Span 覆盖、多套 Dashboard、成本分析和高级采样；只建设用户全链路诊断、修复验证和基础监测。

以上内容只有出现明确的重新评估触发条件，并形成新的 DecisionRecord 后，才能重新进入范围。

### 1.3 限界上下文

目标领域划分为：

1. Identity & Access
2. Workspace & Project
3. Requirement & Alignment
4. Conversation & Shared Context
5. Agent & Capability
6. Execution & Lease
7. Content & Evidence
8. Audit & Event

原 Artifact & Integration 上下文改为 Content & Evidence。Artifact 不再承担发布、验收或 Git 集成语义。

### 1.4 记录、结论与本地信息的所有权

这里的核心规则是：**需要让多个人和多个 Agent 共同看到、确认或依赖的信息放在 Hub；只属于某个人电脑和某次本地执行的信息留在 Local Runtime。**

“保存在 Hub”只说明该记录由 Hub 持久化和排序，不自动说明消息内容正确。设计明确区分：

| 类别 | 含义 | 例子 |
| --- | --- | --- |
| Canonical Record | Hub 对“记录了什么、发生了什么、当前状态是什么”的唯一正式记录。 | Session 消息、状态转换、Execution 事件、AuditEvent。 |
| Confirmed Context | 经有权 Human 明确确认，其他成员和 Agent 可以作为团队约束依赖的语义内容。 | Goal Contract、确认决定、放弃项与原因、确认阻塞。 |
| Mechanical Fact | 由确定性程序维护的精确状态；LLM 只能读取，不能生成或改写。 | 身份、权限、版本、hash、cursor、Lease、fencingToken。 |

一条消息可以是 Canonical Record，但其观点仍可能错误；Agent 或 Steward 的总结可以被保存，但确认前只能是 Suggested Context。确定性工具结果以 `tool_observed` 保存“工具观察到了什么”，不能被扩大解释为未验证的业务结论。

Hub 系统由 PostgreSQL 和对象存储组成，保存以下团队共享信息：

- PostgreSQL：用户身份、Workspace 成员和权限。
- PostgreSQL：需求、`goal-contract.md` 版本、岗位确认、岗位任务和状态。
- PostgreSQL：会话消息、已确认的决定、放弃项、阻塞和待处理事项。
- PostgreSQL：Agent 的 ExecutionPlan、执行状态、修改范围、Project Lease 和 ExecutionResult。
- PostgreSQL：共享内容的名称、版本、hash、权限、来源引用和审计记录。
- 对象存储：用户或 Agent 明确上传并共享的报告、文件和飞书内容快照。

Hub **不保存或同步整份本地代码仓库**。只有用户或 Agent 明确共享的文件、变更摘要、报告和证据才会上传。

Local Runtime 只保存在当前用户电脑上的信息：

- 本地 Project 的真实目录和未共享源代码。
- credential、环境变量和本地 CLI 登录状态。
- Agent 进程、provider session、工具运行中间状态和 Execution Scratchpad。
- Hub 断线期间尚未回传的本地事件队列。

Steward 或 Agent 生成的总结、判断和建议不会直接成为团队结论。它们先标记为 Suggested Context；有权用户确认后才成为 Confirmed Context。原始建议、确认人、版本和 supersedes 关系都保留在 Hub。

provider session 只是本地 Agent 的运行上下文，不是团队会话记录。未明确共享的本地内容不会被其他成员或 Agent 看到。

### 1.5 统一术语

- Canonical Record：Hub 对消息、事件和状态的唯一正式记录，只证明系统记录了什么，不保证其中的自然语言主张为真。
- Confirmed Context：经有权 Human 确认，可作为团队约束和其他 Agent 正式输入的语义内容。
- Mechanical Fact：由程序或确定性工具维护的精确状态，例如权限、版本、hash、cursor、Lease 和 fencingToken；LLM 不得生成或修改。
- Requirement：一个需求从提出、对齐、施工到验收的完整生命周期容器；用户界面统一显示为“需求”。
- Session：需求中的一段持续对话；用户界面统一显示为“会话”，每个会话拥有独立 Steward。
- Suggested Context：Agent 或 Steward 提议但尚未经人确认的内容，只能作为线索。
- ContextSnapshot：某次 Execution 使用的不可变上下文引用集合，不是历史恢复点。
- ContextEntry：一条共享语义内容。
- Attachment：ContextEntry 引用的文件版本。
- EvidenceRef：指向来源、版本、适用范围和引用位置的证据引用。
- Execution：一次 Sartre Agent 运行。
- Execution Scratchpad：当前 Execution 的临时工作记忆，不自动共享。
- Project Lease：同一 Project 的全局独占写授权。
- Goal Contract：Requirement 的目标、成功标准、非目标和约束契约。
- Workstream：Requirement 下由一个岗位负责人承担的一条长期责任线；用户界面统一显示为“岗位任务”。

## 2. 目标设计 2：Requirement、Baseline 与 Workstream

### 2.1 Requirement 状态机

```text
draft -> aligning -> active -> verifying -> completed
           ^          |          |
           +----------+----------+

draft / aligning / active / verifying -> cancelled
```

- draft：创建者编辑初始目标，尚未进入多方对齐。
- aligning：requiredAligners 正在对齐同一个 Baseline Draft。
- active：存在 confirmed Baseline，且所有 required Workstream Proposal 已经由负责人接受；各岗位任务可以施工。
- verifying：必需 Workstream 已提交结果，Requirement Owner 正在核对 successCriteria。
- completed：必需 Workstream 全部 done，且 Requirement Owner 明确确认 successCriteria。
- cancelled：Requirement 被主动终止；必须记录原因。

任何状态转换都必须通过领域状态机，不能由 Application Service 直接改字段。

### 2.2 AlignmentBaseline 状态机

```text
draft -> proposed -> confirmed -> superseded
```

AlignmentBaseline 以一份版本化的 `goal-contract.md` 作为人类可读的 Confirmed Context 工件。Markdown 至少包含：

```text
目标
成功标准
明确不做
约束
已确认决定
放弃项与原因
未决问题
来源与证据
```

`goal-contract.md` 的 Markdown 正文和版本保存在 PostgreSQL，以便正文、hash 和确认记录在同一事务边界内校验。平台只额外保存 `goalContractArtifactId`、`baselineVersion`、`contentHash`、requiredAligners 和确认记录等机械元数据，不复制一套可独立修改的 Goal Contract 业务字段。

进入 confirmed 的条件是所有 requiredAligners 对同一个 Baseline 版本完成确认。

Baseline 不提供强制确认。requiredAligners 发生人员不可用或职责变化时，Requirement Owner 或 Workspace admin 只能审计地修改新 Baseline Draft 的 requiredAligners，并记录原因；修改后的完整名单仍需对同一个版本和 hash 全员确认。

confirmed Baseline 不能原地修改。任何变更必须创建新 draft。新版本 confirmed 后，旧版本进入 superseded。

### 2.3 Workstream 状态机

```text
planned -> running -> awaiting_review -> done
             |  ^          |
             v  |          v
           blocked       running

planned / running / blocked / awaiting_review -> cancelled
done -> planned 仅允许由 confirmed Requirement Change 触发
```

- planned：已定义负责人和目标，但尚未施工；纯分析或报告任务可以不绑定 Project，需要写文件时必须绑定唯一 `primaryProjectId`。
- running：存在有效 Execution 或负责人正在推进。
- blocked：存在明确阻塞项，必须记录 blocker 和 owner。
- awaiting_review：岗位结果已提交，等待该 Workstream 的负责人确认。
- awaiting_review 返回 running：负责人要求继续施工，必须记录未通过原因。
- done：负责人确认岗位结果已经完成。
- cancelled：该 Workstream 不再需要，必须记录原因。

平台只要求公共 ExecutionResult，不统一岗位专业验收结构。岗位 Agent 可以通过 Skill 定义自己的检查清单和报告格式。

### 2.4 Baseline 变更期间的执行

新 Baseline Draft 不会静默覆盖当前 confirmed Baseline。只有新版本 confirmed 后，旧版本才进入 superseded。

变更涉及 goal、successCriteria、nonGoals、constraints、required Workstream、Project 写边界或 confirmed Decision 时，Requirement 返回 aligning。所有受影响的写 Execution 在完成当前原子工具调用后进入 context_refresh_required，并禁用新的写操作。

context_refresh_required 不会静默替换 Agent 上下文，也不允许继续使用旧 Baseline 写入。用户只能选择：

- 审阅 Baseline Diff 和影响矩阵，刷新 ContextSnapshot，并重新确认 ExecutionPlan 后继续。
- 终止当前 Execution，根据新 Baseline 重新生成 ExecutionPlan。

只读影响分析可以继续，但产生的结论必须标记为基于 pending Baseline Draft。变更 Proposal 被驳回时，Requirement 恢复到原状态；受影响 Execution 仍需用户明确恢复，不能自动开启写工具。

## 3. 目标设计 3：身份、Workspace 与权限

### 3.1 身份来源

首版支持：

- 飞书 OAuth，仅允许公司 tenant。
- 手动注册，仅允许验证后的公司邮箱域名。
- Workspace 邀请加入。

### 3.2 权限分层

```text
Workspace Access Role: owner / admin / member
Project Access: viewer / contributor / maintainer
Work Role: 开发 / Java 测试 / 质量 / 其他业务标签
```

Work Role 只描述岗位，不直接授予访问权限。

只有 contributor 和 maintainer 可以申请 Project 写 Lease。

Workspace 成员默认可读取 Workspace 内的 Confirmed Context。未共享本地文件、credential、环境变量和 Execution Scratchpad 不可见。

### 3.3 用户偏好

用户偏好是独立作用域，只能影响语言、展示和个人交互方式。

用户偏好不能覆盖 Workspace Policy、Requirement Baseline、Project 约束或权限规则。

### 3.4 Agent 使用策略

AgentUsagePolicy 只允许以下三种值：

```text
private
workspace_allowlist
workspace_all
```

- private：只有 owner 可以 mention。
- workspace_allowlist：只有策略中列出的 Workspace 成员可以 mention。
- workspace_all：所有 Workspace 成员可以 mention。

AgentDefinition、Skill 和 MCP 配置可以共享。Endpoint、credential、本地路径和密钥归 owner 所有，不随 AgentDefinition 共享。

## 4. 目标设计 4：Conversation 与 Steward

### 4.1 生命周期和范围

每个 Session 创建时同步创建一个 StewardInstance，生命周期与 Session 一致。

Steward 是 Session 的系统 Agent 和参与者，不建立第二套隐藏会话，也不是用户创建的工作 Agent。

Steward 默认读取：

- 当前 Session 的正式 Message ledger；
- 所属 Requirement 的 Confirmed Context；
- 与当前 Session 有关的 Execution、Lease、Attachment 和 EvidenceRef。

Steward 不跨 Requirement 读取内容。

### 4.2 锚、账、集

- 锚：Goal Contract、successCriteria、nonGoals 和 constraints。
- 账：Decision、Progress、Conflict 和 Failure 等 append-only 记录。
- 集：当前阶段最值得用户和 Agent 看到的 Working Set。

原始事实由确定性 Event Projector 保存。LLM 只负责增量分析、总结、冲突检测和建议。

首版 Steward 不运行 Codex Coding Agent 或通用 Agent Loop。处理链固定为：

```text
Message / DomainEvent / Execution / Lease delta
-> deterministic Projector
-> Timeline / Working Set
-> debounce semantic-analysis job when needed
-> StructuredInferencePort one-shot call
-> Zod validate StewardAnalysis
-> Suggested Finding / Context
```

谁做了什么、Lease 状态、Execution 停滞、Result 缺失和 Baseline stale 等机械问题由确定性规则处理。只有 goal drift、跨岗位冲突、决定、放弃项和证据语义等问题调用 Codex 模型。Worker 在调用前绑定 Workspace/Requirement/Session scope、cursor 和 inputDigest；模型只返回 findings/answerDraft，不能自报 actor 或 scope。

每个语义 Job 只调用一次模型，同一 Session 并发上限为 1。主动检测和用户 `@Steward` 均由 Hub Worker 使用平台专用 Steward Service Credential，不使用 Session 创建者、mention 调用者或其他 Human 的个人 Key，也不在服务凭据不可用时自动回退。Service Credential 通过 Secret Manager/Kubernetes Secret 注入，不进入业务数据库、Renderer、日志、模型输出或会话消息；usage 归属系统并关联 workspaceId、sessionId 和 analysisId。2 分钟未完成时向用户显示 delayed/degraded，5 分钟到达硬 deadline 后取消并记录稳定 errorCode。首版不设用户可配置 token/费用业务预算，但仍受 model context window、P0-P3 Working Set、payload 大小和 debounce 保护。模型调用失败只使语义 Finding degraded，不影响正式消息、投影和人工协作。

### 4.3 主动检测

Steward 必须支持以下检测类型：

- goal_drift：当前讨论或执行偏离 Goal Contract。
- rejected_approach_repeated：重复提出已放弃方案。
- cross_role_conflict：不同岗位结论冲突。
- evidence_missing：结论缺少 EvidenceRef。
- context_stale：内容或 Execution 使用旧 Baseline。
- milestone_stalled：Execution 长时间没有推进。
- execution_result_missing：Agent 结束但没有 ExecutionResult。
- lease_anomaly：Lease、heartbeat、fencing token 或 force release 异常。
- scope_drift：实际写入范围超出 ExecutionPlan。

### 4.4 Finding 状态

```text
suggested -> confirmed
          \-> dismissed
confirmed -> superseded
```

只有 confirmed StewardFinding 才能升为 Confirmed Context。

### 4.5 插件能力

- 只读能力默认允许执行。
- 所有副作用默认需要人工确认。
- 只有 Workspace 管理员显式授权的窄范围动作可以自动执行。
- 所有插件动作必须留下参数、结果和 actor 审计。

副作用插件使用显式 `detect -> propose -> human confirm -> execute -> audit` Workflow，不允许 Steward 使用自由工具循环自行选择和连续执行动作。

Steward 不读取 raw chain-of-thought、credential 和未共享文件。

## 5. 目标设计 5：Local Agent Runtime 与 Project Lease

### 5.1 Runtime 边界

Connector 演进为隐藏 companion daemon。Electron 通过 authenticated local IPC 控制 Runtime。

Runtime 负责：

- RepoRegistry
- ExecutionScheduler
- LeaseClient
- SartreAgentAdapter
- CodexAgentEngine
- FileService
- CommandService
- GitService
- MCPService
- RuntimeEventQueue

GitService 只提供岗位 Agent 所需的本地 Git 命令能力，不承担 Hub Git 托管、发布或集成语义。

一个 Local Runtime Node daemon 承载当前设备 OS 用户环境下的所有 AgentRun。Electron 创建 Agent 时只保存 AgentDefinition；只有收到 Invocation 后，Runtime 才通过 TypeScript `@openai/codex-sdk` 创建本地 Codex thread。

首版不允许多个 Human Account 在同一 OS 用户环境中并发共享 Runtime 身份、RepoRegistry、CredentialRef 或运行状态。切换账号需要显式 reset/re-pair；必须先停止 active AgentRun 并完成 reconciliation，再撤销旧 Endpoint Credential 和清理账号绑定的本地状态。

共享 Agent 共享的是 AgentDefinitionVersion 及其精确锁定的 Skill/MCP DefinitionVersion，不共享创建者 Runtime、ProjectBinding、ProviderProfile、credential 或 provider session。每次 mention 都路由到调用者当前 Endpoint；同一 Session 多人同时 mention 同一 Agent 会生成互相隔离的 Execution/AgentRun，在 Runtime 资源上限内并行。

第一版用户工作 Agent 只实现 CodexAgentEngine，不引入 PI、LangChain、通用多 Provider Agent Loop 或其他 Coding Agent Engine。Codex SDK 拥有模型推理和 coding loop；Runtime 拥有调度、工具权限和本地资源；Hub 拥有团队状态。

每个用户在 Runtime 中配置自己的公司 Codex 网关 `baseUrl + API Key`。baseUrl 必须使用 HTTPS 并匹配 Platform/Workspace Policy 的公司网关 host allowlist，不允许 TLS bypass 或 redirect 到非 allowlist host。Runtime 为每个 AgentRun 生成隔离 ProviderProfile，使用 `wire_api=responses` 和指向临时环境变量的 `env_key`。Key 只存在 OS 安全存储，不进入 Hub、Renderer、共享定义、仓库配置或日志。

Agent/Skill/MCP 定义使用不可变发布版本。mention Command 带 expectedAgentDefinitionVersionId 和 expectedExecutionConfigHash。如只有展示元数据变化，Hub 锁定最新版并返回非阻断 `agent_metadata_updated`；如执行配置已变更，Hub 返回 `agent_definition_changed` 和 Diff，用户确认最新版后重试。Invocation 启动后固定全部版本，不接受运行中漂移。

### 5.2 写 Execution 流程

```text
生成 ContextSnapshot
-> Runtime 装配隔离 Codex Profile
-> CodexAgentEngine 创建 read-only Codex thread
-> Codex 只读分析并提交 ExecutionPlan 和修改范围
-> 用户确认
-> 获取 Project Lease
-> Runtime ToolBroker 开启受控 Sartre MCP 写工具
-> 执行并持续 heartbeat
-> 提交 ExecutionResult
-> 释放 Project Lease
```

隔离 Profile 只包含当前 Agent 获准的 instructions、ContextSnapshot、Skill、MCP、Project 和 CredentialRef，不默认继承 Owner 完整 `~/.codex`、环境变量、个人 Skill 或未授权 MCP。

Codex 保持 read-only sandbox。文件写入、命令、Git 和其他 MCP 副作用只能经 Runtime 管理的 Sartre MCP/ToolBroker；每次调用重新校验 Execution、Lease、fencingToken、scope、capability 和 CredentialRef。Codex thread 是临时 provider state，不是 Session history 或恢复事实源。

正常终态、Result/event 回传与 reconciliation 完成后，Runtime 销毁当次 Codex thread、临时 Profile/环境变量和 Scratchpad。后续 mention 重新从 Hub ContextSnapshot 创建 AgentRun，不继承上一轮 provider state。

写入声明范围之外的文件时，Runtime 必须：

1. 完成当前原子工具调用；
2. 禁用新的写操作；
3. 提交范围扩展请求；
4. 等待用户批准；
5. 更新 ExecutionPlan 后恢复。

不能只记录警告后继续写入。

### 5.3 Lease 规则

同一 Project 同时最多存在一个有效写 Lease。

Lease 必须包含：

```text
leaseId
projectId
executionId
holderUserId
holderAgentId
expiresAt
heartbeatAt
fencingToken
status
```

首版必须支持 heartbeat、TTL、release、revoke 和 force release。

首版不支持 Lease transfer。换人执行使用“撤销或释放旧 Lease，再重新 acquire”两步完成，避免两个 holder 的本地状态被误认为连续。

过期或被 revoke 的 fencingToken 不能继续提交写事件或 ExecutionResult。

### 5.4 断线与外部修改

Hub 断线后，Runtime 禁止开始新的写操作。已经产生的事件进入本地持久队列，恢复后按 eventId 幂等回传。

Project Lease 只约束 Sartre Agent，不能阻止用户从终端、IDE 或外部工具修改文件。

Runtime 使用文件 watcher 和 Git status 检测外部修改，并生成 EnvironmentDrift。

### 5.5 Scratchpad

Execution Scratchpad 只在当前 Execution 有效，有 TTL 和 token budget。

Agent 可以从 Scratchpad 提出 Suggested Context，但不能直接写入 Confirmed Context。

首版不要求 Agent 创建 Commit、Branch 或 Publication。

## 6. 目标设计 6：Hub 数据、事件与一致性

### 6.1 持久化选择

采用 PostgreSQL 权威状态表、append-only DomainEvent 和 Transactional Outbox。

PostgreSQL 保存结构化事实；对象存储保存 Attachment；首版不引入 Git 存储和向量数据库。

### 6.2 写命令链

```text
Authentication
-> Workspace Scope
-> Authorization
-> Idempotency
-> Domain Invariant
-> expectedVersion
-> 同事务写入 State + DomainEvent + OutboxEvent
```

任何跨 Workspace 的裸资源 ID 操作都必须拒绝。

每个可重试写命令必须携带 idempotencyKey。

每个可并发修改的聚合必须携带 expectedVersion，并通过 CAS 检查。

### 6.3 统一 EventEnvelope

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

事件类别覆盖 perception、memory、progress、reasoning、execution 和 steward。

不为每类 Trace 建设独立事件底座。不同 Trace 是 EventEnvelope 的投影。

`workspaceCursor` 是 Workspace 内持久、单调递增且唯一的重放位置，由 Hub 在持久化 DomainEvent 时分配。消息使用 Session 内单调递增 messageSeq，聚合使用 aggregateVersion；系统不依赖跨 Workspace 的全局绝对顺序。

DomainEvent 是业务事件的持久记录和 SSE 重放来源。OutboxEvent 是引用 DomainEvent 的异步投递工作项，只维护 claim、重试和投递状态，不是第二份业务事实源。

### 6.4 投影与 LLM 输出

Steward Timeline、Requirement Working Set、Workspace Activity Feed 和 ContextSnapshot Candidate Set 都是可重建投影。

LLM Summary 必须保存 sourceCursor、baselineVersion、model 和 promptVersion。

源事实变化后，旧 Summary 标记为 stale，但不删除。

### 6.5 时间回溯

首版保留 append-only events、版本和审计，不提供 Checkpoint revert、Session branch 或用户可见的历史恢复。

## 7. 目标设计 7：内容同步与 Evidence

### 7.1 ContextEntry

```text
workspaceId
requirementId
sessionId
projectId
authorUserId
authorAgentId
executionId
type
authority
title
body
sourceRefs
evidenceRefs
visibility
status
supersedes
createdAt
```

`type` 描述语义类型，例如 decision、rejected_approach、blocker、risk、observation、progress 或 result_summary；`authority` 只允许：

```text
policy
human_confirmed
tool_observed
agent_reported
steward_inferred
```

`status` 只允许 `suggested / active / dismissed / superseded`，只描述生命周期。`authority=human_confirmed + status=active` 才是 Confirmed Context；`tool_observed` 或 `agent_reported` 即使处于 active，也只保持各自的来源权威。Session 消息本身保存在 Message ledger，不使用 `conversation_fact` 冒充 ContextEntry 状态；只有从消息中提取出的可共享语义内容才创建 ContextEntry，并保留 sourceRefs。

### 7.2 自动同步

- Session 消息和 mention。
- Execution 和 Project Lease 状态。
- 已确认的 ExecutionPlan。
- 修改范围及其变更。
- 经过敏感信息过滤的文件变更摘要。
- 确定性 Tool/Command Observation。
- EnvironmentDrift。

### 7.3 明确共享

- 目标和约束。
- 决策及其理由。
- 放弃方案及放弃原因。
- 报告、测试结果和风险。
- 用户选择共享的文件。
- Agent 最终施工总结。

### 7.4 禁止同步

- raw chain-of-thought。
- credential 和环境变量。
- 完整本地仓库。
- 用户未选择的本地文件。
- 未过滤的终端输出。
- Execution Scratchpad。

### 7.5 ExecutionResult

```text
goal
changes
decisions
rejectedApproaches
blockers
verification
nextActions
evidenceRefs
attachmentRefs
status
extension
```

`extension` 是按岗位或 Skill namespace 扩展的对象；公共消费者必须能忽略未知扩展。大文件报告正文进入对象存储，ExecutionResult 的公共摘要、引用、hash 和状态保存在 PostgreSQL。

Agent 报告可以立即被其他成员看到，但必须标记为 `authority=agent_reported, status=active`。其他 Agent 可以将其作为线索，不能将其当作已确认约束。

### 7.6 Evidence Contract

每个 EvidenceRef 必须包含：

```text
source
version
scope
citation
contentHash
```

Attachment 修改必须创建新版本。旧版本通过 supersedes 保留，不引入 Published、Accepted 或 Integrated 状态。

## 8. 目标设计 8：共享记忆与 ContextSnapshot

### 8.1 记忆层级

```text
Policy / Workspace
Requirement / Baseline
Project / Workstream
Session
Execution Scratchpad
```

用户偏好是独立侧向作用域，不参与以上层级覆盖。

权威顺序固定为：

```text
policy
> human_confirmed
> tool_observed
> agent_reported
> steward_inferred
```

低权威内容不能覆盖高权威内容。

### 8.2 ContextSnapshot

```text
snapshotId
workspaceId
requirementId
sessionId
projectId
workstreamId
assembledForUserId
assembledForAgentId
executionId
baselineVersion
policyVersion
workspaceCursor
budgetProfile
entries[]
snapshotHash
```

每个 entry 保存 contextEntryId、version、contentHash、priority、authority、inclusionReason、sourceRefs 和 handle。

Snapshot 保存引用和 hash，不复制来源正文。Snapshot 不可修改，刷新必须创建新 Snapshot。

### 8.3 组装管线

```text
读取候选内容
-> Workspace 权限过滤
-> Requirement / Project / Session Scope 过滤
-> 过期与 superseded 过滤
-> Authority 和冲突检查
-> P0-P3 分诊
-> 必要的语义压缩
-> Token Budget 装配
-> 生成 Manifest 与 hash
```

P0 由确定性规则选取。LLM 可以建议 P1/P2 优先级，但不能移除 P0。

### 8.4 P0-P3

P0 必须完整进入：

- Goal Contract。
- successCriteria、nonGoals 和 constraints。
- Workspace Policy。
- 当前 Project 写权限和修改范围。
- 已确认阻塞项。
- 改变执行边界的确认决策。

P1 直接进入：

- 当前 Workstream 状态。
- 其他 Workstream 的最新 ExecutionResult。
- 已确认决策和放弃项。
- 当前冲突、风险和待处理问题。
- 相关 Attachment 摘要。
- 带 agent_reported 标记的相关 Agent 报告。

P2 压缩后进入：

- 较早 Session 内容。
- 历史 Workstream 进展。
- 旧报告和已经解决的问题。
- 间接相关背景。

压缩锚必须保留 goal、changes、decisions、rejectedApproaches、blockers、nextActions、evidenceRefs 和 sourceHandles。

P3 只提供 handle：

- 完整聊天记录。
- 完整报告。
- 原始日志。
- 大型文件。
- 历史 Execution Trace。
- 其他 Project 的非当前材料。

首版提供 context.get、context.search、ledger.read、attachment.read 和 execution.inspect，不引入向量数据库。

### 8.5 Token Budget

```text
inputBudget =
contextLimit
- reservedOutput
- toolSchemas
- safetyMargin
```

默认目标配额：

```text
P0: 20%
P1: 50%
P2: 25%
P3 handle index: 5%
```

这些百分比用于日常装配和监控，不是硬上限。组装器先完整装配 P0，再使用剩余预算装配 P1-P3；P0 不允许因目标配额不足被删除。P0 超出总输入预算时阻止启动 Execution，并要求精简或重构 Baseline，不能靠截断获得可写上下文。

P1 超限内容降为 P2；P2 超限内容降为 P3 handle。

### 8.6 Execution 期间的 Context Delta

Hub 在 Confirmed Context 变化时发送 ContextDeltaAvailable。

- P0 变化：Execution 标记 context_refresh_required；当前原子工具调用完成后禁用新的写操作；用户审阅差异并创建新 Snapshot。
- P1 变化：下一次模型调用前注入带来源的 Context Delta，并记录 Agent acknowledgment。
- P2/P3 变化：不打断 Execution，只更新可检索 handle。

Baseline 变化不能静默替换 Agent 上下文。

### 8.7 写入和升层

用户消息、Lease/Execution 状态、Attachment 元数据和 EnvironmentDrift 可以自动成为 Canonical Record，但消息正文不会因此成为 Confirmed Context。确定性工具结果以 `tool_observed` ContextEntry 保存观察结果，其业务解释仍需按权限和确认规则处理。

Agent 结论、Steward 总结、新约束、决策、放弃项、根因和失败教训只能先以 `status=suggested` 进入。经过弱交互确认后创建 `authority=human_confirmed, status=active` 的新版本，并 supersede 原建议；不能只原地改一个标签。

### 8.8 阻断条件

以下情况禁止生成可写 Execution 的 Snapshot：

- Goal Contract 缺失。
- Baseline 未确认。
- 用户没有 Project 写权限。
- P0 存在未解决冲突。
- Project 已有有效写 Lease。
- P0 超出预算。
- 必需 Attachment 缺失或 contentHash 不匹配。

非关键冲突进入 conflictBundle。Agent 可以分析和补证，但不能基于冲突内容执行写操作。

每次组装必须产生 ContextAssemblyEvent，记录候选、选中、降级、丢弃、压缩和失败原因。

## 9. 目标设计 9：Electron 多用户工作流与信息架构

### 9.1 需求优先的主界面与上下文抽屉

Electron App 的默认工作面由两个常驻区域和一个可折叠区域组成：

- 左侧菜单栏：Workspace 切换、Inbox、需求导航、会话导航和次级资源入口。
- 中间主界面：承载当前选中的需求视图、会话消息、Attachment、Agent Execution 和人工确认操作。
- 右侧上下文抽屉：从主界面右侧展开，承载当前对象关联的 Steward、需求、岗位任务、内容和活动信息；不作为第二套导航或聊天记录。

右侧抽屉默认可折叠，并记忆当前用户在当前设备上的开关状态和宽度。窄窗口中改为覆盖式抽屉，不能持续压缩主界面到不可用宽度。

主界面右上角提供常用图标按钮打开抽屉的对应 Panel。首版至少包含“管家上下文”“内容与证据”“活动”和“当前执行”；按钮使用 lucide 图标、tooltip 和待处理 badge，不用多个带文字的圆角按钮占据标题栏。

Requirement 是主导航对象，用户界面显示为“需求”。Agent、Skill 和 MCP 不占据默认工作台主层级，而是归入次级资源入口，在创建 Agent、mention 或配置 Workspace 时按需调用。

左侧菜单栏在每个需求下同时提供两类入口：

- 需求整理视图：只提供“需求分析”和“岗位任务”两个入口。
- 会话视图：系统文件夹、自定义文件夹和其中的 Session。

“需求分析”收拢 `goal-contract.md`、岗位对齐进度、confirmed Decision、rejectedApproach、未决问题和来源证据；“岗位任务”收拢 Workstream 状态、负责人、依赖、阻塞、ExecutionResult 和验收结果。

这两个整理视图是 Hub 权威状态表和 Confirmed Context 的投影，不复制 Markdown、岗位任务或验收数据。点击后在中间主界面打开对应整理视图；切回任何 Session 时，左侧仍保留当前需求、Baseline 版本、岗位任务进度和待处理数，避免用户因切换会话丢失需求主线。

左侧菜单必须同时表达层级和状态，但不能把状态只交给颜色：需求展示生命周期状态和待处理数；岗位任务展示负责人、状态和阻塞；Session 展示未读、运行中和待确认状态；会话文件夹只负责收拢，不拥有独立业务状态。

### 9.2 可折叠 Steward 上下文抽屉

用户从主界面右上角打开 Steward Panel 后，上下文抽屉采用 `Scope + Tabs`：

- Scope 根据主界面当前对象提供“当前会话”“当前岗位任务”和“整个需求”；不存在的层级不显示，默认进入最窄有效 Scope。
- Tab 固定为“当前”“决定”“内容”“活动”。
- 待确认 Finding 固定置顶，不因切换 Tab 丢失。

各 Tab 的职责严格分离：

- 当前：Goal Contract、已确认边界、Workstream 状态、阻塞项、有效 Lease 和最新 ExecutionResult。
- 决定：confirmed Decision、rejectedApproach、superseded 关系和确认人。
- 内容：Attachment、ContextEntry、ExecutionResult 与 EvidenceRef。
- 活动：按时间回答谁做了什么，只展示活动事件，不混入当前约束的唯一副本。

每一项必须展示 scope、authority、status、version、sourceRefs 和时间，并支持跳转回原始消息、报告或 Execution。Steward 总结不能成为不可追溯的隐藏事实。

用户可以在面板中确认、编辑建议后确认、驳回或暂不处理。confirmed 内容不能原地编辑，修改必须生成新版本并 supersede 旧版本。

关闭抽屉只改变个人界面状态，不停止 Steward、不清除 AttentionItem，也不改变任何业务状态。用户从需求整理视图或其他 Session 打开抽屉时，Panel 必须切换到新主界面对象的 scope，不能继续显示旧会话信息造成误操作。

### 9.3 岗位分会话与共同 Baseline

Requirement 进入 aligning 时创建“对齐”会话文件夹。每个 requiredAligner 必须拥有一个主责 Alignment Session，并明确 userId、Work Role 和预计提交时间。

Alignment Session 不是私有会话：拥有 Requirement 读取权限的成员可以查看内容。分会话只分离岗位分析责任，不分裂 Requirement 的 Confirmed Context。每个 Session 仍拥有独立 StewardInstance；各 Session 可以 mention 同一个 Requirement Analysis Agent，但 Message ledger、Steward Finding 和 Session Working Set 不能混写。

每个 requiredAligner 在自己的 Alignment Session 中与 Requirement Analysis Agent 进行多轮自然对话。Steward 根据对话持续提出 Suggested Context；用户不需要额外填写一份结构化岗位表单。

当某岗位认为当前需求已经理解完整时，主责用户提交 AlignmentCheckpoint：

```text
requirementId
sessionId
alignerUserId
workRole
baselineDraftVersion
baselineContentHash
sourceCursor
proposedChangeRefs
status
```

Requirement Analysis Agent 根据各 Session 中 confirmed Context 和 proposedChangeRefs，阶段性生成新的 `goal-contract.md` Draft，并逐项保留 sourceRefs。它不需要在每条消息后重写文件，只有目标、成功标准、约束、决定、放弃项或未决问题发生实质变化时才创建新版本。

缺少 requiredAligner 的 AlignmentCheckpoint、存在未解决跨岗位冲突或 Evidence 缺失时，Requirement 保持 aligning，不能创建可写 Execution。

所有 requiredAligners 必须确认完全相同的 `baselineVersion + contentHash`。任意内容修改都会创建新的 Baseline Draft 版本，并使旧版本确认失效。全部确认后 Requirement 才进入 active，各 Workstream 才能开始施工。

平台不提供“管理员强制确认”。人员不可用时，Requirement Owner 或 Workspace admin 可以发起 requiredAligners 名单变更，界面必须展示移除/新增人员、原因和影响；该操作创建新 Baseline Draft 和 AuditEvent，变更后的全体 requiredAligners 仍需确认同一版本与 hash。

### 9.4 会话内 Execution 卡片

用户在 Workstream Session 中 mention Agent 后，Agent 可以先执行不需要 Project Lease 的只读分析。需要写文件前，Agent 必须在原始对话位置提交 ExecutionPlan 卡片。

ExecutionPlan 至少展示并保存：

```text
executionId
triggerMessageId
requirementId
workstreamId
sessionId
userId
agentId
baselineVersion
contextSnapshotId
projectId
goal
allowedPathGlobs
plannedCommands
requestedCapabilities
riskSummary
expectedOutputs
```

用户必须能够确认并开始、编辑范围或取消。确认后 Runtime 先验证本地 Project、ContextSnapshot、EnvironmentDrift 和权限，再由 Hub 获取独占 Project Lease。任何一步失败都保留在同一张卡中，并给出可执行的恢复动作。

Execution 卡片按以下状态原地演进，不新增一组脱离上下文的系统消息：

```text
analyzing_readonly
-> awaiting_plan_approval
-> acquiring_lease
-> running
-> awaiting_scope_approval
-> context_refresh_required
-> blocked
-> completed / failed / cancelled
```

Session 顶部同时提供紧凑的当前 Execution 状态条，展示 Agent、Project、Lease heartbeat、运行时长和需要用户处理的事项。状态条和消息卡片是同一 Hub 状态的两个投影。

默认只展示阶段、当前动作、变更文件、heartbeat 和结果摘要。完整工具调用、stdout、stderr 和命令记录进入按需展开的 Execution Detail，不持续占用聊天区域。

范围扩展、P0 Context Delta、Lease 异常和危险命令必须让卡片进入阻塞状态。在用户处理前禁用新的写操作。审批结果必须更新 ExecutionPlan 或 ContextSnapshot，不能只关闭提示后继续。

正常完成时，Agent 先提交公共 ExecutionResult，Hub 确认持久化后再释放 Lease。失败、取消或断线恢复遵循同一个 Execution 状态，不允许前端通过隐藏卡片伪装结束。

同一 Project 已存在有效写 Lease 时，新的写 Execution 不得启动。卡片需要显示当前 holder、Workstream、开始时间和到期时间；只有具备权限的用户才能进入 revoke 或 force release 流程。

### 9.5 Action-first Inbox

Inbox 首先服务跨 Session、跨 Requirement 的个人待处理事项，不作为 Workspace 全量活动日志。

一级分类固定为：

- 需要我处理：由当前用户负责且尚未解决的 AttentionItem。
- 提及我：用户或 Agent 对当前用户的 mention。
- 关注更新：用户主动关注的 Requirement、Workstream、Session 或 Execution 的重要变化。
- 已处理：当前用户最近解决、驳回或取消的 AttentionItem。

需要业务动作的事项必须保存为由 Hub 唯一维护状态的 AttentionItem：

```text
attentionItemId
workspaceId
requirementId
sessionId
sourceType
sourceId
actionType
assigneeUserId
priority
dueAt
dedupeKey
status
aggregateVersion
createdAt
resolvedAt
```

状态只允许：

```text
open -> snoozed -> open
open / snoozed -> resolved / rejected / cancelled / expired
```

Inbox、Execution 卡片和 Steward 面板只投影同一个 AttentionItem。用户从任一入口处理后，所有入口必须通过同一个 domain command 同步更新；不能由前端分别维护三份已处理状态。

mention 和关注更新不是业务门禁，只保存为 per-user InboxEntry 和 read cursor。读取、归档或清空通知不能改变 Requirement、Execution、Lease 或 Finding 的业务状态。

暂缓 AttentionItem 只改变提醒时间，不解除对应阻塞。范围扩展、P0 Context Delta、Baseline 确认和 Lease 异常仍然保持原状态，直到用户执行对应 domain action。

每个 InboxEntry 必须显示 Workspace、Requirement、Session、来源 actor、等待动作和时间，并支持 deep link 到原始消息、Execution 卡片、Steward Finding 或报告。跨 Workspace 聚合只发生在当前用户已经有权限的资源上。

### 9.6 对话驱动的 Requirement 创建

创建 Requirement 时只要求标题、初始需求描述和可选来源材料。系统保存 Draft，并同步创建“需求分析”Session 和 Session Steward；不要求用户先完成多步骤结构化表单。

中间工作区始终以自然对话为主。Requirement Owner、requiredAligners 和 Requirement Analysis Agent 可以围绕同一需求进行多轮讨论，直到各岗位都能明确解释目标、成功标准、边界、决定、放弃项和未决问题。

Agent 根据对话进展阶段性生成或更新 `goal-contract.md`。该文件是自然聊天的总结沉淀，不是要求用户持续维护的表单，也不能把 Agent 的每次即时推断自动写成 confirmed 内容。

`goal-contract.md` 每次更新都创建不可变版本，保存 contentHash、sourceCursor、sourceRefs、生成模型和 promptVersion。用户可以查看 Markdown diff、回到来源消息并提出修改。旧版本保留审计但不能原地编辑。

界面右侧只显示当前 Goal Contract 的摘要、版本、确认状态和待解决问题；完整内容以 Markdown 阅读视图打开。Goal Contract 的语义正文只保存一份，工作流所需的 version、hash、requiredAligner 和确认状态由程序单独维护。

### 9.7 飞书来源接入边界

当前团队主要通过飞书文档和对话描述需求。首版允许用户粘贴飞书链接或上传导出内容作为 Attachment；后续通过可插拔 `lark-mcp` 读取授权范围内的文档和会话。

从飞书读取的内容必须保存 sourceUrl、tenantId、resourceToken、sourceVersion、contentHash、fetchedAt 和 actor。它首先是来源 Evidence，不会直接覆盖 `goal-contract.md`。

飞书原文变化时生成 SourceChanged Finding，由用户决定是否重新分析并提出新的 Goal Contract Draft。平台不做静默双向同步，也不把飞书权限自动映射成 Sartre Workspace 权限。

### 9.8 岗位任务的产生与确认

`Workstream` 是内部领域名，Electron App 和面向用户的文档统一显示为“岗位任务”。它表示一个 Requirement 下由某个岗位负责人持续承担的一条交付责任，不等于 Session、Agent、Project 或单次 Execution。

Goal Contract 进入 proposed 后，Requirement Analysis Agent 根据 requiredAligners、successCriteria、约束和涉及的 Project 生成最小 Workstream Proposal 集合。Proposal 只是建议，不能直接分配责任或启动 Agent。

每个 Proposal 至少包含：

```text
title
workRole
proposedOwnerUserId
required
goal
successCriteria
primaryProjectId
dependencies
expectedOutputs
sourceRefs
```

Requirement Owner 负责确认 Proposal 集合是否覆盖完整、是否重复以及依赖是否合理；被分配的岗位负责人负责接受或拒绝自己的 Proposal。只有双方确认后，Proposal 才转为 planned Workstream。

首版每条岗位任务最多绑定一个可写 `primaryProjectId`。纯分析、报告或质量验收任务可以不绑定 Project。需要修改多个 Project 时必须拆成多条岗位任务；每次写 Execution 仍然只获取一个 Project Lease。

岗位负责人可以为自己的岗位任务选择本人有权使用的 Agent，但 AgentDefinition 不成为 Workstream 的永久所有者。更换 Agent 不改变岗位任务的责任、历史 Session 和已提交结果。

Requirement 从 aligning 进入 active 前，必须同时满足：

- `goal-contract.md` 已 confirmed。
- 所有 requiredAligners 确认同一个 baselineVersion 和 contentHash。
- Requirement Owner 已确认 required Workstream Proposal 覆盖完整。
- 每个 required Workstream Proposal 已被对应负责人接受。

可选岗位任务可以在 active 后继续创建，但不能被偷偷提升为 Requirement 完成门禁；required 标记变更必须创建新的 Baseline Draft 并重新确认。

### 9.9 两级完成验收

Agent 正常结束并提交 ExecutionResult 只会把 Execution 标记为 completed，不会自动完成岗位任务。ExecutionResult 可以携带 `completionClaim`，表示 Agent 认为当前结果已经满足岗位任务目标。

存在 completionClaim 时，岗位任务进入 awaiting_review。岗位负责人必须检查变更摘要、结果、EvidenceRef、未解决风险和 `goal-contract.md` 中与本岗位有关的成功标准，然后选择：

- 确认完成：Workstream 进入 done，并保存确认人、确认时间和结果引用。
- 继续施工：Workstream 返回 running，记录未通过原因并创建新的 AttentionItem。
- 标记阻塞：Workstream 进入 blocked，记录 blocker、owner 和解除条件。
- 取消任务：必须记录原因；required Workstream 被取消时 Requirement 不能继续完成验收，除非创建新 Baseline 并重新确认范围。

只有所有 required Workstream 都进入 done 后，Requirement 才从 active 进入 verifying。

verifying 阶段生成 Success Criteria Evidence Matrix，将 `goal-contract.md` 中的每条成功标准映射到岗位任务结果、Attachment、EvidenceRef 和确认人。Requirement Owner 必须逐项检查后选择：

- 确认完成：Requirement 进入 completed。
- 退回岗位任务：指定一个或多个 Workstream 返回 running，并记录缺失证据或未满足标准。
- 修改需求边界：创建新的 Goal Contract Draft，Requirement 返回 aligning，原 Baseline 进入 superseded 流程。
- 取消 Requirement：进入 cancelled 并记录原因。

Steward 和 Requirement Analysis Agent 可以生成验收建议、发现证据缺失或指出冲突，但不能代替岗位负责人和 Requirement Owner 执行最终确认。

completed Requirement 不原地恢复为 active。完成后发现的新问题创建关联的 follow-up Requirement，并引用原 Requirement、Baseline 和相关 Evidence，避免修改已经完成的审计事实。

### 9.10 共享逻辑 Project 与本地绑定

Hub 中的 Project 表示 Workspace 共同识别的逻辑项目，不保存某个用户电脑上的绝对路径。Project Lease、Project Access 和岗位任务都引用这个逻辑 projectId。

每个需要使用本地 Agent 的用户，在自己的 Runtime Endpoint 上创建 LocalProjectBinding：

Hub 保存：

```text
bindingId
workspaceId
projectId
userId
endpointId
fingerprint
fingerprintMethod
status
lastValidatedAt
lastSeenAt
```

Runtime 本地 Registry 保存：

```text
bindingId
absolutePath
localValidationState
```

`absolutePath` 不上传 Hub。Hub 通过 `bindingId + endpointId` 引用本地绑定，只保存指纹、校验状态和健康信息；任何 Hub API、日志、AuditEvent 或 Agent 上下文都不能返回真实绝对路径。

Project maintainer 首次登记逻辑 Project 时生成 expected fingerprint。fingerprint 可以来自标准化 Git remote hash、仓库根标识或管理员确认的目录特征，但平台不要求自建 Git Server，也不自动向业务仓写入标识文件。

用户绑定本地目录时，Runtime 必须执行以下检查：

```text
选择逻辑 Project
-> 选择本地目录
-> Runtime 读取目录并生成 fingerprint
-> 与 Project expected fingerprint 比对
-> 检查目录可读写性和当前 EnvironmentDrift
-> 创建 healthy LocalProjectBinding
```

fingerprint 不匹配、目录不存在、权限不足或 Runtime 离线时，Binding 进入 invalid 或 offline，禁止启动写 Execution。maintainer 可以审核并更新 expected fingerprint，但必须记录旧值、新值、原因和 AuditEvent。

同一个逻辑 Project 可以被多个用户、多个 Endpoint 绑定到不同本地路径；所有 Binding 仍然竞争同一个全局 Project Lease。Runtime 只有在 Lease 的 projectId 与本地 Binding 的 projectId、endpointId 和 fencingToken 同时匹配时才开放写工具。

用户更换电脑或移动目录时创建或重新验证 LocalProjectBinding，不改变 Project、Requirement、岗位任务和历史 Execution 的团队身份。

### 9.11 渐进式注册、邀请与本地配置

首次启动 Electron App 时，用户可以通过公司飞书 OAuth 或验证后的公司邮箱完成登录。认证成功后进入 Workspace Selector，可以创建 Workspace、接受邀请或进入已有 Workspace。

WorkspaceInvitation 至少包含：

```text
invitationId
workspaceId
inviteeIdentity
workspaceAccessRole
projectAccessGrants
workRoleLabels
invitedBy
expiresAt
status
```

状态只允许：

```text
pending -> accepted / declined / revoked / expired
```

接受邀请只创建 Workspace Membership 和显式 Project Access，不自动获得任何本地目录、credential、Agent 使用权或 Project 写权限。Work Role 标签不能替代授权。

成员接受邀请后可以立即：

- 浏览自己有权读取的 Requirement、Session 和 Confirmed Context。
- 参与 Requirement 对话和岗位对齐。
- 查看允许共享的 AgentDefinition、Skill 和 MCPDefinition。
- 创建不需要本地文件写入的内容和只读分析 Session。

以下动作才触发本地配置门禁：

- 接受绑定可写 Project 的岗位任务。
- 创建或确认包含文件写能力的 ExecutionPlan。
- 调用需要本地 Endpoint、credential 或 CLI 的 Agent 能力。

写 Execution 启动前必须同时验证：

```text
Workspace Membership active
Project Access >= contributor
AgentUsagePolicy 允许当前用户
Runtime Endpoint online 且版本兼容
LocalProjectBinding healthy
ContextSnapshot 可写门禁通过
Project Lease 可获取
```

任一条件缺失时，界面在原 Execution 卡片中给出对应修复入口，不把用户重定向到与当前任务脱节的全局配置页。只读访问不因 Runtime 离线而被阻断。

### 9.12 会话文件夹与团队可见性

每个 Requirement 默认创建以下系统文件夹：

```text
需求分析
岗位对齐
岗位任务
验收
```

系统文件夹保存稳定的 folderType，不能删除。用户可以创建自定义文件夹收拢补充 Session。首版只支持 Requirement 下一级文件夹，不支持任意深度嵌套。

文件夹只组织 Session，不拥有 Requirement、Workstream 或 Execution 状态。移动 Session 不会改变 Baseline、岗位责任、Project Lease、确认记录或完成门禁。

同一 Workspace 成员默认可以看到：

- Requirement 基本信息、`goal-contract.md` 和版本历史。
- 系统与自定义文件夹、Session 列表和正式 Message ledger。
- 岗位任务负责人、状态、依赖、阻塞和公共 ExecutionResult。
- Confirmed Context、Decision、rejectedApproach、Finding 和共享 Attachment。
- 谁在什么时间进行了什么确认、执行或变更。

以下内容不因 Requirement 可见而自动公开：

- credential、环境变量和本地绝对路径。
- Execution Scratchpad、raw chain-of-thought 和 provider 私有 session。
- 用户未明确共享的本地文件和工作中间产物。
- 当前成员没有 Project viewer 权限的原始代码、原始日志和受限 Attachment。

没有 Project viewer 权限的成员仍可看到岗位任务状态和经过过滤的公共 ExecutionResult，但受限内容显示权限占位，不返回可推断敏感信息的摘要。

首版不提供 Requirement 内的私有 Session。个人草稿可以保存在本地，但在明确共享前不能进入 Steward、Goal Contract、ContextSnapshot 或其他 Agent 的上下文。

### 9.13 需求中途变更

任何 Workspace 成员、Agent 或 Steward 都可以提出 RequirementChangeProposal，但 Agent 和 Steward 只能创建 suggested Proposal，不能直接改变当前 Baseline。

Proposal 至少保存：

```text
proposalId
requirementId
baseBaselineVersion
baseContentHash
proposedGoalContractArtifactId
proposedContentHash
reason
sourceRefs
proposedBy
impactLevel
affectedSuccessCriteria
affectedWorkstreamIds
affectedProjectIds
affectedExecutionIds
status
```

状态流为：

```text
suggested -> impact_review -> awaiting_alignment -> confirmed -> applied
          \-> rejected / cancelled
```

Requirement Analysis Agent 和各 Session Steward 生成 Markdown Diff 与 Impact Matrix，至少回答：

- 哪些目标、成功标准、非目标、约束、决定或放弃项发生变化。
- 哪些岗位任务保持有效、需要刷新上下文、需要重新施工、新增或取消。
- 哪些 running Execution 使用旧 Baseline。
- 哪些已完成结果不再足以支持新的成功标准。
- 变化来自哪条消息、飞书来源、Attachment 或 EvidenceRef。

Requirement Owner 在 impact_review 阶段确认影响等级：

- non_blocking：仅补充来源、修正文案或澄清不改变施工边界的内容。当前 confirmed Baseline 继续生效，施工可以继续；新 Markdown 仍需 requiredAligners 确认后才能替换旧版本。
- blocking：改变目标、成功标准、非目标、约束、required Workstream、Project 写边界或 confirmed Decision。Requirement 返回 aligning，受影响写 Execution 进入 context_refresh_required。

Impact Analyzer 可以提出等级建议，但核心章节、required Workstream 或 Project 写边界发生变化时，领域规则必须强制最低等级为 blocking。Requirement Owner 可以提高影响等级，不能把确定性的 blocking 变化降级为 non_blocking。

无论影响等级如何，confirmed `goal-contract.md` 都不可原地修改。任何正文变化都创建新版本，所有 requiredAligners 必须确认同一个 `baselineVersion + contentHash`。

新 Baseline confirmed 后：

- 旧 Baseline 进入 superseded，但历史 Session、ExecutionResult 和 Evidence 保留。
- 未受影响的岗位任务保留状态并记录新 baselineVersion 的重新确认。
- 受影响的 done 岗位任务可以由该 Requirement Change 审计地重新进入 planned。
- 新增岗位任务按 Workstream Proposal 流程确认负责人。
- 被移除岗位任务进入 cancelled，但保留旧 Baseline 下的历史结果。
- 所有继续施工的 Agent 必须使用新 ContextSnapshot 和重新确认的 ExecutionPlan。

飞书原文变化只创建 SourceChanged Finding 和 suggested RequirementChangeProposal，不会自动修改 Goal Contract。completed Requirement 不接受原地需求变更，必须创建关联的 follow-up Requirement。

### 9.14 异常恢复与人工 Lease 操作

异常状态必须由 Hub 和 Runtime 的确定性信号检测，不能只依赖 Steward 从对话中推断。至少覆盖：

- Runtime Endpoint offline 或版本不兼容。
- Lease heartbeat 超时、TTL 到期、holder 失联或 fencing token 失效。
- Agent 进程崩溃、用户主动停止或 Electron App 重启。
- Hub 断线、SSE cursor gap、事件回传失败或投影滞后。
- 原子工具调用结果未知、文件 hash 不一致或 EnvironmentDrift。
- ExecutionResult 缺失、Attachment 上传未完成或 EvidenceRef 失效。
- Baseline、ExecutionPlan 或 LocalProjectBinding 变为 stale。

每个异常必须生成可审计的领域状态和 AttentionItem，在原 Execution 卡片、Steward“当前”Tab 和 Action-first Inbox 中投影同一个恢复入口。

#### 9.14.1 Agent 或 Runtime 崩溃

Runtime 在每个原子工具调用结束后持久化 ExecutionCheckpoint，保存 plan step、tool name、参数摘要、结果摘要、相关文件 hash、event cursor 和时间，但不保存 raw chain-of-thought。

Agent 崩溃后 Execution 进入 interrupted。系统不能假设最后一次工具调用成功，也不能自动重放可能产生副作用的命令。

用户只能选择：

- 恢复同一 Execution：要求原 Endpoint 可用、Lease 仍有效、fencingToken 匹配、ContextSnapshot 未 stale，并通过文件状态 reconciliation。
- 终止并重新计划：结束旧 Execution，释放或撤销 Lease，基于当前文件状态创建新 ContextSnapshot 和 ExecutionPlan。
- 标记需要人工检查：Execution 进入 blocked，指定负责人和检查项。

Provider session 不是恢复依据。恢复上下文来自 Session Message ledger、ContextSnapshot、ExecutionCheckpoint、工具结果和当前文件状态。

#### 9.14.2 Hub 断线

Hub 连接丢失后，Runtime 完成当前原子工具调用并禁用新的写操作。本地事件进入持久队列，但新的写命令、范围扩展和 ExecutionResult 完成确认必须等待重新连接。

恢复连接后，Runtime 先同步 server cursor、验证 Lease 和 fencingToken、上传幂等事件并执行 EnvironmentDrift 检查。任一检查失败时保持 blocked，不能仅因网络恢复就继续写入。

Electron App 通过 lastEventId 恢复 SSE。发现 cursor gap 时必须请求权威 Snapshot 重建投影，不能把本地缓存当作最新事实。

#### 9.14.3 人工 Lease 操作

用户不能任意编辑 Lease status。平台提供以下领域动作：

- release：holder 正常结束并主动释放。
- revoke：Project maintainer 或 Workspace admin 撤销当前 Lease。
- force release：holder 不可用或状态异常时强制结束 Lease。

首版没有 transfer action 或预留 contract。换人执行必须先 release/revoke 旧 Lease，再由新 Execution acquire 新 Lease；新 holder 必须重新验证自己的 LocalProjectBinding、ContextSnapshot、ExecutionPlan 和本地文件状态。

执行 revoke 或 force release 前必须展示 leaseId、Project、holder 用户、Agent、Endpoint、Execution、最后 heartbeat、expiresAt、本地未上报事件和已知文件变更。

force release 必须填写原因并进行二次确认。Hub 在同一事务中：

```text
标记旧 Lease revoked
-> 递增 Project fencing token
-> 将旧 Execution 标记 interrupted 或 cancelled
-> 生成 AuditEvent 和 AttentionItem
-> 发布 LeaseRevoked 事件
```

旧 Runtime 即使稍后恢复，也不能使用旧 fencingToken 提交写事件或 ExecutionResult。

强制释放后不能立即盲目启动新 Agent。新的写 Execution 必须先检查 LocalProjectBinding、Git/file status、未提交修改和 EnvironmentDrift，并由用户确认当前目录状态。

#### 9.14.4 恢复结果

所有恢复操作都必须记录 actor、原因、发生前状态、发生后状态、相关 cursor、fencingToken 和 EvidenceRef。异常可以解决、驳回或升级，但不能通过关闭通知删除事实。

Steward 可以解释异常、汇总影响并建议恢复路径；真正改变 Execution、Lease 和 Project 状态的动作必须由领域服务执行。

## 10. 目标设计 10：多租户安全与权限隔离

### 10.1 共享 Schema 与 PostgreSQL RLS

Sartre 采用共享 PostgreSQL Schema。Workspace 是租户边界；所有 Workspace 所有的数据表必须包含非空 `workspace_id`，并启用 PostgreSQL Row Level Security。

全局表只允许保存不属于某个 Workspace 的身份和系统配置，例如：

- users
- auth_identities
- user_sessions
- oauth_provider_configs
- schema_migrations

Requirement、Session、Message、Project、Workstream、Execution、Lease、ContextEntry、Attachment、AgentDefinition、SkillDefinition、MCPDefinition、Invitation、AuditEvent 和 OutboxEvent 等业务表都属于 tenant-owned table。

RLS Policy 的基础约束为：

```sql
workspace_id = current_setting('app.current_workspace_id', true)::uuid
```

应用数据库角色不能拥有表、不能使用 `BYPASSRLS`，tenant-owned table 必须 `FORCE ROW LEVEL SECURITY`。Migration Role 与 Application Role 分离。

Hub 每次处理 tenant-owned command 或 query 时必须：

```text
验证 Human / Endpoint 身份
-> 验证 Workspace Membership
-> 建立数据库事务
-> SET LOCAL app.current_workspace_id
-> SET LOCAL app.current_actor_id
-> 执行资源级授权
-> 读写 tenant-owned repository
-> 提交事务
```

必须使用 `SET LOCAL` 并限制在事务内，不能在连接池连接上使用会泄漏到下一请求的普通 `SET`。Repository 不允许提供只接受裸资源 ID 的 tenant-owned 查询；签名至少包含 `{ workspaceId, resourceId }`，RLS 作为第二道防线。

RLS 只解决租户行隔离，不替代角色和资源授权。同一 Workspace 内仍然必须检查 Workspace Access Role、Project Access、AgentUsagePolicy、资源所有权和具体 domain action。

任何请求体中的 workspaceId 都不是授权来源。Workspace Scope 必须来自已认证上下文或受保护路由，并与目标资源的 workspace_id 做一致性校验。

### 10.2 非数据库租户边界

所有非数据库通道也必须携带并验证 Workspace Scope：

- 对象存储 key 使用 `workspaces/{workspaceId}/...` 前缀，下载使用短时 signed URL。
- SSE 订阅由认证上下文确定 workspaceId，并过滤 event envelope；不能只相信 URL 参数。
- Cache key、idempotency key、rate-limit key 和分布式锁都必须包含 workspaceId。
- Queue、Outbox 和后台任务 payload 必须包含 workspaceId，并在 worker 中重新建立 TenantContext。
- 日志和 Trace 可以记录 workspaceId 与资源 ID，但不能记录 credential、token、完整敏感正文或本地绝对路径。

跨 Workspace 复制、搜索、统计或后台管理不是普通业务能力。需要时必须走显式 system actor、独立权限、审计和最小化返回，不能让应用数据库角色默认绕过 RLS。

### 10.3 替换现有 Workspace Token

现有共享 Workspace Token 无法表达用户、成员关系和审批 actor，必须从生产认证模型中移除。Workspace create/list/get、所有 flat-resource controller、SSE 和 Connector API 都必须统一进入认证与资源授权链。

迁移期间旧 Workspace Token 只能在明确的单机开发模式使用，并通过环境开关与生产配置互斥。生产启动检测到 legacy token mode 时必须 fail closed。

### 10.4 Human Identity 与登录会话

飞书 OAuth 和公司邮箱注册最终都映射到全局 User。认证身份与用户主体分离：

```text
User
├── Feishu AuthIdentity
└── EmailPassword AuthIdentity
```

飞书登录使用系统浏览器、Authorization Code + PKCE、state 和 nonce，不在 Electron WebView 中收集凭据。回调必须验证公司 tenant、redirect URI、state、nonce 和 provider issuer；飞书 access token 不能直接作为 Sartre API Token。

手动注册只允许验证后的公司邮箱域名。密码使用 Argon2id 哈希，并对注册、登录、验证码、密码重置和 OAuth callback 进行按 IP、账号和设备维度的限流。

同一个 normalized company email 只允许对应一个 User。发现已有账号时不能自动创建第二个 User；新增 AuthIdentity 必须先登录现有账号并完成重新认证，或走带审计的管理员恢复流程。

Sartre 登录会话采用：

- 短期 Access Token，建议有效期 10 分钟。
- 256-bit opaque Refresh Token，建议最长 30 天、空闲 7 天失效。
- Refresh Token 每次使用后立即轮换，服务端只保存 hash、token family 和 previous-token reuse marker。
- 检测到旧 Refresh Token 重放时撤销整个 token family，并生成 SecurityEvent。

Access Token 只携带 `sub`、`sessionId`、issuer、audience、issuedAt、expiresAt 和 keyId，不携带长期有效的 Workspace Role、Project Access 或 Agent 权限。每次请求都依据当前 Membership 和资源关系重新授权。

Electron 主进程将 Refresh Token 保存到 OS credential store 或 Electron `safeStorage` 保护的存储中，不能保存到明文 electron-store、renderer localStorage 或日志。Access Token 只保存在内存，由主进程 SDK 使用；renderer 不能直接读取 Refresh Token。

user_sessions 至少保存：

```text
sessionId
userId
refreshTokenHash
tokenFamilyId
deviceId
createdAt
lastUsedAt
idleExpiresAt
absoluteExpiresAt
revokedAt
revokedReason
ipHash
userAgentSummary
```

必须支持退出当前设备、退出全部设备、管理员禁用账号和安全事件批量撤销。Workspace Membership 被移除后，全局登录 Session 可以继续存在，但该 Workspace 的后续请求必须立即得到 403。

认证错误统一返回最小信息，不能通过登录、注册或找回接口枚举公司账号。密码、验证码、OAuth code、Access Token 和 Refresh Token 都禁止进入日志、Trace、AuditEvent 和 LLM 上下文。

### 10.5 Runtime Endpoint Identity

Runtime Endpoint 是独立于 Human User 的认证主体。它可以代表已授权设备执行 heartbeat、接收 Execution、上传事件和结果，但不能执行 Baseline 确认、范围审批、force release 等 Human Action。

配对流程为：

```text
用户在 Electron 中登录
-> Electron 通过 authenticated local IPC 发现 Runtime
-> 创建 5 分钟有效的一次性 Pairing Challenge
-> Electron 展示用户、设备、Workspace 和申请能力
-> 用户明确批准
-> Hub 创建 EndpointIdentity 与 Workspace Grant
-> Hub 返回一次性的 256-bit Endpoint Credential
-> Electron 主进程通过本地 IPC 交给 Runtime
-> Pairing Challenge 立即失效
```

Endpoint Credential 是随机 opaque secret，不是 Human Access Token 或 Refresh Token。Hub 只保存 credential hash、credential version、createdAt 和 rotatedAt；明文只在配对成功时返回一次。

Runtime 将 Endpoint Credential 保存在 OS credential store 或 Electron `safeStorage` 保护的本地存储中，不能进入 renderer、普通配置文件、日志、AuditEvent 或 Agent 上下文。无法提供安全持久化时，生产模式禁止启用长期可写 Endpoint。

Runtime 使用 Endpoint Credential 换取短期 Endpoint Access Token，Token 建议 10 分钟有效，并包含：

```text
sub = endpointId
actorType = endpoint
userId
deviceId
audience
credentialVersion
issuedAt
expiresAt
keyId
```

Endpoint Credential 只允许调用 token exchange、credential rotation 和 revoke 状态查询；日常 Runtime API 使用短期 Endpoint Token。所有通信必须经过 TLS。

EndpointIdentity 与 Workspace 授权分离：

```text
EndpointIdentity
└── EndpointWorkspaceGrant
    ├── workspaceId
    ├── allowedRuntimeActions
    ├── status
    └── approvedBy
```

同一 Runtime 可以被同一用户授权到多个 Workspace，但每个 Workspace Grant 独立批准、撤销和审计。Endpoint 访问 tenant-owned API 时仍需建立对应 TenantContext。

Endpoint 路由使用独立 audience 和 action allowlist，只允许：

- runtime health、heartbeat 和版本上报。
- 已授权 Execution 的领取、事件上报和状态转换请求。
- Lease heartbeat 与 fencingToken 验证。
- Attachment 分片上传和 ExecutionResult 提交。
- Endpoint 专用 SSE 或命令流订阅。

Endpoint Token 不能调用用户注册、邀请、权限授予、Goal Contract 确认、ExecutionPlan 人工批准、AttentionItem 人工决策、Lease force release 和账号管理接口。

必须支持单个 Workspace Grant 撤销、单设备撤销、Credential 轮换和设备丢失处理。Endpoint 或 Grant 被撤销时，Hub 立即关闭其订阅、撤销相关 Lease、递增 fencingToken，并使未完成 Execution 进入 interrupted。

Credential 轮换由有效 Human Session 发起，并要求当前 Endpoint 在线确认；旧 Credential 只允许短暂重叠，超过窗口后必须失效并记录 SecurityEvent。设备丢失时允许 Workspace admin 直接撤销，不要求旧设备参与。

该方案明确接受一个内部部署风险：如果 Endpoint Credential 被完整复制，攻击者可以在撤销前冒充该 Endpoint。首版通过 OS 安全存储、TLS、短期 Endpoint Token、接口白名单、单设备撤销、异常 IP/并发连接检测和审计降低风险，不引入非对称密钥、DPoP 或设备证明。重新评估条件是跨公网部署、引入外部成员或发生 Endpoint Credential 复制风险事件。

### 10.6 共享 Agent 的执行身份

AgentDefinition 由 ownerUserId 创建并管理发布，但不绑定 Owner Runtime。其他 Workspace 成员是否可以 mention 该 Agent，由 AgentUsagePolicy 决定：

```text
private
workspace_allowlist
workspace_all
```

允许的成员 mention Agent 后，Hub 把 Invocation 路由到调用者当前 callerEndpointId。caller Runtime 离线时，Invocation 保持 pending 并显示离线原因和取消/重试入口，不能转移到创建者或其他成员设备。首版不处理同一 Human 多设备自动选择或运行中迁移。

AgentInvocation 必须保存完整 actor chain：

```text
initiatedByUserId
agentDefinitionId
agentOwnerUserId
agentDefinitionVersionId
executionConfigHash
callerEndpointId
workspaceId
requirementId
sessionId
workstreamId
```

AgentUsagePolicy 只授予触发权，不授予以下能力：

- 查看或导出创建者或调用者 credential、环境变量和本地路径。
- 绕过 Project Access 读取受限内容。
- 代表岗位任务负责人确认 ExecutionPlan。
- 获取 Project Lease 或扩大写入范围。
- 代替 Human Actor 确认 Baseline、Finding 或验收结果。

只读 Agent 调用通过 AgentUsagePolicy、Workspace Membership 和内容可见性检查后可以直接执行。需要写入时仍必须生成 ExecutionPlan，由对应岗位任务负责人或有权 Project maintainer 明确确认，并通过 Project Access、LocalProjectBinding、ContextSnapshot 和 Project Lease 门禁。

共享 Agent/Skill/MCP DefinitionVersion 不等于共享 credential。定义只声明 credential slot 和所需 scope；调用者 Runtime 只解析自己明确绑定的 CredentialRef，credential value 始终留在调用者 Runtime 本地。

Agent Owner 可以随时撤销 allowlist 或发布新版本。撤销使用权后新的 Invocation 立即拒绝，pending Invocation 取消；已运行 AgentRun 保持版本锁定，但 capability/Project/credential 实时授权撤销仍会禁用新工具调用并按 Lease 流程处理。

### 10.7 集中授权与资源级防护

Hub 采用 deny-by-default 的集中 AuthorizationService。Controller Guard 只负责认证和声明 action；资源加载、Workspace 归属、角色关系和领域条件必须由 AuthorizationService 与 Domain Service 共同判定，不能散落成每个 Controller 自己比较 ID。

统一 Actor 类型为：

```text
human
endpoint
system
```

统一授权输入至少包含：

```text
actorType
actorId
workspaceId
action
resourceType
resourceId
resourceVersion
requestContext
```

Workspace Access Role、Project Access 和 Work Role 保持分离：

- owner：管理 Workspace 生命周期、管理员和所有权转移。
- admin：邀请或移除成员、管理 Workspace Policy 与 Project 登记；不能绕过 Project Access 读取原始内容。
- member：参与被授权的需求、会话和岗位任务。
- viewer：读取 Project 允许共享的原始内容。
- contributor：在本人负责的岗位任务中确认写 ExecutionPlan 并申请 Lease。
- maintainer：管理 Project Access、指纹、Lease revoke 和 force release。
- Work Role：只用于岗位责任和视图，不直接授予任何资源权限。

Workspace owner/admin 不因管理身份自动获得所有 Project 原始内容权限。需要读取或写入时仍必须拥有显式 Project Access，保持已确认的权限分层。

所有 flat-resource API 必须先通过 `{workspaceId, resourceId}` 加载目标资源，再执行 action authorization。禁止 `findById(id)` 后依赖调用方提供 workspaceId；禁止从 DTO 中的 createdBy、ownerId、actorId 或 reviewedBy 推断真实 actor。

人工确认命令只能从 Human Session 派生 actor。Endpoint、Agent payload 和客户端提交的任意 userId 都不能成为审批人身份。

Authorization Decision 可以短期缓存，但 cache key 必须包含 userId、workspaceId、action、resourceType、resourceId 和 policyVersion。Membership、Project Access 或 AgentUsagePolicy 变化时必须主动失效。

### 10.8 Credential、文件与 Agent 工具边界

Hub 只保存 CredentialRef 元数据，不保存业务 credential value。MCP token、Git credential、云平台密钥、环境变量和本地 CLI 登录态都保存在 Runtime 所在设备的系统安全存储或受保护配置中。

CredentialRef 至少记录 ownerUserId、endpointId、provider、displayName、allowedAgentIds、allowedMcpIds、status 和 lastValidatedAt。其他成员可以看到某项能力是否可用，但不能看到 secret、完整账号标识或可用于推断 secret 的错误信息。

Runtime 在每次工具调用前重新检查：

```text
Execution 状态允许继续
fencingToken 有效
工具属于 Agent capability
CredentialRef 已授权给当前 Agent
文件路径位于 approved scope
危险操作已取得对应 Human Action
```

Agent 的自然语言输出不能授予权限、扩大 scope、选择 credential 或伪造审批。真正的工具开放状态只由 Runtime Policy Engine 计算。

Attachment 上传采用分片、大小限制、MIME sniffing、contentHash、对象存储隔离和恶意文件扫描。下载使用短时 signed URL，并在签发时重新验证 Workspace 与 Project Access；不能把长期公开 URL 写入消息。

从飞书、Attachment、代码和外部工具读取的文本一律视为不可信输入。它可以作为 Evidence，但其中声称“忽略系统规则”“批准执行”或类似内容不能改变 Agent Policy、Context Authority 和 Human Approval。

### 10.9 审计、安全事件与滥用控制

所有权限、身份和高风险动作必须产生不可变 AuditEvent，至少覆盖：

- 登录、失败登录、Token 轮换、重放检测、Session 撤销和账号禁用。
- Workspace 邀请、Membership、Project Access 和 AgentUsagePolicy 变更。
- Endpoint 配对、Credential 轮换、Grant 变更和设备撤销。
- requiredAligners 名单变更、Baseline 确认、ExecutionPlan 审批、scope 扩展和危险工具确认。
- Lease acquire、revoke、force release、fencing reject 和异常恢复。
- Attachment 授权失败、跨 Workspace 访问拒绝和 RLS violation。

SecurityEvent 与普通产品活动分离，按 severity、actor、Workspace、source IP hash、deviceId 和 correlationId 检索。P0/P1 安全事件进入管理员 AttentionItem，不能只写日志。

限流至少覆盖登录、验证码、OAuth callback、Refresh Token、Endpoint token exchange、邀请、搜索、Attachment signed URL、SSE 重连和所有高成本 Agent command。限流 key 必须同时考虑 IP、User、Endpoint 和 Workspace，防止单一维度被绕过。

日志、Metrics 和 Trace 统一执行字段级脱敏。禁止记录 password、验证码、OAuth code、Access/Refresh/Endpoint Token、credential、完整消息正文、完整文件内容、本地路径和原始命令输出。

AuditEvent 默认在线保留 180 天并支持归档；SecurityEvent 默认保留至少 365 天。实际期限可以由公司合规策略提高，不能由普通 Workspace 成员缩短。

目标 10 的生产验收必须包含跨 Workspace IDOR 测试、RLS policy 测试、权限矩阵测试、Endpoint/Human actor 混淆测试、Token 重放与撤销测试、signed URL 越权测试和日志 secret 扫描。

## 11. 目标设计 11：故障恢复、可观测与生产部署

### 11.1 内部生产 SLO、RPO 与 RTO

Sartre 首版按公司内部生产系统建设，不追求跨地域零停机，但必须满足以下最低目标：

```text
Hub API 月可用性 >= 99.5%
普通 Hub/Worker 进程故障自动恢复 <= 5 分钟
SSE 断线后恢复投影 <= 60 秒
灾难场景 RPO <= 5 分钟
灾难场景 RTO <= 60 分钟
P0 安全或数据一致性告警发现 <= 5 分钟
```

RPO 只描述 PostgreSQL 或对象存储整体损毁等灾难。正常 API 一旦返回成功，State、DomainEvent 和 OutboxEvent 必须在同一数据库事务内提交，不允许成功响应后再异步补写核心事实。

Agent 和 Runtime 不以 Hub 暂时不可用换取继续写入。Hub、认证或 Lease 验证不可用时，已启动 Agent 完成当前原子工具调用后暂停新的写操作；本地持久队列只保存待回传事件，不能自行确认团队状态。

### 11.2 数据恢复等级

数据按恢复要求分为三类：

- Tier 0：User、Membership、Project、Requirement、Goal Contract Markdown/版本、Workstream、Session Message ledger、Execution、Lease、ExecutionResult 公共摘要、ContextEntry、AuditEvent 和 DomainEvent。必须进入 PostgreSQL 事务与持续备份。
- Tier 1：Attachment 正文、ExecutionResult 大文件报告和导入的飞书快照。必须进入启用 versioning 的对象存储，并由 PostgreSQL 保存元数据、contentHash 和 object version。
- Tier 2：可重建投影、摘要、搜索索引、缓存、SSE 连接和临时下载 URL。故障后从 Tier 0/1 重建，不作为恢复事实源。

Execution Scratchpad 和未完成的原子工具调用不承诺灾难恢复。Runtime 只在原子调用完成后写入 ExecutionCheckpoint；崩溃在调用中间发生时必须进入 reconciliation_required，不能猜测结果或自动重放。

备份策略至少包括：

- PostgreSQL 持续 WAL 归档或等价 PITR，恢复点间隔不超过 5 分钟。
- 每日全量备份，保留 30 天；每月归档备份按公司合规策略保留。
- 对象存储开启 versioning、服务端加密和生命周期规则。
- 备份 credential 与生产应用 credential 分离，普通应用角色无删除备份权限。
- 每季度执行一次真实恢复演练，验证数据库、对象引用、RLS policy、Migration 版本和 Attachment contentHash。

恢复演练必须记录实际 RPO、实际 RTO、丢失对象、校验失败和修复项。只检查“备份任务成功”不算恢复验证。

### 11.3 Kubernetes 生产拓扑

公司已有 Kubernetes 平台，Sartre 采用以下生产组件：

```text
Internal Ingress / TLS
├── Hub API Deployment（内部基线 1 replica，可配置为 2）
├── Worker Deployment（至少 1 replica，可水平扩展）
├── Migration Job（每次发布独立执行）
├── PostgreSQL（集群外托管或 Operator 管理）
└── S3-compatible Object Storage
```

Hub API 保持无状态，不把 Session Message ledger、持久 SSE cursor、任务 claim 或用户登录会话只保存在 Pod 内存。Pod 重启后必须从 PostgreSQL 和对象存储恢复；生产模式不存在 Workspace Token。

Worker 负责 Transactional Outbox、Steward 增量分析、Attachment 后处理、通知、索引和其他异步任务。所有任务通过数据库 claim、`FOR UPDATE SKIP LOCKED`、worker lease、attempt count 和 idempotency key 防止双 worker 重复执行。

Migration 不在 Hub API 启动时自动执行。发布流程先运行独立 Migration Job，确认 schemaVersion 与应用兼容后才滚动 API 和 Worker。Migration 采用 expand-and-contract：先增加兼容结构，完成应用切换和回填后再在后续版本删除旧结构。

### 11.4 Kubernetes 运行约束

生产 Workload 至少配置：

- Hub API 内部基线允许 1 个 replica，接受发布和重启时的短暂断线；需要无感发布或更高可用性时配置 2 个 replica、PodDisruptionBudget 和跨节点 pod anti-affinity。副本数量不能影响事件正确性。
- 明确的 CPU/memory requests 与 limits，不允许无界资源使用。
- startup、readiness 和 liveness probe。liveness 只判断进程是否失活，不能因短暂数据库故障制造重启风暴。
- non-root、read-only root filesystem、drop Linux capabilities、seccomp 和最小 ServiceAccount。
- NetworkPolicy 只允许 Ingress 到 API、API/Worker 到 PostgreSQL、对象存储、认证 Provider 和明确外部集成。
- Secret 通过公司 Secret Manager、External Secrets 或 CSI 注入；禁止写入镜像、ConfigMap、Git 和普通日志。
- 镜像使用不可变 digest，禁止生产环境使用 `latest`。

readiness 至少验证配置完整、Migration 版本兼容和必要依赖可连接。依赖暂时不可用时 Pod 可以保持 alive 但退出流量。

终止 Pod 时执行 graceful shutdown：停止接收新 command，向 SSE 客户端发送重连提示，等待当前 HTTP transaction 完成，Worker 停止新 claim，并在 terminationGracePeriod 内释放可安全释放的内部 claim。Project Lease 不由 Pod 本地持有，不因单个 API Pod 退出而丢失。

### 11.5 多副本 SSE 与事件唤醒

SSE 的持久重放来源是 append-only DomainEvent，不是 OutboxEvent 或 Pod 内存 Subject。OutboxEvent 只负责把已经提交的 DomainEvent 可靠投递给异步消费者。

每个 Workspace Event 必须拥有可持久化、可比较的 cursor。客户端使用 `Last-Event-ID` 重连，Hub 根据已认证的 Workspace Scope 从持久事件表重放；cursor 超出在线保留窗口时返回明确的 `resync_required`，客户端读取权威 Snapshot 后重新订阅。

首版使用 PostgreSQL `LISTEN/NOTIFY` 作为多 Pod 的低延迟 wake-up，不作为事件重放来源。收到通知后，各 API Pod 根据 cursor 从事件表读取并推送给自己持有的 SSE connection；即使 NOTIFY 丢失，定期 cursor poll 和客户端重连仍能补齐事件。

禁止为 SSE 配置 sticky session 作为正确性前提。负载均衡把重连请求路由到任意 API Pod 时，都必须得到相同的可重放结果。

事件在线重放窗口建议 7 天，超过窗口的历史仍可从 AuditEvent 和业务表查询，但不保证直接作为 SSE backlog 发送。清理任务只能删除已经满足 retention 且存在可重建 Snapshot 的 Event。

### 11.6 Command、Outbox 与 Worker 恢复

Sartre 不宣称 exactly-once delivery。生产语义采用“业务状态与 DomainEvent 单事务提交 + Outbox 至少一次投递 + 消费者幂等”。

所有可重试写命令必须携带：

```text
workspaceId
actorId
commandType
idempotencyKey
requestHash
expectedVersion
```

Hub 在同一事务中检查 IdempotencyRecord、领域不变量和 expectedVersion，再写 State、DomainEvent、OutboxEvent 与命令响应摘要。相同 key 和 requestHash 返回原结果；相同 key 但 requestHash 不同返回 409，不能执行第二次。

所有聚合更新使用 compare-and-set 或行锁。messageSeq 通过 Session 独立 counter 或数据库原子分配产生，禁止 `max(seq) + 1`。

Outbox Worker 使用 `FOR UPDATE SKIP LOCKED` claim，并保存：

```text
status
claimedBy
claimExpiresAt
attemptCount
nextAttemptAt
lastErrorCode
lastErrorSummary
deliveredAt
```

消费者必须使用 eventId 去重。网络超时、429 和可恢复的 5xx 按指数退避加 jitter 重试；验证错误、权限错误和不满足领域条件的命令不重试。

默认最多自动尝试 8 次。超过次数或识别为 poison message 后进入 DeadLetterRecord，生成 P1 AttentionItem 和告警。人工 retry 必须创建新 attempt 并引用原 eventId，不能修改或删除旧失败记录。

Worker claim 到期后可以由其他 Worker 接管，但消费者仍必须幂等。Pod 退出前停止新 claim；未完成 claim 通过 TTL 恢复，不依赖进程内 finally。

禁止 `.catch(() => {})`、空 catch 或“非关键写入失败后继续返回成功”。确实允许降级的投影必须记录 ProjectionFailure、metric 和 retry state。

### 11.7 分阶段可观测性

首版可观测性的目标不是一次建设完整监控平台，而是提供**按用户进行全链路诊断和修复验证的最小能力**：

> 在已知 `userId`、大致时间范围和问题现象时，工程师或 Codex 能在 10 分钟内找到相关业务链、最后成功步骤、首个失败步骤、稳定错误码、当前状态和恢复建议。

可观测性不能承诺自动修复成功。它必须提供足够证据支持复现、代码修复和修复后验证；首版不自动改库、补写结果、释放 Lease 或重放可能产生副作用的命令。

#### 11.7.1 第一版诊断合同

每个关键边界记录统一携带：

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

`requestId` 只标识一次 HTTP/IPC 请求；`correlationId` 贯穿一次用户业务动作及其重试；`causationId` 指向触发当前记录的 Message、Command 或 DomainEvent。`component/operation/stage/status` 使用受控枚举，支持判断链路停在哪个边界。Endpoint/System actor 必须保留 `initiatedByUserId`，避免 Agent/Runtime 事件无法追溯到发起用户。

`errorCode` 必须是稳定枚举，不能只保存自然语言错误；`retryable` 表示技术上是否允许重试，不代表系统可以自动重试有副作用的操作。日志只记录状态、错误码、耗时和安全脱敏摘要，不记录完整消息、Prompt、文件内容、credential、本地路径或原始命令输出。

第一版只覆盖以下边界：

```text
Electron critical action / named IPC / SDK request
-> Human authentication / authorization
-> Command / database transaction
-> DomainEvent / Outbox / SSE
-> AgentInvocation / caller Runtime receive
-> Execution / ProjectLease
-> Provider call
-> ExecutionResult persist and delivery
```

Electron 只对发送消息、确认/取消、开始 Execution、范围扩展、恢复动作等关键 action 记录枚举事件；不采集普通导航、鼠标轨迹或输入正文。关键 ClientDiagnosticEvent 通过 Electron main/SDK 最佳努力上报，离线时进入有界本地队列。没有观察到客户端事件只能报告“no_client_action_observed”，不能断言用户没有点击。

不要求为每个函数创建 Trace，也不要求诊断依赖完整分布式追踪平台。DiagnosticTimeline 的最小结论必须能从持久状态、DomainEvent、AuditEvent、System/Tenant SecurityEvent、System/Client DiagnosticEvent、RuntimeEvent 和 Execution/Lease 记录得到；集中结构化日志只用于补充细节。Log/Metric/Trace 不是业务事实源。

#### 11.7.2 用户诊断入口

首版提供内部诊断 CLI：

```text
pnpm ops:trace-user --user-id <userId> --since <duration>
pnpm ops:trace-correlation --id <correlationId>
```

CLI 必须调用受保护的 Hub ops-only Query API，不得直连生产数据库，也不得形成第二套领域实现。`trace-user` 按用户和时间范围输出：

```text
User identity and Workspace memberships
related Requirement / Session
Electron action / IPC / SDK request
request / command / authorization result
DomainEvent / Outbox / SSE delivery
AgentInvocation / Endpoint / Runtime
Execution / Lease / Provider
ExecutionResult
lastSuccessfulStage
firstFailedStage and errorCode
currentState
suggestedRecoveryAction
evidenceRefs and correlationIds
```

诊断结果是可重建 Projection，不是新的 Canonical Record。默认只返回 ID、枚举状态、时间、错误码和脱敏摘要；读取消息正文、Attachment 或受限 Project 内容仍按原资源权限重新授权。

按 `userId` 跨 Workspace 查询只允许拥有 `ops.diagnostics.read` 的平台运维 Human/System actor。每次查询必须记录操作者、原因、查询时间范围、访问的 Workspace、返回数量和 correlationId 到不可变平台审计；普通 Workspace owner/admin 没有该权限。

修复后必须使用原问题或等价场景生成新的 correlationId，并证明：原失败点不再出现、主流程到达预期终态、Execution/Lease/Outbox/Result 状态一致，且没有通过手工改库掩盖问题。

#### 11.7.3 第一版基础监测

第一版只要求一个内部健康视图和以下监测：

- Hub `/readyz` 失败。
- 5xx 或未分类 `errorCode` 持续增加。
- Outbox oldest age 超过阈值或 DLQ 非空。
- Runtime heartbeat 超时。
- Execution 长时间停留在非终态。
- Lease heartbeat 超时或 fencing reject 增加。
- Provider 连续失败。

健康检查分层：

- `/livez`：只判断进程和 event loop 是否存活。
- `/readyz`：验证配置、Migration 兼容、数据库和必要依赖，失败时退出 Service 流量。
- `/ops/health`：仅运维可见，返回 Outbox、Worker、SSE、对象存储、Runtime 和 Provider 的脱敏降级详情。

Smoke Test 必须在服务不可达、`status: degraded`、Migration 不兼容或核心依赖失败时返回非零退出码，禁止跳过后仍显示 PASS。

#### 11.7.4 后续完整可观测性

第一版稳定后，Hub API、Worker、Migration Job 和 Runtime 再使用 OpenTelemetry 语义补齐结构化 Log、Metric 和 Trace，并接入公司现有平台；应用不绑定某个厂商。`traceId` 可以加入诊断上下文，但不能取代 `correlationId` 或成为问题追踪的唯一依据。

核心 Metrics 至少包括：

- HTTP request rate、P50/P95/P99 latency、4xx/5xx、in-flight 和 request size reject。
- PostgreSQL pool 使用率、transaction latency、lock wait、deadlock、RLS deny 和 Migration version。
- SSE 当前连接、重连、replay count、replay lag、cursor gap 和 resync_required。
- Outbox backlog、oldest age、attempt、retry、DLQ 和 consumer lag。
- Worker claim、expired claim、job duration 和 ProjectionFailure。
- Runtime online、heartbeat age、版本不兼容和本地队列深度。
- Lease active、stale、revoke、force release、fencing reject 和 acquire latency。
- Execution 各状态数量、duration、interrupted、scope request 和 context refresh。
- Attachment upload、scan failure、contentHash mismatch 和 signed URL deny。
- OAuth/login failure、Token reuse、Endpoint exchange failure、authorization deny 和 rate limit。
- Provider 返回的真实 input/output token、latency、error 和 cost；缺少 usage 时标记 unknown，禁止生成随机值。

### 11.8 告警与降级策略

第一版基础监测以 11.7.3 为准。随着对应能力进入生产，告警按以下等级逐步补齐；尚未实现的能力不能制造假告警或阻断第一版：

- P0：跨租户访问成功、RLS 被绕过、AuditEvent 写入失败、备份连续失败或 confirmed 数据 hash 不一致。
- P1：Hub 5 分钟不可用、5xx 持续超阈值、Outbox oldest age 超过 60 秒、DLQ 非空、数据库 pool 持续饱和、Lease fencing reject 激增。
- P1：SSE replay 持续失败、Runtime 大面积离线、对象存储不可写、Endpoint Credential 重放或异常并发连接。
- P2：Steward/Provider 降级、单个 Runtime 离线、单个 Execution interrupted、非核心 Projection 延迟。

告警必须包含 runbook link、correlationId、受影响 Workspace 数量和可执行的首要检查，不发送消息正文或 credential。

外部 LLM/Steward Provider 不可用时，Session Message ledger、人工协作、文件共享、Lease 和审计继续工作；Steward Finding、摘要和 Agent Execution 标记 degraded 或 blocked，恢复后通过队列补偿。系统不能伪造总结或自动跳过人工门禁。

对象存储不可用时禁止返回 Attachment 上传成功；已经存在的纯文本对话可以继续。PostgreSQL 不可用时 Hub 退出 readiness，所有写操作失败关闭，Runtime 停止新的写工具。

### 11.9 发布、回滚与配置门禁

Hub API、Worker 和 Migration 使用同一个 releaseVersion，并发布不可变镜像 digest、SBOM、依赖漏洞扫描结果和构建 provenance。

发布顺序为：

```text
配置与 Secret 预检
-> 备份状态检查
-> 向后兼容 Migration Job
-> Worker/API 滚动发布
-> /readyz 与真实 smoke
-> SSE replay、Outbox 和核心命令验证
-> 放量完成
```

应用回滚只允许回到仍兼容当前 schema 的镜像。生产数据库不依赖 destructive down migration 回滚；需要撤销 schema 变化时优先 forward fix。破坏性 Migration 必须在确认旧应用全部下线、数据回填验证和备份可恢复后单独执行。

生产配置必须 schema 校验并 crash-fast。缺少数据库、JWT/Endpoint signing、对象存储、OAuth、加密或关键限流配置时禁止使用开发默认值启动。

首个生产 Release 只支持 Apple Silicon arm64、最低 macOS 14，必须完成代码签名、notarization、安装与升级验收、内部更新源和版本兼容检查。Intel Mac、Windows/Linux 不进入第一版构建、签名和 Release Gate。生产包禁止 `ELECTRON_RENDERER_URL`、DevTools 自动开放和任意远程 renderer；Hub、Electron 和 Runtime 在连接时交换 min/max compatible version。

Electron 更新采用内部小范围试用后逐步放量。发现 Agent Runtime、IPC contract 或 Hub API 不兼容时停止更新，并允许回到上一个仍受支持的签名版本。

### 11.10 运维 Runbook 与演练

生产前至少具备以下 Runbook：

- Hub 不可用、readiness 失败和发布回滚。
- PostgreSQL PITR、对象存储恢复和 contentHash 校验。
- Outbox 堆积、Worker poison message 和 Projection 重建。
- SSE cursor gap、Workspace resync 和客户端大面积重连。
- Runtime 离线、Endpoint Credential 撤销和版本不兼容。
- Lease 卡死、force release、fencing reject 和 EnvironmentDrift。
- OAuth/Token 异常、跨租户安全事件和 credential 泄露。
- Electron 更新失败、签名失败和兼容性回退。

每个 Runbook 必须包含 owner、触发告警、判定步骤、止损动作、恢复步骤、验证查询和升级联系人。命令需要在非生产环境真实演练，不能只保存说明文本。

每季度执行数据库恢复与 SSE/Outbox 恢复演练；每次重大 schema、认证、Lease 或 Runtime 变更后执行针对性故障注入。演练结论进入报告并创建未解决整改项。

## 12. 目标设计 12：测试体系与生产准入

### 12.1 四层生产门禁

#### Layer 1：Pull Request 快速门禁

目标是在 15 分钟内阻止确定性缺陷进入主分支：

- format check、lint、typecheck、build 和 `git diff --check`。
- domain、contracts、sdk、Hub、Electron main/preload/renderer、Runtime 的单元测试。
- OpenSpec validate、contract/schema compatibility 和 architecture boundary check。
- secret scan、dependency lockfile 检查、SAST 和许可证策略。
- Migration 静态检查、禁止危险默认配置和禁止生产 remote renderer URL。

STRUCTURAL_CHECK 必须保持结构证据标签，不能再标为 REAL_TEST。

#### Layer 2：合并后真实依赖集成

使用临时 PostgreSQL 和 S3-compatible 测试存储真实执行：

- 从空库执行全部 Migration，并从上一生产版本执行 upgrade Migration。
- PostgreSQL RLS、Membership、Project Access、AgentUsagePolicy 和跨 Workspace IDOR。
- Transaction、expectedVersion、IdempotencyRecord、messageSeq 并发和 Outbox claim。
- REST/SSE SDK contract、cursor replay、resync_required 和多 API 实例事件可见性。
- Endpoint 配对、Token 交换、撤销、Lease heartbeat 和 fencing reject。
- Attachment 分片、contentHash、signed URL、权限和恶意文件处理。
- Worker retry、claim expiry、DLQ、Projection 重建和失败可见性。

该层禁止 mock PostgreSQL transaction、RLS、object key、SSE cursor 和 Worker claim。

#### Layer 3：Staging 多用户系统验收

在与生产拓扑同构的 Kubernetes Staging 执行：

- 飞书测试身份或受控测试 IdP、公司邮箱注册和邀请流程。
- 至少三个独立 Human User、两个 Runtime Endpoint、两个逻辑 Project 和不同 Project Access。
- 需求创建、多轮对齐、同版本 Goal Contract 确认、岗位任务、Agent Execution、Lease、结果和两级验收。
- 同一 Project 双 Agent 写入竞争、范围扩展、Baseline 变更、Runtime 离线和人工 force release。
- Hub/Worker Pod 重启、SSE 重连、Outbox backlog、Endpoint 撤销和 EnvironmentDrift。
- Steward 弱确认、冲突检测、Evidence 缺失和 Provider 降级。
- Electron 界面、右侧抽屉、需求分析、岗位任务、Inbox 和异常恢复流程。

Staging 数据按测试 Workspace 隔离，不能使用生产用户 credential 或复制未脱敏的生产正文。

#### Layer 4：Release Artifact 验收

只对最终待发布产物执行：

- Hub/Worker/Migration 镜像 digest、SBOM、签名和漏洞扫描。
- Kubernetes 配置渲染、Secret 引用、NetworkPolicy、probe 和资源限制。
- 签名 Electron 安装包的全新安装、登录、Runtime 配对、升级、降级保护和卸载。
- 上一受支持版本 Electron/Runtime 与新 Hub 的兼容矩阵。
- 真实部署 smoke、SSE replay、Outbox、Attachment 和 Agent 只读/写入最小闭环。
- 备份可用性检查和最近一次恢复演练有效期。

任何 Layer 失败都不能通过重新标注为 MANUAL_REQUIRED 或 STRUCTURAL_CHECK 绕过。

### 12.2 证据模型与防假绿

保留现有证据等级：

```text
REAL_TEST
STRUCTURAL_CHECK
SCENARIO_REGISTERED
SKIPPED
MANUAL_REQUIRED
```

证据等级不是结果状态。每项结果必须独立标记 PASS、FAIL、BLOCKED 或 SKIPPED。

REAL_TEST 必须满足：

- 命令、请求或 UI 场景真实执行。
- 验证目标真实存在，而不是只检查文件或字符串。
- 断言失败时进程返回非零。
- 报告保存原始退出码、关键输出和失败统计。
- 至少存在相应负向测试，证明门禁能在错误状态下失败。

报告必须绑定：

```text
commitSha
dirtyWorktreeHash
releaseVersion
imageDigest
electronArtifactHash
schemaVersion
testEnvironmentId
startedAt
finishedAt
toolVersions
evidenceLevel
status
```

代码、Migration、依赖锁文件、构建配置或待发布产物发生变化后，旧报告自动 stale。`latest.md` 只作为索引，不能脱离 artifact hash 作为发布证据。

服务不可达、`status: degraded`、测试依赖缺失、场景未执行或断言未运行时不得返回 PASS。SKIPPED 的 required gate 等同于 BLOCKED；只有明确标为 optional 的外部能力可以跳过，并记录原因和 owner。

测试脚本自身必须具备测试，至少证明：命令不存在、服务不可达、返回 degraded、子进程非零、报告缺字段和 required step 被跳过时，Harness 会整体失败。

### 12.3 变更影响与测试选择

每个 OpenSpec change 必须声明 affectedCapabilities、affectedPackages、riskLevel、requiredTestSuites 和 requiredManualChecks。Harness 根据声明选择增量测试，但以下全局门禁不能被影响分析跳过：

- contracts 与 Migration compatibility。
- authentication、tenant isolation 和 RLS。
- Domain state machine 与 idempotency。
- Electron preload/IPC security。
- secret scan、build、lint 和 architecture boundaries。

高风险变更包括认证、授权、Migration、Requirement/Baseline、Execution、Lease、Runtime 工具权限、对象存储和更新机制。高风险变更必须执行完整 Layer 2 和相关 Layer 3 场景，不能只跑受影响包的单元测试。

### 12.4 首版容量与性能门禁

首版生产容量基线为：

```text
注册用户：50
同时在线 Human User：20
并发 Agent Execution：10
同时 SSE Connection：100
持续 API 吞吐：50 requests/second
5 分钟突发吞吐：100 requests/second
```

并发 Agent Execution 必须分布在不同 Project；同一 Project 仍然只允许一个有效写 Lease。性能测试不能绕过领域不变量制造虚假吞吐。

稳定负载运行 30 分钟时必须满足：

- Hub 非 Provider 读取 API P95 < 500ms，写 Command P95 < 1000ms。
- Lease acquire、heartbeat 和 fencing validation P95 < 1000ms。
- 已持久化 DomainEvent 到在线 SSE 客户端可见 P95 < 2 秒。
- 重放 1000 条 Workspace Event < 10 秒，且无缺失、重复副作用或跨 Workspace 事件。
- Outbox oldest age 稳态 < 30 秒，依赖恢复后 5 分钟内清空可重试 backlog。
- 非预期 5xx < 0.5%，成功响应对应的核心事实丢失数必须为 0。
- API Pod CPU 稳态 < 70%，memory 无持续增长；Worker backlog 不随时间单调增加。

外部 LLM 推理时间不计入 Hub API latency，但从用户确认 ExecutionPlan 到 Runtime 收到可执行命令的 Sartre orchestration overhead P95 < 2 秒。

必须执行 8 小时 soak test，覆盖 SSE 重连、Token 刷新、Endpoint heartbeat、Lease TTL、Outbox 清理和摘要任务。测试结束后检查内存、数据库连接、锁等待、事件 backlog、重复任务和孤立 Lease。

### 12.5 故障注入与恢复验收

Staging 必须自动执行以下故障场景：

- 删除正在服务的 Hub API Pod，验证客户端重连和 cursor replay。
- 删除 Worker Pod，验证 claim TTL、任务接管和幂等消费。
- 临时阻断 PostgreSQL，验证 readiness、Runtime 写暂停和恢复后的 TenantContext。
- 临时阻断对象存储，验证 Attachment 不假成功且文本协作可降级。
- 临时阻断 Provider，验证 Steward/Agent degraded、任务补偿和人工门禁不被跳过。
- Runtime 断网、进程崩溃和 Endpoint 撤销，验证 interrupted、Lease revoke 和 reconciliation。
- 在文件写入期间制造 EnvironmentDrift，验证 scope 与用户恢复流程。
- 制造 Outbox poison message，验证重试上限、DLQ、告警和人工 retry。

每个故障场景都必须证明：已确认事实不丢失、命令不产生重复副作用、跨 Workspace 数据不泄露、旧 fencingToken 不能继续写入、恢复时间满足目标。

### 12.6 领域、权限与安全测试矩阵

不以单一行覆盖率代表完成度。以下高风险模型必须覆盖全部合法 transition、非法 transition、权限组合和并发冲突：

- Requirement、AlignmentBaseline、Workstream、Execution、Lease、Finding、AttentionItem 和 Invitation 状态机。
- Human、Endpoint、System actor 的允许与禁止 action。
- owner/admin/member 与 viewer/contributor/maintainer 的笛卡尔边界。
- private、workspace_allowlist、workspace_all AgentUsagePolicy。
- RLS 对每个 tenant-owned table 的 select/insert/update/delete。
- expectedVersion、idempotencyKey、重复请求、双击、超时重试和双 Worker claim。
- Goal Contract 变更、P0 Context Delta、范围扩展、force release 和 completed follow-up。

`packages/domain`、`packages/contracts` 和 Authorization Policy 使用 table-driven 或 property-based test 覆盖不变量。覆盖率只能作为缺口信号；关键 transition 或 deny case 缺失时，即使行覆盖率达标也不能发布。

安全测试至少包含 SAST、依赖漏洞、secret scan、Electron IPC/navigation/CSP、OAuth state/PKCE、Token rotation/reuse、Endpoint revoke、IDOR、RLS、signed URL、恶意 Attachment、Prompt Injection 和日志泄密。

用户诊断必须测试 `ops.diagnostics.read` 正反权限、跨 Workspace 查询审计、DiagnosticTimeline 脱敏和高基数字段不进入 Metric label。普通 Workspace owner/admin 不得因管理角色获得平台级用户追踪能力。

### 12.7 多岗位人工体验验收

MANUAL_REQUIRED 不替代自动化，但以下体验必须由真实开发、Java 测试和质量角色分别验收：

- 能在需求分析与岗位任务入口快速找回当前目标、边界、负责人和进度。
- 切换多个 Session 后不会误认当前 Requirement、Workstream、Project 或 Agent。
- 右侧抽屉 scope 与主界面对象一致，关闭抽屉不丢失待处理事实。
- ExecutionPlan、修改范围、Lease holder、阻塞原因和恢复动作可理解。
- Goal Contract Diff、需求变更影响和重新确认不会被误认为普通通知。
- Inbox 能区分需要行动、mention 和关注更新，不产生重复处理。
- Runtime 离线、Agent 崩溃、权限不足和 Project 锁冲突都有可恢复路径。

人工验收保存测试角色、构建 hash、操作录像或截图、问题列表和签字人。体验问题可以形成 release blocker，不能以“自动化已通过”为由忽略。

### 12.8 Release Gate 与例外策略

生产发布必须同时满足：

- 四层 required gate 全部 PASS，required step 无 SKIPPED。
- 待发布镜像和 Electron Artifact 与测试证据 hash 完全一致。
- P0 defect 为 0；P1 defect 为 0 或存在下述仍在有效期内的书面例外；未解决安全 High/Critical 为 0。
- Migration upgrade、备份状态、恢复演练有效期和 rollback compatibility 通过。
- Staging 多用户主流程、故障恢复和容量基线通过。
- 多岗位人工验收通过。
- Release Note、Runbook、内部健康视图和基础告警已更新。

以下门禁不允许 waiver：跨租户隔离、认证绕过、人工审批绕过、数据丢失、重复写副作用、旧 fencingToken 写入、Migration 不可恢复、secret 泄露和签名产物校验失败。

其他 P1 非安全问题如确需内部限时放行，必须由 Requirement Owner、技术负责人和质量负责人共同批准，记录影响、规避措施、owner 和不超过 7 天的到期时间。到期未修复时自动阻断下一次发布。

测试重试不能把首次失败隐藏为 PASS。报告必须保存全部 attempts；识别为 flaky 的 required test 在隔离和修复前仍阻断发布，不能通过无限重跑获得绿色结果。

## 13. 目标设计 13：现有代码迁移与里程碑重排

### 13.1 零历史数据迁移

当前 Sartre 尚未承载需要保留的真实生产数据。现有 Workspace、Requirement、Phase、Dispatch、Delivery、Conversation、Memory、Token Usage 和执行记录都视为测试或演示数据。

新架构不提供旧数据库到新领域模型的逐表数据迁移，不为测试数据维护以下语义映射：

- Phase 到 Workstream。
- Dispatch/Handoff/Delivery 到 AgentInvocation/Execution。
- WorkItem 到 AttentionItem。
- legacy Artifact 到 ContextEntry/Attachment/ExecutionResult。
- Memory/FailureRecord 到分层 ContextSnapshot。
- legacy Conversation 到正式 Session Message ledger。

旧数据如需人工参考，只允许在重置前导出为非权威只读归档文件；不能导入新数据库后继续参与 Baseline、权限、审计和 Agent Context。

新生产 Schema 从全新 baseline migration 建立。旧 Migration、fixture 和 local-demo 数据进入明确的 legacy archive 或删除，不允许新环境先执行旧 MS1-MS8 Migration 再通过 destructive migration 改造成新模型。

开发和测试环境提供显式 reset 命令，必须二次确认目标环境并拒绝 production。生产环境不存在“导入旧 demo 数据”的启动路径。

### 13.2 新仓库重建与旧仓库冻结

Sartre 生产版本固定在 `/Users/xy/xykj/sartre` 重建。2026-07-17 已确认当前 legacy 应用代码功能冻结，只保留审计、参考和必要的代码来源，不再接收新领域功能。目标 spec/设计文档在迁入新仓库前仍可修订。

冻结旧仓库时必须：

- 生成覆盖 tracked/untracked 参考文件的 freeze manifest，并记录当时 HEAD/dirty hash；不把 dirty HEAD 单独冒充完整基线。
- 在 README 顶部标明 NO-GO、冻结日期和新仓库位置。
- 关闭或归档旧 active OpenSpec change，不能把 MS1-MS8 的完成状态复制到新仓库。
- 禁止新旧 Hub 同时写入任何共享数据库或对象存储。
- 禁止为旧 API 建设长期兼容层、双写或事件桥。

`/Users/xy/xykj/sartre` 当前为空目录且尚非 Git repository，由 MS0 初始化。新仓库延续产品名 Sartre，但 Git 历史、Migration baseline、OpenSpec、Harness ledger 和 releaseVersion 从零开始。旧仓库只作为证据来源，不作为运行时依赖或 Git submodule。

### 13.3 白名单移植

代码默认不迁移。允许进入移植审查的内容只有：

- Electron BrowserWindow 安全配置、contextBridge 具名 IPC、Result 与 Zod 校验模式。
- monorepo、TypeScript、Vitest、Playwright、Biome 和 electron-vite 中已经验证有效的基础配置。
- shadcn/ui、Tailwind、lucide-react 和通用无业务状态组件。
- `.agents/capabilities` 中经过 secret、路径和岗位耦合审查的能力内容。
- Codex Provider Adapter 中经过真实 repo、权限、取消、usage 和错误处理复审的 SDK 调用部分；只移植为 CodexAgentEngine，不保留 legacy `codex exec` 执行链。
- Harness 的证据等级、报告字段和 fail-closed 原则。

禁止直接迁移：

- Workspace Token、旧 AgentEndpoint token 和任何 demo credential。
- Requirement/Phase、Dispatch、WorkItem、TaskHandoff、Delivery 状态机。
- legacy Conversation、Artifact、Memory、FailureRecord 和 Token random tracking。
- Hub Controller、Application Service、Repository 和现有 Migration。
- 旧 MS1-MS8 BDD、Acceptance PASS 和 PLAN_LEDGER 完成标记。
- 以临时空目录运行 Codex、自动 accept-and-execute 和静默 catch 的实现。

每个移植项记录到 PortingLedger：

```text
sourceRepository
sourceCommit
sourcePath
targetPath
reason
securityReview
behaviorTests
owner
status
```

移植通过目标仓库的 format、lint、typecheck、unit、security 和相关 REAL_TEST 后才进入主分支。禁止整目录复制后再声称后续清理。

### 13.4 新仓库模块边界

新仓库从以下最小结构开始：

```text
apps/hub-api
apps/hub-worker
apps/electron-app
apps/local-runtime
packages/domain
packages/contracts
packages/sdk
packages/runtime-core
.agents/capabilities
workflow
scripts
```

模块处置规则：

- `packages/domain`：全新实现本设计中的 User/Workspace、Requirement/Baseline、Session、Workstream、Execution/Lease、Context 和 Attention 状态机。
- `packages/contracts`：按 bounded context 拆分 Zod schema 与 EventEnvelope；根 index 只做受控导出，禁止再次形成单文件合同仓库。
- `packages/sdk`：保留唯一 Hub client 边界，重写 Human/Endpoint auth、REST/SSE、idempotency 和 cursor replay。
- `apps/hub-api`：只承载同步 command/query、认证授权和 SSE；不内嵌长时间 Steward/Attachment 工作。
- `apps/hub-worker`：承载 Outbox、Steward、通知、Attachment 后处理和投影重建。
- `apps/electron-app`：白名单移植安全壳，按目标 9 重写路由、状态和 UI。
- `apps/local-runtime`：替代 Connector CLI 产品入口，作为 Electron 管理的本地 companion daemon。
- `packages/runtime-core`：实现 RepoRegistry、ExecutionScheduler、LeaseClient、SartreAgentAdapter、File/Command/Git/MCP Service 和本地事件队列。

新仓库不保留对外 Connector 产品、Web Console、旧 Provider Session 事实链和 Git Server。Runtime 本机诊断 CLI 只能调用相同 Runtime API；`ops:trace-user`/`ops:trace-correlation` 只能调用受保护的 Hub ops Query API。两类 CLI 都不得直连生产数据库或形成第二套执行实现。

### 13.5 新里程碑

旧 MS1-MS9 全部停止追加。新仓库使用以下里程碑，每个 MS 都必须交付 Hub、Contract、SDK 和对应真实用户入口，不能把 UI、权限或可靠性统一推迟到最后。

#### MS0：Repository Constitution 与证据基线

- 建立新仓库、模块边界、权威 spec、Architecture Check 和四层 Harness 骨架。
- 完成白名单 PortingLedger、CI、secret scan、依赖策略和新 baseline Migration 工具。
- 交付可启动但不承载业务的 Hub、Worker、Electron 和 Local Runtime health loop。
- 冻结 DiagnosticContext、稳定 errorCode、结构化边界日志和 `ops:trace-*` CLI 骨架。

#### MS1：Identity、Workspace 与 Tenant Boundary

- Feishu OAuth、公司邮箱、User Session、Workspace、Invitation 和 Membership。
- PostgreSQL RLS、AuthorizationService、AuditEvent、Endpoint 配对和 Project Access。
- Electron 登录、Workspace 创建/加入和成员管理最小流程。
- 建立 `ops.diagnostics.read`、平台运维查询审计和 Human/Endpoint/System actor chain。

#### MS2：Requirement、Session 与正式会话账本

- 需求 Draft、会话文件夹、Session、Message、Attachment 和 EventEnvelope。
- Transactional Outbox、SSE cursor replay、SDK 和 Electron 左侧需求/会话导航。
- 多用户并发消息、断线恢复、IDOR 和真实 PostgreSQL 集成测试。
- 用户诊断时间线覆盖 Electron critical action/IPC、Command、DomainEvent、Outbox、SSE 和消息投递失败。

#### MS3：Goal Contract、岗位对齐与岗位任务

- `goal-contract.md` 版本、requiredAligners、AlignmentCheckpoint 和 Baseline 状态机。
- Workstream Proposal、岗位任务、AttentionItem、Action-first Inbox 和需求变更 Draft。
- 需求分析与岗位任务两个整理视图，以及可折叠上下文抽屉骨架。

#### MS4：Local Runtime、Project Binding 与只读 Agent

- companion daemon、Endpoint Credential、LocalProjectBinding、RepoRegistry 和 Runtime health。
- AgentDefinition/Skill/MCP 不可变发布版本、AgentUsagePolicy、caller Runtime 路由、更新 Diff 与本地 CredentialRef。
- TypeScript `@openai/codex-sdk`、CodexAgentEngine、个人公司网关 ProviderProfile、隔离执行 Profile，以及 Sartre Agent 真实读取 Project、只读命令、取消、事件上报和真实 usage。
- 标准 Codex input/cached input/output/reasoning output token 归一化、调用者私有用量明细和终态无状态清理。
- 诊断时间线贯通 initiatedByUserId、AgentInvocation、caller Runtime 和 Provider。

#### MS5：Write Execution 与 Project Lease

- ContextSnapshot、ExecutionPlan、修改范围确认、Project Lease、heartbeat、TTL 和 fencingToken。
- read-only Codex sandbox、Runtime Sartre MCP/ToolBroker、File/Command/Git/MCP 写工具 enforcement、范围扩展、EnvironmentDrift 和 ExecutionResult。
- 同 Project 竞争、Runtime 崩溃、force release 和旧 token 写入拒绝。
- `ops:trace-user` 与 `ops:trace-correlation` 贯通完整写链并支持修复后验证。

#### MS6：Steward、Context 与多人汇聚

- 每 Session Steward、锚账集、Suggested/Confirmed Context、Finding 和弱确认。
- Deterministic Projector、StructuredInferencePort 单次结构化推理和 Zod StewardAnalysis；不运行通用 Agent Loop。
- P0-P3 Context Assembly、EvidenceRef、Context Delta、跨岗位冲突和谁做了什么。
- Requirement 与 Session scope 的上下文抽屉、Inbox 联动和 Provider 降级。

#### MS7：变更、验收与完整恢复

- RequirementChangeProposal、Impact Matrix、新 Baseline 重对齐和 affected Workstream reopen。
- 两级完成验收、Success Criteria Evidence Matrix 和 follow-up Requirement。
- Agent/Hub 断线、checkpoint reconciliation、SSE resync、Lease 异常恢复和完整 Audit。

#### MS8：Production Qualification

- Kubernetes、Migration Job、备份恢复、生产诊断 CLI、集中结构化日志、基础告警、Runbook 和发布回滚。
- 容量、soak、故障注入、安全、跨租户和多岗位人工验收。
- Electron 正式签名、公证、升级、兼容矩阵和内部试运行。

完整 OpenTelemetry Span 覆盖、多套 Dashboard、成本分析和高级采样在第一版稳定后扩展，不作为 MS8 第一版关闭门禁。第一版仍必须证明给定 userId、时间范围和问题现象时，10 分钟内可以定位首个失败点并验证修复链路。

MS8 不是补做安全和可靠性。每个前置 MS 都必须满足当期相关的 RLS、事务、幂等、审计、故障和 Harness 门禁；MS8 只证明整个系统达到统一生产标准。

### 13.6 每个里程碑的关闭条件

每个 MS 必须同时具备：

- 已批准的 spec、明确 nonGoals 和被放弃方案及原因。
- 领域不变量、Contract、Migration 和真实依赖测试。
- 可由目标用户操作的端到端纵向切片。
- 安全、权限、并发、失败恢复和可观测证据。
- 本次 artifact hash 绑定的 Harness 报告。
- 未完成项、风险和下一个 MS 的输入合同。

禁止以文件存在、接口返回 200、组件可渲染或 Agent 生成报告作为 MS 完成依据。MS 状态只能由 Production Gate 根据证据更新，不能由计划文档手工写成完成。

## 14. 已确认的范围决策

### 14.1 暂不建设 Git Server

原因：Git 托管不是当前内容同步和认知对齐的核心问题。Git 操作继续由岗位 Agent 根据各自 Skill 负责。

重新评估条件：现有 Git 基础设施无法支持 Agent 读取和提交代码，且该问题成为核心协作闭环的阻塞项。

### 14.2 暂不建设代码发布和外部部署流程

原因：各岗位已有自己的 Git、施工和交付规范；首版先解决共享目标、内容、进度和证据。这里不排除 Sartre 自身的岗位任务完成确认、Requirement 成功标准验收和生产 Release Gate。

重新评估条件：不同岗位的结果无法通过公共 ExecutionResult 和 ContextEntry 完成对齐。

### 14.3 暂不建设时间回溯

原因：实现和验证成本高，不影响当前核心同步闭环。

保留基础：append-only events、aggregateVersion、sourceCursor 和审计。

重新评估条件：用户在真实任务中频繁需要恢复历史执行现场，而普通审计无法满足。

### 14.4 不同步完整本地仓库

原因：会引入敏感信息泄露、噪声、成本和未完成内容被误用的问题。

替代方案：自动同步执行元数据和过滤后的变更摘要；具体文件由用户或 Agent 明确共享。

### 14.5 不统一岗位专业报告结构

原因：不同岗位的专业内容差异明显，固定全局 payload 会损害扩展性。

平台约束：所有岗位必须提供公共 ExecutionResult；岗位专业字段由 Agent Skill 扩展。

### 14.6 第一版不建设完整可观测平台

原因：当前最重要的问题是收到一个 userId 和问题现象后，能够快速还原业务链、定位首个失败点并验证修复，而不是先建设覆盖所有函数、指标和成本维度的监控平台。

第一版替代方案：统一 DiagnosticContext 和稳定 errorCode；提供受审计的 `ops:trace-user`/`ops:trace-correlation`；覆盖身份、Command、Event/Outbox/SSE、Invocation/Runtime、Execution/Lease、Provider 和 Result 边界；增加一个健康视图与基础告警。

重新评估条件：用户量、服务数量或故障频率使结构化边界日志和诊断 Projection 无法在目标时间内定位问题，或公司观测平台已经提供低成本的统一 OTLP 接入。届时补齐 OpenTelemetry Span、Metric、Dashboard、采样和成本分析，不改变已有 correlationId/errorCode 合同。

### 14.7 第一版只使用 CodexAgentEngine，Steward 不运行通用 Agent Loop

原因：Codex SDK 已提供 coding-focused thread 和 Agent Loop；再叠加 PI、LangChain 或自研通用循环会产生重复的 session、tool-call、取消、重试、context compaction 和错误状态。Steward 的核心是内容管理与分析，不需要文件/命令自由探索。

工作 Agent 方案：Local Runtime 通过 TypeScript `@openai/codex-sdk` 创建 Codex thread；Codex 保持 read-only sandbox，所有副作用经 Sartre MCP/ToolBroker。Codex thread 不拥有 Hub Session、Execution、Lease、Context 或 Audit。

Steward 方案：Hub Worker 使用确定性 Projector 维护 Timeline/Working Set，语义任务通过 `StructuredInferencePort` 进行单次结构化推理并经 Zod 校验。主动检测和用户 mention Steward 统一使用平台专用 Service Credential，不使用或回退到 Human 的个人 Key；mention 时先查询确定性记录，再可选调用一次模型组织表达。

第一版非目标：PI、LangChain、通用多 Provider Agent Loop、第二个 Coding Agent Engine，以及 Steward 自由工具循环。

重新评估条件：明确需要 Codex 无法支持的模型 Provider，或 Steward 出现无法用确定性 Workflow + 单次结构化推理完成的真实用例。重新评估必须先说明现有接口缺口，不能仅以“框架功能更多”为理由引入第二套循环。

### 14.8 共享 Agent 在调用者 Runtime 执行

原因：共享的是 Agent/Skill/MCP 定义，不是创建者的本地仓库、网关 Key 和 provider state。路由到创建者 Runtime 会让触发权隐式变成对创建者环境的使用权。

方案：每次 mention 路由到调用者 caller Endpoint，使用调用者 LocalProjectBinding、ProviderProfile 和 CredentialRef。同一 Session 多人 mention 同一 Agent 互相隔离并可并行；同 Project 写入仍由 Lease 串行。终态后销毁 provider state，下一 Invocation 重新从 Hub ContextSnapshot 装配。

### 14.9 Agent/Skill/MCP 定义使用不可变版本

原因：浮动 latest 会让只读分析、ExecutionPlan、Human Approval 和实际工具调用使用不同配置。

方案：AgentDefinitionVersion 锁定精确 Skill/MCP DefinitionVersion。mention 提交 expectedAgentDefinitionVersionId/executionConfigHash；展示元数据变更只给非阻断提示，执行配置变更则返回 Diff，用户确认最新版后重试。运行中 Invocation 不漂移，但授权撤销立即 fail closed。

### 14.10 每个用户使用自己的 Codex 公司网关 Key

原因：公司网关已按 Key 隔离用量和明细，Sartre 不需要也不应该托管或代理共享创建者 Key。

方案：Runtime 保存用户 `baseUrl + API Key` 并生成单 AgentRun 隔离 ProviderProfile。Hub 只保存 CredentialRef 元数据与调用者私有 ExecutionUsage。UI 按官方字段展示 input、cached input、output、reasoning output、total 和 cache token hit rate；Gateway 账单仍是计费权威。

### 14.11 首版不处理同一 Human 多设备 Agent 迁移

原因：当前核心场景是多人各自使用一个本地 Runtime。自动选择多设备会引入 ProjectBinding、credential 和本地环境歧义。

首版方案：Invocation 显式固定 callerEndpointId；离线时 pending/取消/重试，不自动迁移。真实用户出现稳定跨设备需求后再评估显式 rebind/move workflow。

### 14.12 首个生产 Release 只支持 Apple Silicon macOS

原因：当前内部试用只有一台 macOS 设备，第一版核心风险是多人协作、Runtime、Lease 和真实执行，不是跨平台发行。没有真实 Windows 用户、设备和签名验收条件时，同时维护 Windows packaging、credential store、daemon lifecycle、签名和升级矩阵只会制造不可验证范围。

首版方案：Electron/Local Runtime 只交付 Apple Silicon arm64、最低 macOS 14 的签名并 notarize Artifact；Intel Mac、Windows/Linux 明确为非目标，不登记虚假 Release PASS。出现对应真实用户、可用设备、签名账号和独立安装升级验收资源后，再建立单独 Release Scope，不默认复用 arm64 macOS 证据。

### 14.13 PostgreSQL required test 固定为 17.6

原因：公司测试环境当前只提供 PostgreSQL 17.6。只在本机 17.10 或其他更新 minor 版本通过，无法证明 Migration、RLS、事务和恢复行为与公司环境一致。

首版方案：本地、Layer 2 Integration、公司测试和 Release Gate 都必须保留精确 17.6 的 required evidence；MS0 固定 `postgres:17.6` 并增加版本门禁。公司环境升级时，先把新旧版本都加入兼容矩阵并完成 Migration/恢复验证，再修改基线，不能静默跟随 `latest`。

### 14.14 使用汽车维修供销 SaaS 纵向切片做真实验收

原因：只用合成消息和空仓库测试，无法证明前端、后端、测试三个岗位能够围绕真实业务约束共享 Goal Contract、代码、报告、冲突和需求变更；但从零实现完整行业 SaaS 会把验收载体扩张成第二个主产品。

首版方案：建立独立测试 Project，只实现门店向供应商采购配件、供应商确认/缺货、发货、门店收货入库、取消和跨租户拒绝的完整纵向切片。前端、后端、测试三个用户分别施工并共享结果；中途加入“部分到货与余量待发”需求变更，验证 Baseline Diff、Context stale、任务重开和重新验收。测试项目不进入 Sartre 领域模型，其完成状态也不能替代 Sartre 自身 MS Gate。

### 14.15 工作 Agent 暂不使用 sa-coder

原因：公司网关 `/models` 会列出 `sa-coder` 和 `sa-coder-2026-03`，但 2026-07-17 使用三个独立测试 Key 的真实 `/responses` 调用都返回 502 `Upstream service unavailable`。SuperAgentAI 配置显示该版本路由到当前不可用的 `gpt-5.2-codex`；模型可见不能证明推理可用。

首版方案：创建工作 Agent 时可选择真实调用已通过的 `gpt-5.5-2026-04-23` 或 `gpt-5.6-sol`，reasoning effort 可选 medium/high、默认 high；Steward 使用 `sa-quality-2026-03 + high`。AgentDefinitionVersion 和报告同时保存 requested/resolved model、reasoning effort、catalog digest 和 alias target。Sol 当前目录指向 `gpt-5.6-sol-2026-07-10`，但该目标不能直接请求；alias target 变化必须展示 Diff 并发布新版本。只有 `sa-coder` 完成真实 Responses、stream、tool use、Codex SDK、usage 和故障测试后，才能通过新 model policy version 重新进入候选，不静默替换运行中 Invocation。
