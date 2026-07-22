# MS0 Repository Constitution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The user has authorized subagents; use one writing implementer at a time, then separate specification and code-quality reviewers. Reviewers do not modify files.

**Goal:** Establish the new Sartre production repository, enforce its module and evidence boundaries, run PostgreSQL 17.6 and four-process health paths, and close MS0 with commit-bound REAL_TEST evidence.

**Architecture:** Use a pnpm TypeScript monorepo with four applications and four packages matching the approved target boundaries. Shared Zod contracts live in `packages/contracts`; pure invariants live in `packages/domain`; Hub access lives in `packages/sdk`; local execution primitives live in `packages/runtime-core`. MS0 implements constitution, health, diagnostics, migration, and fail-closed harness behavior only; it intentionally contains no identity, Requirement, Session, or Agent business workflow.

**Tech Stack:** Node.js 24.11.0, pnpm 10.33.2, TypeScript 5.9.3, Zod 4.4.3, NestJS 11.1.28 for Hub API/Worker, React 19.2.7, Electron 43.1.1, electron-vite 5.0.0, Vite 7.3.6, `@vitejs/plugin-react` 5.1.4, Playwright 1.61.1, electron-builder 26.15.3, Vitest 4.1.10, PostgreSQL 17.6, Biome 2.5.4.

---

## Non-Negotiable Inputs

- Source specification: `/Users/xy/personal/Sartre(agent-workspace-design)/spec/`.
- Source workflow: `/Users/xy/personal/Sartre(agent-workspace-design)/workflow/`.
- Source master plan: `/Users/xy/personal/Sartre(agent-workspace-design)/plan/00-master-plan.md`.
- Legacy source is evidence-only and remains frozen after 2026-07-17.
- Local credentials are loaded only from `/.local-secrets/development.env`, which must remain untracked and outside Docker/build artifacts.
- PostgreSQL required baseline is exactly 17.6 at `127.0.0.1:54326` for local MS0.
- Each task ends by updating `PLAN_LEDGER.md` with commands, exit codes, evidence level, risks, next command, and resume procedure, followed by a local commit. No push is part of MS0.
- A required check that is missing, skipped, degraded, or unreachable must return non-zero and remain BLOCKED.
- `pnpm install --frozen-lockfile --strict-peer-dependencies` is the only dependency bootstrap accepted by closeout. Workspace `typecheck` and `build` scripts are required and cannot be skipped with `--if-present`.
- Root packaging is prohibited. Electron packaging uses an explicit file allowlist. Task 1 validates Docker context exclusions structurally without traversing context contents; build/package artifacts use explicit-path Secret scans.
- Tool-version capture uses an argv allowlist. It must never run `env`, `printenv`, `npm config list`, `pnpm config list`, shell profiles, credential helpers, or process-environment dumps.
- Closeout uses two commits: an immutable subject commit containing the code under test, followed by an evidence-only commit. Evidence binds the subject commit/tree/dirty hash/artifact hashes/environment; it never attempts to record its own commit SHA.
- Every task follows RED -> GREEN -> fresh full verification. A subagent report, old output, copied legacy report, structural check, or dev/HMR launch is not completion evidence.

## Task 1: Initialize Repository Constitution and Recovery Ledger

**Files:**
- Preserve: `.gitignore`
- Create: `.dockerignore`
- Create: `.node-version`
- Create: `AGENTS.md`
- Create: `README.md`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `biome.json`
- Create: `vitest.workspace.ts`
- Create: `spec/**`
- Create: `workflow/**`
- Create: `plan/00-master-plan.md`
- Create: `openspec/changes/ms0-repository-constitution/proposal.md`
- Create: `openspec/changes/ms0-repository-constitution/design.md`
- Create: `openspec/changes/ms0-repository-constitution/tasks.md`
- Create: `openspec/changes/ms0-repository-constitution/scenarios.md`
- Create: `scripts/legacy/create-freeze-manifest.ts`
- Test: `scripts/legacy/create-freeze-manifest.test.ts`
- Create: `reference/legacy-freeze/manifest.json`
- Create: `reference/legacy-freeze/README.md`
- Create: `plan/PORTING_LEDGER.md`
- Create: `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md`
- Create: `scripts/constitution/secret-boundary.ts`
- Create: `scripts/constitution/check-secrets.ts`
- Test: `scripts/constitution/repository-secret-scan.test.ts`

- [ ] **Step 1: Initialize Git and local identity**

Run:

```bash
git init -b codex/ms0-repository-constitution
git config user.name lixin
git config user.email xin.li@quvideo.com
```

Expected: `git branch --show-current` prints `codex/ms0-repository-constitution`; global Git identity is unchanged. The empty repository has no baseline commit for a linked worktree, so MS0 runs in the user-designated target path on this isolated feature branch.

- [ ] **Step 2: Copy only approved specification and workflow documents**

Copy `spec/`, `workflow/`, `plan/00-master-plan.md`, the complete design, ADR-0004/0005, architecture overview, and database schema. Do not copy legacy source, old OpenSpec completion state, old PLAN_LEDGER, or historical PASS reports.

Expected structural check:

```bash
pnpm exec tsx scripts/constitution/verify-spec-import.ts
```

