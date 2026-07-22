import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { loadCiRuns, verifyCiRun } from "./verify-ci-run.js";

const subject = "1".repeat(40);
const requiredJobs = ["constitution", "postgresql-17-6", "electron-macos-arm64"] as const;
const tsxCli = fileURLToPath(import.meta.resolve("tsx/cli"));

function runVerifierCli(args: string[]) {
  return spawnSync(
    process.execPath,
    [tsxCli, resolve("scripts/harness/verify-ci-run.ts"), ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { PATH: join(tmpdir(), "sartre-ci-verifier-no-gh") },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}

function successfulRun() {
  return {
    id: 42,
    headSha: subject,
    workflowPath: ".github/workflows/ms0-required.yml",
    status: "completed",
    conclusion: "success",
    htmlUrl: "https://example.invalid/actions/runs/42",
    jobs: requiredJobs.map((name) => ({ name, status: "completed", conclusion: "success" })),
    artifacts: [
      {
        name: `ms0-required-${subject}`,
        expired: false,
        digest: `sha256:${"a".repeat(64)}`,
      },
    ],
  };
}

describe("required CI verifier", () => {
  it("bounds a hung gh query with a stable timeout code", () => {
    const fakeBin = mkdtempSync(join(tmpdir(), "sartre-timeout-gh-"));
    const fakeGh = join(fakeBin, "gh");
    writeFileSync(fakeGh, "#!/bin/sh\nsleep 1\nexit 0\n", "utf8");
    chmodSync(fakeGh, 0o700);
    const previousPath = process.env.PATH;
    process.env.PATH = `${fakeBin}:${previousPath ?? ""}`;

    try {
      expect(() => loadCiRuns(subject, 100)).toThrow("ci_query_timeout");
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });

  it.each([
    ["direct", ["--subject", subject]],
    ["pnpm forwarded", ["--", "--subject", subject]],
  ])("accepts the %s subject argv shape", (_case, argv) => {
    const result = runVerifierCli(argv);

    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe("ci_unavailable");
  });

  it.each([
    ["empty", []],
    ["separator only", ["--"]],
    ["missing subject", ["--subject"]],
    ["forwarded missing subject", ["--", "--subject"]],
    ["duplicate separator", ["--", "--", "--subject", subject]],
    ["trailing argument", ["--subject", subject, "extra"]],
    ["wrong flag", ["subject", subject]],
  ])("rejects the unsupported %s argv shape", (_case, argv) => {
    const result = runVerifierCli(argv);

    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe("usage: --subject <commit-sha>");
  });

  it("is exposed through the required package script", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(manifest.scripts?.["ci:verify"]).toBe("tsx scripts/harness/verify-ci-run.ts");
  });

  it("exposes the independent final verifier through the required package script", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(manifest.scripts?.["verify:ms0"]).toBe("tsx scripts/harness/verify-ms0.ts");
  });

  it("accepts only a completed successful workflow, jobs, and hashed artifact for the subject", () => {
    const result = verifyCiRun({ subject, runs: [successfulRun()] });

    expect(result.runId).toBe(42);
    expect(result.subject).toBe(subject);
    expect(result.artifactDigests).toEqual([`sha256:${"a".repeat(64)}`]);
  });

  it("fails closed when no CI run exists", () => {
    expect(() => verifyCiRun({ subject, runs: [] })).toThrow("required_ci_run_absent");
  });

  it("rejects CI evidence for another commit", () => {
    const run = successfulRun();
    run.headSha = "2".repeat(40);

    expect(() => verifyCiRun({ subject, runs: [run] })).toThrow("required_ci_subject_mismatch");
  });

  it.each(["skipped", "cancelled"])("rejects a %s required CI job", (conclusion) => {
    const run = successfulRun();
    run.jobs[0] = { ...run.jobs[0], conclusion };

    expect(() => verifyCiRun({ subject, runs: [run] })).toThrow(`required_ci_job_${conclusion}`);
  });

  it("rejects an absent required CI job", () => {
    const run = successfulRun();
    run.jobs = run.jobs.filter((job) => job.name !== "postgresql-17-6");

    expect(() => verifyCiRun({ subject, runs: [run] })).toThrow("required_ci_job_absent");
  });

  it("rejects a non-successful required CI run", () => {
    const run = successfulRun();
    run.conclusion = "failure";

    expect(() => verifyCiRun({ subject, runs: [run] })).toThrow("required_ci_run_failure");
  });

  it("rejects absent or unhashed CI artifacts", () => {
    const absent = successfulRun();
    absent.artifacts = [];
    expect(() => verifyCiRun({ subject, runs: [absent] })).toThrow("required_ci_artifact_absent");

    const unhashed = successfulRun();
    unhashed.artifacts[0] = { ...unhashed.artifacts[0], digest: "" };
    expect(() => verifyCiRun({ subject, runs: [unhashed] })).toThrow(
      "required_ci_artifact_digest_invalid",
    );
  });
});
