# MS1 Identity, Workspace & Tenant Boundary Tasks

1. Approve the plan, capture ops inputs, and extend OpenSpec validation for MS1.
2. Build pure Identity/Workspace domain invariants and Zod actor/auth/access contracts with RED first.
3. Add PostgreSQL 17.6 `000003_ms1_identity_workspace` tables, roles, constraints, RLS/FORCE RLS, and real matrix tests.
4. Implement verified-company-email registration, Human sessions, refresh rotation/replay revocation, and security events; defer Feishu document integration.
5. Implement Workspace creation/selection, invitations, membership, Projects, and independent ProjectAccess through centralized authorization.
6. Implement one-time Endpoint pairing, hash-only credential/token exchange, Workspace grants, Runtime secure storage, rotation, and revoke.
7. Implement SDK plus Electron Main/Preload/Renderer flows mapped to the reviewed Pencil source without exposing credentials.
8. Complete Human/Endpoint/System actor audit and ops-only cross-Workspace diagnostic timeline with immutable query audit.
9. Run MS1 clean-clone/CI/real-dependency/package gates, independent reviews, evidence-only child, and final verifier.

Exact files, RED/GREEN commands, commit boundaries, evidence, stop conditions, and non-goals are in
`docs/superpowers/plans/2026-07-31-ms1-identity-workspace-tenant-boundary.md`.
