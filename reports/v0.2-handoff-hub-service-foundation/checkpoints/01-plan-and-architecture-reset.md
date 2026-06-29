# Checkpoint: 01 Plan and Architecture Reset

- Date: 2026-06-22
- Goal: `9.1`
- Scope: 将项目主线从 v0.1 Tauri/Rust 本地桌面 baseline 收敛到 v0.2 NestJS + PostgreSQL Handoff Hub。

## Result

`READY_FOR_SERVICE_FOUNDATION`

## Decisions

| Decision | State |
| --- | --- |
| 服务端优先 | Adopted |
| NestJS | Adopted |
| PostgreSQL | Adopted |
| REST + SSE | Adopted for MVP |
| Web Console | Later, code boundary reserved |
| Electron | Later shell, not current architecture driver |
| Tauri | Historical baseline |
| PRD SOP / spine | Pluggable upstream, not current blocker |
| Handoff payload | Envelope fixed, Pack free |
| Local execution | mock / manual_confirm first |

## Environment Evidence

| Check | Result |
| --- | --- |
| `node --version` | `v24.11.0` |
| `pnpm --version` | `10.33.2` |
| `psql --version` | `/Library/PostgreSQL/17/bin/psql` = `17.10` |
| System Postgres | `localhost:5432 - accepting connections` |
| System DB auth | Password required for `xy` and `postgres`; no password provided |
| Isolated dev DB | `/tmp/sartre-hub-pg17`, port `55432`, database `sartre_hub`, user `xy` |

Development `DATABASE_URL` for this goal:

```text
postgresql://xy@localhost:55432/sartre_hub
```

This URL contains no password and points to the PostgreSQL 17 isolated development cluster, not the system Postgres instance on `5432`.

## Files Updated

- `plan/00-master-plan.md`
- `plan/v0.2-handoff-hub-service-foundation-goal.md`
- `spec/HandoffHubArchitectureSpec.md`
- `spec/AgentConnectorUXSpec.md`
- `spec/ArchitectureFitnessSpec.md`
- `spec/UISpec.md`
- `reports/v0.2-handoff-hub-service-foundation/checkpoints/PLAN_LEDGER.md`

## Boundary

- No service implementation yet.
- No old Tauri code removed.
- No git commit, push, or publish.
