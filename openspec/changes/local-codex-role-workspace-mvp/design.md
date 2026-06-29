## Context

The current service baseline has:

- Handoff Hub delivery and reconnectable inbox semantics.
- Agent endpoint manifests with `CapabilitySource`, `ExecutorBinding`, and `ApprovalPolicy`.
- Provider/model registry scoped to endpoint identity.
- Provider-neutral conversation ledger, context projections, and model runs.
- Connector profiles that can receive handoffs, acknowledge delivery, write inbox files, submit health, and upload manual reports.

The missing piece is a real local role-Agent execution loop. A human can release a delivery to an Agent, but the local Connector cannot yet start the run, call Codex, write transcript/model-run facts, or return a report through the same task timeline.

## Product Direction

`computer` is not a first-class Sartre product object in this slice. Electron may later package Web Console plus Local Connector, but users should not have to reason about computers. The visible model is:

```text
Role Agent
  -> Endpoint Identity
  -> Runtime Binding / LLM Adapter
  -> Capabilities / Approval Policy
  -> Task Inbox / Execution Timeline
```

The local machine remains an implementation detail of Connector runtime health.

## Architecture

```text
Web Console
  -> SDK
  -> Hub API / Postgres facts

Connector CLI
  -> SDK
  -> Local Codex Executor
  -> Codex App Server adapter
  -> SDK writeback

Hub API
  -> Delivery state machine
  -> Provider registry
  -> Conversation ledger/model runs
  -> Artifacts/timeline
```

Hub remains the durable fact source. Connector owns local execution. Web Console consumes facts and issues human-control commands.

## Decisions

### Decision 1: Start delivery is a public lifecycle command

`Delivery` already has a domain `start()` transition from `accepted` to `running`, but Hub HTTP/SDK do not expose it. This change adds `POST /deliveries/:deliveryId/start` and `client.startDelivery()`.

Alternative considered: let executor call `report-ready` directly from `accepted`. Rejected because it removes the observable running state and makes cancellation/retry/debugging weaker.

### Decision 2: Codex execution is behind an adapter boundary

Connector uses a `CodexExecutor` abstraction with a fake implementation for deterministic tests and a real app-server implementation for smoke. The fake verifies prompt/render/writeback without spawning Codex.

Alternative considered: shell out to `codex` directly inside CLI command. Rejected because it couples CLI parsing to provider execution and makes tests slow/flaky.

### Decision 3: Provider registry resolves runtime before execution

Executor resolves endpoint provider/model selection before invoking Codex. The selected profile is stored in run metadata and model-run facts. If no profile is available, execution fails with `Unavailable`.

Alternative considered: hard-code `codex/gpt-5` in Connector profile. Rejected because provider/model registry was built specifically to avoid this.

### Decision 4: Conversation ledger stores transcript facts

Execution prompt and assistant output are appended as conversation messages. `ModelRun` records provider/model/status/error and can carry adapter session metadata. The report artifact remains attached to the handoff.

Alternative considered: only write a markdown report artifact. Rejected because task detail needs timeline/transcript and future provider switches need provider-neutral ledger facts.

### Decision 5: Report-ready remains human-check boundary

After Codex succeeds, Connector moves delivery to `report_ready`, not `closed`. A human can inspect and then send/close. Later settings can allow auto-close for low-risk roles, but the first slice keeps human confirmation.

Alternative considered: close automatically after executor succeeds. Rejected because the user explicitly wants human check before sending results back.

### Decision 6: Web Console does not add an execution center

Execution facts appear in task detail, timeline, and current role Agent context. The main board remains task-centric.

Alternative considered: add a new “Executions” top-level page. Rejected because reports/runs belong to tasks and would fragment the user workflow.

## State Machines

### Delivery lifecycle extension

| Current | Event | Next | Side effect |
| --- | --- | --- | --- |
| `accepted` | executor starts | `running` | append `delivery.running` |
| `running` | executor succeeds | `report_ready` | append `delivery.report_ready`, add report artifact, record model run |
| `running` | executor fails | `failed` | append `delivery.failed`, record failed model run |
| `report_ready` | human sends result | `closed` | append `delivery.closed` |

Illegal transitions are rejected by the domain state machine and surfaced as classified errors.

### Local executor run

| Current | Event | Next | Side effect |
| --- | --- | --- | --- |
| `queued` | delivery accepted | `starting` | resolve provider profile |
| `starting` | profile resolved | `running` | call Codex adapter |
| `running` | adapter success | `succeeded` | write transcript/report, mark report ready |
| `running` | adapter failure | `failed` | record classified error |
| `starting` | no profile | `failed` | record `Unavailable` |

## Data / Contracts

- Reuse `DeliveryLifecycleCommandRequest` for `start`.
- Reuse `ProviderModelSelectionResponse` for runtime resolution.
- Reuse `ConversationLedger`, `ConversationMessage`, `ContextProjection`, and `ModelRun`.
- Add only minimal executor-specific metadata where existing schemas are insufficient.
- Metadata must pass secret-like checks and never store API keys/tokens.

## Web Console UX

- Main view stays task board / inbox.
- Task detail shows:
  - delivery status
  - selected role Agent
  - runtime binding/provider profile
  - execution run status
  - transcript/progress excerpts
  - report artifact and send/close action
- No `computer` nav item or management page.

## Risks / Trade-offs

- Real Codex app-server protocol may drift -> isolate it behind adapter and prove fake path first; real smoke is separate evidence.
- Conversation/model-run APIs may not yet expose all fields the UI wants -> keep UI read projection narrow and do not invent client state.
- Running Codex can be slow or unavailable -> fake adapter tests are CI-safe; real smoke can be `SKIPPED` with reason.
- Failure writeback can partially complete -> order writeback so model-run failure and delivery failure are both auditable.

## Migration Plan

1. Add OpenSpec, BDD, acceptance, and Plan Ledger for this change.
2. Add contract/domain tests for delivery `start` API surface.
3. Add Hub repository/controller/service `startDelivery` and SDK helper.
4. Add local executor adapter types and fake Codex executor tests.
5. Add connector `execute` command with provider resolution, start, run, transcript/model-run/report-ready writeback.
6. Add Web Console task detail read projection for execution facts.
7. Run package tests/builds, architecture check, OpenSpec strict validation, diff check, and fake/real smoke evidence.

Rollback is additive: existing connect/ack/report flows keep working. If executor is unused, no delivery transitions to `running`.
