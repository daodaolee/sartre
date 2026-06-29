## Context

The service baseline already has a Hub-owned delivery lifecycle, endpoint capability manifests, provider/model registry, Connector inbox/writeback flows, and a `CodexExecutor` abstraction with a deterministic fake implementation. The missing capability is a real local execution implementation that can invoke the user's installed Codex runtime without making tests depend on a live model session.

The external Codex surface is not a stable Sartre domain contract. `codex app-server` exists for future streaming/runtime integration, but the first real execution slice can be implemented through `codex exec` because it is a narrower, non-interactive command path with explicit output capture.

## Goals / Non-Goals

**Goals:**

- Add a real `CodexExecutor` implementation that invokes local `codex exec`.
- Keep fake execution as the default deterministic path for unit tests and low-risk demos.
- Make real execution explicit through CLI flags or environment variables.
- Normalize timeout, process failure, unavailable binary, auth/action-required, and rate-limit errors into existing executor error categories.
- Capture assistant output as a provider-neutral `CodexExecutionResult` so Hub writeback does not depend on Codex session storage.
- Provide a real smoke path with honest `REAL_TEST` or `SKIPPED` evidence.

**Non-Goals:**

- Do not add a `computer` product object, page, or persisted domain concept.
- Do not implement Codex app-server streaming as the primary executor in this slice.
- Do not change Hub delivery APIs, database schema, or Web Console task UI.
- Do not store Codex credentials, raw tokens, or provider session history as canonical Sartre state.

## Decisions

### Decision 1: Real first slice uses `codex exec`

Connector will add `createCodexCliExecutor()` backed by `codex exec --ephemeral --skip-git-repo-check --output-last-message <file> <prompt>`.

Alternative considered: implement against `codex app-server` now. Rejected for this slice because app-server protocol shape can drift and needs streaming/session handling that is not required to prove local role execution.

### Decision 2: Process spawning is injected

The executor will accept an injectable command runner. Unit tests will assert command arguments, output-file handling, timeout handling, and error classification without spawning Codex.

Alternative considered: call `child_process.spawn` directly in executor tests. Rejected because it would make unit tests slow and environment-dependent.

### Decision 3: Real execution is explicit

`connector execute <profile> <delivery-id>` continues to be safe by default. A caller must choose real execution through an option or `SARTRE_CODEX_EXECUTOR=real`; otherwise fake execution remains available.

Alternative considered: make real Codex the default immediately. Rejected because local auth, model configuration, network access, and prompt cost are user-environment dependent.

### Decision 4: Error messages are safe-by-default

The adapter will pass stderr/stdout through the existing classifier and redact secret-like substrings before returning failure messages. Classification remains stable even if Codex changes exact wording.

Alternative considered: surface raw process errors for debugging. Rejected because task timelines and reports can be shared between roles.

### Decision 5: Smoke evidence is separate from CI-safe tests

Unit tests use the injected runner. The real smoke command attempts a tiny Codex invocation and labels evidence as `REAL_TEST` only if a process ran, otherwise `SKIPPED` with a concrete reason.

Alternative considered: require real Codex in package tests. Rejected because CI and other developers may not have a logged-in local Codex runtime.

## Risks / Trade-offs

- Codex CLI argument changes -> isolate command construction in one executor factory and keep a smoke command.
- Codex auth or rate limits block local execution -> classify as `NeedUserAction`, `RateLimited`, or `Unavailable` and keep fake path for deterministic verification.
- Long model runs can hang -> enforce adapter timeout and return classified failure.
- Prompt/output can contain sensitive material -> redact process errors and avoid logging raw credentials.
- `codex exec` is non-streaming -> sufficient for first executable role-agent slice; future app-server executor can reuse the same `CodexExecutor` contract.

## Migration Plan

1. Add BDD, acceptance, and Plan Ledger artifacts for this change.
2. Add failing connector-core tests for CLI executor command construction, output capture, timeout, and redacted classification.
3. Implement `createCodexCliExecutor()` and shared process runner types.
4. Add connector-cli tests for explicit executor selection and update `execute` command.
5. Add/update smoke command for real Codex execution evidence.
6. Run targeted package tests/builds, architecture check, OpenSpec strict validation, `git diff --check`, and real smoke.

Rollback is additive: keep using fake executor selection. Existing Hub, inbox, ack, report, and Web Console paths remain unchanged.

## Open Questions

- The exact long-term Codex app-server protocol remains future work. This design keeps it behind the same executor boundary.
