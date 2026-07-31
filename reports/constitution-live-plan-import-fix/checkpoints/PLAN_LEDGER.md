# Constitution live-plan import fix PLAN_LEDGER

- Status: DONE. Import-boundary and live dependency gates are GREEN; commit/index checks remain.
- Goal: restore the immutable import boundary after the living Master Plan's MS0 status transition.
- Plan: `plan/maintenance/2026-07-31-live-master-plan-import-boundary.md`
- Base: verified `ms0-verified^{commit}` and `origin/main` at
  `5ca19c0e04922cd1a117c9dddc579cf56ef162c8`.
- Scope: one regression expectation, one allowlist removal, one checked-in manifest removal,
  PortingLedger wording, current security-only dependency overrides/lock update, this plan, and this
  ledger. No imported document, product code, database, MS0 evidence, or design source change.
- Import-boundary evidence:
  - Existing `pnpm run spec:verify` failed `target_checksum_mismatch:
    plan/00-master-plan.md`; this is the task's initial RED observation.
  - After changing only the test expectation, focused Vitest failed exactly `1/14` because the
    production allowlist still included the living plan. After the mapping and manifest removal,
    the same focused suite passed `14/14`, and `pnpm run spec:verify` passed all 26 remaining hashes.
- Live dependency gate: the first full validation reached `pnpm run dependency:check` after
  `652/652` tests and failed on High `GHSA-mh99-v99m-4gvg`: all installed `brace-expansion`
  versions through Electron packaging were vulnerable through `5.0.7`; `5.0.8` is the first
  patched release. The same audit also reported Moderate `tar <=7.5.20`, patched in `7.5.21`.
- Canonical override RED -> GREEN:
  - Putting overrides in `pnpm-workspace.yaml` initially triggered the intended repository-policy
    `workspace_config_drift`. Moving them to `package.json#pnpm.overrides` was rejected because pnpm
    10.33.2 explicitly warned that field is ignored; no such warning is accepted as a fix.
  - The repository-policy test was changed first to require exact workspace overrides and reject a
    weakened `5.0.7` pin. Focused policy tests then failed `4/21` against the old production
    canonical content. Updating that canonical content made the same suite pass `21/21` and the
    actual `pnpm run constitution:workspaces` pass.
  - `pnpm install --strict-peer-dependencies` mechanically refreshed `pnpm-lock.yaml`. The resolved
    graph now contains only `brace-expansion 5.0.8` and `tar 7.5.21`; `pnpm run dependency:check`
    reports `No known vulnerabilities found`.
- Final validation:
  - `pnpm run package:mac:arm64 -- --dir` exited 0 and exercised electron-builder 26.15.3 on arm64
    with the overrides. Signing remained deliberately disabled by the existing MS0 configuration.
  - `pnpm run format:check` passed 157 files; `pnpm run lint` and `pnpm run sast` passed 158 files.
    `pnpm run build` and `pnpm run typecheck` passed all eight workspaces.
  - With the explicit local PostgreSQL 17.6 and 17.10 test inputs, `pnpm run test` passed scripts
    `566/566` plus workspaces `87/87`, total `653/653`.
  - `architecture:check`, `docker-context:check`, `dependency:check`, `license:check`,
    `openspec:validate`, `contract:compatibility` (`58/58`), `spec:verify` (26 exact targets), and
    full `secret:check` all exited 0.
- Skipped/boundary: `--verify-source` was not rerun because the historical approved source root is
  not mounted on this machine; the remaining 26 hashes and structural source/target mapping policy
  are unchanged. No staging, commit, push, PR, imported-document edit, design edit, or MS1 behavior
  implementation is claimed yet.
- Residual risk: the global `brace-expansion 5.0.8` override crosses the legacy dependency ranges
  used by minimatch 3/5/9/10. Full tests and real Electron directory packaging pass, but the pin
  should be removed when all upstream Electron packaging dependencies adopt a patched compatible
  range. The exact canonical policy prevents accidental downgrade in the meantime.
- Resume: inspect the exact diff, run whitespace and full Secret checks, stage only the intended
  paths, then repeat cached whitespace/exact-path and immutable-index/full Secret checks before a
  terse constitution-repair commit.
