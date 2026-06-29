# Acceptance Checklist: Connector Trial-Run Handoff Loop

## Boundary

- [x] Trial command consumes existing pending work; it does not create handoffs.
- [x] Trial command processes one delivery only.
- [x] No real Codex/Claude/MCP/plugin/hook/subagent execution is introduced.
- [x] No Hub API route, SDK method, or database migration is introduced.
- [x] Trial report is clearly marked as trial output.

## Behavior

- [x] Connector reconnects selected profile and writes inbox entry.
- [x] Connector acknowledges the selected delivery.
- [x] Connector writes a local trial report file.
- [x] Connector reports the trial artifact through Hub boundary.
- [x] No pending handoff returns a clear error and does not call ack/report.
- [x] CLI `trial <dev|qa>` prints JSON.
- [x] Invalid trial usage does not call Hub.

## Verification

- [x] `pnpm --filter @sartre/connector-core test`
- [x] `pnpm --filter @sartre/connector-cli test`
- [x] `pnpm --filter @sartre/connector-core build`
- [x] `pnpm --filter @sartre/connector-cli build`
- [x] `pnpm run lint:lane-a`
- [x] `pnpm run architecture:check`
- [x] `CHANGE_NAME=connector-trial-run-handoff-loop pnpm harness:regression`
- [x] `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] `pnpm exec openspec validate connector-trial-run-handoff-loop --type change --strict --no-interactive`
- [x] `git diff --check`

## Evidence

- Closeout: `reports/connector-trial-run-handoff-loop/checkpoints/02-closeout-20260623T121410Z.md`
- Scoped regression: `reports/connector-trial-run-handoff-loop/regression/20260623T121101Z-regression-report.md`
- Lane A regression: `reports/lane-a-service-baseline/regression/20260623T121251Z-regression-report.md`
- Evidence gate: `pnpm harness:evidence -- --change lane-a-service-baseline` passed with 49 checks / 29 REAL_TEST.
