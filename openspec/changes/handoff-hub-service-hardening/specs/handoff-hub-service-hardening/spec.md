## ADDED Requirements

### Requirement: Hub schema is migrated through an executable migration path

Handoff Hub MUST define PostgreSQL schema changes in executable migration files and MUST run them through a migration runner during startup or tests.

#### Scenario: Clean database receives Hub schema

- **WHEN** Hub API starts against an empty local PostgreSQL database
- **THEN** migrations create the handoff, delivery, artifact, agent endpoint, delivery event, sequence, index, and migration ledger structures needed by the service

#### Scenario: Migration runner is idempotent

- **WHEN** the migration runner executes twice against the same database
- **THEN** the second run succeeds without dropping existing handoff data

### Requirement: Hub API returns classified error responses

Handoff Hub MUST map classified domain and repository errors to stable HTTP responses with a versioned error envelope.

#### Scenario: Terminal delivery acknowledgement is invalid input

- **WHEN** a caller acknowledges a failed or expired delivery
- **THEN** Hub API returns HTTP 400 with `category` equal to `InvalidInput`

#### Scenario: Missing delivery is unavailable

- **WHEN** a caller acknowledges, fails, or expires a delivery id that does not exist
- **THEN** Hub API returns HTTP 404 with `category` equal to `Unavailable`

### Requirement: Delivery lifecycle events can be replayed by cursor

Handoff Hub MUST expose persisted delivery lifecycle facts through a replay endpoint scoped by tenant and endpoint cursor.

#### Scenario: Endpoint replays unread events

- **WHEN** an endpoint requests replay with `after_cursor=0`
- **THEN** Hub API returns persisted delivery lifecycle events for that endpoint ordered by cursor and occurrence time

#### Scenario: Endpoint replay skips already seen events

- **WHEN** an endpoint requests replay with an `after_cursor` equal to a previously delivered cursor
- **THEN** Hub API returns only events with a greater cursor

### Requirement: Local Dev and QA fixtures are stable

Handoff Hub MUST provide a reusable local demo fixture for Dev and QA identities without introducing an authentication system.

#### Scenario: Local fixture exposes Dev and QA endpoints

- **WHEN** service tests or local scripts request the local demo fixture
- **THEN** they receive `local-demo` tenant data for Dev and QA users, roles, endpoint ids, capabilities, and execution mode
