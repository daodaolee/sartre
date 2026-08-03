# MS1 Identity & Product Input Boundary Specification

> Status: APPROVED on 2026-08-03 by explicit product-owner instruction. This task-specific
> specification supersedes the Feishu OAuth and self-service email-registration requirements in
> `HubApiSpec.md` section 2 for MS1. The imported specification remains an immutable provenance
> artifact.

## 1. Product decision

Feishu was originally considered as a source for product documents, not as a required identity
provider. Feishu is not an MS1 Human authentication provider. MS1 authenticates a Human through an
operator-provisioned local account and must not require a Feishu application, email-delivery service,
tenant, callback, credential, or provider-staging gate.

Email delivery is deferred while the first product flow is established. Self-service registration,
email verification, password recovery, invitation delivery, and outbound security notification are
not MS1 runtime dependencies. An operator provisions the initial Human account through a non-HTTP
command; the public API exposes login and Session lifecycle only.

The current PRD input contract for the future Requirement capability is a Markdown file. A Feishu
link, snapshot, API integration, and synchronization behavior are outside the current required path;
the Feishu document connector is deferred until a later reviewed specification establishes its
authorization, snapshot, provenance, refresh, and failure semantics.

This decision does not bring Requirement into MS1. MS1 still ends at the Identity, Workspace,
ProjectAccess, Endpoint, authorization, Electron isolation, and diagnostic boundaries. Markdown PRD
ingestion begins only in the milestone that owns Requirement creation and alignment.

## 2. MS1 Human authentication contract

- The operator-provisioned local account uses a normalized company-email-shaped login identifier so
  the later email integration can adopt the identity without migrating the User. The operator is the
  trusted attestation boundary; the system does not claim that an email was delivered or opened.
- Provisioning is not an HTTP route. The command reads the password from standard input, validates
  the approved domain, and writes only an Argon2id hash. Plaintext passwords never enter persistence,
  process arguments, logs, diagnostics, audit, or Renderer state.
- Human access tokens are short-lived and carry only User and Session identity. Opaque Refresh
  Tokens are stored only as hashes, rotate on every use, and revoke the family on replay.
- Login uses durable network, identity, and combined rate-limit dimensions with stable
  non-disclosing failures.
- Logout current/all, session inventory, expiry, revocation, actor derivation, security events, and
  Secret-boundary requirements remain mandatory.
- Feishu login routes, email registration/verification routes, outbound mail ports, OAuth attempts,
  provider adapters, and provider credentials are absent from the current Human-auth runtime.

## 3. Markdown PRD boundary for the later Requirement milestone

- The product-facing source is one Markdown file supplied through the reviewed Requirement input
  flow. The later milestone must define encoding, size, attachment/path isolation, normalization,
  snapshot hash, and rejection behavior before implementation.
- Markdown content becomes proposed Requirement context; it does not silently become a confirmed
  Goal Contract or bypass Requirement Owner alignment and confirmation.
- External document links may later be retained as Evidence, consistent with `UIDesignV2Spec`, but
  no connector may overwrite the confirmed Markdown baseline automatically.

## 4. Evidence boundary

Task 4 requires real PostgreSQL provisioning/session/refresh behavior, access-token signing and
rotation evidence, Hub TLS configuration, controller/API negative controls, and Secret/redaction
gates. Feishu provider staging and mail delivery are not MS1 gates.

Local fakes remain unit or integration fixtures and cannot claim production key rotation or TLS
evidence. Future email delivery requires a new reviewed contract and real delivery/inbox evidence;
MS1 must not report that deferred capability as implemented.
