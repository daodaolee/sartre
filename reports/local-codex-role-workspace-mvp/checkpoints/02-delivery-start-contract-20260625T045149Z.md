# Checkpoint 02: delivery start contract

## Scope

- Exposed delivery `start` lifecycle through Hub repository, application service, HTTP controller, and SDK.
- Preserved domain state machine ownership for `accepted -> running`.
- Verified that `delivered -> running` is rejected through the public API.

## Evidence

- `pnpm --filter @sartre/sdk test`
  - Result: PASS, 1 test file, 13 tests.
- `DATABASE_URL=postgresql://xy@localhost:55432/sartre_hub_local_codex_start_red pnpm --filter @sartre/hub-api test -- handoff.e2e.test.ts`
  - Result: PASS, 6 test files, 21 tests.
- `pnpm --filter @sartre/domain test`
  - Result: PASS, 3 test files, 11 tests.
- `pnpm --filter @sartre/contracts test`
  - Result: PASS, 3 test files, 23 tests.

## Notes

- This checkpoint only covers the public delivery lifecycle contract.
- Codex execution, Connector command, Web Console projection, and real smoke evidence remain pending.
