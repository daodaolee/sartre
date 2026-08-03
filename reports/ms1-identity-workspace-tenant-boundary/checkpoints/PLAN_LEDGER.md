# MS1 Identity, Workspace & Tenant Boundary PLAN_LEDGER

- Status: APPROVED for implementation by explicit user instruction on 2026-07-31. Task 2 is the
  first authorized product checkpoint; no MS1 product implementation existed at approval time.
- Goal: deliver Human authentication, Workspace/Membership/Invitation/ProjectAccess, Endpoint
  pairing, tenant RLS/authorization, Electron credential isolation, and ops-only identity
  diagnostics as the first production business boundary.
- Plan: `docs/superpowers/plans/2026-07-31-ms1-identity-workspace-tenant-boundary.md`
- OpenSpec/BDD: `openspec/changes/ms1-identity-workspace-tenant-boundary/`.
- Base: MS0 verified commit `5ca19c0e04922cd1a117c9dddc579cf56ef162c8`; pre-MS1 constitution/security repair
  `4af3dfb`; preserved Pencil source commit `c25a3e7` on this planning branch.
- Design input: `design/pencil/sartre-product-v2.pen`, 847,404-byte blob, SHA-256
  `52cb7849746fe0f15ce7e597d40da75faca3f5a88eb137c9d65984a1128af881`. It contains Workspace
  switcher, Settings/Workspace, Settings/Account, and member patterns. Auth callback, invitation,
  ProjectAccess, Endpoint pairing/revoke, forbidden/offline, and recovery states are registered
  design gaps, not silently assumed complete.
- Scope of this checkpoint: planning documents, OpenSpec/BDD, independent ledger, AGENTS active
  milestone text, and the already-preserved design source only. No domain, contract, migration,
  API, SDK, Electron behavior, Runtime identity, database row, or production evidence exists yet.
- Evidence level: `SCENARIO_REGISTERED` for MS1 BDD and `STRUCTURAL_CHECK` for plan/file integrity;
  status is not PASS. Existing MS0 evidence does not prove any MS1 capability.
- External dependencies pending inventory: Feishu OAuth test app/tenant/redirect, approved company
  email domains and test mail path, signing/rotation key source, internal TLS origin/callback, and
  platform operator test identities. Values must not be placed in this ledger or repository.
- Approval checkpoint inventory: the local PostgreSQL 17.6 positive fixture and 17.10 rejection
  control are available and healthy from the planning validation. Feishu, email transport,
  signing/rotation, TLS callback, and platform-operator integration inputs remain unconfirmed and
  are deferred until their corresponding Task 4/8 gates; they do not block pure Task 2 RED/GREEN.
- Planning validator evidence:
  - A first shell structural wrapper used zsh's special `path` variable and caused `rg` lookup to
    fail with exit 127. It changed no state and is orchestration nonPASS.
  - The corrected structural check proved all six planning/OpenSpec/ledger artifacts nonempty and
    all required scenario classes present. Existing `openspec:validate` then failed
    `legacy_openspec_state_present` for the new MS1 directory, exposing the intended tool gap.
  - The validator test was changed first: focused RED failed `2/4` because MS1 was rejected and its
    missing scenarios were not validated. The generic known-change implementation then passed
    `4/4`, preserved mandatory MS0 validation and unknown legacy/archive rejection, and made
    `pnpm run openspec:validate` exit 0 with `OpenSpec validation passed.`
- Final planning-checkpoint validation on 2026-07-31:
  - Corrected nonempty/pattern structural assertions: exit 0. The earlier assertion text used
    `ops diagnostics` while the registered scenario identifier is `ops-diagnostic`; this was a
    harness assertion mismatch, changed no repository state, and is retained as nonPASS.
  - `pnpm exec vitest run scripts/constitution/openspec-validation.test.ts`: exit 0, `1 file | 4
    tests`; `pnpm run openspec:validate`: exit 0; `pnpm run spec:verify`: exit 0 with exactly 26
    approved target hashes.
  - First `pnpm run format:check`: exit 1 on one formatter-only line wrap in
    `openspec-validation.ts`. `pnpm exec biome format --write
    scripts/constitution/openspec-validation.ts` changed that single file mechanically; the
    repeated format check and focused validator suite passed.
  - `pnpm run lint`, `pnpm run build`, and `pnpm run typecheck`: exit 0. Repository policy passed
    and all 8 production workspaces built and typechecked.
  - `SARTRE_DATABASE_URL=postgresql://postgres@127.0.0.1:54326/postgres
    SARTRE_POSTGRES_NEGATIVE_URL=postgresql://postgres@127.0.0.1:55432/postgres pnpm run test`:
    exit 0 against the loopback-only PostgreSQL 17.6 positive fixture and 17.10 rejection control;
    scripts passed `25 files | 568 tests`, and workspace suites passed `11 files | 87 tests`.
  - `pnpm run toolchain:check`, `pnpm run architecture:check`, `pnpm run
    docker-context:check`, `pnpm run sast`, `pnpm run dependency:check`, `pnpm run license:check`,
    and `pnpm run secret:check`: all exit 0. Toolchain is Node `v24.11.0`, pnpm `10.33.2`, and
    gitleaks `8.28.0`; dependency audit reports no known vulnerabilities.
  - First staged whitespace inspection reported one added blank EOF line in each of the four
    OpenSpec Markdown files. The wrapper lacked `set -e`, so its final Secret check returned 0 even
    though the whitespace inspection was nonPASS. The four blank lines were removed and the strict
    staged sequence was rerun with immediate failure enabled.
  - These results validate the planning checkpoint and existing MS0 constitution only. MS1 stays
    `SCENARIO_REGISTERED` / `STRUCTURAL_CHECK`, not product PASS.
- First implementation command after approval: write Task 2 RED tests for Human/Endpoint/System
  actor contracts and refresh/invitation/membership/ProjectAccess invariants. Do not start
  schema/auth/UI code first.
- Resume procedure: read root `AGENTS.md`, the authority chain, this plan, all four OpenSpec files,
  and this ledger; verify MS0 tag and branch base; inventory ops inputs through allowlisted checks;
  then continue Task 2 from the last recorded RED/GREEN command. Approval is already recorded and
  must not be requested again unless the plan materially expands.

## 2026-07-31 - Task 2 Identity/Workspace domain and contract checkpoint

- Branch/base: `codex/ms1-identity-workspace-tenant-boundary`, created from local approved-planning
  commit `a932c93`. The approval commit and this implementation branch are not pushed; Draft PR #1
  and remote `main` remain unchanged.
- Scope: pure `packages/domain` AuthIdentity, RefreshTokenFamily, Invitation, Membership, and
  ProjectAccess invariants; strict `packages/contracts` Human/Endpoint/System actors,
  provider/access commands, controlled roles, and non-disclosing authorization Problem Details.
  No app, HTTP handler, database/migration, SDK, Electron, Runtime, or external provider behavior
  changed.
- First RED command: `pnpm exec vitest run packages/domain/src/ms1-invariants.test.ts
  packages/contracts/src/ms1-contracts.test.ts`: exit 1. Domain failed to load the intentionally
  absent `errors.js` boundary and discovered zero domain tests; contracts discovered 7 tests and 6
  failed because the new schemas were absent. The one apparent contract pass only observed an
  undefined `.parse` throwing and is not behavioral evidence. This run is retained as structural
  RED/nonPASS, not REAL_TEST.
