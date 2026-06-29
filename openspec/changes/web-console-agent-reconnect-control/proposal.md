# Proposal: Web Console Agent Reconnect Control

## Why

The real Hub smoke proved that offline QA recovery works through `connectActor`, but the Web Console page still exposes only replay and terminal delivery commands. First-version users need a visible control for reconnecting an endpoint and receiving pending deliveries after the local agent comes back online.

## What Changes

- Add a Web Console reconnect action beside replay controls.
- Use the selected actor and its current cursor.
- Log the operation result and update the actor cursor from `OperationResult.nextCursor`.
- Keep service contracts unchanged; the page calls existing Web operations only.
- Add tests/build/harness evidence.

## Impact

- Affected code:
  - `apps/web-console/src/App.tsx`
  - `apps/web-console/src/App.test.tsx`
  - `scripts/harness-regression.sh`
- No Hub API changes.
- No database migration.
- No visual redesign beyond one existing action control.
