# Feature: Web Console task publishing loop

## Scenario: User publishes a task to a target Agent

Given a local Dev endpoint and a local QA endpoint exist
When the user opens the inbox and creates a task with title, description, ordered attachments, and a target Agent
Then the task is created through the Handoff Hub public contract
And the sender sees the task in `已发送`
And the receiver sees the task in `已接收` after switching endpoint identity

Evidence: SCENARIO_REGISTERED before implementation; expected REAL_TEST via package tests.

## Scenario: Recipient releases the task to their Agent and sends the result back

Given the receiver has opened a received task
When the receiver clicks execution release, marks the result ready, and sends it back
Then each transition is persisted as a delivery lifecycle event with actor and reason metadata
And the task is visible as `已结束` after final send-back

Evidence: SCENARIO_REGISTERED before implementation; expected REAL_TEST via domain, Hub API, SDK, and Web Console tests.

## Scenario: Object storage profile does not expose secrets

Given the task creation page supports uploaded or pasted files
When it displays the configured object storage target
Then it only exposes safe profile metadata such as profile id, bucket, region, CDN domain, and base prefix
And no secret id, secret key, token, password, or private key appears in UI, tests, or repository files.

Evidence: SCENARIO_REGISTERED before implementation; expected REAL_TEST via Web Console tests and source scan.