- GREEN implementation and focused evidence:
  - `pnpm exec vitest run packages/domain/src/ms1-invariants.test.ts
    packages/contracts/src/ms1-contracts.test.ts`: exit 0, `2 files | 21 tests`.
  - Assertions cover approved Feishu tenant/company email, normalized identity uniqueness, hash-only
    Refresh family rotation, idle/absolute expiry, stale version, reuse/race family revocation,
    invitation role caps/exact identity/expiry/single acceptance, last-owner protection, Human-only
    expectedVersion role mutation, explicit ProjectAccess, actor-chain spoof rejection, caller actor
    omission from commands, controlled errors, and equal non-disclosing 403/404 messages.
  - Evidence level for these isolated targets is `REAL_TEST / PASS`: executed domain functions and
    Zod schemas have positive assertions, real rejection inputs, and non-zero RED. It does not close
    any end-to-end MS1 BDD row.
- Static and repository gates:
  - First `pnpm run format:check`: exit 1 on six mechanical formatter differences. `pnpm exec biome
    format --write packages/domain/src packages/contracts/src` fixed those six files; repeated
    format and focused tests exited 0.
  - `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`, `pnpm run architecture:check`, and
    `pnpm run secret:check`: exit 0. Repository policy passed, all 8 production workspaces built and
    typechecked, and pure domain introduced no framework/I/O dependency.
  - `SARTRE_DATABASE_URL=postgresql://postgres@127.0.0.1:54326/postgres
    SARTRE_POSTGRES_NEGATIVE_URL=postgresql://postgres@127.0.0.1:55432/postgres pnpm run test`:
    exit 0. Scripts passed `25 files | 568 tests`; domain passed `2 files | 15 tests`; contracts
    passed `3 files | 66 tests`; remaining workspace suites passed `27 tests`, for `676/676` total.
- Remaining risks: refresh race handling is a pure sequential state invariant and still needs the
  Task 3 database lock/unique/transaction control; identity tenant/email facts still require Task 4
  trusted adapter verification; no RLS, HTTP authorization, token storage, or external-provider
  claim exists. Workspace role labels are intentionally separate from ProjectAccess and must remain
  so in migration and application services.
- Resume procedure: verify this checkpoint commit and clean status, read Task 3 in the approved
  plan, then write the PostgreSQL 17.6 migration/RLS integration test RED before creating
  `000003_ms1_identity_workspace.sql`. Do not start auth/UI code first.

## 2026-07-31 - Task 3 PostgreSQL 17.6 identity/tenant boundary checkpoint

- Scope: approved migration `000003_ms1_identity_workspace`, Hub readiness registry/catalog,
  global Identity/Session/Endpoint/operator/security/diagnostic tables, 12 tenant tables, composite
  keys/FKs, hash-only token/credential columns, two no-login/no-inherit/no-bypass roles, explicit
  grants, RLS + FORCE RLS, append-only triggers, and real PostgreSQL 17.6 controls. No HTTP/auth
  adapter, SDK, Electron, Runtime, mail, OAuth, or business command implementation was added.
- Initial real RED:
  - Tests and the migration registry expectation were written before the SQL artifact.
  - `SARTRE_DATABASE_URL=postgresql://postgres@127.0.0.1:54326/postgres pnpm exec vitest run
    scripts/postgres/migration-registry.test.ts scripts/postgres/ms1-rls.integration.test.ts
    --disableConsoleIntercept`: exit 1, `5/5 failed`. The registry returned only MS0 migrations;
    the catalog test lacked `000003`; the three behavioral fixtures reached PostgreSQL and failed
    with missing `users`. Disposable databases were removed. This is accepted behavioral RED.
- Migration GREEN progression, with nonPASS retained:
  - First SQL rerun: registry passed, all four integration cases failed and the migration rolled
    back because PostgreSQL auto-generated two CHECK names that collided with explicit cross-field
    constraint names. After unique names, one CRUD case still failed because one parameter was
    inferred as both text actor id and uuid initiator. Explicit casts fixed the contract; the first
    focused result was `2 files | 5/5 tests`, exit 0.
  - New readiness drift RED executed real mutated databases. Removing FORCE RLS, dropping a policy,
    changing owner, or dropping a tenant table all returned false compatible: exit 1, `4/4 failed`.
    Hub readiness now checks exact role attributes and exact tenant owner/RLS/FORCE/non-null/policy
    catalog; the repeated drift target passed `4/4`.
  - Replacing a policy with same-name `USING (true) WITH CHECK (true)` first resolved compatible and
    failed `1/1`. Exact normalized USING/WITH CHECK expressions were added; all policy drift passed.
  - Dropping `refresh_tokens` or renaming `credential_hash` to `credential` first resolved
    compatible and failed `2/2`. Readiness now requires all nine global MS1 tables under the
    migration owner and the exact three 64-character non-null hash columns; the repeat passed
    `2/2`.
  - A first parallel `scripts/postgres` run exposed cluster-global role catalog races as
    `tuple concurrently updated`; 7/101 tests failed, including one stale three-row assertion. Role
    creation now handles concurrent duplicate creation, role ALTER runs only for unsafe drift, a
    competing ALTER is accepted only after exact safe revalidation, and outgoing role memberships
    fail closed. The corrected full PostgreSQL suite passed `8 files | 101 tests`.
  - A policy catalog probe first failed before execution because `tsx -e` CJS does not support
    top-level await; it changed no state. The async-IIFE probe created/migrated/dropped one disposable
    database and observed the exact normalized expression
    `sartre_tenant_matches(workspace_id)` without reading Secret values.
  - The first table-owner append-only trigger probe returned zero updated rows because an expected
    application permission denial had aborted and rolled back the preceding fixture transaction.
    The denial and owner-trigger probes were split into independent transactions so both execute
    against committed audit data; the focused suite then passed.
- Final PostgreSQL evidence:
  - `SARTRE_DATABASE_URL=postgresql://postgres@127.0.0.1:54326/postgres pnpm exec vitest run
    scripts/postgres/ms1-rls.integration.test.ts --disableConsoleIntercept`: exit 0, `1 file | 12
    tests`. It proves exact catalog/roles/grants, every tenant table visible under correct context,
    same Project UUID isolated across two Workspaces, cross-tenant join suppression, SET LOCAL pool
    reset, missing-context write rejection `42501`, FORCE RLS against the table owner, composite FK
    rejection `23503`, tenant create/read plus mutable update/delete, application permission and
    owner-trigger append-only rejection, concurrent invitation exactly
    once, transaction rollback, and seven readiness drift classes.
  - `SARTRE_DATABASE_URL=postgresql://postgres@127.0.0.1:54326/postgres
    SARTRE_POSTGRES_NEGATIVE_URL=postgresql://postgres@127.0.0.1:55432/postgres pnpm exec vitest
    run scripts/postgres --disableConsoleIntercept`: exit 0, `8 files | 105 tests`, retaining the
    PostgreSQL 17.10 read-only version rejection and every MS0 migration/checksum/rollback/catalog
    control.
  - Exact approved checksums: `000001` `ff57c5fa909fc4506e4a503c6ea2d39c4c3bb67d5bda1d9dfa1a7cf6f008b839`;
    `000002` `fe75b3e93def7551a4e0b1d03419b72c0d7f39b251869d6fea32ecfbdf74d521`;
    `000003` `a949e6493dfc5a7b2612f9a505d1d03752ff9ddbd1c74d9c978bc3742ac5f5c7`.
