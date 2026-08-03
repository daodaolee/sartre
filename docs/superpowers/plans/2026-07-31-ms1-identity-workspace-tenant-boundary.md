# MS1 Identity, Workspace & Tenant Boundary implementation plan

> Status: APPROVED FOR IMPLEMENTATION by explicit user instruction on 2026-07-31. Execute one task
> at a time and update the independent PLAN_LEDGER before every commit boundary.

## 1. Outcome

Deliver the first production vertical slice in which a Human can authenticate with an
operator-provisioned local account, create/select a Workspace, invite and manage members, grant Project
access independently from Workspace role, and pair/revoke one local Endpoint. Every tenant-owned
read/write must pass centralized authorization and PostgreSQL 17.6 `RLS + FORCE RLS`; every Human,
Endpoint, and System action must retain a verifiable actor chain and enter the diagnostic timeline.

MS1 is complete only when two real Workspaces, multiple Users, and multiple Endpoints prove both the
positive flow and IDOR/RLS/token replay/revocation/renderer-isolation rejection paths. HTTP 200,
mock-only auth, fixture existence, or structural SQL inspection cannot close the milestone.

## 2. Authority and non-goals

Authority order remains `spec > workflow > plan > docs > comments`. In particular, use
`ProgramSpec`, `DDDSpec`, `StateMachineSpec`, `ArchitectureConstraints`, `ModuleContractSpec`,
`HubApiSpec`, the approved task-specific `MS1IdentityAccessSpec`, `ElectronAppSpec`,
`UIDesignV2Spec`, `TestStrategy`, and the database schema before this plan.

`MS1IdentityAccessSpec` supersedes the Feishu login requirement in `HubApiSpec` section 2 for MS1.
The imported `HubApiSpec` remains an immutable provenance artifact. Feishu is deferred as a future
document connector; it is not a Human authentication provider or MS1 staging dependency.

MS1 does not implement Requirement, Session/message ledger, AgentDefinition/Invocation/Execution,
Project Lease behavior, Steward inference, Attachment/object storage, business credentials, or
legacy compatibility. Endpoint revocation may publish a stable future-facing revocation event, but
must not invent Lease tables or claim Lease cancellation evidence before the Lease milestone.
The later Requirement milestone starts PRD ingestion from a Markdown file; recording that boundary
does not authorize Requirement implementation during MS1.

## 3. Existing design source and gaps

The editable source is `design/pencil/sartre-product-v2.pen`, imported with SHA-256
`52cb7849746fe0f15ce7e597d40da75faca3f5a88eb137c9d65984a1128af881`. It already contains the
Workspace switcher, Settings/Workspace, Settings/Account, member rows, and shared shell patterns.
It is supporting product input and never overrides `spec/`.

Before Renderer implementation, extend or explicitly map the same Pencil source for the missing MS1
states: local-account login, invitation accept/expired,
Project Access matrix, Endpoint pair/rotate/revoke, offline/degraded, forbidden/non-disclosure, and
token-expired recovery. Preserve Geist/Geist Mono, compact desktop hierarchy, keyboard/focus states,
and no credential or absolute-path rendering. Generated previews are review artifacts, not PASS.

## 4. External inputs and fail-closed policy

Operations must provide before the corresponding required integration/staging gate:

- Approved company email domains used as login-identifier policy; account passwords are supplied to
  the non-HTTP provisioning command through standard input.
- Access-token signing/verification key source and rotation procedure, internal Hub TLS origin, and
  Electron authentication recovery registration.
- Platform-operator test identities for `ops.diagnostics.read` and at least two ordinary Workspace
  owners/admins who must be denied cross-Workspace diagnostics.

Missing inputs produce `BLOCKED` or `MANUAL_REQUIRED`, never mock PASS. Local unit/integration tests
use ports and disposable fixtures without persisting real credentials.

## 5. Cross-cutting design decisions

### 5.1 Actor separation

- `HumanActor`, `EndpointActor`, and `SystemActor` are discriminated contracts; payload `userId`,
  `actorId`, and `workspaceId` are never authorization sources.
- Human commands derive user/session from the validated Human token. Endpoint routes accept only an
  Endpoint token with its separate audience and allowlist. System diagnostics require a persisted
  platform grant and reason.
