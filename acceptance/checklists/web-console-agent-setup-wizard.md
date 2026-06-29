# Acceptance Checklist: Web Console Agent Setup Wizard

## Boundary

- [x] Setup rules live in a pure Web module.
- [x] React page renders the setup model but does not own setup rules.
- [x] The page uses existing Web operations.
- [x] The page does not import Hub API internals.
- [x] No Hub API route or database schema changes are made.

## Behavior

- [x] Selected actor controls setup wizard content.
- [x] Wizard shows role, executor, capabilities, permission, health, and trial run.
- [x] `manual_confirm` is the recommended default.
- [x] Blocked diagnostics affect health step status.
- [x] Setup actions can register, connect, and start a trial handoff.
- [x] Users are not required to edit complex JSON.

## Verification

- [x] `pnpm --filter @sartre/web-console test`
- [x] `pnpm --filter @sartre/web-console build`
- [x] `pnpm run lint:lane-a`
- [x] `pnpm run architecture:check`
- [x] `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] `pnpm exec openspec validate web-console-agent-setup-wizard --type change --strict --no-interactive`
- [x] `git diff --check`

## Evidence

- Closeout: `reports/web-console-agent-setup-wizard/checkpoints/02-closeout-20260623T111705Z.md`
- Scoped regression: `reports/web-console-agent-setup-wizard/regression/20260623T111847Z-regression-report.md`
- Lane A regression: `reports/lane-a-service-baseline/regression/20260623T111533Z-regression-report.md`
- Evidence gate: `pnpm harness:evidence -- --change lane-a-service-baseline` passed with 31 checks / 19 REAL_TEST