The default clean-clone/CI command compares required target documents to the generated SHA-256 import manifest and fails if a target is absent or changed. During the local import audit, also run `pnpm exec tsx scripts/constitution/verify-spec-import.ts --verify-source` to prove the approved source, manifest, and target match; clean-clone verification must not depend on the legacy checkout remaining mounted.

- [ ] **Step 3: Register the MS0 change and acceptance scenarios**

Create a new OpenSpec change from the imported target spec, not from legacy completion state. `proposal.md` states the user-visible four-process health result and MS0 non-goals. `design.md` records the repository, evidence, database, health, diagnostics, and Electron trust boundaries. `tasks.md` mirrors this plan. `scenarios.md` registers positive, rejection, concurrency, dependency-failure, Secret, packaged-app, and recovery scenarios with stable expected error codes.

Run:

```bash
pnpm run openspec:validate
```

Expected: the new MS0 change is valid; no legacy active/archive change is imported or marked complete.

- [ ] **Step 4: Write failing freeze-manifest tests and freeze the legacy source**

The fixture covers tracked, modified, untracked, deleted, symlink, and ignored files. The deterministic manifest records source repository, source HEAD, dirty diff hash, path, kind, size, SHA-256 when readable, Git state, and generatedAt. Generate it against `/Users/xy/personal/Sartre(agent-workspace-design)` before the first implementation commit, independently re-enumerate every tracked/untracked/deleted entry, and compare path, state, type, size, and hash rather than count alone. Never copy legacy contents.

Create `plan/PORTING_LEDGER.md` with columns:

```text
sourceRepository | sourceCommit | sourcePath | targetPath | reason |
securityReview | behaviorTests | owner | status
```

Every row starts `PENDING_REVIEW`; no directory receives blanket approval. `reference/legacy-freeze/README.md` records the legacy dirty state and the requirement for a NO-GO/new-repository notice. If the legacy README cannot be modified without touching user work, record an explicit approved deviation instead of claiming it was changed.

Run the fixture once before implementation and observe a missing-module FAIL, then implement and run:

```bash
pnpm exec vitest run scripts/legacy/create-freeze-manifest.test.ts
pnpm exec tsx scripts/legacy/create-freeze-manifest.ts --source "/Users/xy/personal/Sartre(agent-workspace-design)" --output reference/legacy-freeze/manifest.json
pnpm exec tsx scripts/legacy/verify-freeze-manifest.ts --source "/Users/xy/personal/Sartre(agent-workspace-design)" --manifest reference/legacy-freeze/manifest.json
```

Expected: all commands PASS; verification is independent of the generator implementation.

- [ ] **Step 5: Write the failing Secret-boundary tests**

Tests create temporary Git repositories and assert:

```ts
expect(gitTrackedFiles).not.toContainEqual(expect.stringContaining('.local-secrets'));
expect(dockerContextFiles).not.toContainEqual(expect.stringContaining('.local-secrets'));
expect(repositoryText).not.toMatch(/uk-sa-|AKID[A-Za-z0-9]{20,}/);
```

Negative cases must cover an immutable staged blob whose worktree copy was sanitized, a force-added `.local-secrets` file, a symlink resolving into `.local-secrets`, a password-bearing `DATABASE_URL`, private key, Bearer token, GitHub/cloud token, and a generated artifact containing a Secret. Positive cases must accept `$VAR` and `${VAR}` references without reading ignored credentials.

Run before the constitution scripts exist:

```bash
pnpm exec vitest run scripts/constitution/repository-secret-scan.test.ts
```

Expected: FAIL because the scanner/fixtures are not implemented.

- [ ] **Step 6: Create root toolchain and ignore/package policy**

Root scripts must include `toolchain:check`, `format:check`, `lint`, `typecheck`, `test`, `build`, `architecture:check`, `secret:check`, `secret:artifacts`, `docker-context:check`, `sast`, `dependency:check`, `license:check`, `openspec:validate`, `contract:compatibility`, `pg:verify`, `migrate`, `health:smoke`, `ops:trace-correlation`, `package:mac:arm64`, `harness:ms0`, and `verify:ms0`. A constitution test fails when any of the eight expected apps/packages omits its required `typecheck`, `test`, or `build` script. Root `prepack` fails deliberately so `npm pack`/`pnpm pack` cannot publish the repository.

`.dockerignore` and `.gitignore` must exclude:

```text
.local-secrets/
node_modules/
dist/
out/
coverage/
reports/**/raw/
.env
.env.*
*.pem
*.key
```

Use `gitleaks` as the general scanner of immutable Git/index input and keep Sartre-specific regex/path checks as a supplement. Pin its version and checksum in a bootstrap script or pinned development tool; required closeout fails if the binary is absent or version-mismatched. Never silently fall back to regex-only scanning.

`docker-context:check` is a fail-closed STRUCTURAL_CHECK, not a REAL_TEST of an enumerated Docker context. It reads only a contained regular `.dockerignore`, requires every exclusion above, rejects any active negation rule, and fails when the file is missing, symlinked, unreadable, or unsafe. MS0 has no legitimate re-include. The checker must not walk the repository or inspect forbidden-directory contents, and Task 1 must not invoke a Docker build merely to infer context membership.

- [ ] **Step 7: Make the constitution tests pass**

Run:

