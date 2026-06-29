## Context

The existing Hub and Connector primitives already support the full handoff lifecycle: pending delivery replay, inbox materialization, acknowledgement, and artifact report upload. The missing first-version ergonomics are a single local command and reusable Core function that prove the loop without asking users to manually chain several commands.

## Goals / Non-Goals

**Goals:**

- Add a testable Connector Core trial-run function.
- Add CLI `trial <dev|qa>` command.
- Reuse `connectProfile`, `ackDelivery`, and `reportArtifact`.
- Write a deterministic local trial report under `.sartre/reports`.
- Return machine-readable JSON for automation and Web guidance.

**Non-Goals:**

- Do not create handoffs in the trial command. Dev/Web already owns handoff creation.
- Do not run real Codex, Claude, MCP, plugin, hook, command, or subagent execution.
- Do not add Hub API routes, migrations, or SDK methods.
- Do not auto-process more than one delivery.

## Decisions

### Trial command consumes existing pending work

`connector trial qa` reconnects the QA endpoint, writes pending handoffs to inbox, then processes the first received entry. This keeps ownership clean: the sender creates work; the receiver validates local processing.

### One delivery per trial run

MVP processes the first available entry only. This prevents a trial command from unexpectedly acknowledging multiple deliveries.

### Deterministic mock report

The command writes a concise markdown report with handoff id, delivery id, endpoint id, and local inbox path. It is intentionally not an LLM-generated quality report.

### No hidden acceptance semantics

Trial run acknowledges a delivery because it is a test flow explicitly invoked by the user. Health submission remains separate and does not imply acknowledgement.

## Risks / Trade-offs

- [Risk] No pending handoff produces a failure. Mitigation: error message tells user to create a demo handoff first.
- [Risk] Users may confuse trial report with real QA output. Mitigation: report name and content include `trial`.
- [Risk] One-command flow hides intermediate files. Mitigation: JSON output includes inbox path and report path.

## Migration Plan

1. Add failing Connector Core and CLI tests.
2. Implement trial-run function using existing primitives.
3. Wire CLI `trial <dev|qa>`.
4. Add harness coverage and closeout evidence.

Rollback: remove the trial function and CLI command. Existing primitive commands remain available.
