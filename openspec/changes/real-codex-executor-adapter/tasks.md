## 1. Governance Artifacts

- [x] 1.1 Create BDD feature, acceptance checklist, and Plan Ledger for `real-codex-executor-adapter`.
- [x] 1.2 Validate OpenSpec change before implementation.

## 2. Connector Core Real Executor

- [x] 2.1 RED: add connector-core tests for Codex CLI command construction and final-message output capture.
- [x] 2.2 RED: add connector-core tests for timeout, unavailable binary, user-action, rate-limit, invalid-input, and secret redaction classification.
- [x] 2.3 GREEN: implement injectable process runner and `createCodexCliExecutor()`.
- [x] 2.4 Verify connector-core tests and build.

## 3. Connector CLI Selection And Smoke

- [x] 3.1 RED: add connector-cli tests for explicit fake/real executor selection without spawning Codex by default.
- [x] 3.2 GREEN: update `execute` command to select fake or real executor through option/env.
- [x] 3.3 GREEN: add or update real Codex smoke command to exercise the CLI executor with honest `REAL_TEST` or `SKIPPED` evidence.
- [x] 3.4 Verify connector-cli tests and build.

## 4. Final Evidence

- [x] 4.1 Run OpenSpec strict validation, architecture check, and `git diff --check`.
- [x] 4.2 Run targeted package tests/builds touched by this change.
- [x] 4.3 Attempt real Codex smoke and record exact outcome.
- [x] 4.4 Update final checkpoint, regression evidence, and Plan Ledger.
