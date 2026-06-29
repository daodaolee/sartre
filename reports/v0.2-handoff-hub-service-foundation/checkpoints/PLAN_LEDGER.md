# PLAN LEDGER: v0.2 Handoff Hub Service Foundation

- Goal: `9.1`
- Scope: NestJS + PostgreSQL Handoff Hub 服务端基础闭环，保留 Web Console / Connector / Electron 的代码边界。
- Boundary: 不提交、不推送、不发布；不删除 v0.1 historical baseline；不继续扩旧 Tauri UI。

## Current Gate

- Active step: complete
- Last completed checkpoint: `02-service-foundation-closeout.md`
- Blockers:
  - Full `pnpm run lint` 仍会被 historical `docs/samples/spine-derivation/*.json` 格式化差异阻断。
  - Full `pnpm run build` 仍会被 historical desktop `apps/desktop/src/App.test.tsx:231` TypeScript 问题阻断。
  - Full `git diff --check` 仍会报告 historical docs 空白问题：`docs/19-prd-sop-and-checker.md`、`docs/archive/pre-contract-pivot/00-domain-model.md`、`docs/samples/prd-template/PRD写作模板.md`。
- Next step: 进入 Web Console / Local Connector 引导体验设计，或单独清理 historical baseline 质量门禁。

## Plan Index

| ID | Step | Status | Evidence | Notes |
| --- | --- | --- | --- | --- |
| 01 | context-load | DONE | `AGENTS.md`; `.agents/rules/core.md`; `spec/*`; `plan/v0.2-handoff-hub-service-foundation-goal.md` | 已确认新主线和硬约束 |
| 02 | environment-check | DONE | `node --version`; `pnpm --version`; `/Library/PostgreSQL/17/bin/psql --version`; `pg_isready` | Node/pnpm 可用；系统 Postgres 需密码；隔离库可用 |
| 03 | plan-reset | DONE | `plan/00-master-plan.md` | 主线切为 Handoff Hub 服务端优先 |
| 04 | architecture-specs | DONE | `spec/HandoffHubArchitectureSpec.md`; `spec/AgentConnectorUXSpec.md`; `spec/ArchitectureFitnessSpec.md`; `spec/UISpec.md` | 新增服务端、Connector UX、架构检查、UI 方向 |
| 05 | service-scaffold | DONE | `apps/hub-api/**`; `packages/domain/**`; `packages/contracts/**`; `packages/sdk/**`; `apps/connector-cli/**`; `apps/web-console/**` | NestJS + shared packages |
| 06 | domain-red-tests | DONE | `packages/domain/src/handoff/*.test.ts`; `packages/contracts/src/*.test.ts`; `packages/sdk/src/*.test.ts`; `apps/hub-api/src/modules/handoff/*.test.ts` | 已保留测试覆盖，当前 fresh run 为 Green |
| 07 | domain-green | DONE | `packages/domain/src/handoff/*.ts` | TaskHandoff / Delivery / Pack |
| 08 | persistence-api-sse | DONE | `apps/hub-api/src/modules/handoff/infrastructure/**`; `apps/hub-api/src/modules/handoff/interfaces/**` | Postgres + REST + SSE |
| 09 | demo-verification | DONE | `pnpm run hub:demo:local` | 单机双身份闭环 |
| 10 | final-closeout | DONE | `02-service-foundation-closeout.md` | 结果与验证报告 |

## Cross-Step Contracts

- `packages/domain` 不得依赖 Nest、DB、HTTP、文件系统。
- `apps/web-console` / `apps/connector-cli` 后续只能通过 `packages/contracts` / `packages/sdk` 使用服务端。
- Handoff Envelope 固定，Handoff Pack 内容自由。
- `acknowledged` 之前不得把任务视为已收到。
- v0.1 Tauri/Rust 内容为 historical baseline，不作为 v0.2 主线。
