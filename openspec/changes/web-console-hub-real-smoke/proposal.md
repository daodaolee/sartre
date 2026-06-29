# Proposal: Web Console Hub Real Smoke

## Why

Web Console already has component and operation-layer tests, and Hub API already has service-level E2E tests. The missing evidence is a cross-boundary smoke test proving Web Console operations can drive a real Hub API process through public SDK/contracts and observe persisted state changes.

This closes the current first-version credibility gap without coupling `apps/web-console` to Hub API internals.

## What Changes

- Add a deterministic integration smoke that starts a real Nest `AppModule` on an ephemeral local port.
- Drive the smoke through `@sartre/sdk` and `apps/web-console/src/hub-operations.ts`.
- Verify Dev/QA endpoint registration, demo handoff creation, QA replay, delivery acknowledgement, and overview state changes.
- Keep the smoke in harness/test space so app packages remain isolated.
- Add the change to Lane A regression and evidence checks.

## Impact

- Affected code:
  - `scripts/web-console-hub-real-smoke.test.ts`
  - `scripts/harness-regression.sh`
  - `package.json`
  - `biome.json` or lint scope only if required
- Affected governance:
  - `openspec/changes/web-console-hub-real-smoke/**`
  - `bdd/features/web-console-hub-real-smoke.md`
  - `acceptance/checklists/web-console-hub-real-smoke.md`
  - `reports/web-console-hub-real-smoke/**`
- No Hub API route or database schema changes expected.
- No Web UI layout changes expected.
- No package dependency from Web Console to Hub API internals.
