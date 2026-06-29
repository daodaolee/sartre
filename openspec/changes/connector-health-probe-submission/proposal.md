## Why

Hub already accepts endpoint health reports, but local Connector users still have no first-party way to probe their workstation and submit that report. Without a Connector-side submission command, Web Console health and setup readiness can only show static guidance or manually seeded data.

## What Changes

- Add a Connector-side health probe that checks local executor intent, `.sartre` workspace writeability, inbox/artifact path readiness, and trial-run readiness.
- Add a Connector CLI command for `health <dev|qa>` that submits the generated report through the SDK boundary.
- Keep probes role/tool neutral and compatible with `manual_confirm` local demo profiles.
- Add regression harness coverage for the new Connector health submission slice.
- Do not add real Codex, Claude, MCP, hook, plugin, or subagent execution in this goal.

## Capabilities

### New Capabilities

- `connector-health-probe-submission`: Connector probes local endpoint readiness and submits a generic health snapshot to Hub.

### Modified Capabilities

- None.

## Impact

- Affected code:
  - `packages/connector-core`
  - `apps/connector-cli`
  - `scripts/harness-regression.sh`
- API impact:
  - Consumes the existing `reportEndpointHealth(endpointId, request)` SDK method.
  - No Hub API contract change expected.
- Storage impact:
  - No new local persistent state beyond ensuring `.sartre` directories are writeable.
- UX impact:
  - Web Console can reflect real Connector-submitted health through the existing overview field after the command runs.
