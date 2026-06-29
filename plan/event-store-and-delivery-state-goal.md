# Goal: Event Store and Delivery State

## Objective

Make Handoff Hub a stronger delivery fact source by persisting lifecycle events and adding explicit failed/expired delivery states.

## Scope

- Delivery state machine:
  - `pending_delivery`
  - `delivered`
  - `acknowledged`
  - `failed`
  - `expired`
- Persist lifecycle events in PostgreSQL.
- Update overview timeline and `failed_deliveries` metrics to use real persisted facts.
- Add public Hub API and SDK commands for failed/expired delivery.
- Keep Web Console as a read-only consumer of overview data.

## Non-goals

- No full event sourcing rewrite.
- No auth or tenant switching.
- No scheduler/automatic expiry job.
- No Readout-style UX redesign.
- No runtime packaging changes.

## Verification

- `pnpm --filter @sartre/domain test`
- `pnpm --filter @sartre/contracts test`
- `pnpm --filter @sartre/hub-api test`
- `pnpm --filter @sartre/sdk test`
- `pnpm --filter @sartre/web-console test`
- `pnpm --filter @sartre/hub-api build`
- `pnpm --filter @sartre/sdk build`
- `pnpm --filter @sartre/web-console build`
- `pnpm run lint:v0.2`
- `pnpm run architecture:check`
- `CHANGE_NAME=event-store-and-delivery-state pnpm harness:regression`
