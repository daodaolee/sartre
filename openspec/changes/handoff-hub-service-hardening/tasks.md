## 1. Governance

- [x] 1.1 Create BDD, acceptance checklist, goal plan, and PLAN_LEDGER for handoff-hub-service-hardening
- [x] 1.2 Validate OpenSpec change artifacts

## 2. Test First

- [x] 2.1 Add failing Hub API E2E test for terminal ack returning HTTP 400 InvalidInput
- [x] 2.2 Add failing Hub API E2E test for missing delivery returning HTTP 404 Unavailable
- [x] 2.3 Add failing migration test for clean database migration idempotency
- [x] 2.4 Add failing contracts/SDK tests for event replay response parsing
- [x] 2.5 Add failing Hub API E2E test for endpoint replay by cursor
- [x] 2.6 Add failing fixture tests for local Dev/QA identities

## 3. Migration Path

- [x] 3.1 Move current Hub schema into executable SQL migration files
- [x] 3.2 Add migration runner and migration ledger table
- [x] 3.3 Update DatabaseService to use migration runner for startup and tests

## 4. Error Mapping

- [x] 4.1 Add classified HTTP error envelope contract
- [x] 4.2 Add domain/repository error mapping at Hub HTTP boundary
- [x] 4.3 Ensure terminal delivery ack returns 400 instead of default 500
- [x] 4.4 Ensure missing delivery commands return 404

## 5. Event Replay And Fixtures

- [x] 5.1 Add replay contracts and SDK method
- [x] 5.2 Add Hub replay repository/application/controller path
- [x] 5.3 Add local Dev/QA fixture module for tests and scripts
- [x] 5.4 Keep connector/service boundary through SDK/contracts only

## 6. Verification

- [x] 6.1 `pnpm --filter @sartre/hub-api test`
- [x] 6.2 `pnpm --filter @sartre/hub-api build`
- [x] 6.3 `pnpm --filter @sartre/contracts test`
- [x] 6.4 `pnpm --filter @sartre/contracts build`
- [x] 6.5 `pnpm --filter @sartre/sdk test`
- [x] 6.6 `pnpm --filter @sartre/sdk build`
- [x] 6.7 `pnpm run lint:v0.2`
- [x] 6.8 `pnpm run architecture:check`
- [x] 6.9 `CHANGE_NAME=handoff-hub-service-hardening pnpm harness:regression`

## 7. Closeout

- [x] 7.1 Update acceptance checklist and PLAN_LEDGER with final evidence
- [x] 7.2 Add final closeout checkpoint
