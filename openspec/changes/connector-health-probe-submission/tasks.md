## 1. Governance

- [x] 1.1 Create proposal, design, spec, BDD, acceptance, goal plan, and ledger artifacts.
- [x] 1.2 Validate OpenSpec change strictly before implementation.

## 2. Test First

- [x] 2.1 Add failing Connector Core tests for local health report checks and SDK submission.
- [x] 2.2 Add failing Connector CLI tests for `health <dev|qa>` command output and usage.
- [x] 2.3 Verify targeted tests fail before implementation.

## 3. Connector Core Implementation

- [x] 3.1 Add health probe request/response types and generic check builder.
- [x] 3.2 Add filesystem readiness checks for workspace, inbox, and artifacts.
- [x] 3.3 Add injectable executor readiness check without real provider execution.
- [x] 3.4 Add health submission through `reportEndpointHealth`.

## 4. Connector CLI Implementation

- [x] 4.1 Export health functions from Connector Core and CLI package.
- [x] 4.2 Add `connector health <dev|qa>` command and usage text.
- [x] 4.3 Keep output machine-readable JSON.

## 5. Harness Integration

- [x] 5.1 Add standalone regression coverage for `connector-health-probe-submission`.
- [x] 5.2 Add this change to Lane A regression and scoped file checks.

## 6. Verification

- [x] 6.1 `pnpm --filter @sartre/connector-core test`
- [x] 6.2 `pnpm --filter @sartre/connector-cli test`
- [x] 6.3 `pnpm --filter @sartre/connector-core build`
- [x] 6.4 `pnpm --filter @sartre/connector-cli build`
- [x] 6.5 `pnpm run lint:lane-a`
- [x] 6.6 `pnpm run architecture:check`
- [x] 6.7 `CHANGE_NAME=connector-health-probe-submission pnpm harness:regression`
- [x] 6.8 `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] 6.9 `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] 6.10 `pnpm exec openspec validate connector-health-probe-submission --type change --strict --no-interactive`
- [x] 6.11 `git diff --check`

## 7. Closeout

- [x] 7.1 Update BDD and acceptance evidence.
- [x] 7.2 Add closeout checkpoint and post-goal plan calibration.
