# Acceptance Checklist: Event Store and Delivery State

## Product Acceptance

- [x] Hub records delivery lifecycle events as audit facts.
- [x] Overview timeline includes persisted delivery failed/expired/report events.
- [x] Overview metrics count failed deliveries from real state.
- [x] Web Console renders failed delivery metric and failed timeline state from Hub data.
- [x] Failed and expired deliveries behave as terminal delivery states.

## Engineering Acceptance

- [x] Delivery domain state machine includes `pending_delivery`, `delivered`, `acknowledged`, `failed`, and `expired`.
- [x] Illegal terminal-state transitions are rejected by domain tests.
- [x] Contracts expose failed/expired delivery status.
- [x] Hub API persists lifecycle events in PostgreSQL.
- [x] Delivery state updates and event appends are done in one repository operation.
- [x] Hub API exposes `POST /deliveries/:deliveryId/fail`.
- [x] Hub API exposes `POST /deliveries/:deliveryId/expire`.
- [x] SDK exposes `failDelivery()` and `expireDelivery()`.
- [x] Web Console continues to consume Hub through `@sartre/sdk` / `@sartre/contracts`.
- [x] No runtime packaging changes.

## Verification

- [x] `pnpm --filter @sartre/domain test`
- [x] `pnpm --filter @sartre/contracts test`
- [x] `pnpm --filter @sartre/hub-api test`
- [x] `pnpm --filter @sartre/sdk test`
- [x] `pnpm --filter @sartre/web-console test`
- [x] `pnpm --filter @sartre/hub-api build`
- [x] `pnpm --filter @sartre/sdk build`
- [x] `pnpm --filter @sartre/web-console build`
- [x] `pnpm run lint:v0.2`
- [x] `pnpm run architecture:check`
- [x] `CHANGE_NAME=event-store-and-delivery-state pnpm harness:regression`

## Evidence

- Regression: `reports/event-store-and-delivery-state/regression/20260623T062918Z-regression-report.md`
- Closeout: `reports/event-store-and-delivery-state/checkpoints/02-final-closeout-20260623T062658Z.md`
