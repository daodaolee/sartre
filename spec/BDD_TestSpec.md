# BDD 场景规范

## 文件位置

```text
bdd/<capability>/*.feature
```

## 场景要求

- 使用 Given/When/Then 描述用户可观察行为，不描述内部函数。
- 每个高风险正向场景必须有对应拒绝或故障场景。
- 场景标注 actor、Workspace、Project、Requirement 和证据等级。
- 自动化绑定必须指向真实 test id；仅登记场景标为 SCENARIO_REGISTERED。

## 必须覆盖的主线

跨岗位主线统一使用 `AcceptanceScenarioSpec.md` 的汽车维修供销 SaaS 纵向切片；它是 Sartre 的外部测试 Project，不进入 Sartre 领域模型。

1. 注册、邀请、Membership 和 Project Access。
2. 多轮需求分析、Goal Contract 版本和全员确认。
3. 岗位任务、共享 Agent mention、caller Runtime、Endpoint 离线，以及同 Session 多人并行调用隔离。
4. ExecutionPlan、Project Lease、范围扩展和 fencing reject。
5. Steward Finding、ContextSnapshot、Inbox 和证据。
6. 需求变更、任务重开和两级验收。
7. Hub/Worker/Runtime 故障、SSE replay、Outbox/DLQ 和 force release。
8. 跨 Workspace、actor 混淆、signed URL 和 Secret 泄露拒绝。
9. 给定 userId/timeRange 的 Electron action/IPC 到 Hub/Runtime 全链路诊断、首个失败点、修复后新 correlationId 验证，以及未授权诊断拒绝。
10. Codex SDK 只读分析、个人网关 Credential 隔离、Agent/Skill/MCP 版本锁定与更新提示、Plan 确认、Lease 后 Sartre MCP 写入、scope/fencing 拒绝、Provider event/usage 归一化脱敏，以及终态后无状态清理。
11. Steward 确定性投影、Codex 单次结构化推理、平台 Service Credential 隔离、主动检测与 `@Steward` 不使用/回退 Human Key、2 分钟软/5 分钟硬超时、schema 失败降级、伪造 scope/cursor 拒绝、suggested Finding 和副作用人工确认。

## 禁止

- 将 feature 文件存在视为场景通过。
- 将 mock 数据流标为生产 E2E。
- 在 Then 中只断言 HTTP 200 或组件存在。
- 因环境缺失跳过 required scenario 后继续发布。
