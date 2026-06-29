## Why

Handoff Hub 已经能创建交接、投递、记录事件并给 Web Console 提供 overview，但仍缺少服务端产品化可靠性：schema 只靠 `ensureSchema()`，领域错误默认冒泡成 500，客户端重连只能拿 pending delivery 而不是按事件事实 replay。

现在需要先把服务端契约收硬，再让用户页面接入真实操作；否则 Web Console 会被不稳定错误语义和 replay 语义拖住。

## What Changes

- 新增 Hub schema/migration 入口，把当前表结构从 `ensureSchema()` 中抽出为可执行 SQL migration。
- 增加 HTTP error mapping，把领域/仓储错误映射成稳定响应：
  - `InvalidInput` -> `400`
  - resource unavailable -> `404`
  - unexpected internal errors -> `500`
- 增加事件 replay/cursor 语义，允许客户端按 cursor/last event id 获取持久化 lifecycle facts。
- 补齐 Dev/QA 本地身份 fixture，支持后续 Web Console 本地模拟两类用户。
- 保持 Hub 只管理 envelope、delivery state、event facts 和 artifact metadata；不固定角色 payload 结构。
- 增加 scoped harness gate 覆盖 migration、错误响应、replay、SDK/contract 边界。

## Capabilities

### New Capabilities

- `handoff-hub-service-hardening`: Handoff Hub exposes reliable migration, classified error responses, event replay, and local Dev/QA fixture semantics for downstream clients.

### Modified Capabilities

- `local-connector`: Connector reconnect behavior may consume event replay/cursor facts instead of relying only on pending delivery redelivery.

## Impact

- Affected code:
  - `apps/hub-api/src/modules/handoff/**`
  - `apps/hub-api/src/scripts/**`
  - `packages/contracts/src/**`
  - `packages/sdk/src/**`
  - `scripts/harness-regression.sh`
- Affected artifacts:
  - `openspec/changes/handoff-hub-service-hardening/**`
  - `bdd/features/handoff-hub-service-hardening.md`
  - `acceptance/checklists/handoff-hub-service-hardening.md`
  - `reports/handoff-hub-service-hardening/**`
- No Web Console production UI changes in this change.
- No runtime packaging changes.
- No auth, multi-tenant UI, queue worker, or remote Codex/Claude control.
