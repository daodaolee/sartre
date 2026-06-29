# Design: Web Console Hub Real Smoke

## Decision

Add the real smoke as an integration harness test under `scripts/`, not inside `apps/web-console`.

The smoke can import Hub API `AppModule` as a test harness concern, then interact with it only through `HandoffHubClient` and Web Console operations. This keeps production app boundaries intact:

- `apps/web-console` continues to depend only on public packages such as `@sartre/sdk` and `@sartre/contracts`.
- `apps/hub-api` continues to own Nest modules, controllers, migrations, and repository wiring.
- `scripts/` owns cross-app integration verification.

## Test Flow

1. Configure a disposable test database name through the existing Hub API test reset path.
2. Start Nest `AppModule` with `SARTRE_TEST_RESET=true`.
3. Listen on `127.0.0.1` with port `0`.
4. Create `HandoffHubClient` with `app.getUrl()`.
5. Create Web Console operations with a `refreshOverview` callback that fetches real Hub overview.
6. Register Dev and QA endpoints.
7. Create a demo handoff through Web Console operations.
8. Replay QA events from cursor `0`.
9. Acknowledge the pending delivery through Web Console operations.
10. Assert overview state changed: endpoints exist, handoff exists, timeline contains delivery events, and the target delivery is acknowledged.

## Plan Calibration

Before this goal:

- Web Console first-version loop is complete.
- Lane A harness proves Web tests/build and Hub API tests independently.
- The remaining gap is cross-boundary evidence.

After this goal:

- If the real smoke passes without API changes, the next best goal is Agent setup/health-check page wiring.
- If the smoke reveals missing SDK or service fields, open a separate service-contract change instead of expanding this smoke opportunistically.

## Boundary Rules

- Do not add `@sartre/hub-api` as a dependency of `apps/web-console`.
- Do not import Hub API internals from files under `apps/web-console`.
- Do not mock the SDK in this smoke.
- Do not require real user credentials or external network services.
- Do not assert only HTTP status; assert domain-visible state changes.
