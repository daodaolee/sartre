# Goal: Connector Trial-Run Handoff Loop

## Objective

Provide a local Connector trial command that processes one pending handoff through inbox, acknowledgement, local trial report, and artifact upload.

## Scope

- Add Connector Core trial-run function.
- Add CLI `trial <dev|qa>`.
- Add tests, harness coverage, and closeout evidence.

## Non-Scope

- No handoff creation inside trial command.
- No real LLM/provider execution.
- No Hub API, SDK, or DB changes.
- No multi-delivery batch processing.

## Verification Gate

- `pnpm --filter @sartre/connector-core test`
- `pnpm --filter @sartre/connector-cli test`
- `pnpm --filter @sartre/connector-core build`
- `pnpm --filter @sartre/connector-cli build`
- `pnpm run lint:lane-a`
- `pnpm run architecture:check`
- `CHANGE_NAME=connector-trial-run-handoff-loop pnpm harness:regression`
- `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- `pnpm harness:evidence -- --change lane-a-service-baseline`
- `pnpm exec openspec validate connector-trial-run-handoff-loop --type change --strict --no-interactive`
- `git diff --check`
