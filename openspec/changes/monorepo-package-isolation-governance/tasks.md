# Tasks

## 1. Governance

- [x] 1.1 Create proposal, design, spec, BDD, acceptance, and ledger artifacts

## 2. Test First

- [x] 2.1 Add failing architecture test for app-to-app imports
- [x] 2.2 Add failing Hub API package dependency test for `@sartre/connector-cli`
- [x] 2.3 Add failing Connector CLI/shared profile parity test if needed

## 3. Implementation

- [x] 3.1 Export local demo profile facts from `@sartre/contracts`
- [x] 3.2 Update Connector CLI profiles to use shared contract facts
- [x] 3.3 Remove Hub API imports from `@sartre/connector-cli`
- [x] 3.4 Remove `@sartre/connector-cli` from Hub API dependencies
- [x] 3.5 Strengthen architecture check for app-to-app imports
- [x] 3.6 Update Lane A harness to prove service builds without Connector CLI

## 4. Verification

- [x] 4.1 `pnpm exec vitest run scripts/architecture-check.test.ts`
- [x] 4.2 `pnpm --filter @sartre/contracts test`
- [x] 4.3 `pnpm --filter @sartre/connector-cli test`
- [x] 4.4 `pnpm --filter @sartre/hub-api test`
- [x] 4.5 `pnpm --filter @sartre/hub-api build`
- [x] 4.6 `pnpm run lint:lane-a`
- [x] 4.7 `pnpm run architecture:check`
- [x] 4.8 `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`

## 5. Closeout

- [x] 5.1 Update acceptance and readiness evidence
- [x] 5.2 Add closeout checkpoint
