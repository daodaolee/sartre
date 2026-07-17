# WORKFLOW

Sartre 新仓库使用 spec + OpenSpec change + BDD + acceptance + PLAN_LEDGER + 四层 Harness。

## 流程

1. 从 `spec/` 和当前 MS 确认目标、nonGoals、权限和失败语义。
2. 创建 OpenSpec proposal/design/tasks。
3. 登记正向、拒绝、并发和故障 BDD。
4. 建立 PLAN_LEDGER 和证据需求。
5. 先写领域/合同/权限测试，再实现纵向切片。
6. 运行当层真实依赖验证，不把 mock 当生产 E2E。
7. 自审租户、事务、幂等、审计、失败和观测。
8. 生成绑定 artifact hash 的报告。
9. 用户/岗位验收后再关闭 change/MS。

## Definition of Done

- 规格、实现、BDD、Migration 和合同一致。
- required tests 真实执行且无 SKIPPED。
- Human/Endpoint actor、RLS、Project Access 和 AgentUsagePolicy 有拒绝测试。
- 并发、重试、Outbox、SSE、Lease 和恢复有证据。
- 日志/Trace 无 Secret、正文和本地路径。
- 纵向流程可由目标岗位操作。
- PLAN_LEDGER 记录风险、例外、恢复方式和后续 owner。

当前仓库 legacy change 不得继续用于新功能；新工作从新仓库 MS0 开始。
