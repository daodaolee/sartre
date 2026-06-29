## ADDED Requirements

### Requirement: Delivery lifecycle events are persisted

Handoff Hub MUST persist delivery lifecycle facts in an append-only event store. The event store MUST include tenant, event type, handoff id, delivery id when available, recipient endpoint id when available, cursor when available, occurrence time, and metadata payload.

#### Scenario: Delivery events are written during handoff lifecycle

- **WHEN** a handoff is created, delivered, redelivered, acknowledged, failed, expired, or receives a report artifact
- **THEN** Handoff Hub persists corresponding lifecycle events that can be read by the overview read model

#### Scenario: Event writes are transactional with delivery state

- **WHEN** a delivery is failed, expired, acknowledged, or redelivered
- **THEN** the delivery state update and lifecycle event append happen in the same repository operation

### Requirement: Delivery state supports failed and expired

Delivery MUST use an explicit state machine that includes `pending_delivery`, `delivered`, `acknowledged`, `failed`, and `expired`. Failed and expired deliveries MUST be terminal states for the delivery lifecycle.

#### Scenario: Pending delivery fails

- **WHEN** a pending delivery is marked failed
- **THEN** its status becomes `failed` and a `delivery.failed` event is persisted

#### Scenario: Delivered delivery expires

- **WHEN** a delivered delivery is marked expired
- **THEN** its status becomes `expired` and a `delivery.expired` event is persisted

#### Scenario: Terminal delivery rejects acknowledgement

- **WHEN** a failed or expired delivery is acknowledged
- **THEN** the delivery state machine rejects the illegal transition

### Requirement: Overview timeline is backed by persisted events

Web Console overview MUST read lifecycle timeline entries from persisted Hub events rather than inferring all events from current table rows.

#### Scenario: Overview includes persisted failed event

- **WHEN** a tenant has a failed delivery event
- **THEN** `GET /overview?tenant_id=<tenant>` includes a red `Failed` timeline entry and counts it in `metrics.failed_deliveries`

#### Scenario: Overview includes persisted report event

- **WHEN** a report artifact is returned for a handoff
- **THEN** overview timeline includes a `Report returned` event from the event store and reports still include artifact metadata

### Requirement: SDK exposes delivery failure and expiry commands

The SDK MUST expose public methods for marking a delivery failed or expired through Handoff Hub API endpoints.

#### Scenario: SDK marks delivery failed

- **WHEN** a caller invokes the SDK delivery failure method with a delivery id and reason
- **THEN** the SDK calls the public Hub API and returns the updated delivery response

#### Scenario: SDK marks delivery expired

- **WHEN** a caller invokes the SDK delivery expiry method with a delivery id and reason
- **THEN** the SDK calls the public Hub API and returns the updated delivery response
