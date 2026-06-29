## 1. Governance

- [x] 1.1 Create proposal, design, spec, BDD, acceptance, goal plan, and ledger artifacts.
- [x] 1.2 Validate OpenSpec change strictly before implementation.

## 2. Test First

- [x] 2.1 Add failing Connector Core tests for successful trial run and no-pending error.
- [x] 2.2 Add failing Connector CLI tests for `trial <dev|qa>` output and usage.
- [x] 2.3 Verify targeted tests fail before implementation.

## 3. Connector Implementation

- [x] 3.1 Add trial-run result type and local report writer.
- [x] 3.2 Compose connect, ack, and report primitives for one delivery.
- [x] 3.3 Add CLI `trial <dev|qa>` command and usage.

## 4. Harness Integration

- [x] 4.1 Add standalone regression coverage for `connector-trial-run-handoff-loop`.
- [x] 4.2 Add this change to Lane A regression and scoped file checks.

## 5. Verification

- [x] 5.1 `pnpm --filter @sartre/connector-core test`
- [x] 5.2 `pnpm --filter @sartre/connector-cli test`
- [x] 5.3 `pnpm --filter @sartre/connector-core build`
- [x] 5.4 `pnpm --filter @sartre/connector-cli build`
- [x] 5.5 `pnpm run lint:lane-a`
- [x] 5.6 `pnpm run architecture:check`
- [x] 5.7 `CHANGE_NAME=connector-trial-run-handoff-loop pnpm harness:regression`
- [x] 5.8 `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] 5.9 `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] 5.10 `pnpm exec openspec validate connector-trial-run-handoff-loop --type change --strict --no-interactive`
- [x] 5.11 `git diff --check`

## 6. Closeout

- [x] 6.1 Update BDD and acceptance evidence.
- [x] 6.2 Add closeout checkpoint and post-goal plan calibration.
