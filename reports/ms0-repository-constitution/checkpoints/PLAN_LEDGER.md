# MS0 PLAN_LEDGER

- Goal: MS0 Repository Constitution and evidence baseline
- Plan: `docs/superpowers/plans/2026-07-17-ms0-repository-constitution.md`
- Status: BLOCKED at the authorized MS0 evidence-rebind artifact-content gate. The immutable subject and replacement same-SHA CI are valid, but the replacement artifact has not been downloaded and checksum-verified within the approved 15-minute boundary; no replacement evidence-only child, verified tag, `main` update, or MS1 start is permitted yet.
- Current task: cross-device handoff for the narrow MS0 evidence rebind. Immutable subject `eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a`, tree `c424d56fd77fe5d0069f191102176abd29ed1546`, is published at `origin/codex/ms0-repository-constitution`. Replacement GitHub Actions run `29973452109` completed successfully for that exact SHA with all three required jobs PASS and artifact digest `sha256:f65ef41b41a94ce7498082996d1259f21eeb7e75d8f0c745d0d92ee42377c5e3`.
- Last verified action: the user requested an immediate device-switch handoff. The active archive download was stopped, all bounded temporary download paths were removed, the repository worktree remained clean before this ledger-only handoff branch was created, and live GitHub state still reported run `29973452109` as `completed/success` for `eab7d4ae...`.
- Evidence level: live `pnpm run ci:verify -- --subject eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a` is REAL_TEST / PASS for the replacement run metadata, jobs, subject, and artifact digest. Artifact content/checksum and the final evidence chain are BLOCKED, not PASS. Historical run `29914173418` now returns GitHub 404 with zero artifacts and cannot support fresh verification.
- Required dependency: PostgreSQL 17.6 container `sartre-postgres-17-6` on `127.0.0.1:54326`
- Secret source: ignored `/.local-secrets/development.env`; values must never be recorded here. Task 4 did not read it: the repo-owned database uses explicit loopback-only local-integration `trust`, guarded by a fail-closed compose policy that prohibits production reuse
- Resume procedure:
  1. Clone/fetch only `https://github.com/daodaolee/sartre.git`, then read root `AGENTS.md`, the authority chain, `plan/00-master-plan.md`, `docs/superpowers/plans/2026-07-17-ms0-repository-constitution.md`, and this ledger from branch `codex/ms0-evidence-rebind-handoff`. Do not read ignored credential input or any environment/config dump.
  2. Fetch `origin/main`, `origin/codex/ms0-repository-constitution`, and tags. Require immutable subject `eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a`, tree `c424d56fd77fe5d0069f191102176abd29ed1546`, subject parent `16bb67b054cd71a7e05e70e203621d1a560465ab`, `origin/main=8174869ae58f90ee1a3dae5d48d75d73d5285533`, `ms0-verified^{commit}=8174869ae58f90ee1a3dae5d48d75d73d5285533`, and tag object `4e3b930d1fcb8d8fd1086f1e0d63ee67a9f4ebff`. Any drift stops the recorded force-with-lease procedure for review.
  3. Bootstrap only the pinned repository toolchain: Node `v24.11.0`, pnpm `10.33.2`, `pnpm install --frozen-lockfile --strict-peer-dependencies`, `pnpm run toolchain:bootstrap`, and `pnpm run toolchain:check`. Never substitute a system gitleaks or regex-only fallback.
  4. Run `pnpm run ci:verify -- --subject eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a` and require exit 0 selecting run `29973452109` and artifact digest `sha256:f65ef41b41a94ce7498082996d1259f21eeb7e75d8f0c745d0d92ee42377c5e3`.
  5. Using the official GitHub CLI rather than a command-output proxy, download artifact `ms0-required-eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a` from run `29973452109` within 15 minutes. Require exactly `Sartre-0.1.0-arm64.dmg` and `artifact-sha256.txt`, then require `shasum -a 256 -c artifact-sha256.txt` to pass. Preserve every timeout/reset attempt; do not use the historical DMG hash.
  6. In a clean isolated branch/worktree rooted directly at immutable subject `eab7d4ae...`, restore the five old evidence files only as drafting input, update them with the replacement run/artifact/DMG facts and this checkpoint lineage, and require the final evidence delta to contain exactly `plan/00-master-plan.md`, this ledger, `checkpoints/closeout.md`, `evidence/closeout.json`, and `evidence/manifest.json`.
  7. Run format/whitespace plus full Secret checks, stage exactly those five paths, repeat cached exact-path/whitespace and immutable-index/full Secret checks, then create `test(ms0): bind repository constitution evidence` with `daodaolee <im@daodaolee.cn>`. Its sole parent must be `eab7d4ae...`; this handoff commit must not enter the final chain.
  8. Run `pnpm run verify:ms0 -- --evidence-commit HEAD --subject-commit HEAD^`. Only fresh exit 0 permits annotated `ms0-verified`, exact force-with-lease updates of GitHub `main` and the tag from the leases in step 2, followed by the user's original full binding command. Only that command's exit 0 permits creation and immediate remote push of the MS1 implementation plan and independent PLAN_LEDGER. Do not enter MS2.

## Entries

### 2026-07-17 - Goal initialization

- Status: IN_PROGRESS
- Scope: Created the MS0 Goal, implementation plan, and recovery ledger.
- Changed files: plan and ledger only.
- Tests: not run; implementation has not started.
- Evidence: SCENARIO_REGISTERED, not PASS.
- Skipped: all implementation and verification tasks remain pending.
- Next: initialize Git and repository constitution under Task 1.

### 2026-07-17 18:08 CST - immediate new-session handoff

- Status: IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Scope: hardened the execution plan through Task 5 and started Task 1 staged-index/worktree Secret scanning; stopped immediately when the user requested a new conversation.
- Changed files: `docs/superpowers/plans/2026-07-17-ms0-repository-constitution.md`, `scripts/constitution/secret-boundary.ts`, `scripts/constitution/repository-secret-scan.test.ts`, and this ledger. The repository has no baseline commit, so Git currently reports the entire approved scaffold as untracked.
- Commands reported by the implementer:
  - `pnpm exec vitest run scripts/constitution/repository-secret-scan.test.ts` before new tests: exit 0, `3 passed`.
  - The same command after adding tests but before implementation: non-zero as expected, `12 tests | 10 failed | 2 passed`.
  - `command -v gitleaks; gitleaks version`: `gitleaks` absent.
  - `node --version`: exit 0, `v24.11.0`.
  - `pnpm --version`: exit 0, `10.33.2`.
- Controller command: `git status --short --branch && git diff --stat && git diff --check`, exit 0. This does not validate untracked file whitespace because the repository has no commit/index baseline.
- Evidence: expected RED control is REAL_TEST / FAIL. Post-implementation GREEN, repository Secret scan, format, lint, build/package/Docker artifact scan, and controller diff review were not run.
- Skipped: no commit; no legacy freeze manifest; no OpenSpec change; no gitleaks integration; no artifact scanner; no Task 1 closeout.
- Risks:
  - Secret scanner implementation may not compile or satisfy the expanded tests.
  - A regex-only PASS is insufficient; required closeout needs pinned gitleaks plus Sartre-specific rules.
  - Tasks 6-9 of the plan still need the accepted Electron packaging, clean-clone/CI, and two-commit evidence revisions.
  - An earlier tool invocation exposed a registry auth token in transient tool output; it was not written to repository files, but the credential should be rotated.
- Next command: `pnpm exec vitest run scripts/constitution/repository-secret-scan.test.ts`.
- Resume condition: only proceed to the first commit after the plan is fully hardened, the real legacy freeze is generated and independently verified, all Task 1 required checks are freshly GREEN, and staged index contents pass immutable Secret scanning.

### 2026-07-17 18:51 CST - Task 1 repository constitution ready for commit

- Status: DONE. This closes Task 1 implementation/evidence only; MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Plan revision: Tasks 6-9 now require an explicit Electron package `files` allowlist, unpacked and extracted-packaged artifact Secret scans, immutable legacy-freeze re-verification without regeneration, clean-clone and required-CI reproducibility, and an unambiguous two-commit closeout (`subject commit -> evidence-only child commit`). The final verifier checks the child/parent evidence chain without treating the evidence commit as the tested subject.
- Imported authority: the pre-review manifest included two documents later rejected by the exact allowlist. The 2026-07-19 checkpoint supersedes this line as approved-set evidence. No legacy source, legacy OpenSpec state, old PLAN_LEDGER, or historical PASS report was imported.
- Legacy freeze: source HEAD `f8f859a85cb7fed2200bb7aee7a6407131fbb30e`; dirty-fact hash `dd88d6466ef0645143360a383b91fdd2bf5cfaa38e718cd8dfaaf1c1aed23724`; 835 tracked/untracked/deleted path facts. Ignored files were excluded, known credential-bearing paths received metadata only, and the independent verifier compared path/Git state/kind/size/hash rather than counts.
- Git constitution: branch `codex/ms0-repository-constitution`; repository-local identity `lixin / xin.li@quvideo.com`; global identity was not modified.
- Toolchain: Node `v24.11.0`, pnpm `10.33.2`, gitleaks `8.28.0`. The Darwin arm64 archive checksum and extracted binary equality were verified. Root packaging is prohibited by fail-closed `prepack`.
- Workspace constitution: all eight target apps/packages have real `typecheck`, `test`, and `build` scripts; root gates call the workspace checker and do not use `--if-present`.
- TDD controls observed before GREEN:
  - repository policy/OpenSpec: missing implementation modules caused two failing suites.
  - legacy freeze: missing generator/verifier module failed; field mutation and equal-count/different-facts controls remain covered.
  - workspace policy: real repository check failed with 24 missing-script violations before the eight manifests were created.
  - artifact/gitleaks: missing modules failed; CLI import and pnpm `--` argument regressions failed before their fixes; unborn-index gitleaks clean/leak control failed before the immutable patch/stdin path was implemented.
  - clean-clone import verification: removing the source fixture initially caused default verification to fail; target-only default plus explicit `--verify-source` then passed.
- Required-test attempt history (preserved; reruns do not hide failures):
  - final pre-stage attempt 1: `37/38` passed; the real Git freeze integration case took 5.282s and exceeded Vitest's default 5s timeout. Its assertions and process boundary were unchanged; only that integration case received a local 15s timeout.
  - focused freeze verification after the fix: `6/6` passed in 14.72s; full parallel attempt then passed `38/38` in 18.06s.
  - the next full parallel attempt exposed the artifact CLI integration case at 5.212s over the default timeout, with `37/38` passed. That nested pnpm/tsx/gitleaks case alone received a local 15s timeout; no global timeout changed.
  - two consecutive full parallel attempts after both fixes passed `38/38` in 17.52s and 22.01s respectively.
- Fresh commands and results:
  - `pnpm install --frozen-lockfile=false`: exit 0, lockfile current.
  - `pnpm run toolchain:bootstrap`: exit 0, pinned gitleaks installed after official archive checksum verification.
  - `pnpm run toolchain:check`: exit 0.
  - `pnpm run format:check`: exit 0, 64 files checked, no fixes required.
  - `pnpm run lint`: exit 0, 64 files checked, no warnings/errors.
  - `pnpm run spec:verify`: exit 0 against the pre-review manifest, without requiring the legacy checkout. This result was later invalidated as approved-set evidence by specification review.
  - `pnpm exec tsx scripts/constitution/verify-spec-import.ts --verify-source`: exit 0 against the pre-review source/manifest/target set. This result was later invalidated as approved-set evidence by specification review.
  - `pnpm run openspec:validate`: exit 0. Evidence: STRUCTURAL_CHECK / PASS.
  - `pnpm exec vitest run scripts/constitution scripts/legacy/create-freeze-manifest.test.ts`: exit 0, 9 files and 39 tests passed. Evidence: REAL_TEST / PASS, including rejection controls.
  - `pnpm run typecheck`: exit 0, eight workspaces passed.
  - `pnpm run test`: exit 0 before the final clean-clone regression, 38 root-script tests plus eight workspace module tests passed; the amended-commit verification reruns this command with the added test.
  - `pnpm run build`: exit 0, eight workspaces built.
  - `pnpm run secret:check`: exit 0. Evidence: REAL_TEST / PASS; pinned gitleaks plus Sartre-specific staged/untracked checks.
  - `pnpm exec tsx scripts/legacy/create-freeze-manifest.ts --source "/Users/xy/personal/Sartre(agent-workspace-design)" --output reference/legacy-freeze/manifest.json`: exit 0, 835 facts generated before the first implementation commit.
  - `pnpm exec tsx scripts/legacy/verify-freeze-manifest.ts --source "/Users/xy/personal/Sartre(agent-workspace-design)" --manifest reference/legacy-freeze/manifest.json`: exit 0, 835 facts independently verified. Evidence: REAL_TEST / PASS.
  - `pnpm run secret:artifacts -- apps/electron-app/dist apps/hub-api/dist apps/hub-worker/dist apps/local-runtime/dist packages/contracts/dist packages/domain/dist packages/runtime-core/dist packages/sdk/dist`: exit 0, eight explicit build-output paths scanned by gitleaks plus supplemental checks. Evidence: REAL_TEST / PASS.
  - `pnpm pack`: exit 1 as required with `root_packaging_prohibited`; no root package artifact was produced. Evidence: REAL_TEST / PASS negative control.
  - temporary-index `git add`, `git diff --cached --check`, forbidden-path enumeration, and `pnpm run secret:check -- --index`: exit 0 across 108 files. Evidence: REAL_TEST / PASS.
  - two explicit exclusion pathspec attempts returned non-zero because Git treated the ignored directory itself as an explicitly requested path; neither attempt is recorded as PASS. `git check-ignore -q .local-secrets/development.env` followed by `git add -A -- .` then exited 0, and the actual 108-file index passed forbidden-path, whitespace, and pinned gitleaks/supplemental Secret checks.
  - Secret permission metadata check: exit 0; directory mode 700 and file mode 600. No credential content was read.
- Skipped/not yet applicable: Task 2 architecture/contracts, PostgreSQL/Migration, process health, diagnostic timeline, Electron packaging, clean-clone/CI closeout, SAST/dependency/license closeout, signing/notarization, and MS0 Harness. Electron packaged-payload scanning is registered and required in Task 6/9; Task 1 has no Electron package and therefore makes no packaged-app PASS claim.
- Risks:
  - The freeze is intentionally a dirty source snapshot; later legacy drift must not rewrite it.
  - Only Darwin arm64 gitleaks was installed and executed locally; Linux/Darwin x64/arm64 archive checksums are pinned, but other platform bootstrap remains CI evidence for Task 9.
  - The eight workspace module shells prove repository-script enforcement and compilation only; they contain no identity, Requirement, Session, Agent, health, database, or diagnostic behavior.
  - Root `sast`, dependency, license, architecture, database, health, package, and Harness entrypoints exist for later MS0 tasks; several intentionally remain non-PASS until their owning task, and Task 1 does not claim those gates complete.
  - Post-commit self-review found and fixed a clean-clone reproducibility issue: default spec verification no longer requires the absolute legacy checkout; explicit `--verify-source` retains the stronger local provenance audit.
- Next command: stage this final ledger delta, rerun `git diff --cached --check` and `pnpm run secret:check -- --index`, then `git commit -m "chore(ms0): initialize repository constitution"`.
- Resume: verify local branch/identity and absence of forbidden index paths; rerun format/lint/38 Task 1 tests/spec/OpenSpec/freeze/Secret gates if any tracked Task 1 file changed; never read ignored credential contents or regenerate the freeze manifest.

### 2026-07-19 16:53 CST - Task 1 specification review repair

- Status: IN_PROGRESS. Task 1 implementation is repaired and awaiting specification/code-quality re-review; MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Review result entering this checkpoint: FAIL. The import verifier trusted the manifest-defined set instead of an immutable approved set, the generator dynamically enumerated source directories and included two unapproved documents, and the repository policy iterated expected workspaces without comparing the actual package-root set.
- Preserved RED evidence:
  - Controller reproduction `pnpm exec vitest run scripts/constitution/spec-import-manifest.test.ts scripts/constitution/repository-policy.test.ts`: exit 1, `4 failed | 6 passed`. The four expected failures proved extra/missing manifest entries and extra/missing workspace roots were not rejected.
  - Expanded negative controls with immutable allowlist, duplicate/mapping-drift, and workspace symlink cases: exit 1, `8 failed | 6 passed`. Failures were caused by the missing behavior, not test syntax.
  - Post-amend bypass self-review added source-root substitution and unexpected workspace-symlink controls. The focused command exited 1 with `3 failed | 13 passed`, proving both bypasses before the hardening implementation.
- Fixes:
  - Added one runtime-frozen, typed, exact 27-entry source-target allowlist shared by manifest generation and verification. The approved set is all current files under `spec/**` and `workflow/**`, plus the exact master plan, complete design, ADR-0004/0005, architecture overview, and database schema paths.
  - Enforce-approved verification now rejects `manifest_entry_extra`, `manifest_entry_missing`, `manifest_entry_duplicate`, and `manifest_mapping_drift` before hash verification. Default target verification remains source-independent; explicit `--verify-source` checks source provenance. Typed options replaced the former unsafe test casts.
  - Removed `docs/00-domain-model.md` and `docs/reviews/architecture-spec-self-review-2026-07-17.md` from the target and regenerated only `reference/spec-import-manifest.json` with 27 entries. The legacy freeze manifest was not regenerated or changed.
  - Repository policy now enumerates only regular `package.json` files in immediate regular directories below `apps/*` and `packages/*`, does not follow a workspace-directory or manifest symlink escape, compares the exact set to `EXPECTED_WORKSPACES`, emits `workspace_unexpected` / `workspace_missing`, then performs the existing required-script checks.
  - The approved source root is a shared immutable constant. Enforce-approved verification rejects `manifest_source_root_drift` before any optional source read, preventing a substituted target checkout from impersonating source provenance.
  - Expected workspace symlinks remain missing; unexpected directory or package-manifest symlinks are rejected as `workspace_unexpected` without following the target.
- Fresh commands and results before amend:
  - Focused GREEN: `pnpm exec vitest run scripts/constitution/spec-import-manifest.test.ts scripts/constitution/repository-policy.test.ts`: exit 0, `2 files | 14 tests passed`.
  - Manifest generation: `pnpm exec tsx scripts/constitution/create-spec-import-manifest.ts`: exit 0, 27 approved document hashes written.
  - First `pnpm run format:check`: exit 1, two formatter-only layout differences. Both were corrected with no behavior change; the fresh rerun exited 0 with 64 files checked.
  - `pnpm run lint`: exit 0, 64 files checked.
  - `pnpm run typecheck`: exit 0; exact workspace policy and all eight workspace typechecks passed.
  - `pnpm run test`: exit 0; root scripts passed `9 files | 47 tests`, then eight workspace module tests passed (`55` total tests).
  - `pnpm run build`: exit 0; all eight workspaces built.
  - `pnpm run spec:verify`: exit 0, exactly 27 approved target hashes verified without source access.
  - `pnpm exec tsx scripts/constitution/verify-spec-import.ts --verify-source`: exit 0, exactly 27 approved source/manifest/target mappings and hashes verified.
  - `pnpm run openspec:validate`: exit 0.
  - `pnpm exec tsx scripts/legacy/verify-freeze-manifest.ts --source "/Users/xy/personal/Sartre(agent-workspace-design)" --manifest reference/legacy-freeze/manifest.json`: exit 0, the unchanged manifest verified across 835 path facts.
  - `pnpm run secret:check`: exit 0; pinned gitleaks and supplemental repository boundary passed.
  - `pnpm run secret:artifacts -- apps/electron-app/dist apps/hub-api/dist apps/hub-worker/dist apps/local-runtime/dist packages/contracts/dist packages/domain/dist packages/runtime-core/dist packages/sdk/dist`: exit 0, eight explicit build-output paths passed.
  - `pnpm pack`: exit 1 with the required `root_packaging_prohibited` negative control; no root package was produced.
  - Independent allowlist inventory: exit 0, the immutable allowlist exactly matched 27 source documents. `/usr/bin/find apps packages -mindepth 2 -maxdepth 2 -name package.json -type f -print`: exit 0 and enumerated exactly the eight approved regular package roots.
  - Final staging contained only the 10 approved Task 1 repair paths. `pnpm run secret:check -- --index`, the full-index forbidden-path scan, `git diff --cached --check`, `git diff --check`, the untracked-file assertion, and `git diff --quiet`: all exit 0.
  - After bypass hardening, focused GREEN passed `2 files | 16 tests`; fresh format/lint/typecheck/build/spec/OpenSpec all exited 0; root tests passed `9 files | 49 tests` plus eight workspace tests (`57` total). The first format attempt after this hardening exited 1 on one layout-only difference, which was corrected before the fresh successful run.
  - The follow-up amend staged only six already-approved repair paths. Immutable index Secret, forbidden-path, cached/worktree whitespace, untracked, and index/worktree consistency checks all exited 0 before amend.
- Risks and boundaries:
  - Task 1 reviewer approval is still required. This checkpoint does not claim MS0 completion or Task 2 evidence.
  - The absolute legacy source is needed only for explicit provenance audit; clean-clone `spec:verify` verifies target hashes and manifest shape without mounting it.
  - Workspace enumeration intentionally ignores nested packages because the workspace constitution approves only immediate roots; any immediate directory or package-manifest symlink fails closed without being followed.
  - The final commit SHA is necessarily verified after amend by the controller; it cannot be embedded in the same commit. In-file recovery identity is the clean branch `HEAD` with subject `chore(ms0): initialize repository constitution`.
- Next: stage only the approved Task 1 repair paths, run immutable index path/whitespace/Secret scans, amend the existing Task 1 commit, then rerun critical gates from clean amended `HEAD`. After reviewers approve, run only the Task 2 RED command recorded in the top resume procedure.

### 2026-07-19 17:27 CST - Task 1 second specification re-review repair

- Status: IN_PROGRESS. The second re-review FAIL is repaired locally and awaits final specification/code-quality review; MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Review result entering this checkpoint: FAIL with three concrete path-boundary defects.
  - Full repository Secret scanning covered immutable index blobs and untracked paths but omitted tracked worktree modifications.
  - Staged symlink checks used only lexical normalization, so an ignored intermediate alias could route into the forbidden Secret directory, outside the repository, or through a loop without rejection.
  - Workspace inventory classified symlinks as unsafe, but the later required-script loop independently called `readJson` on every expected path and followed an external workspace/package symlink.
- Preserved RED evidence:
  - `pnpm exec vitest run scripts/constitution/repository-secret-scan.test.ts scripts/constitution/secret-boundary.test.ts scripts/constitution/repository-policy.test.ts`: exit 1, `6 failed | 24 passed`. The failures were the tracked dirty Secret, three intermediate-alias cases, and two external invalid-JSON workspace cases.
  - Post-fix self-review found lexical `alias/..` collapse could hide traversal through a forbidden intermediate alias before returning to a safe final path. The dedicated repository Secret suite exited 1 with `1 failed | 19 passed` before the segment-wise resolver replaced lexical collapse.
- Fixes:
  - Full scanning now combines immutable index blobs, Git-enumerated tracked worktree paths, and Git-enumerated non-ignored untracked paths. It does not perform broad filesystem traversal.
  - Every tracked/untracked worktree path is checked with `lstat` and repository containment before any content read. Regular files are read only from a contained `realpath`; deleted tracked files are skipped; symlinks use `readlink` and path metadata only and never read target content.
  - Staged symlink content still comes from the immutable index blob. Its target is resolved segment by segment with `lstat`/`readlink`, a loop/depth guard, and the first missing in-repository segment as the safe broken-path boundary. Forbidden segments, repository escape, loops, unsafe errors, and traversal through a forbidden intermediate alias fail closed.
  - Workspace inventory now records a contained regular `safeManifests` map. Required-script validation reads only those classified paths; expected workspace directory or package-manifest symlinks produce stable `workspace_missing` / `workspace_script_missing` violations without following or parsing the external target.
- Fresh commands and results before amend:
  - Focused GREEN: `pnpm exec vitest run scripts/constitution/repository-secret-scan.test.ts scripts/constitution/secret-boundary.test.ts scripts/constitution/repository-policy.test.ts`: exit 0, `3 files | 31 tests passed`.
  - First `pnpm run format:check`: exit 1 on one formatter-only layout difference; after the exact layout correction, the fresh rerun exited 0 with 64 files checked.
  - `pnpm run lint`: exit 0, 64 files checked.
  - `pnpm run typecheck`: exit 0; repository policy and all eight workspace typechecks passed.
  - `pnpm run test`: exit 0; root scripts passed `9 files | 58 tests`, then eight workspace module tests passed (`66` total tests).
  - `pnpm run build`: exit 0; all eight workspaces built.
  - `pnpm run spec:verify`: exit 0, exactly 27 approved target hashes verified.
  - `pnpm exec tsx scripts/constitution/verify-spec-import.ts --verify-source`: exit 0, exactly 27 approved source/manifest/target mappings and hashes verified.
  - `pnpm run openspec:validate`: exit 0.
  - `pnpm exec tsx scripts/legacy/verify-freeze-manifest.ts --source "/Users/xy/personal/Sartre(agent-workspace-design)" --manifest reference/legacy-freeze/manifest.json`: exit 0, the unchanged manifest verified across 835 path facts; it was not regenerated.
  - `pnpm run secret:check` and `pnpm run secret:check -- --index`: exit 0.
  - `pnpm run secret:artifacts -- apps/electron-app/dist apps/hub-api/dist apps/hub-worker/dist apps/local-runtime/dist packages/contracts/dist packages/domain/dist packages/runtime-core/dist packages/sdk/dist`: exit 0, eight explicit build-output paths passed.
  - `pnpm pack`: exit 1 with required `root_packaging_prohibited`; no root package was produced.
  - Final staging contained only the five approved Task 1 repair paths. Full repository and index-only Secret scans, the full-index forbidden-path scan, `git diff --cached --check`, `git diff --check`, the untracked-file assertion, and index/worktree consistency check all exited 0.
- Content-read self-review:
  - Ignored paths never enter the tracked or `--others --exclude-standard` content lists. Intermediate ignored aliases are inspected only through path metadata needed to classify a staged link.
  - External and symlink target content is never opened. Symlink checks consume only the index link blob plus `lstat`/`readlink` metadata; workspace scripts are parsed only from the contained inventory map.
  - A safely broken target below a contained existing directory remains allowed. A loop, broken intermediate symlink, permission/metadata error, forbidden segment, or repository escape fails closed.
- Risks and boundaries:
  - Filesystem metadata can change after a point-in-time scan; required gates therefore rescan the immutable index and current worktree immediately before amend and again from clean amended `HEAD`.
  - Task 1 reviewer approval is still required. No Task 2 command was run and this checkpoint does not claim MS0 completion.
  - The final commit SHA is verified after amend by the controller; it cannot self-reference inside this commit. Recovery identity remains clean branch `HEAD` with subject `chore(ms0): initialize repository constitution`.
- Next: stage only the five Task 1 repair paths, run immutable index/worktree Secret, forbidden-path, whitespace, untracked, and containment checks, amend the sole Task 1 commit, then rerun all critical gates from clean amended `HEAD`. After final reviewers approve, run only the Task 2 RED command in the top resume procedure.

### 2026-07-19 17:54 CST - Task 1 third specification re-review repair

- Status: IN_PROGRESS. The third final specification review FAIL is repaired locally and awaits final reviewers; MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Review result entering this checkpoint: FAIL with three blockers.
  - The metadata resolver allowed `outer -> ignored alias/child` when the alias itself was a broken link to a missing directory, because it did not distinguish a directly broken final target from a missing intermediate expansion with unresolved suffix.
  - Required `.dockerignore` lines could be followed by an active negation that re-included a forbidden path; the prior check was not an effective-context proof.
  - Task 9 contained two empty `pnpm run secret:artifacts` commands and did not define deterministic unpacked/extracted Electron payload paths and cleanup.
- Preserved RED evidence:
  - `pnpm run secret:artifacts`: exit 1 with `artifact_path_required`. This confirms the existing empty Task 9 commands were fail-closed but unusable as positive gates.
  - `pnpm exec vitest run scripts/constitution/repository-secret-scan.test.ts scripts/constitution/repository-policy.test.ts scripts/constitution/implementation-plan-policy.test.ts`: exit 1, `5 failed | 30 passed`. Failures covered the broken intermediate alias, missing root Docker command, active negation, unsafe external `.dockerignore` symlink, and empty/non-deterministic plan commands.
- Fixes:
  - Resolver state now records whether an intermediate symlink has expanded. A direct final broken target below the repository remains safe; a missing path after intermediate expansion with unresolved suffix fails closed. Existing loop, escape, forbidden-segment, and `alias/..` rejection behavior remains covered.
  - Added `docker-context:check`. It reads only a contained regular `.dockerignore`, requires the complete exclusion set, ignores comments/blank lines, rejects every active negation with stable `dockerignore_negation_unsafe`, and fails closed when the file is missing, unreadable, symlinked, or outside. It never walks the context or forbidden directories.
  - Added synthetic policy controls with forbidden sentinel directories. They prove the structural checker does not traverse those paths. This evidence is STRUCTURAL_CHECK / PASS, not REAL_TEST of an enumerated Docker context.
  - Task 6 now requires deterministic Electron `productName`, `artifactName`, and explicit package `files` allowlist, plus a tested `extract-electron-payload.ts` that Task 9 can reuse.
  - Both Task 9 artifact gates now run `docker-context:check`, create a temporary extracted-payload directory with EXIT cleanup, invoke the planned extractor, and pass a non-empty explicit list containing all eight build roots, the unpacked `Sartre.app`, deterministic DMG, and separately extracted `Sartre.app`. Existing `artifact_path_missing` semantics block every absent requested path.
- Fresh commands and results before amend:
  - Focused GREEN: the three-suite command above exited 0 with `3 files | 35 tests passed`.
  - First `pnpm run format:check`: exit 1 on one formatter-only layout difference; after correction the fresh run exited 0 with 66 files checked.
  - First `pnpm run lint` after that correction exited 0 but reported one test-string warning. The test string was rewritten without changing its assertion; fresh `pnpm run lint` exited 0 with 66 files and no warnings.
  - `pnpm run typecheck`: exit 0; repository/Docker policy and all eight workspace typechecks passed.
  - `pnpm run docker-context:check`: exit 0 with structural-policy PASS and no context enumeration.
  - `pnpm run test`: exit 0; root scripts passed `10 files | 65 tests`, then eight workspace tests passed (`73` total tests).
  - `pnpm run build`: exit 0; all eight workspaces built.
  - `pnpm run spec:verify`: exit 0, exactly 27 approved target hashes verified.
  - `pnpm exec tsx scripts/constitution/verify-spec-import.ts --verify-source`: exit 0, exactly 27 source/manifest/target mappings and hashes verified.
  - `pnpm run openspec:validate`: exit 0.
  - `pnpm exec tsx scripts/legacy/verify-freeze-manifest.ts --source "/Users/xy/personal/Sartre(agent-workspace-design)" --manifest reference/legacy-freeze/manifest.json`: exit 0 across 835 unchanged path facts; the freeze was not regenerated.
  - Full repository and index-only Secret scans: exit 0.
  - Explicit eight-build-root artifact scan: exit 0. No packaged-app PASS is claimed because Task 6 artifacts do not exist yet.
  - `pnpm pack`: exit 1 with required `root_packaging_prohibited`.
  - Plan-policy self-review found no empty artifact command; it verified three Docker policy commands, deterministic temp cleanup, fail-closed missing-path text, and all required explicit artifact paths.
  - Final staging contained only the nine approved Task 1 repair paths. Full/index Secret, Docker structural policy, full-index forbidden-path, cached/worktree whitespace, untracked, and index/worktree consistency checks all exited 0.
- Risks and boundaries:
  - Docker evidence here is structural only. Task 9 must not label it REAL_TEST unless a separate real target-context enumerator is later implemented and executed safely.
  - `extract-electron-payload.ts`, the explicit Electron package allowlist, unpacked app, DMG, and extracted app are Task 6 deliverables. Their absence remains BLOCKED through `artifact_path_missing`; this checkpoint does not claim package evidence.
  - Task 1 reviewer approval is still required. No Task 2 command was run and MS0 is not complete.
  - The final commit SHA is verified after amend by the controller and cannot self-reference inside this commit. Recovery identity remains clean branch `HEAD` with subject `chore(ms0): initialize repository constitution`.
- Next: stage only the approved Task 1 repair paths, run full/index Secret, Docker policy, forbidden-path, whitespace, untracked, and index/worktree consistency checks, amend the sole Task 1 commit, then rerun critical gates from clean amended `HEAD`. After reviewers approve, run only the Task 2 RED command in the top resume procedure.

### 2026-07-19 18:19 CST - Task 1 fourth specification re-review repair

- Status: IN_PROGRESS. The fourth specification review HIGH is repaired locally and awaits final reviewers; MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Review result entering this checkpoint: FAIL. `verifyImportEntries` accumulated manifest-shape/source-root violations but continued into target/source hash reads. An unapproved directory or symlinked outside sentinel therefore raised `EISDIR` instead of failing before content access.
- Preserved RED evidence:
  - `pnpm exec vitest run scripts/constitution/spec-import-manifest.test.ts`: exit 1, `5 failed | 9 passed`.
  - Three no-read controls raised `EISDIR`: unapproved external target directory, drifted external source-root directory with explicit source verification, and an approved target symlink to an outside directory sentinel.
  - The approved source-symlink containment phase was absent, and an invalid entry object reached path operations before schema rejection.
- Fixes:
  - `verifyImportEntries` now validates every runtime entry field and SHA-256 shape first. Any `manifest_schema_invalid` returns immediately without path resolution or filesystem access.
  - Enforce-approved mode then validates fixed source root, exact 27 source-target mappings, duplicate/missing/extra entries, and mapping drift. Any structural violation returns immediately before metadata or content access.
  - Only structurally exact entries enter the contained-file phase. All targets first pass lexical containment, `lstat`, regular-file/no-symlink, `realpath`, and canonical containment. Explicit source verification performs the same metadata checks for every source only after target metadata succeeds. Any metadata violation returns before hashing.
  - Target-only verification never calls source metadata or source hash functions. Explicit source hashing occurs only after exact fixed source root/mappings and safe metadata for all target/source files.
  - Hash reads consume only canonical contained regular paths and convert a post-metadata read failure to stable `target_path_unsafe` / `source_path_unsafe` instead of throwing.
  - The CLI now validates the raw manifest object, schema version, generated timestamp, entry array, entry fields, and SHA shape before resolving entry paths.
- Fresh commands and results before amend:
  - Focused GREEN: `pnpm exec vitest run scripts/constitution/spec-import-manifest.test.ts`: exit 0, `1 file | 14 tests passed`.
  - First GREEN attempt passed 13 controls but exposed macOS `/var` -> `/private/var` canonical alias as a false external-path result. Separating lexical-root containment from canonical-root containment produced the final 14/14 GREEN without weakening either boundary.
  - First `pnpm run format:check`: exit 1 on one formatter-only test layout; after correction, the fresh run exited 0 with 66 files checked.
  - `pnpm run lint`: exit 0, 66 files and no warnings.
  - `pnpm run typecheck`: exit 0; repository policy and all eight workspace typechecks passed.
  - `pnpm run spec:verify`: exit 0, exactly 27 target mappings/hashes verified without source metadata access.
  - `pnpm exec tsx scripts/constitution/verify-spec-import.ts --verify-source`: exit 0, exactly 27 source/target mappings, safe paths, and hashes verified.
  - `pnpm run test`: exit 0; root scripts passed `10 files | 70 tests`, then eight workspace tests passed (`78` total tests).
  - `pnpm run build`: exit 0; all eight workspaces built.
  - `pnpm run openspec:validate`: exit 0.
  - Real legacy verifier: exit 0 across 835 unchanged path facts; the freeze was not regenerated.
  - Full/index Secret, Docker structural policy, and eight-build-root artifact scans: exit 0.
  - `pnpm pack`: exit 1 with required `root_packaging_prohibited`.
  - Final staging contained only the four approved Task 1 repair paths. Full/index Secret, Docker structural policy, full-index forbidden-path, cached/worktree whitespace, untracked, and index/worktree consistency checks all exited 0.
- No-external-read self-review:
  - Schema and manifest-shape failures return before `lstat`, `realpath`, `readFileSync`, or hashing entry paths.
  - Exact approved symlinks/directories/escapes are rejected by metadata before reads. Safe tmp directory sentinels deliberately cause `EISDIR` under the old order and return stable violations under the repaired order.
  - Default target verification does not touch source filesystem state; explicit source access is a separate final phase.
- Risks and boundaries:
  - Metadata/content replacement remains a point-in-time filesystem race; pre-amend and clean post-amend gates rescan the current tree and immutable index.
  - The contained-file phase is exported for direct boundary tests, while the production verifier/CLI always executes schema and exact-shape phases first.
  - Task 1 reviewer approval is still required. Task 2 was not run and MS0 is not complete.
  - The final commit SHA is verified after amend by the controller and cannot self-reference in this commit. Recovery identity remains clean branch `HEAD` with subject `chore(ms0): initialize repository constitution`.
- Next: stage only the four approved Task 1 repair paths, run full/index Secret, Docker policy, forbidden-path, whitespace, untracked, and index/worktree consistency checks, amend the sole Task 1 commit, then rerun critical gates from clean amended `HEAD`. After reviewers approve, run only the Task 2 RED command in the top resume procedure.

### 2026-07-19 18:51 CST - Task 1 fifth specification re-review repair

- Status: IN_PROGRESS. The fifth specification review found two HIGH blockers and one MEDIUM exact-fact defect. All three are repaired locally through focused TDD; full gates, amend, and final re-review remain pending. MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Review result entering this checkpoint:
  - HIGH: pinned gitleaks scanned history and staged input, while tracked dirty and nonignored untracked content received only the narrower Sartre supplemental regex. A gitleaks generic rule could therefore be absent from history/index and bypass full `secret:check`.
  - HIGH: repository policy enumerated the eight disk roots but did not validate `pnpm-workspace.yaml`, even though root `pnpm -r` gates use that configuration as their execution set. Missing, narrowed, or broadened patterns could disconnect exact disk inventory from actual recursive gates.
  - MEDIUM: the independent freeze verifier converted manifest entries to a `Map` before validating multiplicity, silently accepting a duplicate path fact.
- Preserved reproduction and RED evidence:
  - A safe synthetic generic gitleaks value assembled from the existing integration fixture produced direct gitleaks exit 1 while `scanTextForSecrets` returned no violation. In a temporary repository, history/staged gitleaks passed when the same input existed only as tracked-unstaged or nonignored-untracked content, while direct safe-file gitleaks rejected it.
  - `pnpm-workspace.yaml` missing or narrowed to one pattern produced zero repository-policy violations before the fix; the narrowed fixture selected only one project through pnpm. Focused RED: `gitleaks-integration.test.ts` exited 1 with `3 failed | 2 passed`; `repository-policy.test.ts` exited 1 with `6 failed | 14 passed`.
  - Appending a duplicate of the first fact to the unchanged 835-entry freeze produced `entryCount=836` and zero violations before the fix. Focused RED: `create-freeze-manifest.test.ts` exited 1 with `3 failed | 6 passed`, covering duplicate multiplicity, order drift, and invalid schema before source access.
- Fixes:
  - Full Secret verification now retains pinned history and staged scans and adds a separate redacted gitleaks stdin worktree channel. Tracked dirty paths come only from Git and pass contained metadata checks before a no-ext-diff/no-textconv index-to-worktree patch is created. Untracked input comes only from `git ls-files --others --exclude-standard -z`; contained regular files are read by canonical path, symlinks contribute link metadata only, and ignored/outside/unsafe content is never traversed or read. `--index` remains immutable-index only.
  - Repository policy now requires `pnpm-workspace.yaml` to be a contained regular non-symlink file and to match the strict canonical configuration whose only package patterns are `apps/*` and `packages/*`. Missing/symlinked, shrunk, expanded, excluded, or extra-key configurations fail closed before `pnpm -r` can under-select or expand the approved root set.
  - Freeze verification now runtime-validates the exact manifest/entry schema, rejects duplicate paths, and enforces strict lexical path ordering before any source access or keyed comparison. Validly shaped field drift retains fact-level `entry_mismatch` diagnostics.
- Focused GREEN and attempt history:
  - Secret focused GREEN: `3 files | 29 tests`; workspace policy GREEN: `1 file | 20 tests`; freeze GREEN: `1 file | 9 tests`.
  - The first combined six-suite run exited 1 with `4 failed | 68 passed`; all four were the default 5-second timeout in real Git/gitleaks process cases, with no assertion mismatch. Two gitleaks cases took about 6-7 seconds and two freeze mutation cases took about 5-6 seconds.
  - After adding per-case 15-second limits to the three new gitleaks worktree cases and the freeze mutation matrix, the second combined run exited 1 with `1 failed | 71 passed`; the remaining real-Git equal-count fact-set case timed out at 5.39 seconds, again with no assertion mismatch.
  - The freeze integration suite then received a suite-local 15-second timeout; no global timeout changed. The fresh third combined run exited 0 with `6 files | 72 tests passed`.
  - First format check exited 1 on three formatter-only layouts. After formatting only those paths, fresh format and lint exited 0 across 66 files. Typecheck exited 0 for repository policy and all eight workspaces.
- Fresh full pre-amend gates:
  - Format and lint exited 0 across 66 files; typecheck and build exited 0 for repository policy plus all eight workspaces.
  - `pnpm run test` exited 0 with `10 files | 83 root tests` plus eight workspace module tests (`91` total).
  - Target-only and explicit-source spec verification each validated the exact 27 approved mappings/hashes. OpenSpec validation exited 0.
  - The unchanged legacy freeze independently verified all 835 path facts; it was not regenerated.
  - Full worktree/history/index Secret and index-only Secret checks exited 0 with pinned gitleaks. Docker structural policy and eight explicit build-root artifact scans exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`; no root package artifact was produced.
- Risks and boundaries:
  - Safe metadata validation and subsequent Git patch/file reads remain point-in-time operations; full gates rescan the current worktree/index immediately before amend and from clean amended `HEAD`.
  - Strict byte-for-byte `pnpm-workspace.yaml` constitution intentionally rejects comments, alternate quoting, reordering, or future pnpm keys until the approved canonical configuration and tests change together.
  - No Task 2 command was run. This checkpoint is not reviewer approval or MS0 closeout evidence.
- Historical next at checkpoint creation: run full pre-amend test/build/spec/OpenSpec/freeze/Secret/Docker/artifact/root-pack gates, stage only the nine approved fifth-review paths including this ledger, run immutable index/worktree checks, amend the sole Task 1 commit, and rerun critical gates from clean amended `HEAD`. This sequence completed before the sixth checkpoint below; current recovery is governed by the top resume procedure.

### 2026-07-19 19:09 CST - Task 1 sixth specification re-review repair

- Status: IN_PROGRESS. The order fail-fast defect and recovery-ledger drift are repaired and verified; Task 1 still awaits final specification and code-quality reviewer approval. MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Review result entering this checkpoint:
  - A/B re-review passed: pinned gitleaks covered history, staged, safe tracked-dirty patch, and nonignored untracked input; `--index` excluded worktree access. The contained exact `pnpm-workspace.yaml`, disk roots, and root `pnpm -r` execution set were aligned.
  - MEDIUM: freeze `entry_order_mismatch` was evaluated only after `realpathSync`, Git source enumeration, and keyed fact comparison. A structurally invalid order could therefore access an unavailable source and throw first.
  - MEDIUM: the ledger top and fifth-checkpoint next text still described pre-amend work after the controller had already created and verified a clean amended `HEAD`.
- Preserved RED evidence:
  - The order regression test swapped the first two entries of a valid manifest and passed a nonexistent source sentinel. Before the fix, `create-freeze-manifest.test.ts` exited 1 with `1 failed | 8 passed`; the verifier threw `ENOENT` from source access instead of returning `entry_order_mismatch`.
- Fixes:
  - After runtime schema and duplicate validation, the verifier now enforces strictly increasing lexical manifest paths and returns `entry_order_mismatch` before `realpathSync`, Git, source enumeration, hashing, or keyed comparison.
  - The equal-count/different-fact-set fixture is sorted so it isolates missing/unexpected set comparison rather than triggering the independent order invariant.
  - The ledger top now identifies clean committed `HEAD` as the recovery subject and directs continuation through reviewer approval. Historical pre-amend next text is explicitly labeled historical rather than current.
- Fresh GREEN and pre-amend gates:
  - Freeze focused GREEN exited 0 with `1 file | 9 tests`; the combined focused command exited 0 with `6 files | 72 tests`.
  - Format/lint exited 0 across 66 files; repository policy and all eight workspace typechecks/builds passed.
  - Full tests passed `10 files | 83 root tests` plus eight workspace tests (`91` total).
  - Target-only and explicit-source spec verification each passed the exact 27 mappings; OpenSpec, unchanged 835-fact freeze, full/index Secret, Docker structural policy, and eight build-root artifact scans exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`.
- Risks and boundaries:
  - The existing point-in-time metadata/read race remains recorded; no ignored credential content, symlink target content, or external source content is intentionally read by the new structure-first checks.
  - No Task 2 command was run. No push occurred. This checkpoint is not MS0 closeout evidence.
- Resume: use only the top resume procedure. Verify the final clean `HEAD`, rerun `pnpm run secret:check`, and obtain both Task 1 reviewer approvals. Only then may the exact Task 2 RED command run.

### 2026-07-19 19:33 CST - Task 1 seventh code-quality review repair

- Status: DONE. Specification and code-quality re-reviews approved the final Task 1 implementation. This closes Task 1 only; MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Review result entering this checkpoint:
  - IMPORTANT: the tracked worktree gitleaks channel used `git diff --name-only` and a Git patch. `--no-textconv` disables external diff text conversion but does not bypass `.gitattributes` clean filters. A clean filter could transform physical credential bytes into the same safe bytes as the index, making Git report no dirty path while the narrower supplemental regex also missed the gitleaks generic rule.
- Preserved reproduction and RED evidence:
  - A temporary repository configured `*.txt filter=scrub`, committed safe content, then replaced the physical tracked file with the existing high-entropy synthetic generic credential. Before the fix the reproduction returned `gitNameCount=0`, zero supplemental violations, history/staged gitleaks PASS, and worktree gitleaks PASS.
  - The real clean-filter regression test exited 1 with `1 failed | 5 passed`; the expected physical worktree rejection was missing.
- Fix:
  - Full worktree gitleaks no longer uses Git diff content or dirty-name detection. It enumerates every Git-indexed tracked path plus only `git ls-files --others --exclude-standard -z` untracked paths, applies the existing contained metadata classification, and frames the physical canonical regular-file bytes deterministically for pinned gitleaks stdin.
  - Symlinks contribute only link metadata and never target content. Deleted tracked files are skipped because their immutable/index/history content is covered separately. Ignored, outside, forbidden, unsafe, or unreadable paths are never broad-walked and fail closed.
  - Full `secret:check` therefore sees the same physical bytes that a build reads even when clean/smudge filters alter Git's comparison view. `--index` remains immutable-only and never invokes the worktree channel.
- Fresh GREEN and full pre-amend gates:
  - Secret focused GREEN exited 0 with `3 files | 30 tests`; the combined focused command passed `6 files | 73 tests`.
  - The first format check exited 1 on one formatter-only layout. After formatting that exact test file, fresh format/lint passed all 66 files; typecheck and build passed repository policy plus all eight workspaces.
  - Full tests passed `10 files | 84 root tests` plus eight workspace tests (`92` total).
  - Target-only/explicit-source spec each passed 27 mappings; OpenSpec, unchanged 835-fact freeze, full/index Secret, Docker structural policy, and eight explicit build-root artifact scans exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`.
- Final independent reviews:
  - Specification review: APPROVED with no remaining Task 1 blocker.
  - Code-quality re-review: APPROVED with no Critical or Important issue. Reviewer-focused gitleaks integration passed `6/6`, repository Secret regression passed `21/21`, and the final worktree was clean with `git diff --check` PASS.
- Performance and false-positive boundary:
  - Full Secret verification now intentionally re-scans all 108 tracked physical paths instead of only Git-reported dirty paths. The full command remained about 30 seconds including pinned archive/binary verification and history/staged scans; current tracked fixtures produced no false positive.
  - Worktree input is assembled in memory. This is acceptable for the small Task 1 constitution tree; future large-repository use should introduce a bounded streaming implementation rather than re-trusting Git content filters.
- Risks and boundaries:
  - Metadata classification and the subsequent physical read remain point-in-time operations and are rescanned immediately before amend and from clean amended `HEAD`.
  - The accepted nonblocking code-quality Minor is O(total tracked bytes) in-memory worktree framing. It is bounded by the current 108-path Task 1 repository and should become streaming only when later repository scale requires it.
  - No Task 2 command was run and no push occurred. Task 1 approval is not MS0 closeout evidence.
- Resume: use only the top resume procedure. Verify final clean `HEAD`, rerun `pnpm run secret:check`, then run only the exact Task 2 RED command.

### 2026-07-19 20:20 CST - Task 2 module boundaries and shared contracts ready for review

- Status: IN_PROGRESS. Task 2 implementation and local verification are complete, but independent specification and code-quality approvals are still required. MS0 remains IN_PROGRESS and Task 3 has not started.
- Change: `ms0-repository-constitution`.
- Scope:
  - Added Zod 4 contracts and inferred TypeScript types for the controlled ErrorCode catalog, exact `Result<T>` union, complete `DiagnosticContext`, `HealthSnapshot`, and `EvidenceManifest` metadata.
  - Kept nullable non-applicable diagnostic identifiers as required fields. Diagnostic UUID/timestamp/status/error-code structure is stable, while extra Secret, local-path, and raw-output fields fail closed.
  - Evidence metadata separates `evidenceLevel` from `status`, binds subject commit/tree/dirty hash, release/artifact/environment/tool metadata, and records argv/exit/assertions. This schema does not claim to prove Task 3 Harness execution or a real failure mode.
  - Added a TypeScript AST architecture checker for static import/export, `require()`, one/two-argument dynamic `import()`, package manifests, root/module path aliases, and project references. All dependency forms resolve to the same eight-module graph.
  - Added renderer, app-source, pure-domain, legacy-noun, tracked/build Secret, forbidden Secret-path, contained-file, and stable CLI output boundaries. Target-tree symlinks fail closed without reading their target content.
- Changed files:
  - `packages/contracts/package.json`, `packages/contracts/src/contracts.test.ts`, `packages/contracts/src/diagnostics.ts`, `packages/contracts/src/error-catalog.ts`, `packages/contracts/src/evidence.ts`, `packages/contracts/src/health.ts`, `packages/contracts/src/index.ts`, `packages/contracts/src/result.ts`.
  - `packages/domain/package.json`, `packages/sdk/package.json`, `packages/runtime-core/package.json`, and `pnpm-lock.yaml`.
  - `scripts/architecture/check.ts`, `scripts/architecture/check.test.ts`, `scripts/architecture/fixtures/repository.ts`, and this ledger.
- Preserved TDD RED and attempt history:
  - The controller's pre-test command found no test file and is not behavioral RED. After the test file existed, `pnpm exec vitest run packages/contracts/src/contracts.test.ts` exited 1 because `./diagnostics.js` was absent. This is the effective contracts missing-module RED.
  - The first contracts GREEN attempt ran 32 tests with `31 passed | 1 failed`; the test compared two independently generated UUID fixtures. Reusing the same input object fixed the fixture without changing contract semantics; the next run passed 32/32.
  - After architecture tests and fixture helpers existed, `pnpm exec vitest run scripts/architecture/check.test.ts` exited 1 because `./check.js` was absent. This is the effective architecture missing-module RED.
  - The initial checker passed 26/26. Self-review then added a two-argument dynamic-import bypass and extensionless Docker build-file Secret control. The first added control produced `1 failed | 25 passed`; the combined controls produced `2 failed | 25 passed`. After the focused fixes, architecture passed 27/27 and production `architecture:check` passed.
  - The first full format command exited 1 on four Task 2 files. After formatting only those files, format passed. Lint then exited 0 but reported one unused-import warning; it was treated as not closed, removed, and the fresh lint run had no warnings.
  - A staged self-review added strict standalone TypeScript compilation for the architecture script files because root workspace `typecheck` does not include `scripts/`. The first command exited 2: `ReturnType<typeof readdirSync>` selected the Buffer-name overload and produced six `Dirent<NonSharedBuffer>` assignment/use errors. The checker now declares `Dirent<string>[]` explicitly; the same strict command then exited 0.
  - Two combined/root-test attempts returned only a Vitest start fragment without a final exit code and are not recorded as PASS. A fresh independently tracked root-test session was polled to final exit 0.
- Fresh Task 2 commands and results:
  - `pnpm install --frozen-lockfile --strict-peer-dependencies`: exit 0; all nine workspace projects used the current lockfile with strict peers.
  - `pnpm run format:check`: exit 0; 75 files checked with no fixes.
  - `pnpm run lint`: exit 0; 75 files checked with no warnings.
  - `pnpm run typecheck`: exit 0; repository policy and all eight workspace typechecks passed.
  - `pnpm exec tsc --noEmit --target ES2024 --module NodeNext --moduleResolution NodeNext --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --noImplicitOverride --useUnknownInCatchVariables --verbatimModuleSyntax --skipLibCheck --types node,vitest scripts/architecture/check.ts scripts/architecture/check.test.ts scripts/architecture/fixtures/repository.ts`: exit 0 after the preserved staged self-review failure above.
  - `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/architecture/check.test.ts`: exit 0, `2 files | 73 tests passed`. Evidence: REAL_TEST / PASS, including controlled rejection and checker negative controls.
  - `pnpm run test`: exit 0; root scripts passed `11 files | 112 tests`, then all eight workspace suites passed, including `46` contracts tests. Evidence: REAL_TEST / PASS.
  - `pnpm run build`: exit 0; all eight workspaces built.
  - Post-build `pnpm run architecture:check`: exit 0. Evidence: STRUCTURAL_CHECK / PASS only.
- Fresh Task 1 safety and boundary commands:
  - `pnpm run spec:verify`: exit 0, exactly 27 approved target mappings/hashes.
  - `pnpm exec tsx scripts/constitution/verify-spec-import.ts --verify-source`: exit 0, exactly 27 approved source/target mappings/hashes.
  - `pnpm run openspec:validate`: exit 0. Evidence: STRUCTURAL_CHECK / PASS.
  - `pnpm exec tsx scripts/legacy/verify-freeze-manifest.ts --source "/Users/xy/personal/Sartre(agent-workspace-design)" --manifest reference/legacy-freeze/manifest.json`: exit 0 across 835 unchanged path facts; the freeze was not regenerated.
  - `pnpm run docker-context:check`: exit 0 without enumerating Docker context contents. Evidence: STRUCTURAL_CHECK / PASS.
  - `pnpm run secret:check`: exit 0 with pinned full history/index/worktree scanning. Evidence: REAL_TEST / PASS.
  - `pnpm run secret:artifacts -- apps/electron-app/dist apps/hub-api/dist apps/hub-worker/dist apps/local-runtime/dist packages/contracts/dist packages/domain/dist packages/runtime-core/dist packages/sdk/dist`: exit 0 across eight explicit build roots. Evidence: REAL_TEST / PASS.
  - `pnpm pack`: exit 1 with required `root_packaging_prohibited`; no root package artifact was produced. Evidence: REAL_TEST / PASS negative control.
- Architecture negative controls:
  - Domain framework/I/O imports: Nest, Electron, `node:fs`, and `http`.
  - App source boundaries: scoped app package, source subpath, and relative app-to-app path.
  - Same-graph bypasses: static import/export, `require()`, one/two-argument dynamic import, root alias use, module-local `paths`, TypeScript project reference, and package dependency.
  - Renderer bypasses: raw `ipcRenderer`, direct Hub SDK, Node access, Runtime source, and absolute local path.
  - Legacy nouns: Phase, Dispatch, Delivery, and WorkspaceToken, plus comments/fixture labels as a no-false-positive control. The checker also bans WorkItem, Handoff, and the spaced Workspace Token form from production domain AST.
  - Secret boundaries: dynamically constructed synthetic credential in target source, extensionless Docker build file, and forbidden local Secret path in a target manifest. No real Secret was persisted.
  - CLI control: a negative repository prints stable `ruleId`, `file`, `line`, and `remediation`, then exits non-zero. The canonical fixture and current production tree both pass.
- Risks and boundaries:
  - `architecture:check` is static and cannot prove RLS, transactions, IPC runtime behavior, Electron sandbox configuration, Harness execution, or a real multi-process path. Those remain later REAL_TEST gates.
  - The evidence schema proves shape and limited internal consistency only. Task 3 must still prove executed targets, non-zero failure modes, required-step handling, and subject/evidence commit binding.
  - The error catalog is controlled and deliberately small. Any future stable code requires an explicit contract/version compatibility change rather than a free-form message fallback.
  - Target scanning is limited to the eight approved apps/packages and text/build files. Repository-wide immutable Secret coverage remains the pinned Task 1 scanner, which was freshly passed here.
  - Task 2 has not received independent review, no push occurred, and this checkpoint is not Task 2 approval or MS0 closeout evidence.
- Resume: use only the top resume procedure. From the clean Task 2 commit, rerun focused contracts/architecture, production architecture, and full Secret; then obtain specification approval followed by code-quality approval.
- Next after both approvals only: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`.

### 2026-07-19 21:12 CST - Task 2 specification-review fail-closed repair ready for amend

- Status: IN_PROGRESS. Independent Task 2 specification review failed. The repair is locally GREEN but has not been amended or re-reviewed; Task 3 has not started and MS0 remains IN_PROGRESS.
- Review result entering this checkpoint:
  - The first architecture checker resolved only known happy paths. Missing/invalid module/config input, nonliteral/unresolved source imports, several dependency aliases, outside references, nested renderer paths, composite legacy tokens, extensionless build files, and deterministic constructed Secrets could fall through without a violation.
  - Target test/spec source was skipped entirely. Renderer classification used one fixed prefix. Manifest/config parsing contained `catch -> []` paths and did not enforce the exact canonical module inventory.
  - `EvidenceManifest` and the active plan used lower-authority `subjectCommitSha`, while `workflow/harness-sop.md` and `spec/TestStrategy.md` require `commitSha` for the tested subject.
  - The controlled ErrorCode catalog omitted approved MS0 codes already present in OpenSpec, the active plan, and constitution scripts.
  - Therefore the prior Task 2 checkpoint's claim that all dependency forms and target text/build boundaries were closed is superseded by this review FAIL. Only the repaired evidence below is current.
- Changed files:
  - `scripts/architecture/check.ts`, `scripts/architecture/check.test.ts`, `scripts/architecture/fixtures/repository.ts`, plus new single-purpose `scripts/architecture/model.ts`, `scripts/architecture/config-resolution.ts`, and `scripts/architecture/source-analysis.ts`.
  - `packages/contracts/src/contracts.test.ts`, `packages/contracts/src/evidence.ts`, and `packages/contracts/src/error-catalog.ts`.
  - `scripts/constitution/implementation-plan-policy.test.ts`, `docs/superpowers/plans/2026-07-17-ms0-repository-constitution.md`, and this ledger. Workflow authority was not changed.
- Mandatory grouped RED evidence before production repair:
  - Exact module/config inventory: exit 1, `4 failed | 57 skipped` for missing root config, invalid root/module config, missing/invalid/misidentified manifests, and an extra module.
  - Target test/nonliteral/unresolved source: exit 1, `3 failed | 58 skipped`.
  - Config/dependency aliases: exit 1, `8 failed | 53 skipped` for every path fallback, outside project reference, workspace aliases in all four dependency fields, file/link aliases, and outside dependency target.
  - Renderer classification/local paths: exit 1, `7 failed | 54 skipped`.
  - Composite legacy tokenization: exit 1, `6 failed | 1 passed | 54 skipped`; the comments/test-label control already passed.
  - Extensionless build and constant-folded Secret inventory: exit 1, `4 failed | 57 skipped`.
  - Evidence authority and MS0 catalog: contracts exited 1 with `11 failed | 45 passed`; one failure proved the schema still required `subjectCommitSha`, and ten proved approved MS0 codes were absent.
  - Active-plan authority: exit 1 with `1 failed | 1 passed` because `subjectCommitSha` remained.
  - Self-review added two further RED controls. Outside `extends` was touched by TypeScript recursive parsing before containment and produced an extra `module_tsconfig_invalid`; the isolated control exited 1. A nonexistent project reference inside a canonical module was accepted; its isolated control also exited 1.
- Root-cause repair:
  - `model.ts` owns the exact eight-module identities, allowed dependency graph, stable violations, remediation text, canonical path resolution, and deterministic violation ordering.
  - `config-resolution.ts` uses TypeScript config APIs after contained extends-chain validation. It validates every path fallback, effective alias resolution, project references, and missing/invalid/outside/unresolved states. An outside extends target never reaches recursive TypeScript parsing.
  - `source-analysis.ts` checks production and test/spec AST for static import/export/import type, `require()`, and one/two-argument dynamic import. Every specifier resolves to a canonical module, TypeScript-resolved external, or stable violation. Test-only resolved external tooling is allowed; canonical internal edges and every manifest edge remain governed by the graph.
  - Renderer classification recognizes any contained `renderer` segment plus explicit renderer entry conventions. Raw IPC, Hub SDK, Node, Runtime, `/tmp`, `/Users`, `file://`, and Windows absolute paths fail closed.
  - Domain legacy checks tokenize PascalCase, camelCase, snake_case, and kebab/phrase strings, rejecting Phase, Dispatch, Delivery, WorkItem, Handoff, and WorkspaceToken concepts without matching comments, test labels, or partial words.
  - Target inventory reads only contained regular bounded candidate text/build files, rejects symlinks/unreadable/oversized/forbidden paths, separates UTF-8 text from binary, and includes Dockerfile, Containerfile, Makefile, and no-extension build text. AST folding covers deterministic string/template concatenation and static joins before Secret matching.
  - `EvidenceManifest` now requires strict `commitSha`; missing `commitSha` and the old field are rejected. Task 3/Task 9 plan text says `commitSha (tested subject commit)` while preserving the two-commit subject/evidence protocol and non-self-reference.
  - ErrorCode adds exactly the review-listed MS0 codes plus `process_recovered`, the remaining stable recovery code in current MS0 OpenSpec. No speculative MS1 business code was added.
- Preserved repair attempt history:
  - The first refactor strict architecture `tsc` exited 2 with ten exact-optional/internal-TypeScript-API typing errors. Required properties now explicitly include `undefined`, and parse diagnostics use a bounded internal-property type guard; the fresh strict command passes.
  - The first full architecture run after grouped GREEN passed 59/61. One old fixture placed exact `delivery` in a production-domain string rather than a test label; it was corrected to a partial nonlegacy word. The second failure was resolved by allowing only resolved external tooling in domain test/spec files while retaining all canonical internal and manifest graph checks.
  - The first full formatter gate exited 1 on five architecture files. Targeted Biome formatting fixed only those files.
  - The next lint exited 0 but reported five warnings: three test construction strings and two unused import groups. They were treated as not closed; deterministic test construction and imports were corrected, and fresh lint has no warnings.
- Fresh repair commands and results:
  - All original grouped commands are GREEN: module/config `4/4`, source `3/3`, config/dependency `8/8`, renderer `7/7`, legacy `7/7`, and build/folded Secret `4/4`.
  - The two self-review controls for pre-parse extends containment and unresolved project references each pass after their isolated RED.
  - `pnpm exec vitest run scripts/architecture/check.test.ts`: exit 0, `1 file | 64 tests passed`.
  - Standalone strict architecture `tsc` across model/config/source/check/test/fixture: exit 0.
  - `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/architecture/check.test.ts scripts/constitution/implementation-plan-policy.test.ts`: exit 0, `3 files | 122 tests passed`. Evidence: REAL_TEST / PASS.
  - `pnpm run format:check`: exit 0, 78 files; `pnpm run lint`: exit 0, 78 files with no warnings; `pnpm run typecheck`: exit 0 across repository policy and eight workspaces.
  - `pnpm run test`: exit 0; root scripts passed `11 files | 149 tests`, followed by all eight workspace suites, including `57` contracts tests.
  - `pnpm run build`: exit 0 across all eight workspaces; post-build `pnpm run architecture:check`: exit 0. Architecture evidence remains STRUCTURAL_CHECK / PASS only.
- Fresh Task 1 safety gates:
  - Target-only and explicit-source spec verification each passed exactly 27 mappings; OpenSpec validation passed; the immutable legacy freeze independently passed all 835 facts without regeneration.
  - Docker context policy, pinned full Secret, and artifact Secret scanning over all eight explicit build roots exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`; no root package artifact was produced.
- Risks and boundaries:
  - Static resolution still cannot prove runtime IPC, RLS, transaction, process, Electron sandbox, or Harness behavior. `architecture:check` remains STRUCTURAL_CHECK.
  - Text scanning is bounded to 4 MiB per contained candidate file and skips detected binary content; complete binary/package payload Secret coverage remains the independent pinned artifact scanner.
  - TypeScript resolution cost is proportional to target source/import count. The current production check and 64-case fixture suite complete without timeout; future scale should introduce cached resolution without weakening resolve-or-violate.
  - Task 2 remains unapproved. No Task 3 command, push, workflow edit, Secret read, or Task 1 amend occurred.
- Resume: amend only the latest Task 2 commit after precise index/full Secret checks, rerun all critical gates from clean amended `HEAD`, then request fresh specification review followed by code-quality review.
- Next after both approvals only: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`.

### 2026-07-19 21:54 CST - Task 2 specification re-review A-D repair ready for amend

- Status: IN_PROGRESS. The fresh specification re-review approved Contracts, Evidence, ErrorCode, and prior ledger scope, but failed the remaining architecture negative space. The A-D repair is locally GREEN and awaits precise amend plus fresh specification/code-quality re-review. Task 3 has not started and MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Scope boundary:
  - Changed only `scripts/architecture/check.test.ts`, `scripts/architecture/check.ts`, `scripts/architecture/config-resolution.ts`, `scripts/architecture/model.ts`, `scripts/architecture/source-analysis.ts`, and this ledger.
  - Contracts, Evidence, ErrorCode, active plan, workflow authority, module package manifests, and Task 1 implementation were not changed.
  - No push, Secret value read, freeze regeneration, or Task 3 command occurred.
- Re-review result entering this checkpoint:
  - Config parsing handled only `extends: string`, validated raw parent and child `paths` instead of final effective paths, and treated inventory enumeration failure as an empty directory.
  - Source analysis omitted `ImportTypeNode`; lexical canonical/relative classification allowed missing module files and canonical subpaths to pass without successful TypeScript resolution.
  - Dependency protocols accepted canonical keys aliased to unrelated npm identities, file/link descendants or nested packages, wrong package identity, and malformed protocol payloads.
  - Renderer local-path roots were incomplete; legacy tokens omitted `Memory` and `FailureRecord`; deterministic string folding did not propagate file-local const identifiers.
- Mandatory grouped RED evidence, before production repair:
  - A config/inventory: exit 1, `3 failed | 1 passed | 109 skipped`. Missing behaviors were TypeScript 5 `extends: string[]` preflight, child override of parent `paths`, and stable inventory enumeration failure; inherited final fallback validation already passed.
  - B source resolution: exit 1, `3 failed | 1 passed | 109 skipped`. Missing behaviors were `ImportTypeNode`, missing relative source, and missing canonical subpath; a missing root alias target was already rejected.
  - C dependency protocols: exit 1, `7 failed | 3 passed | 103 skipped`. Missing behaviors were canonical-key/noncanonical npm alias, file/link descendant and nested-package targets, wrong target identity, and empty `npm:`, `workspace:`, and `file:` payloads. Existing actual npm/workspace identity controls already passed.
  - D renderer/legacy/static strings: exit 1, `22 failed | 9 passed | 82 skipped`. Eighteen newly required POSIX roots, three `Memory`/`FailureRecord` forms, and file-local const folding were missing. Existing roots, `/health`, HTTPS URL, comments/test labels, and cycle/shadow non-execution controls passed.
  - Total expected behavioral RED: 35 failures. Every failure was an assertion on a missing rejection; no test syntax, fixture setup, or runner error occurred.
- Root-cause repair:
  - `config-resolution.ts` preflights every string or array extends target using contained regular-file metadata before TypeScript recursive parsing. It composes array parents in order, validates only the final effective `paths`, retains every fallback, and uses a branch-local ancestor set so shared parent configs are not mistaken for cycles.
  - Inventory enumeration now emits stable `module_inventory_unreadable` instead of `catch -> []` when `apps/` or `packages/` cannot be read as a directory.
  - Source collection includes `ImportTypeNode`. Canonical, relative, absolute, and path-alias imports require TypeScript resolution to a real regular file; missing relative/canonical targets emit `source_specifier_unresolved`. Canonical graph rules are still evaluated even when an internal specifier is unresolved.
  - Resolved source paths retain both lexical and canonical forms. This preserves macOS `/var -> /private/var` fixture classification and supports realpath containment without trusting a missing lexical target.
  - `npm:` and explicit `workspace:` aliases use actual package identity; `workspace:*` uses the dependency key. `file:`/`link:` must resolve exactly to a canonical module root whose manifest has the canonical package name; descendants, nested packages, wrong identities, and empty targets fail closed.
  - Renderer local paths cover `/Users /private /Volumes /System /Library /Applications /home /root /tmp /var /etc /opt /usr /bin /sbin /lib /dev /run /srv /mnt /media /work /workspace` while retaining `/health` and HTTPS URL positives.
  - Legacy tokenization now rejects `Memory` and adjacent `Failure Record` tokens across Pascal, snake, kebab, and phrase forms, while comments and test-label source remain excluded.
  - Secret folding collects only unambiguous file-local `const Identifier = initializer` bindings and evaluates only the existing deterministic syntax. A visited set and depth bound stop cycles; duplicate/shadow names are marked ambiguous; no call expression or runtime code is executed.
- Preserved implementation attempt history:
  - All grouped controls first turned GREEN: A `4/4`, B `4/4`, C `10/10`, D `31/31`.
  - The first full architecture run then exited 1 with `3 failed | 110 passed`. Relative cross-app, root path-alias, and renderer-to-Runtime fixtures resolved correctly, but `realpathSync` changed macOS temporary roots from lexical `/var/...` to canonical `/private/var/...`, so canonical paths no longer matched lexical module roots and the rules were misclassified.
  - Diagnostic resolution output proved all three TypeScript targets existed and identified only the lexical/canonical containment mismatch. Keeping both path forms fixed the existing fixtures without weakening real-file resolution.
  - The first standalone strict architecture `tsc` exited 2 with one union narrowing error in the canonical package branch. Using the already-proven `packageTarget` in that branch fixed the typing error.
  - The first final-state format check exited 1 on four architecture files, while lint exited 0 with two unused-import warnings. Targeted Biome formatting and removal of only those obsolete imports produced fresh warning-free gates.
- Fresh final-source commands and results:
  - `pnpm install --frozen-lockfile --strict-peer-dependencies`: exit 0 across all nine workspace projects with the current lockfile.
  - `pnpm run format:check`: exit 0, 78 files; `pnpm run lint`: exit 0, 78 files with no warnings.
  - `pnpm run typecheck`: exit 0 across repository policy and all eight workspace typechecks.
  - Standalone strict architecture `tsc` across model/config/source/check/test/fixture: exit 0.
  - `pnpm exec vitest run scripts/architecture/check.test.ts`: exit 0, `1 file | 113 tests passed`.
  - `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/architecture/check.test.ts scripts/constitution/implementation-plan-policy.test.ts`: exit 0, `3 files | 171 tests passed`. Evidence: REAL_TEST / PASS.
  - `pnpm run test`: exit 0; root scripts passed `11 files | 198 tests`, followed by all eight workspace suites, including contracts `57/57`. Evidence: REAL_TEST / PASS.
  - `pnpm run build`: exit 0 across all eight workspaces; post-build `pnpm run architecture:check`: exit 0. Architecture production evidence remains STRUCTURAL_CHECK / PASS only.
  - `git diff --check`: exit 0.
- Fresh Task 1 safety and boundary commands:
  - Target-only and explicit-source spec verification each passed exactly 27 mappings; OpenSpec validation passed.
  - The immutable legacy freeze independently passed all 835 facts without regeneration.
  - Docker context policy, pinned full Secret scan, and artifact Secret scanning over all eight explicit build roots exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`; no root package artifact was produced.
- Risks and boundaries:
  - The architecture checker remains static and cannot prove runtime IPC, RLS, transactions, process health, Electron sandbox, or Harness execution. `architecture:check` remains STRUCTURAL_CHECK.
  - TypeScript resolution and real-file checks are point-in-time and proportional to target source/import count. The current 113-case suite and production tree complete without timeout; future caching must preserve resolve-or-violate behavior.
  - Config preflight reads only contained config contents after metadata containment succeeds. File-local const folding is syntax-only, bounded, and deliberately refuses ambiguous or executable expressions.
  - Task 2 remains unapproved. No Task 3 command, push, workflow edit, Contracts/Evidence/ErrorCode change, Secret read, or Task 1 amend occurred.
- Resume: use only the top resume procedure. Precisely stage the five architecture files and this ledger, run immutable index/full Secret checks, amend only the latest Task 2 commit, then rerun critical gates from clean amended `HEAD` before requesting fresh specification review followed by code-quality review.
- Next after both approvals only: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`.

### 2026-07-19 22:26 CST - Task 2 third specification re-review repair ready for amend

- Status: IN_PROGRESS. The third specification re-review found exactly two remaining HIGH architecture findings. Both repairs are locally GREEN and await precise amend plus fresh specification/code-quality re-review. Task 3 has not started and MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Scope boundary:
  - Changed only `scripts/architecture/check.test.ts`, `scripts/architecture/check.ts`, and this ledger.
  - Contracts, Evidence, ErrorCode, active plan, workflow authority, package manifests, Task 1 implementation, and prior A-D architecture behavior were not changed.
  - No push, Secret value read, freeze regeneration, or Task 3 command occurred.
- Re-review result entering this checkpoint:
  - `apps/` and `packages/` were passed directly to `readdirSync` before lstat/realpath containment. A container symlink could therefore enumerate an external directory. Later text collection also started from raw module-root strings instead of an inventory-proven root.
  - Manifest dependencies reused source-specifier matching, where canonical package subpaths are intentional. Dependency keys and protocol identities therefore accepted canonical subpaths, malformed aliases, tags, URLs, relative workspace payloads, and unknown values through key fallback.
- Mandatory RED evidence before production repair:
  - Safe containers: exit 1, `2 failed | 1 passed | 125 skipped`. Both `apps` and `packages` symlink sentinels exposed `outside-read-marker` through `module_inventory_extra` instead of returning `module_inventory_unreadable`; the real-directory positive already passed.
  - Strict dependency identities: exit 1, `10 failed | 2 passed | 116 skipped`. Missing rejections covered a canonical subpath key, four malformed npm aliases, four malformed/URL/relative workspace payloads, and a plain URL. A valid selector matrix and the already-rejected exact unknown `@sartre/rogue` key passed.
  - Every RED was a missing behavioral rejection; no fixture, runner, or syntax error occurred.
- Root-cause repair:
  - Repository root, each inventory container, and each canonical module root now pass lstat, realpath, real-directory, non-symlink, and canonical containment before any directory enumeration.
  - Unsafe containers emit stable `module_inventory_unreadable`; their child module paths are not touched. Unsafe or missing module roots emit `module_inventory_missing` and never enter manifest, config, or text traversal.
  - Inventory returns a verified canonical module-root map. `collectModuleTextTargets` accepts only a root from that map, eliminating a second walk initiated from unverified container/module strings. Both external marker sentinels remain absent from all returned violation paths.
  - Manifest parsing now uses exact package identity, separate from source specifier/subpath matching. Scoped keys contain exactly `@scope/name`; unscoped keys contain one valid package segment.
  - The dependency selector parser intentionally implements a documented strict subset without a new dependency: `*`, exact `x.y.z` with optional prerelease, `^`/`~` semver, comparison conjunctions/`||`, and hyphen ranges. Same-package workspace selectors also allow bare `^` and `~`.
  - `npm:` requires `npm:<exact-package>@<valid selector>`. `workspace:` maps a supported same-package selector to the exact key or parses `workspace:<exact-package>@<valid selector>`. Relative workspace paths are not retained and fail closed. Tags, URLs, empty/unknown payloads, extra `@`, and package subpaths fail closed.
  - Existing `file:`/`link:` behavior remains exact canonical root plus canonical manifest identity.
- Preserved GREEN and attempt history:
  - Safe-container focused GREEN: `3/3`; strict dependency focused GREEN: `12/12`.
  - Full architecture passed `128/128`; standalone strict architecture `tsc` and production `architecture:check` exited 0. All prior A-D controls remained GREEN.
  - The first final-state format check exited 1 on two formatter-only layouts; lint, focused `186/186`, and workspace typecheck already exited 0. Targeted formatting changed only those layouts, and all final-source gates were rerun.
- Fresh final-source commands and results:
  - `pnpm install --frozen-lockfile --strict-peer-dependencies`: exit 0 across all nine workspace projects with the current lockfile.
  - `pnpm run format:check`: exit 0, 78 files; `pnpm run lint`: exit 0, 78 files with no warnings.
  - `pnpm run typecheck`: exit 0 across repository policy and all eight workspace typechecks.
  - Standalone strict architecture `tsc` across model/config/source/check/test/fixture: exit 0.
  - `pnpm exec vitest run scripts/architecture/check.test.ts`: exit 0, `1 file | 128 tests passed`.
  - `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/architecture/check.test.ts scripts/constitution/implementation-plan-policy.test.ts`: exit 0, `3 files | 186 tests passed`. Evidence: REAL_TEST / PASS.
  - `pnpm run test`: exit 0; root scripts passed `11 files | 213 tests`, followed by all eight workspace suites, including contracts `57/57`. Evidence: REAL_TEST / PASS.
  - `pnpm run build`: exit 0 across all eight workspaces; post-build `pnpm run architecture:check`: exit 0. Architecture production evidence remains STRUCTURAL_CHECK / PASS only.
  - `git diff --check`: exit 0.
- Fresh Task 1 safety and boundary commands:
  - Target-only and explicit-source spec verification each passed exactly 27 mappings; OpenSpec validation passed.
  - The immutable legacy freeze independently passed all 835 facts without regeneration.
  - Docker context policy, pinned full Secret scan, and artifact Secret scanning over all eight explicit build roots exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`; no root package artifact was produced.
- Risks and boundaries:
  - Directory verification and later reads remain point-in-time filesystem operations. Canonical verified roots remove the known pre-enumeration and raw-root bypass; the architecture checker does not claim an atomic filesystem snapshot.
  - The selector grammar is intentionally narrower than all npm/pnpm syntax. Unsupported tags, Git/HTTP tarballs, relative workspace paths, and exotic ranges must be added through an explicit constitution change and negative/positive controls rather than silent fallback.
  - The architecture checker remains static and cannot prove runtime IPC, RLS, transactions, process health, Electron sandbox, or Harness execution. `architecture:check` remains STRUCTURAL_CHECK.
  - Task 2 remains unapproved. No Task 3 command, push, workflow edit, Contracts/Evidence/ErrorCode change, Secret value read, or Task 1 amend occurred.
- Resume: use only the top resume procedure. Precisely stage the two architecture files and this ledger, run immutable index/full Secret checks, amend only the latest Task 2 commit, then run the complete fresh gate matrix from clean amended `HEAD` before requesting specification review followed by code-quality review.
- Next after both approvals only: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`.

### 2026-07-19 23:18 CST - Task 2 fourth specification re-review repair ready for amend

- Status: IN_PROGRESS. The fourth specification re-review found three remaining HIGH architecture findings. All three repairs are locally GREEN and await precise amend plus fresh specification/code-quality re-review. Task 3 has not started and MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Scope boundary:
  - Changed only root `package.json`, `pnpm-lock.yaml`, `scripts/architecture/check.test.ts`, `scripts/architecture/check.ts`, `scripts/architecture/config-resolution.ts`, `scripts/architecture/model.ts`, `scripts/architecture/source-analysis.ts`, and this ledger.
  - The only root dependency change is the direct pinned development tooling `semver@7.8.5` and `@types/semver@7.7.1`; no production module manifest changed.
  - Contracts, Evidence, ErrorCode, active plan, workflow authority, Task 1 implementation, and prior architecture behavior were not changed.
  - No push, Secret value read, freeze regeneration, or Task 3 command occurred.
- Re-review result entering this checkpoint:
  - Config containment validated only a subset of effective TypeScript paths. Raw `baseUrl`, `files`, `include`, `exclude`, `rootDir`, `rootDirs`, `typeRoots`, `paths`, and `references`, contained recursive `extends`, TypeScript host reads, and source-tree symlinks could still cause or attempt outside-repository access before a stable violation.
  - Manifest dependency validation could accept a noncanonical key or alias actual identity and source analysis did not prove that every external production import was declared by that module. Test tooling ownership also needed an explicit root-only rule.
  - The handwritten selector recognizer was not a complete SemVer authority and could accept invalid leading-zero forms or reject valid prerelease/comparator/hyphen/OR ranges.
- Mandatory RED evidence before production repair:
  - Config no-outside-read: exit 1, `11 failed | 1 passed`. Missing rejections covered unsafe raw/effective config paths, contained recursive path-bearing `extends`, safe TypeScript host access, and module source symlinks; the existing contained positive passed.
  - Dependency actual identity: exit 1, `2 failed | 4 passed`. Missing rejections covered noncanonical `workspace:*` identity and alias actual-identity mismatch while prior canonical controls remained GREEN.
  - Mature SemVer: exit 1, `4 failed | 5 passed`. Missing behavior rejected or accepted the wrong leading-zero, tag/URL, prerelease, comparator, hyphen, and `||` selector cases.
  - Declared external import: exit 1, `1 failed | 1 passed`. A production source could import an undeclared external package while the existing declared positive passed.
  - Every RED was an assertion on missing fail-closed behavior; no fixture, syntax, or runner failure was used as behavioral evidence.
- Root-cause repair:
  - Raw config and every contained `extends` layer now validate `baseUrl`, `files`, `include`, `exclude`, `rootDir`, `rootDirs`, `typeRoots`, `paths`, and `references`; absolute, outside, URL-like, unsupported/ambiguous glob, and symlinked source/config paths fail closed with stable `tsconfig_unsafe_path` before TypeScript parse/enumeration.
  - A contained TypeScript host now mediates `readDirectory`, `readFile`, and `fileExists`; module resolution reuses that host. Source module trees are metadata-preflighted before TypeScript file enumeration, so a source symlink cannot expose an outside marker.
  - Dependency analysis records both the dependency key and parsed actual identity. `workspace:*` requires a canonical workspace key; explicit workspace/npm aliases require a canonical actual identity and reject key/target mismatches or unknown `@sartre/*` identities.
  - Production source external imports must appear in the module declaration set and otherwise emit stable `source_dependency_undeclared`. Test/spec source may additionally use only exact root `devDependencies` as tooling.
  - Root development tooling now pins `semver@7.8.5` and `@types/semver@7.7.1`. Selector acceptance uses `valid`/`validRange` after the existing fail-closed protocol/package grammar, rejecting leading zero, tag, and URL forms while accepting supported prerelease, comparator, hyphen, and `||` ranges.
- Preserved GREEN and attempt history:
  - Grouped GREEN results were config `12/12`, actual identity `6/6`, mature SemVer `9/9`, and declared external import `2/2`.
  - The first full architecture run exposed two existing dependency-direction fixtures where a canonical key pointed at another known canonical target but only `manifest_dependency_target_outside_graph` was retained. The analyzer now preserves both the actual direction violation and outside-graph identity violation; full architecture then passed `157/157`.
  - The first final-state format check exited 1 on `scripts/architecture/check.test.ts` and `scripts/architecture/config-resolution.ts`. Targeted Biome formatting changed only those files.
  - The first final-state lint exited 0 with one info for a useless regex escape. The equivalent character class was rewritten using the Biome safe fix; fresh lint has no info or warning.
  - A parallel full-test attempt exceeded the output yield window and was not counted as evidence. The process completed naturally; a separate fresh solo `pnpm run test` produced the recorded exit code and complete counts below.
- Fresh final-source commands and results:
  - `pnpm install --frozen-lockfile --strict-peer-dependencies`: exit 0 across all nine workspace projects; lockfile was current.
  - `pnpm run format:check`: exit 0, 78 files; `pnpm run lint`: exit 0, 78 files with no info, warnings, or errors.
  - Standalone strict architecture `tsc` across model/config/source/check/test/fixture with strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `useUnknownInCatchVariables`, and `verbatimModuleSyntax`: exit 0.
  - `pnpm run typecheck`: exit 0 across repository policy and all eight workspace typechecks.
  - `pnpm exec vitest run scripts/architecture/check.test.ts`: exit 0, `1 file | 157 tests passed`.
  - `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/architecture/check.test.ts scripts/constitution/implementation-plan-policy.test.ts`: exit 0, `3 files | 215 tests passed`. Evidence: REAL_TEST / PASS.
  - `pnpm run test`: exit 0; root scripts passed `11 files | 242 tests`, followed by all eight workspace suites, including contracts `57/57`. Evidence: REAL_TEST / PASS.
  - `pnpm run build`: exit 0 across all eight workspaces; post-build `pnpm run architecture:check`: exit 0. Architecture production evidence remains STRUCTURAL_CHECK / PASS only.
- Fresh Task 1 safety and boundary commands:
  - Target-only and explicit-source spec verification each passed exactly 27 mappings; OpenSpec validation passed.
  - The immutable legacy freeze independently passed all 835 facts without regeneration.
  - Docker context policy, pinned full worktree/history/index Secret scan, and artifact Secret scanning over all eight explicit build roots exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`; no root package artifact was produced.
- Risks and boundaries:
  - Filesystem metadata and content checks remain point-in-time rather than an atomic snapshot. Pre-amend and clean post-amend gates therefore rescan the current tree and immutable index.
  - Config globs intentionally reject bracket classes, braces, backslashes, absolute/URL-like forms, and ambiguous outside prefixes. Any future syntax expansion requires explicit positive and outside-read negative controls.
  - Root test tooling is an explicit constitution boundary, not an implicit global dependency escape. Production module source still requires module-local declarations.
  - The architecture checker remains static and cannot prove runtime IPC, RLS, transactions, process health, Electron sandbox, or Harness execution. `architecture:check` remains STRUCTURAL_CHECK.
  - Task 2 remains unapproved. No Task 3 command, push, workflow edit, Contracts/Evidence/ErrorCode change, Secret value read, freeze regeneration, or Task 1 amend occurred.
- Resume: precisely stage the seven Task 2 source/config/lock files and this ledger, run immutable index and full Secret checks plus whitespace/forbidden-path checks, amend only the latest Task 2 commit, then run the complete fresh gate matrix from clean amended `HEAD` before requesting specification review followed by code-quality review.
- Next after both approvals only: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`.

### 2026-07-20 10:00 CST - Task 2 fifth specification re-review repair ready for amend

- Status: IN_PROGRESS. The fifth specification re-review found three remaining architecture gaps. Config path metadata preflight, resolved external package identity/root, and full SemVer range delegation are locally GREEN and await precise amend plus fresh specification/code-quality re-review. Task 3 has not started and MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Scope boundary:
  - Changed only `scripts/architecture/check.test.ts`, `scripts/architecture/check.ts`, `scripts/architecture/config-resolution.ts`, `scripts/architecture/model.ts`, `scripts/architecture/source-analysis.ts`, and this ledger.
  - Root/package manifests, lockfile, Contracts, Evidence, ErrorCode, active plan, workflow authority, Task 1 implementation, and prior architecture behavior were not changed in this repair.
  - No push, Secret value read, freeze regeneration, or Task 3 command occurred.
- Re-review result entering this checkpoint:
  - Raw TypeScript config path checks proved lexical containment but did not inspect existing path segments. A contained inherited `baseUrl` could therefore traverse a symlink to an outside tree when `files: []` prevented the TypeScript host from visiting it.
  - Module manifests flattened import keys and actual package identities into one string Set. External resolution did not verify the nearest contained package root/package.json, so missing/wrong identities and an arbitrary module-local `node_modules` package could be accepted.
  - `semver.validRange` was gated by a handwritten range regex. Valid build-metadata comparators were rejected even though pinned SemVer accepted them.
- Reviewer-attempt classification before implementation:
  - On prior clean HEAD `f44c1f90a579cfd67af3624d1f076064d1f7913c`, the reviewer reported one focused attempt with 215 total tests: `212 passed | 3 timeout`.
  - The reviewer explicitly classified the three timeouts as non-assertion environmental timeouts and did not count that attempt as behavior evidence. The exact command and durations were not provided to the controller.
  - This attempt is NOT PASS and is not controller evidence; the implementer's fresh `225/225` below is a separate command/result after the fifth repair.
- Mandatory RED evidence before production repair:
  - Config metadata preflight: exit 1, `1 failed | 165 skipped`. The inherited contained `baseUrl` symlink returned no violation; `files: []` proved the missing pre-host metadata phase rather than an outside TypeScript enumeration.
  - Resolved external identity/root: exit 1, `3 failed | 4 passed | 159 skipped`. Missing package.json, different package name, and module-local `node_modules` were all incorrectly accepted; direct zod/semver, root test vitest, and npm alias positives already passed.
  - SemVer build metadata: exit 1, `1 failed | 9 passed | 156 skipped`. `>=1.2.3+build.5 <2.0.0` was rejected only by the handwritten gate.
  - Range-authority self-review added `x` as another `semver.validRange` positive. It produced exit 1, `1 failed | 10 passed | 156 skipped` before the remaining dist-tag heuristic was made non-narrowing.
  - Every RED was an assertion on missing or over-restrictive behavior; no timeout, fixture error, or test syntax failure was used as behavioral evidence.
- Root-cause repair:
  - Every already-validated config path derives its static prefix before `*`/`?`, then walks existing lexical segments from the repository trust root with `lstat`. Any symlink is rejected without following it, even when its target would canonicalize inside; canonical existing prefixes must remain contained. Only `ENOENT` below a safe contained ancestor permits a nonexistent suffix; unreadable, non-directory traversal, loop, escape, or metadata error fails with stable `tsconfig_unsafe_path` before TypeScript host access.
  - The metadata phase runs for `baseUrl`, `files`, `include`, `exclude`, `rootDir`, `rootDirs`, `typeRoots`, path fallbacks, references, and every recursively inherited contained config. Existing path-alias graph and module-direction checks retain their separate responsibility.
  - Manifest declarations are now import-key -> expected actual-identity maps for every module and root test tooling. Direct dependencies map name to itself; npm aliases map alias key to the parsed actual package name.
  - Resolved external imports must canonicalize under repository-root `node_modules`, including pnpm `.pnpm/.../node_modules/<package>` layouts. The nearest layout package root and regular non-symlink package.json are verified contained before reading; its exact `name` must equal the expected actual identity. Missing/invalid/different metadata or arbitrary module-local regular `node_modules` emits stable `source_dependency_identity_invalid`.
  - Module-internal classification excludes `node_modules`, closing the initial repair attempt where a module-local package was still mistaken for SDK source. Legitimate pnpm workspace symlinks resolve canonically into root `.pnpm` and remain accepted.
  - Version/range syntax is delegated to pinned `semver.valid`/`validRange`. Protocol checks still reject empty, URL-like, and direct bare `^`/`~`; workspace keeps its explicit bare shorthand. Dist-tag detection only rejects when SemVer also returns null, so it does not narrow valid wildcard/range syntax.
- Preserved GREEN and attempt history:
  - First implementation GREEN: config `1/1`, SemVer build-metadata group `10/10`; resolved identity passed `6/7` with only module-local `node_modules` still failing.
  - Diagnostic TypeScript resolution showed the failing package at `<fixture>/packages/sdk/node_modules/declared-tool/index.d.ts`. Excluding `node_modules` from internal-module classification routed it through package identity validation; resolved identity then passed `7/7`.
  - Combined reviewer groups passed `18/18` before the additional `x` control. Final SemVer group passed `11/11` and full architecture passed `167/167`, preserving all prior 157 controls.
  - The first format gate exited 1 on pure layout in `check.test.ts`, `config-resolution.ts`, and `source-analysis.ts`; lint, strict typing, architecture `166/166`, focused `224/224`, and workspace typecheck were already GREEN. Targeted Biome formatting changed only those three files, and all final-source gates were rerun after the later `x` repair.
  - Independent real package metadata controls found exact contained `zod`, `semver`, and `vitest` package names; production `architecture:check` also passed against real pnpm resolution.
- Fresh final-source commands and results:
  - `pnpm install --frozen-lockfile --strict-peer-dependencies`: exit 0 across all nine workspace projects; lockfile was current.
  - `pnpm run format:check`: exit 0, 78 files; `pnpm run lint`: exit 0, 78 files with no warnings.
  - Standalone strict architecture `tsc` across model/config/source/check/test/fixture: exit 0.
  - `pnpm run typecheck`: exit 0 across repository policy and all eight workspace typechecks.
  - `pnpm exec vitest run scripts/architecture/check.test.ts`: exit 0, `1 file | 167 tests passed`.
  - `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/architecture/check.test.ts scripts/constitution/implementation-plan-policy.test.ts`: exit 0, `3 files | 225 tests passed`. Evidence: REAL_TEST / PASS.
  - `pnpm run test`: exit 0; root scripts passed `11 files | 252 tests`, followed by all eight workspace suites, including contracts `57/57`. Evidence: REAL_TEST / PASS.
  - `pnpm run build`: exit 0 across all eight workspaces; post-build `pnpm run architecture:check`: exit 0. Architecture production evidence remains STRUCTURAL_CHECK / PASS only.
- Fresh Task 1 safety and boundary commands:
  - Target-only and explicit-source spec verification each passed exactly 27 mappings; OpenSpec validation passed.
  - The immutable legacy freeze independently passed all 835 facts without regeneration.
  - Docker context policy, pinned full worktree/history/index Secret scan, and artifact Secret scanning over all eight explicit build roots exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`; no root package artifact was produced.
- Risks and boundaries:
  - Filesystem metadata and package contents remain point-in-time checks rather than an atomic snapshot. Pre-amend and clean post-amend gates therefore rescan current source, index, and artifacts.
  - The repository root is the metadata walk trust anchor. Existing ancestors outside that root are not traversed; every descendant segment that exists is checked without following a symlink.
  - External package validation intentionally rejects arbitrary regular module-local installs. Legitimate pnpm workspace links remain valid only because resolution returns a canonical package under repository-root `.pnpm` with matching metadata.
  - The architecture checker remains static and cannot prove runtime IPC, RLS, transactions, process health, Electron sandbox, or Harness execution. `architecture:check` remains STRUCTURAL_CHECK.
  - Task 2 remains unapproved. No Task 3 command, push, workflow edit, Contracts/Evidence/ErrorCode change, Secret value read, freeze regeneration, or Task 1 amend occurred.
- Resume: precisely stage the five architecture files and this ledger, run immutable index and full Secret checks plus whitespace/exact-path checks, amend only the latest Task 2 commit, then run the complete fresh gate matrix from clean amended `HEAD` before requesting specification review followed by code-quality review.
- Next after both approvals only: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`.

### 2026-07-20 10:36 CST - Task 2 sixth specification re-review repair ready for amend

- Status: IN_PROGRESS. The sixth specification re-review found two remaining architecture root issues: config paths could still bypass no-read validation, and external package identity was inferred from the resolved file's nearest nested `node_modules` instead of the root logical import entry. Both repairs are locally GREEN and await precise amend plus fresh specification/code-quality re-review. Task 3 has not started and MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Scope boundary:
  - Changed only `scripts/architecture/check.test.ts`, `scripts/architecture/config-resolution.ts`, `scripts/architecture/source-analysis.ts`, and this ledger.
  - Approved Contracts, ErrorCode, SemVer behavior/dependencies, root/package manifests, lockfile, active plan, workflow authority, Task 1 implementation, and prior architecture rules were not changed.
  - No push, Secret value read, freeze regeneration, or Task 3 command occurred.
- Re-review result entering this checkpoint:
  - `extends` used final-path `lstat` plus canonical containment. An intermediate contained symlink such as `node_modules/config-link/base.json` could therefore be followed and read when its target remained inside the repository.
  - Glob validation truncated at the first wildcard. `src/*/../../../../outside/*.ts` therefore validated only `src/` and allowed later parent traversal before TypeScript directory enumeration.
  - External identity found the last `node_modules` segment in the resolved file. A root package with a wrong identity could point `types` at a nested package whose package.json impersonated the expected name and be accepted.
- Clarified path scope:
  - Glob-capable `include`, `exclude`, and path patterns reject any exact `..` segment, including traversal after a wildcard. `files` remains a literal path list and is not treated as glob syntax.
  - Literal `extends`, `baseUrl`, and references may retain safe parent segments because all real/fixture module configs require `../../tsconfig.base.json`. Their raw segments are walked with `lstat`; every intermediate symlink, escape, unreadable segment, loop, or unsafe canonical prefix fails closed before read.
  - This preserves the approved repository layout while closing wildcard-dependent traversal. A constitution change would be required before banning all literal parent segments.
- Mandatory RED evidence before production repair:
  - Config paths/no-read: exit 1, `2 failed | 168 skipped`. The intermediate contained symlink read a poison config and returned only `module_tsconfig_invalid`; the expected pre-read `tsconfig_extends_outside_graph` was absent. The late-parent glob returned no violations even with the outside directory present and empty.
  - Root package entry binding: exit 1, `1 failed | 169 skipped`. `node_modules/declared-tool/package.json` used `name=outer-tool` and pointed its types at a nested package whose `name=declared-tool`; the nested identity incorrectly overrode the logical entry.
  - Every RED was an assertion on missing behavior; no timeout, syntax error, or fixture setup failure was used as evidence.
- Root-cause repair:
  - One shared metadata validator now starts from a contained trust base and walks raw literal segments with `lstat`. Existing symlinks are rejected without following them; every existing prefix must canonicalize inside the repository. `ENOENT` permits only a suffix below a safe existing ancestor; a later parent traversal after a missing segment fails closed.
  - Glob-capable values are structurally checked across every segment before any static prefix or TypeScript operation. Any `..` segment is rejected regardless of wildcard position; absolute, URL-like, bracket/brace/backslash, and non-glob wildcard misuse retain prior rejection behavior.
  - `extends` invokes the shared validator before `regularContainedFile` or `readFileSync`, so the poison sentinel is never parsed. Recursively inherited config fields continue through the same path validator.
  - ParseConfigHost validates the requested root/path before `ts.sys.readDirectory`, `readFile`, or `fileExists`; `readDirectory` is no longer called first and filtered afterward. Config-declared paths retain strict no-symlink semantics.
  - Host module resolution separately permits a symlink only when its canonical target remains inside the repository. This is required for pnpm workspace/root entries and does not weaken config declaration preflight or outside containment.
  - External validation now derives the bare import key and expected actual identity from the manifest map, then binds to repository-root `node_modules/<key>` or pnpm's repository-root `.pnpm/node_modules/<key>` logical entry. The entry may be a contained pnpm symlink, but its real package root and regular non-symlink package.json must remain contained, its exact name must equal expected actual identity, and the TypeScript resolved file must be canonical-contained within that bound root.
  - Nested or module-local `node_modules` package.json files no longer select/override identity. Direct, pnpm, and npm-alias positives remain supported through their root logical keys.
- Preserved GREEN and attempt history:
  - Exact controls turned GREEN: config `2/2`, nested package binding `1/1`; combined config regressions passed `15/15` and package identity regressions passed `8/8`.
  - The first config implementation attempt returned `module_tsconfig_invalid` for the normal fixture because the new validator referenced an unbound root variable inside the host. Correcting it to the explicit validator argument produced the exact config GREEN without changing the tests.
  - The first combined production run after applying strict no-symlink status to all host reads exited 1 with 25 `source_specifier_unresolved` violations across real module tests, contracts/zod, and root test tooling. Focused synthetic controls were GREEN, proving this was a real pnpm layout regression rather than a reviewer control failure.
  - Separating config-declaration no-symlink validation from host canonical-contained package resolution restored production `architecture:check` while retaining the exact symlink/glob negatives.
  - Full architecture then passed `170/170`, preserving all previous 167 controls; focused Contracts/architecture/plan policy passed `228/228`.
  - The first format gate exited 1 on layout in `check.test.ts` and `source-analysis.ts`; lint exited 0 with one useless-continue info. Targeted formatting and removal of only that continue produced fresh clean gates.
- Fresh final-source commands and results:
  - `pnpm install --frozen-lockfile --strict-peer-dependencies`: exit 0 across all nine workspace projects; lockfile was current.
  - `pnpm run format:check`: exit 0, 78 files; `pnpm run lint`: exit 0, 78 files with no warnings or info.
  - Standalone strict architecture `tsc` across model/config/source/check/test/fixture: exit 0.
  - `pnpm run typecheck`: exit 0 across repository policy and all eight workspace typechecks.
  - `pnpm exec vitest run scripts/architecture/check.test.ts`: exit 0, `1 file | 170 tests passed`.
  - `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/architecture/check.test.ts scripts/constitution/implementation-plan-policy.test.ts`: exit 0, `3 files | 228 tests passed`. Evidence: REAL_TEST / PASS.
  - `pnpm run test`: exit 0; root scripts passed `11 files | 255 tests`, followed by all eight workspace suites, including contracts `57/57`. Evidence: REAL_TEST / PASS.
  - `pnpm run build`: exit 0 across all eight workspaces; post-build `pnpm run architecture:check`: exit 0. Architecture production evidence remains STRUCTURAL_CHECK / PASS only.
- Fresh Task 1 safety and boundary commands:
  - Target-only and explicit-source spec verification each passed exactly 27 mappings; OpenSpec validation passed.
  - The immutable legacy freeze independently passed all 835 facts without regeneration.
  - Docker context policy, pinned full worktree/history/index Secret scan, and artifact Secret scanning over all eight explicit build roots exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`; no root package artifact was produced.
- Risks and boundaries:
  - Filesystem metadata/content remain point-in-time checks rather than an atomic snapshot. Pre-amend and clean post-amend gates therefore rescan source, index, resolution, and artifacts.
  - Safe host pnpm support follows only entries whose canonical target remains under repository-root node_modules; package identity/root binding performs the stronger logical-key and package.json check before an import is accepted.
  - Glob parent traversal is rejected structurally rather than relying on whether an outside directory exists or TypeScript happens to enumerate it.
  - The architecture checker remains static and cannot prove runtime IPC, RLS, transactions, process health, Electron sandbox, or Harness execution. `architecture:check` remains STRUCTURAL_CHECK.
  - Task 2 remains unapproved. No Task 3 command, push, workflow edit, Contracts/Evidence/ErrorCode/SemVer change, Secret value read, freeze regeneration, or Task 1 amend occurred.
- Resume: precisely stage the three architecture files and this ledger, run immutable index and full Secret checks plus whitespace/exact-path checks, amend only the latest Task 2 commit, then run the complete fresh gate matrix from clean amended `HEAD` before requesting specification review followed by code-quality review.
- Next after both approvals only: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`.

### 2026-07-20 11:07 CST - Task 2 seventh specification re-review repair ready for amend

- Status: IN_PROGRESS. The seventh specification re-review found one remaining external package-root fallback gap. The first-existing repair is locally GREEN and awaits precise amend plus fresh specification/code-quality re-review. Task 3 has not started and MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Scope boundary:
  - Changed only `scripts/architecture/check.test.ts`, `scripts/architecture/source-analysis.ts`, and this ledger.
  - Config resolution, Contracts, ErrorCode, SemVer behavior/dependencies, root/package manifests, lockfile, active plan, workflow authority, Task 1 implementation, and all prior architecture rules were not changed.
  - No push, Secret value read, freeze regeneration, or Task 3 command occurred.
- Re-review result entering this checkpoint:
  - External package validation treated repository-root `node_modules/<key>` and `.pnpm/node_modules/<key>` as interchangeable candidates. A direct logical entry could exist with the wrong identity and point its `types` to a correctly named secondary pnpm entry; the loop skipped the invalid direct root and accepted the secondary root.
  - The required policy is first-existing and fail-closed: the direct logical entry owns validation whenever it exists. Secondary pnpm fallback is allowed only when direct `lstat` proves `ENOENT`, never when direct metadata or identity/root/resolved-file validation fails.
- Mandatory RED evidence before production repair:
  - `pnpm exec vitest run scripts/architecture/check.test.ts -t "does not fall back to pnpm when the direct package entry has the wrong identity"`: exit 1, `1 failed | 170 skipped`. The direct manifest used `name=wrong-tool` and pointed `types` at a correctly named `.pnpm/node_modules/declared-tool`; the checker incorrectly returned no violation.
  - The RED was an assertion on the missing stable `source_dependency_identity_invalid`; no timeout, syntax error, or fixture setup failure was used as evidence.
- Root-cause repair:
  - Validation now performs direct-entry `lstat` before selecting a logical root. A successful direct `lstat` binds all subsequent directory, canonical containment, resolved-file containment, regular package.json, parse, and exact-name checks to that direct entry; any failure returns false immediately.
  - Only a direct `ENOENT` selects repository-root `.pnpm/node_modules/<key>`. Any other direct metadata error fails closed without fallback, and any secondary metadata/identity/root failure also returns false.
  - Secondary support was retained rather than removed. The real install has no `node_modules/zod` direct entry but has a contained `.pnpm/node_modules/zod` symlink; production `architecture:check` passes this path. Direct `semver` and `vitest` entries also remain accepted.
- Preserved GREEN and attempt history:
  - The exact single control turned GREEN with `1 passed | 170 skipped`; the full architecture fixture then passed `171/171`, preserving all previous 170 controls, and production `architecture:check` passed.
  - The first format gate on the final logic exited 1 for one formatter-only line layout in `source-analysis.ts`. Lint, strict architecture typing, workspace typecheck, and focused `229/229` were already GREEN. The one layout was corrected, and all final-source gates below were rerun.
- Fresh final-source commands and results:
  - `pnpm install --frozen-lockfile --strict-peer-dependencies`: exit 0 across all nine workspace projects; lockfile was current.
  - `pnpm run format:check`: exit 0, 78 files; `pnpm run lint`: exit 0, 78 files with no warnings or info.
  - Standalone strict architecture `tsc` across model/config/source/check/test/fixture: exit 0.
  - `pnpm run typecheck`: exit 0 across repository policy and all eight workspace typechecks.
  - `pnpm exec vitest run scripts/architecture/check.test.ts`: exit 0, `1 file | 171 tests passed`.
  - `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/architecture/check.test.ts scripts/constitution/implementation-plan-policy.test.ts`: exit 0, `3 files | 229 tests passed`. Evidence: REAL_TEST / PASS.
  - `pnpm run test`: exit 0; root scripts passed `11 files | 256 tests`, followed by all eight workspace suites, including contracts `57/57`. Evidence: REAL_TEST / PASS.
  - `pnpm run build`: exit 0 across all eight workspaces; post-build `pnpm run architecture:check`: exit 0. Architecture production evidence remains STRUCTURAL_CHECK / PASS only.
- Fresh Task 1 safety and boundary commands:
  - Target-only and explicit-source spec verification each passed exactly 27 mappings; OpenSpec validation passed.
  - The immutable legacy freeze independently passed all 835 facts without regeneration.
  - Docker context policy, pinned full worktree/history/index Secret scan, immutable index Secret scan, and artifact Secret scanning over all eight explicit build roots exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`; no root package artifact was produced.
- Pre-amend immutable staging checks:
  - The index contained exactly `scripts/architecture/check.test.ts`, `scripts/architecture/source-analysis.ts`, and this ledger; there were no unstaged or nonignored untracked paths.
  - Cached whitespace, exact-path, and index/worktree consistency checks exited 0.
  - Final immutable-index and full worktree/history/index Secret checks both exited 0 before amend.
- Risks and boundaries:
  - Filesystem metadata/content remain point-in-time checks rather than an atomic snapshot. Pre-amend and clean post-amend gates therefore rescan source, index, resolution, and artifacts.
  - First-existing deliberately prefers direct repository-root package ownership. An invalid or transiently unreadable direct entry blocks the import instead of allowing a secondary entry to mask it.
  - The architecture checker remains static and cannot prove runtime IPC, RLS, transactions, process health, Electron sandbox, or Harness execution. `architecture:check` remains STRUCTURAL_CHECK.
  - Task 2 remains unapproved. No Task 3 command, push, workflow edit, Contracts/Evidence/ErrorCode/SemVer change, Secret value read, freeze regeneration, or Task 1 amend occurred.
- Historical resume at checkpoint creation: precisely stage the two architecture files and this ledger, run immutable index and full Secret checks plus whitespace/exact-path checks, amend only the latest Task 2 commit, then run the complete fresh gate matrix from clean amended `HEAD`. That sequence completed before the code-quality checkpoint below; current recovery is governed only by the top resume procedure.
- Next after both approvals only: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`.

### 2026-07-20 11:48 CST - Task 2 code-quality WITH FIXES repair committed, awaiting re-review

- Status: IN_PROGRESS. Task 2 specification re-review approved the seventh repair, but code-quality review returned WITH FIXES with two Important and two Minor findings. All four are repaired and locally verified in the current Task 2 implementation commit; fresh specification regression and code-quality re-review remain. Task 3 has not started and MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Scope boundary:
  - Changed only `scripts/architecture/check.test.ts`, `scripts/architecture/check.ts`, `scripts/architecture/model.ts`, `scripts/architecture/source-analysis.ts`, and this ledger.
  - Config resolution, Contracts, Evidence, ErrorCode/SemVer dependencies, module manifests/lockfile, active plan, workflow authority, Task 1 implementation, and all previously approved architecture behavior were not changed.
  - No tracked `dist` fixture, Task 3 path, push, Secret value read, or freeze regeneration was introduced.
- Code-quality result entering this checkpoint:
  - Important: exact canonical `@sartre/*` imports relied on TypeScript package resolution. When an allowed target package exported only ignored `dist` types/default files and the clean tree had no build output, an allowed root or source subpath import produced `source_specifier_unresolved` even though its contained `src` entry existed.
  - Important: deterministic string folding recursively rebuilt const expressions for every AST expression and had only a depth guard. Exponential concatenation could allocate rapidly growing strings; unsupported `repeat` returned unknown and could bypass a Secret assembled at runtime-static syntax.
  - Minor: dependency diagnostics used the first raw occurrence of a package token. An exact duplicate string in manifest metadata before the dependency section moved the violation away from the actual dependency key.
  - Minor: top recovery/status text still described a prior pre-amend specification repair instead of the code-quality WITH FIXES state and current reviewer order.
- Mandatory RED evidence before production repair:
  - Clean/no-dist canonical source group: exit 1, `1 failed | 1 passed | 175 skipped`. Allowed SDK imports of contracts root and subpath returned two `source_specifier_unresolved` violations when exports pointed to absent `dist`; the missing source-subpath rejection already passed.
  - Bounded constant evaluator group: exit 1, `3 failed | 174 skipped`. The exponential chain completed in about 1.16 seconds but returned no budget violation; oversized repeat returned no budget violation; a small repeated synthetic credential returned no Secret violation.
  - Dependency diagnostic line: exit 1, `1 failed | 176 skipped`. The violation used duplicate description line 6 instead of the actual dependency key on line 8.
  - Every RED asserted missing behavior or incorrect diagnostic location. No timeout, syntax error, fixture setup error, or real Secret was used as behavioral evidence.
- Root-cause repair:
  - Exact known canonical package specifiers now resolve only through bounded target-source candidates: `src/index.*`, `src/<subpath>.*`, or `src/<subpath>/index.*` over the approved JS/TS source extensions. The target `src` root and resolved file must be existing contained regular non-symlink paths; nonexistent lexical candidates are never accepted.
  - Canonical source resolution is independent of package `exports` and ignored build output, while dependency graph enforcement is unchanged. Relative imports, root/module aliases, and external packages retain the TypeScript resolver and existing identity/root checks. The clean fixture points realistic `types/default` exports to absent `dist` and creates no tracked build output.
  - Static evaluation is now one memoized evaluator per source file with distinct value/unknown/budget results, a 64 KiB folded-byte limit, 4096 total evaluation operations, and depth 32. Concatenation, template, array join, and repeat calculate output bytes before allocation. Cycles and ambiguous shadow bindings remain unknown without execution.
  - Once any static budget is exceeded, the source fails closed with exactly one stable `static_evaluation_budget_exceeded`; it cannot degrade to unknown and permit the file. Small deterministic repeat continues into the existing Secret scanner.
  - Dependency lines are derived from the already-valid package JSON using TypeScript's JSON AST, scoped first to the exact dependency section and then to its exact property key. Raw text lookup remains only a defensive fallback.
  - Top status and resume now require fresh specification regression followed by code-quality re-review; prior specification approval is not reused after source changes.
- Preserved GREEN and attempt history:
  - Exact groups turned GREEN: canonical source `2/2`, dependency line `1/1`, and bounded evaluator `3/3`. The bounded group completed in about 78 ms after memoization and preflight.
  - Full architecture passed `177/177`, preserving all prior 171 controls; production `architecture:check` and standalone strict architecture typing passed.
  - The first format gate exited 1 only on layouts in `check.test.ts`, `check.ts`, and `source-analysis.ts`; lint, full architecture, strict typing, and production architecture were already GREEN. Targeted formatting changed only those three files, and the full final-source gates were rerun.
- Fresh final-source commands and results:
  - `pnpm install --frozen-lockfile --strict-peer-dependencies`: exit 0 across all nine workspace projects; lockfile was current.
  - `pnpm run format:check`: exit 0, 78 files; `pnpm run lint`: exit 0, 78 files with no warnings or info.
  - Standalone strict architecture `tsc` across model/config/source/check/test/fixture: exit 0.
  - `pnpm run typecheck`: exit 0 across repository policy and all eight workspace typechecks.
  - `pnpm exec vitest run scripts/architecture/check.test.ts`: exit 0, `1 file | 177 tests passed`.
  - `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/architecture/check.test.ts scripts/constitution/implementation-plan-policy.test.ts`: exit 0, `3 files | 235 tests passed`. Evidence: REAL_TEST / PASS.
  - `pnpm run test`: exit 0; root scripts passed `11 files | 262 tests`, followed by all eight workspace suites, including contracts `57/57`. Evidence: REAL_TEST / PASS.
  - `pnpm run build`: exit 0 across all eight workspaces; post-build `pnpm run architecture:check`: exit 0. Architecture production evidence remains STRUCTURAL_CHECK / PASS only.
- Fresh Task 1 safety and boundary commands:
  - Target-only and explicit-source spec verification each passed exactly 27 mappings; OpenSpec validation passed.
  - The immutable legacy freeze independently passed all 835 facts without regeneration.
  - Docker context policy, pinned full worktree/history/index Secret scan, immutable index Secret scan, and artifact Secret scanning over all eight explicit build roots exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`; no root package artifact was produced.
- Pre-amend immutable staging checks:
  - The index contained exactly the four architecture source/test files and this ledger; there were no unstaged or nonignored untracked paths.
  - Cached whitespace, exact-path, and index/worktree consistency checks exited 0.
  - Final immutable-index and full worktree/history/index Secret checks both exited 0 before amend.
- Risks and boundaries:
  - Canonical source candidate enumeration is deliberately closed to the approved JS/TS extension list and exact known modules. Adding other source formats or public subpath conventions requires an explicit constitution/test change rather than falling back to `dist` or lexical paths.
  - A deterministic source expression above the static budget is rejected even when its eventual value might be safe. This is intentional fail-closed behavior; large generated content belongs outside tracked source.
  - JSON AST line lookup assumes the package manifest has already passed strict JSON parsing, as enforced before dependency analysis.
  - The architecture checker remains static and cannot prove runtime IPC, RLS, transactions, process health, Electron sandbox, or Harness execution. `architecture:check` remains STRUCTURAL_CHECK.
  - Task 2 remains unapproved. No Task 3 command, push, workflow edit, Contracts/Evidence/ErrorCode/SemVer dependency change, Secret value read, freeze regeneration, or Task 1 amend occurred.
- Historical resume at checkpoint creation: from the clean Task 2 commit, rerun focused contracts/architecture/plan policy, standalone strict architecture typing, production architecture, and full Secret; obtain fresh specification regression, then code-quality re-review. That sequence completed and produced the export finding below; current recovery is governed only by the top resume procedure.
- Next after both approvals only: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`.

### 2026-07-20 13:55 CST - Task 2 final quality export repair committed, awaiting same-reviewer re-review

- Status: IN_PROGRESS. The fresh specification regression approved the prior quality repair, but code-quality re-review found one Important export exposure and extension mapping gap. It is repaired and locally verified in the current Task 2 implementation commit; fresh targeted specification regression and the same code-quality reviewer re-review remain. Task 3 has not started and MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Scope boundary:
  - Changed only `scripts/architecture/check.test.ts`, `scripts/architecture/check.ts`, `scripts/architecture/model.ts`, `scripts/architecture/source-analysis.ts`, and this ledger.
  - Constant evaluator, dependency diagnostic lines, config resolution, external package identity/root binding, Contracts, Evidence, ErrorCode/SemVer dependencies, module manifests/lockfile, active plan, workflow authority, and Task 1 implementation were not changed.
  - No tracked `dist` fixture, Task 3 path, push, Secret value read, or freeze regeneration was introduced.
- Code-quality result entering this checkpoint:
  - Canonical source resolution accepted any existing contained `src` subpath under a known package even when that exact subpath was not exposed by the target package manifest. A package exporting only `.` could therefore be imported through `@sartre/contracts/internal` when `src/internal.ts` existed.
  - Source extension resolution universally stripped a recognized JS/TS suffix and tried every approved source extension. An exported `./feature.mjs` backed only by `src/feature.ts` was incorrectly accepted, and the recommended declaration mappings were incomplete.
- Mandatory RED evidence before production repair:
  - Export exposure group: exit 1, `9 failed | 5 passed | 189 skipped`. Unexported contained source, missing/null/all-null exposure, and four mixed/wildcard/invalid export shapes exposed the missing policy; existing root/subpath positives and missing-source rejection already passed.
  - Extension mapping group: exit 1, `4 failed | 10 passed | 189 skipped`. The exact reviewer `.mjs -> .ts` case was incorrectly accepted, while `.d.mts`, `.d.cts`, and `.d.ts` recommended positives were not resolved.
  - Every RED asserted exposure or exact mapping behavior. No timeout, syntax error, fixture setup error, generated `dist`, or real Secret was used as behavioral evidence.
- Root-cause repair:
  - Every valid canonical module manifest is parsed before source analysis into an exact exposed-key set. A top-level string, array, or conditional object with no dot-prefixed keys exposes root `.` only when recursive traversal finds at least one non-null string target.
  - A subpath object may contain only exact `.` or `./subpath` keys. Each value may be a string, array, null, or conditional object and exposes its key only when at least one recursive branch is a non-null string. Missing, null, or all-null shapes are valid but expose nothing, so a canonical import fails closed.
  - Mixed condition/subpath objects, invalid scalar/nested targets, unsafe exact keys, and wildcard/pattern keys emit stable `manifest_exports_invalid` and expose no keys. Condition names are not executed or selected, and export target files/build output do not need to exist.
  - Source analysis receives the target module's exact exposed keys. A canonical import is accepted only when its exact `.`/`./subpath` key is exposed and the corresponding bounded contained regular source candidate exists; package graph enforcement remains unchanged.
  - Explicit `.mjs` imports map only to `.mts`, `.d.mts`, or `.mjs`; `.cjs` maps only to `.cts`, `.d.cts`, or `.cjs`; `.js` maps only to `.ts`, `.tsx`, `.d.ts`, `.js`, or `.jsx`. Other explicit source extensions remain exact, while extensionless subpaths retain the bounded direct/index candidate list. The export key, including its extension, is never normalized for exposure lookup.
- Preserved GREEN and attempt history:
  - Exact groups turned GREEN: export policy `14/14` and extension mapping `14/14`.
  - Full architecture passed `203/203`, preserving all previous 177 controls; production `architecture:check` and standalone strict architecture typing passed.
  - The first format gate exited 1 only on layouts in `check.test.ts`, `check.ts`, and `source-analysis.ts`; lint, full architecture, strict typing, and production architecture were already GREEN. Targeted formatting changed only those three files, and the full final-source gates were rerun.
- Fresh final-source commands and results:
  - `pnpm install --frozen-lockfile --strict-peer-dependencies`: exit 0 across all nine workspace projects; lockfile was current.
  - `pnpm run format:check`: exit 0, 78 files; `pnpm run lint`: exit 0, 78 files with no warnings or info.
  - Standalone strict architecture `tsc` across model/config/source/check/test/fixture: exit 0.
  - `pnpm run typecheck`: exit 0 across repository policy and all eight workspace typechecks.
  - `pnpm exec vitest run scripts/architecture/check.test.ts`: exit 0, `1 file | 203 tests passed`.
  - `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/architecture/check.test.ts scripts/constitution/implementation-plan-policy.test.ts`: exit 0, `3 files | 261 tests passed`. Evidence: REAL_TEST / PASS.
  - `pnpm run test`: exit 0; root scripts passed `11 files | 288 tests`, followed by all eight workspace suites, including contracts `57/57`. Evidence: REAL_TEST / PASS.
  - `pnpm run build`: exit 0 across all eight workspaces; post-build `pnpm run architecture:check`: exit 0. Architecture production evidence remains STRUCTURAL_CHECK / PASS only.
- Fresh Task 1 safety and boundary commands:
  - Target-only and explicit-source spec verification each passed exactly 27 mappings; OpenSpec validation passed.
  - The immutable legacy freeze independently passed all 835 facts without regeneration.
  - Docker context policy, pinned full worktree/history/index Secret scan, immutable index Secret scan, and artifact Secret scanning over all eight explicit build roots exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`; no root package artifact was produced.
- Pre-amend immutable staging checks:
  - The index contained exactly the four architecture source/test files and this ledger; there were no unstaged or nonignored untracked paths.
  - Cached whitespace, exact-path, and index/worktree consistency checks exited 0.
  - Final immutable-index and full worktree/history/index Secret checks both exited 0 before amend.
- Risks and boundaries:
  - The first-version export parser validates a deliberately bounded structural subset and does not reproduce Node condition selection. Any valid non-null string branch establishes exposure; authorization still depends on the exact export key and contained source.
  - Missing/null exports do not make an otherwise unused package manifest invalid, but they expose no canonical import. Invalid/mixed/pattern shapes fail the manifest explicitly.
  - Export targets are policy metadata only; the architecture checker neither executes conditions nor trusts/reads ignored `dist` output to resolve canonical source.
  - Other source formats or extension mappings require a deliberate constitution/test change rather than universal suffix fallback.
  - The architecture checker remains static and cannot prove runtime IPC, RLS, transactions, process health, Electron sandbox, or Harness execution. `architecture:check` remains STRUCTURAL_CHECK.
  - Task 2 remains unapproved. No Task 3 command, push, workflow edit, evaluator/diagnostic/config/external-identity change, Secret value read, freeze regeneration, or Task 1 amend occurred.
- Historical resume at checkpoint creation: from the clean current Task 2 commit, rerun the two exact export groups, full architecture, focused contracts/architecture/plan policy, standalone strict architecture typing, production architecture, and full Secret; obtain fresh targeted specification regression, then return to the same code-quality reviewer. That sequence completed and exposed the shared source-policy drift below; current recovery is governed only by the top resume procedure.
- Next after both approvals only: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`.

### 2026-07-20 14:25 CST - Task 2 final source-policy repair ready for amend

- Status: IN_PROGRESS. Final code-quality self-review found one source-inventory/canonical-resolver suffix-policy drift after the prior export repair. The shared-policy repair is locally GREEN and awaits precise amend, fresh targeted specification regression, and the same code-quality reviewer re-review. Task 3 has not started and MS0 remains IN_PROGRESS.
- Change: `ms0-repository-constitution`.
- Scope boundary:
  - Changed only `scripts/architecture/check.test.ts`, `scripts/architecture/check.ts`, `scripts/architecture/source-analysis.ts`, new `scripts/architecture/source-policy.ts`, and this ledger.
  - Export exposure parsing, bounded constant evaluation, dependency diagnostic lines, config resolution, external package identity/root binding, Contracts, Evidence, ErrorCode/SemVer dependencies, module manifests/lockfile, active plan, workflow authority, and Task 1 implementation were not changed.
  - No tracked `dist` fixture, Task 3 path, push, Secret value read, or freeze regeneration was introduced.
- Final quality finding entering this checkpoint:
  - Canonical resolution already recognized `.mts`, `.d.mts`, `.cts`, and `.d.cts`, but repository inventory independently classified readable source through a narrower local extension set. Those four target files were therefore never decoded or entered into AST analysis even when a canonical import resolved to them.
  - This was a fail-open policy drift rather than a resolver failure: an imported target source could contain a forbidden dependency at line 1 while the importer and manifest remained otherwise valid, yet the architecture checker returned no target-source violation.
- Mandatory RED evidence before production repair:
  - `pnpm exec vitest run scripts/architecture/check.test.ts -t "quality re-review - canonical TypeScript extension mapping"`: exit 1, `4 failed | 24 passed | 189 skipped`.
  - The four expected failures were exactly the `.mts`, `.d.mts`, `.cts`, and `.d.cts` target-analysis cases. Each expected `dependency_direction_forbidden` on the resolved target source at line 1, not on the importer. Existing root, extensionless, `.mjs`, `.cjs`, `.js`, `.ts`, `.tsx`, `.d.ts`, `.jsx`, direct, and index controls remained GREEN.
- Root-cause repair:
  - Added one shared `source-policy.ts` for target-source classification and canonical source candidate selection. Target-source suffixes are exactly `.ts`, `.tsx`, `.mts`, `.cts`, `.d.ts`, `.d.mts`, `.d.cts`, `.js`, `.jsx`, `.mjs`, and `.cjs`.
  - `check.ts` inventory now delegates source classification to shared `isTargetSourceFile`; non-source text/build/extensionless inventory behavior remains unchanged.
  - `source-analysis.ts` now delegates extensionless candidates and explicit `.js`/`.mjs`/`.cjs` mapping to the same shared policy. Explicit mappings and export-key exposure lookup remain exact and unchanged.
  - No candidate widening was introduced: `.mjs` still maps only to `.mts`/`.d.mts`/`.mjs`, `.cjs` only to `.cts`/`.d.cts`/`.cjs`, `.js` only to `.ts`/`.tsx`/`.d.ts`/`.js`/`.jsx`, explicit source extensions remain exact, and extensionless paths retain the bounded direct/index list.
- Preserved GREEN and attempt history:
  - The targeted extension suite turned GREEN at `28/28`; full architecture passed `217/217`, preserving all previous `203/203` controls.
  - Focused contracts/architecture/plan-policy passed `275/275`; the root scripts passed `302/302`, and the eight workspace suites passed, including contracts `57/57`.
  - The first format gate on the final logic exited 1 only for layout in `check.test.ts` and `source-analysis.ts`. Targeted Biome formatting changed only those files, after which fresh format and lint exited 0.
- Fresh final-source commands and results:
  - `pnpm install --frozen-lockfile --strict-peer-dependencies`: exit 0 across all nine workspace projects; lockfile was current.
  - `pnpm run format:check` and `pnpm run lint`: exit 0 with no warnings or info after the recorded formatter-only repair.
  - `pnpm exec tsc --noEmit --target ES2024 --module NodeNext --moduleResolution NodeNext --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --noImplicitOverride --useUnknownInCatchVariables --verbatimModuleSyntax --skipLibCheck --types node,vitest scripts/architecture/model.ts scripts/architecture/config-resolution.ts scripts/architecture/source-policy.ts scripts/architecture/source-analysis.ts scripts/architecture/check.ts scripts/architecture/check.test.ts scripts/architecture/fixtures/repository.ts`: exit 0.
  - `pnpm run typecheck`: exit 0 across repository policy and all eight workspace typechecks.
  - `pnpm exec vitest run scripts/architecture/check.test.ts -t "quality re-review - canonical TypeScript extension mapping"`: exit 0, `28/28`.
  - `pnpm exec vitest run scripts/architecture/check.test.ts`: exit 0, `1 file | 217 tests passed`.
  - `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/architecture/check.test.ts scripts/constitution/implementation-plan-policy.test.ts`: exit 0, `3 files | 275 tests passed`. Evidence: REAL_TEST / PASS.
  - `pnpm run test`: exit 0; root scripts passed `11 files | 302 tests`, followed by all eight workspace suites, including contracts `57/57`. Evidence: REAL_TEST / PASS.
  - `pnpm run build`: exit 0 across all eight workspaces; post-build `pnpm run architecture:check`: exit 0. Architecture production evidence remains STRUCTURAL_CHECK / PASS only.
- Fresh Task 1 safety and boundary commands:
  - Target-only and explicit-source spec verification each passed exactly 27 mappings; OpenSpec validation passed.
  - The immutable legacy freeze independently passed all 835 facts without regeneration.
  - Docker context policy, pinned full worktree/history/index Secret scan, immutable index Secret scan, and artifact Secret scanning over all eight explicit build roots exited 0.
  - `pnpm pack` exited 1 with required `root_packaging_prohibited`; no root package artifact was produced.
- Pre-amend immutable staging checks:
  - The index contained exactly `scripts/architecture/check.test.ts`, `scripts/architecture/check.ts`, `scripts/architecture/source-analysis.ts`, new `scripts/architecture/source-policy.ts`, and this ledger; there were no unstaged or nonignored untracked paths.
  - Cached whitespace, exact-path, and index/worktree consistency checks exited 0.
  - Final immutable-index and full worktree/history/index Secret checks both exited 0 before amend.
- Risks and boundaries:
  - Source suffixes now have one shared runtime policy, but any future supported source format or import-extension mapping still requires a deliberate constitution/test change rather than filesystem fallback.
  - Export targets remain policy metadata only; the checker neither executes export conditions nor reads ignored `dist` output to authorize canonical source.
  - The architecture checker remains static and cannot prove runtime IPC, RLS, transactions, process health, Electron sandbox, or Harness execution. `architecture:check` remains STRUCTURAL_CHECK.
  - Task 2 remains unapproved. No Task 3 command, push, workflow edit, evaluator/diagnostic/config/external-identity change, Contracts/Evidence/ErrorCode/SemVer change, Secret value read, freeze regeneration, or Task 1 amend occurred.
- Historical resume at checkpoint creation: precisely stage the four architecture source/test files and this ledger, run immutable exact-path/index/worktree/Secret checks, amend only the latest Task 2 commit, then rerun the targeted extension suite and complete fresh gate matrix from clean amended `HEAD`. Obtain fresh targeted specification regression, then return to the same code-quality reviewer. That sequence and both reviews completed before the closeout checkpoint below; current recovery is governed only by the top resume procedure.
- Historical next after both approvals: run `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`. This text is superseded because the two Task 3 test files do not exist yet; current recovery first creates the failing tests, then runs the command for behavioral RED.

### 2026-07-20 14:55 CST - Task 2 dual-review approved, ledger-only closeout

- Status: DONE. Final targeted specification regression is APPROVED and the same code-quality reviewer reported Ready YES with no issues. This closes Task 2 only; MS0 remains IN_PROGRESS and Task 3 has not started.
- Change: `ms0-repository-constitution`.
- Reviewed subject binding:
  - Review subject commit: `c770b8b266aeea82e6855b5d5bb8b2156f23df2d`, subject `feat(ms0): enforce module and contract boundaries`, sole parent `983843d3985c9391b5a030aeec17148658d48d69`.
  - Reviewed full tree: `0c82e61d0a6c61e6bb4aaf3bb929ca315ff02816`.
  - The final closeout amend changes only this ledger. The final commit SHA cannot self-reference; after amend the controller must verify the clean two-commit chain and prove the only delta from the reviewed subject is this ledger. Any source/test/config delta invalidates both approvals.
- Final reviewer evidence:
  - Targeted specification regression: APPROVED. The reviewer accepted the shared source-policy repair and its exact target-source violation binding, with no open specification issue.
  - Same code-quality reviewer: Ready YES, no Critical, Important, or other blocking issue.
  - The final clean reviewed source passed targeted extension `28/28`, full architecture `217/217`, focused contracts/architecture/plan-policy `275/275`, root scripts `302/302`, contracts `57/57`, standalone strict architecture typing, repository/workspace typecheck, eight-workspace build, production architecture, and Task 1 spec/freeze/Docker/Secret/artifact safety gates.
- Accepted deliberate boundaries:
  - `architecture:check` remains STRUCTURAL_CHECK / PASS only. It does not prove runtime IPC, RLS, transactions, process health, Electron sandbox, Harness execution, or MS0 closeout.
  - Canonical selector suffixes, explicit `.js`/`.mjs`/`.cjs` mappings, and supported `exports` shapes are deliberately strict bounded subsets. New formats, patterns, or Node condition-selection semantics require an explicit constitution/test change; there is no filesystem or `dist` fallback.
  - The static constant evaluator deliberately rejects expressions that exceed its node/step/string budgets, even if they could eventually evaluate safely. This is accepted fail-closed behavior, not a requirement to widen evaluation.
- Scope and safety:
  - This closeout changes only `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md`; no Task 2 source/test/config, Task 1 path, active plan, workflow, manifest, lockfile, or package file changes.
  - No Task 3 file or command, push, Secret value read, freeze regeneration, or new MS implementation occurred.
- Task 3 handoff:
  - Next implementation action: create `scripts/evidence/validate.test.ts` and `scripts/harness/run-required-gates.test.ts` with the failing cases specified in Task 3 of the active plan.
  - First verification only after both test files exist: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`.
  - Expected first result: behavioral RED because the evidence validator and required-gate runner implementation are missing. A no-file or missing-test-path failure is not accepted RED evidence.
- Pre-amend immutable staging checks:
  - The index contained only this ledger; there were no unstaged or nonignored untracked paths, and cached whitespace passed.
  - The first parallel Secret invocations returned only startup output without exit codes and are not evidence. Explicit serial reruns of immutable-index and full worktree/history/index Secret checks each returned exit 0 with `Secret boundary check passed`.
  - After this staging result is written, restage this ledger, repeat exact-path/cached/index/full Secret checks, amend Task 2, then verify the final two-commit chain, clean status/diff, focused reviewer suites, production architecture, and full Secret without running any Task 3 command.

### 2026-07-20 15:38 CST - Task 3 fail-closed Evidence/Harness foundation ready for commit

- Status: IN_PROGRESS. Task 3 implementation and local verification are complete, but independent specification and code-quality approvals are still required. MS0 remains IN_PROGRESS; Task 4 has not started.
- Scope:
  - Added a validator that reuses the authoritative `packages/contracts` `EvidenceManifestSchema` with `commitSha` and compares the trusted gate declaration against the reported manifest and observed subject state.
  - Added an exact-argv collector using `spawn` with `shell: false`. It rejects caller environment input, known environment/config dumps, shell executables, and non-allowlisted argv before execution; persists raw stdout/stderr only under the caller-specified raw log directory; and returns only hashes and redacted facts.
  - Added the required-gate runner, contained regular config loading, contained output/raw-log boundaries, ordered execution, retained attempt history, fail-closed exception/SKIPPED handling, manifest output, and a human-readable report containing every attempt.
  - Added `ms0.config.ts` as a deliberately BLOCKED foundation configuration. It does not run or claim future Task 4-9 capabilities and cannot be mistaken for MS0 closeout evidence.
  - Added missing-command and required-SKIPPED CLI negative fixtures plus evidence schema version `1`.
- TDD attempt history:
  - Invalid precondition wrapper: `/usr/bin/test -f scripts/evidence/validate.test.ts && /usr/bin/test -f scripts/harness/run-required-gates.test.ts && pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`: exit 127 with `zsh:1: no such file or directory: /usr/bin/test`. Vitest did not start. This is NOT behavioral RED and is retained only as an invalid tool-path attempt.
  - Valid behavioral RED: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`: exit 1. Both exact suites were discovered and failed because `./collect-command.js` and `./run-required-gates.js` production modules were absent; this is the accepted behavior RED.
  - First production-presence GREEN attempt: the focused command exited 1 with `16 failed | 4 passed`. Root cause was combining the root Zod v3 runtime with the contracts package Zod v4 schemas in one envelope schema (`keyValidator._parse is not a function`). The implementation now performs a bounded manual envelope-shape check and delegates the manifest only to the authoritative contracts schema; no behavioral assertion was weakened.
  - Production presence exposed TypeScript-only fixture narrowing defects (`null`-only observation fields, widened config literals, and zero-argument mock tuples). The tests received explicit fixture return types and mock parameters without changing any runtime assertion. Standalone strict typing then passed.
- Fresh Task 3 evidence:
  - `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`: exit 0, `2 files | 20 tests passed`.
  - `pnpm exec tsx scripts/harness/run-required-gates.ts --config scripts/harness/fixtures/missing-command.ts`: exit 1. The required attempt is BLOCKED with `command_not_found`, `targetExecuted=false`, and no unhandled success.
  - `pnpm exec tsx scripts/harness/run-required-gates.ts --config scripts/harness/fixtures/skipped-required.ts`: exit 1. The required SKIPPED attempt is retained and overall status is BLOCKED.
  - `pnpm exec tsc --noEmit --strict --noUncheckedIndexedAccess --exactOptionalPropertyTypes --module NodeNext --moduleResolution NodeNext --target ES2024 --types node scripts/evidence/validate.ts scripts/evidence/collect-command.ts scripts/evidence/validate.test.ts scripts/harness/run-required-gates.ts scripts/harness/run-required-gates.test.ts scripts/harness/ms0.config.ts scripts/harness/fixtures/missing-command.ts scripts/harness/fixtures/skipped-required.ts`: exit 0.
  - `pnpm run format:check`: exit 0, 87 files checked. `pnpm run lint`: exit 0, 87 files checked.
  - `pnpm run test`: exit 0, root scripts passed `13 files | 322 tests`, then all eight workspace suites passed, including contracts `57/57`.
  - `pnpm run typecheck`: exit 0 across repository policy and all eight workspaces.
  - `pnpm run build`: exit 0 across repository policy and all eight workspaces.
  - `pnpm run architecture:check`: exit 0, STRUCTURAL_CHECK / PASS only.
  - `pnpm run secret:check`: exit 0. `pnpm run secret:artifacts -- apps/electron-app/dist apps/hub-api/dist apps/hub-worker/dist apps/local-runtime/dist packages/contracts/dist packages/domain/dist packages/runtime-core/dist packages/sdk/dist`: exit 0 across all eight build roots.
  - `git diff --check`: exit 0.
- Evidence boundary:
  - Task 3 proves the foundation's unit behavior and the two contained CLI failure modes. It is not MS0 closeout evidence, does not claim future gates PASS, and does not prove PostgreSQL, process health, diagnostic timelines, Electron packaging, or release evidence.
  - `architecture:check` remains STRUCTURAL_CHECK and cannot be relabeled REAL_TEST.
  - The authoritative manifest schema cannot encode per-gate attempt history, so the persisted Harness document keeps the strict manifest under `manifest` and the append-only attempt records under `attempts`; the human report also includes every attempt. Review must confirm this envelope is acceptable before Task 4.
  - The collector executes only repository-declared exact argv and deliberately prohibits shell/config/environment-dump forms. Command-specific assertion extraction remains an explicit configured boundary, not an inference from output hashes.
- Changed files: `scripts/evidence/validate.ts`, `scripts/evidence/collect-command.ts`, `scripts/evidence/validate.test.ts`, `scripts/harness/run-required-gates.ts`, `scripts/harness/run-required-gates.test.ts`, `scripts/harness/ms0.config.ts`, `scripts/harness/fixtures/missing-command.ts`, `scripts/harness/fixtures/skipped-required.ts`, `reports/ms0-repository-constitution/evidence/schema-version.txt`, and this ledger.
- Next command after precise staging, immutable-index Secret verification, commit, and clean status verification: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`. Obtain independent Task 3 specification approval, then independent code-quality approval; do not enter Task 4 before both approve.

### 2026-07-20 16:23 CST - Task 3 first specification-review trusted-boundary repair

- Status: IN_PROGRESS. The first Task 3 specification review FAILED. All four confirmed blocker categories are repaired through focused TDD and fresh repository gates, but the existing Task 3 commit must be precisely amended and specification re-review must approve before code-quality review. MS0 remains IN_PROGRESS; Task 4 has not started.
- Specification FAIL:
  - The aggregate runner could return exit 0 for a required `STRUCTURAL_CHECK/PASS` while writing a nested `SCENARIO_REGISTERED/PASS` manifest rejected by the authoritative schema; the final aggregate was not schema-gated.
  - CLI treated config subject strings and a constant null evidence commit as observation. Dirty mismatch and real evidence-child relationship checks were unreachable, while config could self-report assertions, failure mode, service state, and artifact facts.
  - Config/caller argv self-authorized arbitrary execution. Raw output paths were not enforced inside contained `reports/**/raw` by the collector itself, intermediate symlinks were not preflighted before mutation, and Secret-bearing output could be persisted raw.
  - Tool versions, Vitest counts, failure counts, assertions, and error codes were caller claims/defaults rather than facts extracted from executed fixed commands. Prior persisted attempts were cast without runtime validation.
- Root-cause correction:
  - Replaced caller argv/allowlist with one code-owned command registry. Config gates reference only fixed policy ids. The registry currently owns Node version, pnpm version, exact Task 3 focused Vitest, and the missing-command negative policy. Unknown ids and every extra caller/config field fail before execution.
  - The collector now owns contained segment-by-segment `reports/**/raw` preflight, executes fixed argv with `spawn` and `shell:false`, scans combined output through the approved Secret boundary before any log write, stores only a safe repository-relative raw-log reference, and never returns raw stdout/stderr or an absolute local path.
  - Bounded code-owned extractors parse observed Node/pnpm versions and Vitest passed/failed/skipped counts. Assertions, key assertions, failure counts, stable error codes, and known Vitest non-zero failure semantics come from the extractor, not config.
  - Added physical Git subject observation. Declared commit/tree are verified with fixed Git argv; dirty state is SHA-256 over the approved `buildRepositoryWorktreeGitleaksInput(root)`, which covers physical tracked and nonignored-untracked state without reading ignored credential input. `subject-head` observes no evidence commit; `evidence-child` requires exactly one actual parent and passes the real HEAD evidence commit into validation.
  - Config runtime validation rejects tool versions, argv, allowlists, assertions, failure claims, service claims, artifact claims, duplicate gates, unknown policies, and extra keys. Tool versions are collected separately through fixed version policies.
  - Previous envelopes require an authoritative nested manifest plus runtime-valid attempt records before reuse. Final aggregate level is conservative (`STRUCTURAL_CHECK` when any successful attempt is structural); the nested manifest must parse through `EvidenceManifestSchema` before write. A schema-invalid success is converted to BLOCKED only if a valid BLOCKED manifest can be formed, otherwise the runner exits non-zero without writing invalid evidence.
  - Config import, output writes, raw logs, and prior-envelope reads perform contained metadata preflight before import/read/mkdir/write. `ms0.config.ts` remains deliberately required-SKIPPED/BLOCKED and cannot claim Task 4-9 or MS0 closeout.
- Grouped TDD evidence:
  - RED command: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`: exit 1, both files discovered, `17 failed | 14 passed` across 31 tests. Failures covered aggregate structural schema gating, runtime config/previous-envelope validation, missing real Git observer, config-supplied Node environment dump/Git config/Git credential/profile-read argv, outside and symlinked raw paths, Secret output persistence, and absent tool/Vitest extractors. This was behavioral RED, not a syntax, no-file, or discovery error.
  - Collector/validator GREEN: `pnpm exec vitest run scripts/evidence/validate.test.ts`: exit 0, `1 file | 21 tests passed`.
  - Runner/Git observer GREEN: `pnpm exec vitest run scripts/harness/run-required-gates.test.ts`: exit 0, `1 file | 10 tests passed`.
  - Combined GREEN: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`: exit 0, `2 files | 31 tests passed`.
  - Missing command CLI: `pnpm exec tsx scripts/harness/run-required-gates.ts --config scripts/harness/fixtures/missing-command.ts`: exit 1 after observing real subject and Node `v24.11.0`/pnpm `10.33.2`; the new attempt is BLOCKED with `command_not_found` and `targetExecuted=false`.
  - Required SKIPPED CLI: `pnpm exec tsx scripts/harness/run-required-gates.ts --config scripts/harness/fixtures/skipped-required.ts`: exit 1 after the same real subject/tool observation; the required attempt records `required_gate_skipped` and overall BLOCKED.
  - Standalone strict Task 3 `tsc` command from the prior checkpoint, covering all eight Task 3 source/test/config paths, exited 0 after this repair.
- Repository gate attempt history:
  - Fresh `pnpm run format:check` and `pnpm run lint`: exit 0, 87 files and no fixes/warnings. `pnpm run typecheck`: exit 0 across repository policy and all eight workspaces. `pnpm run architecture:check`: exit 0 and remains STRUCTURAL_CHECK only.
  - First fresh `pnpm run test`: exit 1 with `2 failed | 331 passed`. Both failures were the new real-Git subject cases exceeding Vitest's default 5-second case timeout under full 13-file parallel load (`6.49s` and `8.73s`), with no assertion mismatch. Focused runner had passed `10/10` in `4.38s`.
  - Only those two real-Git cases received local 15-second timeouts; no global timeout or assertion changed. Focused runner reran exit 0, `10/10` in `4.99s`. Fresh full `pnpm run test` then exited 0: root scripts `13 files | 333 tests`, followed by all eight workspace suites including contracts `57/57`.
  - `pnpm run build`: exit 0 across repository policy and all eight workspaces. Post-build `pnpm run architecture:check`: exit 0, STRUCTURAL_CHECK only.
  - Full `pnpm run secret:check`: exit 0. Explicit eight-root `pnpm run secret:artifacts -- apps/electron-app/dist apps/hub-api/dist apps/hub-worker/dist apps/local-runtime/dist packages/contracts/dist packages/domain/dist packages/runtime-core/dist packages/sdk/dist`: exit 0. `git diff --check`: exit 0.
- Risks and boundaries:
  - Adding an executable command requires an explicit registry and test change; config cannot widen execution dynamically.
  - Output Secret rejection uses the approved repository supplemental Secret detector before persistence. Raw logs remain ignored local diagnostics; no raw output enters the tracked envelope.
  - The physical worktree binding deliberately covers tracked and nonignored-untracked physical content and excludes ignored credential input. It is not a replacement for the separate full/index Secret gates.
  - The persisted envelope remains `{ manifest, attempts }`, but the nested manifest is now independently authoritative-schema valid on every write, and attempts are runtime validated. This remains Task 3 foundation evidence, not MS0 closeout.
  - `architecture:check` remains STRUCTURAL_CHECK and does not prove runtime Harness, PostgreSQL, process, Electron, or release behavior.
- Pre-amend immutable staging:
  - The index contained exactly the eight changed Task 3/ledger paths listed below, with no unstaged or nonignored untracked path. Cached whitespace and the exact eight-path assertion exited 0.
  - `pnpm run secret:check -- --index`: exit 0 with `Secret boundary check passed`. A fresh full `pnpm run secret:check` over the same staged worktree also exited 0.
  - This ledger-only staging-result addition is restaged and the cached/full Secret checks are repeated before amend; startup-only output without a final exit code is not accepted.
- Changed paths: `scripts/evidence/collect-command.ts`, `scripts/evidence/validate.test.ts`, `scripts/harness/run-required-gates.ts`, `scripts/harness/run-required-gates.test.ts`, `scripts/harness/ms0.config.ts`, `scripts/harness/fixtures/missing-command.ts`, `scripts/harness/fixtures/skipped-required.ts`, and this ledger. No Task 1/2 source, authority plan/workflow/spec, freeze manifest, Task 4, or MS1 path changed.
- Next after precise staging, immutable-index/full Secret verification, and amend: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`; then rerun both negative CLIs and obtain fresh Task 3 specification re-review. Do not start code-quality review or Task 4 before specification approval.

### 2026-07-20 16:53 CST - Task 3 second specification-review prior-history repair

- Status: IN_PROGRESS. The second Task 3 specification re-review independently accepted the four prior trusted-boundary repairs but FAILED on one remaining HIGH: persisted attempts were shape-checked but not semantically rebound or revalidated. The scoped repair is locally GREEN and awaits amend plus another specification re-review. Code-quality review, Task 4, and MS1 have not started.
- Confirmed HIGH and root cause:
  - A forged historical `REAL_TEST/PASS` attempt with a schema-valid command/assertion, `targetExecuted=false`, `failureModeVerified=false`, and empty stored `validationIssues` passed because only `isGateAttempt` shape ran. A later valid attempt allowed overall PASS/exit 0.
  - Historical gate id, required declaration, evidence declaration, and command argv were not rebound to the current gate and code-owned policy.
  - The persisted nested manifest was parsed for shape only and then discarded by the loader. Its subject/schema/release/artifact/environment/tool binding was never compared with the current declared and observed subject.
  - Stored `validationIssues` were trusted rather than overwritten by the current `validateAttempt` path.
- Mandatory behavioral RED:
  - `pnpm exec vitest run scripts/harness/run-required-gates.test.ts`: exit 1, suite discovered, `6 failed | 10 passed` across 16 tests. The forged REAL_TEST history returned exit 0; unknown gate, required mismatch, declared evidence mismatch, code-owned policy argv mismatch, and stale subject manifest all resolved PASS rather than failing closed. This was not a syntax, fixture, or discovery failure.
- Scoped correction:
  - Persisted-envelope loading now retains both the authoritative parsed nested manifest and attempts. Nonempty attempt history without a valid manifest fails closed.
  - The previous manifest is rebound exactly to current schema version, subject commit/tree/dirty hash, independently observed dirty hash, release version, image digest, Electron artifact hash, environment id, and freshly observed Node/pnpm versions.
  - Every historical attempt must map to an existing current gate. Persisted `required` and `declaredEvidenceLevel` must equal the current declaration. Any historical command must match the current code-owned policy argv through the registry matcher; config allowlists were not reintroduced.
  - Every accepted historical attempt has stored `validationIssues` overwritten by the same current `validateAttempt` path and current dirty/evidence-commit facts before it enters aggregate status.
  - Added `declaredEvidenceLevel` as an explicit persisted declaration separate from the observed evidence level. This preserves truthful required-SKIPPED attempts (`declaredEvidenceLevel=REAL_TEST`, observed `evidenceLevel=SKIPPED`) without weakening declaration rebinding.
  - Negative fixture manifest/report paths are keyed by actual subject commit plus physical dirty hash under contained ignored `reports/**/raw`. A new subject never silently consumes stale history; repeated runs of the same subject append non-destructively.
- Repeated-SKIPPED integration attempt:
  - After the first history repair, focused runner was `16/16` and combined Task 3 was `37/37`. The first missing/SKIPPED CLI runs each exited 1 for the intended reason.
  - A same-subject second missing-command run remained intended exit 1, but the second required-SKIPPED run exited 1 early with `previous_attempts_invalid`. Root cause: the observed `SKIPPED` evidence level was incorrectly reused as the declaration level.
  - Added a focused repeated-SKIPPED control before the declaration-field repair. RED: runner exit 1 with `1 failed | 16 passed`, stable `previous_attempts_invalid`. After adding independent `declaredEvidenceLevel`, runner passed `17/17`.
- Fresh Task 3 evidence:
  - `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`: exit 0, `2 files | 38 tests passed`.
  - Both exact negative CLI commands ran twice on the same current subject. All four invocations exited 1 without subject/tool/history preflight failure. The newest subject-keyed missing manifest contains two `missing-required-command` attempts with `command_not_found` and `targetExecuted=false`; the skipped manifest contains two `skipped-required-gate` attempts with `required_gate_skipped` and `targetExecuted=false`.
  - First standalone strict Task 3 `tsc` attempt after the new tests exited 2 on four test-only implicit-any callback parameters caused by intentional invalid-fixture casts. After explicit `RequiredGate` annotations, a second run found one remaining identical callback; after the final behavior-preserving annotation, the full strict command exited 0. No runtime assertion or production type was weakened.
  - Fresh combined Task 3 focused test after the type/format corrections remained `38/38`.
- Fresh repository evidence:
  - Final `pnpm run format:check` and `pnpm run lint`: exit 0 across 87 files. Repository/workspace `pnpm run typecheck`: exit 0.
  - `pnpm run test`: exit 0, root scripts `13 files | 340 tests`, followed by all eight workspace suites including contracts `57/57`.
  - `pnpm run build`: exit 0 across repository policy and all eight workspaces. `pnpm run architecture:check`: exit 0 and remains STRUCTURAL_CHECK only.
  - Full `pnpm run secret:check`: exit 0. Explicit eight-build-root artifact Secret scan: exit 0. `git diff --check`: exit 0 before staging.
- Boundaries and risks:
  - Same-subject attempt history is append-only and revalidated; a changed commit or physical dirty state receives a distinct fixture path and stale subject metadata is rejected rather than deleted or bypassed.
  - Historical observed `evidenceLevel` remains truthful, while `declaredEvidenceLevel` is the field rebound to the current gate. Required SKIPPED remains BLOCKED and carries both `required_gate_skipped` and evidence mismatch semantics.
  - Tool observation, command registry, raw-path/Secret boundaries, aggregate authoritative-schema gate, and real Git subject/evidence-child observation from the first repair remain unchanged and GREEN.
  - This is Task 3 foundation evidence only. `architecture:check` remains STRUCTURAL_CHECK; PostgreSQL, process, Electron, release, Task 4, and MS1 remain out of scope.
- Pre-amend immutable staging:
  - The index contained exactly the six changed Task 3/ledger paths listed below, with no unstaged or nonignored untracked path. Cached whitespace and exact six-path assertions exited 0.
  - Immutable-index `pnpm run secret:check -- --index` and fresh full `pnpm run secret:check` each exited 0 with `Secret boundary check passed`.
  - This staging-result ledger delta is restaged and both Secret commands are repeated before amend; no startup-only output is treated as evidence.
- Changed paths: `scripts/evidence/collect-command.ts`, `scripts/harness/run-required-gates.ts`, `scripts/harness/run-required-gates.test.ts`, both negative fixture configs, and this ledger. No validator, Task 1/2 source, authority spec/workflow/plan, freeze, Task 4, or MS1 path changed.
- Next after exact staging, immutable-index/full Secret verification, and amend: `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`; then rerun both subject-keyed negative CLIs and request another independent Task 3 specification re-review. Do not enter code-quality review or Task 4 before approval.

### 2026-07-20 - Task 3 code-quality WITH FIXES repair

- Status: IN_PROGRESS. The third specification re-review APPROVED the prior-history trust repair. The independent code-quality review returned WITH FIXES: five Important findings and one Minor finding. These repairs require targeted specification regression then same-quality re-review. Task 3 remains IN_PROGRESS, Task 4 has not started, and MS1 is out of scope.
- Quality-review findings and root causes:
  - Required child commands had neither a policy-owned timeout nor an output-size cap, so a hang or unbounded stdout/stderr could keep the Harness alive indefinitely or exhaust memory without a truthful BLOCKED attempt.
  - Aggregate commands were concatenated by source rather than time; a previous PASS followed by a current pre-command failure could produce `finishedAt < startedAt`, fail authoritative schema parsing as `aggregate_manifest_invalid`, and lose the new BLOCKED attempt.
  - Optional attempts entered the authoritative manifest even though only required gates determine closeout. An optional FAIL or SKIPPED could therefore block or invalidate a required-only PASS.
  - Manifest/report persistence used direct overwrite. Interruption after truncation could destroy the previous append-only envelope, and the write target was not rebound atomically at rename time.
  - This ledger still directed recovery to the second specification failure even though the third specification re-review had approved and code-quality review had begun.
  - Minor path-portability issue: Node evidence persisted the absolute `process.execPath`, and prior `rawLogReference` values were not restricted to a safe repository-relative POSIX `reports/**/raw/**` path.
- Mandatory quality RED:
  - `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`: exit 1, both suites discovered, `11 failed | 37 passed` across 48 tests. Failures covered absolute Node argv, real hang/output-flood controls, prior-PASS/current-pre-command timestamp ordering, optional FAIL/SKIPPED isolation, unsafe raw references, atomic persistence, and this stale ledger. This was behavioral RED, not a discovery or syntax failure.
- Scoped repairs:
  - Command policies now separate the actual executable argv from stable logical evidence argv. Node persists `node --version`; code-owned policies also own `timeoutMs` and `maxOutputBytes`.
  - The POSIX runner creates a separate process group and terminates the group on timeout or output overflow, first with `SIGTERM` and then `SIGKILL`. Stable failures are `command_timed_out` and `command_output_limit_exceeded`; aborted commands do not persist raw logs. Fixed hang and flood policies exist only for the real negative controls.
  - Authoritative commands are ordered by observed timestamps. Aggregate `startedAt` is the minimum command start and `finishedAt` is the maximum finish, so a previous PASS plus current pre-command failure retains the new BLOCKED attempt rather than becoming `aggregate_manifest_invalid`.
  - Only required attempts, plus the required tool observations, contribute to the authoritative manifest and its evidence level. Optional attempts remain append-only in the envelope, report, and history but do not block or contaminate required closeout.
  - New `scripts/harness/atomic-write.ts` performs canonical-parent containment preflight, unique same-directory `O_CREAT|O_EXCL` temp creation, write, file fsync, close, atomic rename, and supported parent-directory fsync. A pre-rename failure removes only the temp and preserves the prior manifest bytes.
  - Historical `rawLogReference` is accepted only as a repository-relative POSIX path under `reports/**/raw/**`, with no absolute path, backslash, empty segment, `.` segment, or `..` segment.
  - The ledger now records the approved specification state and active quality repair without claiming final quality approval.
- First runtime GREEN attempt after the production repairs:
  - `pnpm exec vitest run scripts/harness/run-required-gates.test.ts`: exit 1, `24 passed | 1 failed` across 25 tests. All runtime hang/flood, aggregate-ordering, optional-gate, raw-reference, and atomic-write controls passed; only the intentional stale-ledger assertion failed. No retry was layered before updating the ledger.
- Heartbeat synchronization regression and repair:
  - After the ledger update, the exact runner suite passed `25/25`. The next combined focused command exited 1 with `1 failed | 47 passed`: the real hang test reached post-timeout heartbeat polling but `stat(heartbeatPath)` returned `ENOENT`. The command completed in 2.00s and did not itself hang.
  - Root cause: the 150ms fixture timeout included parent and grandchild scheduling, while the grandchild delayed its first heartbeat write until the first interval tick. Under the two-suite worker schedule, the group could be terminated before the heartbeat was ever created, so the test did not establish that a descendant had reached its observable lifecycle state.
  - Diagnostic isolation of the exact hang case passed `1/1`, confirming the combined scheduling race. The fixture grandchild now writes its first heartbeat synchronously and the code-owned fixture timeout is 1,000ms, still bounded by the unchanged test requirement of less than 2,000ms. The test continues to require an existing heartbeat that stops growing and an empty command raw-log directory; `ENOENT` is not treated as successful termination.
  - Fresh targeted hang control passed `1/1` in 1.30s. Fresh combined focused verification then passed `48/48` in 2.11s.
- Fresh quality-repair verification matrix before staging:
  - Both exact negative CLI commands ran twice on the same physical subject. All four invocations exited 1 for the intended fail-closed reason. The current missing-command envelope retains two BLOCKED attempts with `command_not_found` and `targetExecuted=false`; the required-SKIPPED envelope retains two SKIPPED attempts with `required_gate_skipped`, `targetExecuted=false`, observed `evidenceLevel=SKIPPED`, and declared `declaredEvidenceLevel=REAL_TEST`. Neither repeat failed history preflight or overwrote the first attempt.
  - Standalone strict Task 3 `tsc`, including `scripts/harness/atomic-write.ts` and all Task 3 source/test/config/negative-fixture paths, exited 0.
  - The first `pnpm run format:check` exited 1 only for Biome layout in `scripts/evidence/collect-command.ts`, `scripts/harness/atomic-write.ts`, and `scripts/harness/run-required-gates.ts`; concurrent `pnpm run lint` exited 0. Exact-file `biome format --write` changed only layout. Fresh repository `format:check` and `lint` then each exited 0 across 88 files.
  - `pnpm run test`: exit 0. Root scripts passed `13 files | 350 tests`; all eight workspace suites passed, including contracts `57/57`.
  - `pnpm run typecheck` and `pnpm run build`: exit 0 across repository policy and all eight workspaces. Post-build `pnpm run architecture:check`: exit 0 and remains STRUCTURAL_CHECK only.
  - Full `pnpm run secret:check`: exit 0 with `Secret boundary check passed`. Explicit artifact Secret scan across all eight build roots: exit 0.
  - `git diff --check`: exit 0. The only dirty paths are the five tracked Task 3/ledger files plus new `scripts/harness/atomic-write.ts`; no fixture, authority, Task 1/2, Task 4, or MS1 path changed.
- Pre-amend immutable staging:
  - The index contained exactly the six expected paths: `scripts/evidence/collect-command.ts`, `scripts/evidence/validate.test.ts`, new `scripts/harness/atomic-write.ts`, `scripts/harness/run-required-gates.ts`, `scripts/harness/run-required-gates.test.ts`, and this ledger. Cached whitespace, the exact path-set assertion, absence of unstaged changes, and absence of nonignored untracked paths all exited 0.
  - Immutable-index `pnpm run secret:check -- --index` and fresh full `pnpm run secret:check` each exited 0 with `Secret boundary check passed`.
  - This staging-result ledger delta is restaged and cached/exact-path/index/full Secret checks are repeated before amend; startup-only output is not accepted as evidence.
- Current risks and boundaries:
  - Process-group termination is exercised on POSIX. Non-POSIX fallback still terminates only the direct child and must not be represented as equivalent descendant-process containment.
  - Parent-directory fsync is performed only where supported; atomic same-directory rename and prior-byte preservation are the portable correctness boundary.
  - Optional attempt history is diagnostic evidence only and cannot authorize or raise the authoritative manifest evidence level.
  - These changes remain Task 3 Harness foundation only. They do not prove PostgreSQL, process health, Electron, release, Task 4, MS0 closeout, or MS1 behavior. `architecture:check` remains STRUCTURAL_CHECK.
- Changed paths currently expected: `scripts/evidence/collect-command.ts`, `scripts/evidence/validate.test.ts`, `scripts/harness/atomic-write.ts`, `scripts/harness/run-required-gates.ts`, `scripts/harness/run-required-gates.test.ts`, and this ledger. No fixture, Task 1/2 source, authority spec/workflow/plan, freeze manifest, Task 4, or MS1 path is changed.
- Next command: `pnpm exec vitest run scripts/harness/run-required-gates.test.ts`. On `25/25`, run `pnpm exec vitest run scripts/evidence/validate.test.ts scripts/harness/run-required-gates.test.ts`, both exact negative CLIs twice on the same subject, strict Task 3 typing including `scripts/harness/atomic-write.ts`, and the full repository/staging/post-amend matrix. Then request targeted specification regression followed by same-quality re-review; do not claim Task 3 DONE before both approve.

### 2026-07-20 - Task 3 targeted specification regression ledger-only repair

- Status: IN_PROGRESS. The same targeted specification reviewer found the quality-repair code paths GREEN and reported exactly one remaining HIGH: active PLAN_LEDGER recovery drift. This ledger-only repair still awaits post-amend confirmation from that reviewer, followed by same-quality re-review. Neither final specification nor final quality approval is claimed; Task 3 remains IN_PROGRESS and Task 4 has not started.
- Targeted specification regression evidence:
  - Fresh combined focused validation passed `48/48` on the clean amended Task 3 subject.
  - Both subject-keyed negative CLIs were repeated and retained their intended two-attempt histories: missing command remained BLOCKED with `command_not_found`, and required SKIPPED remained BLOCKED with `required_gate_skipped` and separate declared versus observed evidence levels.
  - The deliberately incomplete `ms0.config.ts` remained BLOCKED and did not run or authorize a future gate.
  - Strict Task 3 typing and repository format/lint/test/typecheck/build/architecture gates remained GREEN. Full, index, and artifact Secret checks also remained GREEN.
  - Subject and parent identity, plus the Task 3 scope, remained verified. No code/spec contract issue was reported.
- Sole HIGH and root cause:
  - The active `Last verified action` still said “the existing Task 3 commit still requires precise amend” after the quality repair had already been amended.
  - Active resume step 5 still described the five Important and one Minor findings as “under repair”, and step 6 pointed to the already-completed runner-only `25/25` command plus pre-amend matrix.
  - Root cause: the pre-amend quality checkpoint was preserved correctly as history, but its transitional wording was also left in the active top/recovery fields after amend. A resumed controller would repeat completed work instead of returning to reviewer confirmation.
- Ledger-only correction:
  - Active state now distinguishes the prior-history specification approval, code-quality WITH FIXES result, implemented/amended quality repair, code-GREEN targeted regression, and this sole recovery-document repair.
  - Active recovery now begins after this ledger-only amend: bind the clean three-commit chain and fixed Task 2 parent, rerun focused `48/48` plus index/full Secret, obtain confirmation from the same specification reviewer, then return to the same code-quality reviewer.
  - Historical checkpoints, including the original quality RED, heartbeat ENOENT attempt, staging evidence, and previous Next commands, remain append-only and are not rewritten.
- Scope: only `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md` changes. No Task 3 source/test/config/fixture, authority spec/workflow/plan, Task 1/2, freeze manifest, Task 4, or MS1 path changes; no negative CLI rerun is required unless focused verification fails.
- Resume after ledger-only amend: verify clean branch `codex/ms0-repository-constitution`, exactly three commits, Task 3 subject `feat(ms0): add fail-closed evidence harness`, and sole parent `f5ba76b92a5116e58826e2094bfc84b88e8f6e2d`; then run the combined focused `48/48`, immutable-index and full Secret checks, and request same-reviewer specification confirmation followed by same-quality re-review. Do not enter Task 4 before both approve.

### 2026-07-20 - Task 3 process-group force-kill quality repair

- Status: IN_PROGRESS. The same specification reviewer confirmed the preceding ledger-only repair and all targeted code paths. The first same-quality re-review still returned WITH FIXES on exactly one Important process-lifecycle defect. The scoped correction is locally GREEN and is amended into the same Task 3 subject, but targeted specification regression and same-quality re-review must both approve before Task 3 can close. Task 4 and MS1 have not started.
- Confirmed quality defect:
  - Timeout/output-overflow termination sent group `SIGTERM` and scheduled group `SIGKILL` after a grace period, but direct-parent `close` immediately settled the Promise and `cleanup` cleared the force timer.
  - A descendant that ignored `SIGTERM` therefore survived after its leader exited. The original descendant obeyed `SIGTERM`, so the earlier hang test did not exercise the force phase.
  - The same reviewer independently observed focused `48/48`, but both `pnpm run test` and direct `vitest run scripts` failed the real hang case under full-suite load. Those failures are retained as reviewer evidence; they are not overwritten by later GREEN runs.
- Deterministic TDD controls:
  - The code-owned hang descendant now installs an explicit `SIGTERM` ignore handler, synchronously writes a ready PID, starts heartbeat, and owns an 8-second self-exit failsafe. The policy timeout is a bounded 3 seconds and each real lifecycle test owns a 15-second local timeout.
  - The test begins collection without awaiting it, polls the ready marker, proves heartbeat growth, then evaluates termination. A `finally` block force-cleans the recorded descendant PID and verifies no process residue, so RED cannot leave a permanent orphan.
  - Exact primary RED: `pnpm exec vitest run scripts/evidence/validate.test.ts -t "force-kills a ready SIGTERM-ignoring descendant after the direct parent closes"` exited 1 with the suite discovered, `1 failed | 23 skipped`. The collector returned `command_timed_out`, but heartbeat never became stable; the assertion received `false` instead of `true`. Cleanup completed and the test itself did not time out.
  - Exact signal-error RED: `pnpm exec vitest run scripts/evidence/validate.test.ts -t "returns a stable error when forced process-group signaling fails"` exited 1 with `1 failed | 23 skipped`. It received `command_timed_out` instead of the required stable `command_termination_failed`; cleanup again completed.
- Scoped lifecycle correction:
  - Termination state and Promise settlement are now separate. Once termination starts, parent `close` or `error` cannot settle or cancel the force phase.
  - After the grace period the POSIX group receives `SIGKILL` even if the leader has closed. `ESRCH` is a safe terminal result; false returns or any other signal error settle once with `command_termination_failed`, never throw from a timer or event callback.
  - Normal exit, spawn error, timeout, output overflow, parent-close-before-force, successful force, and force-signal error all converge through exactly-once settle helpers that own listener and timer cleanup.
  - Abort paths still reject before raw-log persistence. Output cap semantics and stable `command_output_limit_exceeded` behavior are unchanged.
- Fresh GREEN and load-stability evidence:
  - Primary forced-descendant control passed three consecutive exact invocations, each `1 passed | 23 skipped`, with test durations between 3.63s and 3.64s. The stable force-signal-error control passed `1 passed | 23 skipped` in 3.13s.
  - Combined focused validation passed `49/49` in 7.12s.
  - Two serial `pnpm run test` invocations each exited 0. Root scripts passed `13 files | 351 tests` in 23.06s and 20.61s respectively; all eight workspace suites passed on both runs, including contracts `57/57`.
  - Standalone strict Task 3 `tsc`, including all Task 3 source/test/config/fixture paths and `scripts/harness/atomic-write.ts`, exited 0.
  - Initial format verification exited 1 only for new test layout; lint exited 0 but reported two `boolean | void` style warnings. Exact layout formatting plus the equivalent `boolean | undefined` signature removed both warnings. Fresh format and lint then each exited 0 across 88 files.
  - Repository/workspace typecheck and build exited 0. Post-build `architecture:check` exited 0 and remains STRUCTURAL_CHECK only.
  - After this checkpoint's active-ledger update, combined focused validation remained `49/49` in 7.15s.
  - Both exact negative CLI commands ran twice on the same physical subject. All four invocations exited 1 for the intended fail-closed reason. The missing-command envelope retains two BLOCKED `command_not_found` attempts with `targetExecuted=false`; the required-SKIPPED envelope retains two `required_gate_skipped` attempts with `targetExecuted=false`, observed `SKIPPED`, and declared `REAL_TEST`.
  - Fresh full repository Secret check exited 0. Explicit artifact Secret scan across all eight build roots exited 0. `git diff --check` exited 0.
  - The dirty path set is exactly `scripts/evidence/collect-command.ts`, `scripts/evidence/validate.test.ts`, and this ledger. There is no nonignored untracked path or source/test/config change outside Task 3.
- Pre-amend immutable staging:
  - The index contained exactly the three expected Task 3 paths, with cached whitespace clean, no unstaged change, and no nonignored untracked path.
  - Immutable-index and fresh full Secret checks each exited 0 with `Secret boundary check passed`.
  - This staging-result ledger delta is restaged and the exact path/cached/index/full checks are repeated before amend; startup-only output is not evidence.
- Remaining platform boundary:
  - Real ready/growth/force/stability/orphan assertions prove process-group cleanup on POSIX. Win32 still uses direct-child termination only and is explicitly non-equivalent; this Task 3 repair does not claim descendant containment there.
  - The descendant PID and heartbeat are contained test diagnostics under ignored raw directories and never enter tracked evidence or reports.
- Changed paths: `scripts/evidence/collect-command.ts`, `scripts/evidence/validate.test.ts`, and this ledger only. No Harness runner/config/fixture file, Task 1/2 source, authority spec/workflow/plan, freeze manifest, Task 4, or MS1 path changes.
- Resume after amend: verify clean branch, exact three-commit chain, fixed Task 2 parent, combined `49/49`, a fresh full-root stability run, and full/index Secret checks. Then request targeted specification regression from the same reviewer; only after APPROVED return to the same-quality reviewer. No Task 4 or MS1 work is authorized.

### 2026-07-20 - Task 3 dual-review approved, ledger-only closeout

- Status: DONE. This closes Task 3 only. Task 4 has not started, MS0 remains IN_PROGRESS, and Ready to proceed is limited to this ledger-only Task 3 closeout.
- Reviewed subject binding:
  - Immutable reviewed Task 3 code subject: `1be5c3fd8fc5b0aedde1678e4a5dd93533677229`, subject `feat(ms0): add fail-closed evidence harness`.
  - Subject tree: `ce272f46bbf9a0fed7ab42ac730b2140b3b82442`.
  - Sole parent: approved Task 2 commit `f5ba76b92a5116e58826e2094bfc84b88e8f6e2d`.
  - This closeout amend changes only this ledger. The final Task 3 commit SHA cannot self-reference; the controller must verify the clean three-commit chain and prove that the only delta from the reviewed subject is this ledger. Any source/test/config delta invalidates both approvals.
- Final reviewer evidence:
  - The same targeted specification reviewer APPROVED the process-group force-kill repair and found no remaining specification issue.
  - The same-quality reviewer freshly ran combined focused validation at `49/49`, root scripts at `351/351`, and all eight workspace suites successfully. Critical: none. Important: none. Minor: none. Ready to proceed: yes, limited to Task 3 closeout.
- Accepted boundaries and residual risks:
  - POSIX has real ready/growth/force/stability/orphan evidence for a descendant that ignores `SIGTERM`; group `SIGKILL` completes the bounded termination phase.
  - Win32 still guarantees direct-child termination only and is not equivalent descendant-process containment. A future Win32 requirement needs a platform-specific process-tree mechanism and REAL_TEST.
  - `architecture:check` remains STRUCTURAL_CHECK only. Task 3 is Harness foundation evidence, not PostgreSQL, process-health, Electron, release, or MS0 closeout evidence.
  - Optional attempt history remains diagnostic only and cannot authorize or raise the authoritative manifest evidence level. Raw lifecycle diagnostics stay contained and ignored.
- Scope: only `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md` changes. No Task 3 source/test/config/fixture, authority spec/workflow/plan, Task 1/2, freeze manifest, Task 4, or MS1 path changes.
- Task 4 dependency boundary and handoff:
  - Required positive dependency: exact PostgreSQL 17.6 at `127.0.0.1:54326`, using a unique disposable database. Credential values remain only in ignored `/.local-secrets/development.env` and must never enter the ledger, command output, reports, fixtures, or Git.
  - The later negative version-gate target is the existing local PostgreSQL 17.10 at port 55432 and must remain read-only; it is not the first Task 4 action.
  - After creating `scripts/postgres/postgres.integration.test.ts`, the first real verification command is `SARTRE_DATABASE_URL="$LOCAL_TEST_DATABASE_URL" pnpm exec vitest run scripts/postgres/postgres.integration.test.ts`. Expected first result is behavioral RED because the migration runner/version gate does not exist. A missing test file, missing dependency, unreachable database, syntax error, or no-discovery result is not accepted RED.
  - Do not execute that command or begin Task 4 in this Task 3 closeout session.

### 2026-07-20 21:08 CST - Task 4 PostgreSQL 17.6 migration baseline ready for commit

- Status: IN_PROGRESS. Task 4 implementation and local evidence are complete on the dirty worktree and ready for precise staging/commit. Independent specification and code-quality reviews have not started; Task 5 and MS1 remain out of scope.
- Scope and implementation:
  - Added the immutable `000001_ms0_baseline.sql`; it creates only `schema_migrations(version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`.
  - Added exact `server_version_num=170006` verification, SHA-256 migration artifact loading, PostgreSQL transaction-scoped advisory locking, idempotent application, and stable `postgres_version_mismatch` / `migration_checksum_mismatch` failures.
  - Added a Hub API `DatabaseQueryPort` compatibility boundary. It verifies exact server version, baseline columns/primary key, and the single exact version/checksum row. It performs only read queries and never imports or calls the migrator.
  - Added disposable database helpers whose callback/finally paths force-drop each generated database, plus PostgreSQL REAL_TEST for empty schema, exact version, idempotency, checksum drift, failed-SQL rollback, two concurrent migrators, Hub schema incompatibility/no automatic migration, and PostgreSQL 17.10 read-only rejection with object fingerprint equality.
  - Added a digest-pinned PostgreSQL 17.6 compose profile. It is loopback-only, uses `trust` only for `local-integration`, carries `sartre.production-reuse=prohibited`, and has a policy checker with negative controls for image, profile, auth, labels, port, and healthcheck drift.
  - Added a non-root multi-stage Migration Job. Pinned TypeScript compiles the same runner in the build stage; the runtime image installs production dependencies, copies the exact repository migration artifact, and executes compiled JavaScript.
- TDD and failure history, retained without hiding later GREEN:
  - Required first command after the integration test existed: `SARTRE_DATABASE_URL="$LOCAL_TEST_DATABASE_URL" pnpm exec vitest run scripts/postgres/postgres.integration.test.ts`: exit 1. Vitest discovered the suite but loaded `0 tests` because the required Hub schema-compatibility module did not exist. This is the accepted missing-boundary RED; it was not a credential or dependency failure.
  - First post-implementation rerun of that command: exit 1, `6/6 failed` with `SARTRE_DATABASE_URL_required`; the caller variable was absent. No database assertion ran and this is not REAL_TEST evidence.
  - The first PG17.6 attempt with a locally constructed test variable: exit 1, `5 failed | 1 filtered`; all five failed at SASL before assertions because the helper command constructed an opaque `postgresql:` URL whose component setters were ignored. Runtime HBA inspection showed only `trust`, and parsing the temporary variable showed empty host/port/user. Correct hierarchical URL construction fixed routing; no Secret value was introduced.
  - Compose health logs exposed `role "-d" does not exist`: `pg_isready` had expanded unset `$POSTGRES_USER/$POSTGRES_DB` yet still returned accepting. A new policy test first failed `1/8`; the healthcheck is now the explicit non-secret local role/database and the policy suite passes `8/8`.
  - PG17.10 first pull/run failed with Docker exit 125, `short read ... unexpected EOF`; no image or container remained. One bounded `docker pull postgres:17.10` retry succeeded with digest `sha256:a426e44bac0b759c95894d68e1a0ac03ecc20b619f498a91aae373bf06d8508d`; no third pull was attempted.
  - First full PostgreSQL suite on 17.10: exit 1, `5 passed | 1 failed`. The failure occurred before the version assertion because `pg_class.relkind` is internal `"char"` and the fingerprint query used ambiguous text concatenation. Explicit `relkind::text` was the only behavior fix; the fresh suite then passed `6/6`.
  - First Migration Job negative run exited 1 before the version gate because Node strip-only rejected TypeScript parameter properties. Explicit fields removed that syntax, then local Node exposed unresolved `.js` source specifiers. A multi-stage TypeScript compile was implemented; subsequent image runs reached stable application errors.
  - First full `/app` image Secret attempt exited 1 on synthetic connection examples in third-party `pg` README and a third-party `zod` test source. The repository-owned image payload was then scanned explicitly and passed. Dependency content is covered separately by supply-chain gates; third-party docs/tests are not rewritten to make the scanner green.
  - First root `pnpm run test` after PostgreSQL behavior was green exited 1 with `364/365`: the sole architecture production-tree assertion reported `source_dependency_identity_invalid` because TypeScript resolved `pg` source types to `@types/pg`. The Task 2 checker was not weakened. Hub compatibility now accepts a narrow query port, and the real integration helper injects the live `pg` client; the fresh architecture fixture, focused PostgreSQL suite, and root suite all pass.
  - Formatter attempts after compose-policy and query-port edits each exited 1 only on reported layout differences. Exact-file formatting changed layout only; subsequent repository format checks passed. One Vitest invocation used unsupported `--runInBand` and exited 1 before discovery; one `tsx -e` fingerprint attempt used unsupported top-level await and exited 1 before connection. Neither is evidence.
- Fresh Layer 2 REAL_TEST evidence on the current code/lock tree:
  - `SARTRE_DATABASE_URL="$LOCAL_TEST_DATABASE_URL" SARTRE_POSTGRES_NEGATIVE_URL="$LOCAL_NEGATIVE_DATABASE_URL" pnpm exec vitest run scripts/postgres/postgres.integration.test.ts --disableConsoleIntercept`: exit 0, `1 file | 6 tests passed`. Assertions include PG17.6 `170006`, PG17.10 `170010`, exact checksum `ff57c5fa909fc4506e4a503c6ea2d39c4c3bb67d5bda1d9dfa1a7cf6f008b839`, a single idempotent version row, rollback to an empty schema, one applied plus one no-op concurrent result, `schema_incompatible` without DDL/DML, and unchanged 17.10 object fingerprint.
  - Fresh focused disposable databases: `sartre_ms0_baseline_049341368dcf4e71`, `sartre_ms0_checksum_e71280800504456f`, `sartre_ms0_rollback_f7c6c895a513462b`, `sartre_ms0_concurrency_2728454c96e44b74`, and `sartre_ms0_readiness_febc57b8c9a34e7c`. All were dropped by `finally`; a later `pg_database` residual query returned no `sartre_ms0_%` row.
  - Root `pnpm run test` with the same two database variable references: exit 0. Root scripts passed `15 files | 365 tests`, including the unfiltered PostgreSQL suite; all eight workspace suites then passed, including contracts `57/57`. The integration test is not silently excluded or treated as optional.
- Current immutable Migration Job evidence:
  - `pnpm run secret:check && docker build -f docker/migration-job/Dockerfile -t sartre-migration-job:ms0-task4 .`: exit 0 on the current lock/config. Image ID/RepoDigest: `sha256:ce20cde827ac0d1bcb4493f89bd5b3d21eaa643d8865f96ba35b857039e286ec`; Node base resolved to `sha256:76d0ed0ed93bed4f4376211e9d8fddac4d8b3fbdb54cc45955696001a3c91152`.
  - Positive run on `sartre_ms0_job_final_1784552760_11029`: image exit 0, version `000001_ms0_baseline`, exact checksum above, `applied=true`; exact row assertion and force-drop passed.
  - Checksum drift on the same disposable job database: second image run emitted `migration_checksum_mismatch` and exited 1; the injected drift row remained unchanged, proving no repair/write after rejection; cleanup passed.
  - PG17.10 job run: emitted `postgres_version_mismatch` and exited 1. Read-only object fingerprint was `d41d8cd98f00b204e9800998ecf8427e` both before and after. The temporary negative container was removed and the safe exact-name filter returned no residue.
  - Explicit repository-owned image payload artifact scan across compiled runner, migration, entrypoint, and package/lock manifests: exit 0. The temporary extraction container and directory were removed.
- Dependency/image lifecycle and rollback:
  - Original unmanaged positive container safe metadata was `sartre-postgres-17-6 | postgres:17.6 | 127.0.0.1:54326->5432 | healthy`; image ID/RepoDigest was `sha256:00bc86618629af00d2937fdc5a5d63db3ff8450acf52f0636ec813c7f4902929`.
  - It was stopped and renamed to retained backup `sartre-postgres-17-6-pre-task4-20260720`; it remains stopped and was never removed. Repo-owned compose then created `sartre-postgres-17-6` on the same loopback port. A first health polling script used zsh's read-only variable name `status` and exited 1 without changing Docker state; the corrected safe-format loop confirmed healthy.
  - PostgreSQL 17.10 image ID/RepoDigest is `sha256:a426e44bac0b759c95894d68e1a0ac03ecc20b619f498a91aae373bf06d8508d`. Every temporary `sartre-postgres-17-10-negative` instance bound only `127.0.0.1:55432`, reported `170010`, and was removed after its gate.
  - Rollback if the repo-owned 17.6 container later fails: remove only that new test container without deleting its volume, rename `sartre-postgres-17-6-pre-task4-20260720` back to `sartre-postgres-17-6`, and start it. Do not delete either data volume during Task 4 review.
- Fresh repository/static evidence:
  - `pnpm exec vitest run scripts/postgres/postgres-compose-policy.test.ts`: exit 0, `8/8`.
  - `pnpm exec tsx scripts/postgres/check-compose-policy.ts`: exit 0, `postgres_compose_policy=pass` against rendered compose.
  - `pnpm exec tsc --noEmit -p scripts/postgres/tsconfig.json` and `pnpm exec tsc -p scripts/postgres/tsconfig.job.json --noEmit`: exit 0 under strict root options.
  - Fresh `pnpm run format:check`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`, and `pnpm run architecture:check`: exit 0. Architecture is STRUCTURAL_CHECK / PASS only.
  - Fresh full `pnpm run secret:check`: exit 0. Explicit artifact scan across all eight workspace build roots and the repository-owned Migration Job payload: exit 0.
  - Tool versions: Node `v24.11.0`; pnpm `10.33.2`; Docker `29.2.1` build `a5c7197`; Docker Compose `v5.0.2`.
- Ledger-after freshness before staging:
  - Focused PostgreSQL command above reran after this checkpoint text existed and exited 0, `6/6` in 848ms. Its exact disposable names were `sartre_ms0_baseline_76382ddf56fb4474`, `sartre_ms0_checksum_1fe987427daf4508`, `sartre_ms0_rollback_4a4c3ef1cc994dd3`, `sartre_ms0_concurrency_01d8b5d2a8184b60`, and `sartre_ms0_readiness_a3189024e1774071`; all dropped in `finally`.
  - Root `pnpm run test` with both database variable references reran after the ledger update and exited 0: scripts `15/15 files | 365/365 tests` in 23.94s, then all eight workspace suites passed.
  - Fresh format/lint, both strict PostgreSQL `tsc` commands, compose policy `8/8`, rendered compose CLI, root typecheck/build, architecture, whitespace, full Secret, and eight-root build artifact Secret checks all exited 0. The temporary PostgreSQL 17.10 container was removed after the database commands.
- Risks and boundaries:
  - The compose service deliberately uses `trust` for an explicit loopback-only local-integration profile. The policy rejects any non-loopback publish, missing profile/prohibition label, different image, password-bearing/non-trust environment, or environment-dependent healthcheck. It is prohibited from production reuse.
  - The compatibility boundary is a readiness policy over a query-only port, not a Task 5 process or HTTP `/readyz` implementation. Task 5 must compose it without importing the migrator.
  - Migration Job artifact evidence covers repository-owned payload. The broader `/app` scan is not PASS because third-party package documentation contains synthetic credential examples; supply-chain scanning remains a separate gate.
  - The retained pre-Task4 PostgreSQL container and its data are intentionally not deleted. The repo-owned local-integration database volume also remains for review; neither is production state.
  - No `.local-secrets` content, database URL, password, container environment, broad inspect output, shell profile, credential helper, npm/pnpm config dump, or process environment was read or recorded.
- Changed paths expected for precise staging: root `package.json`, `pnpm-lock.yaml`; `apps/hub-api/src/infrastructure/database/migrations/000001_ms0_baseline.sql`; `apps/hub-api/src/infrastructure/database/schema-compatibility.ts`; `docker/postgres/compose.yml`; `docker/migration-job/Dockerfile`; `docker/migration-job/entrypoint.sh`; eight files under `scripts/postgres/`; and this ledger. No Task 1-3 source/test/config, authority spec/workflow/plan, freeze manifest, Task 5, or MS1 path changed.
- Next after precise staging, immutable-index/full Secret verification, commit, and post-commit fresh focused/root/static/Secret/clean-chain verification: request independent Task 4 specification review. Do not begin Task 5 or MS1, and do not mark Task 4 DONE before both specification and code-quality review approve.

### 2026-07-20 21:22 CST - Task 4 post-commit ledger-only pre-review correction

- Status: IN_PROGRESS. Task 4 source/test/config/lock implementation is committed and post-commit GREEN. Independent specification and code-quality reviews have not started; Task 5 and MS1 remain out of scope.
- Confirmed ledger drift:
  - Active `Current task` still described the already-committed Task 4 tree as dirty and ready for staging/commit.
  - Active `Last verified action` still bound only the dirty tree despite completed post-commit verification.
  - The latest Task 4 checkpoint's Next sentence still routed recovery through staging/commit before review. A resumed controller could repeat completed Git work instead of starting independent specification review.
- Ledger-only correction:
  - Active state now binds the clean committed pre-ledger-repair Task 4 subject and distinguishes local evidence from reviewer approval.
  - Resume no longer repeats implementation staging/commit. It first proves the final amend changed only this ledger, reruns the required post-amend focused/root/Secret chain, then routes directly to independent Task 4 specification review followed by code-quality review.
  - Task 4 stays IN_PROGRESS until both reviewers approve. No Task 5 or MS1 work is authorized.
- Verified pre-ledger-repair subject binding:
  - Commit: `e7ce22b12c015ce5c8108686ef17687005def818`, subject `feat(ms0): pin PostgreSQL 17.6 migration baseline`.
  - Tree: `146a09209f526522bada8e11571e78234c5eb7f9`.
  - Sole parent: approved Task 3 commit `bf4a2c0e615da0bae0ad39e249299a4976a3834d`.
  - Post-commit focused PostgreSQL passed `6/6`; root scripts passed `365/365` plus all eight workspace suites; format/lint/strict typing/typecheck/build/architecture, full/index/eight-root artifact Secret, Migration Job owned-payload Secret, exact commit path set, disposable cleanup, and clean four-commit chain all passed.
- Scope: only `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md` changes. No Task 4 source, test, config, lockfile, migration artifact, Docker artifact, Task 1-3 source, authority document, freeze manifest, Task 5, or MS1 path changes.
- Commit binding: the final amended SHA cannot appear in its own commit. After `git commit --amend --no-edit`, the controller must record the final SHA/tree/parent and verify that `e7ce22b12c015ce5c8108686ef17687005def818..HEAD` changes only this ledger.
- Next after ledger-only amend and fresh post-amend verification: independent Task 4 specification review. Do not stage/commit implementation again and do not begin Task 5 or MS1.

### 2026-07-20 21:58 CST - Task 4 quality review BLOCKED, six-Important repair opened

- Status: IN_PROGRESS. Quality review result: BLOCKED; Critical `0`, Important `6`. Task 4 cannot close, and Task 5/MS1 are prohibited.
- Candidate binding entering repair: clean commit `22b979d347c8a8f61c9e50f59110399f76df5c68`, subject `feat(ms0): pin PostgreSQL 17.6 migration baseline`, sole parent `bf4a2c0e615da0bae0ad39e249299a4976a3834d`.
- Confirmed findings and root causes:
  1. Hub schema compatibility never asserted the real migrated baseline as compatible. It expects the PostgreSQL `name[]` primary-key projection to be a JavaScript array, while driver parsing is not a stable contract, and it accepts any non-null `applied_at` default instead of exact `now()`.
  2. Migration Job uses `FROM node:24.11.0-bookworm-slim` without a manifest digest. Prior build resolution recorded `sha256:76d0ed0ed93bed4f4376211e9d8fddac4d8b3fbdb54cc45955696001a3c91152`, but the Dockerfile does not bind it.
  3. Compose policy extracts only `services.postgres`; it does not close the rendered document's service/volume set or reject container-name, restart, host-network, extra-service, or unexpected mount/lifecycle drift.
  4. Hub compatibility catches every column/PK/version-row query error and rewrites transport/permission/driver failures as `schema_incompatible`. Only an observed structural mismatch may use that code; dependency failures must retain identity for Task 5 mapping.
  5. Version CLI prints any driver/OS `error.code`. Closed-port, TLS, DNS, and auth errors can therefore escape the stable business error catalog instead of a single controlled `postgres_version_check_failed`.
  6. Disposable database creation does not guarantee `end()` when connect fails, cannot compensate a successful CREATE followed by admin `end()` failure, allows concurrent `dispose()` races, and can let cleanup failure replace a primary assertion failure. Rollback integration also asserts only truthiness rather than a specific PostgreSQL failure code.
- Required grouped RED sequence:
  - schema: real migrated baseline positive, exact default drift negative, and first/later query dependency-error preservation;
  - version CLI: allowlisted business codes only, raw driver/OS codes mapped to `postgres_version_check_failed`;
  - compose: full rendered-document exact sets plus lifecycle/network/mount negative cases;
  - disposable helper: narrow client-factory fault injection for connect/query/end/compensation and concurrent shared cleanup; rollback assertion uses the exact PostgreSQL error code, with rollback-failure aggregation covered if the narrow injection makes it low cost.
- Evidence state: no repair RED or GREEN is claimed yet. Prior `6/6`, `365/365`, Job, and Secret runs predate these review findings and cannot close them.
- Scope: single writer; Task 4 files and this ledger only. Task 1-3 checker behavior must not be weakened or modified.
- Next: add the first grouped behavior tests and observe the expected schema RED before changing production implementation.

### 2026-07-20 22:07 CST - Task 4 schema compatibility repair RED -> GREEN

- Status: IN_PROGRESS. The schema compatibility repair group is GREEN; the remaining version CLI, compose, disposable lifecycle, rollback precision, and Migration Job base-image findings remain open. Task 5/MS1 remain prohibited.
- Witnessed behavior RED before production changes:
  - `pnpm exec vitest run scripts/postgres/schema-compatibility.test.ts`: exit 1, `4 failed | 1 passed`. A `clock_timestamp()` default resolved compatible, and dependency failures at query boundaries 1/2/3 were rewritten to `schema_incompatible`; boundary 0 preserved the original dependency error.
  - `SARTRE_DATABASE_URL="$LOCAL_TEST_DATABASE_URL" pnpm exec vitest run scripts/postgres/postgres.integration.test.ts -t "fails Hub database readiness"`: exit 1, `1 failed | 6 skipped`. The real PostgreSQL 17.6 baseline migrated successfully, but Hub compatibility rejected it at the positive `.resolves` assertion with `schema_incompatible`.
- Scoped implementation: `applied_at` now requires the exact `now()` default; the primary-key query returns a stable PostgreSQL boolean instead of exposing a driver-specific `name[]` representation; only observed structural/row mismatches create `SchemaIncompatibleError`, while query transport/permission/driver errors retain their original identity.
- Fresh GREEN evidence:
  - `pnpm exec vitest run scripts/postgres/schema-compatibility.test.ts`: exit 0, `5/5` AUTOMATED_BEHAVIOR / PASS.
  - `SARTRE_DATABASE_URL="$LOCAL_TEST_DATABASE_URL" pnpm exec vitest run scripts/postgres/postgres.integration.test.ts -t "fails Hub database readiness|rejects applied_at default drift"`: exit 0, `2 passed | 5 skipped`, REAL_TEST / PASS on the repo-owned PostgreSQL 17.6 dependency. This proves both the migrated positive baseline and the read-only rejection of `clock_timestamp()` drift without automatic repair.
- Dependency boundary: no PostgreSQL 17.10 container was started. The required 17.6 container was healthy and loopback-published before the real selector. No credential input, database URL value, password, container environment, or broad process environment was read or recorded.
- Next: add the version CLI error-containment behavior tests and witness raw driver/OS codes escaping before changing its production mapper. Do not batch compose or disposable lifecycle production changes into that group.

### 2026-07-20 22:10 CST - Task 4 version CLI error containment RED -> GREEN

- Status: IN_PROGRESS. The version CLI repair group is GREEN; compose, disposable lifecycle, rollback precision, and Migration Job base-image findings remain open.
- Witnessed behavior RED: `pnpm exec vitest run scripts/postgres/verify-version.test.ts` exited 1 with `4 failed | 2 passed`. The CLI exposed `ECONNREFUSED`, `ENOTFOUND`, `SELF_SIGNED_CERT_IN_CHAIN`, and PostgreSQL auth SQLSTATE `28P01` verbatim. Existing stable outputs `postgres_version_mismatch` and `SARTRE_DATABASE_URL_required` passed.
- Scoped implementation: the CLI error mapper now forwards only the explicit stable `postgres_version_mismatch` business code plus the existing missing-configuration error; every driver, OS, DNS, TLS, auth, or unknown error maps to the existing contracts catalog code `dependency_unavailable`.
- Catalog correction: an intermediate local fallback name was not present in the authoritative contracts catalog. Before the final mapper change, the test expectation was changed to existing `dependency_unavailable` while the intermediate implementation remained, and the fresh rerun again exited 1 with `4 failed | 2 passed`. No Task 2 contract/catalog file was changed.
- Fresh GREEN evidence:
  - `pnpm exec vitest run scripts/postgres/verify-version.test.ts`: exit 0, `6/6` AUTOMATED_BEHAVIOR / PASS.
  - A real loopback closed-port CLI invocation emitted only `dependency_unavailable` and exited 1; a separate real PostgreSQL 17.6 CLI invocation emitted `server_version_num=170006` and exited 0. The wrapper asserted both exit codes and exited 0, REAL_TEST / PASS.
- Secret boundary: both connection values were constructed only inside the command process; no value, password, ignored credential input, or environment dump was printed or recorded.
- Next: add full rendered-document compose exact-set and lifecycle/network/mount rejection tests, witness RED, then change only the Task 4 compose policy implementation.

### 2026-07-20 22:14 CST - Task 4 compose policy closure RED -> GREEN

- Status: IN_PROGRESS. The compose repair group is GREEN; disposable lifecycle and Migration Job base-image findings remained open at this checkpoint.
- Witnessed behavior RED: `pnpm exec vitest run scripts/postgres/postgres-compose-policy.test.ts` exited 1 with `8 failed | 8 passed`. The existing service-fragment checker accepted container-name drift, restart drift, `network_mode: host`, a bind mount, and an additional mount; the full rendered-document validator was absent and could not enforce exact service or top-level volume sets.
- Scoped implementation: the original image/profile/auth/labels/loopback-port/healthcheck checks remain intact. The service policy now additionally pins `container_name=sartre-postgres-17-6`, `restart=no`, absence of explicit `network_mode`, and the single exact named-volume mount. A full rendered-document policy requires exactly `services.postgres` and the single expected top-level volume; the CLI now validates that document rather than extracting only the service fragment.
- Fresh GREEN evidence:
  - `pnpm exec vitest run scripts/postgres/postgres-compose-policy.test.ts`: exit 0, `16/16` AUTOMATED_BEHAVIOR / PASS.
  - `pnpm exec tsx scripts/postgres/check-compose-policy.ts`: exit 0 with `postgres_compose_policy=pass` against Docker Compose rendered JSON, STRUCTURAL_CHECK / PASS.
- Next: add disposable database client lifecycle/fault-injection tests and witness connect/end/compensation/concurrency/error-aggregation RED before changing its test-helper production implementation.

### 2026-07-20 22:19 CST - Task 4 disposable database lifecycle RED -> GREEN

- Status: IN_PROGRESS. Schema, version CLI, compose, and disposable lifecycle groups are GREEN. The Migration Job base-image binding remains open; Task 4 and MS0 remain IN_PROGRESS.
- Witnessed behavior RED: `pnpm exec vitest run scripts/postgres/create-test-database.test.ts` exited 1 with `6/6` failed. Admin connect failure and cleanup connect failure each skipped `end()`; CREATE success followed by admin `end()` failure did not compensate; simultaneous admin-end/compensation failure was not aggregated; concurrent dispose created two cleanup clients; and no helper preserved both a primary assertion failure and cleanup failure.
- Scoped implementation: added a narrow client factory only in `scripts/postgres/create-test-database.ts` test-helper infrastructure. A shared client-close primitive now ends after connect/query failure and aggregates operation+end failures. Known successful CREATE followed by setup failure runs a force-DROP compensation and aggregates dual failure. Dispose shares one in-flight promise and clears a rejected promise for a later retry. The exported helper aggregates primary operation+cleanup failures while preserving a lone original error. No factory or test-helper port entered Hub, Runtime, contracts, or any app production boundary.
- Fresh GREEN evidence:
  - `pnpm exec vitest run scripts/postgres/create-test-database.test.ts`: exit 0, `6/6` AUTOMATED_BEHAVIOR / PASS.
  - `SARTRE_DATABASE_URL="$LOCAL_TEST_DATABASE_URL" pnpm exec vitest run scripts/postgres/postgres.integration.test.ts -t "PostgreSQL 17.6 migration boundary" --disableConsoleIntercept`: exit 0, `6 passed | 1 skipped`. The excluded test was only the PostgreSQL 17.10 selector; all PG17.6 migration, checksum, rollback, concurrency, migrated-schema compatibility, and default-drift scenarios executed as REAL_TEST / PASS. Rollback now asserts exact PostgreSQL SQLSTATE `42883`, not truthiness.
  - A fresh exact `pg_database` residual count after the suite was zero; all six named disposable databases were dropped.
- Secret and lifecycle boundary: no PostgreSQL 17.10 container was started; no credential value, database URL value, container environment, `.local-secrets` input, or process environment dump was read or recorded.
- Next: verify the recorded Node 24.11.0 base manifest digest from safe Docker metadata, add the digest pin, rebuild the Migration Job, and rerun its positive/checksum/version/non-root/artifact/Secret evidence before whole-tree closeout.

### 2026-07-20 22:26 CST - Task 4 Migration Job base digest and rebuilt runtime matrix GREEN

- Status: IN_PROGRESS. All six quality findings now have scoped implementations and focused GREEN evidence. Whole-tree/root/static verification, precise staging, amend, and post-amend verification remain; Task 5/MS1 remain prohibited.
- Fresh registry verification and TDD:
  - `docker buildx imagetools inspect node:24.11.0-bookworm-slim`: exit 0. The live OCI index digest was exactly `sha256:76d0ed0ed93bed4f4376211e9d8fddac4d8b3fbdb54cc45955696001a3c91152`, with distinct Linux amd64 and arm64 manifests. This did not rely only on the old ledger value and did not inspect image/container environment.
  - `pnpm exec vitest run scripts/postgres/migration-job-policy.test.ts` before the Dockerfile change: exit 1, `1/1` failed; received `FROM node:24.11.0-bookworm-slim AS base` instead of the exact tag+index-digest binding.
  - After pinning, the same policy command exited 0, `1/1` AUTOMATED_BEHAVIOR / PASS.
- Rebuild evidence: `pnpm run secret:check && docker build -f docker/migration-job/Dockerfile -t sartre-migration-job:ms0-task4 .` exited 0. BuildKit resolved the exact Node index digest. The new local image ID/manifest-list digest is `sha256:0439b083e43628201cf6828250fd840793ba616f9aeb0f027f10670ae2ecedc4`; config digest is `sha256:e803b503dc03b943585fb1b1d73c8923e96650fdf870bd5c452986a2c1d19911`.
- Fresh Migration Job REAL_TEST on the rebuilt image:
  - PostgreSQL 17.6 positive run exited 0 and wrote exact version `000001_ms0_baseline`, checksum `ff57c5fa909fc4506e4a503c6ea2d39c4c3bb67d5bda1d9dfa1a7cf6f008b839`, and `applied=true`; exact row assertion passed.
  - Runtime UID probe exited 0 with UID `1000`; image metadata reports `user=node` and entrypoint `["/usr/local/bin/sartre-migrate"]`.
  - After inserting checksum drift in the same disposable database, the rebuilt Job emitted `migration_checksum_mismatch` and exited 1; the drift row remained unchanged. Force-DROP cleanup exited 0.
  - The first temporary PostgreSQL 17.10 attempt was nonPASS: `pg_isready` observed the init-stage temporary postmaster, then two fingerprint `psql` calls fell into the restart gap. The Job still emitted `postgres_version_mismatch`, but no before/after fingerprint was established; the wrapper exited 1 and removed the exact temporary container.
  - The corrected condition-based attempt required two consecutive real `SHOW server_version_num=170010` reads. The rebuilt Job emitted `postgres_version_mismatch` and exited 1; object fingerprint was unchanged; container stop exited 0 and the exact-name residual filter was empty. The wrapper exited 0, REAL_TEST / PASS.
- Owned-payload artifact binding and Secret evidence:
  - The first extraction attempt copied an overbroad `/app/packages` subtree. The artifact scanner correctly exited 1 with `artifact_symlink_escape` on the pnpm dependency symlink; cleanup removed the stopped extraction container, temporary directory, and host compile output. This attempt is not PASS.
  - The corrected exact set contains host/image-identical compiled `migrate.js` and `verify-version.js`, the immutable migration, entrypoint, and eleven package/lock/workspace manifests. Content diffs all exited 0; no symlink existed. `pnpm run secret:artifacts -- "$ARTIFACT_DIR"` exited 0, and exact container/temp/host-build cleanup passed. The known whole-`/app` third-party dependency scan remains nonPASS history and is not relabeled.
- Secret boundary: no database URL value, password, container environment, ignored credential input, broad image inspect, or process environment was printed or persisted.
- Next: run focused PostgreSQL behavior/static gates, then the fresh root format/lint/typecheck/test/build/architecture and full/artifact Secret matrix on the complete repair tree. Only after GREEN may the exact Task 4 repair paths plus this ledger be staged and amended.

### 2026-07-20 22:33 CST - Task 4 quality repair pre-stage full matrix GREEN

- Status: IN_PROGRESS. All six quality findings are repaired on the dirty tree and the full local matrix is GREEN. Precise staging, immutable-index Secret verification, amend, post-amend verification, and independent specification/code-quality re-reviews remain. Task 5/MS1 remain prohibited.
- Focused/static evidence:
  - `pnpm exec vitest run` across the five new/expanded schema, version, compose, disposable, and Migration Job policy files: exit 0, `5 files | 34/34 tests`.
  - `pnpm exec tsc --noEmit -p scripts/postgres/tsconfig.json` and `pnpm exec tsc -p scripts/postgres/tsconfig.job.json --noEmit`: exit 0.
  - The first post-repair `pnpm run format:check` exited 1 only on six reported layout differences; lint did not run because the chain was fail-fast. Exact-file Biome formatting changed layout only. The complete fresh focused/strict/format/lint rerun then exited 0; format and lint each checked 101 files with no fixes.
- Fresh real database and root evidence:
  - Standalone unfiltered `SARTRE_DATABASE_URL="$LOCAL_TEST_DATABASE_URL" SARTRE_POSTGRES_NEGATIVE_URL="$LOCAL_NEGATIVE_DATABASE_URL" pnpm exec vitest run scripts/postgres/postgres.integration.test.ts --disableConsoleIntercept`: exit 0, `1 file | 7/7 tests`. All six PG17.6 disposable databases were dropped; residual count was zero. The exact-digest PG17.10 dependency stopped with exit 0 and its exact-name residual filter became empty.
  - First root wrapper attempt: `pnpm run test` itself exited 0 with scripts `19/19 files | 392/392 tests` and all eight workspace suites, but the outer wrapper exited 1 because it observed the `--rm` PG17.10 container before asynchronous removal completed. A later exact-name query proved it absent; this attempt is retained as nonPASS wrapper history.
  - Corrected condition-based cleanup then reran the entire root command fresh: scripts `19/19 files | 392/392 tests`, all eight workspace suites, contracts `57/57`, PG17.6 residual zero, PG17.10 stop exit 0 and removed=true; wrapper exit 0, REAL_TEST / PASS.
- Fresh root/static/build/Secret evidence:
  - `pnpm run format:check`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`, and `pnpm run architecture:check`: exit 0. Architecture remains STRUCTURAL_CHECK / PASS only.
  - `pnpm run secret:check`: exit 0. Post-build `pnpm run secret:artifacts --` over all eight explicit workspace build roots exited 0. `git diff --check` exited 0.
- Dirty repair path set at this checkpoint: `apps/hub-api/src/infrastructure/database/schema-compatibility.ts`; `docker/migration-job/Dockerfile`; `scripts/postgres/check-compose-policy.ts`; `scripts/postgres/create-test-database.ts`; `scripts/postgres/postgres-compose-policy.test.ts`; `scripts/postgres/postgres.integration.test.ts`; `scripts/postgres/verify-version.ts`; new `scripts/postgres/create-test-database.test.ts`, `migration-job-policy.test.ts`, `schema-compatibility.test.ts`, `verify-version.test.ts`; and this ledger. No Task 1-3 source/checker/catalog, authority spec/workflow/plan, migration artifact, compose file, lockfile, package manifest, freeze manifest, Task 5, or MS1 path changed.
- Next: rerun ledger-after focused/root/format/lint/strict/type/build/architecture/full/artifact Secret checks; precisely stage only the twelve paths above; run immutable-index plus full Secret checks; amend the existing Task 4 subject without changing its sole approved parent; then perform the required post-amend fresh verification and stop for re-reviews.

### 2026-07-21 10:06 CST - Task 4 targeted specification High compose bypass RED -> focused GREEN

- Status: IN_PROGRESS. Targeted specification re-review remains BLOCKED by one High until this repair is fully verified, amended, and re-reviewed. Task 5/MS1 remain prohibited.
- Clean base entering repair: commit `dfe9982938d00f6337be7ba10c90c3ec6de9cc8e`, tree `4d2d5c7122a25d4428ebdd606fe021ac41647039`, sole parent `bf4a2c0e615da0bae0ad39e249299a4976a3834d`.
- Confirmed reviewer probe and root cause:
  - A rendered document carrying `services.postgres.volumes_from=["unmanaged-production"]` and the approved logical volume redefined as `{ external: true, name: "production-database-data" }` returned no violation.
  - The prior policy closed the service and top-level logical-name sets but did not close the complete key/value schema. Unknown service mount/config channels and top-level volume/network definition fields were therefore allow-by-default.
- Fresh rendered schema authority: `docker compose -f docker/postgres/compose.yml --profile local-integration config --format json` showed exact document keys `name,networks,services,volumes`; postgres service keys `profiles,command,container_name,entrypoint,environment,healthcheck,image,labels,networks,ports,restart,volumes`; top-level volume key `name`; and default-network keys `name,ipam`. Compose normalizes approved absent command/entrypoint to `null` and default IPAM to `{}`.
- Witnessed behavior RED before production changes:
  - Initial expanded policy run: exit 1, `40 tests | 23 failed | 17 passed`.
  - After adding project-name and extra-network controls, the final pre-production run exited 1 with `42 tests | 25 failed | 17 passed`.
  - Failures isolated eight unapproved service channels (`volumes_from`, devices, tmpfs, configs, secrets, privileged, command, entrypoint), four nested service option gaps, four top-level volume definitions, four network definitions, two unapproved top-level config/secret sets, project-name drift, extra network, and the combined reviewer bypass. The pre-existing exact mount-option negative remained GREEN.
- Scoped implementation:
  - Added shared exact-key comparison and encoded the fresh rendered document/service/healthcheck/port/mount/network/volume shapes as allowlists. Any unknown key is now a violation by default.
  - Approved `command`/`entrypoint` must remain `null`; environment, labels, ports, healthcheck, network attachment, and mount require exact keys and values.
  - The rendered project name, single default network with empty IPAM, and single repo-owned logical volume with rendered name `postgres_sartre-postgres-17-6-data` are exact. External/name/driver/driver_opts and additional top-level configs/secrets/networks are rejected.
- Focused GREEN: `pnpm exec vitest run scripts/postgres/postgres-compose-policy.test.ts` exited 0, `42/42`; `pnpm exec tsx scripts/postgres/check-compose-policy.ts` exited 0 with `postgres_compose_policy=pass` against fresh rendered JSON.
- External state and image binding: no Compose file, Dockerfile, lockfile, package manifest, migration, entrypoint, or Job build input changed. No container, network, or volume recreation was needed; the prior Job image content binding remains applicable but runtime/database/root/Secret gates must still be refreshed before amend.
- Dirty scope: only `scripts/postgres/check-compose-policy.ts`, `scripts/postgres/postgres-compose-policy.test.ts`, and this ledger.
- Next: run repair-focused tests, standalone PostgreSQL `7/7`, root scripts/workspaces, strict/static/build/architecture, full/artifact Secret, and cleanup checks. Precisely stage the three paths, run immutable-index/full Secret, amend without changing the approved parent, then repeat post-amend verification before targeted specification re-review.

### 2026-07-21 10:10 CST - Task 4 targeted specification High pre-stage full matrix GREEN

- Status: IN_PROGRESS. The exact-schema repair is locally GREEN and ready for precise staging/amend; targeted specification and code-quality re-reviews remain required.
- Focused/static: after one format-only failure on the checker, exact-file Biome formatting changed layout only. The fresh chain then passed repair-focused `5 files | 60/60 tests`, both strict PostgreSQL `tsc` targets, format over 101 files, and lint over 101 files.
- Real PostgreSQL/root: standalone PostgreSQL exited 0 with `7/7`; root scripts exited 0 with `19 files | 418/418 tests`, followed by all eight workspace suites including contracts `57/57`. PG17.6 disposable residual count was zero; the exact-digest PG17.10 container stopped with exit 0 and its exact-name residual filter became empty.
- Root/static/build/Secret: format, lint, typecheck, build, architecture, full Secret, post-build eight-root artifact Secret, and `git diff --check` all exited 0. Architecture and rendered Compose remain STRUCTURAL_CHECK evidence only.
- Compose/Job boundary: Compose policy remained `42/42` and rendered CLI PASS. No Compose, Dockerfile, lock, package, migration, entrypoint, or Job input changed. Existing image metadata remains `sha256:0439b083e43628201cf6828250fd840793ba616f9aeb0f027f10670ae2ecedc4`, `user=node`, expected entrypoint; no rebuild claim is made.
- Exact dirty set: only `scripts/postgres/check-compose-policy.ts`, `scripts/postgres/postgres-compose-policy.test.ts`, and this ledger. No external container/network/volume state was changed beyond the temporary exact-name PG17.10 negative dependency, which was removed.
- Next: rerun ledger-after focused/root/static/Secret freshness; precisely stage only these three paths; run immutable-index/full Secret; amend with the approved parent unchanged; then rerun post-amend evidence and stop for targeted specification re-review.

### 2026-07-21 - Task 4 dual-review approved, ledger-only closeout

- Status: DONE. This closes Task 4 only. Task 5 has not started, MS0 remains IN_PROGRESS, and MS1 remains out of scope.
- Reviewed subject binding:
  - Immutable reviewed Task 4 code subject: `3499234bcf079ba7aedd664fd513a07bd9713429`, subject `feat(ms0): pin PostgreSQL 17.6 migration baseline`.
  - Subject tree: `fbeac306b5745d25c44174179845ff997e0d3bc7`.
  - Sole parent: approved Task 3 commit `bf4a2c0e615da0bae0ad39e249299a4976a3834d`.
  - This closeout amend changes only this ledger. The final Task 4 commit SHA cannot self-reference; the controller must verify the clean four-commit chain and prove that the only delta from the reviewed subject is this ledger.
- Final targeted reviewer evidence:
  - The same specification reviewer APPROVED the final compose exact-schema repair. Fresh Compose policy passed `42/42`, rendered CLI passed, and the original `volumes_from` plus external production-volume probe returned both `postgres_compose_service_shape_unsafe` and `postgres_compose_volume_definition_unsafe`.
  - The same code-quality reviewer freshly repeated those targeted controls and found Critical `0`, Important `0`. The only Minor was this naturally stale active ledger, to be corrected by this closeout.
- Accepted Task 4 evidence and boundaries:
  - PostgreSQL integration passed `7/7` on the reviewed implementation, including exact migrated-schema success and unmigrated/checksum/default-drift rejection; root scripts passed `418/418` after the final compose policy expansion. Those implementation gates are not rerun for this ledger-only delta.
  - Migration Job image `sha256:0439b083e43628201cf6828250fd840793ba616f9aeb0f027f10670ae2ecedc4` is bound to the digest-pinned Node base, compiled runner, version gate, immutable SQL, non-root user, and positive/checksum/version controls.
  - Whole `/app` third-party dependency scanning remains explicitly non-PASS on lock-pinned synthetic examples. Repository-owned image payload Secret scanning is PASS; dependency/SAST/license gates retain the vendor boundary.
  - Compose exact-schema policy is intentionally bound to Docker Compose `v5.0.2` normalized JSON and fails closed on schema drift. The local `trust` database remains loopback-only and prohibited from production reuse.
  - `architecture:check` and rendered Compose remain STRUCTURAL_CHECK only. No Task 5 process-health or MS0 closeout claim is made.
- Scope: only `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md` changes. No Task 4 source/test/config/lock/Docker/migration artifact, Task 1-3 source, authority file, freeze manifest, Task 5, or MS1 path changes.
- Task 5 handoff: first create `tests/integration/service-health.integration.test.ts`, then run `pnpm exec vitest run tests/integration/service-health.integration.test.ts`. The accepted first result is a behavioral RED caused by missing service process/health behavior, not a missing file, zero discovery, syntax/dependency failure, unreachable required PostgreSQL, or SKIPPED assertion.

### 2026-07-21 10:50 CST - Task 5 service-health focused TDD GREEN, full verification pending

- Status: IN_PROGRESS. Task 5 focused implementation is GREEN; the one-time complete verification matrix, precise commit, and independent specification/code-quality reviews remain. Task 6 and MS1 have not started.
- Scope and implementation:
  - Added Zod-derived fixed process identifiers, exact per-process snapshots, MS0 Worker heartbeat payload, and a strict four-process aggregate in `packages/contracts/src/service-health.ts`; apps do not copy cross-module DTOs.
  - Added a NestJS Hub API with process-only `/livez`, Task 4 query-only PostgreSQL 17.6 plus exact-baseline `/readyz`, and no automatic migration. Its Worker heartbeat aggregator exists only when explicit MS0 self-test mode has a valid per-run token.
  - Added a Nest application-context Worker with a loopback-only probe server and periodic Hub heartbeat. Added a loopback-only Local Runtime probe with only `/livez` and `/readyz`; no file or command surface exists.
  - Added `packages/sdk/src/health-client.ts` as the sole Hub health client. It combines caller-provided Electron local status, Hub readiness, Hub-owned Worker heartbeat status, and Local Runtime readiness into exactly four redacted process entries; raw endpoints and the self-test token are retained only in client closure state and never enter the result.
  - `packages/runtime-core` gained only a contract-backed `createProcessHealthSnapshot` constructor so Local Runtime preserves the approved `local-runtime -> runtime-core -> contracts` graph. Heartbeat transport, Hub aggregation, and SDK routing did not move into runtime-core.
- TDD RED and focused attempt history:
  - Required first command after the test existed: `pnpm exec vitest run tests/integration/service-health.integration.test.ts` exited 1 with `0 tests` because an async default parameter was invalid syntax. This was explicitly rejected as nonaccepted RED; no production file existed or changed before the test-only syntax repair.
  - The exact rerun exited 1 with `1 file | 4 tests failed`. Each discovered test created and migrated a real disposable PostgreSQL database, spawned a real Hub child, and failed at `hub-api_process_exited_before_health_response` because the process entrypoint/health implementation was absent. There was no missing dependency, unreachable PostgreSQL, syntax/collection failure, zero discovery, or SKIPPED assertion. This is the accepted behavioral RED.
  - First post-implementation focused attempt exited 1 with `4/4 failed` at the same Hub process-exit boundary. Focused workspace TypeScript then exposed stale local package build exports, one required type-only Nest import, and an exact-optional SDK request-init issue. Contract/runtime-core build outputs were refreshed only as ignored local package-resolution inputs; source fixes remained scoped to Task 5.
  - Focused TypeScript checks then passed for contracts, runtime-core, Hub API, Worker, Local Runtime, and SDK. A redacted single-Hub probe isolated the next process failure to tsx not loading the app decorator configuration; test spawn now passes the contained app tsconfig explicitly.
  - The next integration attempt executed all four tests and timed out waiting for Hub liveness while the process remained up. A single loopback probe returned 500. The root cause was absent runtime constructor metadata in the tsx transform; explicit Nest `@Inject` annotations repaired that boundary without changing transport or contracts.
  - Focused GREEN: `pnpm exec vitest run tests/integration/service-health.integration.test.ts` exited 0 with `1 file | 4 tests passed` in 6.40s. After replacing a silent PostgreSQL cleanup fallback with explicit degraded readiness, the fresh rerun again exited 0 with `1 file | 4 tests passed` in 7.75s.
- REAL_TEST assertions executed by the focused suite:
  - Three real child processes bind only ephemeral loopback ports. Every `/livez` and `/readyz` body is parsed by the authoritative `HealthSnapshotSchema` and reports the exact service identifier.
  - Stopping the repository-owned PostgreSQL dependency makes Hub `/readyz` return 503/degraded with stable `dependency_unavailable`, while Hub `/livez` remains 200/healthy. Condition-based restart restores Hub readiness before cleanup continues.
  - In explicit self-test mode, a wrong per-run token receives the same redacted 404 as a nonexistent resource. A separately spawned production-mode Hub does not register the route and also returns redacted 404. Response bodies do not expose Worker existence, heartbeat details, or token material.
  - With PostgreSQL healthy, stopping the real Worker leaves Hub own readiness healthy. After the heartbeat deadline, the SDK aggregate marks only Hub Worker unavailable; Electron, Hub API, and Local Runtime remain healthy. Restarting the Worker on its loopback probe restores the four-process aggregate to healthy.
  - Child start/stop/restart, HTTP polling, database stop/recovery, and final cleanup are bounded. Per-run tokens and ephemeral ports remain in memory only. PIDs remain in memory only and are neither printed nor persisted in this ledger or tracked evidence. No orphan was observed by the suite's complete exit.
- Dependencies and boundaries:
  - Added the plan-pinned minimum NestJS runtime packages to Hub API/Worker, used self-typed `postgres@3.4.7` behind Hub's narrow query adapter without weakening the Task 2 checker, and retained Local Runtime's only internal dependency on runtime-core. The lockfile changed only through strict pnpm installation.
  - No identity, System actor, Requirement, Session, Agent execution, Steward behavior, Electron renderer/Main implementation, Task 6 UI, or production self-test route was added.
  - Process responses are strict health contracts containing stable catalog codes only. They contain no database URL, self-test token, SQL, stack, local path, PID, or raw dependency response.
- One-time complete matrix and affected repair history:
  - Before the matrix, the first Task 5 path formatter invocation exited 1 because Biome did not parse the plan-required Nest parameter decorators. `biome.json` now enables only Biome's explicit `unsafeParameterDecoratorsEnabled` parser option; TypeScript app configs retain `experimentalDecorators`/`emitDecoratorMetadata`. The targeted formatter then passed.
  - Strict focused TypeScript commands exited 0 for contracts, runtime-core, SDK, Hub API, Hub Worker, Local Runtime, and the standalone integration test under the root strict options.
  - Fresh `pnpm run format:check` and `pnpm run lint` exited 0 over 115 files with no fixes or warnings.
  - The first root `pnpm run test` executed the real PostgreSQL script suite and failed only the current production-tree architecture assertion: root scripts were `417 passed | 1 failed` out of 418. The checker reported Hub `pg` resolving to external `@types/pg` identity plus two generic Secret-pattern findings on Bearer-style self-test header construction. This attempt remains FAIL and is not hidden by the later rerun.
  - The Task 2 checker was not changed or weakened. Hub readiness switched from `pg` to minimum `postgres@3.4.7`, which carries its own TypeScript declarations behind the same narrow query adapter. The ephemeral loopback self-test route now uses a dedicated `x-sartre-ms0-session` header instead of a production-style authorization scheme.
  - Affected fresh checks passed: Hub/Worker/SDK plus standalone integration strict TypeScript; the current-tree architecture fixture `1 passed | 216 skipped`; focused health `4/4` in 7.09s; format/lint over 115 files.
  - The affected root rerun exited 0: root scripts passed `19 files | 418/418 tests`, then all eight workspace suites passed, including contracts `57/57`. Root `pnpm test` does not include `tests/integration/service-health.integration.test.ts`; the real health lifecycle remains separately bound to the focused `4/4` command above.
  - The exact temporary PostgreSQL 17.10 dependency used by each root attempt was loopback-only, stopped with exit 0, and condition-polled until its exact-name residual set was empty. No container environment was inspected.
  - `pnpm run typecheck`, `pnpm run build`, and `pnpm run architecture:check` exited 0. Architecture remains STRUCTURAL_CHECK / PASS only.
  - `pnpm run secret:check` exited 0. Post-build `pnpm run secret:artifacts -- apps/electron-app/dist apps/hub-api/dist apps/hub-worker/dist apps/local-runtime/dist packages/contracts/dist packages/domain/dist packages/runtime-core/dist packages/sdk/dist` exited 0 for all eight explicit roots. `git diff --check` exited 0.
- Risks and pending evidence:
  - The Hub-owned heartbeat store is intentionally process-local and temporary because it exists only in explicit MS0 self-test mode. It is not business or production health state; MS1 must replace this transport with authenticated actor semantics rather than promoting it.
  - The SDK fallback uses an unavailable/redacted snapshot when a dependency or response contract fails. It deliberately provides no raw endpoint or transport error to Renderer consumers.
  - The final restaged ledger must repeat immutable-index/full Secret evidence. Independent specification and quality review have not started.
- Pre-commit immutable staging:
  - The index contained exactly 25 Task 5 paths: Hub API 8, Hub Worker 6, Local Runtime 2, contracts 2, runtime-core 1, SDK 2, plus `biome.json`, `pnpm-lock.yaml`, this ledger, and the service-health integration test. No Task 1-4 source, Task 6/MS1, authority spec/workflow/plan, freeze manifest, ignored input, build output, or raw evidence path was staged.
  - `git diff --cached --check` exited 0. The unstaged path set and nonignored untracked path set were both empty.
  - `pnpm run secret:check -- --index` and fresh `pnpm run secret:check` each exited 0 with `Secret boundary check passed`. This ledger delta is restaged and the cached/exact-path/index/full checks are repeated before commit; startup-only output is not evidence.
- Historical next: the initial Task 5 commit and post-commit checks completed at candidate `da3c0b34788e01e045a420d96a6c1faef25bb80b`; current recovery is governed only by the top procedure and the review-repair checkpoint below.
- Resume: use the top procedure. Never read ignored credential input, print or persist the loopback database URL/token/PID/ephemeral ports, inspect container environment, begin Task 6/MS1, alter Task 1-4, or regenerate the legacy freeze manifest.

### 2026-07-21 - Task 5 specification-review cleanup repair focused GREEN

- Status: IN_PROGRESS. Specification review failed the committed candidate on one High ledger drift and one Medium cleanup failure-path defect. Runtime source is unchanged; only the integration Harness and this ledger are in repair scope.
- Witnessed RED: after adding the fake cleanup control, `pnpm exec vitest run tests/integration/service-health.integration.test.ts` exited 1 with `1 failed | 4 passed`. The first cleanup rejected and the observed call order was only `[first]`, proving later cleanup actions were skipped.
- Scoped repair:
  - A sequential all-attempt helper invokes every cleanup task and throws one `AggregateError` whose `errors` preserve task order. The control asserts calls `[first, second, third]` and errors `[firstFailure, thirdFailure]`.
  - Operation failures are retained before cleanup failures. `withHarness` now uses Task 4's verified `withDisposableDatabase` around baseline load, migration, process operation, and inner cleanup; migration/pre-operation failures still reach database disposal, and Task 4 owns primary-plus-database-cleanup aggregation.
  - Inner cleanup attempts PostgreSQL recovery, Worker stop, Runtime stop, and Hub stop in controlled order even after an earlier rejection. Global `afterAll` likewise attempts PostgreSQL recovery and every remaining live child.
  - `stopProcess` removes a handle from `liveChildren` only after confirmed exit. A final stop failure leaves it visible to global cleanup; the separately created production Hub receives the same fallback through the live set.
- Focused GREEN: the exact focused command exited 0 with `1 file | 5 tests passed` in 6.74s. The original four real lifecycle/dependency/transport/aggregation scenarios remain PASS.
- Boundaries: no runtime source, package, lockfile, Task 1-4, Task 6/MS1, authority, or freeze path changed. No full root/static rerun is authorized or needed for this test/ledger-only repair.
- Closeout state: the two-path repair was amended without changing the Task 5 parent; post-amend focused health passed `5/5` and the clean five-commit chain was verified. Next is specification re-review, then code-quality review only after specification approval.

### 2026-07-21 - Task 5 code-quality four-finding targeted repair GREEN

- Status: IN_PROGRESS. Targeted specification review approved candidate `eca1e348913264929cd619fe637c0c509f7dc3aa`; code-quality review found Critical `0`, Important `4`. The repair is limited to Hub configuration/module construction, the integration Harness/tests, and this ledger. No business/runtime source, package, lockfile, Task 1-4, Task 6/MS1, authority, or freeze path changed.
- Hub self-test config TDD:
  - RED: `pnpm exec vitest run apps/hub-api/src/health/config.test.ts` exited 1 with `8 failed | 6 passed` out of 14. Wildcard/hostname/missing host and missing/invalid deadline still enabled self-test; `main.ts` read config twice.
  - GREEN: explicit mode, exact loopback host, valid lowercase 64-hex token, and policy-valid deadline are all required before `selfTestEnabled=true`. Invalid cases clear the token and omit the controller. One validated config instance now feeds module construction, providers/controllers, and listen. Config passed `14/14`.
- Docker portability and bounded command TDD:
  - RED: focused Harness ran 9 tests with `4 failed | 5 passed`. Docker was still absolute-path bound; a real Node child ignoring `SIGTERM` remained live beyond 500ms and returned `command_policy_timeout_missing` before the test's `finally` force-cleaned it.
  - GREEN: Docker resolves as `docker` under explicit child-only PATH `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin`; no parent environment is inherited. Every command has a bounded policy: timeout -> `SIGTERM` -> grace -> `SIGKILL` -> confirmed exit, returning stable `command_timed_out`; termination failure returns stable `command_termination_failed`.
  - Commands register at spawn and leave the registry only on confirmed exit or confirmed spawn absence. Global `afterAll` attempts every residual direct command after PostgreSQL and health-child cleanup. This intentionally covers direct children only and does not duplicate Task 3 process-group infrastructure.
- PostgreSQL conservative recovery TDD:
  - RED: a failing/nonzero stop observed `needsRecovery=false`; a successful start followed by readiness timeout also cleared the flag, so global cleanup would not retry.
  - GREEN: stop marks recovery before invoking Docker and retains it on partial/nonzero failure. Start marks/keeps recovery throughout command and probing; only two consecutive real disposable-database readiness successes clear it. Probe timeout leaves recovery true, and global cleanup retries start. Narrow injected dependencies make both failure paths deterministic without mocking process/HTTP/PG behavior in the four real integration scenarios.
- Final focused evidence:
  - `tests/integration/service-health.integration.test.ts` passed `9/9`; the original four real service scenarios and cleanup aggregation scenario remain PASS alongside the four new Harness controls.
  - Combined config/Harness/integration passed `2 files | 23/23 tests` in 10.99s.
  - Hub config/main TypeScript and standalone affected-test strict TypeScript exited 0. Focused Biome format/lint checked the four changed TypeScript paths with no remaining fixes or warnings.
- Pre-amend boundary: `git diff --check`, `pnpm run secret:check`, exact five-path staging/cached whitespace, and `pnpm run secret:check -- --index` each exited 0. The index contains only Hub config test/config/main, the integration Harness/test, and this ledger.
- Commit/review state: this checkpoint is part of the amended clean five-commit Task 5 subject with unchanged Task 4 parent. Full/index Secret and diff checks bind the focused change; the prior full root/typecheck/build/architecture matrix remains applicable because runtime source changed only in Hub config/module construction and the affected strict/config/integration tests cover it. Next is targeted specification review, then the same quality reviewer only after approval.

### 2026-07-21 - Task 5 final quality lazy-registry repair GREEN

- Status: IN_PROGRESS. Targeted specification review approved candidate `eb05c297518dd8a49f10752f420c9cb2fea977fd`; the same quality reviewer reported Critical `0` and one Important. Repair scope is exactly the integration Harness/test plus this ledger; Hub/runtime/package/lock/Task 1-4/Task 6/MS1/authority/freeze paths are unchanged.
- Confirmed defect: global `afterAll` expanded `liveCommands` before running PostgreSQL recovery. If recovery spawned a Docker command whose stop/termination then failed, that late command was absent from the old snapshot and could survive the cleanup pass.
- Witnessed RED: after adding the lazy-registry control, focused health/Harness executed 10 tests with `1 failed | 9 passed`. The first cleanup task inserted `late-command`, but observed calls were only `[restore]`, proving construction-time expansion skipped it. Existing nine controls/scenarios remained PASS.
- Scoped repair: the final cleanup item is now a closure that reads `[...liveCommands]` only when executed, after PostgreSQL and health-child cleanup attempts. It invokes every late command through the existing sequential all-attempt helper, preserving deterministic nested aggregation with earlier cleanup failures. No command snapshot is taken at `afterAll` entry.
- Focused GREEN: the exact focused command exited 0 with `1 file | 10 tests passed` in 7.63s. The target test file was then formatted mechanically; post-amend focused evidence reconfirms the final formatted subject.
- Commit/review state: this checkpoint is part of the amended clean five-commit Task 5 subject with unchanged Task 4 parent. Full/index Secret and diff checks bind the exact two-path repair. No root/typecheck/build/architecture rerun is authorized or required. Next is targeted specification review, then the same quality reviewer only after approval.

### 2026-07-21 14:33 CST - Task 5 dual-review closeout

- Status: DONE. This closes Task 5 only. Task 6 has not started, MS0 remains IN_PROGRESS, and MS1 remains out of scope.
- Reviewed subject: `616b2c0e5be133622f03405c2db746c31a8e6ee5`, subject `feat(ms0): add service health process shells`, sole parent `d5d370cd4b1378ec022233208a1debcd7dab2d03`.
- Final specification review: APPROVED with no residual finding. The reviewer confirmed the reviewed delta is limited to the integration Harness/test and ledger, freshly ran `pnpm exec vitest run tests/integration/service-health.integration.test.ts`, and observed `1 file | 10 tests passed`. The final cleanup closure reads `liveCommands` only when executed after PostgreSQL and health-child cleanup, attempts every late command, and deterministically aggregates restore and late-command failures.
- Final code-quality review: Critical `0`, Important `0`, Ready `YES`. The reviewer confirmed the lazy registry blocker is closed: PostgreSQL recovery or earlier cleanup failure cannot skip the final dynamic command sweep, and the new negative control covers a preceding cleanup that both registers a late command and fails.
- Evidence binding: the one-time Task 5 complete matrix and affected focused gates are recorded in the preceding checkpoints. `architecture:check` is STRUCTURAL_CHECK only. The final reviewed focused process-health result is REAL_TEST / PASS. No old test output is promoted beyond its recorded subject/scope.
- Closeout scope: only this `PLAN_LEDGER.md` changes after the reviewed subject. No Task 1-5 source/test/config/package/lock, Task 6/MS1, authority, freeze, ignored input, build output, or raw-evidence path changes.
- Accepted residual risk: the MS0 Hub Worker heartbeat store remains explicit self-test-mode, process-local temporary state and must not be promoted into MS1 production identity or authoritative state. Win32 direct-child and Task 4 vendor-scan boundaries remain governed by their earlier checkpoints.
- Next command: after creating Task 6's failing monitor and packaging-policy tests, run `pnpm exec vitest run apps/electron-app/src/main/health/health-monitor.test.ts apps/electron-app/src/main/packaging-policy.test.ts`. Accept only discovered behavioral RED caused by missing Task 6 behavior; missing files, zero discovery, syntax/dependency failure, or SKIPPED assertions are not accepted.
- Resume: use the top procedure. Preserve the clean five-commit chain, do not rerun Task 5's full root/static matrix without Task 5 source drift, and do not begin MS1, push, read ignored credential input, inspect container environments, or regenerate the legacy freeze manifest.

### 2026-07-21 16:03 CST - Task 6 Electron four-process health candidate ready for commit and dual review

- Status: IN_PROGRESS. The Task 6 implementation and required local candidate evidence are GREEN and ready for precise commit. Independent specification review and subsequent code-quality review remain required; Task 6 is not DONE. Task 7 has not started, MS0 remains IN_PROGRESS, and MS1 remains prohibited.
- Subject base: current clean parent before this candidate is `ae383c5928951c1474ed9e90657fb469e0f0e039`, tree `7c25fa0d12b7e920f6a7ec659f0f527b9d2e63fa`. The candidate commit cannot self-reference its final SHA; the controller must verify the post-commit SHA/tree/sole-parent/path set.
- User-visible implementation:
  - Electron Main creates one local BrowserWindow with exact `contextIsolation=true`, `sandbox=true`, `webSecurity=true`, `nodeIntegration=false`, and the compiled preload. Production code does not load a remote renderer.
  - Preload exposes only `systemHealth.getSnapshot()` and `systemHealth.subscribe()`. Both request and update results are parsed through SDK-exported Zod contracts before Renderer consumption.
  - Renderer always displays exactly Electron, Hub API, Hub Worker, and Local Runtime with status, last check, version, and remediation. The compiled CSS is copied explicitly and loaded by `<link>`; no false business entry point exists.
  - Main owns polling, timeout, stale-state transition, non-overlapping reads, lifecycle cleanup, and redacted failure mapping. Renderer does not access Hub, Runtime, Node, raw IPC, credentials, URLs, or local paths.
- Packaging and hardening implementation:
  - `electron-builder.yml` pins deterministic `productName`/`artifactName`, unsigned arm64 macOS output, and an explicit compiled-payload `files` allowlist. Electron app production dependencies remain empty; React, SDK, contracts, and their types are build-time `devDependencies` only.
  - The package wrapper preserves the plan's pnpm `--` call shape and accepts only `--dir` or `--publish never`. `extract-electron-payload.ts` accepts only exact input/output arguments, uses `hdiutil` plus `ditto`, requires exactly one `Sartre.app`, and detaches/cleans every mount path on success or failure.
  - Artifact scanning no longer skips invalid UTF-8 binaries or performs lossy replacement; supplemental matching runs over lossless printable ASCII while pinned gitleaks scans every requested directory. The prior Electron Framework false positive is eliminated without weakening printable Secret detection.
  - Architecture scanning ignores only generated `dist`, `out`, and `release` trees, retains source negative controls, and permits an exact runtime package declaration identity to be supplied by its matching `@types` package without relaxing package identity checks.
- Preserved RED and regression history:
  - The plan's first focused monitor/packaging command discovered two files and failed `9/9` on missing Task 6 exports/behavior; it was not a missing-file, zero-discovery, syntax, dependency, or SKIPPED result. Focused monitor/packaging later passed.
  - Extractor controls failed `5/5` before implementation and passed `5/5` after. The package argv regression failed `1` before the wrapper handled pnpm's separator and the combined packaging suite later passed `7/7`.
  - Artifact regressions failed `2` before invalid UTF-8 and printable-binary handling were corrected; the final artifact suite passed `15/15`. Generated-output and exact `@types` architecture controls each failed before their narrow checker repairs and passed afterward.
  - The real Electron CSS control received `display: table-row` instead of `grid` before CSS was copied/linked. After the fix, the real E2E passed. No test-only style injection was used.
- Fresh static/focused evidence on the final source tree:
  - Initial `pnpm run format:check` exited 1 only because Biome required the new CSS copy call on one line. Initial `pnpm run lint` exited 0 with one unused type-import warning. The exact layout and unused import were minimally corrected; fresh `pnpm run format:check` and `pnpm run lint` then exited 0 with no fixes or warnings.
  - `pnpm run typecheck`: exit 0 across repository policy and all eight workspaces.
  - `pnpm exec vitest run apps/electron-app/src/main/health/health-monitor.test.ts apps/electron-app/src/main/packaging-policy.test.ts apps/electron-app/src/module-boundary.test.ts scripts/constitution/extract-electron-payload.test.ts scripts/constitution/artifact-secret-scan.test.ts`: exit 0, `5 files | 25/25 tests`.
  - `pnpm exec vitest run scripts/architecture/check.test.ts`: exit 0, `1 file | 219/219 tests`. `pnpm run architecture:check`: exit 0, STRUCTURAL_CHECK / PASS only.
  - `pnpm run build`: exit 0 across repository policy and all eight workspaces. `pnpm run docker-context:check`: exit 0, STRUCTURAL_CHECK / PASS only.
- Fresh complete behavior and dependency evidence:
  - A first unconfigured `pnpm run test` attempt exited 1 with root scripts `19 passed | 1 failed`, `420 passed | 7 failed`; all seven failures were the required PostgreSQL suite reporting missing explicit dependency configuration. This attempt is not PASS and no ignored credential input was read.
  - A temporary exact-digest PostgreSQL 17.10 dependency was started only on loopback port 55432 with explicit non-secret `trust`; two consecutive real reads returned `server_version_num=170010`. The existing repository-owned PostgreSQL 17.6 dependency remained loopback-only on 54326.
  - Fresh root `pnpm run test` with both explicit loopback trust URLs exited 0: root scripts `20/20 files | 427/427 tests`, then every suite in all eight workspaces passed, including contracts `57/57`. The PG17.10 exact-name container stopped with exit 0 and condition polling proved it removed; the PG17.6 `sartre_ms0_%` disposable database residual count was zero. No database URL value, token, password, PID, container environment, or broad process environment is persisted here.
  - `pnpm exec playwright test tests/e2e/ms0-health.spec.ts --workers=1`: exit 0, `1 passed (4.3s)`. The real packaged Electron workbench remained stable through Worker loss and recovery. Playwright's untracked `.last-run.json` was deleted afterward.
- Fresh Secret/package/extraction evidence:
  - Fresh `pnpm run secret:check` passed before the root build and again immediately before each package build.
  - `pnpm run package:mac:arm64 -- --dir`: exit 0. The explicit nine-path command over all eight build roots plus `apps/electron-app/release/mac-arm64/Sartre.app` passed pinned gitleaks and supplemental artifact scanning: `9 explicit path(s)`.
  - `pnpm run package:mac:arm64 -- --publish never`: exit 0 and generated `apps/electron-app/release/Sartre-0.1.0-arm64.dmg`. The exact extractor command exited 0 into a new temporary directory.
  - The explicit eleven-path command over all eight build roots, unpacked app, deterministic DMG, and separately extracted app passed pinned gitleaks and supplemental artifact scanning: `11 explicit path(s)`. Temporary extraction cleanup was verified complete.
  - DMG SHA-256 / `electronArtifactHash`: `c9f952b6e8b3519e4cb45bf46f9dbcfc47ca715123da5611237e192e527abc73`; size `119939658` bytes. A deterministic relative-path/kind/mode/content/symlink-target tree digest was identical for unpacked and extracted `Sartre.app`: `b77a43b669feb44170ee97946c6cda9ff564d8182b564c0436be191e927e1b57`.
  - Explicit tool versions: Node `v24.11.0`, pnpm `10.33.2`, electron-builder `26.15.3`, Electron `v43.1.1`, Playwright `1.61.1`, gitleaks `8.28.0`.
- Scope and residual risks:
  - Candidate scope is Electron app Main/Preload/Renderer/shared/build/package/config/tests, the Electron E2E, SDK health-contract re-exports, root/app package and lock changes, narrow architecture/artifact-scanner repairs and tests, Biome parsing/config support, and this ledger. Task 1-5 implementation, authority spec/workflow/plan, PostgreSQL artifacts, freeze manifest, Task 7, and MS1 are unchanged.
  - This is an unsigned local MS0 arm64 artifact with the default Electron icon; it is not signing, notarization, installation, upgrade, or Release evidence. The app hash matches extracted content, but only the DMG hash is the Harness `electronArtifactHash`.
  - `architecture:check` and `docker-context:check` remain STRUCTURAL_CHECK only. Passing package/E2E/Secret gates cannot replace independent specification and code-quality reviews.
- Pre-commit immutable staging:
  - The first exact staging pass contained 33 Task 6 candidate paths: Electron Main/Preload/Renderer/shared/build/package/config/tests, Electron E2E, SDK export, root/app package and lock changes, narrow architecture/artifact-scanner repairs/tests, Biome config, and this ledger. No Task 1-5 implementation, authority spec/workflow/plan, PostgreSQL artifact, freeze manifest, Task 7, MS1, ignored input, build output, package output, test output, or raw evidence path was staged.
  - `git diff --cached --check` exited 0; the unstaged path set and nonignored untracked path set were empty. `pnpm run secret:check -- --index` and fresh full `pnpm run secret:check` each exited 0 with `Secret boundary check passed`.
  - This checkpoint paragraph changes the staged ledger after that first pass. The ledger must be restaged and cached whitespace, exact index enumeration, index-only Secret, and full repository Secret checks must repeat before commit; only that later immutable index may be committed.
- Next: restage this ledger; repeat cached whitespace, exact index enumeration, `pnpm run secret:check -- --index`, and fresh full `pnpm run secret:check`; commit `feat(ms0): show four-process health in Electron`; verify clean SHA/tree/sole parent and fresh focused/E2E/Secret evidence; then request independent specification review. Do not begin Task 7/MS1 or push.

### 2026-07-21 - Task 6 specification review FAILED, six-finding repair opened

- Status: IN_PROGRESS. Specification review FAILED. The reviewed candidate is `cacc6465e1961232ded3f28aa2aa3f0ff90f1a59`, tree `6d0fc6b6bacd9aed2c5c056a5847f1ff44ecbbc1`, subject `feat(ms0): show four-process health in Electron`, sole parent `ae383c5928951c1474ed9e90657fb469e0f0e039`. Task 6 is not DONE; code-quality review, Task 7, and MS1 are prohibited until repair and specification re-review.
- High — package fail-closed: checked-in `electron-builder.yml` contains broad `**/*`; policy accepts globs; wrapper accepts empty argv, trusts caller-supplied scan coverage, and does not validate the real checked-in config/manifest before builder or exact app/asar inventory after builder. Required repair is exact compiled files, strict `--dir` / `--publish never`, real wrapper behavioral controls, and wrapper-owned post-build inventory. External 9/11-path Secret scans remain separate evidence.
- High — asar dependency closure: current packaged inventory is not a proved exact set, and root `pg` can reach packaged dependencies even though its use is limited to scripts/tests. Required repair moves root-only `pg` to root `devDependencies`, updates the lock, and proves asar contains only the approved compiled payload with no `node_modules`, source, tests, maps, or unexpected file.
- High — architecture bypass: generated-directory exclusion is overbroad and can skip `src/dist`, `src/out`, or `src/release`. Required repair first proves these three source-nested cases fail, then anchors exclusions only at module-root generated directories while preserving the existing generated-root positive control and all original negative controls.
- High — E2E cleanup: a spawned real child can remain registered too late or survive when `waitForHttp` fails before cleanup ownership is established. Required repair registers every child immediately or bounded-stops on startup failure and adds a real alive-but-never-healthy TERM→KILL/confirmed-exit/no-residual control without mocking process failure.
- Medium — argv exposure: current Electron argv carries raw Hub/Runtime endpoints and a complete session token. Required repair removes those values from argv, uses child-only minimal validated input, proves Electron spawn args/DOM/errors exclude token and raw endpoints, and does not persist them in tracked or temporary plaintext files. Any environment transport remains explicit MS0 self-test-only risk and must not inherit the parent environment.
- High — ledger/evidence classification: the previous checkpoint did not record specification failure and described the default development Electron E2E as packaged. Required repair distinguishes dev E2E from a mandatory real run against `release/mac-arm64/Sartre.app/Contents/MacOS/Sartre`, binds the packaged run to the final artifact hash, and updates resume/Next to specification re-review only.
- Repair order: package fail-closed; asar/root dependency closure; module-root-only architecture exclusion; real E2E child cleanup; argv removal/minimal child input; ledger and mandatory packaged executable evidence. Each item requires affected RED then GREEN. After all six, run the one-time complete root/static/dev-E2E/packaged-E2E/package/extract/hash/Secret matrix, precisely stage, amend the Task 6 commit with parent unchanged, and perform fresh post-amend checks.
- Next: add package-policy/wrapper/inventory behavioral controls and run the affected focused command. Accept only failures proving current glob acceptance, empty-argv acceptance, caller-trusted coverage, missing real config validation, or absent exact post-build inventory; discovery/configuration failures are not accepted RED.

### 2026-07-21 17:13 CST - Task 6 six-finding specification repair ready for amend and re-review

- Status: IN_PROGRESS. All six specification findings have affected RED/GREEN evidence and the one-time complete repair matrix is GREEN. The prior specification decision remains FAIL until the same reviewer approves the amended immutable candidate. Code-quality review, Task 7, and MS1 remain prohibited.
- Package fail-closed TDD and repair:
  - Empty argv selector exited 1 because the normalizer returned `[]`; it now rejects empty input and accepts only `--dir` or `--publish never`, including the pnpm separator form. Focused rerun passed.
  - A nested-glob selector exited 1 because `dist/main/*.js` produced only `packaging_files_unapproved_path`; all glob syntax now additionally produces stable `packaging_files_glob_forbidden`. The exact ordered six-file configuration initially failed as unapproved and now accepts only `dist/main/index.js`, `dist/preload/index.cjs`, the three exact renderer files, and `package.json`.
  - Removing caller-reported scanner coverage produced the expected RED with four fake `artifact_scan_path_missing` violations. The packaging policy no longer accepts or claims external scan coverage. Wrapper-owned inventory and external 9/11-path Secret scans are separate gates and separate evidence.
  - The checked-in config/manifest filesystem loader initially had no export. It now reads the real files before builder execution, rejects malformed input, any production dependency, glob/config/name/output drift, and produces stable policy violations. A real invalid `**/*` fixture passed the negative control.
  - The exact asar validator and real asar reader each first failed on missing behavior. A recreated same-path archive then exposed stale `@electron/asar` header caching; explicit `uncache` before every read closed that bypass. Synthetic exact/missing/node_modules/source/test/map/unexpected archive controls passed.
  - The real `--dir` wrapper RED exited 1 after builder status 0 because the actual `app.asar` contained forbidden dependency payload and returned `packaging_asar_inventory_exact_set_required,packaging_asar_forbidden_path`. The wrapper now validates checked-in policy before builder and validates the real app/asar after builder. It does not claim that external artifact Secret scanning happened inside the wrapper.
- Asar/root dependency closure:
  - Root `pg@8.16.3` is used only by scripts/tests and moved from root production dependencies to root devDependencies. App build-time asar inspection is explicitly pinned as Electron app devDependency `@electron/asar@3.4.1`; the frozen lock was updated without introducing app production dependencies.
  - Fresh real wrapper `--dir` passed. Independent actual inventory enumerated exactly ten entries: the three expected directories, five exact compiled files, and `package.json`; no `node_modules`, source, tests, source maps, or extra file exists. This exact inventory is REAL_TEST / PASS and does not rely on builder's informational dependency-search log.
- Architecture bypass TDD and repair:
  - New real fixtures at `src/dist/renderer`, `src/out/renderer`, and `src/release/renderer` all failed before repair: `3 failed | 219 skipped`, each returning no renderer violation.
  - Module text traversal and TypeScript path preflight now skip `dist`, `out`, and `release` only when the current parent is a verified module root. `node_modules`/coverage remain separately excluded. Affected rerun passed all three source negatives plus the existing generated-module-root positive: `4 passed | 218 skipped`; the complete architecture fixture passed `222/222`. Current-tree `architecture:check` passed but remains STRUCTURAL_CHECK only.
- E2E cleanup TDD and repair:
  - The real alive-but-never-healthy fixture binds loopback, returns 503, and ignores SIGTERM. Initial RED ran 15 seconds and proved the spawned child was not immediately handed to cleanup ownership. A first repair killed only the TSX CLI parent while its real service child remained reachable.
  - Process startup now runs the entrypoint in the registered child itself through Node's resolved TSX loader and child-only tsconfig input. Startup timeout preserves the primary failure, performs bounded SIGTERM then SIGKILL, confirms exit, and aggregates cleanup failure if present. The real control passes in 3.3 seconds, asserts `SIGKILL`, condition-polls the endpoint to unreachable, and leaves no residual.
- Argv exposure and configuration TDD/repair:
  - Strict health-environment tests failed `2/2` before the reader existed and now pass `2/2`. Complete input requires exact loopback HTTP origins, lowercase 64-hex session token, and bounded timing integers; partial, hostname/HTTPS/credential/path drift, malformed token, and invalid bounds fail closed. Completely absent injection remains the deliberate unavailable workbench state.
  - The development E2E switched first to child-only environment and failed with zero healthy processes while Main still read argv. Main now reads only the validated environment. Electron launch passes an explicit minimal child environment and does not inherit the parent environment. Spawn args, Renderer DOM, console, and page errors are asserted not to contain either raw endpoint or the session token.
  - Residual risk: this environment transport is MS0 self-test-only, process-local input. It is not an identity/credential design and must not be promoted to MS1; a same-user OS debugger may have process-level access. The values never enter argv, tracked/temp files, reports, DOM, Renderer diagnostics, or this ledger.
- Evidence classification repair:
  - The health scenario now requires explicit `SARTRE_E2E_TARGET=development|packaged`; an unconfigured run fails immediately with `electron_e2e_target_required`. The development command passed the cleanup and health scenarios `2/2` and is labeled development evidence only.
  - Packaged mode fixes the executable to `apps/electron-app/release/mac-arm64/Sartre.app/Contents/MacOS/Sartre`, requires an independently supplied 64-hex DMG hash, and compares it to the real DMG before launching. The mandatory final packaged command passed cleanup plus Worker loss/recovery `2/2` and is bound to final DMG hash `8fde5fca9f029c4edaf02ec5a63202067f9864026ceb843264d6a1710000191a`.
- One-time complete repair matrix:
  - Fresh `pnpm run format:check` and `pnpm run lint` exited 0 over 138/139 files after one recorded seven-file formatter-only failure was repaired mechanically. `pnpm run typecheck` and `pnpm run build` exited 0 across repository policy and all eight workspaces.
  - Focused Electron/extractor/artifact tests passed `6 files | 32/32 tests`; architecture fixtures passed `222/222`; current architecture passed as STRUCTURAL_CHECK only.
  - Fresh root test with explicit loopback-only PostgreSQL 17.6/17.10 trust dependencies exited 0: root scripts `21/21 files | 431/431 tests`, then all eight workspace suites passed, including Electron `20/20` and contracts `57/57`. The exact-name negative dependency was removed and disposable database residual count was zero. No URL value, token, password, PID, container environment, or broad process environment is persisted here.
  - Full repository Secret passed before root build and immediately before each real package build. Final `--dir` and `--publish never` wrappers exited 0 with their own exact inventory gate. External 9-path unpacked and 11-path DMG/extracted artifact Secret scans each exited 0. Docker context policy passed as STRUCTURAL_CHECK only.
  - Final DMG size is `119827227` bytes and SHA-256 / `electronArtifactHash` is `8fde5fca9f029c4edaf02ec5a63202067f9864026ceb843264d6a1710000191a`. Deterministic relative-path/kind/mode/content/symlink-target tree digests for unpacked and extracted `Sartre.app` are identical: `b7cdd7d80b944a2e750ecaffeff0a646cbbaaf4e8ea414765eae389a58e02efa`. Temporary extraction cleanup was verified.
- Repair scope: exact package config/policy/wrapper/tests, Electron health environment/Main, E2E lifecycle/target/fixtures, root/app dependency declarations and lock, architecture generated-root traversal/checker fixtures, and this ledger. Task 1-5 implementation, authority spec/workflow/plan, PostgreSQL artifacts, freeze manifest, Task 7, and MS1 are unchanged.
- Next: precisely stage only this repair set, run cached whitespace/exact-path/index/full Secret checks, and amend `feat(ms0): show four-process health in Electron` while preserving sole parent `ae383c5928951c1474ed9e90657fb469e0f0e039`. Then run fresh post-amend focused/architecture/dev-E2E/mandatory packaged-E2E/Secret/hash checks on a clean tree and request specification re-review. Do not begin code-quality review, Task 7, or MS1 and do not push.

### 2026-07-21 - Task 6 specification re-review accepted behavior, ledger-only High repair

- Status: IN_PROGRESS. The same specification reviewer accepted the first five repaired findings and the complete packaged collective chain. The only remaining High is stale ledger state. This checkpoint repairs only the ledger; source/test/config/package/lock and generated artifacts are unchanged.
- Reviewed repair candidate / pre-ledger-closeout subject: `5da43031df1f402ff93f27b2fcb2c7d6c221c2ed`, tree `8c71f2b5e1993f9929ee76bc2744bbc204419f65`, subject `feat(ms0): show four-process health in Electron`, sole parent `ae383c5928951c1474ed9e90657fb469e0f0e039`. The repository was clean after amend and after all post-amend commands below.
- Fresh post-amend focused and structural evidence:
  - `pnpm exec vitest run apps/electron-app/src/main/health/health-environment.test.ts apps/electron-app/src/main/health/health-monitor.test.ts apps/electron-app/src/main/packaging-policy.test.ts apps/electron-app/src/module-boundary.test.ts scripts/constitution/extract-electron-payload.test.ts scripts/constitution/artifact-secret-scan.test.ts`: exit 0, `6 files | 32/32 tests`.
  - `pnpm exec vitest run scripts/architecture/check.test.ts`: exit 0, `1 file | 222/222 tests`. `pnpm run architecture:check`: exit 0, STRUCTURAL_CHECK / PASS only.
  - `pnpm run secret:check`: exit 0. `shasum -a 256 apps/electron-app/release/Sartre-0.1.0-arm64.dmg`: exit 0 and returned `8fde5fca9f029c4edaf02ec5a63202067f9864026ceb843264d6a1710000191a`.
- Exact explicit development Electron E2E:
  - Command: `SARTRE_E2E_TARGET=development pnpm exec playwright test tests/e2e/ms0-health.spec.ts --workers=1`.
  - Result: exit 0, `2 passed (7.1s)`: the real never-healthy cleanup scenario and Worker loss/recovery health workbench labeled `[development]` both passed.
- Exact mandatory packaged executable E2E:
  - Command: `SARTRE_E2E_TARGET=packaged SARTRE_E2E_EXPECTED_ARTIFACT_SHA256='8fde5fca9f029c4edaf02ec5a63202067f9864026ceb843264d6a1710000191a' pnpm exec playwright test tests/e2e/ms0-health.spec.ts --workers=1`.
  - Result: exit 0, `2 passed (7.1s)`: the cleanup scenario and the exact `release/mac-arm64/Sartre.app/Contents/MacOS/Sartre` Worker loss/recovery scenario labeled `[packaged]` both passed after the test independently matched the real DMG to the supplied expected hash.
  - The E2E itself generates the per-run session token and ephemeral service endpoints in memory, passes them through the explicit minimal child-only environment, and asserts argv/DOM/Renderer diagnostics do not contain them. No token, endpoint value, database URL, PID, or temporary path is present in these commands or persisted in this ledger.
- Post-amend binding and cleanup: final app tree digest remained `b7cdd7d80b944a2e750ecaffeff0a646cbbaaf4e8ea414765eae389a58e02efa`; the exact-name negative PostgreSQL dependency was absent; disposable database residual count was zero; Playwright output was deleted; `git status --porcelain=v1` was empty.
- Reviewer result: package policy/wrapper/inventory, root dependency closure, source-nested generated-directory negatives, real TERM→KILL cleanup, argv/environment containment, explicit development E2E, mandatory packaged executable E2E, and artifact-hash binding are accepted. No behavioral gate needs rerun for this ledger-only text delta.
- Scope: only `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md` changes relative to `5da43031df1f402ff93f27b2fcb2c7d6c221c2ed`. The final amended SHA cannot appear in its own commit.
- Next command: after the ledger-only amend, run `git diff --name-only 5da43031df1f402ff93f27b2fcb2c7d6c221c2ed..HEAD` and require exactly this ledger; verify clean status/tree/sole parent, then request ledger-only specification re-review from the same reviewer. Do not rerun the accepted full/E2E/package gates, request code-quality review, begin Task 7/MS1, or push.

### 2026-07-21 - Task 6 code-quality review WITH FIXES, two-Important repair opened

- Status: IN_PROGRESS. Specification review approved the ledger rebound. Code-quality review result is WITH FIXES: Critical `0`, Important `2`. Reviewed candidate is `72b1644116249650baa075111c2730d33f850ae5`, tree `eef0b1dda1332da86b5b6b66f49c7c3b83cbd368`, subject `feat(ms0): show four-process health in Electron`, sole parent `ae383c5928951c1474ed9e90657fb469e0f0e039`.
- Important 1 — monitor timeout overlap: a fresh reviewer probe used a first poll that never settles. After the required timeout published unavailable, a second `pollNow()` started another underlying poll and observed call count `2`. The monitor clears ownership when its timeout race settles rather than when the underlying operation confirms settle/abort. Required repair changes poll to accept `AbortSignal`, aborts on timeout, propagates the same external signal through Main and SDK to real fetch, composes it with the SDK's own timeout, and retains ownership if an abort-ignoring poll remains unsettled. Recovery may start only after the old poll actually settles.
- Important 2 — artifact scanner false negatives: an explicitly requested scan root that is itself a symlink to a same-level internal directory can be treated as its own root and evade the intended symlink boundary. Requested-root symlinks must fail closed without following; nested internal Electron framework symlinks retain the existing safe policy. Non-UTF-8 handling also scans only printable single-byte ASCII, so UTF-16LE and UTF-16BE encoded credential text can evade `secret_artifact_violation`. Required repair adds bounded UTF-16 printable decoding while preserving valid UTF-8, lossless printable ASCII, real ASCII credential detection, and Mach-O false-positive protection.
- Affected scope only: health monitor/SDK/Main and their tests; artifact scanner and its tests; this ledger. Package/UI behavior and generated artifacts are unchanged, so root/full package/DMG/packaged E2E evidence is not rerun. Because SDK request cancellation behavior changes, run affected SDK tests/typecheck and at least the focused health integration or development E2E once.
- Accepted residual Minors, not repair scope: package subprocess environment inheritance remains bounded by the prior wrapper/package policy and is not expanded here; descendant containment beyond the requested-root symlink closure remains governed by the existing nested-symlink policy.
- Next command: add monitor behavioral controls for abort-aware timeout/recovery and abort-ignoring no-overlap, then run `pnpm exec vitest run apps/electron-app/src/main/health/health-monitor.test.ts`. Accept only assertion failures proving timeout ownership/AbortSignal behavior; discovery, syntax, dependency, or SKIPPED failures are not accepted RED.

### 2026-07-21 17:53 CST - Task 6 two-Important quality repair ready for amend and re-review

- Status: IN_PROGRESS. Both Important findings have affected RED/GREEN evidence. Specification approval remains valid outside this repair scope, but code-quality remains WITH FIXES until the same reviewer approves the amended immutable candidate. The repair base is `72b1644116249650baa075111c2730d33f850ae5`, tree `eef0b1dda1332da86b5b6b66f49c7c3b83cbd368`, subject `feat(ms0): show four-process health in Electron`, sole parent `ae383c5928951c1474ed9e90657fb469e0f0e039`.
- Monitor/SDK/Main TDD and repair:
  - Behavioral RED `pnpm exec vitest run apps/electron-app/src/main/health/health-monitor.test.ts` exited 1 with `6 tests | 2 failed | 4 passed`: the monitor supplied no `AbortSignal` on timeout or stop, and the never-settling underlying poll could release ownership after only the public timeout attempt settled.
  - A real loopback hanging-socket SDK control first exited 1 with `1 failed | 10 skipped` and stable failure `health_external_abort_not_propagated`. The monitor now aborts timeout/stop requests, keeps ownership until the underlying operation actually settles, and permits recovery only afterward. Main propagates the same signal to SDK; SDK composes it with its own bounded timeout and passes the composite signal to all three real fetches.
  - Focused monitor GREEN passed `6/6`. The real loopback signal control passed `1/1` with `10 skipped`, and complete `pnpm run health:smoke` passed `1 file | 11/11 tests`, including the existing real Hub/Worker/Runtime aggregation, degradation, cleanup, and recovery scenarios.
- Artifact scanner TDD and repair:
  - Behavioral RED `pnpm exec vitest run scripts/constitution/artifact-secret-scan.test.ts` exited 1 with `10 tests | 3 failed | 7 passed`: UTF-16LE, UTF-16BE, and an explicitly requested root symlink each returned no violation.
  - Explicitly requested root symlinks now fail closed as `artifact_symlink_escape` without following. Nested internal Electron framework symlink behavior is unchanged. Scanning preserves valid UTF-8 and printable single-byte ASCII while also conservatively deriving printable UTF-16LE/BE candidates at both byte alignments; unsafe runs are normalized to separators so decoding does not manufacture cross-run tokens. The existing printable ASCII credential and Mach-O-style invalid-binary false-positive controls remain GREEN.
  - Focused artifact GREEN passed `10/10`; the final combined monitor/artifact command passed `2 files | 16/16 tests`.
- Fresh affected static evidence:
  - The initial SDK typecheck correctly rejected explicit `signal: undefined` under `exactOptionalPropertyTypes`; the call sites now omit the optional key when absent. Electron then correctly rejected the stale built SDK declaration. `pnpm --filter @sartre/sdk build` refreshed the ignored generated declaration, after which fresh SDK and Electron typechecks each exited 0.
  - An independent `tsc --noEmit --strict` command over Electron Main/monitor and SDK health client exited 0. Focused Biome format and lint each checked the seven changed TypeScript files with no fixes, errors, or warnings. `git diff --check` exited 0.
- Exact scope: Electron health monitor source/test and Main wiring; SDK health client; artifact scanner source/test; real service-health integration; and this ledger. Package/UI/generated artifacts, accepted package/asar/architecture/argv evidence, Task 1-5 implementation, authority spec/workflow/plan, PostgreSQL artifacts, freeze manifest, Task 7, and MS1 are unchanged. Root/full package, DMG, and packaged E2E gates are intentionally not rerun under the approved affected-verification boundary.
- First pre-amend immutable index: exact staging contained only the eight approved repair paths. `git diff --cached --check` exited 0; exact cached enumeration returned those eight paths; `pnpm run secret:check -- --index` and fresh full `pnpm run secret:check` each exited 0 with `Secret boundary check passed`. This paragraph changes the staged ledger, so it must be restaged and the cached whitespace/exact-path/index/full Secret checks must repeat before amend.
- Next: restage this ledger, repeat cached whitespace and exact-path enumeration plus index/full Secret checks, then amend the existing Task 6 subject while preserving its sole parent. Run fresh clean-candidate affected verification and request re-review from the same quality reviewer only. Do not begin Task 7/MS1 or push.

### 2026-07-21 - Task 6 quality re-review WITH FIXES, large-binary bounded-memory repair opened

- Status: IN_PROGRESS. The same quality reviewer accepted the prior two Important repairs at candidate `4264732a012f845c80180bc173279cd135dbe329`, tree `939a91262b205cee1a63340341fa2a6f66dc5d82`, subject `feat(ms0): show four-process health in Electron`, sole parent `ae383c5928951c1474ed9e90657fb469e0f0e039`. Re-review remains WITH FIXES: Critical `0`, Important `1`.
- Important — large artifact memory exhaustion: the scanner still reads each file into one complete `Buffer`, produces primary plus four UTF-16 candidate strings, and joins them into another complete string. A fresh reviewer run against the real `192433104`-byte Electron Framework binary took about `20.4s`, exited `134` with OOM, and reached about `4.43GB` maximum RSS. A required Secret gate that cannot scan its real artifact is not PASS.
- Required TDD: generate, but never commit, a representative large sparse/deterministic binary; invoke the scanner in a child with an explicit bounded heap and timeout; require the current implementation to fail nonzero/OOM and the repaired implementation to exit 0 without printing file content. Add cross-chunk ASCII, UTF-16LE, and UTF-16BE synthetic credential controls so bounded scanning cannot trade OOM for boundary false negatives.
- Required repair: process regular files in fixed-size chunks. Retain only bounded carry/overlap sufficient for current literal tokens and credential URL, bearer, and assignment shapes. Preserve valid UTF-8 and printable ASCII behavior; derive UTF-16LE/BE printable candidates without retaining multiple whole-file strings. Requested-root symlink fail-closed and nested symlink policy remain unchanged.
- Required affected verification: full artifact focused tests including bounded heap, cross-chunk encodings, existing Mach-O/ASCII/root-symlink controls; an explicit bounded real scan of the existing Electron Framework file with elapsed/max-RSS evidence and no environment/content dump; then the explicit unpacked artifact path scan required by the accepted package evidence. Run focused format/lint/typecheck/diff and index/full Secret before amend. Do not rerun root/full package, DMG, development E2E, or packaged E2E.
- Next command: add the bounded-heap generated-large-binary and cross-chunk ASCII/UTF-16LE/BE controls to `scripts/constitution/artifact-secret-scan.test.ts`, then run the focused artifact test. Accept only assertion failures showing the child scanner cannot complete in the memory bound or cross-chunk credentials are missed; discovery, syntax, dependency, or SKIPPED failures are not accepted RED.

### 2026-07-21 18:09 CST - Task 6 bounded-memory artifact repair ready for amend and re-review

- Status: IN_PROGRESS. The new large-binary Important has affected RED/GREEN and real-artifact evidence. The prior quality decision remains WITH FIXES until the same reviewer approves the amended immutable candidate. Repair base is `4264732a012f845c80180bc173279cd135dbe329`, tree `939a91262b205cee1a63340341fa2a6f66dc5d82`, subject `feat(ms0): show four-process health in Electron`, sole parent `ae383c5928951c1474ed9e90657fb469e0f0e039`.
- TDD evidence:
  - The first large-sparse test attempt failed during fixture setup with `ENOENT` because `truncateSync` does not create a missing file. This was not accepted RED; the test now creates the temporary file before truncation.
  - Valid behavioral RED `pnpm exec vitest run scripts/constitution/artifact-secret-scan.test.ts` exited 1 with `14 tests | 1 failed | 13 passed`. A generated, untracked, sparse `64MiB` file was scanned in a child with `--max-old-space-size=96`; the old full-file implementation ran about `13.9s` and exited exactly `134` instead of required `0`.
  - The scanner now validates UTF-8 incrementally and performs scanning with fixed `256KiB` file chunks, bounded `64KiB` text carry, and corresponding raw-byte overlap. Printable ASCII and four UTF-16 endian/alignment candidates are scanned per bounded window; non-printable runs collapse to separators instead of becoming whole-file strings. It no longer holds a complete file plus five derived full-file strings.
  - Cross-chunk controls cover ASCII literal, bearer, credential URL, and assignment patterns plus UTF-16LE/BE literals. Existing valid ASCII credential, invalid-binary/Mach-O false-positive, missing path, requested-root symlink, nested symlink, and pinned CLI controls remain GREEN. Fresh focused suite passed `18/18`, including the same generated `64MiB` file in the `96MiB` heap child; complete duration was about `2.4s` in the final concurrent verification.
- Real artifact evidence:
  - `stat` confirmed the existing Electron Framework executable is exactly `192433104` bytes. With `NODE_OPTIONS=--max-old-space-size=128`, `/usr/bin/time -l pnpm run secret:artifacts -- <exact Framework file>` exited 0 with `Artifact Secret boundary passed for 1 explicit path(s)`, `5.62s` real, maximum RSS `342622208` bytes, and peak memory footprint `98573344` bytes.
  - The same bounded command over the full existing unpacked `Sartre.app` exited 0 with `Artifact Secret boundary passed for 1 explicit path(s)`, `5.63s` real, maximum RSS `366968832` bytes, and peak memory footprint `89381824` bytes. Neither command printed environment values or artifact content.
- Fresh affected static evidence: focused Biome format and lint checked both scanner files with no fixes, errors, or warnings; independent strict TypeScript compilation of the scanner exited 0; `git diff --check` exited 0; fresh full `pnpm run secret:check` exited 0 with `Secret boundary check passed`.
- Scope is exactly scanner source/test and this ledger. Monitor/Main/SDK, package/UI/generated artifacts, accepted package/asar/architecture/argv evidence, Task 1-5 implementation, authority spec/workflow/plan, PostgreSQL artifacts, freeze manifest, Task 7, and MS1 are unchanged. Root/full package, DMG, and both E2E modes are intentionally not rerun.
- First pre-amend immutable index contained exactly scanner source/test and this ledger. `git diff --cached --check` exited 0; cached enumeration returned those exact three paths; `pnpm run secret:check -- --index` and fresh full `pnpm run secret:check` each exited 0 with `Secret boundary check passed`. This paragraph changes the staged ledger, so it must be restaged and all four checks must repeat before amend.
- Next: restage this ledger; repeat cached whitespace, exact-path enumeration, index-only Secret, and full Secret; amend the existing Task 6 subject while preserving its sole parent. Then run clean-candidate focused/real-artifact/static/Secret verification and request re-review from the same quality reviewer only. Do not begin Task 7/MS1 or push.

### 2026-07-21 18:16 CST - Task 6 final quality approval and closeout

- Status: DONE. This closes Task 6 only. Task 7 has not started, MS0 remains IN_PROGRESS, and MS1 remains out of scope.
- Reviewed subject: `d86fd227040a061ed164cf3f31cd2e044313e5d6`, tree `e1e7065fca5b3b6c103f46d3bc3d43ab6f88e7b9`, subject `feat(ms0): show four-process health in Electron`, sole parent `ae383c5928951c1474ed9e90657fb469e0f0e039`.
- Final specification state: APPROVED. The independent specification reviewer accepted the exact package allowlist and wrapper-owned asar gate, dev-only root dependency closure, source-nested architecture negatives, real failed-start child cleanup, argv containment, explicit development E2E, and the mandatory packaged collective artifact chain. The later quality repairs remained limited to monitor/SDK cancellation, artifact scanner correctness/performance, focused tests, and this ledger; no Task 6 requirement was removed or weakened.
- Final code-quality review: Critical `0`, Important `0`, Minor `0`, Ready `YES`. The reviewer freshly passed `pnpm exec vitest run scripts/constitution/artifact-secret-scan.test.ts` with `18/18`, then scanned the exact `192433104`-byte Electron Framework under `--max-old-space-size=128`: exit 0 in `3.87s`, no violation, maximum RSS `311754752` bytes. The bounded `256KiB` chunk scanner retains finite overlap and the cross-chunk ASCII/UTF-16 controls.
- Evidence binding: final DMG SHA-256 / `electronArtifactHash` remains `8fde5fca9f029c4edaf02ec5a63202067f9864026ceb843264d6a1710000191a`; unpacked/extracted application tree hash remains `b7cdd7d80b944a2e750ecaffeff0a646cbbaaf4e8ea414765eae389a58e02efa`. Exact development and packaged E2E commands/results, root/static evidence, asar inventory, 9/11-path Secret scans, and cleanup evidence are recorded in the preceding checkpoints. `architecture:check` and `docker-context:check` remain STRUCTURAL_CHECK only.
- Accepted residual risks: the artifact is unsigned and uses the default icon, so it is not signing/notarization/Release evidence. MS0 self-test health configuration remains child-only process input, not MS1 identity/credential design. Package helper-descendant containment and inherited builder environment remain bounded by the wrapper/package policy but should be re-audited at the Release gate; no current residual process was reproduced.
- Closeout scope: only this `PLAN_LEDGER.md` changes after the reviewed subject. No Task 1-6 source/test/config/package/lock, generated artifact, authority, freeze, Task 7, or MS1 path changes.
- Next command: after creating `tests/integration/diagnostic-timeline.integration.test.ts`, run `pnpm exec vitest run tests/integration/diagnostic-timeline.integration.test.ts`. Accept only a discovered behavioral RED caused by missing Task 7 correlation-chain behavior; missing file, zero discovery, syntax/dependency failure, unreachable required PostgreSQL, or SKIPPED assertions are not accepted.
- Resume: use the active top procedure. Preserve the clean six-commit chain, do not rerun Task 6's full/package/E2E matrix without Task 6 drift, and do not begin MS1, push, read ignored credential input, inspect container environments, or regenerate the legacy freeze manifest.

### 2026-07-21 18:24 CST - Task 7 required first correlation RED accepted

- Status: IN_PROGRESS. Task 7 Step 1 has an accepted behavioral RED. No production implementation exists yet; Task 8/MS1 remain prohibited.
- Test-first scope: created only `tests/integration/diagnostic-timeline.integration.test.ts`, which first verifies the real loopback PostgreSQL dependency reports exact `server_version_num=170006`, then requires the SDK correlation diagnostics client.
- Exact command: `pnpm exec vitest run tests/integration/diagnostic-timeline.integration.test.ts`.
- Result: exit 1, `1 file | 1 test failed`. PostgreSQL 17.6 was reachable and passed the exact version assertion; the test then failed because `createDiagnosticsClient` was absent. This is a missing Task 7 correlation-boundary behavior, not a missing file, zero-discovery, syntax/dependency, database-unreachable, or SKIPPED result.
- Evidence: REAL_TEST / FAIL. No message body, Prompt, Secret, local path, database URL, SQL, stack, raw command output, token, or process identifier is persisted in this checkpoint.
- Next: extend this test through real disposable migration, real Hub HTTP positive/forced-failure and denial paths, then implement the minimum Task 7 contracts/ports. Preserve the RED before touching production code.

### 2026-07-22 10:40 CST - Task 7 correlation diagnostic candidate locally verified

- Status: IN_PROGRESS. The Task 7 implementation and local evidence are ready for a precise subject commit and independent specification/code-quality review. Task 7 is not DONE; Task 8 has not started, MS0 remains IN_PROGRESS, and MS1/push remain prohibited.
- Candidate boundary:
  - Added strict contracts for one safe UUID correlation scope, four ordered diagnostic stages, completed/failed summaries, recovery action, evidence references, and retained stage records. `correlationIds` is exactly `[correlationId]`; nullable non-applicable domain identifiers remain explicit, and `userId` must equal `initiatedByUserId`.
  - Added ordered migration `000002_ms0_diagnostics` and exact registry/schema compatibility checks. `diagnostic_records` stores correlation/context identifiers, bounded stage/status/error enums, timestamps, and retention only; it has no message body, Prompt, Secret, local path, SQL, stack, raw output, domain event, or aggregate payload column.
  - Added self-test-only Hub diagnostics controller/service/repository and SDK client. The route is absent in production; missing/wrong self-test authorization receives the same redacted `404` response as an absent production route.
  - Added the SDK-only `trace-correlation` CLI. A real failed correlation returns exit `1`, empty stderr, the safe stage summary and `restore_dependency_and_retry` on stdout, and omits the self-test token and Hub base URL. The CLI contract returns `0` only for a completed timeline; the real subprocess evidence in this checkpoint exercises the failed exit `1` path.
  - Healthy evidence is the exact ordered chain `request_received -> context_validated -> dependency_check -> probe_completed`; forced dependency failure is the exact three-stage prefix, with `lastSuccessfulStage=context_validated`, `firstFailedStage=dependency_check`, `errorCode=dependency_unavailable`, and `retryable=true` on the failed record.
  - Retention is exactly 24 hours from `recordedAt` in the service, with both contract validation and the database `retention_expires_at > recorded_at` constraint. The real query confirmed all retained failure rows expire after recording. Random safe correlation UUIDs were compared end-to-end but are intentionally not persisted in this ledger.
- Diagnostics TDD and GREEN evidence:
  - The required first REAL_TEST / FAIL remains the preceding `createDiagnosticsClient`-missing `1/1` RED.
  - The initial expanded related run without single-worker serialization exited nonzero and remains nonPASS history; it is not relabeled by later success.
  - `pnpm exec vitest run tests/integration/diagnostic-timeline.integration.test.ts --disableConsoleIntercept`: exit 0, `1 file | 3/3`. This executed real PostgreSQL 17.6 migration, real Hub child HTTP, SDK positive/failure/read, identical production/wrong-token denial, programmatic CLI, subprocess CLI, bounded output, process cleanup, and database cleanup. A clean-baseline rerun again passed `3/3`, with zero diagnostic disposable databases before and after.
  - `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/postgres/migration-registry.test.ts scripts/postgres/schema-compatibility.test.ts`: prior candidate exit 0, `3 files | 67/67`, covering strict contracts, exact ordered registry/checksums, and migrated-schema exactness/drift rejection.
  - The final correct serialized related command was `pnpm exec vitest run --maxWorkers=1 packages/contracts/src/contracts.test.ts scripts/postgres/migration-registry.test.ts scripts/postgres/schema-compatibility.test.ts apps/hub-api/src/health/config.test.ts tests/integration/service-health.integration.test.ts tests/integration/diagnostic-timeline.integration.test.ts scripts/postgres/postgres.integration.test.ts --disableConsoleIntercept`: exit 0, `7 files | 103/103`. It used real loopback-only PostgreSQL 17.6 plus an exact-digest, temporary loopback-only PostgreSQL 17.10 negative dependency; the latter was removed.
  - A mistaken final command sent `tests/e2e/ms0-health.spec.ts` to Vitest: six proper files passed `95/95`, while the Playwright file was a zero-test runner mismatch and the wrapper exited 1. It remains orchestration nonPASS, not behavioral evidence. Task 6 Playwright E2E was intentionally not rerun; the actual-asar focused guard below is the required Task 6 regression boundary.
- Migration Job failure history and TDD:
  - The first real Task 7 Job image reused runtime dependency installation assumptions and failed because runtime `pg` was absent. Moving `pg` to root production dependencies was rejected because it would violate Task 6 packaging isolation. The selected design installs dependencies only in the build stage and bundles `pg` into one owned runtime file; runtime has no `pnpm install` and no `node_modules`.
  - The first self-contained ESM image reached real runtime but failed with exact error `Dynamic require of "events" is not supported`. This is REAL_TEST / FAIL and is not hidden by the later CJS repair.
  - Test-first CJS policy changed only `scripts/postgres/migration-job-policy.test.ts`; `pnpm exec vitest run scripts/postgres/migration-job-policy.test.ts` then exited 1 with `1 failed | 1 passed`, because the Dockerfile still used `--format=esm`, an ESM banner, `runner.mjs`, and the ESM entrypoint.
  - The first minimal CJS Docker build did not reach runtime: esbuild rejected top-level `await` in `migrate.ts` and statically imported `verify-version.ts`, and warned that `import.meta.url` is unavailable in CJS. A first attempted compile control imported an unavailable root esbuild module and discovered zero tests; it is explicitly not accepted RED. The corrected real `pnpm exec esbuild` control exited 1 with `1 failed | 2 passed`, reproducing both top-level-await errors.
  - The scoped source repair uses `__filename` for the bundled CJS module URL and `import.meta.url` for source ESM, replaces CLI top-level awaits with bounded promise completion, and prevents imported `verify-version.ts` from self-executing inside the CJS bundle. No migration ordering, checksum, version gate, SQL, or rollback behavior was weakened.
  - A final warning policy required `--define:import.meta.url=undefined --log-level=warning` for the CJS build. Its corrected pre-production run exited 1 only because the Dockerfile lacked those flags; after the exact Dockerfile change, the policy/real compile suite exited 0, `3/3`, with empty warning output.
- Final image and REAL_TEST / PASS:
  - `pnpm run secret:check && docker build -f docker/migration-job/Dockerfile -t sartre-migration-job:ms0-task7 .`: exit 0 with the digest-pinned Node base. Final image manifest-list digest is `sha256:467746d39cc4f7da1dfb7c25d247f31e3b403637a6bf705ac4fd776fd7ed8a9d`; config digest is `sha256:23972074ca37c1d30983ca8500a7e9358a483b73446c9309acedc9c610f12450`. The build emitted no esbuild warning.
  - A bounded wrapper created one unique disposable database, passed its connection only as transient process input, and ran two exact temporary containers from that image. The first Job applied ordered `000001_ms0_baseline` and `000002_ms0_diagnostics` with `applied=true,true`; the second returned `applied=false,false`. Both exited 0.
  - Final exact migration rows were `000001_ms0_baseline` / `ff57c5fa909fc4506e4a503c6ea2d39c4c3bb67d5bda1d9dfa1a7cf6f008b839` and `000002_ms0_diagnostics` / `fe75b3e93def7551a4e0b1d03419b72c0d7f39b251869d6fea32ecfbdf74d521`, in order and with no extra row.
  - The real diagnostic schema query returned exactly 26 columns, 17 required columns, nine constraints, and three indexes (`diagnostic_records_pkey`, `diagnostic_records_correlation_sequence_key`, and `diagnostic_records_correlation_lookup_idx`).
  - The first evidence wrapper successfully completed both Job runs and exact migration-row checks, then its read-only constraint summary failed because PostgreSQL internal `"char"` required `contype::text`. The wrapper exited 1 and is retained as nonPASS. Its initial best-effort database cleanup left one disposable database; it was subsequently force-dropped by exact discovered name without printing the name or connection input. The corrected complete wrapper reran on a new unique database, exited 0, and proved exact database and two-container cleanup.
  - Final image policy verified `user=node`, exact entrypoint, no runtime `/app/node_modules`, one `runner.cjs`, no `runner.mjs`, and both immutable SQL files. Exact extraction compared the entrypoint and both SQL files byte-for-byte, enumerated exactly four regular owned payload files with no symlink, and `pnpm run secret:artifacts -- <bounded-image-payload>` exited 0. The exact extraction container and temporary directory were removed. A prior wrapper containing a broad host `rm -rf` was rejected before execution by command safety policy and produced no evidence or state change.
- Task 6 packaging guard:
  - A manifest assertion proved root `pg` remains only `devDependencies.pg=8.16.3`; it is absent from root production/optional/peer dependency sets. `esbuild` is likewise build tooling, and no runtime install was added.
  - `pnpm exec vitest run apps/electron-app/scripts/package-mac-arm64.integration.test.ts`: exit 0, `1/1`. The real wrapper invoked `--dir` and the actual unpacked application passed the wrapper-owned exact-ten-entry asar inventory validator. No DMG or Task 6 E2E was regenerated.
- Final candidate matrix:
  - `pnpm run test` with explicit transient loopback-only PostgreSQL 17.6/17.10 trust inputs: command body exited 0 with root scripts `22 files | 449/449`, then all eight workspace suites passed, including contracts `59/59` and Electron `22/22`. The exact PostgreSQL 17.10 container was removed. The outer wrapper then found one pre-existing diagnostics disposable database because no all-prefix baseline had been taken; it exited 1 rather than relabel cleanup. That database was safely classified, force-dropped without printing its name, and the clean-baseline diagnostics `3/3` rerun proved zero before/after residuals.
  - `pnpm run format:check`: exit 0, 146 files; `pnpm run lint`: exit 0, 147 files; `pnpm run typecheck` and `pnpm run build`: exit 0 across the exact eight workspaces; `pnpm run architecture:check`: exit 0, STRUCTURAL_CHECK / PASS only; `git diff --check`: exit 0.
  - `pnpm run secret:check`: exit 0. After the final build, `pnpm run secret:artifacts -- apps/electron-app/dist apps/hub-api/dist apps/hub-worker/dist apps/local-runtime/dist packages/contracts/dist packages/domain/dist packages/runtime-core/dist packages/sdk/dist`: exit 0 for all eight explicit build roots. The separate Migration Job owned-payload artifact Secret scan also exited 0.
- Exact candidate scope: Hub manifest/main/health baseline integration and new diagnostics controller/repository/service; ordered diagnostic migration and schema compatibility; contracts timeline schema/tests/exports; SDK client/exports; trace CLI; diagnostics/service-health/health E2E configuration tests; migration registry/schema/PostgreSQL tests; root `pg`/esbuild build tooling and lockfile; Migration Job Dockerfile/entrypoint/policy plus dual-mode migration/version CLI compatibility; and this ledger. Task 1-6 source outside the named health/config/package guard integration, authority spec/workflow/plan, compose, legacy freeze, generated DMG, Task 8, and MS1 are unchanged.
- Risks and boundaries:
  - Diagnostic endpoints and self-test token transport are MS0 test infrastructure, not MS1 identity/authorization. Production absence plus indistinguishable `404` denial is verified, but no production diagnostics API is claimed.
  - The retention policy is implemented and schema-enforced but no background deletion worker exists in MS0; expiry marks bounded retention intent, not executed purge evidence.
  - `architecture:check` is structural only. The image is local, unsigned, and not Release evidence. The Node base is digest-pinned, but the local manifest-list/config digests bind this candidate only and may differ on another target platform.
  - The earlier parallel related failure, ESM runtime failure, CJS compile failure, query-wrapper failure, stale pre-baseline diagnostics database, and incorrect-runner/pre-execution wrapper attempts remain explicit nonPASS history.
- Next command: precisely stage only the Task 7 candidate paths described above, run cached whitespace, exact path enumeration, `pnpm run secret:check -- --index`, and fresh full Secret checks, then create subject `feat(ms0): add correlation diagnostic timeline`. After post-commit focused verification and clean-worktree review, request independent Task 7 specification review against sole parent `1f0eb1cb5fc597026a1f791992f71f718524f701`; do not begin Task 8.

### 2026-07-22 10:48 CST - Task 7 post-commit ledger rebound

- Status: IN_PROGRESS. Task 7 remains a review candidate; Task 8 has not started, MS0 remains IN_PROGRESS, and MS1 remains out of scope.
- Pre-ledger-closeout subject: `cb0050378c7fa935f32e79aaff44cbc601c14ed1`, tree `6ed744951554ccdeb28f45d8886581cecf0af946`, subject `feat(ms0): add correlation diagnostic timeline`, sole parent `1f0eb1cb5fc597026a1f791992f71f718524f701`.
- Commit boundary: the subject contains exactly 30 Task 7 and required migration-tooling paths. Commit-time cached whitespace, immutable-index Secret, and full repository Secret checks exited 0. Post-commit `pnpm exec vitest run packages/contracts/src/contracts.test.ts scripts/postgres/migration-registry.test.ts tests/integration/diagnostic-timeline.integration.test.ts --disableConsoleIntercept` exited 0 with `3 files | 7/7`; topology, scope, sensitive-payload review, and worktree cleanliness passed.
- Scope: this rebound changes only `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md`; the final amended SHA cannot self-reference. Contracts, SQL, Hub/SDK/CLI, Dockerfile/entrypoint, tests, package/lock, generated outputs, Task 1-6, authority, freeze, Task 8, and MS1 remain unchanged from the pre-ledger-closeout subject.
- Next command: run `git diff --name-only cb0050378c7fa935f32e79aaff44cbc601c14ed1..HEAD` and require exactly this ledger, verify clean status and unchanged sole parent, then request independent Task 7 specification review. Do not repeat stage/commit implementation steps, begin Task 8/MS1, or push.

### 2026-07-22 - Task 7 first specification review FAILED; repair started

- Status: IN_PROGRESS. The first independent Task 7 specification review FAILED candidate `a40424cc92b643c99aafe8573a28f87b1db56f5c` on exactly three bounded blockers. This entry starts repair only; Task 8/9, MS1, push, ignored credential input, and environment/config dumps remain prohibited.
- Blocker 1, schema exactness: the current compatibility query/projector compares only the expected 26 diagnostic column names. Fresh reviewer REAL_TEST showed that dropping an index, dropping a constraint, or changing a diagnostic column type remains accepted. Repair must reject any drift from exact diagnostic column type/null/default metadata, the nine named/typed/normalized constraints, and the three named/unique/ordered/defined indexes while retaining exact migration-row/checksum controls and a parameterized read-only boundary.
- Blocker 2, timeline completeness: the current projector treats any record set without a failed item as `completed`. Repair must accept completed only as the exact four-stage succeeded chain ending at `probe_completed`; accept failed only as an exact succeeded prefix plus one first failed final record; and reject partial, gapped, out-of-order, success-prefix-only, post-failure, and multiple-failure histories with a stable safe degraded/error path that keeps SDK/CLI nonzero and redacted. Forced dependency failure localization semantics remain unchanged.
- Blocker 3, actual image payload: the preceding claim that extraction "enumerated exactly four regular owned payload files" was false as an exhaustive actual-image claim. The runtime stage inherits eleven repository manifests copied into the base stage; the prior verifier selected four expected paths instead of proving absence of other repository-owned payload. Repair must move repository manifests to build-only input and add a non-root-default actual-image integration verifier that creates/exports/cleans up a caller-selected image and exhaustively proves exactly four repository-owned regular payloads by approved path/content identity, with no repository manifests, lock/workspace files, `node_modules`, symlinks, or unexpected repository-owned files.
- Reviewed topology: candidate `a40424cc92b643c99aafe8573a28f87b1db56f5c`, sole parent `1f0eb1cb5fc597026a1f791992f71f718524f701`, subject `feat(ms0): add correlation diagnostic timeline`.
- Next command: add the unit catalog drift RED in `scripts/postgres/schema-compatibility.test.ts`, then run `pnpm exec vitest run scripts/postgres/schema-compatibility.test.ts`. No production compatibility change is authorized before this focused RED is observed.

### 2026-07-22 - Task 7 three-blocker specification repair locally GREEN

- Status: IN_PROGRESS. All three findings from the first Task 7 specification review have bounded RED -> GREEN evidence. This does not override the FAILED review state; the same reviewer must approve the amended candidate. Task 8/9, MS1, push, ignored credential input, environment/config dumps, and DDL repair/auto-migration remain out of scope.
- Schema exactness RED:
  - Unit `pnpm exec vitest run scripts/postgres/schema-compatibility.test.ts`: exit 1, `5 failed | 8 passed`. Exact type, nullability, default, missing named constraint, and missing named index controls all failed because the current boundary resolved `compatible=true`.
  - Real PostgreSQL 17.6 focused catalog drift: exit 1, `5 failed | 8 skipped`. Five distinct disposable databases proved missing index, missing constraint, changed type, changed nullability, and changed default were all incorrectly accepted; each database was force-dropped in `finally`.
- Schema exactness GREEN:
  - The compatibility boundary now compares all 26 diagnostic columns including `data_type`, `udt_name`, nullability, default, and character length; all nine exact named/typed/normalized `pg_get_constraintdef` rows; and all three exact named/unique/ordered/defined indexes. Catalog object names are query parameters, every compatibility query is `SHOW` or `SELECT`, and no repair DDL/DML or migrator call exists. Exact ordered migration-row/checksum rejection remains unchanged.
  - Unit schema compatibility passed `21/21`, including constraint type/definition and index uniqueness/order/definition drift plus an explicit seven-query read-only/parameterization assertion. Real PostgreSQL 17.6 focused drift passed `5 passed | 8 skipped`.
- Timeline RED and GREEN:
  - Contract RED exited 1 with `1 failed | 57 passed` because an incomplete/corrupt timeline was accepted. A separate real PostgreSQL/Hub RED exited 1 with `1 failed | 3 skipped`: deleting terminal `probe_completed` still yielded an SDK success and the CLI path did not degrade.
  - The contract now accepts completed only as the exact four succeeded stages ending in `probe_completed`, and failed only as an exact succeeded prefix followed by one failed final stage. It rejects single-stage, gap, out-of-order, successful-prefix-only, multiple-failure, post-failure, status/error, and summary corruption. The projector converts persisted corruption into stable `degraded`; the controller/SDK keep it redacted and the CLI exits nonzero with only `degraded` on stderr. The existing forced `dependency_check` failure localization remains unchanged.
  - Contracts passed `58/58`. The direct-database partial-row Hub/SDK/subprocess CLI control passed `1 passed | 3 skipped`; the full affected serial run includes diagnostics `4/4` and proves cleanup.
- Migration Job payload RED and GREEN:
  - Static policy RED exited 1 with `1 failed | 3 passed` on `FROM base AS runtime`. Actual-image RED exited 1 with `1/1` because exported `sartre-migration-job:ms0-task7` contained the expected four payloads plus eleven inherited repository manifests.
  - Repository manifests and install inputs now exist only in the build stage; runtime starts directly from the same digest-pinned Node image. The warning-free rebuild produced manifest-list/image ID `sha256:3a663cd2911404401ca922c83e78177bcc7cb6923e42e570a78c1f037d98dde9` and config `sha256:48b0927cece7f33c49e3f336996d5cf47dca28638cf3e92e843e71c6479ebc89`.
  - Static policy passed `4/4`. The new opt-in `tests/integration/migration-job-image.integration.test.ts`, with non-Secret `SARTRE_MIGRATION_JOB_IMAGE` and database inputs, passed `2/2`. It performs bounded create/export/inspect/extract/remove, identifies repository-owned candidates from all tracked repository paths plus the compiled runner/installed entrypoint, excludes vendor OS files, requires exactly four regular nonsymlink owned paths, exact nonroot/entrypoint, no `/app` `node_modules`, and byte equality against both SQL artifacts, the entrypoint, and a fresh warning-free local bundle. The four extracted files pass the artifact Secret boundary. A real disposable-database Job run returned `true,true`; the second returned `false,false`; exact migration rows/checksums and all cleanup passed.
- Combined and static evidence:
  - Serialized affected command across contracts, migration registry, schema compatibility, Hub config/service health, diagnostics, PostgreSQL, image policy, and actual image exited 0 with `9 files | 122/122`; the temporary PostgreSQL 17.10 container was removed.
  - Root `pnpm run test` after production repair exited 0 with root scripts `22 files | 462/462`, then all eight workspace suites passed, including contracts `59/59` and Electron `22/22`; the temporary PostgreSQL 17.10 container was removed. Later assertion-only expansion is covered by final focused schema `21/21` and contracts `58/58`.
  - Final `pnpm run format:check` passed 147 files; `pnpm run lint` passed 148 files without warnings; `pnpm run typecheck` and `pnpm run build` passed all eight workspaces; `pnpm run architecture:check` passed as STRUCTURAL_CHECK only; `git diff --check` passed.
  - Task 6 actual-asar guard passed `1/1`. Artifact Secret checks passed all eight build roots, and the actual-image verifier passed all four extracted owned payloads. The final full repository and immutable-index Secret checks remain mandatory after this ledger is precisely staged.
- Exact repair scope is fifteen paths: `apps/hub-api/src/diagnostics/diagnostics.controller.ts`, `apps/hub-api/src/diagnostics/diagnostics.service.ts`, `apps/hub-api/src/health/health.service.ts`, `apps/hub-api/src/infrastructure/database/schema-compatibility.ts`, `docker/migration-job/Dockerfile`, `packages/contracts/src/contracts.test.ts`, `packages/contracts/src/diagnostic-timeline.ts`, `packages/sdk/src/diagnostics-client.ts`, this ledger, `scripts/postgres/create-test-database.ts`, `scripts/postgres/migration-job-policy.test.ts`, `scripts/postgres/postgres.integration.test.ts`, `scripts/postgres/schema-compatibility.test.ts`, `tests/integration/diagnostic-timeline.integration.test.ts`, and new `tests/integration/migration-job-image.integration.test.ts`. No package/lock/root dependency, migration SQL/checksum, Task 1-6 source, authority/workflow/plan, Task 8/9, or MS1 path changed.
- Risks and boundaries: normalized catalog strings are deliberately bound to approved PostgreSQL 17.6 output and must change only with an approved migration/version update. Repository-owned image identity is defined by repository-known tracked paths and byte equality while vendor base-image files remain outside that set. The image remains a local unsigned test artifact, not Release evidence. `degraded` exposes no corrupt record detail and does not replace production identity/authorization. Retention execution remains outside MS0.
- Next command: precisely stage the exact fifteen repair paths, run cached whitespace, exact index enumeration, immutable-index Secret, and fresh full Secret checks, then amend Task 7 while preserving sole parent `1f0eb1cb5fc597026a1f791992f71f718524f701`. After post-amend focused/clean verification, request re-review from the same specification reviewer; do not begin Task 8/9 or MS1.

### 2026-07-22 11:39 CST - Task 7 specification behavior accepted, ledger-only rebound

- Status: IN_PROGRESS. The same specification reviewer accepted the repaired schema-catalog, strict timeline terminal, and actual-image exact-four-payload behavior. The only remaining specification issue is stale recovery text, repaired by this ledger-only checkpoint. Task 8 has not started, MS0 remains IN_PROGRESS, and MS1 remains out of scope.
- Pre-ledger-closeout reviewed subject: `cc2e17fc316fa22f91ddd33038bd346c5c00c5f6`, tree `53c0b584ada2d6afbe9d07ec1131f349ffe5ae86`, subject `feat(ms0): add correlation diagnostic timeline`, sole parent `1f0eb1cb5fc597026a1f791992f71f718524f701`.
- Fresh reviewer evidence: schema unit/contracts passed `79/79`; real PostgreSQL 17.6 rejected all five focused catalog drifts; real persisted-partial Hub/SDK/subprocess CLI diagnostics passed `4/4`; actual image exact-four payload plus real first/no-op Job passed `2/2`; static Job policy passed `4/4`. New image digest remains `sha256:3a663cd2911404401ca922c83e78177bcc7cb6923e42e570a78c1f037d98dde9`; related disposable databases and temporary containers were absent after cleanup.
- Scope: only `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md` changes from the reviewed subject. The final amended SHA cannot self-reference. No contracts, SQL, Hub/SDK/CLI, Dockerfile/entrypoint, test, package/lock, Task 1-6, authority, freeze, Task 8, or MS1 path changes.
- Next command: run `git diff --name-only cc2e17fc316fa22f91ddd33038bd346c5c00c5f6..HEAD` and require exactly this ledger; verify clean status and unchanged sole parent, then request ledger-only final specification re-review from the same reviewer. Do not rerun behavior matrices, request code-quality review before approval, begin Task 8/MS1, or push.

### 2026-07-22 - Task 7 specification approved; code-quality repair started

- Status: IN_PROGRESS. Specification is APPROVED at clean candidate `2972a89e6ac8e02171bd083f4a9c34368fe78b7f`, subject `feat(ms0): add correlation diagnostic timeline`, sole parent `1f0eb1cb5fc597026a1f791992f71f718524f701`. Code-quality review returned WITH FIXES with Critical `0` and Important `2`. Only these two findings are authorized; Task 8/9, MS1, push, ignored credential input, environment/config dumps, root/full/image/Job reruns, and unrelated repair remain prohibited.
- Important 1, chain invariants: every `DiagnosticTimeline` item must retain the first record's full DiagnosticContext chain identity except `stage`, `status`, `occurredAt`, `errorCode`, and `retryable`. The invariant covers `requestId`, `correlationId`, `causationId`, `workspaceId`, `userId`, `initiatedByUserId`, `actorType`, `actorId`, `component`, `operation`, `resourceType`, `resourceId`, `requirementId`, `sessionId`, `executionId`, `leaseId`, and `endpointId`; each item must still satisfy `userId === initiatedByUserId`. `occurredAt` must be monotonic, `recordedAt >= occurredAt`, and `recordedAt` must be monotonic. A mixed-chain RED must include user/request/causation/actor/resource/component/operation drift, reversed occurrence/recording order, and `recordedAt < occurredAt`; the production timeline can continue using its existing bounded time increments without changing the public shape.
- Important 2, row-decode corruption: repository row decoding (`toRecord`/ISO parsing) must catch validation/parse failure at the repository boundary and raise a dedicated corruption error without reclassifying SQL/connect failures. The service must normalize that dedicated error to `DiagnosticTimelineCorruptError`; the controller must return redacted `503 { code: "degraded" }`; SDK and CLI must remain redacted and nonzero. Required TDD covers unit/repository/service/controller plus real PostgreSQL 17.6, Hub, SDK, and subprocess CLI. The real control must create one bounded test-only schema drift or invalid row after migration, assert the safe degraded path, and always drop the disposable database without recording the row or raw error.
- Evidence: this checkpoint records review findings and the repair boundary only. No RED, GREEN, staged-index, Secret, amend, or post-amend evidence exists yet.
- Next command: add only the mixed-chain and timestamp-order tests in `packages/contracts/src/contracts.test.ts`, then run `pnpm exec vitest run packages/contracts/src/contracts.test.ts`. Preserve the focused failing output as REAL_TEST / FAIL before changing `packages/contracts/src/diagnostic-timeline.ts`.

### 2026-07-22 - Task 7 two-finding code-quality repair locally GREEN

- Status: IN_PROGRESS. Specification remains APPROVED. Both Important findings have bounded RED -> GREEN evidence; Critical remains `0`. This is not final quality approval. Task 8/9, MS1, push, ignored credential input, environment/config dumps, root/full/image/Job reruns, and unrelated repair remain prohibited.
- Chain-invariant RED: `pnpm exec vitest run packages/contracts/src/contracts.test.ts` exited 1 with `1 failed | 57 passed`. The failure enumerated fifteen accepted mixed-chain drifts (`requestId`, `causationId`, `workspaceId`, equal-but-different user/initiator chain, actor type/id, component, operation, resource type/id, requirement/session/execution/lease/endpoint) and three accepted clock corruptions (reversed `occurredAt`, reversed `recordedAt`, and `recordedAt < occurredAt`).
- Chain-invariant GREEN: one centralized identity-field list now compares every timeline item to the first record while keeping only stage/status/time/error/retry variability. Every record still requires `userId === initiatedByUserId`; `occurredAt` is strictly increasing; `recordedAt >= occurredAt` and is monotonic; existing per-record retention ordering remains enforced. Production probe records retain their existing two-millisecond occurrence and one-millisecond recording increments. Focused contracts passed `58/58` without changing the public contract shape.
- Row-decode RED: repository/service/controller unit exited 1 with `2 failed | 1 passed`, proving the dedicated repository error was absent and controller-visible service normalization incorrectly returned `dependency_unavailable`; the SQL failure control passed and proved the required non-reclassification boundary. Real PostgreSQL 17.6/Hub/SDK/subprocess focused execution exited 1 with `1 failed | 4 skipped`: one migrated disposable database received a bounded test-only invalid `actor_id`, and SDK observed `dependency_unavailable` instead of the required `degraded`; cleanup completed.
- Row-decode GREEN: repository wraps only `toRecord`/ISO/schema decode failures in `DiagnosticRecordCorruptError` and leaves query/connect failures untouched. Service maps only that error to `DiagnosticTimelineCorruptError`; the existing controller returns redacted HTTP 503 `degraded`, SDK preserves `degraded`, and CLI exits 1 with only `degraded`. Unit coverage passes `4/4` across Zod-invalid row, invalid ISO conversion, SQL non-reclassification, and service/controller normalization. The real malformed-row test passes `1 passed | 4 skipped`; the complete diagnostics suite passes `5/5`, including prior partial-timeline, healthy/failed, denial, and CLI controls. No row, raw parse error, database input, token, or correlation identifier is printed or recorded.
- Affected evidence: `pnpm exec vitest run --maxWorkers=1 packages/contracts/src/contracts.test.ts apps/hub-api/src/diagnostics/diagnostics.test.ts apps/hub-api/src/health/config.test.ts tests/integration/service-health.integration.test.ts tests/integration/diagnostic-timeline.integration.test.ts --disableConsoleIntercept` exited 0 with `5 files | 92/92`. `pnpm run typecheck` passed all eight workspaces; `pnpm run format:check` passed 148 files; `pnpm run lint` passed 149 files; `git diff --check` passed. These are REAL_TEST / PASS except format/lint/typecheck, which are PR static gates. Root/full/image/Job were not run under the approved affected boundary.
- Exact repair scope: `packages/contracts/src/contracts.test.ts`, `packages/contracts/src/diagnostic-timeline.ts`, `apps/hub-api/src/diagnostics/diagnostics.repository.ts`, `apps/hub-api/src/diagnostics/diagnostics.service.ts`, new `apps/hub-api/src/diagnostics/diagnostics.test.ts`, `tests/integration/diagnostic-timeline.integration.test.ts`, and this ledger. Controller source, SDK/CLI, SQL/migrations/schema compatibility, package/lock, Docker, Task 1-6, authority/workflow/plan, Task 8/9, and MS1 are unchanged.
- First precise index evidence: `git add -- <exact seven paths>` staged exactly the scope above; `git diff --cached --check` exited 0; cached enumeration returned exactly seven paths; `pnpm run secret:check -- --index` and fresh `pnpm run secret:check` each exited 0 with `Secret boundary check passed`. This paragraph changes the staged ledger, so the ledger and all four index/Secret checks must repeat before amend.
- Residual boundary: strict timestamp ordering is intentionally bound to the MS0 four-stage probe and its production `+2ms` clock construction; broader distributed clock semantics require a later approved contract rather than weakening this invariant. Row corruption remains a fail-closed degraded read and is not auto-repaired or exposed.
- Next: restage this ledger, repeat cached whitespace and exact index enumeration plus immutable-index/full Secret, amend `feat(ms0): add correlation diagnostic timeline` while preserving sole parent `1f0eb1cb5fc597026a1f791992f71f718524f701`, then run fresh post-amend focused/clean verification and request the same quality reviewer. Task 7 remains IN_PROGRESS.

### 2026-07-22 - Task 7 code-quality repair post-amend verified; ledger-only rebound

- Status: IN_PROGRESS. Specification remains APPROVED. The two Important quality findings are repaired with Critical `0`; final quality decision remains WITH FIXES until the same reviewer re-reviews the immutable candidate. Task 8/9, MS1, push, root/full/image/Job, ignored credential input, and environment/config dumps remain prohibited.
- Pre-ledger-rebound subject: `f474bde76296940f6d52f4d9565de5fc59f9ca1c`, tree `48d6216e264a1ca7fc383ac783ed41c0168019c9`, subject `feat(ms0): add correlation diagnostic timeline`, sole parent `1f0eb1cb5fc597026a1f791992f71f718524f701`.
- Final seven-path staging before that amend passed cached whitespace and exact enumeration; immutable-index `pnpm run secret:check -- --index` and fresh full `pnpm run secret:check` each exited 0. The amend preserved subject and sole parent, and the worktree became clean.
- Fresh post-amend affected command `pnpm exec vitest run --maxWorkers=1 packages/contracts/src/contracts.test.ts apps/hub-api/src/diagnostics/diagnostics.test.ts apps/hub-api/src/health/config.test.ts tests/integration/service-health.integration.test.ts tests/integration/diagnostic-timeline.integration.test.ts --disableConsoleIntercept` exited 0 with `5 files | 92/92`. This includes real PostgreSQL 17.6 diagnostics `5/5`, repository/service/controller unit `4/4`, and contracts `58/58`.
- Fresh post-amend static/Secret evidence: `pnpm run typecheck` passed all eight workspaces; `pnpm run format:check` passed 148 files; `pnpm run lint` passed 149 files; fresh full `pnpm run secret:check` passed. Root/full/image/Job were not run under the approved affected boundary.
- Rebound scope: only this `PLAN_LEDGER.md` changes from the verified subject; the final amended SHA cannot self-reference. Contracts, repository/service/controller, SDK/CLI, SQL/schema, package/lock, Docker, tests, Task 1-6, authority/workflow/plan, Task 8/9, and MS1 are unchanged from the verified subject.
- Next: stage only this ledger; repeat cached whitespace, exact one-path enumeration, immutable-index Secret, and full Secret; amend while preserving the sole parent. Then run fresh final focused contracts/repository/service/controller/real diagnostics plus clean topology checks and request re-review from the same quality reviewer. Task 7 remains IN_PROGRESS.

### 2026-07-22 12:18 CST - Task 7 final quality approval and closeout

- Status: DONE. This closes Task 7 only. Task 8 has not started, MS0 remains IN_PROGRESS, and MS1 remains out of scope.
- Reviewed subject: `2cb95bf3a4977467c1c9525347d043da7ae773b8`, tree `30734c26d12d2df329b3290524f64f2f5d6a8ffe`, subject `feat(ms0): add correlation diagnostic timeline`, sole parent `1f0eb1cb5fc597026a1f791992f71f718524f701`.
- Final specification state: APPROVED. The independent reviewer accepted exact PostgreSQL 17.6 catalog compatibility, strict terminal diagnostic timelines with degraded persisted-corruption handling, self-test-only production denial, SDK/CLI redaction and exits, ordered `000001+000002` migration behavior, and the actual Migration Job exact-four-payload/dual-run evidence.
- Final code-quality review: Critical `0`, Important `0`, Minor `0`, Ready `YES`. The reviewer freshly passed focused contracts plus diagnostics unit/real integration `3 files | 67/67`, confirmed the exact seven-path quality repair delta and clean topology, and accepted full immutable DiagnosticContext chain/time invariants plus decode-only corruption normalization without reclassifying SQL/connect failures.
- Evidence binding: final Migration Job manifest-list/image digest remains `sha256:3a663cd2911404401ca922c83e78177bcc7cb6923e42e570a78c1f037d98dde9`; migration checksums remain `ff57c5fa909fc4506e4a503c6ea2d39c4c3bb67d5bda1d9dfa1a7cf6f008b839` and `fe75b3e93def7551a4e0b1d03419b72c0d7f39b251869d6fea32ecfbdf74d521`. Full matrices, owned-payload Secret scans, Task 6 actual-asar guard, cleanup, and nonPASS history are recorded in the preceding checkpoints. Architecture remains STRUCTURAL_CHECK only.
- Accepted residual risks: retention expiry is schema-enforced metadata; MS0 has no purge worker and makes no executed-deletion claim. Diagnostics routes/token are self-test-only, not MS1 identity/authorization. Catalog definitions intentionally bind PostgreSQL 17.6. The local image digest is platform-specific test evidence, not Release evidence.
- Closeout scope: only this `PLAN_LEDGER.md` changes after the reviewed subject. No Task 1-7 source/test/config/package/lock/SQL/Docker/image, authority, freeze, Task 8/9, or MS1 path changes.
- Next command: `pnpm exec vitest run scripts/legacy/create-freeze-manifest.test.ts`. Do not regenerate the freeze manifest. Accept only the fresh regression suite proving tracked/modified/untracked/deleted/symlink/ignored facts and path/state/kind/size/hash mutation rejection; zero discovery, SKIPPED, or count-only checks are not PASS.
- Resume: use the active top procedure. Preserve the clean seven-commit chain, do not rerun Task 7's root/image/Job matrix without Task 7 drift, and do not begin MS1, push, read ignored credential input, inspect container environments, or regenerate the legacy freeze manifest.

### 2026-07-22 12:26 CST - Task 8 immutable legacy freeze and porting audit candidate

- Status: `IN_PROGRESS`. The immutable-freeze and PortingLedger audit is locally verified and ready
  for a precise two-ledger subject commit followed by independent specification review. Task 8 is
  not `DONE`; Task 9 has not started, MS0 remains IN_PROGRESS, and MS1/push remain out of scope.
- Scope: only `plan/PORTING_LEDGER.md` and this ledger change. Legacy generator/verifier source,
  regression tests, `reference/legacy-freeze/manifest.json`, its README, imported documents,
  `reference/spec-import-manifest.json`, Task 1-7 source/test/config/package/lock/artifacts, Task 9,
  and MS1 are unchanged.
- Freeze regression: `pnpm exec vitest run scripts/legacy/create-freeze-manifest.test.ts` exited 0
  with `1 file | 9/9`. The fixture explicitly discovers tracked, modified, untracked, deleted,
  symlink, and ignored facts; independent-verifier controls reject path/fact-set, `gitState`, `kind`,
  `size`, and `sha256` mutation, plus duplicate/order/schema corruption. The equal-count different-set
  control rejects both the missing real path and invented path, so this is not count-only evidence.
- Recorded-fact re-verification:
  `pnpm exec tsx scripts/legacy/verify-freeze-manifest.ts --source "/Users/xy/personal/Sartre(agent-workspace-design)" --manifest reference/legacy-freeze/manifest.json`
  exited 0 with `Legacy freeze manifest verified across 835 path facts.` No
  `legacy_source_drift` was detected. Recorded metadata remains source HEAD
  `f8f859a85cb7fed2200bb7aee7a6407131fbb30e`, dirty-fact hash
  `dd88d6466ef0645143360a383b91fdd2bf5cfaa38e718cd8dfaaf1c1aed23724`, and generatedAt
  `2026-07-17T10:29:52.250Z`.
- Manifest immutability: `shasum -a 256 reference/legacy-freeze/manifest.json` returned
  `36c68900761bb48a2638ebfbc346980a38f1285f7f5641afa69254cee6236c6f` both before and after the
  independent verifier. `git diff --exit-code -- reference/legacy-freeze/manifest.json` exited 0
  before and after verification. The generator was not run; the manifest was not rewritten.
- Imported-document audit: `pnpm run spec:verify` exited 0 with `Verified 27 approved target
  document hashes.` Explicit provenance command
  `pnpm exec tsx scripts/constitution/verify-spec-import.ts --verify-source` exited 0 with
  `Verified 27 approved source and target document hashes.` These are STRUCTURAL_CHECK / PASS, not
  application behavior evidence.
- Exact mapping audit: the corrected schema-aware read-only JSON audit exited 0 with exactly 27
  entries, 27 unique source paths, 27 unique target paths, 27 unique exact source-target pairs, zero
  wildcard paths, and zero target hash mismatches. A first ad hoc helper attempt referred to absent
  `sourcePath`/`targetPath` keys and exited 1 with `ERR_INVALID_ARG_TYPE`; it was not a product gate,
  changed no file, and was replaced by the schema-aware audit over `source`/`target`/`sha256`.
- Porting boundary audit: the Markdown-table read-only audit exited 0 with zero code candidate rows
  and confirmed the separate spec-import-manifest governance, mandatory `PENDING_REVIEW` start,
  file-specific reason, completed security review, named behavior tests, accountable owner, and
  directory-wildcard/blanket-approval prohibition. No legacy-derived code mapping was invented.
- Content boundary: no legacy source content was copied, printed, staged, or persisted. The external
  verifier operated only through the approved path/hash-fact mechanism; this checkpoint records only
  source path/hash/state metadata.
- Static and repository boundary: `git diff --check` exited 0;
  `pnpm run format:check` exited 0 with 148 files checked and no fixes;
  `pnpm run lint` exited 0 with 149 files checked and no fixes; fresh
  `pnpm run secret:check` exited 0 with `Secret boundary check passed.` These commands ran against
  the complete two-ledger worktree delta before precise staging.
- Risks: the legacy worktree may drift after this observation; a future nonzero verifier must record
  old/current HEAD and dirty-hash metadata and stop without rewriting the immutable manifest. The
  explicit source-provenance check depends on the recorded source checkout; default target-only
  `spec:verify` remains clean-clone independent. Zero code rows means no code port is approved, not
  that future candidates may bypass review.
- Next: precisely stage only the two ledgers, run cached whitespace, exact index enumeration,
  immutable-index and full Secret checks, then commit
  `docs(ms0): audit legacy porting boundary`. After fresh post-commit regression/verifier/manifest
  immutability/clean-topology/self-review evidence, request independent Task 8 specification review.
  Do not start Task 9 or MS1.

### 2026-07-22 12:38 CST - Task 8 behavior accepted, ledger-only specification rebound

- Status: IN_PROGRESS. The independent specification reviewer accepted the freeze regression, immutable recorded-fact verification, exact document-import mapping, and deny-by-default Porting behavior. The sole remaining Important was the stale latest `Next`, repaired by this ledger-only checkpoint. Task 9 has not started, MS0 remains IN_PROGRESS, and MS1 remains out of scope.
- Pre-ledger-closeout reviewed subject: `cd3df76c778b8e9136a754caa3cba06d71b972a4`, tree `180a56ce279d6be1fffaf11cbc85f548999c158d`, subject `docs(ms0): audit legacy porting boundary`, sole parent `f3f558b43021ebe95d2ac770ad9c6134e3a78660`.
- Fresh reviewer evidence: freeze `9/9`; independent verifier `835` facts with no drift; manifest base/candidate blob and SHA-256 `36c68900761bb48a2638ebfbc346980a38f1285f7f5641afa69254cee6236c6f` unchanged with zero diff and no generator invocation; target-only and explicit-source import verification `27/27`; exact unique source/target/pair mapping with zero wildcard/hash mismatch; zero code rows with all deny-by-default prerequisites present. Zero rows means no code approval, not a completed similarity audit.
- Scope: only `reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md` changes from the reviewed subject. `plan/PORTING_LEDGER.md`, freeze/import manifests, verifier/tests, Task 1-7 source/config/package, authority, Task 9, and MS1 remain unchanged. The final amended SHA cannot self-reference.
- Next command: run `git diff --name-only cd3df76c778b8e9136a754caa3cba06d71b972a4..HEAD` and require exactly this ledger; verify clean status and unchanged sole parent, then request ledger-only final specification re-review from the same reviewer. Do not rerun behavior audits, begin code-quality review before approval, start Task 9/MS1, or push.

### 2026-07-22 12:51 CST - Task 8 DONE after ledger-only final review

- Status: DONE. The final independent ledger-only review reported Critical `0`, Important `0`, Minor `0`, specification APPROVED, quality APPROVED, and Ready YES. Task 9 is ready but has not started; MS0 remains IN_PROGRESS and MS1 remains prohibited.
- Reviewed candidate: `352c15f67d0675bcb0ae2d563cf0129074fd4df2`, tree `cd93fcd039beaeea3bb0f14b749e1f91f7ca9edf`, subject `docs(ms0): audit legacy porting boundary`, sole parent `f3f558b43021ebe95d2ac770ad9c6134e3a78660`.
- Fresh review evidence: the delta from pre-rebound candidate `cd3df76c778b8e9136a754caa3cba06d71b972a4` is exactly this ledger; `git diff --check` passed; the worktree was clean; top state, Resume procedure, and the latest checkpoint consistently supersede the historical stale stage/commit instruction. The reviewer did not rerun unchanged behavior audits or read ignored credential input.
- Scope: this DONE closeout changes only the ledger and does not alter `plan/PORTING_LEDGER.md`, freeze/import manifests, verifier/tests, source/config/package files, Task 9, or MS1. The final amended commit SHA cannot self-reference; recover it from Git and require the recorded sole parent and exact two-ledger Task 8 path set.
- Next command: after writing Task 9 Step 1 RED clean-clone/evidence-chain tests, run `pnpm exec vitest run scripts/harness/verify-clean-clone.test.ts` and require the planned missing-verifier failure. Do not skip RED, begin MS1, push, or regenerate the freeze manifest.

### 2026-07-22 17:17 CST - Task 9 subject approved locally; required CI BLOCKED

- Status: `BLOCKED` on the required same-subject GitHub Actions run only. Task 9 is not
  `DONE`, MS0 remains IN_PROGRESS, no evidence-only child or verified tag exists, and MS1 remains
  prohibited.
- Immutable subject: `d6ae2e02df81d2a40096ab51c79196249db9ce80`, tree
  `2b4612b9cc64b02cb51bb6fc23089c0737bb7dfa`, sole parent
  `16bb67b054cd71a7e05e70e203621d1a560465ab`, subject message
  `chore(ms0): freeze repository constitution subject`. The base-to-subject delta is exactly the
  approved eleven Task 9 paths.
- Final checksum repair TDD: the new active-workflow control in
  `scripts/harness/verify-clean-clone.test.ts` first failed with `1 failed | 28 passed` because
  the workflow wrote the repository-relative DMG path. After the one-line workflow repair,
  `pnpm exec vitest run scripts/harness/verify-clean-clone.test.ts` exited 0 with
  `1 file | 29/29`. The workflow now runs `shasum` from
  `apps/electron-app/release`, so its uploaded checksum is exactly
  `<sha256>  Sartre-0.1.0-arm64.dmg`, matching both the fake GitHub fixture and final verifier.
- Fresh affected/static boundary after the repair: `pnpm run format:check` exited 0 with 155
  files and no fixes; `pnpm run lint` exited 0 with 156 files and no fixes;
  `pnpm run typecheck` exited 0 across the eight declared workspaces;
  `git diff --check` and `git diff --cached --check` exited 0; the staged repair was exactly
  `.github/workflows/ms0-required.yml` and
  `scripts/harness/verify-clean-clone.test.ts`; immutable-index and full
  `pnpm run secret:check` both exited 0. The repair was amended into the immutable subject, after
  which the worktree was clean.
- Fresh subject reproducibility:
  `SARTRE_DATABASE_URL=postgresql://postgres@127.0.0.1:54326/postgres SARTRE_POSTGRES_NEGATIVE_URL=postgresql://postgres@127.0.0.1:55432/postgres pnpm exec tsx scripts/harness/verify-clean-clone.ts --subject d6ae2e02df81d2a40096ab51c79196249db9ce80`
  exited 0 with
  `Clean-clone verification passed for d6ae2e02df81d2a40096ab51c79196249db9ce80.`
  This is the fresh clean-clone result for the current subject; no historical PASS was reused.
- Independent reviews: final specification review reported Critical 0, Important 0, Minor 0,
  Ready YES and accepted the exact producer/fixture/verifier checksum contract. Final code-quality
  review reported Critical 0, Important 0, Minor 0, Ready YES; its fresh minimal checks included
  `verify-ci-run.test.ts` 20/20, the checksum-contract control 1/1, the valid evidence-child
  control 1/1, and `git diff --check` PASS. Neither review authorizes MS0 closeout without CI.
- Required external gate:
  `pnpm run ci:verify -- --subject d6ae2e02df81d2a40096ab51c79196249db9ce80`
  exited 1 with stable error `ci_unavailable`. `git remote -v` returned no entries. A local
  clean-clone PASS is not a substitute for this required real CI run and artifact download.
- Read-only remote routing: the authority-referenced legacy checkout has GitHub remote
  `https://github.com/daodaolee/sartre.git`; the connected GitHub account is `daodaolee`, and
  an exact owner/name repository search returned the single non-archived public repository
  `daodaolee/sartre` with default branch `main`. This is a strong remote candidate only; it has
  not been configured, written, or treated as push authorization.
- Evidence/topology guard: do not create a PASS evidence child, change the Master Plan MS0 status,
  run the final verifier as if CI passed, or create `ms0-verified` while this checkpoint is
  blocked. This ledger append remains uncommitted so the branch still points at the exact subject
  that CI must run; after CI PASS it belongs in the sole evidence child with the closeout records.
- Required human input: confirm `https://github.com/daodaolee/sartre.git` (or provide a different
  Git remote URL) and explicitly authorize configuring that remote and pushing branch
  `codex/ms0-repository-constitution`. No push authority is inferred from local commit/tag
  authority or read-only repository discovery.
- Next command after that input: first re-check
  `git show -s --format='%H %P %T %s' HEAD`, require subject
  `d6ae2e02df81d2a40096ab51c79196249db9ce80`, and require this ledger as the only worktree delta;
  then configure the approved remote and push the subject branch. Wait for the same-SHA
  `.github/workflows/ms0-required.yml` run and execute
  `pnpm run ci:verify -- --subject d6ae2e02df81d2a40096ab51c79196249db9ce80`.
  Only a zero result permits Task 9 Step 7 evidence generation. Do not begin MS1, regenerate the
  legacy freeze manifest, or read ignored credential input.

### 2026-07-22 18:07 CST - First real CI failure repaired in a new subject

- Status: IN_PROGRESS. GitHub remote authorization is now available, but the first required run
  failed and is not PASS evidence. Task 9/MS0 remain open; MS1 remains prohibited.
- Remote boundary: repo-local identity is `daodaolee <im@daodaolee.cn>`; the only configured
  remote is `origin=https://github.com/daodaolee/sartre.git`. No GitLab remote was configured or
  pushed. The first subject branch push was verified at exact SHA
  `d6ae2e02df81d2a40096ab51c79196249db9ce80`.
- Failed real CI: GitHub Actions run `29910022993`,
  `https://github.com/daodaolee/sartre/actions/runs/29910022993`, completed with
  `conclusion=failure` for head SHA `d6ae2e02df81d2a40096ab51c79196249db9ce80`.
  Jobs `constitution` and `electron-macos-arm64` passed. Job `postgresql-17-6` passed setup,
  exact-version/migration checks, and four PostgreSQL tests, then failed `health:smoke` because
  `@sartre/contracts` exports `dist/index.js` but that job had not run the workspace build.
  Its Playwright and diagnostic-timeline steps were consequently SKIPPED. This run is retained as
  nonPASS evidence and cannot close any gate.
- Repair TDD: an active-workflow control requiring `pnpm run build` before the PostgreSQL
  `health:smoke` gate first exited 1 with `1 failed | 29 passed` and
  `expected -1 to be greater than -1`. Adding the single build step to that job made
  `pnpm exec vitest run scripts/harness/verify-clean-clone.test.ts` exit 0 with
  `1 file | 30/30`.
- Fresh affected verification: `pnpm run build` exited 0 across the eight declared workspaces;
  `pnpm run health:smoke` exited 0 with `1 file | 11/11`; format, lint, typecheck,
  `git diff --check`, exact two-path cached whitespace/index enumeration, immutable-index Secret,
  and full Secret checks all exited 0.
- Replacement immutable subject:
  `93fac5f3f3981d0eac6e184af3871fb4ba5747b0`, tree
  `d1d9a0c639de653aafa3c1cfbb706180e1481521`, sole parent
  `16bb67b054cd71a7e05e70e203621d1a560465ab`, author and committer
  `daodaolee <im@daodaolee.cn>`. The only worktree delta after amend is this ledger.
- Evidence invalidation: all PASS claims tied to `d6ae2e02...` are superseded for final closeout.
  The new subject requires fresh clean-clone and same-SHA real CI. Do not reuse run
  `29910022993` or its artifact as PASS evidence.
- Next command:
  `SARTRE_DATABASE_URL=postgresql://postgres@127.0.0.1:54326/postgres SARTRE_POSTGRES_NEGATIVE_URL=postgresql://postgres@127.0.0.1:55432/postgres pnpm exec tsx scripts/harness/verify-clean-clone.ts --subject 93fac5f3f3981d0eac6e184af3871fb4ba5747b0`.
  On zero, require clean ledger-only status, then update remote branch with an exact
  `--force-with-lease` against old SHA `d6ae2e02df81d2a40096ab51c79196249db9ce80`, wait for the
  new same-SHA workflow, and run `pnpm run ci:verify -- --subject
  93fac5f3f3981d0eac6e184af3871fb4ba5747b0`. Do not update remote `main`, create evidence/tag,
  or begin MS1 before required CI PASS.

### 2026-07-22 18:31 CST - Second real CI failure repaired in a new subject

- Status: IN_PROGRESS. Run 2 is required nonPASS evidence; Task 9/MS0 remain open and MS1 remains
  prohibited. Remote `main` remains unchanged at observed lease
  `e0f21543d6c0c05d7d7374318f0410bd4d03a2af`.
- Pre-run subject reproducibility: after temporarily isolating this ledger, the first clean-clone
  attempt returned `clean_clone_gate_failed:test:pnpm`. Direct diagnosis without database inputs
  was non-equivalent and was stopped; its database-required failures are not subject findings.
  The two timeout-sensitive focused controls then passed `21/21` and `1/1`. A second unchanged,
  clean, database-bound execution of the exact clean-clone command exited 0 with
  `Clean-clone verification passed for 93fac5f3f3981d0eac6e184af3871fb4ba5747b0.`
  No timeout or assertion was weakened.
- Second real CI: GitHub Actions run `29911740717`,
  `https://github.com/daodaolee/sartre/actions/runs/29911740717`, ran head SHA
  `93fac5f3f3981d0eac6e184af3871fb4ba5747b0`. Jobs `constitution` and
  `electron-macos-arm64` passed. The `postgresql-17-6` job proved the previous repair by passing
  workspace build, PostgreSQL/migrations, and `health:smoke` `11/11`, then failed the Electron
  Playwright test with `Missing X server or $DISPLAY`; the diagnostic-timeline step was SKIPPED.
  GitHub Actions UI was also inspected through Computer Use and showed run 2 failed on the exact
  `93fac5f` commit. This run and artifact cannot be PASS closeout evidence.
- Root cause: `xvfb-run` correctly created an X11 display, but
  `tests/e2e/ms0-health.spec.ts` intentionally constructed a minimal `electron.launch` env and
  dropped `DISPLAY` and `XAUTHORITY`.
- Repair TDD: the new X11 allowlist test first failed with
  `ReferenceError: electronX11Environment is not defined`. The implementation now forwards only a
  validated `DISPLAY=:<number>[.<screen>]` and optional absolute `XAUTHORITY`; an injected
  `GH_TOKEN` sentinel is rejected by exact-object assertion, so the fix does not inherit the
  caller environment.
- Fresh repair evidence: the focused X11 test passed `1/1`; complete local development Electron
  E2E passed `3/3`, including real child timeout cleanup and four-process Worker loss/recovery.
  Format, lint, typecheck, cached whitespace, exact one-path index enumeration, immutable-index
  Secret, and full Secret checks all exited 0.
- Replacement immutable subject:
  `22fb622949d2374ab0aa18af57b68ddab059e698`, tree
  `798de82f55bff2271da27101771959d340c1a254`, sole parent
  `16bb67b054cd71a7e05e70e203621d1a560465ab`, author/committer
  `daodaolee <im@daodaolee.cn>`. The only worktree delta after amend is this ledger.
- Next command: temporarily isolate this ledger, require a clean checkout, then run
  `SARTRE_DATABASE_URL=postgresql://postgres@127.0.0.1:54326/postgres SARTRE_POSTGRES_NEGATIVE_URL=postgresql://postgres@127.0.0.1:55432/postgres pnpm exec tsx scripts/harness/verify-clean-clone.ts --subject 22fb622949d2374ab0aa18af57b68ddab059e698`.
  On zero, restore this ledger and update the remote subject branch with exact
  `--force-with-lease` against `93fac5f3f3981d0eac6e184af3871fb4ba5747b0`; wait for the new
  same-SHA workflow and run `pnpm run ci:verify -- --subject
  22fb622949d2374ab0aa18af57b68ddab059e698`. Do not update `main`, create evidence/tag, or enter
  MS1 before required CI PASS.

### 2026-07-22 18:54 CST - Required CI passed; real artifact download timeout repaired locally

- Status: IN_PROGRESS. GitHub Actions run `29912555370` completed successfully for subject
  `22fb622949d2374ab0aa18af57b68ddab059e698`; all required jobs `constitution`,
  `postgresql-17-6`, and `electron-macos-arm64` passed. Fresh
  `pnpm run ci:verify -- --subject 22fb622949d2374ab0aa18af57b68ddab059e698` exited 0 and bound
  artifact digest `sha256:d577268e6832ef9c1eba8e2c24bf26f1d906ada43e15641015abecadc5c04ee3`.
  This run becomes superseded as final closeout evidence when the timeout repair changes the
  subject; it remains retained as successful historical attempt evidence.
- Real artifact observation: `gh run download 29912555370 -n
  ms0-required-22fb622949d2374ab0aa18af57b68ddab059e698` downloaded the 119,861,636-byte DMG plus
  checksum. Directory creation at `18:41:26 CST` and file completion at `18:51:19 CST` prove an
  approximate 9m53s transfer. The prior final-verifier limit was 120,000ms, so it could not accept
  this successful real transfer. DMG SHA-256
  `6d4187ac5ee766da722ec2a894e89c8a17a2fe17a0c0489547566a3ed3f14316` exactly matched
  `artifact-sha256.txt`; the temporary download directory was deleted after observation.
- Repair TDD: fresh focused command
  `pnpm exec vitest run scripts/harness/verify-ms0.test.ts -t "keeps the required CI artifact
  download bounded with a 15-minute budget"` first exited 1 with the expected missing-constant
  assertion. Adding only `CI_ARTIFACT_DOWNLOAD_TIMEOUT_MS = 900_000` and using it in
  `downloadCiArtifactEvidence` made the same command exit 0 with `1/1`. Artifact content,
  checksum, subject, run/job, digest, evidence-path, and Secret validations are unchanged.
- Fresh affected verification: the complete `scripts/harness/verify-ms0.test.ts` suite exited 0
  with `47/47`; `pnpm run format:check` exited 0 for 155 files; `pnpm run lint` exited 0 for 156
  files; `pnpm run typecheck` exited 0 across all eight target workspaces; `pnpm run secret:check`
  exited 0; and `git diff --check` exited 0.
- Subject invalidation: the repair changes `scripts/harness/verify-ms0.ts` and its regression test,
  so subject `22fb6229...`, its clean-clone result, and run `29912555370` cannot be reused for final
  closeout. A replacement immutable subject, fresh clean-clone, and fresh same-SHA CI are required.
- Next command: precisely stage only `scripts/harness/verify-ms0.ts` and
  `scripts/harness/verify-ms0.test.ts`; run cached whitespace, exact two-path index enumeration,
  `pnpm run secret:check -- --index`, and fresh `pnpm run secret:check`; then amend
  `chore(ms0): freeze repository constitution subject` while preserving sole parent
  `16bb67b054cd71a7e05e70e203621d1a560465ab` and repository-local identity
  `daodaolee <im@daodaolee.cn>`. Do not stage this ledger into the subject, update remote `main`,
  create evidence/tag, or enter MS1.

### 2026-07-22 18:56 CST - Artifact-timeout repair amended into replacement subject

- Status: IN_PROGRESS. The exact two-path repair was staged without this ledger. Cached whitespace,
  exact path enumeration, immutable-index Secret, and fresh full Secret checks all exited 0.
- Replacement immutable subject: `eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a`, tree
  `c424d56fd77fe5d0069f191102176abd29ed1546`, sole parent
  `16bb67b054cd71a7e05e70e203621d1a560465ab`, subject
  `chore(ms0): freeze repository constitution subject`, author/committer
  `daodaolee <im@daodaolee.cn>`. This ledger is the only worktree delta and the index is empty.
- Base-to-subject path set is exactly the expected thirteen Task 9 paths: the prior eleven-path
  subject plus `scripts/harness/verify-ms0.ts` and `scripts/harness/verify-ms0.test.ts`. Task 1-8,
  authority specs, freeze/Porting artifacts, application business scope, and MS1 are unchanged.
- Evidence invalidation: run `29912555370`, its artifact, and the prior clean-clone result remain
  historical PASS for `22fb6229...`; none may be presented as final same-subject evidence for
  `eab7d4ae...`.
- Next command: temporarily stash only this ledger, require `git status --porcelain` to be empty,
  then run
  `SARTRE_DATABASE_URL=postgresql://postgres@127.0.0.1:54326/postgres SARTRE_POSTGRES_NEGATIVE_URL=postgresql://postgres@127.0.0.1:55432/postgres pnpm exec tsx scripts/harness/verify-clean-clone.ts --subject eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a`.
  Restore the ledger immediately after the command. Do not push the replacement subject, update
  remote `main`, generate evidence/tag, or enter MS1 unless this fresh clean-clone exits 0.

### 2026-07-22 19:01 CST - Replacement subject clean-clone PASS

- Status: IN_PROGRESS. Only this ledger was stashed; `git status --porcelain` was empty before the
  verifier started. The exact database-bound command from the preceding checkpoint exited 0 with
  `Clean-clone verification passed for eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a.` No historical
  clean-clone output was reused.
- Recovery integrity: the ledger stash was immediately popped without conflict; the worktree again
  contains only this ledger delta, the index is empty, and `git stash list` is empty.
- Live remote lease observation: `origin/codex/ms0-repository-constitution` is exactly
  `22fb622949d2374ab0aa18af57b68ddab059e698`; remote `main` remains exactly
  `e0f21543d6c0c05d7d7374318f0410bd4d03a2af`. No GitLab remote exists and no GitLab push is
  permitted.
- Next command: update only `refs/heads/codex/ms0-repository-constitution` with
  `git push --force-with-lease=refs/heads/codex/ms0-repository-constitution:22fb622949d2374ab0aa18af57b68ddab059e698 origin eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a:refs/heads/codex/ms0-repository-constitution`.
  Require the remote ref to equal `eab7d4ae...`, wait for the same-SHA `ms0-required` workflow, and
  run `pnpm run ci:verify -- --subject eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a`. Do not update
  remote `main`, generate evidence/tag, or enter MS1 before this fresh CI exits 0.

### 2026-07-22 19:26 CST - Task 9 close signals assembled for evidence-only child

- Status: DONE subject to the mandatory final verifier over the committed evidence child. A
  nonzero verifier result reopens Task 9 and prohibits the tag, remote `main` update, and MS1.
- Remote subject update: the exact force-with-lease against `22fb6229...` succeeded; live
  `origin/codex/ms0-repository-constitution` became
  `eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a`. Remote `main` remained
  `e0f21543d6c0c05d7d7374318f0410bd4d03a2af`; no GitLab remote or push exists.
- Required same-subject CI: GitHub Actions run `29914173418` completed `success` for exact head SHA
  `eab7d4ae...`. Jobs `constitution`, `postgresql-17-6`, and `electron-macos-arm64` all completed
  successfully. Fresh `pnpm run ci:verify -- --subject eab7d4ae...` exited 0 and returned artifact
  digest `sha256:9ad1fee7c43514e41ebc7a54e416c2454c303287d77e2453a61f20483b9a2e5b`.
  The Actions Node-20 deprecation annotation is a future action-version risk, not a failed gate;
  this workflow executed under the pinned Node 24 toolchain and every required step completed.
- Electron artifact binding: the run 4 artifact contained exactly the DMG and checksum file. The
  119,861,524-byte DMG SHA-256 is
  `9192b160770e8530c1d1d076ab3ce0ed5c4d85756bcb329c59fd4210997ff94c`, exactly matching the
  uploaded checksum. The artifact digest and DMG content hash remain distinct bindings.
- Fresh Migration Job build: full Secret boundary passed before build. Docker used the exact
  digest-pinned Node 24.11.0 base and emitted manifest-list/image digest
  `sha256:30e38e3551c10fd04eebdfdf9b00298ecb4ae75fead52589b8a1c42f2791257c`, config digest
  `sha256:48b0927cece7f33c49e3f336996d5cf47dca28638cf3e92e843e71c6479ebc89`, `user=node`, and exact
  entrypoint `/usr/local/bin/sartre-migrate`. One registry tarball hit `ECONNRESET`, retried, and
  completed; the final build exited 0 and is not relabeled as a clean network attempt.
- Fresh Migration Job REAL_TEST:
  `SARTRE_MIGRATION_JOB_IMAGE=sartre-migration-job:ms0-closeout-eab7
  SARTRE_DATABASE_URL=postgresql://postgres@127.0.0.1:54326/postgres pnpm exec vitest run
  tests/integration/migration-job-image.integration.test.ts --disableConsoleIntercept` exited 0
  with `2/2`. It proved exactly four nonsymlink repository-owned payloads, byte equality, artifact
  Secret PASS, nonroot/entrypoint/no-node_modules policy, first apply `true,true`, second no-op
  `false,false`, exact `000001`/`000002` rows and checksums, plus database/container/temp cleanup.
- Subject observation: clean subject tree is `c424d56fd77fe5d0069f191102176abd29ed1546` and the
  repository-owned clean worktree input hashes to
  `3d02e558e41751d730c4db6f5ce19b14977179de1b101e2f4780d9fe772b8ac9`. The ledger-only stash used
  for this observation was immediately restored and no stash remains.
- Tool versions were freshly observed through explicit allowlisted commands only: Node `v24.11.0`,
  pnpm `10.33.2`, and gitleaks `8.28.0`. An initial mistaken attempt addressed the gitleaks
  directory rather than its contained binary and exited 126; it changed no state and is not gate
  evidence. No environment/config dump, credential helper, shell profile, or ignored credential
  input was read.
- Negative controls: the fresh clean-clone/CI root test suite executed the committed fail-closed
  controls for missing command, required SKIPPED, wrong-CI subject, PostgreSQL 17.10, stopped Worker,
  degraded dependency, missing/mismatched gitleaks, root-pack success, unpacked artifact Secret,
  and extracted payload Secret. These controls remain REAL_TEST behavior and are not replaced by a
  structural manifest assertion.
- Accepted residual risks: GitHub artifact transfer is network-variable but bounded at 15 minutes;
  the Migration Job digest is local platform-specific unsigned test evidence, not Release evidence;
  Actions v4 Node-20 deprecation requires a future workflow dependency update; diagnostics retention
  is schema metadata without an MS0 purge worker; self-test routes are not MS1 identity/authorization.
- Evidence-only path set must be exactly:
  `plan/00-master-plan.md`, this ledger,
  `reports/ms0-repository-constitution/checkpoints/closeout.md`,
  `reports/ms0-repository-constitution/evidence/closeout.json`, and
  `reports/ms0-repository-constitution/evidence/manifest.json`.
- Next command: create those closeout records, run format/whitespace and full Secret checks, stage
  exactly the five paths, repeat cached whitespace/exact enumeration and immutable-index/full Secret
  checks, then commit `test(ms0): bind repository constitution evidence`. Immediately run
  `pnpm run verify:ms0 -- --evidence-commit HEAD --subject-commit HEAD^`. Do not tag, update remote
  `main`, create the MS1 task, or clean up the local image/artifact inputs before verifier exit 0.

### 2026-07-23 11:13 CST - authorized evidence-rebind cross-device handoff

- Status: BLOCKED at replacement artifact content recovery. This handoff makes the interruption
  remotely recoverable; it is not MS0 closeout evidence and does not authorize MS1.
- Authority and scope:
  - The user explicitly authorized a narrow MS0 evidence rebind after the original bound GitHub run
    and artifact disappeared, then requested an immediate stop for a device switch and required
    remote repository documentation sufficient for another AI to continue without chat history.
  - The immutable subject and its implementation are unchanged. The rebind may update only the
    five final evidence paths after replacement facts are verified. No MS0 feature repair, legacy
    compatibility, MS1 implementation, or MS2 work is authorized in this handoff.
- Remote topology observed fresh:
  - GitHub origin only: `https://github.com/daodaolee/sartre.git`; no GitLab remote or push.
  - Immutable subject branch: `origin/codex/ms0-repository-constitution` at
    `eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a`, tree
    `c424d56fd77fe5d0069f191102176abd29ed1546`, sole parent
    `16bb67b054cd71a7e05e70e203621d1a560465ab`.
  - Current remote `main` and `ms0-verified^{commit}` remain the old evidence child
    `8174869ae58f90ee1a3dae5d48d75d73d5285533`; annotated tag object is
    `4e3b930d1fcb8d8fd1086f1e0d63ee67a9f4ebff`.
  - This ledger-only handoff branch is `codex/ms0-evidence-rebind-handoff`, rooted at the old
    evidence child. It must never be used as the parent of replacement evidence.
- Replacement CI evidence:
  - Pushing the existing immutable subject to `codex/ms0-repository-constitution` triggered GitHub
    Actions run `29973452109` for exact head SHA `eab7d4ae...`.
  - Jobs `constitution`, `postgresql-17-6`, and `electron-macos-arm64` all completed successfully.
    Actions v4 emitted the already-known Node-20 deprecation annotation while the workflow remained
    pinned to Node `24.11.0`; the annotation is residual risk, not a skipped or failed gate.
  - Fresh `pnpm run ci:verify -- --subject eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a`
    exited 0 and selected run `29973452109` with artifact digest
    `sha256:f65ef41b41a94ce7498082996d1259f21eeb7e75d8f0c745d0d92ee42377c5e3`.
  - Live artifact metadata: id `8550574084`, size `119654174` bytes, `expired=false`, expiration
    `2026-08-22T02:05:56Z`. Metadata does not prove DMG contents or checksum.
- Preserved download attempt history:
  - The original user-specified fresh verifier passed Git/tag binding but exited 1 with
    `final_ci_artifact_download_failed`; live GitHub queries returned 404 for historical run
    `29914173418` and zero matching artifacts.
  - A first top-level `gh run download` diagnostic was transparently rewritten by the desktop
    command-output proxy to `rtk gh`, produced no artifact, and was manually stopped at the
    15-minute boundary. This is not an official-CLI artifact attempt or PASS evidence.
  - The first official GitHub CLI `2.92.0` download failed after roughly five and a half minutes
    with `connection reset by peer`; no checksum assertion ran.
  - The second official CLI download produced no final artifact within 15 minutes and was manually
    terminated at the approved boundary; no checksum assertion ran.
  - A direct official-CLI archive diagnostic was stopped immediately when the user requested the
    device switch. It is cancelled, not PASS or timeout evidence.
- Local safety and cleanup:
  - Dependencies were restored only with `pnpm install --frozen-lockfile
    --strict-peer-dependencies`. Pinned gitleaks `8.28.0` was checksum-bootstrapped; fresh
    `toolchain:check` and repository `secret:check` exited 0 before the subject branch push.
  - Every bounded temporary download path was removed after stop/failure. No partial archive, DMG,
    checksum, token, endpoint, credential, ignored input, raw environment/config dump, or local
    absolute path was persisted in Git.
  - The source worktree was clean before creating this branch; the only intended handoff change is
    this PLAN_LEDGER.
- Evidence classification:
  - Replacement same-SHA CI metadata/jobs/artifact digest: REAL_TEST / PASS.
  - Replacement artifact file set, DMG hash, uploaded checksum, evidence-only child, final verifier,
    verified tag, remote `main`, and the original MS1 prerequisite command: BLOCKED / not executed.
  - Historical run/artifact facts are stale and must not be copied into replacement closeout.
- Cross-device plan policy:
  - `plan/00-master-plan.md` remains the remote roadmap for MS0-MS8.
  - After the complete MS0 binding command exits 0, MS1 must begin by creating its tracked
    implementation plan, OpenSpec/BDD, and independent PLAN_LEDGER, committing and pushing those
    artifacts before implementation. Later MS detailed plans are created and pushed one milestone
    at a time after the preceding verified tag; chat context is never the recovery authority.
- Next command: on the new device, follow the top Resume procedure exactly. The first executable
  gate after toolchain bootstrap is
  `pnpm run ci:verify -- --subject eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a`.
  Only after it exits 0 may artifact download/checksum recovery resume. Do not regenerate evidence,
  move `main`/tag, or create MS1 artifacts before the remaining gates pass.
