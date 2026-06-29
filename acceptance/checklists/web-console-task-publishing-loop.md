# Acceptance Checklist: Web Console Task Publishing Loop

## Boundary

- [x] Delivery lifecycle rules live in `packages/domain`.
- [x] Network schemas live in `packages/contracts`.
- [x] Web Console talks to Hub only through `packages/sdk` / `hub-operations`.
- [x] Hub API keeps Nest/DB code out of domain.
- [x] Object storage secrets are not committed or rendered.

## Behavior

- [x] Workspace bar does not render `已连接 Hub`.
- [x] Inbox board only contains `已发送`, `已接收`, and `已结束`.
- [x] New task opens a secondary creation page.
- [x] Task creation captures title, description, ordered pasted/uploaded attachment metadata, and target role/Agent.
- [x] Role switching reloads the endpoint-scoped board.
- [x] Recipient task detail exposes execution release.
- [x] Result ready and final send-back are persisted as lifecycle events.
- [x] Task details show reports/artifacts and timeline under the selected task.

## Verification

- [x] `pnpm --filter @sartre/domain test`
- [x] `pnpm --filter @sartre/contracts test`
- [x] `pnpm --filter @sartre/sdk test`
- [x] `pnpm --filter @sartre/hub-api test`
- [x] `pnpm --filter @sartre/web-console test`
- [x] `pnpm --filter @sartre/web-console build`
- [x] `pnpm run lint:lane-a`
- [x] `pnpm run architecture:check`
- [x] Browser screenshot validation

## Evidence

- Package tests/build/lint/architecture: REAL_TEST passed.
- Browser validation: REAL_TEST via Playwright snapshot and screenshot `.playwright-cli/page-2026-06-24T11-35-01-461Z.png`.
- OpenSpec validate and `git diff --check`: passed.
- Superseded by `CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression`; task publishing is now verified inside the current role-collaboration candidate.
