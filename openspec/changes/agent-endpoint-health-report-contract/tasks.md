## 1. Governance

- [x] 1.1 Create proposal, design, spec, BDD, acceptance, and ledger artifacts.
- [x] 1.2 Validate OpenSpec change strictly.

## 2. Test First

- [x] 2.1 Add contract tests for endpoint health request/response shapes.
- [x] 2.2 Add Hub API tests for health submission, tenant mismatch, and overview projection.
- [x] 2.3 Add SDK/Web tests for consuming health reports.

## 3. Implementation

- [x] 3.1 Add contracts and exported types.
- [x] 3.2 Add Hub route and repository persistence.
- [x] 3.3 Add SDK method for health submission.
- [x] 3.4 Project health reports into overview.
- [x] 3.5 Render health facts in Web Console setup/settings surfaces.

## 4. Verification

- [x] 4.1 `pnpm --filter @sartre/contracts test`
- [x] 4.2 `pnpm --filter @sartre/sdk test`
- [x] 4.3 `pnpm --filter @sartre/hub-api test`
- [x] 4.4 `pnpm --filter @sartre/web-console test`
- [x] 4.5 `pnpm run lint:lane-a`
- [x] 4.6 `pnpm run architecture:check`
- [x] 4.7 `CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression`
