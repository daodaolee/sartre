# Feature: Regression evidence gate

## Scenario: Latest regression report is trustworthy enough for automated delivery confidence

Given a change has a generated regression latest report
When the evidence gate validates the report
Then every check has evidence, command, and result metadata
And failed checks or unexplained skips are rejected
And the report must include at least one REAL_TEST

Evidence: REAL_TEST via `pnpm exec vitest run scripts/evidence-gate.test.ts`; STRUCTURAL_CHECK via `pnpm harness:evidence -- --change lane-a-service-baseline`.
