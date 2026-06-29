# PLAN_LEDGER: Provider Model Registry

## Goal

Build the first provider/model/executor registry slice: Sartre-owned registry contracts, Hub persistence/API, SDK helpers, and Web Console read projection.

## Execution Index

| Step | Status | Evidence |
| --- | --- | --- |
| 1. OpenSpec proposal/design/spec/tasks | DONE | `openspec/changes/provider-model-registry/`; strict validation passed |
| 2. BDD and acceptance skeleton | DONE | `bdd/features/provider-model-registry.md`, `acceptance/checklists/provider-model-registry.md` |
| 3. Contracts and SDK TDD | DONE | `pnpm --filter @sartre/contracts test` PASS (3 files, 23 tests); `pnpm --filter @sartre/sdk test` PASS (1 file, 13 tests) |
| 4. Hub API TDD | DONE | `DATABASE_URL=postgresql://xy@localhost:55432/sartre_hub_provider_registry_test pnpm --filter @sartre/hub-api test` PASS (6 files, 20 tests) |
| 5. Web Console TDD | DONE | RED failed on missing "模型" navigation; GREEN `pnpm --filter @sartre/web-console test` PASS (4 files, 28 tests) |
| 6. Verification and live smoke | DONE | `reports/provider-model-registry/checkpoints/01-closeout-20260625T033325Z.md`; builds, architecture check, OpenSpec strict, diff check, and live Hub/Postgres smoke passed |

## Evidence Policy

- `SCENARIO_REGISTERED`: BDD and acceptance skeleton before implementation.
- `REAL_TEST`: Vitest/build/live smoke commands that were actually run.
- `STRUCTURAL_CHECK`: OpenSpec strict validation and architecture checks.
- `MANUAL_REQUIRED`: Any UI behavior not covered by deterministic tests.
