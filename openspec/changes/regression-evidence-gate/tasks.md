# Tasks

## 1. Governance

- [x] 1.1 Create proposal, design, spec, BDD, acceptance, and ledger artifacts

## 2. Test First

- [x] 2.1 Add failing test for valid report parsing
- [x] 2.2 Add failing test for failed report rejection
- [x] 2.3 Add failing test for skipped check reason requirement
- [x] 2.4 Add failing test for structural-only report rejection

## 3. Implementation

- [x] 3.1 Implement `scripts/evidence-gate.ts`
- [x] 3.2 Add root `harness:evidence` script
- [x] 3.3 Add Lane A harness evidence gate step

## 4. Verification

- [x] 4.1 `pnpm exec vitest run scripts/evidence-gate.test.ts`
- [x] 4.2 `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] 4.3 `pnpm run lint:lane-a`
- [x] 4.4 `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] 4.5 `pnpm exec openspec validate regression-evidence-gate --type change --strict --no-interactive`
- [x] 4.6 `git diff --check`

## 5. Closeout

- [x] 5.1 Update BDD and acceptance evidence
- [x] 5.2 Add closeout checkpoint
