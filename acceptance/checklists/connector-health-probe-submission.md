# Acceptance Checklist: Connector Health Probe Submission

## Boundary

- [x] Connector Core owns local health report construction.
- [x] Connector CLI only parses commands, creates SDK client, and prints JSON.
- [x] No Hub API contract or migration change is introduced.
- [x] No real Codex/Claude/MCP/plugin/hook/subagent execution is introduced.
- [x] Health report does not require repo, branch, commit range, or Dev-to-QA payload structure.
- [x] Secret-like metadata is not emitted.

## Behavior

- [x] `dev` and `qa` local demo profiles can generate health reports.
- [x] Reports include executor, workspace, inbox, artifact, and trial-run checks.
- [x] Filesystem readiness failures become blocked checks.
- [x] Health submission calls `reportEndpointHealth` with the selected endpoint id.
- [x] CLI `health <dev|qa>` prints JSON.
- [x] Invalid health command usage does not call Hub.

## Verification

- [x] `pnpm --filter @sartre/connector-core test`
- [x] `pnpm --filter @sartre/connector-cli test`
- [x] `pnpm --filter @sartre/connector-core build`
- [x] `pnpm --filter @sartre/connector-cli build`
- [x] `pnpm run lint:lane-a`
- [x] `pnpm run architecture:check`
- [x] `CHANGE_NAME=connector-health-probe-submission pnpm harness:regression`
- [x] `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] `pnpm exec openspec validate connector-health-probe-submission --type change --strict --no-interactive`
- [x] `git diff --check`

## Evidence

- Closeout: `reports/connector-health-probe-submission/checkpoints/02-closeout-20260623T115255Z.md`
- Scoped regression: `reports/connector-health-probe-submission/regression/20260623T115110Z-regression-report.md`
- Lane A regression: `reports/lane-a-service-baseline/regression/20260623T115132Z-regression-report.md`
- Evidence gate: `pnpm harness:evidence -- --change lane-a-service-baseline` passed with 41 checks / 25 REAL_TEST.
