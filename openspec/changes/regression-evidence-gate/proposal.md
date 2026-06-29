# Proposal: Regression Evidence Gate

## Why

The project is moving away from manual review as the default release confidence mechanism. If we rely on automated regression reports, the report itself must be machine-checkable: it must come from a real harness run, contain executable commands, record evidence levels honestly, and fail when failures or unexplained skips appear.

## What Changes

- Add a reusable `harness:evidence` command.
- Validate the latest regression report for a change.
- Require every check section to include an evidence level, command, and result.
- Reject failed reports.
- Require skipped checks to include a reason.
- Require at least one `REAL_TEST` entry so structural-only reports cannot be treated as delivery evidence.
- Add this gate to the Lane A service baseline regression harness.

## Impact

- Affected code:
  - `scripts/evidence-gate.ts`
  - `scripts/evidence-gate.test.ts`
  - `scripts/harness-regression.sh`
  - `package.json`
- No domain, service, database, Web, runtime packaging, or connector behavior changes.
- No publish, push, archive, reset, or revert.
