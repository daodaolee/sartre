## Why

Connector can receive handoffs and submit health reports, but a role user still needs multiple manual commands to prove the first-version handoff loop: reconnect, read inbox, acknowledge, write a report, and upload the report. The first version needs a deterministic trial-run command that exercises that loop without invoking a real LLM provider.

## What Changes

- Add Connector Core support for a manual/mock trial run:
  - reconnect selected profile and write pending handoffs to inbox
  - acknowledge the first received delivery
  - write a local trial report artifact
  - submit that report through the existing artifact boundary
- Add Connector CLI `trial <dev|qa>` command.
- Keep the trial run local and explicit; it does not execute Codex/Claude/MCP/plugin/hook/subagent.
- Add regression harness coverage for the trial-run loop.

## Capabilities

### New Capabilities

- `connector-trial-run-handoff-loop`: Connector performs a local manual/mock trial run from pending handoff to returned report artifact.

### Modified Capabilities

- None.

## Impact

- Affected code:
  - `packages/connector-core`
  - `apps/connector-cli`
  - `scripts/harness-regression.sh`
- API impact:
  - Uses existing Hub SDK methods only.
- Storage impact:
  - Writes a local trial report under `.sartre/reports`.
- UX impact:
  - Local users can validate the end-to-end trial handoff loop with one Connector command.
