# Goal: Web Console Agent Reconnect Control

## Objective

Expose the already verified endpoint reconnect operation in the Web Console page so offline recipients can reconnect and receive pending deliveries from the UI.

## Scope

- Add OpenSpec/BDD/acceptance/PLAN_LEDGER.
- Add a failing page test first.
- Add one `Connect endpoint` action to the operations panel.
- Add the change to Lane A regression evidence.

## Non-Goals

- No full Agent creation wizard.
- No new Hub API endpoint.
- No schema migration.
- No packaging boundary change.

## Plan Calibration Rule

After this goal, continue to endpoint health diagnostics and setup wizard only if reconnect page tests and lane regression pass.
