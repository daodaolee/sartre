# Local Connector Specification

## Purpose

Local Connector provides a local role endpoint that receives Handoff Hub deliveries into an agent-readable file inbox and sends acknowledgements and report artifacts back through public Hub APIs.

## Requirements

### Requirement: Local profiles are available

The connector CLI SHALL provide local `dev` and `qa` profiles for the `local-demo` tenant.

#### Scenario: QA profile is shown

- **WHEN** the user runs `connector profile qa`
- **THEN** the command outputs the QA user, role, endpoint id, execution mode, and Hub base URL

#### Scenario: Dev profile is shown

- **WHEN** the user runs `connector profile dev`
- **THEN** the command outputs the Dev user, role, endpoint id, execution mode, and Hub base URL

### Requirement: Connector can connect and receive pending deliveries

The connector CLI SHALL register the selected endpoint, connect to the Hub, request pending delivery redelivery, and persist received handoffs into a local inbox.

#### Scenario: Offline QA receives redelivered handoff

- **WHEN** Dev creates a handoff while QA is offline and QA later runs `connector connect qa`
- **THEN** the connector writes `.sartre/inbox/<handoff-id>/handoff.md`, `pack.json`, and `delivery.json`

#### Scenario: Inbox entry is agent-readable

- **WHEN** a handoff is written to local inbox
- **THEN** `handoff.md` includes title, from/to parties, delivery id, summary, and ack/report commands

### Requirement: Connector can listen for one SSE event

The connector CLI SHALL support `listen <profile> --once` to receive one SSE delivery event, fetch handoff details, write inbox files, and exit.

#### Scenario: Online QA receives handoff through SSE

- **WHEN** QA is listening and Dev creates a handoff
- **THEN** QA connector writes the handoff into inbox and exits successfully

### Requirement: Connector can acknowledge deliveries

The connector CLI SHALL support `ack <delivery-id>` and send the acknowledgement to the Hub through the SDK.

#### Scenario: QA acknowledges a delivery

- **WHEN** the user runs `connector ack <delivery-id>`
- **THEN** the Hub marks the delivery as `acknowledged`

### Requirement: Connector can report artifacts

The connector CLI SHALL support `report <handoff-id> <file>` and register the file as a `qa-report` artifact with checksum metadata.

#### Scenario: QA report is returned

- **WHEN** the user runs `connector report <handoff-id> qa-report.md`
- **THEN** the Hub records an artifact named `qa-report.md`

### Requirement: Connector respects service/client boundary

The connector CLI SHALL use `packages/sdk` and public contracts only, and MUST NOT import `apps/hub-api/src/**`.

#### Scenario: Architecture check runs

- **WHEN** `pnpm run architecture:check` runs
- **THEN** it passes with connector boundaries intact