- Repository validation:
  - First `pnpm run format:check`: exit 1 on two mechanical formatter differences. Targeted Biome
    write fixed only `schema-compatibility.ts` and `ms1-rls.integration.test.ts`; repeat passed.
    After the CRUD/append-only transaction split, a later format check found one blank line in the
    same integration test; targeted Biome removed it and the repeated full format check passed.
  - `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`, `pnpm run architecture:check`, and
    `pnpm run secret:check`: exit 0. All 8 production workspaces built/typechecked and the packaged
    Hub migration copy includes `000003`.
  - `pnpm run sast`, `pnpm run dependency:check`, `pnpm run license:check`, `pnpm run
    docker-context:check`, and `pnpm run openspec:validate`: exit 0; dependency audit reports no
    known vulnerabilities.
  - `SARTRE_DATABASE_URL=postgresql://postgres@127.0.0.1:54326/postgres
    SARTRE_POSTGRES_NEGATIVE_URL=postgresql://postgres@127.0.0.1:55432/postgres pnpm run test`:
    exit 0; scripts `26 files | 580 tests`, workspace packages/apps `108 tests`, total `688/688`.
- Evidence level: Task 3 database targets are `REAL_TEST / PASS` on exact PostgreSQL 17.6 with real
  SQLSTATE and catalog failure modes. This does not prove Task 4 authentication, centralized
  application authorization, external OAuth/mail, production connection identities, or any full
  MS1 BDD scenario.
- Remaining risks: global identity tables intentionally require application-layer authorization;
  Workspace selector and cross-Workspace operator queries need explicit Task 4/5/8 services rather
  than weakening tenant policies; Outbox cross-tenant worker discovery requires a later
  least-privilege design and must not use migration credentials. Roles are cluster-global and are
  safe-checked, but production login-role membership wiring remains an ops contract.
- Resume procedure: verify the Task 3 commit and clean status, read Task 4, then write Human auth
  port/session/token RED tests. Do not add provider mocks that claim Feishu staging PASS and do not
  place OAuth/mail/signing values in Git or the ledger.

## 2026-08-03 - Task 4 Human authentication kickoff

- Starting subject: clean `codex/ms1-identity-workspace-tenant-boundary` at Task 3 commit
  `876dc0bec5f2b678a775aec097d397160d259acd`, matching the remote branch.
- External-input inventory used presence-only checks and did not read or print Secret values. The
  ignored development Secret file is absent, so Feishu staging, verification-mail transport,
  production signing-key rotation, and TLS callback evidence remain `BLOCKED` until operations
  provides them. Local provider adapters may prove only integration behavior and must not be
  relabeled external-provider PASS.
- Planned Task 4 expansion before product editing: strict Human-auth Zod contracts and controlled
  errors; Hub identity ports, Argon2id and asymmetric access-token adapters, PostgreSQL auth
  repository, application service, fail-closed HTTP controller, and focused tests; an additive
  `000004_ms1_human_authentication` migration for OAuth attempts, company-email password hashes,
  verification challenges, and durable rate limits; migration/readiness registration and exact
  catalog checks. Existing `000003` remains immutable.
- RED order: contracts first, then crypto/provider/session service boundaries, then real PostgreSQL
  17.6 callback single-use, verification expiry, refresh race/replay revocation, logout, inventory,
  rate-limit, and security-event assertions. No request payload field may supply actor identity and
  no test fixture may claim Feishu staging PASS.

## 2026-08-03 - Task 4 local integration checkpoint and protocol stop

- Subject remains the uncommitted dirty tree on Task 3 commit
  `876dc0bec5f2b678a775aec097d397160d259acd`; nothing in this checkpoint is pushed. The local scope
  now contains strict Human-auth contracts, Argon2id password hashing, Ed25519 short-lived Human
  access tokens, hash-only refresh/session persistence, refresh-family rotation and replay
  revocation, logout current/all, session inventory, durable three-dimensional rate limits,
  security events, a fail-closed HTTP controller, and additive migration
  `000004_ms1_human_authentication`. The controller is intentionally not registered in the Hub
  production composition root because no production Feishu/mail/signing/TLS inputs or compatible
  provider nonce contract exists.
- Retained RED and nonPASS history:
  - Human-auth contracts first failed `4/4`; crypto and HTTP boundary targets failed to load their
    intentionally absent modules; the real auth-flow target likewise failed before the service
    existed.
  - The first real PostgreSQL persistence target failed `3/3`: migration registry absence, missing
    relation instead of the expected constraint rejection, and missing application grants.
  - The first readiness drift target failed `3/3` because a missing auth table, renamed password
    hash, and dropped refresh-token unique index were not detected.
  - The first migration GREEN attempt rolled back because two auto-generated CHECK constraint names
    collided with explicit names. Unique explicit names corrected the migration.
  - A repository architecture run reported two synthetic authorization-test values as Secret
    literals. Removing the unnecessary token-shaped positive fixture retained the unsupported
    authorization-scheme negative control and made the unchanged Secret/architecture policy pass.
  - A targeted Biome format command named this Markdown ledger, which repository configuration
    intentionally ignores, and exited nonzero with no files processed. It changed no state; the
    canonical full `pnpm run format:check` immediately passed all configured files.
  - The first full repository regression passed `592/593` script tests but failed because the MS0
    idempotency assertion hard-coded three approved migrations. It now derives the true/false result
    vectors from the approved artifact registry; the focused real database rerun passed `13/13`.
- Latest local integration evidence on exact PostgreSQL 17.6:
  - `SARTRE_DATABASE_URL=postgresql://postgres@127.0.0.1:54326/postgres pnpm exec vitest run
    packages/contracts/src/ms1-auth-contracts.test.ts apps/hub-api/src/identity/crypto-adapters.test.ts
    apps/hub-api/src/identity/human-auth.controller.test.ts
    scripts/postgres/ms1-auth-persistence.integration.test.ts
    scripts/postgres/ms1-auth-flow.integration.test.ts scripts/postgres/ms1-rls.integration.test.ts
    --disableConsoleIntercept`: exit 0, `6 files | 37 tests`.
  - These executed callback single-use/state/redirect/nonce/tenant rejection, expired OAuth and
    email challenges, wrong verification, Argon2id/no plaintext, indistinguishable login failure,
    concurrent refresh with one winner plus family/session replay revocation, access audience and
    expiry, derived Human actor, session inventory, current/all logout, dependency failure, durable
    rate limits, RLS, catalog drift, and redacted security-event controls.
  - `pnpm --filter @sartre/hub-api test`: exit 0, `5 files | 27 tests`.
  - With PostgreSQL 17.6 positive and PostgreSQL 17.10 rejection-control URLs, `pnpm run test`:
    exit 0; scripts `28 files | 593 tests`, production workspaces `138 tests`, total `731/731`.
