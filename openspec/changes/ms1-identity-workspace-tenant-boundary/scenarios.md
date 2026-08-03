# MS1 Identity, Workspace & Tenant Boundary BDD scenarios

| Class | Given / When / Then | Evidence | Stable code |
| --- | --- | --- | --- |
| positive-human | Given an approved company Human, when Feishu PKCE or verified-email auth completes, then one Human Session and short-lived access identity are created without exposing credentials. | REAL_TEST | `none` |
| oauth-rejection | Given wrong/reused state, wrong PKCE verifier or redirect, wrong `tenant_key`, or an expired/reused code, when OAuth completes, then no session is created and the request fails closed. | REAL_TEST | `oauth_callback_invalid` |
| email-rejection | Given an unapproved/unverified company email or wrong password, when registration/login runs, then identity existence is not disclosed and no session is issued. | REAL_TEST | `authentication_failed` |
| refresh-concurrency | Given one Refresh Token, when two rotations race, then exactly one succeeds and replay revokes the family. | REAL_TEST | `refresh_token_reused` |
| workspace-positive | Given an authenticated Human, when a Workspace is created and an exact invitation is accepted, then membership is visible only in that Workspace. | REAL_TEST | `none` |
| invitation-concurrency | Given one valid invitation, when acceptance races or is repeated, then exactly one membership is created. | REAL_TEST | `invitation_already_used` |
| role-rejection | Given a non-owner or removal of the last owner, when role/member mutation is requested, then it is denied without changing state/events. | REAL_TEST | `forbidden` |
| project-access | Given a Workspace admin without Project viewer/editor grant, when Project content metadata is queried or changed, then access is denied. | REAL_TEST | `project_access_denied` |
| cross-tenant-IDOR | Given actor A in Workspace A and a valid id from Workspace B, when any MS1 query/command runs, then resource existence is not disclosed and no B data/audit leaks to A. | REAL_TEST | `resource_not_found` |
| RLS | Given the application database role with missing/wrong transaction-local tenant context, when every MS1 tenant table is read/written, then PostgreSQL 17.6 rejects or returns no cross-tenant rows. | REAL_TEST | `tenant_context_invalid` |
| endpoint-positive | Given an authorized Human and one-time pairing intent, when Runtime proves the challenge, then one Endpoint Credential is returned once to Runtime and exchanges only for Endpoint tokens. | REAL_TEST | `none` |
| endpoint-rejection | Given wrong/expired/reused pairing, wrong audience, revoked credential, another Human, or another Workspace, when Endpoint routes run, then they fail closed. | REAL_TEST | `endpoint_credential_invalid` |
| renderer-secret | Given a live Human session and paired Endpoint, when Renderer/preload/log/diagnostic surfaces are inspected, then Refresh Token, Endpoint Credential, auth headers, local paths, and raw responses are absent. | REAL_TEST | `secret_boundary_violation` |
| dependency-failure | Given OAuth/mail/database/Hub/Runtime is unavailable or degraded, when the relevant flow runs, then UI/API names the stable failure and recovery action without false success. | REAL_TEST | `dependency_unavailable` |
| recovery | Given an expired access token with a valid family or a revoked Endpoint re-pair, when the supported recovery flow runs, then a new correlation reaches the authorized terminal state without manual database edits. | REAL_TEST | `identity_recovered` |
| ops-diagnostic | Given a platform operator with `ops.diagnostics.read` and reason/timeRange, when a user timeline spans Workspaces, then actor chain/failure stage is returned and immutable query audit is written. | REAL_TEST | `none` |
| ops-rejection | Given a member/owner/admin or forged System actor, when cross-Workspace diagnostics are requested, then access is denied and no tenant details are returned. | REAL_TEST | `diagnostic_access_denied` |
| Secret | Given a synthetic token/credential in index, runtime payload, packaged Electron, log, or diagnostic result, when security gates run, then they fail nonzero without printing the value. | REAL_TEST | `secret_boundary_violation` |

All scenarios are registered only. No row is PASS until its target, assertions, real failure mode,
and non-zero rejection behavior execute against the bound MS1 subject/environment.
