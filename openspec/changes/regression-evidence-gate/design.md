# Design: Regression Evidence Gate

## Decision

Add a small TypeScript evidence validator instead of expanding shell parsing. The validator treats regression reports as generated evidence artifacts and enforces the minimum trust contract.

## Evidence Contract

The latest regression report is acceptable when:

- It exists at `reports/<change-name>/regression/latest.md`, unless `--report-dir` is provided.
- Its header declares `# Regression Report: <change-name>`.
- It has a summary with `- Failures: 0`.
- No section records `- Result: FAIL`.
- Each check section contains:
  - `- Evidence: \`...\``
  - `- Command: \`...\``
  - `- Result: PASS` or `- Result: SKIP`
- Every skipped check contains `- Reason: ...`.
- At least one section has `REAL_TEST` evidence.

## Non-goals

- Do not prove business correctness. The underlying tests/builds do that.
- Do not infer release file scope. Each lane harness still owns its scoped diff check.
- Do not require report timestamps to be newer than closeout docs, because closeout evidence is commonly written after the regression run.

## Implementation

1. Add tests for passing reports, failed reports, unexplained skips, and structural-only reports.
2. Implement `scripts/evidence-gate.ts` with exported validation helpers and a CLI entry.
3. Add root script `harness:evidence`.
4. Add Lane A harness step after architecture check and before secret scan.
5. Record evidence in BDD, acceptance, and checkpoint files.
