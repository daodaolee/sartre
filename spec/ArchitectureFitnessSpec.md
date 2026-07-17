# 架构适配检查规范

`architecture:check` 是 STRUCTURAL_CHECK，不得标为 REAL_TEST。

## 必须检查

1. 依赖方向：domain 无框架依赖，apps 不互相源码 import，renderer 只经 preload。
2. 租户边界：tenant-owned repository 无裸 ID 查询，table/migration 有 workspace_id 与 RLS。
3. 状态机：Application Service 不直接赋值 status，Command 有 expectedVersion。
4. 事务：核心写路径包含 DomainEvent 与 Outbox port。
5. 合同：跨 app DTO 来自 contracts/Zod，IPC handler 入参校验。
6. Runtime：写工具依赖 ExecutionPlan、scope、Lease 和 fencingToken。
7. Electron：contextIsolation、sandbox、webSecurity 开启，nodeIntegration 关闭，无生产 remote renderer。
8. Secret：禁止安全配置默认值、明文 token、credential 和本地路径日志。
9. Legacy：目标仓库禁止 Phase、Dispatch、WorkItem、Handoff、Delivery、Workspace Token。
10. 测试证据：STRUCTURAL_CHECK、SCENARIO_REGISTERED、SKIPPED 不得转写为 PASS/REAL_TEST。
11. 共享 Agent：Invocation contract 必须包含 callerEndpointId、Agent/Skill/MCP version id 和 executionConfigHash，目标代码不得出现 owner-runtime execution route。
12. Provider：API Key 不得进入 Hub Schema、Renderer store、AgentDefinition 或仓库 config；baseUrl 必须经 HTTPS/host allowlist 校验。

## 真实验证边界

架构检查不能证明 RLS、事务、SSE replay、Lease、Electron 安装或多用户流程正确。这些必须由 TestStrategy 的 Layer 2-4 REAL_TEST 验证。
