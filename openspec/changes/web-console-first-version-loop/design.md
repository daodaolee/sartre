# Design: Web Console First Version Loop

## Decision

Use a standalone Vite React app under `apps/web-console`. The app is a client surface over public contracts:

- `@sartre/contracts` for typed response/request shapes.
- `@sartre/sdk` for REST calls.
- No imports from `apps/hub-api`.
- No package dependency on `@sartre/connector-cli`.

## UI Scope

The first version is an operational console, not a marketing page:

- Overview metrics.
- Handoff queue.
- Delivery timeline.
- Agent endpoint health.
- Connector setup and local commands.
- User operation controls for Dev/QA.

The UI follows the current Vercel Geist direction already used in prior Web Console work and keeps dense, utilitarian information hierarchy.

## Implementation

1. Introduce Web Console app package and Vite config.
2. Add tests for overview rendering, error/empty states, and user operations.
3. Add `hub-operations` as a thin SDK operation layer.
4. Adjust architecture checker to inspect import declarations and package dependencies rather than arbitrary UI command strings.
5. Add root scripts and Lane A harness steps for Web Console test/build.

## Plan Calibration

Before this goal:

- Service baseline and evidence gate are complete.
- Web Console is missing from the isolated lane.

After this goal:

- If Web tests/build/harness pass, the next goal should improve service/page behavior gaps discovered by the UI.
- If Web requires new API fields, create a separate service change instead of editing Hub API opportunistically.