- User-attributable Endpoint/System events retain `initiatedByUserId`; actor type cannot be silently
  converted at controller, SDK, IPC, or repository boundaries.

### 5.2 Tokens and credentials

- The operator-provisioned local account uses Argon2id through a `PasswordHasher` port. There is no
  public registration or email-verification route. No plaintext password, token, or credential reaches
  logs/audit/renderer.
- Access tokens are short-lived and carry only User/Session identity. Opaque 256-bit Refresh Tokens
  are stored only as hashes, rotate on every use, and revoke their family on old-token replay.
- Endpoint Credential is independently generated, returned exactly once to Main/Runtime, hashed in
  Hub storage, exchanged for a separate-audience short-lived Endpoint token, and stored only by the
  Runtime secure-store adapter. Renderer receives status and stable codes only.

### 5.3 Tenant transaction

Every tenant operation executes one database transaction in this order:

```text
authenticate
-> resolve TenantContext from authenticated actor and requested resource
-> SET LOCAL workspace/actor context
-> AuthorizationService deny-by-default
-> idempotency/requestHash and expectedVersion when applicable
-> domain invariant
-> state + DomainEvent + OutboxEvent + AuditEvent
```

The application role is not the table owner and has no `BYPASSRLS`. All tenant tables use
`workspace_id NOT NULL`, `ENABLE ROW LEVEL SECURITY`, and `FORCE ROW LEVEL SECURITY`. Repositories
load flat resources only by `{workspaceId, resourceId}` and must not expose existence across tenants.

### 5.4 UI trust boundary

Renderer calls named Zod-validated preload methods. Main owns Human access-token refresh, OS secure
storage, Hub SDK, and Runtime pairing orchestration. Endpoint Credential and
Refresh Token are never returned through preload. UI state may cache selection/pending/error only;
Workspace/Membership/ProjectAccess facts come from Hub DTOs.

## 6. Planned file map

The exact file list may narrow during RED, but any expansion must be recorded in the ledger before
editing.

- `packages/domain/src/identity/`: User, AuthIdentity, UserSession, refresh-family invariants.
- `packages/domain/src/workspace/`: Workspace, Membership, Invitation, ProjectAccess invariants.
- `packages/contracts/src/identity/`, `workspace/`, `endpoint/`, `authorization/`: Zod commands,
  DTOs, actor unions, errors, and events; controlled exports from `packages/contracts/src/index.ts`.
- `apps/hub-api/src/infrastructure/database/migrations/000003_ms1_identity_workspace.sql`: global
  and tenant tables, roles/grants, constraints, indexes, policies, and schema registry entry.
- `apps/hub-api/src/identity/`: operator provisioning, login/session/token application services and adapters.
- `apps/hub-api/src/workspaces/`: Workspace, invitation, membership, ProjectAccess commands/queries.
- `apps/hub-api/src/endpoints/`: pairing, exchange, rotate/revoke, and Workspace grants.
- `apps/hub-api/src/authorization/`: one deny-by-default policy surface and tenant transaction
  wrapper used by every MS1 repository.
- `apps/hub-api/src/diagnostics/`: unauthenticated-system boundary and ops-only identity timeline.
- `packages/sdk/src/`: the only Human/Workspace/Endpoint Hub clients used by Electron/Runtime.
- `apps/electron-app/src/main/`: local-account auth, safeStorage/session refresh, SDK, IPC, Runtime
  pairing orchestration, and diagnostic propagation.
- `apps/electron-app/src/preload/`: named `auth`, `workspaces`, `members`, `projects`, and `runtime`
  methods with no raw IPC or credential return.
- `apps/electron-app/src/renderer/`: login state, Workspace switcher, member/ProjectAccess,
  and pairing/revocation views mapped to the Pencil source.
- `apps/local-runtime/src/`: endpoint identity, one-time pairing intake, secure credential store,
  token exchange, revoke handling, and health status without Human authority.
- `scripts/harness/`, `tests/integration/`, and `tests/e2e/`: MS1 gates and evidence only.

## 7. Execution tasks

### Task 1 - Planning approval, environment contract, and MS1 OpenSpec validator

