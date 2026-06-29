# Proposal: Web Console First Version Loop

## Why

The service baseline is now independently verifiable, but the current Lane A worktree has no Web Console app. The first version needs a page surface that can read Handoff Hub overview state and trigger basic user operations through public SDK/contracts, without importing Hub API internals or coupling to Connector CLI app code.

## What Changes

- Add `apps/web-console` as an independently managed app package.
- Use `@sartre/sdk` and `@sartre/contracts` for all Hub interactions.
- Render Hub overview state: metrics, endpoints, handoffs, deliveries, timeline, reports.
- Provide local Dev/QA operations: register endpoint, create demo handoff, replay events, ack/fail/expire delivery.
- Keep connector command guidance as UI text only; no app package dependency on `@sartre/connector-cli`.
- Add Web Console tests/build/lint to the Lane A loop.

## Impact

- Affected code:
  - `apps/web-console/**`
  - `package.json`
  - `pnpm-lock.yaml`
  - `scripts/harness-regression.sh`
  - `scripts/architecture-check.ts`
  - `scripts/architecture-check.test.ts`
- No Hub API route/database schema changes.
- No runtime packaging changes.
- No publish, push, archive, reset, or revert.
