# MS1 Identity & Product Input Boundary Specification

> Status: APPROVED on 2026-08-03 by explicit product-owner instruction. This task-specific
> specification supersedes the first Feishu OAuth sentence in `HubApiSpec.md` section 2 for MS1.
> The imported specification remains an immutable provenance artifact.

## 1. Product decision

Feishu was originally considered as a source for product documents, not as a required identity
provider. Feishu is not an MS1 Human authentication provider. MS1 authenticates a Human through a
verified company email and must not require a Feishu application, tenant, callback, credential, or
provider-staging gate.

The current PRD input contract for the future Requirement capability is a Markdown file. A Feishu
link, snapshot, API integration, and synchronization behavior are outside the current required path;
the Feishu document connector is deferred until a later reviewed specification establishes its
authorization, snapshot, provenance, refresh, and failure semantics.

This decision does not bring Requirement into MS1. MS1 still ends at the Identity, Workspace,
ProjectAccess, Endpoint, authorization, Electron isolation, and diagnostic boundaries. Markdown PRD
ingestion begins only in the milestone that owns Requirement creation and alignment.

## 2. MS1 Human authentication contract

- Company-email registration requires an approved domain and a delivered, short-lived, single-use
  verification code before password creation.
- Passwords use Argon2id through the `PasswordHasher` port. Plaintext passwords and verification
  codes never enter persistence, logs, diagnostics, audit, or Renderer state.
- Human access tokens are short-lived and carry only User and Session identity. Opaque Refresh
  Tokens are stored only as hashes, rotate on every use, and revoke the family on replay.
- Login and verification use durable network, identity, and combined rate-limit dimensions with
  stable non-disclosing failures.
- Logout current/all, session inventory, expiry, revocation, actor derivation, security events, and
  Secret-boundary requirements remain mandatory.
- Feishu login routes, OAuth attempts, provider adapters, and provider credentials are absent from
  the current Human-auth runtime and production composition.

## 3. Markdown PRD boundary for the later Requirement milestone

- The product-facing source is one Markdown file supplied through the reviewed Requirement input
  flow. The later milestone must define encoding, size, attachment/path isolation, normalization,
  snapshot hash, and rejection behavior before implementation.
- Markdown content becomes proposed Requirement context; it does not silently become a confirmed
  Goal Contract or bypass Requirement Owner alignment and confirmation.
- External document links may later be retained as Evidence, consistent with `UIDesignV2Spec`, but
  no connector may overwrite the confirmed Markdown baseline automatically.

## 4. Evidence boundary

Task 4 requires real PostgreSQL session/refresh behavior, a testable verification-mail
transport/inbox, access-token signing and rotation evidence, Hub TLS configuration, controller/API
negative controls, and Secret/redaction gates. Feishu provider staging is not an MS1 gate.

Local fakes remain unit or integration fixtures and cannot claim real mail delivery, production key
rotation, or TLS evidence. Missing required inputs remain `BLOCKED`, not `SKIPPED` or degraded PASS.
