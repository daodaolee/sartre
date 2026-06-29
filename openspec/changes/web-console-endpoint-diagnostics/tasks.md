# Tasks

## 1. Governance

- [x] 1.1 Create proposal, design, spec, BDD, acceptance, and ledger artifacts.

## 2. Test First

- [x] 2.1 Add failing pure module diagnostics tests.
- [x] 2.2 Add failing page test for selected endpoint diagnostics.
- [x] 2.3 Verify tests fail before implementation.

## 3. Implementation

- [x] 3.1 Implement `endpoint-diagnostics.ts`.
- [x] 3.2 Wire diagnostics into `toOverviewViewModel`.
- [x] 3.3 Render selected actor diagnostics in a compact panel.
- [x] 3.4 Keep styles token-based and consistent with current Vercel Geist direction.

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
- [x] 5.7 `pnpm exec openspec validate web-console-endpoint-diagnostics --type change --strict --no-interactive`
- [x] 5.8 `git diff --check`

## 6. Closeout

- [x] 6.1 Update BDD and acceptance evidence.
- [x] 6.2 Add closeout checkpoint and post-goal plan calibration.
