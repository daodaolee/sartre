import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { EvidenceLevel, EvidenceStatus } from "../../packages/contracts/src/evidence.js";
import { collectCommand } from "./collect-command.js";
import { validateEvidenceRecord } from "./validate.js";

const COMMIT_SHA = "a".repeat(40);
const TREE_HASH = "b".repeat(40);
const DIRTY_HASH = "c".repeat(64);
const OUTPUT_HASH = "d".repeat(64);
const STARTED_AT = "2026-07-20T00:00:00.000Z";
const FINISHED_AT = "2026-07-20T00:00:01.000Z";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

interface TestManifest {
  schemaVersion: string;
  commitSha: string;
  subjectTreeHash: string;
  dirtyWorktreeHash: string;
  releaseVersion: string;
  imageDigest: string | null;
  electronArtifactHash: string | null;
  environmentId: string;
  toolVersions: Record<string, string>;
  evidenceLevel: EvidenceLevel;
  status: EvidenceStatus;
  startedAt: string;
  finishedAt: string;
  commands: Array<{
    argv: string[];
    exitCode: number;
    startedAt: string;
    finishedAt: string;
    assertions: Array<{ name: string; status: "passed" | "failed" }>;
  }>;
}

function createManifest(): TestManifest {
  return {
    schemaVersion: "1",
    commitSha: COMMIT_SHA,
    subjectTreeHash: TREE_HASH,
    dirtyWorktreeHash: DIRTY_HASH,
    releaseVersion: "0.1.0",
    imageDigest: null,
    electronArtifactHash: null,
    environmentId: "ms0-local-test",
    toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
    evidenceLevel: "REAL_TEST",
    status: "PASS",
    startedAt: STARTED_AT,
    finishedAt: FINISHED_AT,
    commands: [
      {
        argv: ["node", "--version"],
        exitCode: 0,
        startedAt: STARTED_AT,
        finishedAt: FINISHED_AT,
        assertions: [{ name: "target_executed", status: "passed" }],
      },
    ],
  };
}

function createEvidenceRecord(): {
  manifest: TestManifest;
  declaration: {
    gateId: string;
    required: boolean;
    evidenceLevel: EvidenceLevel;
    targetKind: "test" | "build" | "service" | "command";
    requiresArtifactHash: boolean;
  };
  observation: {
    actualDirtyWorktreeHash: string;
    evidenceCommitSha: string | null;
    targetExecuted: boolean;
    failureModeVerified: boolean;
    serviceStatus: "healthy" | "degraded" | "unreachable" | null;
    artifactHashes: string[];
  };
} {
  return {
    manifest: createManifest(),
    declaration: {
      gateId: "unit",
      required: true,
      evidenceLevel: "REAL_TEST",
      targetKind: "test",
      requiresArtifactHash: false,
    },
    observation: {
      actualDirtyWorktreeHash: DIRTY_HASH,
      evidenceCommitSha: null,
      targetExecuted: true,
      failureModeVerified: true,
      serviceStatus: null,
      artifactHashes: [],
    },
  };
}

function issueCodes(record: unknown): string[] {
  return validateEvidenceRecord(record).issues.map((issue) => issue.code);
}

