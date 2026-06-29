# 领域模型

Sartre 当前核心域是“岗位 Agent 协同交接”。它要解决的是：一个岗位完成工作后，如何把上下文、附件、能力引用、人工确认、执行结果和审计事实可靠交给另一个岗位及其本地 Agent。

PRD/SOP、飞书、GitLab、Figma、项目管理工具都可以成为上游输入，但不是当前核心域。它们不得把核心 delivery schema 约束成某个岗位专用格式。

## 统一语言

| 术语 | 定义 |
| --- | --- |
| Tenant | 本地或团队隔离标识。当前本地 demo 使用 `local-demo`。 |
| Role | 岗位，例如 developer、qa。 |
| AgentEndpoint | 某个岗位下可接收和执行任务的本地端点，例如 `dev_codex_local`。 |
| RoleCapabilityPack | 从真实业务仓抽出的岗位能力集合，包含 agent、skill、command、hook、约束和执行边界。 |
| TaskHandoff | 一次岗位协同任务的业务意图和交接包入口。 |
| HandoffPack | 给目标 Agent 可读的交接上下文。Envelope 固定，pack 内容自由。 |
| Delivery | TaskHandoff 投递给某个 AgentEndpoint 后的状态事实。 |
| Artifact | 报告、截图、日志、文件等产物索引。 |
| Conversation | 平台自己的会话事实。它是 canonical history，不等同于 Codex/Claude provider session。 |
| ContextProjection | 把 canonical conversation 投影成某个 provider/model 可消费的上下文。 |
| ModelRun | 一次执行器或模型调用的审计记录。 |
| AuditEvent | 已发生的业务事实，用于恢复、诊断和时间线展示。 |

## 核心子域

### 交接事实源

负责 TaskHandoff、Delivery、Artifact、AuditEvent 的一致性。

关键职责：

- 创建任务。
- 投递给目标 AgentEndpoint。
- 支持在线推送和离线补发。
- 记录人工确认、Agent 放行、执行、结果生成、结果回传、关闭。
- 保证状态机非法转换显式失败。

### 角色能力上下文

负责把岗位能力作为可引用对象暴露给任务和聊天。

关键职责：

- 从 `.agents/capabilities/roles/*.json` 读取能力包。
- 按当前 Role / AgentEndpoint 过滤能力。
- 在 Web Console 的 `@` mention 和 Connector prompt 中使用能力引用。
- 不复制业务仓代码，不把某个岗位的工具链写死进平台核心。

> 当前边界：能力包是**只读引用**，由人工放入 `.agents/capabilities/`。
> 预留扩展点（当前不实现）：未来产品会引导使用者在平台内创建并沉淀
> agent / skill / mcp / command / hook 等维度的能力，并供引用与对话协作消费。
> 设计上为此保留入口，但首版只承诺"引用已有能力包"，不做创建与演进。

### Conversation Ledger

负责跨 provider 保存上下文。

关键职责：

- 保存消息序列、summary、tool/run/projection 引用。
- 支持 Codex 当前接入。
- 为后续 Claude 或其他 LLM 切换保留上下文。
- 不把 provider-specific session 当作唯一事实源。

## 支撑子域

| 子域 | 职责 |
| --- | --- |
| Hub API | NestJS HTTP/SSE 接口、事务边界、PostgreSQL 持久化。 |
| Web Console | 岗位身份切换、任务看板、详情、创建、回传、设置、能力管理。 |
| Local Connector | 本地端点监听、inbox/replay/health、执行器调用、报告回写。 |
| Execution Adapter | Codex CLI、fake executor、manual_confirm 等可插拔执行策略。 |

## 不变量

1. Delivery 状态只能通过领域状态机转换。
2. 未确认收到的 Delivery 不得视为接收方已处理。
3. 离线端点再次上线后必须能按 cursor 补发未确认事件。
4. HandoffPack 内容自由，但 Envelope 必须足够让目标 Agent 找到正确上下文。
5. 一个 Role 下可以有多个 AgentEndpoint。
6. 当前用户身份切换后，Web Console 必须重新按 endpoint 读取面板信息。
7. 结果回传是发送方视角的“已发送”，不是原任务的全局“待发送”状态。
8. 人工放行策略必须可配置，默认 `manual_confirm`。
9. Conversation ledger 是平台 canonical history；provider 上下文只是 projection。
10. 所有状态变化必须带 actor、reason、metadata，便于 UI 改版和服务端诊断。

## 领域事件

| 事件 | 含义 |
| --- | --- |
| `handoff.created` | 任务已创建。 |
| `delivery.queued` | 已生成投递。 |
| `delivery.delivered` | 服务端已投递或可被拉取。 |
| `delivery.acknowledged` | 目标端点已确认收到。 |
| `delivery.accepted` | 人工确认并放行给当前岗位 Agent。 |
| `delivery.running` | 本地执行器开始处理。 |
| `delivery.report_ready` | 目标岗位生成了可回传结果。 |
| `delivery.result_sent` | 当前岗位把结果发送给对方 Agent。 |
| `delivery.closed` | 任务已结束。 |
| `conversation.message_appended` | conversation ledger 追加消息。 |
| `model_run.completed` | 执行器或模型运行完成。 |

## 当前边界

当前版本只承诺本地首版：

- Dev/QA 双身份模拟。
- Codex 优先，其他 provider 后续接入。
- OSS/文件上传可以配置，但不是当前状态机核心。
- Electron 是后续壳；当前交付以 Web Console + Hub + Connector 为事实。
- 不实现 PRD 平台、云 A2A、团队 IM、完整项目管理。
