# MS0 Repository Constitution Scenarios

| Class | Given / When / Then | Evidence | Stable code |
| --- | --- | --- | --- |
| positive | Given a clean checkout and pinned tools, when approved imports and Task 1 checks run, then the repository constitution is reproducible. | REAL_TEST | `none` |
| rejection | Given the workspace root, when npm or pnpm pack is attempted, then packaging fails non-zero. | REAL_TEST | `root_packaging_prohibited` |
| concurrency | Given PostgreSQL 17.6 and two migrators, when both start, then the advisory lock serializes them or times one out without partial schema. | REAL_TEST | `migration_lock_timeout` |
| dependency-failure | Given a required process or database is unavailable, when readiness/Harness runs, then it fails closed. | REAL_TEST | `dependency_unavailable` |
| Secret | Given a Secret in the immutable index or untracked worktree, when the repository scanner runs, then it rejects without printing the value. | REAL_TEST | `secret_boundary_violation` |
| packaged-app | Given a Secret in build, unpacked app, or extracted package output, when artifact scanning runs, then it rejects the artifact. | REAL_TEST | `secret_artifact_violation` |
| recovery | Given Hub Worker stops and later restarts, when Electron observes the four-process snapshot, then only Worker changes unavailable and later recovers. | REAL_TEST | `process_recovered` |

No legacy active/archive OpenSpec state or completion marker is inherited.