```bash
pnpm install --frozen-lockfile=false
pnpm exec vitest run scripts/constitution/repository-secret-scan.test.ts scripts/constitution/repository-policy.test.ts scripts/legacy/create-freeze-manifest.test.ts
pnpm run secret:check
```

Expected: PASS; staged index blobs and untracked files were scanned independently; ignored credentials were not read; the only real credentials remain in ignored `.local-secrets/development.env` with directory mode 700 and file mode 600.

- [ ] **Step 8: Update PLAN_LEDGER, verify, and commit**

Ledger entry records the plan revision, imported spec manifest, freeze source HEAD/dirty hash, exact commands and exit codes, evidence levels, skipped items, risks, the next command, and recovery procedure. Before staging, run `git diff --check`, format/lint, the Task 1 tests, immutable index/worktree Secret scans, and verify that `.local-secrets`, `node_modules`, build output, raw evidence, environment files, keys, and package artifacts are absent from the index.

```bash
git add -- . ':!.local-secrets'
pnpm run secret:check -- --index
git commit -m "chore(ms0): initialize repository constitution"
```

## Task 2: Establish Module Boundaries and Shared Contracts

**Files:**
- Create: `packages/domain/package.json`
- Create: `packages/domain/src/index.ts`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/src/result.ts`
- Create: `packages/contracts/src/diagnostics.ts`
- Create: `packages/contracts/src/health.ts`
- Create: `packages/contracts/src/evidence.ts`
- Create: `packages/contracts/src/error-catalog.ts`
- Create: `packages/sdk/package.json`
- Create: `packages/sdk/src/index.ts`
- Create: `packages/runtime-core/package.json`
- Create: `packages/runtime-core/src/index.ts`
- Create: `scripts/architecture/check.ts`
- Test: `scripts/architecture/check.test.ts`
- Test: `packages/contracts/src/contracts.test.ts`

- [ ] **Step 1: Write failing contract tests**

Define tests for the authoritative discriminated Result and complete diagnostic context:

```ts
const result = ResultSchema.parse({
  success: false,
  error: { code: 'dependency_unavailable', message: 'PostgreSQL unavailable' },
});
expect(result.success).toBe(false);

const context = DiagnosticContextSchema.parse({
  requestId: crypto.randomUUID(),
  correlationId: crypto.randomUUID(),
  causationId: crypto.randomUUID(),
  workspaceId: null,
  userId: null,
  initiatedByUserId: null,
  actorType: 'system',
  actorId: 'ms0-self-test',
  component: 'hub-api',
  operation: 'health.read',
  stage: 'dependency_check',
  status: 'failed',
  resourceType: null,
  resourceId: null,
  requirementId: null,
  sessionId: null,
  executionId: null,
  leaseId: null,
  endpointId: null,
  occurredAt: new Date().toISOString(),
  errorCode: 'dependency_unavailable',
  retryable: true,
});
expect(context.correlationId).toBeTruthy();
```

Run and observe missing-module failure:

```bash
pnpm exec vitest run packages/contracts/src/contracts.test.ts
```

- [ ] **Step 2: Implement minimum Zod contracts**

`Result<T>` is exactly `{ success: true; data: T } | { success: false; error: { code; message; details? } }`. `code` is a Zod enum from `error-catalog.ts`; free-form strings cannot drive retries, aggregation, alerts, or diagnostics. `DiagnosticContext` implements every field in `spec/ModuleContractSpec.md`; the required actor chain, `component/operation/stage/status`, `occurredAt`, and stable `errorCode` cannot be replaced by message text.

`HealthSnapshot` includes `service`, `status(healthy/degraded/unavailable)`, `version`, `commitSha`, `checkedAt`, `dependencies[]`, and optional stable `errorCode`; it contains no raw Secret or local path.

`EvidenceManifest` includes the exact metadata required by `workflow/harness-sop.md` and separates `evidenceLevel` from `status`.

- [ ] **Step 3: Write failing architecture checks**

Fixtures must prove the checker rejects:

- `packages/domain` importing Nest/Electron/fs/http.
- one app importing another app source.
- renderer importing `ipcRenderer` or Hub SDK directly.
- legacy nouns `Phase/Dispatch/Delivery/WorkspaceToken` in target domain files.
- Secret literals and `.local-secrets` in tracked/build files.
- `require()`, dynamic `import()`, path aliases, package dependencies, and TypeScript project references that cross the same boundaries.

Run:

```bash
pnpm exec vitest run scripts/architecture/check.test.ts
```

Expected: FAIL before checker implementation.

- [ ] **Step 4: Implement architecture checker and verify RED/GREEN fixtures**

Use TypeScript AST inspection plus package manifest and tsconfig graph checks. Static imports, `require()`, dynamic imports, path aliases, package dependencies, and project references must resolve to the same canonical boundary graph. Every violation prints `ruleId`, file, line, and remediation and exits non-zero.

```bash
pnpm run architecture:check
pnpm exec vitest run scripts/architecture/check.test.ts
```

Expected: production tree PASS; every negative fixture is rejected.

- [ ] **Step 5: Update PLAN_LEDGER, verify, and commit**

Record the contract and architecture negative controls, exact exit codes, risks, next command, and recovery procedure. Re-run Task 1 Secret/index checks before staging.

```bash
git add packages scripts/architecture package.json pnpm-lock.yaml
git commit -m "feat(ms0): enforce module and contract boundaries"
```

## Task 3: Build Fail-Closed Evidence and Harness Foundation

**Files:**
- Create: `scripts/evidence/validate.ts`
- Create: `scripts/evidence/collect-command.ts`
- Create: `scripts/harness/run-required-gates.ts`
- Create: `scripts/harness/ms0.config.ts`
- Test: `scripts/evidence/validate.test.ts`
- Test: `scripts/harness/run-required-gates.test.ts`
- Create: `reports/ms0-repository-constitution/evidence/schema-version.txt`

- [ ] **Step 1: Write failing evidence tests**

Cases must reject:

```ts
['SKIPPED required step', 'STRUCTURAL_CHECK labeled REAL_TEST', 'missing exit code',
 'missing commitSha', 'dirty hash mismatch', 'service unreachable but PASS',
 'artifact hash missing after build']
