# BDD: Handoff Hub Service Hardening

## Feature: Classified service errors

### Scenario: Terminal delivery ack is InvalidInput

- **GIVEN** a delivery is already `expired`
- **WHEN** a caller sends `POST /deliveries/:deliveryId/ack`
- **THEN** Hub API responds with HTTP 400
- **AND** the response error category is `InvalidInput`

### Scenario: Missing delivery is Unavailable

- **GIVEN** no delivery exists for `delivery_missing`
- **WHEN** a caller sends a delivery command for that id
- **THEN** Hub API responds with HTTP 404
- **AND** the response error category is `Unavailable`

## Feature: Executable schema migration

### Scenario: Clean database migration

- **GIVEN** a clean local PostgreSQL database
- **WHEN** Hub migration runner executes
- **THEN** all required Hub tables, indexes, sequence, and migration ledger exist

### Scenario: Migration idempotency

- **GIVEN** Hub migrations have already executed once
- **WHEN** the migration runner executes again
- **THEN** it succeeds without dropping existing handoff data

## Feature: Event replay by cursor

### Scenario: Endpoint replays unread events

- **GIVEN** Dev has created delivery events for QA
- **WHEN** QA requests replay with `after_cursor=0`
- **THEN** Hub returns persisted events for QA ordered by cursor and occurrence time

### Scenario: Endpoint skips seen events

- **GIVEN** QA has already seen cursor `1`
- **WHEN** QA requests replay with `after_cursor=1`
- **THEN** Hub returns only delivery lifecycle events with cursor greater than `1`

## Feature: Local Dev and QA fixtures

### Scenario: Fixture exposes local identities

- **GIVEN** tests or scripts load the local demo fixture
- **WHEN** they read Dev and QA profiles
- **THEN** both profiles include tenant, user, role, endpoint id, capabilities, and execution mode
