# MS1 Identity & Access Protocol Specification

> Status: APPROVED on 2026-08-03 by explicit user instruction. This task-specific specification
> supersedes only the first Feishu OAuth sentence in HubApiSpec.md section 2 for MS1. All other
> imported specifications and Human-authentication requirements remain authoritative.

## 1. Provenance and decision

spec/HubApiSpec.md is a byte-identical imported provenance artifact and remains unchanged. Its
Feishu sentence assumed provider-returned nonce, but the supported Feishu web OAuth contract does
not return an ID token or nonce. MS1 therefore uses the provider controls Feishu actually exposes
and must not claim provider nonce validation.

This amendment is limited to the Feishu Human login protocol. It does not weaken company-tenant
validation, callback lifetime, credential isolation, access/refresh session security, rate limits,
security events, or any external staging requirement.

## 2. Current Feishu OAuth contract

- Use the system browser and Authorization Code + PKCE with code_challenge_method=S256.
- Electron Main generates and retains a 43-128 character verifier outside Renderer. Hub receives
  only the S256 challenge when creating the attempt and receives the verifier only during callback
  completion.
- Hub generates a cryptographically random, single-use state, stores only its hash with a short
  expiry, and consumes it atomically. Wrong, expired, or reused state creates no Human Session.
- Authorization and token exchange use the same exact redirect URI from an HTTPS allowlist. Hub
  verifies it against the persisted attempt before exchange; Feishu also rejects mismatch.
- The authorization code is short-lived and single use. Used, expired, missing, malformed, or
  PKCE-mismatched code responses fail closed with the stable non-disclosing OAuth error.
- After exchange, Hub calls the supported user-information endpoint and accepts identity only when
  returned tenant_key exactly matches the approved company tenant allowlist.
- Feishu access/refresh tokens, authorization codes, client credentials, verifier, and raw provider
  responses are transient adapter values. They are never persisted, logged, audited, returned to
  Renderer, or reused as Sartre Human tokens.
- Provider endpoints are fixed HTTPS origins, not caller configuration:
  - https://accounts.feishu.cn/open-apis/authen/v1/authorize
  - https://open.feishu.cn/open-apis/authen/v2/oauth/token
  - https://open.feishu.cn/open-apis/authen/v1/user_info

The supported callback security set is therefore: single-use state, PKCE S256, exact redirect URI,
single-use authorization code, short expiry, and exact tenant_key. Adding a future OIDC flow or
nonce-bearing signed ID token requires a new reviewed specification and cannot be inferred from a
field supplied by Sartre itself.

## 3. Evidence boundary

Local fake-provider and local HTTP-server tests prove only application/adapter integration. Task 4
still requires Feishu staging with an approved app, tenant, redirect URI, and test user before
external-provider PASS. Missing operations inputs remain BLOCKED; they are not SKIPPED, degraded
PASS, or replaceable by structural inspection.

Official contracts reviewed for this amendment:

- https://open.feishu.cn/document/common-capabilities/sso/api/obtain-oauth-code
- https://open.feishu.cn/document/authentication-management/access-token/get-user-access-token
- https://open.feishu.cn/document/server-docs/authentication-management/login-state-management/get