- Repository gates: `pnpm run format:check`, `lint`, `build`, `typecheck`, `toolchain:check`,
  `spec:verify`, `architecture:check`, `secret:check`, `sast`, `dependency:check`, `license:check`,
  `docker-context:check`, and `openspec:validate` all exited 0. All 8 production workspaces built
  and typechecked; the dependency audit reports no known vulnerabilities. Toolchain remains Node
  `v24.11.0`, pnpm `10.33.2`, and gitleaks `8.28.0`. Migration `000004` SHA-256 is
  `d16a1baf23e62e0c8e91ab7f986d562a69b8f36d542954f2b50f48845d360f91`.
- Evidence classification: the local contracts, cryptography, service, persistence, HTTP rejection,
  and PostgreSQL targets above are `REAL_TEST / PASS` for their executed subjects. They are not a
  production Human-auth route PASS and not a Feishu external-provider PASS. The ignored development
  Secret input remains absent, so mail transport, production key rotation, TLS callback, and
  provider staging remain `BLOCKED` rather than skipped or degraded.
- Required stop: `spec/HubApiSpec.md` and this plan require Feishu `state + nonce + PKCE + tenant`
  validation, while the current official Feishu authorization-code, user-access-token v2, and user
  information contracts document `state`, S256 PKCE/code verifier, and `tenant_key`, but expose no
  provider-returned nonce or nonce-bearing ID token. Sources inspected:
  `https://open.feishu.cn/document/common-capabilities/sso/api/obtain-oauth-code`,
  `https://open.feishu.cn/document/authentication-management/access-token/get-user-access-token`,
  and
  `https://open.feishu.cn/document/server-docs/authentication-management/login-state-management/get`.
  The current local fake provider returns a nonce only to execute the specified rejection path; it
  cannot justify a production Feishu adapter. Per the plan stop conditions, Task 5 must not begin
  until this conflict is resolved.
- Deeper protocol verification on 2026-08-03 inspected the current official
  `larksuite/node-sdk` main commit `edd979849dd42a3ee90fb5f0b398adaeda8dae9a`. Its production
  `client/access-token.ts` authorization-code request accepts `code`, `redirectUri`, `codeVerifier`,
  and `scope`; its response exposes access/refresh token metadata but no `idToken` or nonce. The
  generated resource named `oidcAccessToken` is explicitly marked historical/not recommended and
  likewise returns no ID token or nonce. The current browser guide documents callback `code +
  state` only. An initial `gh api` tree lookup left `?recursive=1` unquoted and zsh rejected the glob
  before any request; the corrected quoted lookup and exact file inspection succeeded. These
  primary-source checks found no supported alternate Feishu OIDC route that can satisfy the
  provider-returned nonce assumption.
- Resume decision: either (a) preserve the spec and supply a company OAuth/OIDC gateway that returns
  a signed/verifiable nonce, or (b) explicitly amend the authoritative spec and Task 4 plan to use
  Feishu's documented `state + PKCE + exact redirect + single-use code + tenant_key` contract
  without claiming provider nonce validation. After that decision, add the production adapter and
  composition wiring, execute provider staging/mail/TLS/rotation gates, rerun the full checkpoint,
  then commit `feat(ms1): add human authentication sessions` and push the task branch if the
  autonomous-push preconditions remain satisfied.

## 2026-08-03 - Task 4 Feishu protocol amendment authorized

- Status changed from protocol `BLOCKED` to `IN_PROGRESS` by the user's explicit instruction
  `允许按飞书官方协议修改 spec` on 2026-08-03. This authorizes only the Feishu Human-auth protocol
  correction; it does not weaken tenant, token, Secret, evidence, or external staging gates and does
  not expand MS1 into later product domains.
- The imported `spec/HubApiSpec.md` is an immutable provenance target under
  `reference/spec-import-manifest.json`; editing it or replacing its recorded hash would falsely
  claim equality with the frozen source. The approved spec change will therefore be an additive,
  task-specific `spec/MS1IdentityAccessSpec.md` that explicitly supersedes only the incompatible
  Feishu sentence for MS1 and preserves the imported artifact unchanged. The active plan/OpenSpec
  must point to the current protocol and `pnpm run spec:verify` must continue proving all 26 frozen
  imports byte-identical.
- Planned amendment/implementation scope before editing: add a constitution regression for the
  current Feishu contract; add the task-specific spec; update this MS1 plan and OpenSpec
  design/scenario wording; remove provider-returned nonce from the Feishu port/service/fake tests
  and OAuth-attempt persistence while retaining single-use state, S256 PKCE, exact redirect, code
  single-use/expiry handling, and approved `tenant_key`; add a fail-closed real HTTP adapter plus
  local HTTP dependency tests; update migration/readiness only through the existing uncommitted
  `000004` artifact. Existing committed migrations remain immutable.
- RED order: constitution protocol regression first; then service/flow tests that no longer allow a
  provider nonce; then HTTP adapter request/response/error/redaction tests. Local HTTP/PostgreSQL
  evidence remains integration. Feishu staging, real mail, production key rotation, and TLS callback
  remain required external gates and cannot be relabeled PASS without operations inputs.

## 2026-08-03 - Task 4 official-protocol local integration handoff

- Checkpoint scope: the approved additive `spec/MS1IdentityAccessSpec.md`, aligned active
  plan/OpenSpec scenarios, a constitution regression that preserves the frozen imported
  `HubApiSpec`, Feishu OAuth port/service/persistence correction, and a production HTTP adapter with
  fixed official Feishu endpoints. The adapter accepts only Authorization Code + PKCE S256 inputs,
  enforces HTTPS redirect syntax and bounded provider responses, classifies provider rejection
  separately from dependency failure, obtains `open_id + tenant_key + name`, and never exposes raw
  provider errors or configurable provider origins. No production composition root, Secret value,
  external mail adapter, or staging credential is included.
- Protocol RED/nonPASS history retained:
  - `pnpm exec vitest run scripts/constitution/ms1-feishu-protocol.test.ts`: exit 1, `1/4`
    passed. The imported-spec hash assertion passed; the intentionally absent task-specific spec,
    stale plan/OpenSpec nonce wording, and production port/service nonce contract failed.
  - After the documentation amendment but before production refactoring, the constitution plus
    real PostgreSQL persistence/flow target exited 1 with `4/18` failures: production still hashed
    an absent provider nonce, the schema exposed obsolete `nonce_hash`, and readiness did not yet
    reject that extra column. Removing the unsupported field from the uncommitted `000004`
    migration and enforcing the exact OAuth-attempt catalog made the same three-file target pass
    `18/18`.
  - The HTTP-adapter test first exited 1 before discovery because the production module was absent.
    Its first implementation reached all six tests but failed `6/6` because the scope validator
    rejected Feishu's dot-delimited official scope syntax. The corrected bounded scope grammar made
    the real local HTTP-server target pass `6/6`.
  - The first architecture check after the adapter tests exited nonzero with
    `static_evaluation_budget_exceeded` on a test-only oversized literal generator. Constructing the
    same 70,000-byte negative response through a bounded runtime Buffer preserved the failure mode;
    the repeated adapter, architecture, and Secret checks passed.
  - Pre-push protocol review found that the initial contract and uncommitted migration still allowed
    a `sartre://` callback even though the approved amendment requires an exact HTTPS callback. New
    contract plus real PostgreSQL controls exited 1 with `2 failed | 10 passed`: both layers accepted
    the forbidden scheme. Restricting both layers to HTTPS made them pass `12/12`. A follow-on
    readiness drift control then failed `1/1` because dropping the named HTTPS constraint still
    resolved compatible; exact constraint-catalog validation closed that gap and the expanded target
    passed `13/13`.
  - A concurrent first-use rate-limit RED expected ten allowed OAuth starts plus one stable
    `rate_limited` rejection, but observed only two successes because racing initial counter inserts
    produced unique-key dependency errors. Insert-on-conflict acquisition made the isolated rerun
    pass once, but the later combined target retained a nonPASS `9 successes | 2 rate_limited` result:
    separate per-dimension transactions could acquire network, identity, and combined counters in
    different orders. One transaction now acquires the deduplicated dimension hashes in sorted order
    and updates all counters atomically. Three fresh real PostgreSQL repeats each passed with exactly
    ten successes, one controlled rejection, and no dependency error.
