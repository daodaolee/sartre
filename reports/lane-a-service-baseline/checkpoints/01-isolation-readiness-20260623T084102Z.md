# Lane A Isolation Readiness

## Result

Lane A has been isolated into a dedicated worktree and branch:

- Branch: `codex/lane-a-service-baseline`
- Worktree: `/Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/lane-a-service-baseline`

The candidate is self-verifying through `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`.

## What Changed In Candidate

- Copied Lane A service files from the mixed workspace into the isolated worktree.
- Added `packages/connector-core` so Hub API and Connector CLI share connector behavior through a public package boundary.
- Removed Hub API's service baseline dependency on `@sartre/connector-cli`.
- Added `lint:lane-a` for service + shared package scoped lint.
- Added `lane-a-service-baseline` harness branch.
- Updated `architecture-check.ts` to reject app-to-app imports and app-to-app package dependencies while skipping generated/install directories.
- Added this candidate manifest and checkpoint.

## Verification Evidence

- `pnpm install --frozen-lockfile`: PASS.
- `pnpm --filter @sartre/domain test`: PASS, 3 files / 9 tests.
- `pnpm --filter @sartre/contracts test`: PASS, 1 file / 7 tests.
- `pnpm --filter @sartre/connector-core test`: PASS, 1 file / 3 tests.
- `pnpm --filter @sartre/sdk test`: PASS, 1 file / 8 tests.
- `pnpm --filter @sartre/hub-api test`: PASS, 4 files / 9 tests.
- `pnpm --filter @sartre/connector-cli test`: PASS, 1 file / 3 tests.
- `pnpm --filter @sartre/hub-api build`: PASS without depending on Connector CLI.
- `pnpm --filter @sartre/connector-core build`: PASS.
- `pnpm --filter @sartre/connector-cli build`: PASS.
- `pnpm run lint:lane-a`: PASS.
- `pnpm run architecture:check`: PASS.
- `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`: PASS.

Latest report:

- `reports/lane-a-service-baseline/regression/20260623T093047Z-regression-report.md`

## Known Boundary Notes

- The original root `lint:v0.2` references `apps/web-console`; this candidate intentionally uses `lint:lane-a` because Web Console is Lane B.
- The initial isolated Hub API build failure exposed an app-to-app dependency. The current candidate resolves it by moving reusable connector behavior into `@sartre/connector-core`.
- No publish was performed.
