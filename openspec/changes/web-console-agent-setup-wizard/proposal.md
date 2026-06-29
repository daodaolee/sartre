# Proposal: Web Console Agent Setup Wizard

## Why

The Web Console now shows endpoint diagnostics, but the setup area is still static text and command snippets. First-version users need a guided setup surface that maps role, executor, capabilities, permission mode, health status, and trial run into a concrete local-agent setup path.

## What Changes

- Add a pure setup wizard model derived from selected actor, endpoint diagnostics, and local demo profiles.
- Render setup steps with statuses and concrete action details.
- Surface recommended executor and permission mode without requiring users to edit JSON.
- Reuse existing Web operations for register, connect, and demo handoff actions.
- Add tests/build/harness evidence.

## Impact

- Affected code:
  - `apps/web-console/src/agent-setup-wizard.ts`
  - `apps/web-console/src/agent-setup-wizard.test.ts`
  - `apps/web-console/src/App.tsx`
  - `apps/web-console/src/App.test.tsx`
  - `apps/web-console/src/styles.css`
  - `scripts/harness-regression.sh`
- No Hub API changes.
- No database migration.
- No real Codex/Claude adapter integration.
