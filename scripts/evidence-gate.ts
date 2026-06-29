import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export type RegressionEvidenceCheck = {
  title: string;
  evidence?: string;
  command?: string;
  result?: string;
  reason?: string;
};

export type RegressionEvidenceResult = {
  ok: boolean;
  reportPath: string;
  checks: RegressionEvidenceCheck[];
  realTestCount: number;
  errors: string[];
};

export function validateRegressionEvidence(input: {
  root: string;
  changeName: string;
  reportDir?: string;
}): RegressionEvidenceResult {
  const reportDir =
    input.reportDir ??
    join(input.root, "reports", input.changeName, "regression");
  const reportPath = join(reportDir, "latest.md");
  const errors: string[] = [];

  if (!existsSync(reportPath)) {
    return {
      ok: false,
      reportPath,
      checks: [],
      realTestCount: 0,
      errors: [`latest regression report not found: ${reportPath}`],
    };
  }

  const content = readFileSync(reportPath, "utf8");
  if (!content.includes(`# Regression Report: ${input.changeName}`)) {
    errors.push(`report header must declare change ${input.changeName}`);
  }

  const failures = content.match(/^- Failures: (\d+)$/m)?.[1];
  if (failures !== "0") {
    errors.push("report summary must declare 0 failures");
  }

  const checks = parseChecks(content);
  let realTestCount = 0;
  for (const check of checks) {
    if (!check.evidence) {
      errors.push(`${check.title} is missing evidence level`);
    }
    if (!check.command) {
      errors.push(`${check.title} is missing command`);
    }
    if (!check.result) {
      errors.push(`${check.title} is missing result`);
    }
    if (check.result?.startsWith("FAIL")) {
      errors.push(`${check.title} records failed result`);
    }
    if (check.result === "SKIP" && !check.reason) {
      errors.push(`${check.title} is skipped without reason`);
    }
    if (check.evidence === "REAL_TEST") {
      realTestCount += 1;
    }
  }

  if (realTestCount === 0) {
    errors.push("report must include at least one REAL_TEST check");
  }

  return {
    ok: errors.length === 0,
    reportPath,
    checks,
    realTestCount,
    errors,
  };
}

function parseChecks(content: string): RegressionEvidenceCheck[] {
  const sections = content.split(/^## /m).slice(1);
  return sections
    .map((section) => {
      const [rawTitle = "", ...rest] = section.split("\n");
      const title = rawTitle.trim();
      const body = rest.join("\n");
      return {
        title,
        evidence: body.match(/^- Evidence: `([^`]+)`$/m)?.[1],
        command: body.match(/^- Command: `([^`]+)`$/m)?.[1],
        result: body.match(/^- Result: (.+)$/m)?.[1],
        reason: body.match(/^- Reason: (.+)$/m)?.[1],
      };
    })
    .filter((section) => section.title !== "Summary");
}

function parseArgs(argv: string[]): {
  changeName?: string;
  reportDir?: string;
} {
  const result: { changeName?: string; reportDir?: string } = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--change") {
      result.changeName = argv[index + 1];
      index += 1;
      continue;
    }
    if (arg === "--report-dir") {
      result.reportDir = argv[index + 1];
      index += 1;
    }
  }
  return result;
}

async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const changeName = args.changeName ?? process.env.CHANGE_NAME;
  if (!changeName) {
    throw new Error("Usage: pnpm harness:evidence -- --change <change-name>");
  }

  const result = validateRegressionEvidence({
    root: process.cwd(),
    changeName,
    reportDir: args.reportDir,
  });

  if (!result.ok) {
    console.error(`Evidence gate failed: ${result.reportPath}`);
    for (const error of result.errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    `Evidence gate passed: ${result.reportPath} (${result.checks.length} checks, ${result.realTestCount} REAL_TEST)`,
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
