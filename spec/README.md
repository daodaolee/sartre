# Sartre 规格索引

> 当前结论：目标设计的核心语义和已知产品决策均已确认，可以进入 MS0 实施计划。Steward 的主动检测和 `@Steward` 语义 Job 统一使用平台专用 Service Credential，不使用或回退到任何 Human 的个人 Key。当前仓库代码仍是 legacy MVP，生产结论为 **NO-GO**。
> “核心语义已确认”只表示产品和架构可以进入实施计划，不表示新仓库已创建、能力已实现或生产门禁已通过。
> 目标路径 `/Users/xy/xykj/sartre` 已存在，但目前是空的非 Git 目录；由 MS0 初始化。legacy 应用代码自 2026-07-17 起功能冻结。

## 1. 三种状态不要混读

| 状态 | 表示什么 | 当前结论 |
| --- | --- | --- |
| 目标设计 | 新生产仓库必须实现的产品语义、架构约束和验收标准。 | 已确认，可进入 MS0 实施计划。 |
| Legacy 实现 | 当前仓库中可运行或可演示的旧 MVP 代码。 | 有历史验证结果，但不满足目标模型，NO-GO。 |
| 生产证据 | 绑定指定 commit、构建产物、Schema 和环境的真实测试结果。 | 只有历史 legacy 快照；新仓库尚无生产证据。 |

文档中出现“必须”“禁止”时，描述的是目标约束；出现“当前代码”“legacy”时，描述的是旧实现。任何报告离开其 commit、产物和环境后都不能继续证明当前状态。

## 2. 冲突裁决

同一概念发生冲突时按以下顺序裁决：

```text
spec/ 项目宪法
> workflow/ 证据与交付规则
> plan/ 当前实施计划
> docs/ 解释性设计
> reports/ 指定时间和基线的审计结果
> 代码注释
```

`docs/plans/2026-07-16-multi-user-ai-native-workspace-design.md` 保存完整设计和决策理由，不是第二套规范。发现它与 `spec/` 不一致时，先修正文档漂移，不能让实现者自行选择。

## 3. 权威规格

1. `ProgramSpec.md`：产品解决什么问题、首版包含什么、明确不做什么，以及记录与权威边界。
2. `DDDSpec.md`：通用语言、限界上下文、聚合所有权和跨上下文交互规则。
3. `StateMachineSpec.md`：Requirement、Baseline、岗位任务、Execution、Lease 等状态和转换门禁。
4. `ArchitectureConstraints.md`：模块依赖、安全、事务、租户和 Electron/Runtime 红线。
5. `ModuleContractSpec.md`：跨模块 Command、Event、Result、DTO、错误和版本兼容合同。
6. `HubApiSpec.md`：Human/Endpoint 身份、租户授权、Command 事务、SSE、Worker 和部署约束。
7. `ElectronAppSpec.md`：Electron 进程、IPC、安全配置、Local Runtime 生命周期和发布边界。
8. `UIDesignV2Spec.md`：需求优先的信息架构、左侧导航、中间工作区、右侧抽屉和完整交互流程。
9. `LocalRuntimeSpec.md`：Endpoint、Project Binding、caller Runtime、Agent 版本/工具、个人 ProviderProfile 和本地持久化边界。
10. `ExecutionArchitectureSpec.md`：ExecutionPlan、Project Lease、ContextSnapshot、ExecutionResult、Steward 和恢复语义。
11. `TestStrategy.md`：四层生产门禁、证据等级、第一版用户诊断、容量、安全、故障和发布红线。
12. `BDD_TestSpec.md`：需要以行为场景覆盖的角色、主链、诊断、拒绝路径和恢复路径。
13. `AcceptanceScenarioSpec.md`：前端、后端、测试三个岗位通过汽车维修供销 SaaS 纵向切片进行真实多人验收的统一场景。

`AgentConnectorUXSpec.md` 与 `HandoffHubArchitectureSpec.md` 仅为历史链接兼容页，不是独立权威规格，不应继续承载新决策。

