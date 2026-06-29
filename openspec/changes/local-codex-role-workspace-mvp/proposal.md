## Why

Sartre already has durable handoff delivery, role endpoint manifests, provider/model registry, and a provider-neutral conversation ledger, but a delivery still stops at manual inbox/report tooling. The next slice must prove the real role-agent loop: a human releases a task to a role Agent, the local Codex runtime executes it through the Connector, and the Hub records enough facts for the sender to see status, transcript, artifacts, and failures.

This change also incorporates the latest product direction: `computer` is not a first-class product object. Local execution remains an implementation detail behind `LLM Adapter` / runtime binding and endpoint health.

## What Changes

- Add a Codex-only local executor capability that can start from an accepted delivery, prepare agent-readable context, invoke a Codex-compatible app-server adapter, and record the run result.
- Extend the delivery lifecycle so accepted deliveries can be explicitly moved to `running` by the local executor through public Hub APIs.
- Connect local execution to the existing provider/model registry and conversation ledger instead of hard-coding model facts or provider session history.
- Extend Local Connector commands from inbox/ack/report/trial toward `execute <profile> <delivery-id>` for the first Codex loop.
- Persist execution facts as timeline events, model runs, transcript/messages, and report artifacts so the opposite role can observe task progress after reconnecting.
- Update Web Console task detail behavior to display execution status and transcript/progress from Hub facts, without adding a separate “computer” page.
- Keep UI and API terminology centered on role Agent, endpoint identity, runtime binding, and LLM adapter.

## Capabilities

### New Capabilities

- `local-codex-executor`: Codex-only local execution adapter, run lifecycle, transcript capture, result artifact, and Hub writeback for accepted deliveries.

### Modified Capabilities

- `local-connector`: Connector must execute accepted deliveries through the SDK boundary, not only write inbox files and upload manual reports.

## Impact

- Contracts: delivery lifecycle command schema may gain `start` coverage; Codex execution/run schemas may be added where existing conversation/model-run contracts are not sufficient.
- Domain: delivery state machine tests must include accepted -> running through public API coverage.
- Hub API: deliveries controller/repository must expose `POST /deliveries/:deliveryId/start`; conversation/model-run writeback may be used by the executor.
- SDK: add start delivery helper and executor-facing helpers for run writeback.
- Connector Core/CLI: add Codex app-server adapter boundary, fake adapter tests, and `execute` command.
- Web Console: task detail consumes Hub facts for execution status/transcript; no `computer` management surface.
- Evidence: OpenSpec, BDD, acceptance, package tests, builds, architecture check, and live smoke must distinguish fake-adapter tests from any real Codex smoke.