```

Run:

```bash
pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts
```

Expected: FAIL before validators exist.

- [ ] **Step 2: Implement the evidence schema and command collector**

`collect-command.ts` runs an allowlisted argv array without shell interpolation and never accepts a caller-provided environment dump. It captures start/end/exit code, stdout/stderr hash, allowlisted tool versions, test counts, failure counts, and a schema-specific allowlist of redacted key assertions/error codes. Raw logs live only under ignored `reports/**/raw/`; their hashes can enter the report, but hashes alone cannot prove an assertion. It marks command evidence REAL_TEST only when the target actually ran and failure would produce non-zero.

- [ ] **Step 3: Implement required-gate runner**

The runner executes gates in declared order, preserves all attempts, stops closeout on any required non-PASS result, and writes a manifest plus human-readable report. Evidence metadata contains `commitSha (tested subject commit)`, `subjectTreeHash`, `dirtyWorktreeHash`, release version, image digest where applicable, Electron artifact hashes, schema version, environment id, tool versions, evidence level, status, and timestamps. The schema rejects evidence that tries to identify its own evidence commit as the tested subject.

- [ ] **Step 4: Prove fail-closed behavior**

Run a negative fixture with a missing required command and another with `SKIPPED`:

```bash
pnpm exec tsx scripts/harness/run-required-gates.ts --config scripts/harness/fixtures/missing-command.ts
pnpm exec tsx scripts/harness/run-required-gates.ts --config scripts/harness/fixtures/skipped-required.ts
```

Expected: both commands exit non-zero. Then run the unit suite and expect PASS.

- [ ] **Step 5: Update PLAN_LEDGER, verify, and commit**

Record both fail-closed command exit codes and the successful unit suite. The ledger must state that the Harness foundation is not yet MS0 closeout evidence.

```bash
git add scripts/evidence scripts/harness reports/ms0-repository-constitution/evidence
git commit -m "feat(ms0): add fail-closed evidence harness"
```

## Task 4: Pin PostgreSQL 17.6 and Baseline Migration

**Files:**
- Create: `apps/hub-api/src/infrastructure/database/migrations/000001_ms0_baseline.sql`
- Create: `scripts/postgres/verify-version.ts`
- Create: `scripts/postgres/migrate.ts`
- Create: `scripts/postgres/create-test-database.ts`
- Test: `scripts/postgres/postgres.integration.test.ts`
- Create: `docker/postgres/compose.yml`
- Create: `docker/migration-job/Dockerfile`
- Create: `docker/migration-job/entrypoint.sh`

- [ ] **Step 1: Write failing real PostgreSQL test**

The test creates a unique disposable database on the PostgreSQL 17.6 server, first asserts an empty application schema, checks `SHOW server_version_num = '170006'`, applies the baseline migration twice, and asserts exactly one schema-version row with the expected checksum. It always drops the disposable database in teardown.

```bash
SARTRE_DATABASE_URL="$LOCAL_TEST_DATABASE_URL" pnpm exec vitest run scripts/postgres/postgres.integration.test.ts
```

Expected initial failure: migration runner/version gate does not exist.

- [ ] **Step 2: Implement exact version gate and migration**

The migration creates only MS0 infrastructure:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  checksum text NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);
```

Acquire a PostgreSQL advisory lock, reject checksum drift, and run in a transaction. Reject any `server_version_num` other than `170006` with stable `postgres_version_mismatch`.

Required negative tests mutate a migration after application and expect `migration_checksum_mismatch`; inject a failing statement and prove the transaction leaves no partial schema/version row; start two migrators concurrently and prove advisory-lock serialization; start Hub API against an unmigrated or incompatible schema and prove readiness fails with `schema_incompatible` without automatically applying a migration. The independent Migration Job uses the same immutable migration artifact and exits non-zero on every mismatch.

- [ ] **Step 3: Run positive and negative REAL_TEST**

Positive uses container `sartre-postgres-17-6` on port 54326 and a unique empty database. Negative connects to the existing local PostgreSQL 17.10 on port 55432 and runs only the read-only version gate; it must fail specifically with `postgres_version_mismatch` without creating or changing any database object. Record `server_version_num` in the redacted key assertions.

- [ ] **Step 4: Update PLAN_LEDGER, verify, and commit**

