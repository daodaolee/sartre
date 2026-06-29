## Context

The previous health report contract established Hub as a receiver and projection source for endpoint health. The missing piece is the local Connector action that can create a report from facts visible on the user's own machine and submit it without binding the platform to one LLM provider or workplace role.

This change targets the first reliable local loop:

1. A developer or QA user chooses a local demo profile.
2. Connector probes local readiness in a deterministic, testable way.
3. Connector submits generic health checks to Hub.
4. Web Console reads the report from Hub overview using the existing diagnostics path.

## Goals / Non-Goals

**Goals:**

- Add a pure, testable health report builder in `packages/connector-core`.
- Add an SDK-facing submission function that calls `reportEndpointHealth`.
- Add a CLI command that runs the probe for `dev` or `qa` profiles and prints the submitted report as JSON.
- Make blocked/warning/passed checks explicit enough for Web Console diagnostics.
- Keep the command usable in local demo and future Electron packaging.

**Non-Goals:**

- Do not execute real Codex, Claude, MCP, hook, plugin, subagent, or arbitrary commands.
- Do not require repo, branch, commit range, or Dev-to-QA-only payload fields.
- Do not add Hub API routes or database migrations.
- Do not add a realtime health stream.
- Do not make health submission imply that the user accepted or processed a handoff.

## Decisions

### Probe locally, submit through the existing SDK contract

Connector owns local workstation facts. Hub owns validation, storage, and projection. The CLI will call a Connector Core function that builds an `EndpointHealthReportRequest`, then submit it through `HandoffHubConnectorClient.reportEndpointHealth`.

Alternative considered: CLI builds request inline. Rejected because it would put business checks in the app shell and make Electron reuse harder.

### Use deterministic probes for MVP

The MVP checks filesystem readiness and configuration intent:

- `executor`: reports `passed` for mock/manual profiles unless an injected executor checker marks it blocked.
- `workspace`: confirms the workspace directory is accessible.
- `inbox`: ensures `.sartre/inbox` can be created.
- `artifact`: ensures `.sartre/artifacts` can be created.
- `trial_run`: reports whether the profile can receive manual-confirm demo handoffs.

Executor checking is injectable so future Codex/Claude/MCP adapters can provide real checks without changing the core command flow.

### Keep report metadata secret-safe and minimal

The report may include non-sensitive metadata such as `profile`, `role`, and relative local paths. It must not include tokens, command secrets, environment variable values, or private keys.

### CLI is an assembly root

`apps/connector-cli` parses arguments, creates the SDK client, and prints JSON. It does not own probing rules.

## Risks / Trade-offs

- [Risk] The executor check can be too shallow for real Codex/Claude. Mitigation: make executor checking injectable and keep real adapter probes as follow-up goals.
- [Risk] Filesystem probes could create directories during a dry-run expectation. Mitigation: document that health probe verifies writeability by ensuring `.sartre` directories exist.
- [Risk] A passed local health report could become stale. Mitigation: reports include `observed_at`; Web diagnostics can later apply freshness policy without schema change.
- [Risk] Users may think health equals task acceptance. Mitigation: checks and command names use health/probe language only; delivery acknowledgement remains `ack`.

## Migration Plan

1. Add Connector Core tests for health report building and SDK submission.
2. Add Connector CLI tests for `health <dev|qa>` usage.
3. Implement the pure probe builder and submit function.
4. Wire CLI command.
5. Add harness coverage and closeout evidence.

Rollback is low risk: remove the CLI command and Connector Core health functions. Hub and Web remain compatible because they already treat health reports as optional.
