## ADDED Requirements

### Requirement: Web operations smoke uses a real Hub API process

The repository SHALL include a deterministic smoke test proving Web Console operations can drive a real Hub API process through public SDK/contracts.

#### Scenario: Web operations create observable Hub state

- **WHEN** the smoke starts a local Hub API app and registers Dev/QA endpoints through Web Console operations
- **THEN** Hub overview shows both endpoints
- **AND** Web Console package code does not import Hub API internals

#### Scenario: Web operations create and acknowledge a demo handoff

- **WHEN** the smoke creates a demo handoff, replays QA events, and acknowledges the pending delivery
- **THEN** Hub overview shows the handoff and an acknowledged QA delivery
- **AND** delivery timeline events are visible through the public overview contract

### Requirement: Real smoke is part of Lane A regression evidence

The Lane A regression harness SHALL execute the real smoke as `REAL_TEST`.

#### Scenario: Lane A regression includes the smoke

- **WHEN** `CHANGE_NAME=lane-a-service-baseline pnpm harness:regression` runs
- **THEN** the report includes `Web Console Hub real smoke`
- **AND** the evidence gate accepts the report as a truthful mix of `REAL_TEST` and `STRUCTURAL_CHECK`
