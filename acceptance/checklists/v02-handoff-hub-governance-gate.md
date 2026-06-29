# Acceptance Checklist: v02-handoff-hub-governance-gate

## Structural Governance

- [x] OpenSpec change exists at `openspec/changes/v02-handoff-hub-governance-gate`.
- [x] OpenSpec artifacts are complete: proposal, design, specs, tasks.
- [x] Capability spec uses `## ADDED Requirements` and `#### Scenario` format.
- [x] Goal document exists at `plan/v0.2-handoff-hub-governance-gate-goal.md`.
- [x] BDD feature exists and lists evidence level per scenario.
- [x] Acceptance checklist exists and is updated from executed facts.
- [x] PLAN_LEDGER exists under `reports/v0.2-handoff-hub-governance-gate/checkpoints/`.

## Real Verification

- [x] PostgreSQL 17 login shell verification passes.
- [x] `pnpm run pg:dev:status` passes.
- [x] `pnpm run domain:test` passes.
- [x] `pnpm run contracts:test` passes.
- [x] `pnpm --filter @sartre/sdk test` passes.
- [x] `pnpm run hub:test` passes.
- [x] `pnpm run architecture:check` passes.
- [x] `pnpm run lint:v0.2` passes.
- [x] v0.2 package builds pass.
- [x] `pnpm run hub:demo:local` proves `pending_delivery -> delivered -> acknowledged` and `qa-report.md`.
- [x] `CHANGE_NAME=v02-handoff-hub-governance-gate pnpm harness:regression` passes.
- [x] Secret scan runs and does not find real credentials.
- [x] v0.2 scoped `git diff --check` passes.

## Boundary

- [x] Non-candidate lint/build/diff issues are not mislabeled as current candidate failures.
- [x] No runtime packaging behavior is changed for this goal.
- [x] No Web Console UI behavior is added for this goal.
- [x] No git commit, push, or publish is performed.

## Latest Evidence

- Regression: `reports/v0.2-handoff-hub-governance-gate/regression/latest.md`
- Latest alias: `reports/v0.2-handoff-hub-governance-gate/regression/latest.md`

## Evidence Rules

- Do not mark a BDD scenario `REAL_TEST` unless an executable command or test proves it.
- Do not mark full repo gate green while non-candidate blockers remain.
- Do not claim real GitLab/Feishu/Figma integration evidence in this goal.
- Do not claim Electron packaging evidence in this goal.
