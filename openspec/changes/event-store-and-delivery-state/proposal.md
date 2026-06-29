## Why

`web-console-hub-backed-overview` 已让 Web Console 读取 Hub overview，但 timeline 仍由当前行数据临时推导，`failed_deliveries` 也只能返回 `0`。这会让 Hub 作为交接事实源的审计能力不足：投递失败、过期、补投和报告回传都没有统一事件账本可追溯。

## What Changes

- Hub API 增加持久化 delivery event store，记录 handoff queued、delivery delivered/redelivered/acknowledged/failed/expired、artifact report returned 等事实。
- Delivery 领域状态机扩展 `failed` 与 `expired`，非法转换继续显式报错。
- Hub API 增加最小失败/过期入口，用于真实写入状态和事件：
  - `POST /deliveries/:deliveryId/fail`
  - `POST /deliveries/:deliveryId/expire`
- Overview timeline 改为从事件表读取，不再只从当前行数据推导。
- Overview `failed_deliveries` 从真实 delivery 状态计算。
- Contracts/SDK 扩展 delivery status 与对应方法。
- Web Console 保持现有信息架构，只消费新的真实 status/timeline/metrics。
- Scoped harness 增加本 change 的真实测试、构建、lint、架构和 diff gate。

## Capabilities

### New Capabilities

- `event-store-and-delivery-state`: Handoff Hub persists delivery lifecycle events and exposes failed/expired delivery states through contracts, API, SDK, and overview.

### Modified Capabilities

- `web-console-hub-backed-overview`: Overview timeline and failed delivery metrics must come from persisted Hub facts instead of derived placeholders.

## Impact

- Affected code:
  - `packages/domain/src/handoff/delivery.ts`
  - `packages/contracts/src/index.ts`
  - `packages/sdk/src/**`
  - `apps/hub-api/src/modules/handoff/**`
  - `apps/web-console/src/**`
  - `scripts/harness-regression.sh`
- Affected artifacts:
  - `openspec/changes/event-store-and-delivery-state/**`
  - `bdd/features/event-store-and-delivery-state.md`
  - `acceptance/checklists/event-store-and-delivery-state.md`
  - `reports/event-store-and-delivery-state/**`
- No runtime packaging changes.
- No auth/tenant switching, pagination, or full event-sourcing rewrite in this change.