Record disposable database names as non-secret evidence, positive/negative error codes, rollback/concurrency results, exact container image digest, risks, next command, and recovery procedure. Do not record database URLs or passwords.

```bash
git add apps/hub-api/src/infrastructure/database docker/postgres docker/migration-job scripts/postgres reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md
git commit -m "feat(ms0): pin PostgreSQL 17.6 migration baseline"
```

## Task 5: Implement Hub API, Worker, and Local Runtime Health Processes

**Files:**
- Create: `apps/hub-api/**`
- Create: `apps/hub-worker/**`
- Create: `apps/local-runtime/**`
- Create: `packages/contracts/src/service-health.ts`
- Create: `packages/sdk/src/health-client.ts`
- Test: `tests/integration/service-health.integration.test.ts`

- [ ] **Step 1: Write failing health integration test**

Spawn each application on an ephemeral port and assert `/livez` and `/readyz` return validated `HealthSnapshot`. Stop PostgreSQL and assert Hub readiness returns 503/degraded while liveness remains 200. Stop Worker while PostgreSQL remains available and assert Hub API readiness remains 200 for its own critical dependencies while the SDK's aggregated process snapshot reports only Worker as unavailable after the heartbeat deadline.

- [ ] **Step 2: Implement minimum process shells**

Hub API uses NestJS and PostgreSQL readiness. Worker uses a Nest application context plus a loopback-only probe server. Local Runtime uses a loopback-only MS0 probe with no file/command endpoints. All responses use contracts and stable errors.

Worker sends heartbeat state to a Hub-owned aggregator. Electron never contacts the Worker probe; Electron Main reads a redacted four-process snapshot only through `packages/sdk`. Before MS1 identity exists, this transport is enabled only when an explicit MS0 self-test mode is set and uses a per-run random loopback session token supplied to child processes without persistence. In production configuration, the unauthenticated self-test route is absent and requests fail closed with 404; MS1 will replace this transport with authenticated System/ops actor semantics.

- [ ] **Step 3: Verify process restart and dependency failure**

Run:

```bash
pnpm exec vitest run tests/integration/service-health.integration.test.ts
```

Expected: PASS including actual child-process start/stop, port readiness, PostgreSQL failure, and restart recovery.

- [ ] **Step 4: Update PLAN_LEDGER, verify, and commit**

Record child-process PIDs only in ignored raw logs, redacted port/process assertions in the report, the PostgreSQL/Worker failure semantics, restart cleanup result, risks, next command, and recovery procedure.

```bash
git add apps/hub-api apps/hub-worker apps/local-runtime packages/contracts packages/sdk tests/integration reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md
git commit -m "feat(ms0): add service health process shells"
```

## Task 6: Implement Electron Four-Process Health UI

**Files:**
- Create: `apps/electron-app/**`
- Create: `apps/electron-app/electron-builder.yml`
- Create: `apps/electron-app/src/main/health/health-monitor.ts`
- Create: `apps/electron-app/src/preload/index.ts`
- Create: `apps/electron-app/src/renderer/src/views/SystemHealthView.tsx`
- Test: `apps/electron-app/src/main/health/health-monitor.test.ts`
- Test: `apps/electron-app/src/main/packaging-policy.test.ts`
- Create: `scripts/constitution/extract-electron-payload.ts`
- Test: `scripts/constitution/extract-electron-payload.test.ts`
- Test: `tests/e2e/ms0-health.spec.ts`

- [ ] **Step 1: Write failing monitor and UI tests**

Unit test validates polling, timeout, stale state, and no raw endpoint/Secret exposure. The packaging-policy test rejects an absent or catch-all Electron `files` list, forbidden source/config/credential paths, and any output path not covered by the artifact Secret scanner. It also requires `productName: Sartre`, `artifactName: Sartre-${version}-${arch}.${ext}`, and an explicit package `files` allowlist so the unpacked app and distributable paths below remain deterministic. Playwright Electron test expects four stable rows: Electron, Hub API, Hub Worker, Local Runtime.

- [ ] **Step 2: Implement secure Electron shell**

BrowserWindow must set:

```ts
webPreferences: {
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  nodeIntegration: false,
  preload,
}
```

Preload exposes only `systemHealth.subscribe()` and `systemHealth.getSnapshot()` with Zod-validated Result. Renderer has no Node, raw IPC, credential, or endpoint access.

- [ ] **Step 3: Implement stable health workbench**

The first screen is the actual compact workbench health view, not a landing page. It displays four fixed rows with status text, last check, version, and remediation. It must not expose unfinished business navigation.

- [ ] **Step 4: Run real Electron positive/negative tests**

Start all services and assert healthy. Stop Worker and assert only Worker becomes unavailable without layout shift. Restart it and assert recovery.

```bash
pnpm exec playwright test tests/e2e/ms0-health.spec.ts
```

- [ ] **Step 5: Build unsigned arm64 macOS artifact and commit**

