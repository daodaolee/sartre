# Porting Ledger

The legacy freeze is evidence, not an allowlist. A source file may be ported only after one exact
row is reviewed; directory wildcards and blanket approval are prohibited. Imported target
specification, workflow, design, ADR, architecture, and database-schema documents are governed by
`reference/spec-import-manifest.json`, not by this code-porting ledger.

| sourceRepository | sourceCommit | sourcePath | targetPath | reason | securityReview | behaviorTests | owner | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

There are currently no code-porting candidates. Any newly added row must start with
`PENDING_REVIEW`; changing a row to `APPROVED` requires a file-specific reason, completed security
review, named behavior tests, and an accountable owner.

## Task 8 audit checkpoint - 2026-07-22

- Status: `IN_PROGRESS`; this is an immutable-freeze and porting-boundary review candidate, not an
  approval or Task 8 closeout.
- Freeze metadata: the recorded source HEAD is
  `f8f859a85cb7fed2200bb7aee7a6407131fbb30e`, the recorded dirty-fact hash is
  `dd88d6466ef0645143360a383b91fdd2bf5cfaa38e718cd8dfaaf1c1aed23724`, and the manifest contains
  835 path facts. Its SHA-256 remained
  `36c68900761bb48a2638ebfbc346980a38f1285f7f5641afa69254cee6236c6f` before and after independent
  verification; the manifest was not regenerated or rewritten.
- Imported-document boundary: `reference/spec-import-manifest.json` contains exactly 26 unique,
  wildcard-free source-to-target mappings. Target-only verification and explicit source
  provenance verification passed with exact target hashes. These specification, workflow, design,
  ADR, architecture, and database-schema targets are not code-porting candidates and are governed
  only by that manifest. The living `plan/00-master-plan.md` is deliberately outside the immutable
  import boundary because milestone status transitions must update it; its changes remain governed
  by the repository authority order, review, Git history, and the active PLAN_LEDGER.
- Code boundary: the table above still contains zero candidate rows. No legacy-derived application,
  domain, infrastructure, test, or configuration mapping is claimed. Any future exact-file row must
  begin at `PENDING_REVIEW`; `APPROVED` remains unavailable without its own file-specific reason,
  completed security review, named behavior tests, and accountable owner.
- Audit boundary: no legacy source content was copied, persisted, or added to this ledger. Source
  drift in a future audit must be recorded as old/current HEAD and dirty-hash metadata and must stop
  the audit without replacing the immutable manifest.