The planning foundation commit writes RED tests and the smallest generic OpenSpec validator needed
to validate these MS1 proposal/design/tasks/scenarios while keeping MS0 GREEN and rejecting unknown
legacy/archive changes. This is constitution tooling, not product implementation.

After this draft is pushed:

1. Obtain explicit user approval of this plan and resolve any spec conflict before product code.
2. Record available/missing ops inputs without printing values or dumping configuration.
3. Re-run the validator and planning gates on the approved commit.
4. Start Task 2 with domain/contract RED; do not start schema, HTTP, Runtime, or UI first.

Commit boundary: `plan(ms1): register identity tenant boundary`.

### Task 2 - Domain and contract invariants first

Write failing tests before implementation for:

- AuthIdentity uniqueness and provider/company-tenant validation.
- Refresh family rotation, reuse detection, expiry, idle timeout, revocation, and concurrent refresh.
- Invitation lifecycle, exact invited identity/email match, expiry, single acceptance, and role caps.
- Membership cannot remove the last owner; role changes require authorized Human expectedVersion.
- Workspace role and ProjectAccess are independent; owner/admin gets no implicit raw Project access.
- Human/Endpoint/System actor unions, initiatedBy chain, Problem Details, and non-disclosing 403/404.

Implement pure domain methods in `packages/domain` and Zod contracts in `packages/contracts`; no
HTTP/database/framework import may enter domain. Commit only after focused unit/contract GREEN,
architecture, typecheck, and Secret checks.

Commit boundary: `feat(ms1): define identity workspace contracts`.

### Task 3 - PostgreSQL 17.6 migration and real RLS matrix

Create `000003_ms1_identity_workspace.sql` with:

- Global identity/session/endpoint/operator/security/diagnostic tables owned by the migration role.
- Tenant Workspace/Membership/Invitation/Policy/Project/ProjectAccess/EndpointGrant, DomainEvent,
  OutboxEvent, AuditEvent, SecurityEvent, and client diagnostic ownership needed by the MS1 slice.
- Composite tenant keys/FKs, token/credential hash-only columns, status/expiry/version constraints,
  unique identities/invitations, and audit append-only controls.
- Exact application-role grants, transaction-local tenant/actor settings, RLS and FORCE RLS.

RED/GREEN real PostgreSQL 17.6 tests must cover CRUD for every MS1 tenant table, missing/wrong
TenantContext, same UUID in another Workspace, owner/table-owner bypass attempts, connection-pool
reuse, cross-tenant joins, rollback, concurrent invite acceptance, and migration first/no-op/checksum
drift. PostgreSQL 17.10 remains the explicit version-rejection control.

Commit boundary: `feat(ms1): enforce identity tenant schema`.

### Task 4 - Human authentication and session security

Implement a non-HTTP provisioning command plus HTTP login boundaries for an operator-provisioned
local account, short-lived Human access token, refresh rotation/family replay revocation, logout
current/all, session inventory, rate limiting, and security events. Self-service registration,
verification mail, recovery mail, and outbound notification are deferred.

Tests execute provisioning authorization isolation, password hash verification, wrong login,
refresh races and replay, revoked session, token audience/expiry, payload actor spoofing, concurrent
durable rate limiting, database unavailable, and redacted logs. Mail delivery is not claimed or used.

Commit boundary: `feat(ms1): add human authentication sessions`.

### Task 5 - Workspace, membership, invitation, and ProjectAccess slice

Implement transactional commands/queries for create/select Workspace, invite/revoke/resend/accept,
member list/role/remove, Project create/list, and independent viewer/editor ProjectAccess. All
commands carry idempotency/request hash and expectedVersion where state changes.

Tests prove two-Workspace positive flows, duplicate/concurrent commands, last-owner protection,
expired/wrong-user invitation, non-member access, role escalation, IDOR, hidden resource existence,
and that Workspace admin without ProjectAccess cannot read Project content metadata.

Commit boundary: `feat(ms1): add workspace membership access`.

### Task 6 - Endpoint pairing and Local Runtime identity

Implement authenticated one-time pairing intent, challenge/expiry, EndpointIdentity creation,
hash-only credential persistence, separate-audience token exchange, EndpointWorkspaceGrant,
rotation/revoke, and Runtime secure-store adapter. Main may pass credential once to Runtime over the
authenticated local IPC; preload/renderer receives only status.

