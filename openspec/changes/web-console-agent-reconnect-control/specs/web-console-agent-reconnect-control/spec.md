## ADDED Requirements

### Requirement: Web Console exposes endpoint reconnect control

The Web Console SHALL allow a user to reconnect the selected local actor endpoint from the operations panel.

#### Scenario: User reconnects selected actor

- **WHEN** the user selects QA and clicks `Connect endpoint`
- **THEN** Web Console calls `connectActor("qa", currentCursor)`
- **AND** the operation log records the result

#### Scenario: Reconnect updates replay cursor

- **WHEN** `connectActor` returns `nextCursor`
- **THEN** the page updates the selected actor cursor
- **AND** later replay operations use the updated cursor

### Requirement: Reconnect control preserves package isolation

The reconnect control SHALL use existing Web operations and public SDK behavior.

#### Scenario: Page remains isolated

- **WHEN** architecture checks run
- **THEN** `apps/web-console` must still not import Hub API internals
- **AND** no Hub API route or database schema changes are required
