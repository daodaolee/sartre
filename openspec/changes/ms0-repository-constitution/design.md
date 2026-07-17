# MS0 Repository Constitution Design

## Repository boundary

The pnpm workspace fixes four apps and four packages as the only target module roots. Import is
allowlisted by a generated SHA-256 manifest, legacy code is deny-by-default through the
PortingLedger, and root packaging is prohibited.

## Evidence boundary

REAL_TEST requires an executed target, assertions, a real failure mode, and non-zero failure.
STRUCTURAL_CHECK, SCENARIO_REGISTERED, SKIPPED, degraded, and unreachable are never promoted to
PASS. Closeout binds an immutable subject commit; a separate evidence-only child commit does not
pretend to be the tested subject.

## Database boundary

PostgreSQL 17.6 is the exact required baseline. Migration is an independent, checksum-verified,
transactional process; application startup cannot mutate production schema.

## Health boundary

Electron, Hub API, Hub Worker, and Local Runtime expose distinct liveness/readiness facts. A failed
dependency is visible and fail-closed; one process cannot fabricate another process as healthy.

## Diagnostic boundary

DiagnosticContext and stable error codes connect process boundaries without storing message text,
Prompt, Secret, local path, SQL, stack, or raw command output. The diagnostic projection is
rebuildable evidence, not a business-state owner.

## Electron trust boundary

Renderer is untrusted. It cannot reach Hub, Runtime, Node, raw IPC, credentials, or local paths.
Main and preload expose only Zod-validated named health methods. Electron packaging uses an
explicit files allowlist and scans both unpacked and packaged artifacts for Secret material.
