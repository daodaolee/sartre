## Context

Handoff Hub 当前已经有 REST + SSE + PostgreSQL 的最小交接闭环，也有 Web Console overview read model。但 overview timeline 仍从 `handoffs / deliveries / artifacts` 当前行推导，不能回答“这件事什么时候失败、什么时候过期、什么时候补投、是否可审计”。同时 `Delivery` 领域状态机只包含 `pending_delivery / delivered / acknowledged`，与 `spec/HandoffHubArchitectureSpec.md` 要求的 `failed / expired` 不一致。

本 change 的核心是把 Hub 从“当前状态表”推进到“当前状态 + 事件事实表”的最小形态。它不是完整 event sourcing：聚合当前状态仍存在 `deliveries` 表中，事件表用于审计、overview timeline 和后续 connector 补偿。

## Goals / Non-Goals

**Goals:**

- 扩展 `Delivery` 显式状态机支持 `failed` 与 `expired`。
- 持久化 delivery lifecycle events。
- 让 overview timeline 从事件表读取，report artifact 也写入事件表。
- 让 overview `failed_deliveries` 从真实 delivery 状态计算。
- 提供最小 REST 入口让测试和后续 connector 能标记 failed/expired。
- 保持 Web Console 通过 contracts/SDK 消费 Hub，不 import Hub API 内部实现。

**Non-Goals:**

- 不实现完整 event sourcing 或重放聚合。
- 不增加鉴权、租户切换、分页、搜索。
- 不托管 Codex/Claude 会话，不远程控制本地 agent。
- 不重做 Readout 风格 UX。
- 不修改 runtime packaging。

## Decisions

### 1. Event store 是 append-only audit table，不替代当前状态表

新增 `delivery_events` 表，字段包含 `id / tenant_id / type / handoff_id / delivery_id / recipient_endpoint_id / cursor / occurred_at / payload`。

Rationale: 当前代码已经有 `deliveries` 当前状态表；直接切完整 event sourcing 会扩大迁移和测试面。MVP 只需要事实账本来支撑审计和 overview。

Alternative considered: 完全从事件重放 delivery 状态。暂不采用，因为当前目标是补事实源，不是重构整个 repository。

### 2. Delivery 状态机只扩展终态，不加运行态

本 change 增加：

- `fail({ now, reason })`：`pending_delivery | delivered` -> `failed`
- `expire({ now, reason })`：`pending_delivery | delivered` -> `expired`

`acknowledged / failed / expired` 都视为终态，之后不能 ack/fail/expire。

Rationale: 这能覆盖离线过期、推送失败和人工判定失败。`accepted / running / closed` 属于 handoff 处理流，不混入 delivery 投递状态。

### 3. REST 入口保持最小命令语义

新增：

- `POST /deliveries/:deliveryId/fail`
- `POST /deliveries/:deliveryId/expire`

请求体仅要求 `schema_version: "1.0"` 和可选 `reason`。服务端不解析岗位业务 payload。

Rationale: 这些入口让 connector/测试可以真实写入状态和事件，同时不引入复杂工作流。

### 4. Overview timeline 从事件表读取

`GET /overview` 查询 `delivery_events`，按 `occurred_at desc`/`cursor desc` 返回 timeline，再拼接 report event。若既有 DB 中没有事件表行，当前 active test reset 会重建；非目标是不做复杂 backfill。

Rationale: overview 必须展示可审计事实，而不是仅从当前状态猜测生命周期。

### 5. Reports 继续保留 artifacts metadata，但写事件事实

`POST /handoffs/:id/artifacts` 写入 artifact 后，如果 artifact kind 包含 `report`，追加 `artifact.report_returned` event。

Rationale: Artifact 是产物索引，事件表记录“报告已返回”事实。两者职责不同。

## Risks / Trade-offs

- [Risk] 新事件表与当前状态表可能写入不一致。Mitigation: repository 方法在同一事务内更新 delivery 和 append event。
- [Risk] 既有数据没有事件行导致 timeline 变少。Mitigation: 当前 change 只保证新写入链路；backfill 留到单独 migration goal。
- [Risk] failed/expired 语义被滥用为业务失败。Mitigation: 文档和命名限定为 delivery 投递失败/过期，不代表 QA 测试失败。
- [Risk] Event payload 变成业务结构约束。Mitigation: payload 只放 reason/name/kind 等 metadata，不强制 dev/QA 专属字段。

## Migration Plan

1. 在 `DatabaseService.ensureSchema()` 中创建 `delivery_events` 表。
2. 更新 contracts/domain/repository/controller/SDK。
3. 对所有新写入路径追加事件：
   - create online delivery -> `delivery.delivered`
   - create offline handoff -> `handoff.queued`
   - reconnect -> `delivery.redelivered`
   - ack -> `delivery.acknowledged`
   - fail -> `delivery.failed`
   - expire -> `delivery.expired`
   - report artifact -> `artifact.report_returned`
4. 更新 overview timeline 与 metrics 查询。
5. 用 tests/build/lint/architecture/scoped harness 验证。

Rollback: 保留 `delivery_events` 表不会影响当前状态表。若回滚代码，overview 可恢复到 derived timeline，但 failed/expired endpoints 不再可用。

## Open Questions

- 既有数据是否需要 backfill event rows：本 change 不做，等真实使用后评估。
- failed/expired 是否需要自动定时任务：本 change 只提供显式命令入口，不引入 scheduler。
