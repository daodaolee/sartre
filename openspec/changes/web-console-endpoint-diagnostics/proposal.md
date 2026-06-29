# Proposal: Web Console Endpoint Diagnostics

## Why

The Web Console now exposes reconnect, but the setup guidance is still static. First-version users need to know whether a selected role agent is registered, online, capable, safe to operate, and whether it has pending deliveries.

## What Changes

- Add a pure endpoint diagnostics module driven by Hub overview data.
- Render selected actor diagnostics in Web Console.
- Cover missing endpoint, offline endpoint, missing capabilities, permission mode, and pending delivery states.
- Keep service contracts unchanged.
- Add tests/build/harness evidence.

## Impact

- Affected code:
  - `apps/web-console/src/endpoint-diagnostics.ts`
  - `apps/web-console/src/endpoint-diagnostics.test.ts`
  - `apps/web-console/src/App.tsx`
  - `apps/web-console/src/App.test.tsx`
  - `apps/web-console/src/styles.css`
  - `scripts/harness-regression.sh`
- No Hub API changes.
- No database migration.
- No packaging boundary changes.
