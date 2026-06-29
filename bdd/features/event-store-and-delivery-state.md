# Feature: Event Store and Delivery State

Evidence level before implementation: `SCENARIO_REGISTERED`

## Scenario: Hub persists delivery lifecycle events

Given a tenant has Dev and QA agent endpoints
And Dev creates a handoff for QA
When the delivery is delivered, acknowledged, failed, expired, or receives a report artifact
Then Hub persists lifecycle events with tenant, handoff id, delivery id, recipient endpoint, cursor, occurrence time, and metadata

## Scenario: Failed delivery is visible in overview

Given a delivery is marked failed
When Web Console requests `GET /overview?tenant_id=local-demo`
Then the overview contains a Failed timeline entry
And `metrics.failed_deliveries` counts the failed delivery

## Scenario: Expired delivery is terminal

Given a delivery is marked expired
When a caller attempts to acknowledge the delivery
Then the delivery state machine rejects the transition
And the persisted delivery remains expired

## Scenario: Report artifact emits an event

Given QA returns `qa-report.md` for a handoff
When Hub stores the artifact
Then Hub also persists an `artifact.report_returned` event
And overview timeline reads that report event from the event store

## Scenario: SDK exposes failure and expiry commands

Given an integration client uses `HandoffHubClient`
When it calls `failDelivery()` or `expireDelivery()`
Then the SDK uses public Hub API endpoints rather than importing Hub internals
