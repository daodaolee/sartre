# MS1 Identity, Workspace & Tenant Boundary Proposal

## Outcome

An internal Human authenticates through Feishu OAuth or a verified company email, creates/selects a
Workspace, invites and manages members, grants Project access independently from Workspace role, and
pairs/revokes a local Endpoint. Two Workspaces with multiple real Users and Endpoints demonstrate
that tenant data and credentials do not cross boundaries.

## Why now

MS0 is closed at `ms0-verified`. Requirement, Session, Agent, and Steward capabilities cannot safely
start until Human/Endpoint/System actors, Workspace membership, ProjectAccess, token lifecycle,
central authorization, PostgreSQL RLS, Electron credential isolation, and ops-only diagnostics are
real production boundaries.

## Non-goals

MS1 does not implement Requirement, Session/messages, Attachment/object storage, Agent execution,
Project Lease behavior, Steward behavior, business credential sharing, or legacy compatibility.
Mocks, fixtures, static SQL inspection, and HTTP 200 are not production evidence.

## Authority and design input

The authority remains `spec > workflow > plan > docs`. The editable Pencil source at
`design/pencil/sartre-product-v2.pen` supplies the Workspace shell, Settings, Account, and member
patterns; missing login/invitation/ProjectAccess/Endpoint states must be reviewed in that source
before Renderer implementation and cannot override the specs.
