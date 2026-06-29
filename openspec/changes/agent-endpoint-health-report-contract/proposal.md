## Why

Web Console needs a reliable way to show whether a local role endpoint is ready before a user sends work to that endpoint. The Hub already owns endpoint registration and overview projection, so endpoint health reports need a stable contract that can be submitted by Connector, stored by Hub, and rendered by Web Console without coupling the system to one LLM provider.

## What Changes

- Add a schema-versioned endpoint health report request/response contract.
- Add Hub API persistence for the latest health report per endpoint.
- Project health report facts into the tenant overview used by Web Console.
- Keep health checks generic enough for Codex, Claude, manual, hook, skill, command, and future Electron adapters.
- Do not make health reports imply task acknowledgement, execution, or delivery state transitions.

## Capabilities

### New Capabilities

- `agent-endpoint-health-report-contract`: Hub accepts endpoint health snapshots and exposes them in overview.

### Modified Capabilities

- `handoff-overview`: endpoint rows may include optional `health_report` data.

## Impact

- Affected code:
  - `packages/contracts`
  - `packages/sdk`
  - `apps/hub-api`
  - `apps/web-console`
- API impact:
  - Adds `POST /agent-endpoints/:endpointId/health`.
  - Extends overview endpoint rows with optional health report projection.
- Storage impact:
  - Adds/uses latest health report persistence keyed by endpoint.
- UX impact:
  - Web Console can show endpoint readiness in settings and setup flows.