- Final local REAL_TEST evidence:
  - With the loopback-only PostgreSQL 17.6 fixture,
    the Human-auth contracts, `scripts/constitution/ms1-feishu-protocol.test.ts`, the real local HTTP
    adapter target, and the real persistence/flow targets passed `5 files | 31/31 tests`. Assertions
    include frozen-import integrity, no provider nonce contract, fixed
    authorization/token/user-info endpoints, state, S256, HTTPS-only exact redirect plus readiness
    drift, provider-code replay, approved tenant, concurrent durable rate limiting,
    timeout/transport/provider error classification, bounded malformed responses, and error
    redaction.
  - A fresh root run with PostgreSQL 17.6 positive plus the temporary exact-digest PostgreSQL 17.10
    read-only rejection control exited 0: scripts passed `29 files | 601/601`; all eight production
    workspaces passed `144/144`; total `745/745`. The 17.10 image digest was
    `sha256:a426e44bac0b759c95894d68e1a0ac03ecc20b619f498a91aae373bf06d8508d`;
    the exact-name temporary container was removed after the run.
  - `pnpm run format:check`, `lint`, `typecheck`, `build`, `toolchain:check`, `spec:verify`,
    `architecture:check`, `secret:check`, `sast`, `dependency:check`, `license:check`,
    `docker-context:check`, `openspec:validate`, and `git diff --check` all exited 0. All 26 frozen
    imported specs remain byte-identical; the dependency audit reports no known vulnerabilities.
    Toolchain is Node `v24.11.0`, pnpm `10.33.2`, and gitleaks `8.28.0`. The revised uncommitted
    migration `000004` SHA-256 is
    `9476bd21f1c2a54d0294973cf7b62c5b8457eafe77a385a4552172bcf2c2126a`.
- Evidence classification: the executed contract, cryptography, HTTP controller, local HTTP adapter,
  PostgreSQL persistence/flow, replay/revocation, and repository gates are `REAL_TEST / PASS` only
  for their local subjects. Presence-only checks confirmed `.local-secrets/development.env` absent
  from both the primary and implementation worktrees. Feishu staging, verification-mail delivery,
  production signing-key source/rotation, internal Hub TLS callback, and production composition
  remain `BLOCKED`; Task 4 and the Human-auth evidence-matrix row are not complete and no product
  route or external-provider PASS is claimed.
- Handoff boundary: this is an independently reviewable, rollback-safe implementation checkpoint on
  `codex/ms1-identity-workspace-tenant-boundary`, suitable for an honest intermediate commit/push.
  It must not use the Task 4 completion commit message from the approved plan. Per the stop
  conditions, Task 5 must not begin while the required real Task 4 dependencies remain unavailable.
- Resume procedure: provide the ignored operations inputs through the Secret boundary; implement
  the approved mail and signing-key source/rotation adapters plus fail-closed production composition;
  run the exact-redirect Feishu staging flow, delivery/inbox test, TLS callback, rotation/revocation,
  redaction, full repository, and Secret gates; update this ledger; only then close Task 4 with
  `feat(ms1): add human authentication sessions` and proceed to Task 5.

## 2026-08-03 - Product correction: Markdown PRD input and deferred Feishu connector

- Authorization and product intent: the user clarified that Feishu was originally considered only
  as a document source and instructed that it can be deferred; the current PRD input is a Markdown
  file. This supersedes the previous assumption that Feishu was an MS1 Human authentication
  provider. The correction does not authorize Requirement implementation in MS1: Markdown ingestion
  belongs to the later Requirement milestone, and a future Feishu document connector requires its
  own reviewed authorization, snapshot, provenance, refresh, and failure contract.
- Authority repair: the frozen imported `HubApiSpec` remains byte-identical. The task-specific
  `MS1IdentityAccessSpec` now supersedes its Feishu login sentence for MS1, requires verified
  company-email authentication only, records the later Markdown PRD boundary, and removes Feishu
  provider staging from the MS1 evidence matrix. The active plan and all four OpenSpec files were
  aligned; historical evidence above remains append-only and is not rewritten into a false claim.
- RED/nonPASS history retained:
  - The new product-boundary constitution target first exited 1 with `3/4` failures: the task-specific
    spec still required Feishu login, the active plan/OpenSpec still registered provider staging and
    OAuth rejection, and the runtime/schema cleanup migration was absent. The frozen-import hash
    assertion was the only passing case.
  - Removing the OAuth scenario made the existing OpenSpec CLI exit 1 with
    `missing_required_content`; the validator and its fixture now require `email-rejection` instead.
  - The first affected PostgreSQL target passed auth persistence/flow but failed the RLS catalog
    assertion because it hard-coded four migration versions. After registering `000005`, the next
    run failed because the same catalog fixture still required the removed OAuth-attempt table.
    Both expectations now describe the approved five-migration, company-email-only schema.
  - The first full format check exited 1 on two mechanical differences introduced by the new
    contract and cleanup-guard test. Targeted Biome formatting changed only those two test files;
    the repeated repository format check passed.
- Implementation boundary:
  - Removed Feishu authorization/callback contracts and controllers, OAuth port/error types,
    provider service/repository methods, fixed-endpoint HTTP adapter and tests, Feishu auth policy,
    provider rate-limit scopes, and the Feishu AuthIdentity domain/contract variant. Human auth now
    contains verified company email, Argon2id, session/refresh rotation and replay revocation,
    logout, inventory, rate limits, security events, and controlled HTTP errors only.
  - Because `000004_ms1_human_authentication` was already committed and pushed, it was not rewritten.
    Additive `000005_ms1_defer_feishu_login` fails closed when any legacy Feishu AuthIdentity exists;
    otherwise it removes only the transient OAuth-attempt table, removes provider tenant state,
    makes verified email non-null, and narrows identity/rate-limit constraints to the approved email
    scopes. A real PostgreSQL negative control proves the guard rolls back, preserves the identity
    and OAuth table, and does not write the `000005` schema row.
  - Readiness now requires the exact company-email AuthIdentity columns/constraints, exact email-only
    rate-limit constraint, absence of the OAuth table and provider-tenant column, existing hash-only
    credential columns, and the unique refresh-token lookup. Restoring any removed surface fails
    `schema_incompatible`.
