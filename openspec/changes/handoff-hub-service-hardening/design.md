## Context

Handoff Hub 现在已有 REST、SSE、PostgreSQL、overview、delivery event store 和 SDK/Web Console 消费链路。但服务端仍处于 demo/service foundation 状态：

- schema 由 `DatabaseService.ensureSchema()` 内联创建，缺少可审计 migration 入口。
- 领域错误例如 `IllegalTransitionError` 会通过 Nest 默认异常处理冒泡成 500。
- endpoint reconnect 只补发 pending delivery，缺少按持久化 event facts replay 的公开语义。
- Dev/QA 本地身份散落在测试和脚本里，后续 Web Console 操作页需要稳定 fixture。

本 change 是 Web Console 可操作化之前的服务端收口层。它不做 UI，只让服务端 API 和 SDK 可以被页面可靠调用。

## Goals / Non-Goals

**Goals:**

- 增加可执行 SQL migration 路径，并让测试可从干净 schema 验证。
- 增加统一 HTTP error mapping，避免领域/仓储错误全部变 500。
- 增加 event replay/cursor API 语义，让 reconnecting clients 读取持久化事实。
- 固化 `local-demo` Dev/QA fixture，供 Hub API tests、scripts、后续 Web Console 使用。
- 补齐 contracts/SDK/harness，保证客户端只经公共边界使用服务端。

**Non-Goals:**

- 不实现 auth、RBAC、多租户 UI。
- 不实现后台 scheduler 或队列 worker。
- 不远程控制 Codex/Claude。
- 不新增 Web Console production UI。
- 不强制 handoff pack 使用 repo/branch/commit range 等固定业务字段。

## Decisions

### 1. Migration 先用 SQL 文件 + runner，不引入 ORM

新增 `apps/hub-api/src/modules/handoff/infrastructure/postgres/migrations/*.sql` 和一个轻量 runner。`ensureSchema()` 调用 runner 来保持现有测试启动方式，后续部署脚本也可以复用 runner。

Rationale: 当前项目没有 Prisma/TypeORM。为了 KISS，先把 schema 从 TypeScript 字符串迁到 SQL 文件，保留 `pg`。

Alternative considered: 引入 ORM migration。暂不采用，因为会扩大依赖和生成文件面。

### 2. Error mapping 放在 Hub API HTTP boundary

新增 Nest exception filter 或等价 boundary mapper，把领域错误和资源不可用错误转成稳定 JSON：

```json
{
  "schema_version": "1.0",
  "error": {
    "category": "InvalidInput",
    "message": "Illegal transition from expired to acknowledged"
  }
}
```

Rationale: domain 不依赖 Nest；interfaces 层负责 HTTP 语义转换，符合端口适配架构。

### 3. Event replay 是读模型 API，不替代 SSE

新增或扩展公开 endpoint，例如：

```text
GET /events/replay?tenant_id=local-demo&endpoint_id=qa_codex_local&after_cursor=0
```

返回持久化 `delivery_events` 中 cursor 大于输入的 facts。SSE 仍用于在线推送；replay 用于离线/重启恢复。

Rationale: 这直接服务“质量关机后再次打开主动收到消息”的边缘情况，不需要轮询数据库，也不把状态重放逻辑塞到 Web。

### 4. Dev/QA fixture 是 seed/helper，不是鉴权身份系统

新增测试/脚本共享 fixture，只表达：

- `local-demo`
- `dev_user` / `dev_codex_local`
- `qa_user` / `qa_codex_local`
- role、capabilities、execution_mode

Rationale: 本地模拟两个用户只需要稳定标识，不需要租户/用户体系。

## Risks / Trade-offs

- [Risk] SQL migration runner 与现有 `ensureSchema()` 重叠。Mitigation: `ensureSchema()` 只调用 migration runner，逐步移除内联 DDL。
- [Risk] replay endpoint 和 SSE 事件格式漂移。Mitigation: 共用 contracts schema 和 SDK parser。
- [Risk] 错误响应引入 breaking behavior。Mitigation: 只把原 500 的可分类错误变成更准确的 400/404；测试覆盖。
- [Risk] fixture 被误认为真实 auth。Mitigation: 命名为 local demo fixture，文档标注非鉴权。

## Migration Plan

1. 抽出当前 schema 到 `001_handoff_hub_foundation.sql`。
2. 增加 migration runner 和 schema migrations ledger table。
3. 修改 `DatabaseService.ensureSchema()` 使用 runner。
4. 增加 HTTP error filter。
5. 增加 replay contracts/API/SDK。
6. 增加 Dev/QA fixture。
7. 用 scoped harness 验证。

Rollback: migration SQL 保留当前表结构，不删除数据。若 error filter/replay endpoint 回滚，已创建表和事件仍可被当前 Hub API 使用。

## Open Questions

- Replay endpoint 是否按 endpoint_id 强制过滤：本 change 默认过滤 endpoint，避免跨角色读取。
- 是否把 `ack` 终态非法转换从 500 改为 400：本 change 是目标行为。
