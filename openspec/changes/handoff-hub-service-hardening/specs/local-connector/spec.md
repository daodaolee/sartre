## MODIFIED Requirements

### Requirement: Connector can connect and receive pending deliveries

The connector CLI SHALL register the selected endpoint, connect to the Hub, request pending delivery redelivery, replay persisted delivery lifecycle events using the endpoint cursor, and persist received handoffs into a local inbox.

#### Scenario: Offline QA receives redelivered handoff

- **WHEN** Dev creates a handoff while QA is offline and QA later runs `connector connect qa`
- **THEN** the connector writes `.sartre/inbox/<handoff-id>/handoff.md`, `pack.json`, and `delivery.json`

#### Scenario: Inbox entry is agent-readable

- **WHEN** a handoff is written to local inbox
- **THEN** `handoff.md` includes title, from/to parties, delivery id, summary, and ack/report commands

#### Scenario: Reconnected connector replays unread delivery facts

- **WHEN** QA reconnects with a stored cursor lower than the Hub delivery event cursor
- **THEN** the connector can read replayed delivery lifecycle events through the SDK without importing Hub API internals
