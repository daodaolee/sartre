# Tasks

- [x] 1. Governance artifacts
  - [x] 1.1 Create proposal/design/specs/tasks for `local-codex-role-workspace-mvp`.
  - [x] 1.2 Create BDD feature, acceptance checklist, and Plan Ledger.
  - [x] 1.3 Validate OpenSpec change before implementation.

- [x] 2. Delivery lifecycle start contract
  - [x] 2.1 RED: add domain/Handoff Hub/SDK tests proving accepted delivery can start and delivered delivery cannot start.
  - [x] 2.2 GREEN: add `startDelivery` repository/service/controller/SDK support and event persistence.
  - [x] 2.3 Verify package tests for domain, hub-api, and SDK.

- [x] 3. Codex executor adapter boundary
  - [x] 3.1 RED: add connector-core tests for fake Codex execution, prompt input, transcript output, and classified failure.
  - [x] 3.2 GREEN: add `CodexExecutor` abstraction, fake executor, prompt renderer, and safe error classification.
  - [x] 3.3 Add real Codex app-server adapter skeleton/smoke command without making CI depend on real Codex.

- [x] 4. Connector execution command
  - [x] 4.1 RED: add connector CLI tests for `execute <dev|qa> <delivery-id>`.
  - [x] 4.2 GREEN: implement provider selection, delivery start, Codex run, conversation/model-run writeback, report artifact registration, and report-ready transition through SDK.
  - [x] 4.3 Verify connector-core and connector-cli tests.

- [x] 5. Web Console task detail projection
  - [x] 5.1 RED: add Web Console tests showing execution status/transcript in task detail and no computer navigation.
  - [x] 5.2 GREEN: map Hub facts to task detail UI with role Agent/runtime language.
  - [x] 5.3 Verify Web Console tests/build.

- [x] 6. End-to-end evidence
  - [x] 6.1 Run contracts, domain, sdk, hub-api, connector-core, connector-cli, and web-console tests.
  - [x] 6.2 Run builds for changed packages.
  - [x] 6.3 Run architecture check and OpenSpec strict validation.
  - [x] 6.4 Run fake executor smoke and attempt real Codex smoke with explicit `REAL_TEST` or `SKIPPED` evidence.
  - [x] 6.5 Write final checkpoint and update Plan Ledger.
