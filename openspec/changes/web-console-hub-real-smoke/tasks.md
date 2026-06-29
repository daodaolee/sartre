# Tasks

## 1. Governance

- [x] 1.1 Create proposal, design, spec, BDD, acceptance, and ledger artifacts.

## 2. Test First

- [x] 2.1 Add a real Hub API + Web operations smoke test.
- [x] 2.2 Run the smoke and verify it fails before the harness path is complete.

## 3. Implementation

- [x] 3.1 Keep the smoke in `scripts/` so app packages remain isolated.
- [x] 3.2 Add any minimal test-only helpers required to start and stop the Nest app safely.
- [x] 3.3 Add a root script if needed for repeatable smoke execution.

## 4. Harness Integration

- [x] 4.1 Add OpenSpec validation and file checks for this change to Lane A harness.
- [x] 4.2 Add the real smoke to Lane A harness as `REAL_TEST`.
- [x] 4.3 Add the new change to scoped secret and diff checks.

## 5. Verification

- [x] 5.1 `pnpm exec vitest run scripts/web-console-hub-real-smoke.test.ts`
- [x] 5.2 `pnpm run lint:lane-a`
- [x] 5.3 `pnpm run architecture:check`
- [x] 5.4 `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] 5.5 `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] 5.6 `pnpm exec openspec validate web-console-hub-real-smoke --type change --strict --no-interactive`
- [x] 5.7 `git diff --check`

## 6. Closeout

- [x] 6.1 Update BDD and acceptance evidence.
- [x] 6.2 Add closeout checkpoint and post-goal plan calibration.
