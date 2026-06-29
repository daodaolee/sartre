# Proposal: Monorepo Package Isolation Governance

## Why

The monorepo should keep service, client, connector, contracts, SDK, and evidence in one source of truth, but application packages must remain independently buildable. During Lane A isolation, `@sartre/hub-api` still depended on `@sartre/connector-cli`, which forced a service release candidate to include a connector app to pass build.

That violates the intended monorepo boundary: apps can depend on `packages/*`, but apps must not import each other.

## What Changes

- Remove direct `apps/hub-api` dependency on `@sartre/connector-cli`.
- Move shared local demo profile semantics to a public package boundary.
- Move reusable connector behavior to `@sartre/connector-core`.
- Strengthen architecture checks so app-to-app imports are forbidden.
- Add Lane A scoped verification that service can build without Connector CLI.
- Keep Connector CLI as its own app package with its own package dependencies.

## Impact

- Affected code:
  - `packages/contracts/src/**`
  - `packages/connector-core/src/**`
  - `apps/connector-cli/src/**`
  - `apps/hub-api/src/scripts/local-connector-demo.ts`
  - `apps/hub-api/package.json`
  - `scripts/architecture-check.ts`
  - `scripts/harness-regression.sh`
  - `package.json`
- No Web Console changes.
- No database schema changes.
- No publish, push, or archive.