- Fresh evidence:
  - Product-boundary constitution, domain/contracts, controller, and related unit targets passed
    `5 files | 32/32 tests`; schema/OpenSpec compatibility and affected unit targets passed
    `8 files | 60/60 tests` before the real database matrix.
  - On exact PostgreSQL 17.6, migration registry, full MS1 RLS, auth persistence, and auth flow passed
    `4 files | 30/30 tests`, including the cleanup rollback guard and restored-surface readiness
    controls. Migration `000005` SHA-256 is
    `d3243f78c2e45ec71f91635c22a897fa6206b4630668dd435f3bb95d98dc6e57`.
  - A fresh root run with PostgreSQL 17.6 positive plus the temporary exact-digest PostgreSQL 17.10
    read-only rejection control exited 0: scripts passed `29 files | 601/601`; all eight production
    workspaces passed `136/136`; total `737/737`. The temporary 17.10 container was removed by the
    exact-name cleanup path.
  - `format:check`, `lint`, `typecheck`, `build`, `architecture:check`, `secret:check`, `spec:verify`,
    `openspec:validate`, and `git diff --check` exited 0. All 26 imported specification hashes remain
    unchanged.
- Evidence/status: Feishu is no longer an MS1 blocker or evidence row. Task 4 is still `IN_PROGRESS`,
  not PASS: a real verification-mail transport/inbox, production signing-key source/rotation,
  internal Hub TLS boundary, least-privilege application database login/composition, and a registered
  production Human-auth route remain absent. Per the stop conditions, Task 5 must not start until
  those remaining Task 4 dependencies and evidence are resolved or explicitly respecified.
- Resume procedure: define the Secret-safe mail/signing/TLS/application-database composition
  contract without inventing operations values; execute real delivery/inbox, key rotation, TLS,
  controller/API, database-role, redaction, and full repository gates; then close Task 4 and proceed
  to Workspace commands. Do not implement Markdown Requirement ingestion or a Feishu connector in
  MS1.

## 2026-08-03 - Main-flow correction: defer email delivery and enter Workspace

- Authorization and scope change: the user explicitly prioritized the product main flow and allowed
  enterprise-email integration to be deferred. The approved task-specific specification, active
  plan, and OpenSpec now define an operator-provisioned local account. Its normalized email-shaped
  login identifier preserves a future email-integration path, but MS1 exposes no self-service
  registration, verification-code, recovery-mail, invitation-delivery, or notification-mail route
  and makes no mail-delivery claim. Feishu and Markdown Requirement boundaries remain unchanged.
- RED/nonPASS history retained:
  - The revised product-boundary target first exited 1 with `4/5` failures. Only the frozen
    `HubApiSpec` hash passed; the additive specification/plan, mail-free runtime/migration, and
    non-HTTP provisioning command were intentionally absent.
  - After contract edits, the first repository typecheck exited 2 because the Hub package still
    resolved the preceding built contracts artifact. Rebuilding `@sartre/contracts` exposed the new
    export and the repeated all-workspace typecheck passed; no source workaround was added.
  - The first real provisioning subprocess exited 1 with the controlled
    `provisioning_password_input_failed` code because Node 24 `fs/promises.readFile` did not accept
    numeric stdin fd `0` in this execution path. The CLI now consumes bounded UTF-8 chunks from
    `process.stdin`; the repeated subprocess test creates one account, rejects a duplicate, and
    proves the supplied password is absent from argv/stdout/stderr.
  - The first final Secret gate exited 1 on a synthetic test-only authorization template containing
    a literal bearer scheme plus token expression. The test now constructs the controlled scheme in
    the same scanner-safe form as the production controller; the repeated Secret gate passed.
  - Dependency audit encountered two npm-registry `ECONNRESET` responses. Its own bounded retry
    subsequently completed with no known vulnerabilities; the earlier network attempts are not
    counted as PASS.
- Authentication implementation:
  - Removed public registration/verification contracts, Controller routes, mail port, challenge
    service/repository methods, and registration/verification rate-limit scopes. Additive migration
    `000006_ms1_defer_email_delivery` fails closed if any verification challenge exists, then removes
    the unused table and narrows rate limits to login/refresh. Its SHA-256 is
    `4fb6143ed9e267afc6cd0c3126c6a12eff299f840bf400e5b34e523d2268eb58`.
  - `auth:provision-human` is a non-HTTP operator command. Non-secret account metadata is explicit;
    the password is accepted only through bounded stdin and persisted only as Argon2id. The command
    reports stable result/error codes without echoing inputs. A disabled-by-default Hub runtime loads
    Ed25519 key material only from explicit file paths and registers Human auth routes only in
    `operator_provisioned` mode.
  - A real Nest/HTTP/PostgreSQL flow proves the registration route is 404, operator provisioning and
    password login succeed, Access/Refresh tokens are narrowly returned, and authenticated Session
    inventory works. Existing expiry, rotation, replay-family revocation, logout, rate-limit,
    redaction, and actor derivation controls remain active.
- Workspace main-flow implementation:
  - Added a pure `createWorkspace` invariant, strict create/summary contracts, Hub Controller/Service,
    and a repository that authenticates the Human, sets transaction-local Workspace/actor context,
    checks active Membership on reads, and writes Workspace, owner Membership, DomainEvent, Outbox,
    Audit, and idempotency receipt in one transaction.
  - Additive migration `000007_ms1_workspace_commands` adds the RLS + FORCE RLS protected receipt
    table with exact ownership/grants. Its SHA-256 is
    `15c510abdbb660615647cc95c4021644a3f5ede5009e0c8b4a3d33d3cc8da780`.
    A transaction advisory lock serializes concurrent copies of the same command; only the creating
    Human can resolve its receipt.
  - The real two-user HTTP flow concurrently repeats Workspace A creation and produces only one
    Workspace/Event/receipt, rejects a changed request hash with 409, creates Workspace B for the
    second Human, returns the selected Workspace to its member, and returns the same non-disclosing
    404 for a cross-tenant lookup. The bound database contains exactly two Workspaces, two Events,
    and two receipts.
- Fresh evidence:
  - Product boundary, OpenSpec, domain/contracts, runtime config, health composition, and HTTP
    controller targets passed. The affected exact PostgreSQL 17.6 migration/RLS/auth/main-flow matrix
    passed `5 files | 32/32 tests` before the root run.
  - The fresh root run used the healthy exact PostgreSQL 17.6 positive service plus the temporary
    exact-digest PostgreSQL 17.10 rejection control. Scripts passed `30 files | 604/604`; all eight
    production workspaces passed `142/142`; total `746/746`. The exact-name 17.10 container was
    removed by the trap cleanup path.
  - `format:check`, `lint`, `typecheck`, `build`, `architecture:check`, `secret:check`, `spec:verify`,
    `openspec:validate`, `sast`, `dependency:check`, `license:check`, `docker-context:check`, and
    `git diff --check` exited 0. All 26 imported-spec hashes remain unchanged.
