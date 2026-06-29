# Goal: Web Console Agent Setup Wizard

## Objective

Replace static connector setup guidance with a selected-actor setup wizard driven by endpoint diagnostics and existing Web operations.

## Scope

- Add pure Web setup wizard model.
- Add wizard tests.
- Render setup wizard in Web Console.
- Use existing register/connect/create demo handoff operations.
- Add the change to Lane A regression evidence.

## Non-Goals

- No real Codex/Claude adapter integration.
- No new Hub API route.
- No schema migration.
- No packaging boundary change.

## Plan Calibration Rule

After this goal, inspect whether true executor command health can stay local to Connector or needs a Hub health report contract.
