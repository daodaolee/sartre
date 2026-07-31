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
