# Tasks: v02-handoff-hub-governance-gate

## 1. Change Setup

- [x] 1.1 Create Goal 9.2 document for v0.2 Handoff Hub governance gate.
- [x] 1.2 Create report directory and PLAN_LEDGER for this change.
- [x] 1.3 Record initial checkpoint with scope, constraints, and existing v0.2 service evidence.
- [x] 1.4 Validate the OpenSpec change structure.

## 2. BDD And Acceptance

- [x] 2.1 Add BDD feature for v0.2 Handoff Hub governance gate.
- [x] 2.2 Add acceptance checklist for v0.2 Handoff Hub governance gate.
- [x] 2.3 Ensure BDD scenarios use explicit evidence levels and do not overclaim automation.

## 3. Regression Harness

- [x] 3.1 Extend `scripts/harness-regression.sh` with `v02-handoff-hub-governance-gate`.
- [x] 3.2 Run the governance regression and fix script issues until it produces real evidence.
- [x] 3.3 Ensure the regression records scoped non-candidate blockers rather than failing current candidate evidence.

## 4. Evidence Closeout

- [x] 4.1 Run fresh v0.2 scoped verification commands.
- [x] 4.2 Update BDD evidence statuses and acceptance checklist from actual command output.
- [x] 4.3 Record final checkpoint and update PLAN_LEDGER.
- [x] 4.4 Run scoped diff check and secret scan.
- [x] 4.5 Save jj description without git commit, push, or publish.
