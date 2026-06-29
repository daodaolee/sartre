## Why

Sartre now has a real Codex CLI adapter, but a full role-Agent workflow is only trustworthy when an actual handoff delivery can move from `accepted` to `running` to `report_ready`, and when failures are written back as Hub-owned audit facts. Without failure writeback, local execution can fail silently from the platform perspective and the task cannot be diagnosed or recovered.

## What Changes

- Extend Connector execution so Codex failures after delivery start write classified failure facts back to Hub.
- Record failed `model_run` facts with safe error category/message and execution metadata.
- Mark the delivery failed through public Hub APIs when execution cannot produce a report.
- Keep successful real execution on the existing `accepted -> running -> report_ready` path.
- Add a real handoff execution smoke that creates/receives/accepts a delivery and runs the real Codex CLI executor.
- Surface failed execution facts in the task detail projection where existing execution facts are shown.
- Do not add a generic chat composer or a first-class `computer` product object in this slice.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `local-codex-executor`: Adds required Hub writeback semantics for failed real Codex execution.
- `local-connector`: Adds a real handoff execution smoke and failure-safe execution behavior through public SDK APIs.
- `event-store-and-delivery-state`: Requires executor-driven delivery failure to persist classified failure events and remain visible in overview/timeline.

## Impact

- Affected packages: `packages/connector-core`, `apps/connector-cli`, `packages/sdk`, and possibly `apps/hub-api` if a missing failure writeback field or projection gap is found.
- Affected Web Console surface: task detail execution facts may need to show failed run category/message.
- Affected evidence: new BDD, acceptance checklist, Plan Ledger, regression report, and real smoke output.
- No database-breaking migration is expected unless current model-run metadata is insufficient for classified failure details.
