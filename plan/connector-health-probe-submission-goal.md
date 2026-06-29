# Goal: Connector Health Probe Submission

## Objective

Let a local Connector profile probe workstation readiness and submit the result to Hub so Web Console can display real endpoint health through the existing overview projection.

## Scope

- Add Connector Core health report builder and submission function.
- Add CLI `health <dev|qa>` command.
- Add tests first and capture red/green evidence.
- Add harness regression and evidence coverage.

## Non-Scope

- No Hub API or database contract change.
- No Web Console UI redesign in this goal.
- No real Codex/Claude/MCP/plugin/hook/subagent execution.
- No forced Dev-to-QA payload schema such as repo, branch, commit range.

## Execution Plan

1. Complete governance artifacts and OpenSpec validation.
2. Add failing Connector Core and CLI tests.
3. Implement minimal Connector Core probe and submission functions.
4. Wire CLI command.
5. Add harness integration.
6. Run full verification and update acceptance/ledger/closeout.

## Verification Gate

- `pnpm --filter @sartre/connector-core test`
- `pnpm --filter @sartre/connector-cli test`
- `pnpm --filter @sartre/connector-core build`
- `pnpm --filter @sartre/connector-cli build`
- `pnpm run lint:lane-a`
- `pnpm run architecture:check`
- `CHANGE_NAME=connector-health-probe-submission pnpm harness:regression`
- `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- `pnpm harness:evidence -- --change lane-a-service-baseline`
- `pnpm exec openspec validate connector-health-probe-submission --type change --strict --no-interactive`
- `git diff --check`
