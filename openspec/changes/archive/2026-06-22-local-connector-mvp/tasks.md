# Tasks: local-connector-mvp

## 1. Governance Setup

- [x] 1.1 Create Goal 9.3 document.
- [x] 1.2 Add BDD feature and acceptance checklist.
- [x] 1.3 Add PLAN_LEDGER and initial checkpoint.
- [x] 1.4 Validate OpenSpec change.

## 2. Hub And SDK Boundary

- [x] 2.1 Add failing SDK tests for register/connect/get/ack/report methods.
- [x] 2.2 Add failing hub-api test for `GET /handoffs/:handoffId`.
- [x] 2.3 Implement SDK methods through public HTTP endpoints.
- [x] 2.4 Implement read-only hub handoff detail endpoint.

## 3. Connector CLI Red -> Green

- [x] 3.1 Add failing connector tests for local profiles.
- [x] 3.2 Add failing connector tests for inbox rendering.
- [x] 3.3 Add failing connector tests for ack/report command behavior with fake fetch.
- [x] 3.4 Implement connector profile/connect/listen/inbox/ack/report commands.
- [x] 3.5 Ensure connector writes `.sartre/inbox/<handoff-id>/handoff.md`, `pack.json`, and `delivery.json`.

## 4. End-To-End Evidence

- [x] 4.1 Add connector local demo or harness path proving Dev -> QA -> local inbox -> ack/report.
- [x] 4.2 Extend `scripts/harness-regression.sh` with `local-connector-mvp`.
- [x] 4.3 Run fresh regression and update BDD/acceptance from actual output.

## 5. Closeout

- [x] 5.1 Record final checkpoint and update PLAN_LEDGER.
- [x] 5.2 Run OpenSpec validation and scoped diff check.
- [x] 5.3 Save jj description without git commit, push, or publish.
