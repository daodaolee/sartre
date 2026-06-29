# Design: Monorepo Package Isolation Governance

## Decision

Shared local demo role/profile semantics belong in `@sartre/contracts`, not in `@sartre/connector-cli`.

Reusable connector runtime behavior belongs in `@sartre/connector-core`, not in an application package.

`apps/hub-api` may import:

- `@sartre/domain`
- `@sartre/contracts`
- `@sartre/connector-core`
- `@sartre/sdk`
- external runtime libraries

`apps/hub-api` must not import:

- `@sartre/connector-cli`
- `@sartre/web-console`
- any `apps/*` internal path

## Implementation

1. Add shared local demo profile exports to `packages/contracts/src/index.ts`.
2. Add `@sartre/connector-core` for connector profile resolution, inbox writes, delivery ack, report artifact, and one-shot SSE listen behavior.
3. Update Connector CLI profiles and command shell to reuse `@sartre/connector-core`.
4. Update Hub API connector demo to import reusable connector behavior from `@sartre/connector-core` instead of importing connector app functions.
5. Remove `@sartre/connector-cli` from `apps/hub-api/package.json`.
6. Add an architecture test and architecture script rule for app-to-app imports.
7. Update Lane A harness to prove Hub API builds without Connector CLI.

## Trade-offs

- Duplicating connector operations inside Hub API demo would be bad; instead, the demo should reuse connector-core and only share immutable profile facts through contracts.
- Keeping Connector CLI in the monorepo is still valid; it is just no longer a build dependency of Hub API.