- Evidence/status: the local operator-provisioned login and Workspace create/select slice is
  `REAL_TEST / PASS` for its exact subjects. Task 4 is `CHANGED / IN_PROGRESS`, not production PASS:
  persistent key rotation, real internal TLS, and a least-privilege database login/composition remain
  required. Task 5 is `IN_PROGRESS`: invitation, member mutation, Project, and independent
  ProjectAccess application/API flows are not yet implemented. No MS1 closeout or MS2 capability is
  claimed.
- Resume procedure: continue Task 5 from invitation/member/ProjectAccess RED using the authenticated
  Workspace repository boundary. Preserve exact invited local-account identity, idempotency,
  expectedVersion, last-owner, role-cap, explicit ProjectAccess, transaction/event/audit, IDOR, and
  RLS controls. Separately satisfy the remaining Task 4 production composition before MS1 closeout.

## 2026-08-03 - Task 5 Workspace membership and explicit ProjectAccess checkpoint

- Scope and product boundary:
  - Completed the approved mail-free Task 5 application slice: invitation create/revoke/accept,
    active-member list/role/remove, Project create/list, and explicit viewer/editor ProjectAccess
    grant/change. Invitation acceptance still requires an operator-provisioned local account and the
    exact normalized login identifier; no public registration, delivery, notification, or mail
    dependency was introduced.
  - The older plan's invitation `resend` wording is superseded for this checkpoint by
    `MS1IdentityAccessSpec`: there is no delivery channel to resend through. No endpoint reports a
    synthetic send success. A future delivery specification must add transport and inbox evidence.
  - Requirement/Markdown ingestion, Endpoint pairing, Electron UI, and later milestones remain
    outside this change.
- RED/nonPASS history retained:
  - New contracts first failed `2/10` focused cases because invitation-create, member-remove,
    Project-create, and ProjectAccess schemas did not exist. New domain tests then failed to load the
    absent Project invariant module. Both targets passed after the strict contracts and pure domain
    functions were added.
  - The first root `pnpm test` run failed only the PostgreSQL 17.10 read-only rejection control
    because nothing was listening on the default loopback port `55432`. The exact approved 17.10
    digest was started under the bounded name `sartre-postgres-17-10-negative`; the repeated full
    test passed, and the temporary container was stopped and removed.
  - The first post-build `pnpm secret:artifacts` invocation exited 1 with
    `artifact_path_required`. The corrected command named all eight explicit build roots and exited
    0. The failed invocation is not counted as evidence PASS.
- Contracts/domain/application implementation:
  - Strict Zod commands reject body-reported actor identity, route/body target mismatches, mail
    delivery fields, and unversioned mutation. `expectedVersion: null` means a first ProjectAccess
    grant; a number means exact compare-and-swap for an existing grant. Problem Details now includes
    the stable non-disclosing `project_access_denied` code.
  - The centralized `WorkspaceAuthorizationService` fails closed for missing/inactive Membership,
    restricts governance to owner/admin, preserves exact invitation-recipient identity, and never
    derives Project access from Workspace role. Authorization runs before receipt resolution, so a
    removed or demoted actor cannot bypass current authority by replaying an old idempotency key.
  - Every mutation runs under transaction-local Workspace/actor context and binds authorization,
    request-hash idempotency, expectedVersion/domain invariants, state, monotonically serialized
    DomainEvent cursor, OutboxEvent, AuditEvent, and receipt in one transaction. Project creation
    writes an explicit creator `editor` row; an owner/admin without such a row sees no Project
    metadata.
  - Additive migration `000008_ms1_workspace_access_commands` records immutable inviter provenance
    and expands the receipt command vocabulary. It fails closed before schema change if any legacy
    invitation lacks an inviter backfill. Its SHA-256 is
    `c67cd81a299198068e95036c57d8c44c90a1fb38a237d8d45a4d2efbfca064b5`.
- Real behavior evidence:
  - Exact PostgreSQL 17.6 focused migration/RLS/auth/HTTP matrix passed `4 files | 28/28 tests`.
    The migration negative control proves a pre-`000008` invitation makes the upgrade fail with
    SQLSTATE `55000`, preserves the row, leaves `inviter_user_id` absent, and does not register the
    migration.
  - The real Nest/HTTP/PostgreSQL flow provisions three local accounts, logs them in, and creates two
    Workspaces. It proves concurrent invitation acceptance and ProjectAccess grant retries create
    one result, changed request hashes return `idempotency_conflict`, stale access versions return
    `version_conflict`, the wrong invitation recipient returns non-disclosing 403, a member cannot
    govern, and the last owner cannot be demoted.
  - The same flow proves invitation `accepted`, `revoked`, and database-expired outcomes; Workspace
    admin has an empty Project list before explicit access; cross-Workspace Project lookup is 404;
    explicit viewer access reveals exactly one Project; removing the member revokes effective access.
    The final database has exactly 2 Workspaces, 3 Membership rows, 3 Invitations, 1 Project, 2
    explicit ProjectAccess rows, and 12 matching DomainEvents, OutboxEvents, AuditEvents, and command
    receipts.
  - Full root tests with exact PostgreSQL 17.6 positive and exact-digest PostgreSQL 17.10 negative
    controls exited 0: scripts `30 files | 605/605`; all eight production workspaces `150/150`;
    aggregate `755/755`.
- Final gates:
  - `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`,
    `pnpm architecture:check`, `pnpm secret:check`, `pnpm spec:verify`,
    `pnpm openspec:validate`, `pnpm sast`, `pnpm dependency:check`,
    `pnpm license:check`, `pnpm docker-context:check`, `pnpm contract:compatibility`,
    `pnpm toolchain:check`, and `git diff --check` exited 0. The dependency audit reports no known
    vulnerabilities, and all 26 imported-spec hashes remain unchanged.
  - `pnpm run secret:artifacts -- apps/electron-app/dist apps/hub-api/dist apps/hub-worker/dist
    apps/local-runtime/dist packages/contracts/dist packages/domain/dist packages/runtime-core/dist
    packages/sdk/dist` exited 0 across all eight explicit build roots.
- Evidence/status and risk:
  - Task 5 is `DONE / REAL_TEST / PASS` for the approved operator-provisioned, mail-free Hub API and
    PostgreSQL scope. This is an implementation checkpoint, not MS1 closeout and not evidence for
    production TLS, signing-key rotation, least-privilege database composition, Endpoint, Electron,
    or cross-Workspace ops diagnostics.
  - Task 4 remains `CHANGED / IN_PROGRESS` for those production-composition gaps. Task 6 is still
    `PENDING`. No MS1 verified tag or MS2 capability is claimed.
- Resume procedure: commit and fast-forward push this Task 5 checkpoint, then begin Task 6 from
  Endpoint pairing RED. Before final MS1 closeout, separately close the retained Task 4 production
  key/TLS/database-role evidence and complete Tasks 6-9 without weakening this tenant transaction,
  explicit ProjectAccess, or Secret boundary.

## 2026-08-03 - Task 6 Endpoint pairing and Runtime identity checkpoint

