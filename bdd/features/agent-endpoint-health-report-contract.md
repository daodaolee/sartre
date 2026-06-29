# Feature: Agent endpoint health report contract

## Scenario: Registered endpoint submits health

Given a local demo endpoint is registered for tenant `local-demo`
When the endpoint submits a schema `1.0` health report
Then Hub stores the report
And tenant overview exposes the same checks for that endpoint

## Scenario: Health tenant mismatch is rejected

Given a local demo endpoint belongs to tenant `local-demo`
When a health report is submitted with another tenant id
Then Hub rejects the report as `InvalidInput`
And the endpoint health projection is not updated

## Scenario: Health stays independent from delivery state

Given an endpoint has submitted health
When a Dev to QA task is created
Then the delivery state is still controlled by delivery lifecycle events
And health only describes endpoint readiness