MS0 build is not Release signing evidence, but artifact hashes must be recorded. `electron-builder.yml` uses an explicit `files` allowlist containing only the compiled main, preload, renderer, package metadata, and deliberately declared runtime resources; it must not use `**/*`, copy the repository root, include source maps by default, or include `.local-secrets`, `.env*`, reports, tests, source, Git metadata, package-manager caches, keys, or raw evidence. Build the unpacked arm64 application first, scan its complete app tree, then build the deterministic `Sartre-0.1.0-arm64.dmg` and scan both that container and a separately extracted `Sartre.app` payload. `extract-electron-payload.ts` uses `hdiutil`/`ditto`, accepts only the explicit input/output arguments below, requires exactly one expected app payload, detaches mounts on every path, and exits non-zero on missing/ambiguous input or extraction failure. A missing requested scan path returns `artifact_path_missing`; a scan that cannot inspect the extracted payload is BLOCKED, not PASS.

```bash
pnpm --filter @sartre/electron-app build
pnpm run docker-context:check
pnpm run package:mac:arm64 -- --dir
pnpm run secret:artifacts -- \
  apps/electron-app/dist \
  apps/hub-api/dist \
  apps/hub-worker/dist \
  apps/local-runtime/dist \
  packages/contracts/dist \
  packages/domain/dist \
  packages/runtime-core/dist \
  packages/sdk/dist \
  apps/electron-app/release/mac-arm64/Sartre.app
pnpm run package:mac:arm64 -- --publish never
SARTRE_EXTRACTED_PAYLOAD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/sartre-electron-payload.XXXXXX")"
trap 'rm -rf "$SARTRE_EXTRACTED_PAYLOAD_DIR"' EXIT
pnpm exec tsx scripts/constitution/extract-electron-payload.ts \
  --input apps/electron-app/release/Sartre-0.1.0-arm64.dmg \
  --output "$SARTRE_EXTRACTED_PAYLOAD_DIR"
pnpm run secret:artifacts -- \
  apps/electron-app/dist \
  apps/hub-api/dist \
  apps/hub-worker/dist \
  apps/local-runtime/dist \
  packages/contracts/dist \
  packages/domain/dist \
  packages/runtime-core/dist \
  packages/sdk/dist \
  apps/electron-app/release/mac-arm64/Sartre.app \
  apps/electron-app/release/Sartre-0.1.0-arm64.dmg \
  "$SARTRE_EXTRACTED_PAYLOAD_DIR/Sartre.app"
rm -rf "$SARTRE_EXTRACTED_PAYLOAD_DIR"
trap - EXIT
pnpm exec vitest run apps/electron-app/src/main/packaging-policy.test.ts
git add apps/electron-app tests/e2e reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md
git commit -m "feat(ms0): show four-process health in Electron"
```

## Task 7: Add Diagnostic Timeline and Ops Trace Skeleton

**Files:**
- Create: `packages/contracts/src/diagnostic-timeline.ts`
- Create: `packages/sdk/src/diagnostics-client.ts`
- Create: `apps/hub-api/src/diagnostics/**`
- Create: `scripts/ops/trace-correlation.ts`
- Test: `tests/integration/diagnostic-timeline.integration.test.ts`

- [ ] **Step 1: Write failing correlation-chain test**

Send one MS0 probe carrying `userId`, `correlationId`, `causationId`, and `requestId`; expect ordered stages and stable error codes without message body, Prompt, Secret, local path, SQL, or stack.

- [ ] **Step 2: Implement structured boundary log and projection skeleton**

For MS0, persist diagnostic records in PostgreSQL with retention metadata; they are not DomainEvents and do not alter aggregate versions. CLI reads through the Hub ops port, never directly from production DB.

- [ ] **Step 3: Prove failure localization**

Force one dependency stage to fail and assert CLI output includes `lastSuccessfulStage`, `firstFailedStage`, `currentState`, and `suggestedRecoveryAction` for the same correlationId.

- [ ] **Step 4: Commit diagnostics skeleton**

Update `PLAN_LEDGER.md` with the successful and forced-failure correlation ids, stable error codes, exact exit codes, retained risks, next command, and resume procedure. Do not record request bodies, local paths, database URLs, or raw command output.

```bash
git add packages/contracts packages/sdk apps/hub-api/src/diagnostics scripts/ops tests/integration reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md
git commit -m "feat(ms0): add correlation diagnostic timeline"
```

## Task 8: Reverify the Immutable Legacy Freeze and Porting Boundary

**Files:**
- Preserve: `scripts/legacy/create-freeze-manifest.ts`
- Preserve: `scripts/legacy/verify-freeze-manifest.ts`
- Test: `scripts/legacy/create-freeze-manifest.test.ts`
- Preserve: `reference/legacy-freeze/manifest.json`
- Preserve: `reference/legacy-freeze/README.md`
- Update: `plan/PORTING_LEDGER.md`
- Update: `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md`

- [ ] **Step 1: Re-run the freeze-manifest regression suite**

Task 1 already generated the pre-implementation freeze and committed it before any target implementation. Do not regenerate that manifest at Task 8. Re-run the fixture suite covering tracked, modified, untracked, deleted, symlink, and ignored files, and prove that the independent verifier fails when path, state, kind, size, or hash is mutated without relying on entry counts.

- [ ] **Step 2: Reverify the recorded source facts without rewriting them**

Run the independent verifier against the recorded manifest. If the legacy repository has changed since `generatedAt`, record `legacy_source_drift` with the old and current HEAD/dirty hash metadata only and stop; do not overwrite the pre-implementation freeze or silently bless a newer source state.

- [ ] **Step 3: Audit imported target files against the PortingLedger**