- Scope and product boundary:
  - Implemented the Hub portion of authenticated one-time Endpoint pairing: a Human Workspace member
    creates a five-minute intent from a Runtime-generated 256-bit challenge; Runtime proves it once
    and supplies its generated 256-bit Endpoint Credential; Hub stores only SHA-256 hashes and creates
    exactly one global EndpointIdentity plus one tenant EndpointWorkspaceGrant.
  - Added separate `sartre-endpoint` Ed25519 access tokens with Workspace, owner, and Endpoint version
    claims. Endpoint credential exchange and every Endpoint-token request recheck the active identity,
    active Workspace grant, active owner Membership, audience, Workspace, owner, and version. Rotation
    invalidates the old credential and outstanding Endpoint tokens; revoke invalidates both immediately.
  - Added the Runtime secure-store port, non-Secret binding state, single-Human data-root guard,
    rotation compensation, active-runtime-work reset guard, and Local Runtime coordinator. The real
    subprocess uses a process-local test adapter. Production macOS `safeStorage` and authenticated
    Electron Main IPC wiring remain Task 7 work; no ordinary file store is presented as secure storage.
  - No AgentRun, Lease, email, Feishu, Requirement, Renderer, or legacy compatibility behavior was
    introduced.
- RED/nonPASS history retained:
  - The first exact-PostgreSQL matrix attempt failed before test setup because the temporary test-role
    `DO $$` command was incorrectly shell-escaped; PostgreSQL reported a syntax error, the role was not
    created, and all 14 database cases failed at connection. Replacing it with bounded `createuser`
    plus stdin `ALTER ROLE` allowed the unchanged tests to execute.
  - The first executed Endpoint concurrency flow returned `[401, 503]` instead of `[201, 401]`.
    Persistence committed correctly, but the success response spread an internal `status` field into a
    strict one-time response schema. Constructing the response field-by-field fixed the post-commit
    serialization failure; the repeated flow passed.
  - The first final-gate sequence stopped at `format:check` because a newly added test parameter array
    was not Biome-formatted. No later command in that sequence was counted. Formatting the file and
    repeating the complete gate sequence exited 0.
  - A later attempt to run Biome directly on this ledger exited 1 with `No files were processed`
    because `reports/` is intentionally ignored. It changed no file and is not formatting evidence;
    repository `format:check` plus `git diff --check` remain the applicable gates.
- Contracts/domain/persistence implementation:
  - Strict Endpoint pairing, exchange, token, rotate, revoke, result, and status schemas reject body
    actor spoofing, route/body target mismatch, malformed UUIDs, extra fields, and any value not exactly
    32-byte base64url shape. Stable `endpoint_credential_invalid` and `identity_recovered` codes are
    registered; only the former is claimed by this checkpoint.
  - Pure Endpoint identity and pairing domain transitions enforce hash shape, state, expiry, single
    consumption, credential replacement, revocation, and compare-and-swap versions.
  - Additive migration `000009_ms1_endpoint_pairing` creates tenant-owned
    `endpoint_pairing_intents` with `workspace_id NOT NULL`, tenant-aware key/FK, RLS plus FORCE RLS,
    pending-owner uniqueness, hash-only challenge, state/expiry/version constraints, least table grants,
    and the exact Endpoint receipt vocabulary. Its SHA-256 is
    `3629748132a9d236d21069f2622678a29c858470beee4555f7a418ff9b0e755b`.
  - Readiness now verifies the exact pairing table catalog and exact `challenge_hash character(64) NOT
    NULL` shape. A real negative mutation that renames that column makes readiness fail closed.
  - Intent creation, pairing completion, rotation, and revoke bind current authorization, tenant scope,
    hash-only request identity, expectedVersion where applicable, state, DomainEvent, OutboxEvent, and
    AuditEvent. Idempotent Human commands also bind a receipt; one-time completion intentionally has no
    replayable receipt because its Secret response cannot be persisted.
- Real behavior evidence:
  - Exact PostgreSQL 17.6 focused RLS/Endpoint matrix passed `2 files | 15/15 tests` against the current
    tree. It includes schema drift controls and a real Nest/HTTP/PostgreSQL/Local Runtime subprocess.
  - The flow creates two real local Humans and two Workspaces; denies the wrong caller, Workspace,
    challenge, expired intent, consumed intent, wrong credential, wrong Human owner, Human token on an
    Endpoint route, and Endpoint token on a Human route. Concurrent completion yields exactly one 201
    and one non-disclosing 401.
  - The Runtime subprocess receives the credential once over its private stdin, stores only a reference
    in binding state, exchanges and probes the Endpoint allowlist internally, rejects a second Human,
    blocks reset with active runtime work, and emits only status. Captured stdout/stderr contains no
    challenge or credential.
  - Rotation rejects the old credential and pre-rotation Endpoint token; revoke rejects the current
    credential and current token. Final database checks bind the exact challenge/replacement credential
    hashes, 6 matching DomainEvents/OutboxEvents/AuditEvents, 5 receipts, and absence of challenge or
    credential values from event, audit, and receipt serialization.
  - Full root tests on the final tree with exact PostgreSQL 17.6 positive and the approved exact-digest
    PostgreSQL 17.10 negative control exited 0: scripts `31 files | 607/607`; all eight production
    workspaces `160/160`; aggregate `767/767`. The temporary 17.10 container was stopped and removed.
- Final gates:
  - `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`,
    `pnpm architecture:check`, `pnpm secret:check`, `pnpm spec:verify`,
    `pnpm openspec:validate`, `pnpm sast`, `pnpm dependency:check`,
    `pnpm license:check`, `pnpm docker-context:check`, `pnpm contract:compatibility`,
    `pnpm toolchain:check`, and `git diff --check` exited 0. Dependency audit reported no known
    vulnerabilities; all 26 approved imported-spec hashes remain unchanged.
  - `pnpm run secret:artifacts -- apps/electron-app/dist apps/hub-api/dist apps/hub-worker/dist
    apps/local-runtime/dist packages/contracts/dist packages/domain/dist packages/runtime-core/dist
    packages/sdk/dist` exited 0 for all eight explicit build roots.
  - Tool versions: Node `v24.11.0`, pnpm `10.33.2`, gitleaks `8.28.0`; positive PostgreSQL
    `server_version_num=170006`; negative image digest
    `sha256:a426e44bac0b759c95894d68e1a0ac03ecc20b619f498a91aae373bf06d8508d`.
- Evidence/status and risk:
  - The Hub/PostgreSQL/Runtime-core Task 6 slice is `DONE / REAL_TEST / PASS`. Overall Task 6 remains
    `CHANGED / IN_PROGRESS` until Task 7 supplies production OS secure-storage and authenticated Main
    IPC wiring, then repeats renderer non-reachability and packaged Electron evidence. This checkpoint
    does not claim a production file-backed secure store or a completed MS1.
  - Task 4 remains `CHANGED / IN_PROGRESS` for production signing-key rotation, TLS, and least-privilege
    database composition. Tasks 7-9 remain pending. No MS1 verified tag or MS2 capability is claimed.
- Resume procedure: commit and fast-forward push this checkpoint, then start Task 7 from SDK methods and
  Electron Main secure-storage/authenticated pairing orchestration. Preserve the strict token audiences,
  Endpoint version check, hash-only persistence, one-Human Runtime root, Secret-free renderer surface,
  and do not mark Task 6 complete until packaged Electron evidence exercises the production adapter.