## 4. 按角色阅读

- 产品与需求负责人：`ProgramSpec` -> `DDDSpec` -> `UIDesignV2Spec` -> `StateMachineSpec`。
- Hub/数据库工程师：`DDDSpec` -> `ArchitectureConstraints` -> `ModuleContractSpec` -> `HubApiSpec` -> `DATABASE-SCHEMA`。
- Electron/Runtime 工程师：`ElectronAppSpec` -> `UIDesignV2Spec` -> `LocalRuntimeSpec` -> `ExecutionArchitectureSpec`。
- 安全与架构评审：`ArchitectureConstraints` -> `HubApiSpec` -> `ExecutionArchitectureSpec` -> `TestStrategy`。
- 测试与质量：`StateMachineSpec` -> `BDD_TestSpec` -> `TestStrategy` -> `workflow/harness-sop.md`。
- 需要理解决策理由：先读完整设计文档，再回到上述权威规格核对最终合同。

## 5. 关键语义

- Canonical Record：Hub 对消息、事件和状态的唯一正式记录；只证明记录存在，不保证自然语言内容为真。
- Confirmed Context：经有权 Human 确认，团队和 Agent 可以依赖的语义约束。
- Mechanical Fact：身份、权限、状态、版本、hash、cursor、Lease 等由程序维护的精确事实。
- Requirement 是需求生命周期，Session 是其中一段对话，Workstream 在 UI 中称“岗位任务”，Execution 是一次 Agent 运行。
- Hub 保存共享记录和文件元数据；对象存储保存明确共享的大文件正文；Local Runtime 保存真实路径、未共享代码、credential 和运行中间状态。
- 第一版 PostgreSQL required test 基线固定为 17.6；首个生产 Electron Release 只支持 Apple Silicon arm64、最低 macOS 14，Windows/Linux 和 Intel Mac 明确延后。
- 创建工作 Agent 时可在平台 allowlist 中选择 `gpt-5.5-2026-04-23` 或 `gpt-5.6-sol`，并选择 `medium/high` reasoning effort；默认 `gpt-5.5-2026-04-23 + high`。Steward 固定 `sa-quality-2026-03 + high`。模型策略变化必须形成新定义/配置版本并重新验证。
- 用户工作 Agent 首版只使用 TypeScript `@openai/codex-sdk`；每台设备一个 Local Runtime daemon，按 Invocation 创建隔离 AgentRun，不按 Agent 启动独立服务。
- 共享 Agent 只共享不可变 Agent/Skill/MCP 定义版本；每次 mention 在调用者 Runtime 使用其自己的 ProjectBinding 和公司网关 Credential 执行，不使用创建者运行环境。
- Invocation 锁定全部定义版本；触发前发现 execution config 变化时必须展示 Diff 并由调用者确认最新版。
- Steward 是每 Session 的系统 Agent 身份和内容管理流程，使用确定性投影和可选单次结构化推理；它不是用户创建的工作 Agent，不运行通用 Agent Loop。
- 所有 Steward 语义 Job 由 Hub Worker 使用平台专用 Service Credential 执行；凭据通过 Secret Manager/Kubernetes Secret 注入，不进入数据库、Renderer、日志或会话，也不按 Session 创建者或 mention 用户切换。
- Codex thread 和 Steward 模型调用都是临时 provider state；Hub Session Message ledger、ContextSnapshot、ExecutionCheckpoint 和当前文件状态才是协作与恢复依据。

## 6. Legacy 边界

旧 MS1-MS9、active OpenSpec change、Phase、Dispatch、WorkItem、Handoff、Delivery、Memory、FailureRecord、Workspace Token 和 Connector CLI 只描述当前 legacy MVP，不定义目标产品，也不建立到新模型的兼容映射。

当前历史报告只能证明 legacy 代码在报告记录的时间和基线下得到的结果。新仓库完成 MS0-MS8、四层 required gate 全部 PASS，且证据绑定待发布产物前，不得宣称 Sartre 已可生产使用。
