# ProgramSpec

## Article I: Library-First

业务逻辑先进入可测试包，再接入 app。

当前落地：

- 状态机放 `packages/domain`。
- API schema 放 `packages/contracts`。
- Hub client 放 `packages/sdk`。
- Connector 业务逻辑放 `packages/connector-core`。
- React 组件不直接写 Delivery 状态转换。
- Nest Controller 不直接写领域规则。

## Article II: 可观测接口

核心模块必须能被测试或脚本直接驱动。

当前落地：

- Vitest 覆盖 domain/contracts/sdk/connector-core。
- Hub API 用 e2e tests 验证 HTTP + repository。
- Web operation 用测试验证。
- Connector CLI 有 profile/inbox/execution 测试。
- `web:smoke:hub` 覆盖端到端本地链路。

## Article III: Test-First

行为变更先补测试，再实现。无法先写完整测试时，至少先登记 BDD/acceptance，并在实现完成前升级为真实测试或明确人工验收。

## 命名

命名使用领域语言：

- `TaskHandoff`
- `Delivery`
- `AgentEndpoint`
- `RoleCapabilityPack`
- `Conversation`
- `ContextProjection`
- `ModelRun`

避免 CRUD 式或技术泄漏式命名。
