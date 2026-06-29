## 1. Governance

- [x] 1.1 Create proposal, design, spec, BDD, acceptance, goal plan, and ledger artifacts.
- [x] 1.2 Validate OpenSpec change strictly before implementation.

## 2. Test First

- [x] 2.1 Add failing Web Console tests for manual refresh success and failure.
- [x] 2.2 Add failing Web Console tests for health card summary and health command guidance.
- [x] 2.3 Verify targeted tests fail before implementation.

## 3. Web Implementation

- [x] 3.1 Add refresh state and button using event-handler side effects.
- [x] 3.2 Preserve current overview on refresh failure.
- [x] 3.3 Derive health summary from overview `health_report` in the view model.
- [x] 3.4 Add Connector health command guidance.

## 4. Harness Integration

- [x] 4.1 Add standalone regression coverage for `web-console-health-refresh-affordance`.
- [x] 4.2 Add this change to Lane A regression and scoped file checks.

## 5. Verification

- [x] 5.1 `pnpm --filter @sartre/web-console test`
- [x] 5.2 `pnpm --filter @sartre/web-console build`
- [x] 5.3 `pnpm run lint:lane-a`
- [x] 5.4 `pnpm run architecture:check`
- [x] 5.5 `CHANGE_NAME=web-console-health-refresh-affordance pnpm harness:regression`
- [x] 5.6 `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] 5.7 `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] 5.8 `pnpm exec openspec validate web-console-health-refresh-affordance --type change --strict --no-interactive`
- [x] 5.9 `git diff --check`

## 6. Closeout

- [x] 6.1 Update BDD and acceptance evidence.
- [x] 6.2 Add closeout checkpoint and post-goal plan calibration.
