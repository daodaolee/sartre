# Checkpoint 06: final verification

## Scope

- Verified the full `local-codex-role-workspace-mvp` change after implementation.
- Evidence covers contracts, domain, SDK, Hub API, Connector Core, Connector CLI, Web Console, architecture check, OpenSpec strict validation, fake executor smoke, real Codex app-server smoke, and browser DOM validation.

## Test Evidence

- `pnpm --filter @sartre/contracts test`
  - Result: PASS, 3 test files, 23 tests.
- `pnpm --filter @sartre/domain test`
  - Result: PASS, 3 test files, 11 tests.
- `pnpm --filter @sartre/sdk test`
  - Result: PASS, 1 test file, 13 tests.
- `DATABASE_URL=postgresql://xy@localhost:55432/sartre_hub_local_codex_final_verify pnpm --filter @sartre/hub-api test`
  - Result: PASS, 6 test files, 21 tests.
- `pnpm --filter @sartre/connector-core test`
  - Result: PASS, 1 test file, 16 tests.
- `pnpm --filter @sartre/connector-cli test`
  - Result: PASS, 1 test file, 10 tests.
- `pnpm --filter @sartre/web-console test`
  - Result: PASS, 4 test files, 28 tests.

## Build Evidence

- `pnpm --filter @sartre/contracts build`
  - Result: PASS.
- `pnpm --filter @sartre/domain build`
  - Result: PASS.
- `pnpm --filter @sartre/sdk build`
  - Result: PASS.
- `pnpm --filter @sartre/hub-api build`
  - Result: PASS.
- `pnpm --filter @sartre/connector-core build`
  - Result: PASS.
- `pnpm --filter @sartre/connector-cli build`
  - Result: PASS.
- `pnpm --filter @sartre/web-console build`
  - Result: PASS.

## Architecture / Spec Evidence

- `pnpm run architecture:check`
  - Result: PASS, architecture check passed.
- `pnpm exec openspec validate local-codex-role-workspace-mvp --type change --strict --no-interactive`
  - Result: PASS, change is valid.
- `git diff --check -- apps/hub-api packages/sdk packages/connector-core apps/connector-cli apps/web-console openspec/changes/local-codex-role-workspace-mvp reports/local-codex-role-workspace-mvp`
  - Result: PASS.

## Smoke Evidence

- Fake executor smoke:
  - Command: `pnpm --filter @sartre/connector-cli test -- index.test.ts -t "executes an accepted delivery"`
  - Result: PASS.
  - Scope: deterministic fake executor validates `connector execute` SDK writeback path.
- Real Codex app-server smoke:
  - Command: `pnpm --filter @sartre/connector-cli start -- codex-smoke`
  - Result: PASS.
  - Label: `REAL_TEST`.
  - Codex command: `codex app-server --help`.

## Browser Evidence

- Started Hub API with `DATABASE_URL=postgresql://xy@localhost:55432/sartre_hub_visual_verify`.
- Started Web Console at `http://localhost:5173/`.
- Seeded one task through public HTTP APIs:
  - delivery: `delivery_f7be0eff-1ff1-46a5-ba8c-d07d02d9b3f6`
  - conversation: `conversation_66a0f0a5-4148-4919-a61d-f24285c61c63`
  - model run: `model_run_7460e96f-df46-4ad5-9b9b-d8ac337887cd`
- Browser DOM verification:
  - Task detail rendered `运行事实`.
  - Runtime showed `codex / gpt-5`.
  - Assistant output showed `QA Agent 已生成测试范围和风险报告。`
  - Navigation text did not contain `computer` or `电脑`.
- Screenshot note:
  - Browser screenshot capture timed out through the browser CDP command.
  - No screenshot artifact was produced.

## Residual Risk

- CLI `execute` has a fake executor fallback for local packaging. Real Codex app-server task execution remains the next adapter implementation step.
- Web Console task detail consumes the first loaded conversation detail. A later iteration should add direct task-to-conversation lookup if multiple conversations are visible for one endpoint.
