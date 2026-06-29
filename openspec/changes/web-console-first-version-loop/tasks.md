# Tasks

## 1. Governance

- [x] 1.1 Create proposal, design, spec, BDD, acceptance, and ledger artifacts

## 2. Test First

- [x] 2.1 Add Web Console tests and verify they fail before implementation
- [x] 2.2 Add architecture checker test for UI command strings not counting as imports

## 3. Implementation

- [x] 3.1 Add Web Console app package
- [x] 3.2 Remove Web Console app-to-app package dependency
- [x] 3.3 Adjust architecture checker to inspect imports/package dependencies
- [x] 3.4 Add root Web Console scripts
- [x] 3.5 Add Web Console checks to Lane A harness

## 4. Verification

- [x] 4.1 `pnpm --filter @sartre/web-console test`
- [x] 4.2 `pnpm --filter @sartre/web-console build`
- [x] 4.3 `pnpm exec vitest run scripts/architecture-check.test.ts`
- [x] 4.4 `pnpm run architecture:check`
- [x] 4.5 `pnpm run lint:lane-a`
- [x] 4.6 `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression`
- [x] 4.7 `pnpm harness:evidence -- --change lane-a-service-baseline`
- [x] 4.8 `pnpm exec openspec validate web-console-first-version-loop --type change --strict --no-interactive`
- [x] 4.9 `git diff --check`

## 5. Closeout

- [x] 5.1 Update BDD and acceptance evidence
- [x] 5.2 Add closeout checkpoint