describe("validateEvidenceRecord", () => {
  it("rejects a required gate reported as SKIPPED", () => {
    const record = createEvidenceRecord();
    record.manifest.evidenceLevel = "SKIPPED";
    record.manifest.status = "SKIPPED";
    record.manifest.commands = [];

    expect(issueCodes(record)).toContain("required_gate_skipped");
  });

  it("rejects STRUCTURAL_CHECK evidence relabeled as REAL_TEST", () => {
    const record = createEvidenceRecord();
    record.declaration.evidenceLevel = "STRUCTURAL_CHECK";

    expect(issueCodes(record)).toContain("evidence_level_mismatch");
  });

  it("rejects command evidence with no exit code", () => {
    const record = createEvidenceRecord();
    const command = record.manifest.commands[0];
    if (!command) throw new Error("test_fixture_command_missing");
    const { exitCode: _exitCode, ...commandWithoutExitCode } = command;
    record.manifest.commands = [commandWithoutExitCode as never];

    expect(issueCodes(record)).toContain("evidence_schema_invalid");
  });

  it("rejects evidence with no tested-subject commitSha", () => {
    const record = createEvidenceRecord();
    const { commitSha: _commitSha, ...manifestWithoutCommitSha } = record.manifest;
    record.manifest = manifestWithoutCommitSha as never;

    expect(issueCodes(record)).toContain("evidence_schema_invalid");
  });

  it("rejects a dirtyWorktreeHash that does not match the observed subject state", () => {
    const record = createEvidenceRecord();
    record.observation.actualDirtyWorktreeHash = "e".repeat(64);

    expect(issueCodes(record)).toContain("dirty_worktree_hash_mismatch");
  });

  it("rejects PASS when a service target was unreachable", () => {
    const record = createEvidenceRecord();
    record.declaration.targetKind = "service";
    record.observation.serviceStatus = "unreachable";

    expect(issueCodes(record)).toContain("service_unreachable_pass");
  });

  it("rejects PASS when a service target was degraded", () => {
    const record = createEvidenceRecord();
    record.declaration.targetKind = "service";
    record.observation.serviceStatus = "degraded";

    expect(issueCodes(record)).toContain("service_degraded_pass");
  });

  it("rejects build PASS without a required artifact hash", () => {
    const record = createEvidenceRecord();
    record.declaration.targetKind = "build";
    record.declaration.requiresArtifactHash = true;

    expect(issueCodes(record)).toContain("artifact_hash_missing");
  });

  it("rejects REAL_TEST when the target did not run or its failure mode was not proved", () => {
    const record = createEvidenceRecord();
    record.observation.targetExecuted = false;
    record.observation.failureModeVerified = false;

    expect(issueCodes(record)).toEqual(
      expect.arrayContaining(["target_not_executed", "failure_mode_unverified"]),
    );
  });

  it("rejects evidence that names its own evidence commit as the tested subject", () => {
    const record = createEvidenceRecord();
    record.observation.evidenceCommitSha = COMMIT_SHA;

    expect(issueCodes(record)).toContain("evidence_commit_self_reference");
  });

  it("accepts a required REAL_TEST record with executed assertions and a proved failure mode", () => {
    expect(validateEvidenceRecord(createEvidenceRecord())).toEqual({ valid: true, issues: [] });
  });
});

