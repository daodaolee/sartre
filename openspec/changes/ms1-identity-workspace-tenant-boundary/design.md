# MS1 Identity, Workspace & Tenant Boundary Design

## Actor and authentication boundary

Human, Endpoint, and System actors use distinct authenticated contexts, token audiences, route
allowlists, and audits. Request payload ids are never identity. Feishu uses system-browser
Authorization Code with PKCE S256, single-use state, exact redirect, single-use code, and approved
`tenant_key`; it exposes no nonce-bearing ID token and Sartre does not claim provider nonce
validation. Company email requires verification and Argon2id. Short-lived Human access tokens carry
only User/Session identity; opaque Refresh Tokens rotate, are hash-only at rest, and revoke the
whole family on replay.

Endpoint pairing produces a separate 256-bit credential returned once to Main/Runtime and stored
only by the Runtime secure-store adapter. Hub stores only a hash. Endpoint tokens cannot invoke
Human routes; Human tokens cannot impersonate Endpoint routes. Renderer receives status, never a
Refresh Token, Endpoint Credential, token value, local path, or raw auth response.

## Workspace and authorization boundary

Workspace is the tenant. Membership role, ProjectAccess, Work Role, and later AgentUsagePolicy are
independent decisions. One centralized AuthorizationService is deny-by-default and evaluates
authenticated actor, action, resource, and Workspace ownership. Workspace owner/admin does not
implicitly receive raw Project access.

Tenant repositories operate only inside a transaction with `SET LOCAL` Workspace/actor context.
Every tenant-owned table has `workspace_id NOT NULL`, tenant-aware keys/FKs, RLS, and FORCE RLS.
The application role is not the owner and cannot BYPASSRLS. Command state, DomainEvent, OutboxEvent,
and AuditEvent commit together.

## Domain and persistence boundary

Global identity tables own User/AuthIdentity/UserSession, OAuth configuration, Endpoint identity and
credential hashes, platform operator grants, and pre-tenant system audit/security/diagnostics.
Tenant tables own Workspace, Membership, Invitation, WorkspacePolicy, Project, ProjectAccess,
EndpointWorkspaceGrant, and the MS1 event/audit facts. Invitation acceptance, session refresh, and
credential rotation use database uniqueness/CAS so concurrent success cannot occur twice.

## Electron and Runtime boundary

Electron Main owns system-browser login, Human session refresh, OS secure storage, SDK, and Runtime
pairing orchestration. Preload exposes named Zod methods only. Renderer stores presentation state,
not authoritative membership/access. Runtime uses its own secure credential store and separate
Endpoint token; it never inherits Human authority.

The Pencil source is extended before UI GREEN for auth callback, invitation, ProjectAccess, pairing,
revocation, offline, forbidden, and recovery states. Existing Workspace/Settings/member components
are reused only where they satisfy current specs and accessibility requirements.

## Diagnostics and evidence boundary

Pre-tenant login/selector failures use global system diagnostic/security records. After TenantContext,
records are tenant-owned. Only a persisted platform `ops.diagnostics.read` grant can query across
Workspaces, with reason/timeRange/accessedWorkspaces/resultCount/correlationId written to immutable
system audit. Workspace owner/admin is explicitly denied.

Closeout binds exact PostgreSQL 17.6 migration/RLS evidence, real multi-tenant HTTP/Endpoint flows,
packaged Electron tests, negative controls, subject commit, schema, environment, tool versions, and
artifacts. SKIPPED/degraded/unreachable never becomes PASS.
