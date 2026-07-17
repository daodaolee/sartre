# Legacy Freeze Reference

The legacy repository at `/Users/xy/personal/Sartre(agent-workspace-design)` is reference-only and
remains **NO-GO**. The production rebuild lives in `/Users/xy/xykj/sartre`; legacy application
source, historical PASS reports, old OpenSpec state, and completion ledgers are not inherited.

The pre-implementation freeze was generated on `2026-07-17T10:29:52.250Z` from source HEAD
`f8f859a85cb7fed2200bb7aee7a6407131fbb30e`. The source was dirty; its deterministic dirty-fact
hash is `dd88d6466ef0645143360a383b91fdd2bf5cfaa38e718cd8dfaaf1c1aed23724`. The manifest records 835
tracked/untracked/deleted path facts without copying legacy contents. Ignored files are excluded,
and known credential-bearing paths never receive content hashes.

`scripts/legacy/verify-freeze-manifest.ts` independently re-enumerates each path and compares Git
state, kind, size, and SHA-256 where readable. A count-only match is not accepted.

The legacy README was deliberately not modified because that repository contains unrelated dirty
user work and is frozen. This target-side NO-GO/new-repository notice is the approved deviation
authorized by MS0 Task 1; it avoids claiming that the legacy worktree was changed.

No manifest entry grants permission to port code. Every candidate must pass the deny-by-default
review in `plan/PORTING_LEDGER.md`.
