## Why

The current local role-Agent execution path proves the Hub lifecycle and Connector writeback, but it still falls back to a fake Codex executor for normal local runs. Sartre now needs a real, explicit Codex CLI adapter so a role endpoint can run an accepted delivery through the user's local Codex while preserving Hub-owned task facts.

## What Changes

- Add a real Codex CLI executor implementation behind the existing `CodexExecutor` boundary.
- Keep fake executor support for deterministic tests and demos.
- Add explicit Connector CLI/env selection for `fake` versus `real` execution so real Codex is never invoked accidentally.
- Add safe process execution controls: timeout, workspace directory, output capture, stderr redaction, and classified failure categories.
- Add a real smoke command/path that reports `REAL_TEST` only when a Codex process actually runs, or `SKIPPED` with a reason when local Codex is unavailable.
- Do not add a first-class `computer` product object or page.

## Capabilities

### New Capabilities

- `local-codex-executor`: Defines the local Codex execution adapter contract, including the real Codex CLI implementation, fake test implementation, error classification, and smoke evidence rules.

### Modified Capabilities

- `local-connector`: Adds explicit executor selection for local role execution while keeping Hub/SDK/public-contract boundaries intact.

## Impact

- Affected packages: `packages/connector-core`, `apps/connector-cli`.
- Affected governance artifacts: BDD feature, acceptance checklist, Plan Ledger, regression evidence for this change.
- Affected external dependency: local `codex` CLI process, invoked only through the adapter boundary.
- No Hub API, Web Console, database, or product navigation changes are required in this slice.
