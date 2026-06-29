import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateRegressionEvidence } from "./evidence-gate";

describe("regression evidence gate", () => {
  it("accepts a latest regression report with real tests and zero failures", async () => {
    const root = await createFixture({
      latest: report({
        checks: [
          {
            title: "OpenSpec",
            evidence: "STRUCTURAL_CHECK",
            command: "pnpm exec openspec validate demo",
            result: "PASS",
          },
          {
            title: "Hub API tests",
            evidence: "REAL_TEST",
            command: "pnpm --filter @sartre/hub-api test",
            result: "PASS",
          },
        ],
        failures: 0,
      }),
    });

    const result = validateRegressionEvidence({
      root,
      changeName: "demo-change",
    });

    expect(result.ok).toBe(true);
    expect(result.checks).toHaveLength(2);
    expect(result.realTestCount).toBe(1);
  });

  it("rejects a report that contains a failed result", async () => {
    const root = await createFixture({
      latest: report({
        checks: [
          {
            title: "Hub API tests",
            evidence: "REAL_TEST",
            command: "pnpm --filter @sartre/hub-api test",
            result: "FAIL (exit 1)",
          },
        ],
        failures: 1,
      }),
    });

    const result = validateRegressionEvidence({
      root,
      changeName: "demo-change",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("report summary must declare 0 failures");
    expect(result.errors).toContain("Hub API tests records failed result");
  });

  it("rejects a skipped result without a reason", async () => {
    const root = await createFixture({
      latest: report({
        checks: [
          {
            title: "External smoke",
            evidence: "REAL_TEST",
            command: "pnpm run web:smoke:hub",
            result: "SKIP",
          },
        ],
        failures: 0,
      }),
    });

    const result = validateRegressionEvidence({
      root,
      changeName: "demo-change",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("External smoke is skipped without reason");
  });

  it("rejects structural-only reports", async () => {
    const root = await createFixture({
      latest: report({
        checks: [
          {
            title: "OpenSpec",
            evidence: "STRUCTURAL_CHECK",
            command: "pnpm exec openspec validate demo",
            result: "PASS",
          },
        ],
        failures: 0,
      }),
    });

    const result = validateRegressionEvidence({
      root,
      changeName: "demo-change",
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain(
      "report must include at least one REAL_TEST check",
    );
  });
});

async function createFixture(input: { latest: string }): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sartre-evidence-gate-"));
  const reportDir = join(root, "reports", "demo-change", "regression");
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, "latest.md"), input.latest, "utf8");
  return root;
}

function report(input: {
  checks: Array<{
    title: string;
    evidence: "REAL_TEST" | "STRUCTURAL_CHECK";
    command: string;
    result: string;
    reason?: string;
  }>;
  failures: number;
}): string {
  return [
    "# Regression Report: demo-change",
    "",
    "- Timestamp: 20260623T100000Z",
    "- Evidence levels: REAL_TEST, STRUCTURAL_CHECK",
    "",
    ...input.checks.flatMap((check) => [
      `## ${check.title}`,
      "",
      `- Evidence: \`${check.evidence}\``,
      `- Command: \`${check.command}\``,
      `- Result: ${check.result}`,
      ...(check.reason ? [`- Reason: ${check.reason}`] : []),
      "",
    ]),
    "## Summary",
    "",
    `- Failures: ${input.failures}`,
    "",
  ].join("\n");
}