Real subprocess/integration tests prove wrong caller/Workspace/challenge, reuse, expiry, credential
replay, Human token on Endpoint route, Endpoint token on Human route, revoke, reset while active
runtime state is unsafe, two Human accounts on one Runtime data root, and no credential in logs or
diagnostics. Do not add AgentRun/Lease behavior.

Commit boundary: `feat(ms1): pair authorized local endpoint`.

### Task 7 - SDK and Electron vertical UI

Add SDK methods first, then Main IPC and preload contracts, then Renderer surfaces. Extend/review the
Pencil source before UI GREEN for missing MS1 states. Electron tests must use the real secure window
configuration and assert token/credential non-reachability from renderer, navigation/window-open
denial, authentication recovery, Workspace switching, invitation/member/ProjectAccess actions, pairing,
revoke, offline/read-only, forbidden placeholders, keyboard/focus, and long Chinese text at
1440x900, 1280x720, and minimum window size.

Commit boundary: `feat(ms1): deliver identity workspace desktop flow`.

### Task 8 - Authorization and diagnostic closure

Ensure every MS1 command/query calls the shared AuthorizationService and produces the required
Domain/Outbox/Audit/Security/Diagnostic records in the correct global or tenant scope. Extend the
Hub API/CLI diagnostic query so only persisted `ops.diagnostics.read` can query `userId + timeRange`
across Workspaces with a mandatory reason and immutable audit.

Tests deny ordinary member/owner/admin, forged System actor, missing reason, excessive time range,
and audit write failure. Positive evidence returns lastSuccessfulStage/firstFailedStage, stable
errorCode, actor chain, accessedWorkspaces/resultCount/correlationId, no Secret/content/path, and a
new-correlation recovery check.

Commit boundary: `feat(ms1): close authorization diagnostic chain`.

### Task 9 - MS1 harness, independent review, and evidence closeout

Create an MS1 required-gate config without weakening MS0. Run clean-clone Layer 1 plus real
PostgreSQL 17.6/RLS/auth/endpoint Layer 2, packaged Electron E2E, cross-tenant/IDOR/token replay,
Secret, dependency/SAST/license, negative controls, and ops diagnostic audit. Preserve every failed
attempt and forbid SKIPPED/degraded/unreachable from PASS.

Bind the immutable subject commit, dirty hash, schema `000003_ms1_identity_workspace`, tool versions,
database environment, Electron artifact hash, and CI run/artifact digest. Require independent spec,
security/code-quality, and evidence reviews before an evidence-only child and annotated `ms1-verified`
tag. Do not begin MS2 before final verifier exit 0.

Commit boundaries: subject `feat(ms1): complete identity tenant boundary`, then evidence-only child
`test(ms1): bind identity tenant evidence`.

## 8. Required evidence matrix

| Gate | Minimum evidence | Required failure mode |
| --- | --- | --- |
| Domain/contracts | REAL_TEST unit + Zod compatibility | illegal actor/state/role rejected nonzero |
| Migration/RLS | REAL PostgreSQL 17.6 | wrong/missing tenant and owner bypass rejected |
| Human auth | real provisioning + API/database | public registration absent, password/token replay rejected |
| Workspace access | real API/database | IDOR and implicit admin Project access rejected |
| Endpoint | real Hub + Runtime subprocess | wrong audience, reuse, revoke, second Human rejected |
| Electron | packaged Playwright | renderer credential read and unsafe navigation rejected |
| Diagnostics | real persisted timeline | non-operator/owner/admin query rejected and audited |
| Secret/security | pinned scanners + audit/SAST | synthetic token/credential in index/artifact rejected |
| Recovery | real restart/new correlation | revoked/recovered flow reaches expected terminal state |

## 9. Stop conditions

Stop and update the plan/ledger before proceeding if a spec conflict appears, any tenant table lacks
FORCE RLS, any token/credential could reach Renderer/logs, an operation depends on request-body actor
identity, a required real dependency is unavailable, a High/Critical security finding exists, or a
new file/module crosses the AGENTS module boundaries. Never repair evidence by relabeling a failed or
skipped scenario.
