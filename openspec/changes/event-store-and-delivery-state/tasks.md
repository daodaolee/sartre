## 1. Governance

- [x] 1.1 Create BDD, acceptance checklist, goal plan, and PLAN_LEDGER for event-store-and-delivery-state
- [x] 1.2 Validate OpenSpec change artifacts

## 2. Test First

- [x] 2.1 Add failing Delivery state machine tests for failed and expired terminal states
- [x] 2.2 Add failing contracts tests for failed/expired delivery status and event-backed overview timeline
- [x] 2.3 Add failing Hub API e2e tests for persisted events, failed/expired commands, overview timeline, and failed metrics
- [x] 2.4 Add failing SDK tests for failDelivery and expireDelivery
- [x] 2.5 Add failing Web Console test for failed delivery metric/timeline rendering

## 3. Domain And Contracts

- [x] 3.1 Extend Delivery status union and explicit transition methods
- [x] 3.2 Extend contracts delivery status and lifecycle event DTOs
- [x] 3.3 Keep pack/artifact payloads free-form and metadata-only

## 4. Hub Event Store

- [x] 4.1 Add `delivery_events` schema and row mapping in Hub Postgres infrastructure
- [x] 4.2 Append lifecycle events transactionally in create, reconnect, ack, fail, expire, and report paths
- [x] 4.3 Add fail/expire repository ports, application methods, and controller endpoints
- [x] 4.4 Update overview timeline and failed metrics to use persisted facts

## 5. SDK And Web Console

- [x] 5.1 Add SDK `failDelivery()` and `expireDelivery()`
- [x] 5.2 Ensure Web Console renders failed delivery metric and failed/expired timeline entries from overview

## 6. Verification

- [x] 6.1 `pnpm --filter @sartre/domain test`
- [x] 6.2 `pnpm --filter @sartre/contracts test`
- [x] 6.3 `pnpm --filter @sartre/hub-api test`
- [x] 6.4 `pnpm --filter @sartre/sdk test`
- [x] 6.5 `pnpm --filter @sartre/web-console test`
- [x] 6.6 `pnpm --filter @sartre/hub-api build`
- [x] 6.7 `pnpm --filter @sartre/sdk build`
- [x] 6.8 `pnpm --filter @sartre/web-console build`
- [x] 6.9 `pnpm run lint:v0.2`
- [x] 6.10 `pnpm run architecture:check`
- [x] 6.11 `CHANGE_NAME=event-store-and-delivery-state pnpm harness:regression`

## 7. Closeout

- [x] 7.1 Update acceptance checklist and PLAN_LEDGER with final evidence
- [x] 7.2 Add final closeout checkpoint
