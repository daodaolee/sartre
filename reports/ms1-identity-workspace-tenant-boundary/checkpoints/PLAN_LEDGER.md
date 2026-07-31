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