Every target file derived from legacy source must map to one exact source file and one ledger row. Imported target spec/workflow/design/ADR/schema documents remain governed by the separate SHA-256 import manifest. No file may be approved through a directory wildcard, and no source content is copied as part of this audit.

- [ ] **Step 4: Keep the PortingLedger deny-by-default**

Every newly proposed candidate row starts `PENDING_REVIEW`. Approval requires a file-specific reason, completed security review, named behavior tests, and owner; only then may that exact row become `APPROVED`. No application/domain directory or wildcard receives blanket approval.

- [ ] **Step 5: Commit only the audit/ledger delta**

```bash
pnpm exec vitest run scripts/legacy/create-freeze-manifest.test.ts
pnpm exec tsx scripts/legacy/verify-freeze-manifest.ts --source "/Users/xy/personal/Sartre(agent-workspace-design)" --manifest reference/legacy-freeze/manifest.json
git diff --exit-code -- reference/legacy-freeze/manifest.json
git add plan/PORTING_LEDGER.md reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md
git commit -m "docs(ms0): audit legacy porting boundary"
```

## Task 9: Run MS0 Required Gates and Closeout

**Files:**
- Create: `.github/workflows/ms0-required.yml`
- Create: `scripts/harness/verify-clean-clone.ts`
- Test: `scripts/harness/verify-clean-clone.test.ts`
- Create: `scripts/harness/verify-ci-run.ts`
- Test: `scripts/harness/verify-ci-run.test.ts`
- Modify: `package.json`
- Create: `reports/ms0-repository-constitution/checkpoints/closeout.md`
- Create: `reports/ms0-repository-constitution/evidence/manifest.json`
- Update: `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md`
- Update: `plan/00-master-plan.md`

- [ ] **Step 1: Write RED/GREEN clean-clone and evidence-chain tests**

The fixture starts from a repository with untracked dependency/build output and proves the verifier uses a fresh clone of the exact candidate subject commit. It must reject an unfrozen lockfile, missing required CI job, absent/mismatched pinned gitleaks, root-pack success, generated source/config drift, a dirty source checkout used as evidence, an evidence commit whose parent is not the declared subject, a non-evidence file in the evidence commit, and a manifest that claims the evidence commit is its own subject.

```bash
pnpm exec vitest run scripts/harness/verify-clean-clone.test.ts
```

First observe the expected missing-verifier FAIL, then implement the minimum verifier and re-run to PASS. `.github/workflows/ms0-required.yml` must use the pinned Node/pnpm/gitleaks versions, `pnpm install --frozen-lockfile --strict-peer-dependencies`, PostgreSQL 17.6 where required, the same fail-closed root gates, and artifact upload by hash. A required CI job that is skipped, cancelled, absent, or run against another commit blocks closeout.

- [ ] **Step 2: Create and freeze the immutable subject commit**

Run all pre-subject checks from the working repository, including untracked-aware whitespace/path checks, immutable index/worktree Secret scans, root-pack rejection, Electron explicit-allowlist policy, and unpacked/packaged artifact Secret scans. Commit every source, lockfile, workflow, migration, test, build/package configuration, and script change before collecting closeout evidence. After this commit, the subject tree is immutable; any code/config/lockfile change invalidates all following evidence and requires a new subject commit and complete rerun.

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run architecture:check
pnpm run secret:check
pnpm run docker-context:check
SARTRE_EXTRACTED_PAYLOAD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/sartre-electron-payload.XXXXXX")"
trap 'rm -rf "$SARTRE_EXTRACTED_PAYLOAD_DIR"' EXIT
pnpm exec tsx scripts/constitution/extract-electron-payload.ts \
  --input apps/electron-app/release/Sartre-0.1.0-arm64.dmg \
  --output "$SARTRE_EXTRACTED_PAYLOAD_DIR"
pnpm run secret:artifacts -- \
  apps/electron-app/dist \
  apps/hub-api/dist \
  apps/hub-worker/dist \
  apps/local-runtime/dist \
  packages/contracts/dist \
  packages/domain/dist \
  packages/runtime-core/dist \
  packages/sdk/dist \
  apps/electron-app/release/mac-arm64/Sartre.app \
  apps/electron-app/release/Sartre-0.1.0-arm64.dmg \
  "$SARTRE_EXTRACTED_PAYLOAD_DIR/Sartre.app"
