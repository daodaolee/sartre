# PLAN_LEDGER: Platform Chat Runtime

## Goal

Build the first provider-neutral platform chat runtime slice: Sartre-owned conversation ledger, Hub persistence/API, and Web Console read projection.

## Execution Index

| Step | Status | Evidence |
| --- | --- | --- |
| 1. OpenSpec proposal/design/spec/tasks | DONE | `openspec/changes/platform-chat-runtime/` |
| 2. BDD and acceptance skeleton | DONE | `bdd/features/platform-chat-runtime.md`, `acceptance/checklists/platform-chat-runtime.md` |
| 3. Contracts TDD | DONE | RED: missing schema exports; GREEN: `pnpm --filter @sartre/contracts test` -> 2 files, 20 tests passed; SDK RED: missing client method; SDK GREEN: `pnpm --filter @sartre/sdk test` -> 1 file, 12 tests passed |
| 4. Hub API TDD | DONE | RED: missing 005 migration and `/conversations` route; GREEN: `DATABASE_URL=postgresql://xy@localhost:55432/sartre_hub_chat_runtime_green pnpm --filter @sartre/hub-api test` -> 5 files, 17 tests passed |
| 5. Web Console TDD | DONE | RED: missing `会话` navigation/read projection; GREEN: `pnpm --filter @sartre/web-console test` -> 4 files, 27 tests passed |
| 6. Verification and live smoke | DONE | `01-closeout-20260625T025413Z.md`; contracts/sdk/hub-api/web-console tests and builds passed; architecture check, OpenSpec strict, `git diff --check`, and live Hub/Postgres smoke passed |

## Evidence Policy

- `SCENARIO_REGISTERED`: BDD and acceptance skeleton before implementation.
- `REAL_TEST`: Vitest/build/live smoke commands that were actually run.
- `STRUCTURAL_CHECK`: OpenSpec strict validation and architecture checks.
- `MANUAL_REQUIRED`: Any UI behavior not covered by deterministic tests.
