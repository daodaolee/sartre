# Tasks

## 1. Governance

- [x] 1.1 Create proposal, design, spec, BDD, acceptance, and ledger artifacts.

## 2. Test First

- [x] 2.1 Add a failing App test for reconnecting the selected actor from the page.
- [x] 2.2 Verify the test fails before UI implementation.

## 3. Implementation

- [x] 3.1 Add a `Connect endpoint` action to the replay operation block.
- [x] 3.2 Reuse existing `runOperation` and cursor update behavior.
- [x] 3.3 Keep the control visually consistent with existing action buttons.

## 4. Harness Integration

- [x] 4.1 Add OpenSpec validation and file checks for this change to Lane A harness.
- [x] 4.2 Add this change to scoped secret and diff checks.

## 5. Verification

- [x] 5.1 `pnpm --filter @sartre/web-console test`
- [x] 5.2 `pnpm --filter @sartre/web-console build`
- [x] 5.3 `pnpm run lint:lane-a`
- [x] 5.4 `pnpm run architecture:check`
- [x] 5.5 `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] 5.6 `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] 5.7 `pnpm exec openspec validate web-console-agent-reconnect-control --type change --strict --no-interactive`
- [x] 5.8 `git diff --check`

## 6. Closeout

- [x] 6.1 Update BDD and acceptance evidence.
- [x] 6.2 Add closeout checkpoint and post-goal plan calibration.
