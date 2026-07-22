# MS0 Repository Constitution closeout

- Status: PASS, conditional on the evidence-only child passing the mandatory final verifier before
  tag or publication.
- Subject commit: `eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a`
- Subject tree: `c424d56fd77fe5d0069f191102176abd29ed1546`
- Clean dirty-worktree hash:
  `3d02e558e41751d730c4db6f5ce19b14977179de1b101e2f4780d9fe772b8ac9`
- Clean-clone: PASS against the exact subject with all 16 required subgates.
- Required CI: run
  [29973452109](https://github.com/daodaolee/sartre/actions/runs/29973452109), PASS for
  `constitution`, `postgresql-17-6`, and `electron-macos-arm64`.
- CI artifact digest:
  `sha256:f65ef41b41a94ce7498082996d1259f21eeb7e75d8f0c745d0d92ee42377c5e3`
- Electron DMG SHA-256:
  `27c55682f89e1e34b95d7aab159493c5f5e1b48bf6aaaee41b6f4908a374a997`
- Migration Job image digest:
  `sha256:30e38e3551c10fd04eebdfdf9b00298ecb4ae75fead52589b8a1c42f2791257c`
- Environment: local exact PostgreSQL 17.6 plus GitHub Actions run `29973452109`; schema
  `000002_ms0_diagnostics`.
- Tool versions: Node `v24.11.0`, pnpm `10.33.2`, gitleaks `8.28.0`.

All 18 required gates are recorded in `evidence/manifest.json`. Structural gates remain labeled
`STRUCTURAL_CHECK`; they are not promoted to `REAL_TEST`. Required negative controls were executed
inside the fresh clean-clone/CI test suites and fail closed. No required gate is SKIPPED, degraded,
unreachable, cancelled, or absent.

Accepted residual risks are limited to network-variable but bounded GitHub artifact transfer, a
local platform-specific unsigned Migration Job test image, the GitHub Actions v4 Node-20
deprecation warning, schema-only diagnostics retention without an MS0 purge worker, and self-test
routes that deliberately do not claim MS1 identity/authorization.

Final command:

```bash
pnpm run verify:ms0 -- --evidence-commit HEAD --subject-commit HEAD^
```

Only exit 0 permits the annotated `ms0-verified` tag and publication of this evidence child to
remote `main`. MS1 implementation remains prohibited in this task.