rm -rf "$SARTRE_EXTRACTED_PAYLOAD_DIR"
trap - EXIT
git diff --check
git status --short
git commit -m "chore(ms0): freeze repository constitution subject"
```

Expected: the commit succeeds only if there are intentional staged subject changes; otherwise the existing clean `HEAD` becomes the subject without an empty commit. Record `commitSha (tested subject commit)`, `subjectTreeHash`, and the clean dirty-worktree hash outside tracked evidence until the evidence commit.

- [ ] **Step 3: Prove clean-clone and CI reproducibility for the subject**

Create a new temporary clone from the local repository, check out the exact subject SHA in detached mode, and run the bootstrap/gates without copying `node_modules`, build output, ignored credentials, raw reports, or the caller worktree. Dependency installation must be `pnpm install --frozen-lockfile --strict-peer-dependencies`; generated files/configuration must leave the clone clean. Run the required CI workflow for that same subject and record its immutable run identifier/status/artifact hashes. If CI is unavailable, this required gate is BLOCKED rather than replaced with a local structural check.

```bash
pnpm exec tsx scripts/harness/verify-clean-clone.ts --subject "$SUBJECT_SHA"
pnpm run ci:verify -- --subject "$SUBJECT_SHA"
```

- [ ] **Step 4: Run clean Layer 1 gates against the subject**

```bash
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run architecture:check
pnpm run secret:check
pnpm run docker-context:check
SARTRE_EXTRACTED_PAYLOAD_DIR="$(mktemp -d "${TMPDIR:-/tmp}/sartre-electron-payload.XXXXXX")"
trap 'rm -rf "$SARTRE_EXTRACTED_PAYLOAD_DIR"' EXIT
pnpm exec tsx scripts/constitution/extract-electron-payload.ts \
  --input apps/electron-app/release/Sartre-0.1.0-arm64.dmg \
  --output "$SARTRE_EXTRACTED_PAYLOAD_DIR"
pnpm run secret:artifacts -- \
  apps/electron-app/dist \
  apps/hub-api/dist \
  apps/hub-worker/dist \
  apps/local-runtime/dist \
  packages/contracts/dist \
  packages/domain/dist \
  packages/runtime-core/dist \
  packages/sdk/dist \
  apps/electron-app/release/mac-arm64/Sartre.app \
  apps/electron-app/release/Sartre-0.1.0-arm64.dmg \
  "$SARTRE_EXTRACTED_PAYLOAD_DIR/Sartre.app"
rm -rf "$SARTRE_EXTRACTED_PAYLOAD_DIR"
trap - EXIT
```

- [ ] **Step 5: Run MS0 REAL_TEST gates against the subject**

```bash
pnpm run pg:verify
pnpm run migrate
pnpm run health:smoke
pnpm exec playwright test tests/e2e/ms0-health.spec.ts
pnpm exec vitest run tests/integration/diagnostic-timeline.integration.test.ts
```

- [ ] **Step 6: Run required negative controls**

Prove missing command, SKIPPED gate, PostgreSQL 17.10, stopped Worker, degraded dependency, missing/mismatched gitleaks, root packaging, a Secret in unpacked Electron output, a Secret in the extracted packaged payload, and CI for the wrong commit each produce non-zero Harness status and the expected stable error code.

- [ ] **Step 7: Produce the evidence-only child commit**

Generate closeout metadata that binds the immutable subject commit/tree, clean dirty hash, CI run, tool versions, database/schema/environment, and artifact hashes. The evidence allowlist is limited to `reports/ms0-repository-constitution/**`, the MS0 status line in `plan/00-master-plan.md`, and the Task 9 entry in `PLAN_LEDGER.md`; no source, lockfile, workflow, test, build/package configuration, imported spec, freeze manifest, or PortingLedger change may enter this commit.

```bash
git add reports/ms0-repository-constitution plan/00-master-plan.md
git commit -m "test(ms0): bind repository constitution evidence"
```

The resulting evidence commit must have the subject commit as its sole parent. It records `commitSha=$SUBJECT_SHA` as the tested subject commit; it never records its own SHA as the tested subject and never triggers evidence regeneration merely because the evidence commit SHA now exists.

- [ ] **Step 8: Verify the evidence commit, then create the verified tag**

Run the final verifier from the evidence commit. It verifies: `HEAD^` equals the declared subject; the subject tree/hash and clean-clone/CI/artifact evidence match; `HEAD^..HEAD` contains only evidence-allowlisted paths; the evidence schema and required gates are PASS with no required SKIPPED; and the evidence commit contains no Secret. It does not rerun the implementation against `HEAD` and does not pretend `HEAD` is the subject.

```bash
pnpm run verify:ms0 -- --evidence-commit HEAD --subject-commit HEAD^
```

Only after the final command returns zero:

```bash
git tag -a ms0-verified -m "MS0 Repository Constitution verified"
```

The evidence-only commit may mark MS0 closed in the Master Plan only when every task and required close signal is evidenced. Tag the verified evidence commit; its manifest identifies the immutable subject commit. Otherwise leave MS0 open or genuinely blocked with the precise external dependency.

## Plan Self-Review

- Spec coverage: MS0 deliverables and close signals map to Tasks 1-9.
- Scope: identity, Requirement, chat, Agent execution, Steward behavior, K8S release, and business workflows are excluded.
- Evidence: structural checks are never labeled REAL_TEST; PostgreSQL/process/Electron/diagnostic paths use real dependencies.
- Reproducibility: the immutable subject is rebuilt and verified from a clean clone and the required CI workflow for the same SHA before evidence is committed.
- Recovery: PLAN_LEDGER, closeout checkpoint, commits, and evidence manifest make every task resumable after context compaction.
- Secrets: credentials remain only in ignored local configuration and never enter Git, logs, reports, Docker context, Electron explicit-allowlist input, unpacked app, or packaged payload.
- Commit binding: the evidence-only commit is the sole child of the immutable subject, and the final verifier checks that chain without identifying the evidence commit as the tested subject.
- Compatibility: local positive database evidence uses exact PostgreSQL 17.6; local 17.10 is used only as a read-only negative version-gate target.
