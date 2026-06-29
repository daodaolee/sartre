# Design: Web Console Agent Reconnect Control

## Decision

Add the reconnect action to the existing `OperationsPanel` replay block. This keeps high-frequency agent operations in one place:

- `Replay events` reads persisted events after the current cursor.
- `Connect endpoint` marks the selected endpoint online and lets Hub redeliver pending delivery events.

The button calls `operations.connectActor(selectedActor, currentCursor)` through the existing `runOperation` path, so it reuses:

- running/succeeded/failed state display
- operation log
- cursor update from `nextCursor`
- overview refresh inside Web operations

## UX Boundary

This is not the full Agent creation wizard. It is a first-version operational control for the offline recovery edge case.

The existing setup panel remains guidance-only in this goal. A later goal can turn setup and health checks into a structured wizard.

## Plan Calibration

Before this goal:

- `web-console-hub-real-smoke` passed and proved `connectActor` against a real Hub API.
- The Web page still has no button for that operation.

After this goal:

- If page tests/build/harness pass, next goal should model endpoint health diagnostics and setup wizard steps.
- If reconnect action exposes missing service detail, open a service-contract change rather than expanding this UI slice.
