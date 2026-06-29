# Engineering Principles

## SRP

每个模块只有一个变化原因。

- Domain 只管领域规则。
- Contracts 只管跨边界 schema。
- SDK 只管 Hub 调用。
- Hub application 只管 use case。
- Repository 只管持久化。
- Web Console 只管交互和投影。
- Connector 只管本地恢复、执行、回写。

## OCP

新增能力靠扩展，不靠改核心状态机。

- 新 executor adapter 不应改 Web Console 任务模型。
- 新岗位能力包不应改 Hub schema。
- 新 provider projection 不应迁移 conversation ledger。

## LSP

所有 executor adapter 必须返回统一结果或分类错误。调用方不能依赖具体 provider 的异常格式。

## ISP

接口按能力拆分。不会执行命令的 capability 不应被迫实现 command executor。

## DIP

高层依赖抽象和 contract。

- Web/Connector 依赖 SDK。
- Hub application 依赖 repository port。
- Repository 实现隔离 PostgreSQL。

## 可插拔点

- executor adapter
- role capability pack
- storage provider / artifact provider
- model provider
- hook/skill/command source

所有可插拔点必须有能力声明、健康状态和错误分类。
