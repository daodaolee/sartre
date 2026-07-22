# MS0 Repository Constitution closeout

- Status: PASS, conditional on the evidence-only child passing the mandatory final verifier before
  tag or publication.
- Subject commit: `eab7d4aef7e344a6b06dcb64bb7cbde4f26e670a`
- Subject tree: `c424d56fd77fe5d0069f191102176abd29ed1546`
- Clean dirty-worktree hash:
  `3d02e558e41751d730c4db6f5ce19b14977179de1b101e2f4780d9fe772b8ac9`
- Clean-clone: PASS against the exact subject with all 16 required subgates.
- Required CI: run
  [29914173418](https://github.com/daodaolee/sartre/actions/runs/29914173418), PASS for
  `constitution`, `postgresql-17-6`, and `electron-macos-arm64`.
- CI artifact digest:
  `sha256:9ad1fee7c43514e41ebc7a54e416c2454c303287d77e2453a61f20483b9a2e5b`
- Electron DMG SHA-256:
  `9192b160770e8530c1d1d076ab3ce0ed5c4d85756bcb329c59fd4210997ff94c`
- Migration Job image digest:
  `sha256:30e38e3551c10fd04eebdfdf9b00298ecb4ae75fead52589b8a1c42f2791257c`
- Environment: local exact PostgreSQL 17.6 plus GitHub Actions run `29914173418`; schema
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
