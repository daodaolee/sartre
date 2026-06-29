## 1. Governance

- [x] 1.1 Create BDD feature, acceptance checklist, and Plan Ledger for `real-handoff-execution-failure-audit`.
- [x] 1.2 Validate OpenSpec change before implementation.

## 2. Current Path Audit

- [x] 2.1 Inspect Hub/SDK/Connector success execution path and identify exact failure writeback gaps.
- [x] 2.2 Confirm whether Web Console already projects failed model-run facts.

## 3. Connector Failure Audit

- [x] 3.1 RED: add connector-core tests proving executor failure after delivery start records failed model run and fails delivery.
- [x] 3.2 RED: add connector-core tests proving secret-like Codex errors are redacted in model-run metadata and delivery failure reason.
- [x] 3.3 GREEN: implement minimal failure writeback around existing `executeDelivery`.
- [x] 3.4 Verify connector-core tests/build.

## 4. Real Handoff Execution Smoke

- [x] 4.1 RED: add connector-cli tests for real handoff execution smoke output shape and skip/failure classification.
- [x] 4.2 GREEN: implement reusable real handoff execution smoke using public SDK operations.
- [x] 4.3 Verify connector-cli tests/build.

## 5. Web Projection Check

- [x] 5.1 Add Web Console test/rendering only if failed model-run facts are not already visible in task detail.
- [x] 5.2 Verify Web Console tests/build if touched.

## 6. Final Evidence

- [x] 6.1 Run OpenSpec strict validation, architecture check, and `git diff --check`.
- [x] 6.2 Run targeted package tests/builds touched by this change.
- [x] 6.3 Run real handoff execution smoke and record exact outcome.
- [x] 6.4 Update final checkpoint, regression evidence, acceptance checklist, and Plan Ledger.