describe("collectCommand", () => {
  async function createRepositoryRoot(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), "sartre-command-evidence-"));
    temporaryDirectories.push(root);
    await mkdir(join(root, "reports"), { recursive: true });
    return root;
  }

  const delay = (milliseconds: number): Promise<void> =>
    new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

  async function waitForDescendantPid(path: string): Promise<number> {
    const deadline = Date.now() + 4_000;
    while (Date.now() < deadline) {
      try {
        const pid = Number((await readFile(path, "utf8")).trim());
        if (Number.isSafeInteger(pid) && pid > 0) return pid;
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      }
      await delay(20);
    }
    throw new Error("descendant_not_ready");
  }

  async function waitForHeartbeatGrowth(path: string): Promise<void> {
    const initialSize = (await stat(path)).size;
    const deadline = Date.now() + 1_000;
    while (Date.now() < deadline) {
      if ((await stat(path)).size > initialSize) return;
      await delay(20);
    }
    throw new Error("heartbeat_not_growing");
  }

  async function heartbeatBecomesStable(path: string): Promise<boolean> {
    const deadline = Date.now() + 1_500;
    let previousSize = (await stat(path)).size;
    let unchangedSince = Date.now();
    while (Date.now() < deadline) {
      await delay(25);
      const size = (await stat(path)).size;
      if (size !== previousSize) {
        previousSize = size;
        unchangedSince = Date.now();
      } else if (Date.now() - unchangedSince >= 500) {
        return true;
      }
    }
    return false;
  }

  function processIsAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ESRCH") return false;
      throw error;
    }
  }

  async function cleanupDescendant(pid: number | undefined): Promise<void> {
    if (pid === undefined) return;
    try {
      process.kill(pid, "SIGKILL");
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
    }
    const deadline = Date.now() + 2_000;
    while (processIsAlive(pid) && Date.now() < deadline) await delay(20);
    expect(processIsAlive(pid)).toBe(false);
  }

  it("runs only a code-owned tool-version policy and observes the actual version", async () => {
    const repositoryRoot = await createRepositoryRoot();
    const attempt = await collectCommand({
      gateId: "node-version",
      policyId: "tool.node.version",
      repositoryRoot,
      rawLogDirectory: "reports/ms0/raw/commands",
    });

    expect(attempt.command.exitCode).toBe(0);
    expect(attempt.command.argv).toEqual(["node", "--version"]);
    expect(attempt.stdoutHash).toMatch(/^[0-9a-f]{64}$/);
    expect(attempt.stderrHash).toMatch(/^[0-9a-f]{64}$/);
    expect(attempt.targetExecuted).toBe(true);
    expect(attempt.toolVersions).toEqual({ node: process.version });
    expect(attempt.keyAssertions).toEqual(["tool_version_observed"]);
    expect(attempt.rawLogReference).toMatch(/^reports\/ms0\/raw\/commands\//);
    expect(await readFile(join(repositoryRoot, attempt.rawLogReference), "utf8")).toContain(
      "stdout",
    );
    expect(attempt).not.toHaveProperty("stdout");
    expect(attempt).not.toHaveProperty("stderr");
    expect(attempt).not.toHaveProperty("rawLogPath");
  });

  it.each([
    [process.execPath, "-e", "process.stdout.write(JSON.stringify(process.env))"],
    ["git", "config", "--list"],
    ["git", "credential", "fill"],
    ["sh", "-c", "source ~/.zshrc"],
  ])("rejects config-supplied argv without executing it: %j", async (...argv) => {
    const repositoryRoot = await createRepositoryRoot();
    let executions = 0;
    await expect(
      collectCommand(
        {
          gateId: "unsafe",
          policyId: "tool.node.version",
          repositoryRoot,
          rawLogDirectory: "reports/ms0/raw/commands",
          argv,
          allowedArgv: [argv],
        } as never,
        {
          execute: async () => {
            executions += 1;
            return { exitCode: 0, stdout: "", stderr: "", targetExecuted: true };
          },
        },
      ),
    ).rejects.toThrow("command_input_invalid");
    expect(executions).toBe(0);
  });

  it("rejects caller-provided environment and reported facts", async () => {
    const repositoryRoot = await createRepositoryRoot();
    await expect(
      collectCommand({
        gateId: "unsafe-environment",
        policyId: "tool.node.version",
        repositoryRoot,
        rawLogDirectory: "reports/ms0/raw/commands",
        environment: { EXAMPLE: "must-not-be-captured" },
        assertions: [{ name: "forged", status: "passed" }],
        failureModeVerified: true,
        serviceStatus: "healthy",
        artifactHashes: [OUTPUT_HASH],
      } as never),
    ).rejects.toThrow("command_input_invalid");
  });

  it("rejects raw log paths outside contained reports raw before execution", async () => {
    const repositoryRoot = await createRepositoryRoot();
    let executions = 0;
    await expect(
      collectCommand(
        {
          gateId: "outside-raw",
          policyId: "tool.node.version",
          repositoryRoot,
          rawLogDirectory: join(tmpdir(), "outside-sartre-command-evidence"),
        },
        {
          execute: async () => {
            executions += 1;
            return { exitCode: 0, stdout: "", stderr: "", targetExecuted: true };
          },
        },
      ),
    ).rejects.toThrow("raw_log_path_unsafe");
    expect(executions).toBe(0);
  });

  it("rejects an intermediate raw-directory symlink before outside mutation", async () => {
    const repositoryRoot = await createRepositoryRoot();
    const outside = await mkdtemp(join(tmpdir(), "sartre-command-outside-"));
    temporaryDirectories.push(outside);
    await symlink(outside, join(repositoryRoot, "reports", "escape"));
    let executions = 0;
    await expect(
      collectCommand(
        {
          gateId: "symlink-raw",
          policyId: "tool.node.version",
          repositoryRoot,
          rawLogDirectory: "reports/escape/raw/commands",
        },
        {
          execute: async () => {
            executions += 1;
            return { exitCode: 0, stdout: "", stderr: "", targetExecuted: true };
          },
        },
      ),
    ).rejects.toThrow("raw_log_path_unsafe");
    expect(executions).toBe(0);
    expect(await readdir(outside)).toEqual([]);
  });

  it("rejects detected Secret output without persisting or exposing its value", async () => {
    const repositoryRoot = await createRepositoryRoot();
    const sensitiveOutput = ["AWS_", "SECRET_ACCESS_KEY", "=", "fixture-value"].join("");
    let caught: unknown;
    try {
      await collectCommand(
        {
          gateId: "secret-output",
          policyId: "tool.node.version",
          repositoryRoot,
          rawLogDirectory: "reports/ms0/raw/commands",
        },
        {
          execute: async () => ({
            exitCode: 0,
            stdout: sensitiveOutput,
            stderr: "",
            targetExecuted: true,
          }),
        },
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe("secret_output_detected");
    expect((caught as Error).message).not.toContain(sensitiveOutput);
    expect(await readdir(join(repositoryRoot, "reports", "ms0", "raw", "commands"))).toEqual([]);
  });

  it("extracts Vitest counts and assertions from observed output, not caller claims", async () => {
    const repositoryRoot = await createRepositoryRoot();
    const attempt = await collectCommand(
      {
        gateId: "focused-tests",
        policyId: "task3.focused-tests",
        repositoryRoot,
        rawLogDirectory: "reports/ms0/raw/commands",
      },
      {
        execute: async () => ({
          exitCode: 0,
          stdout: "Test Files  2 passed (2)\nTests  20 passed (20)\nDuration  250ms\n",
          stderr: "",
          targetExecuted: true,
        }),
      },
    );

    expect(attempt.testCount).toBe(20);
    expect(attempt.failureCount).toBe(0);
    expect(attempt.command.assertions).toEqual([
      { name: "vitest_tests_executed", status: "passed" },
      { name: "vitest_no_failures", status: "passed" },
    ]);
    expect(attempt.keyAssertions).toEqual(["vitest_tests_executed", "vitest_no_failures"]);
    expect(attempt.failureModeVerified).toBe(true);
    expect(attempt.stdoutHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("force-kills a ready SIGTERM-ignoring descendant after the direct parent closes", async () => {
    if (process.platform === "win32") return;
    const repositoryRoot = await createRepositoryRoot();
    const heartbeatPath = join(
      repositoryRoot,
      "reports",
      "ms0",
      "raw",
      "lifecycle",
      "heartbeat.log",
    );
    const readyPath = join(repositoryRoot, "reports", "ms0", "raw", "lifecycle", "descendant.pid");
    let descendantPid: number | undefined;
    const startedAt = performance.now();
    const outcomePromise = collectCommand({
      gateId: "hang",
      policyId: "fixture.hang",
      repositoryRoot,
      rawLogDirectory: "reports/ms0/raw/commands",
    } as never).then(
      (attempt) => ({ attempt }),
      (error: unknown) => ({ error: error instanceof Error ? error : new Error("unknown_error") }),
    );
    try {
      descendantPid = await waitForDescendantPid(readyPath);
      await waitForHeartbeatGrowth(heartbeatPath);
      const outcome = await outcomePromise;
      expect(outcome).toHaveProperty("error");
      expect("error" in outcome ? outcome.error.message : "resolved").toBe("command_timed_out");
      expect(performance.now() - startedAt).toBeLessThan(6_000);
      expect(await heartbeatBecomesStable(heartbeatPath)).toBe(true);
      expect(await readdir(join(repositoryRoot, "reports", "ms0", "raw", "commands"))).toEqual([]);
    } finally {
      await outcomePromise;
      await cleanupDescendant(descendantPid);
    }
  }, 15_000);

  it("returns a stable error when forced process-group signaling fails", async () => {
    if (process.platform === "win32") return;
    const repositoryRoot = await createRepositoryRoot();
    const readyPath = join(repositoryRoot, "reports", "ms0", "raw", "lifecycle", "descendant.pid");
    let descendantPid: number | undefined;
    const outcomePromise = collectCommand(
      {
        gateId: "hang",
        policyId: "fixture.hang",
        repositoryRoot,
        rawLogDirectory: "reports/ms0/raw/commands",
      } as never,
      {
        signalProcess: (target: number, signal: NodeJS.Signals) => {
          if (signal === "SIGKILL") {
            throw Object.assign(new Error("forced_signal_failure"), { code: "EPERM" });
          }
          process.kill(target, signal);
        },
      } as never,
    ).then(
      (attempt) => ({ attempt }),
      (error: unknown) => ({ error: error instanceof Error ? error : new Error("unknown_error") }),
    );
    try {
      descendantPid = await waitForDescendantPid(readyPath);
      const outcome = await outcomePromise;
      expect(outcome).toHaveProperty("error");
      expect("error" in outcome ? outcome.error.message : "resolved").toBe(
        "command_termination_failed",
      );
      expect(await readdir(join(repositoryRoot, "reports", "ms0", "raw", "commands"))).toEqual([]);
    } finally {
      await outcomePromise;
      await cleanupDescendant(descendantPid);
    }
  }, 15_000);

  it("terminates a real code-owned output flood at the byte cap without writing a raw log", async () => {
    const repositoryRoot = await createRepositoryRoot();
    const startedAt = performance.now();
    await expect(
      collectCommand({
        gateId: "flood",
        policyId: "fixture.flood",
        repositoryRoot,
        rawLogDirectory: "reports/ms0/raw/commands",
      } as never),
    ).rejects.toThrow("command_output_limit_exceeded");
    expect(performance.now() - startedAt).toBeLessThan(2_000);
    expect(await readdir(join(repositoryRoot, "reports", "ms0", "raw", "commands"))).toEqual([]);
  });
});
