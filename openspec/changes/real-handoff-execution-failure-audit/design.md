## Context

The current lane can create local demo handoffs, accept deliveries, start execution, run a fake or real Codex CLI executor, write successful conversation/model-run/report facts, and move a delivery to `report_ready`. The remaining risk is asymmetric failure behavior: if local execution fails after the Hub has recorded `running`, the platform can lose the failure reason unless Connector writes it back deliberately.

The architecture rule remains unchanged: Hub is the durable fact source; Connector owns local execution; Web Console consumes Hub facts. Provider sessions are not canonical history.

## Goals / Non-Goals

**Goals:**

- Prove a real handoff delivery can move through `accepted -> running -> report_ready` with the real Codex CLI executor.
- When execution fails after `startDelivery`, record a failed `model_run` with classified error metadata.
- Mark the delivery failed through public Hub/SDK APIs and persist a `delivery.failed` event.
- Keep failure messages safe: no token, secret, API key, or private key plaintext.
- Make task detail and timeline able to show failed execution facts from existing Hub projections.
- Add a real smoke path that creates/receives/accepts a delivery and exercises the real executor.

**Non-Goals:**

- Do not add a generic chat composer.
- Do not add a `computer` product object.
- Do not introduce a new provider/session state source outside Hub.
- Do not change the human review boundary after successful `report_ready`.

## Decisions

### Decision 1: Failure writeback starts after `startDelivery`

Connector only marks a delivery failed if the Hub has already accepted the transition to `running`. Failures before `startDelivery` are local command failures because the canonical delivery state did not enter execution.

Alternative considered: always fail the delivery on any connector error. Rejected because precondition failures such as missing inbox or invalid local input should not mutate Hub state.

### Decision 2: Failed model run is recorded before delivery failure

When executor invocation fails after context projection is created, Connector records a `model_run` with `status=failed`, classified category, safe message, provider/model/profile metadata, and execution timestamps. It then calls `failDelivery` with a reason that references the classified error.

Alternative considered: only call `failDelivery`. Rejected because task detail needs model-run facts for diagnosis and future retry policy.

### Decision 3: Failure writeback is best-effort but explicit

If model-run writeback fails, Connector still attempts `failDelivery` and then throws an error that includes the original classified executor failure plus writeback failure metadata. Tests must cover the normal failure writeback path first.

Alternative considered: stop after the first writeback failure. Rejected because preserving a delivery terminal state is more important for operator visibility.

### Decision 4: Real smoke uses the local demo path

The smoke should use existing public APIs and fixtures: register endpoints, create handoff, connect/receive, accept, then execute with `SARTRE_CODEX_EXECUTOR=real`. It should output `REAL_TEST` only when the real Codex executor actually runs and the delivery reaches `report_ready`; otherwise it reports `SKIPPED` or a classified failure.

Alternative considered: reuse `codex-smoke --exec` only. Rejected because that proves Codex invocation but not handoff lifecycle writeback.

### Decision 5: UI changes stay projection-only

If the Web Console lacks failed execution presentation, only add projection rendering for failed model-run facts. Do not add new command surfaces or chat input.

Alternative considered: add a task chat panel now. Rejected because chat should be built on top of reliable task execution and failure audit.

## Risks / Trade-offs

- Partial failure after `startDelivery` -> record as much as possible and surface classified writeback errors.
- Real Codex can be slow or unavailable -> smoke uses explicit evidence labels and timeout.
- Current Hub contracts may not expose failed model-run fields cleanly -> prefer existing metadata fields before schema changes.
- Existing worktree is dirty -> touch only this change surface and record exact verification.

## Migration Plan

1. Add BDD, acceptance checklist, and Plan Ledger for this change.
2. Validate OpenSpec before implementation.
3. TDD connector-core failure writeback: RED tests for failed executor, failed model run, failed delivery event.
4. Implement minimal failure handling around existing `executeDelivery`.
5. TDD connector-cli real handoff execution smoke if a reusable CLI command is missing.
6. Add projection-only Web Console test/rendering if failed run facts are not visible.
7. Run targeted tests/builds, architecture check, OpenSpec strict validation, `git diff --check`, and real handoff execution smoke.

Rollback is additive: existing successful execution and manual task operations remain unchanged.
