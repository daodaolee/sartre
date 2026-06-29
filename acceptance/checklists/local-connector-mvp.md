# Acceptance Checklist: local-connector-mvp

## Governance

- [x] OpenSpec change exists and validates.
- [x] BDD feature exists and evidence levels are updated from real output.
- [x] Acceptance checklist is updated from real output.
- [x] PLAN_LEDGER exists and has no unresolved blocker.

## Connector CLI

- [x] `connector profile qa` outputs local QA profile.
- [x] `connector profile dev` outputs local Dev profile.
- [x] `connector connect qa` registers and connects QA endpoint.
- [x] `connector listen qa --once` can receive one SSE delivery.
- [x] Connector writes `.sartre/inbox/<handoff-id>/handoff.md`.
- [x] Connector writes `.sartre/inbox/<handoff-id>/pack.json`.
- [x] Connector writes `.sartre/inbox/<handoff-id>/delivery.json`.
- [x] `handoff.md` includes agent-readable ack/report instructions.
- [x] `connector inbox` lists local inbox entries.
- [x] `connector ack <delivery-id>` marks delivery acknowledged.
- [x] `connector report <handoff-id> <file>` registers a `qa-report` artifact.

## Boundaries

- [x] Connector uses `packages/sdk` and public contracts.
- [x] Connector does not import `apps/hub-api/src/**`.
- [x] No runtime packaging behavior is changed for this goal.
- [x] No git commit, push, or publish is performed.

## Verification

- [x] `pnpm exec openspec validate local-connector-mvp --type change --strict --no-interactive` passes.
- [x] `pnpm --filter @sartre/connector-cli test` passes.
- [x] `pnpm --filter @sartre/connector-cli build` passes.
- [x] `pnpm run hub:test` passes.
- [x] `pnpm run architecture:check` passes.
- [x] `CHANGE_NAME=local-connector-mvp pnpm harness:regression` passes.
- [x] local connector demo proves Dev -> QA -> local inbox -> ack/report.
- [x] Secret scan passes without real credentials.
- [x] Scoped diff check passes.

## Evidence

- Latest regression: `reports/local-connector-mvp/regression/20260622T111457Z-regression-report.md`
- Latest command: `CHANGE_NAME=local-connector-mvp pnpm harness:regression`
- Result: 0 failures.
