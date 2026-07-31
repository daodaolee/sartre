# AGENTS.md

> Sartre production repository. Current active milestone: MS1 Identity, Workspace & Tenant Boundary
> implementation. MS0 is closed at annotated tag `ms0-verified`.

## Language and collaboration

- User-facing responses are primarily Chinese; preserve technical identifiers in English.
- Use first-principles reasoning and surface lower-cost alternatives when scope expands without serving the product goal.
- Local commits and verified milestone tags are authorized. Do not push unless the user explicitly requests it.
- Never revert unrelated user changes.

## Authority and required reading

1. `spec/README.md`
2. `spec/ProgramSpec.md`
3. `spec/DDDSpec.md`
4. `spec/StateMachineSpec.md`
5. `spec/ArchitectureConstraints.md`
6. Task-specific specs
7. `workflow/`
8. `plan/00-master-plan.md`
9. Active implementation plan and `PLAN_LEDGER.md`

Conflict order: `spec > workflow > plan > docs > comments`.

## Module boundaries

- `packages/domain`: pure domain invariants; no framework, I/O, HTTP, Electron, or database imports.
- `packages/contracts`: Zod command, DTO, event, result, health, diagnostic, and evidence contracts.
- `packages/sdk`: the only Hub client used by Electron and Runtime.
- `packages/runtime-core`: RepoRegistry, Execution, Lease, File/Command/Git/MCP primitives.
- `apps/hub-api`: synchronous command/query, auth, authorization, signed URL, and SSE.
- `apps/hub-worker`: Outbox, Steward, notification, attachment, and projection workers.
- `apps/electron-app`: Human UI, approval, SDK, and Runtime management.
- `apps/local-runtime`: local companion daemon.

Apps may not import another app's source. Renderer may not access Hub, Runtime, Node, raw IPC, credentials, or local paths directly.

## Evidence rules

- Follow `workflow/harness-sop.md` and `workflow/plan-ledger-sop.md`.
- REAL_TEST requires an executed target, assertions, a real failure mode, and non-zero on failure.
- STRUCTURAL_CHECK, SCENARIO_REGISTERED, SKIPPED, degraded, or unreachable are not PASS.
- Before closing a task, update the active PLAN_LEDGER with exact commands, result, evidence level, risks, and resume procedure.
- Before closing an MS, bind evidence to the subject commit, dirty hash, artifact hash, schema version, environment, and tool versions.

## Secrets

- `/.local-secrets/` is local unattended-development input and must remain ignored.
- Never print, log, copy, stage, package, or persist Secret values in reports or database fixtures.
- Every commit and build must run the Secret boundary check.
- Tool-version collection uses an explicit command allowlist such as `node --version` and `pnpm --version`. Never run or capture `env`, `printenv`, `npm config list`, `pnpm config list`, shell profiles, credential helpers, or full process environments.

## Current MS1 scope

The MS1 implementation plan received explicit user approval on 2026-07-31. MS1 may implement
Identity & Access, Workspace/Membership/Invitation/ProjectAccess, Human and Endpoint credentials,
tenant RLS/authorization, Electron auth/workspace/pairing surfaces, and ops-only identity
diagnostics. It must not implement Requirement, Session, Agent execution, Lease behavior, Steward
behavior, or legacy compatibility.
