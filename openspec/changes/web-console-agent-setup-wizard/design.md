# Design: Web Console Agent Setup Wizard

## Decision

Create `apps/web-console/src/agent-setup-wizard.ts` as a pure projection module. It takes:

- selected `LocalActor`
- endpoint diagnostics
- operation capability facts from local demo profiles

It returns a compact wizard model:

- role
- executor
- capabilities
- permission
- health
- trial run

The React page renders that model inside the existing setup panel. This keeps the page as a projection layer and avoids embedding setup rules in JSX.

## MVP Boundary

This goal supports mock/manual-confirm local agents only:

- executor options are presented as guided choices, not real adapter execution.
- default permission remains `manual_confirm`.
- trial run is represented through existing operations: register endpoint, connect endpoint, create demo handoff.

## UX Rules

- Do not require complex JSON editing.
- Do not put MCP/plugin/hook as the first decision.
- Do not show an endpoint as ready when diagnostics are blocked.
- Keep the layout dense and list-based, matching the Vercel Geist / Readout direction.

## Plan Calibration

Before this goal:

- Endpoint diagnostics are data-driven and verified.
- Setup steps are static guidance.

After this goal:

- If tests and harness pass, the next goal can decide whether executor command health requires local Connector support or a new service health report contract.
- If the wizard needs fields unavailable in overview, open a service-contract change.
