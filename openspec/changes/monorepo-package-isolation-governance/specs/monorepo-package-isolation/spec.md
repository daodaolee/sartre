## ADDED Requirements

### Requirement: Applications do not import other applications

Application packages SHALL NOT import another application package or another application's internal source path.

#### Scenario: Hub API builds without Connector CLI

- **WHEN** `pnpm --filter @sartre/hub-api build` runs
- **THEN** Hub API must build without depending on `@sartre/connector-cli`
- **AND** `apps/hub-api/package.json` must not list `@sartre/connector-cli`

#### Scenario: Architecture check detects app-to-app imports

- **WHEN** `pnpm run architecture:check` runs
- **THEN** it fails if an `apps/*` package imports another app package
- **AND** it passes when apps depend only on public packages or external libraries

### Requirement: Shared demo semantics live in public packages

Local demo profile semantics SHALL be exported from a public package boundary instead of app internals.

#### Scenario: Connector CLI uses shared local demo facts

- **WHEN** Connector CLI resolves `dev` or `qa` profiles
- **THEN** the tenant, user, role, endpoint, and execution mode match the shared contract facts
- **AND** reusable connector behavior is imported through `@sartre/connector-core`

#### Scenario: Hub API demo uses shared local demo facts

- **WHEN** Hub API local connector demo registers QA or creates a Dev to QA handoff
- **THEN** it uses the shared contract facts without importing Connector CLI
- **AND** it imports reusable connector behavior from `@sartre/connector-core`
