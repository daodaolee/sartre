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
