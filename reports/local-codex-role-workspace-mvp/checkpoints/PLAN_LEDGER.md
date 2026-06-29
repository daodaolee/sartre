# local-codex-role-workspace-mvp Plan Ledger

## Current Gate

- Active step: complete
- Last completed checkpoint: 06-final-verification
- Blockers: -
- Changed assumptions:
  - `computer` is not a first-class product object for this slice; local execution is expressed through role Agent runtime binding / LLM Adapter.
- Next step: archive or continue with real Codex app-server execution adapter.

## Plan Index

| ID | Step | Status | Depends On | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 01 | governance-artifacts | DONE | - | `pnpm exec openspec validate local-codex-role-workspace-mvp --type change --strict --no-interactive` | OpenSpec, BDD, acceptance, ledger |
| 02 | delivery-start-contract | DONE | 01 | `pnpm --filter @sartre/contracts test`; `pnpm --filter @sartre/domain test`; `pnpm --filter @sartre/sdk test`; `DATABASE_URL=postgresql://xy@localhost:55432/sartre_hub_local_codex_start_red pnpm --filter @sartre/hub-api test -- handoff.e2e.test.ts` | `POST /deliveries/:deliveryId/start` + SDK helper |
| 03 | codex-executor-boundary | DONE | 02 | `pnpm --filter @sartre/connector-core test`; `pnpm --filter @sartre/connector-core build`; `pnpm --filter @sartre/connector-cli test`; `pnpm --filter @sartre/connector-cli build`; `pnpm --filter @sartre/connector-cli start -- codex-smoke` | fake adapter + real Codex app-server help smoke |
| 04 | connector-execute-command | DONE | 03 | `pnpm --filter @sartre/connector-core test`; `pnpm --filter @sartre/connector-cli test`; `pnpm --filter @sartre/connector-core build`; `pnpm --filter @sartre/connector-cli build` | `execute <dev|qa> <delivery-id>` SDK writeback |
| 05 | web-console-task-detail | DONE | 04 | `pnpm --filter @sartre/web-console test -- App.test.tsx`; `pnpm --filter @sartre/web-console build` | task detail renders execution facts, no computer nav |
| 06 | final-verification | DONE | 05 | `pnpm --filter @sartre/contracts test`; `pnpm --filter @sartre/domain test`; `pnpm --filter @sartre/sdk test`; `DATABASE_URL=postgresql://xy@localhost:55432/sartre_hub_local_codex_final_verify pnpm --filter @sartre/hub-api test`; connector/web tests/builds; `pnpm run architecture:check`; `pnpm exec openspec validate local-codex-role-workspace-mvp --type change --strict --no-interactive`; `pnpm --filter @sartre/connector-cli start -- codex-smoke` | final verification |

## Cross-Step Contracts

- Identity: tenant id, role Agent endpoint id, human actor endpoint id.
- Runtime binding: provider/model registry profile selected for endpoint; no product-level computer object.
- State machine: delivery `accepted -> running -> report_ready -> closed`; failures classified.
- Conversation ledger: prompt/assistant output/model run facts are canonical, Codex session metadata is optional.
- Connector boundary: connector imports SDK/contracts/domain-safe local executor modules, not Hub internals.
- UI boundary: Web Console renders Hub facts; no invented execution state.

## Changed Assumptions

| Date | Assumption | Change | Affected Steps | Action |
| --- | --- | --- | --- | --- |
| 2026-06-25 | Computer can be a visible workspace object | Product model hides computer; execution belongs to LLM Adapter/runtime binding | 01-06 | Encode as non-goal and UI acceptance |

## Final Delivery Gate

- [x] All required steps are `DONE` or explicitly `SUPERSEDED`.
- [x] No unresolved `BLOCKED` steps.
- [x] No unresolved `CHANGED` assumptions.
- [x] Latest regression report is referenced: `reports/local-codex-role-workspace-mvp/regression/latest.md`.
- [x] Latest acceptance report is referenced: `reports/local-codex-role-workspace-mvp/checkpoints/06-final-verification-20260625T051930Z.md`.
- [x] Latest drift report is referenced: OpenSpec strict validation passed in final checkpoint.
