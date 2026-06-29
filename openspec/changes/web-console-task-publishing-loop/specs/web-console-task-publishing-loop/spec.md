## ADDED Requirements

### Requirement: Web Console publishes task handoffs to a selected Agent

The Web Console SHALL let the current endpoint create a task handoff with title, description, ordered attachment metadata, and a target Agent selected from the target role.

#### Scenario: Sender creates a task

- **WHEN** the current actor submits the task creation page
- **THEN** the Web Console creates a Handoff Hub task through the public SDK
- **AND** the handoff pack entry remains `task.md`
- **AND** attachment artifacts preserve user-visible order
- **AND** object storage secrets are not rendered or committed

#### Scenario: Endpoint identity changes

- **WHEN** the user switches from developer to QA
- **THEN** the Web Console reloads the board for the QA endpoint
- **AND** the same task is shown as received for QA

### Requirement: Handoff Hub records recipient collaboration lifecycle events

The Handoff Hub SHALL persist recipient release, report-ready, and final send-back transitions as delivery lifecycle events with actor context.

#### Scenario: Recipient releases and sends result

- **WHEN** a received delivery is acknowledged, accepted, marked report-ready, and closed
- **THEN** each transition is validated by the domain delivery state machine
- **AND** each persisted event includes actor endpoint, status from, status to, and reason metadata
- **AND** overview timeline exposes accepted, report-ready, and closed events

#### Scenario: Illegal lifecycle transition is rejected

- **WHEN** a delivery is marked report-ready before recipient release
- **THEN** the domain state machine rejects the transition
- **AND** the caller receives a classified invalid-input error through Hub API boundaries
