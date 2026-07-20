import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EvidenceManifest } from "../../packages/contracts/src/evidence.js";
import { EvidenceManifestSchema } from "../../packages/contracts/src/evidence.js";
import { buildRepositoryWorktreeGitleaksInput } from "../constitution/secret-boundary.js";
import type { GateAttempt, HarnessConfig, RequiredGate } from "./run-required-gates.js";
import * as harnessModule from "./run-required-gates.js";
import { runRequiredGates } from "./run-required-gates.js";

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

function createConfig(): HarnessConfig {
  return {
    schemaVersion: "1",
    subject: {
      gitMode: "subject-head",
      commitSha: COMMIT_SHA,
      subjectTreeHash: TREE_HASH,
      dirtyWorktreeHash: DIRTY_HASH,
      releaseVersion: "0.1.0",
      imageDigest: null,
      electronArtifactHash: null,
      environmentId: "ms0-local-test",
    },
    gates: [
      {
        id: "first",
        required: true,
        evidenceLevel: "REAL_TEST",
        targetKind: "test",
        requiresArtifactHash: false,
        policyId: "task3.focused-tests",
      },
      {
        id: "second",
        required: true,
        evidenceLevel: "REAL_TEST",
        targetKind: "test",
        requiresArtifactHash: false,
        policyId: "task3.focused-tests",
      },
    ],
    output: {
      manifestPath: "reports/ms0-repository-constitution/evidence/manifest.json",
      reportPath: "reports/ms0-repository-constitution/evidence/latest.md",
    },
  };
}

function createSingleGateConfig(): HarnessConfig {
  const config = createConfig();
  const firstGate = config.gates[0];
  if (!firstGate) throw new Error("test_fixture_gate_missing");
  return { ...config, gates: [firstGate] };
}

function createAttempt(gateId: string, status: GateAttempt["status"] = "PASS"): GateAttempt {
  return {
    gateId,
    attempt: 1,
    required: true,
    declaredEvidenceLevel: "REAL_TEST",
    evidenceLevel: "REAL_TEST",
    status,
    command: {
      argv: [
        "pnpm",
        "exec",
        "vitest",
        "run",
        "scripts/evidence/validate.test.ts",
        "scripts/harness/run-required-gates.test.ts",
      ],
      exitCode: status === "PASS" ? 0 : 1,
      startedAt: STARTED_AT,
      finishedAt: FINISHED_AT,
      assertions: [
        { name: `${gateId}_assertion`, status: status === "PASS" ? "passed" : "failed" },
      ],
    },
    stdoutHash: OUTPUT_HASH,
    stderrHash: OUTPUT_HASH,
    testCount: 1,
    failureCount: status === "PASS" ? 0 : 1,
    keyAssertions: [`${gateId}_assertion`],
    errorCodes: status === "PASS" ? [] : ["validation_failed"],
    targetExecuted: true,
    failureModeVerified: true,
    serviceStatus: null,
    artifactHashes: [],
  };
}

function createPriorManifest(
  config: HarnessConfig,
  overrides: Partial<EvidenceManifest> = {},
): EvidenceManifest {
  const command = createAttempt("first").command;
  if (!command) throw new Error("test_fixture_command_missing");
  return {
    schemaVersion: config.schemaVersion,
    commitSha: config.subject.commitSha,
    subjectTreeHash: config.subject.subjectTreeHash,
    dirtyWorktreeHash: config.subject.dirtyWorktreeHash,
    releaseVersion: config.subject.releaseVersion,
    imageDigest: config.subject.imageDigest,
    electronArtifactHash: config.subject.electronArtifactHash,
    environmentId: config.subject.environmentId,
    toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
    evidenceLevel: "REAL_TEST",
    status: "PASS",
    startedAt: STARTED_AT,
    finishedAt: FINISHED_AT,
    commands: [command],
    ...overrides,
  };
}

function createToolCommand(startedAt: string, finishedAt: string) {
  return {
    argv: ["node", "--version"],
    exitCode: 0,
    startedAt,
    finishedAt,
    assertions: [{ name: "tool_version_observed", status: "passed" as const }],
  };
}

describe("runRequiredGates", () => {
  it("executes gates in declared order and writes both manifest and human report", async () => {
    const order: string[] = [];
    const writeManifest = vi.fn(async (_path: string, _value: unknown) => undefined);
    const writeReport = vi.fn(async (_path: string, _report: string) => undefined);

    const result = await runRequiredGates(createConfig(), {
      actualDirtyWorktreeHash: DIRTY_HASH,
      evidenceCommitSha: null,
      toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
      previousAttempts: [],
      execute: async (gate) => {
        order.push(gate.id);
        return createAttempt(gate.id);
      },
      writeManifest,
      writeReport,
    });

    expect(order).toEqual(["first", "second"]);
    expect(result.exitCode).toBe(0);
    expect(result.status).toBe("PASS");
    expect(result.attempts.map((attempt) => attempt.gateId)).toEqual(["first", "second"]);
    expect(writeManifest).toHaveBeenCalledOnce();
    expect(writeReport).toHaveBeenCalledOnce();
    const writtenEnvelope = writeManifest.mock.calls[0]?.[1] as { manifest?: unknown };
    expect(EvidenceManifestSchema.safeParse(writtenEnvelope.manifest).success).toBe(true);
    expect(writeReport.mock.calls[0]?.[1]).toContain("first");
    expect(writeReport.mock.calls[0]?.[1]).toContain("second");
  });

  it("uses STRUCTURAL_CHECK for a successful structural aggregate and schema-gates it", async () => {
    const config = createSingleGateConfig();
    const gate = config.gates[0];
    if (!gate) throw new Error("test_fixture_gate_missing");
    gate.evidenceLevel = "STRUCTURAL_CHECK";
    gate.targetKind = "command";
    gate.policyId = "tool.node.version";
    const result = await runRequiredGates(config, {
      actualDirtyWorktreeHash: DIRTY_HASH,
      evidenceCommitSha: null,
      toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
      previousAttempts: [],
      execute: async () => ({ ...createAttempt(gate.id), evidenceLevel: "STRUCTURAL_CHECK" }),
      writeManifest: async () => undefined,
      writeReport: async () => undefined,
    });

    expect(result.exitCode).toBe(0);
    expect(result.manifest.evidenceLevel).toBe("STRUCTURAL_CHECK");
    expect(EvidenceManifestSchema.safeParse(result.manifest).success).toBe(true);
  });

  it("preserves prior attempts instead of overwriting a failed run", async () => {
    const config = createSingleGateConfig();
    const previousAttempt = { ...createAttempt("first", "FAIL"), attempt: 1 };

    const result = await runRequiredGates(config, {
      actualDirtyWorktreeHash: DIRTY_HASH,
      evidenceCommitSha: null,
      toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
      previousManifest: createPriorManifest(config),
      previousAttempts: [previousAttempt],
      execute: async (gate: RequiredGate) => ({ ...createAttempt(gate.id), attempt: 2 }),
      writeManifest: async () => undefined,
      writeReport: async () => undefined,
    });

    expect(result.attempts).toHaveLength(2);
    expect(result.attempts.map((attempt) => [attempt.attempt, attempt.status])).toEqual([
      [1, "FAIL"],
      [2, "PASS"],
    ]);
  });

  it("recomputes forged prior REAL_TEST semantics instead of trusting stored validation issues", async () => {
    const config = createSingleGateConfig();
    const forged = {
      ...createAttempt("first"),
      targetExecuted: false,
      failureModeVerified: false,
      validationIssues: [],
    };
    const result = await runRequiredGates(config, {
      actualDirtyWorktreeHash: DIRTY_HASH,
      evidenceCommitSha: null,
      toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
      previousManifest: createPriorManifest(config),
      previousAttempts: [forged],
      execute: async (gate: RequiredGate) => ({ ...createAttempt(gate.id), attempt: 2 }),
      writeManifest: async () => undefined,
      writeReport: async () => undefined,
    } as never);

    expect(result.exitCode).toBe(1);
    expect(result.status).toBe("BLOCKED");
    expect(result.attempts[0]?.validationIssues).toEqual(
      expect.arrayContaining(["target_not_executed", "failure_mode_unverified"]),
    );
  });

  it.each([
    ["unknown gate", { gateId: "unknown" }],
    ["required mismatch", { required: false }],
    ["evidence-level mismatch", { declaredEvidenceLevel: "STRUCTURAL_CHECK" as const }],
  ])("fails closed on prior declaration rebinding: %s", async (_name, changes) => {
    const config = createSingleGateConfig();
    await expect(
      runRequiredGates(config, {
        actualDirtyWorktreeHash: DIRTY_HASH,
        evidenceCommitSha: null,
        toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
        previousManifest: createPriorManifest(config),
        previousAttempts: [{ ...createAttempt("first"), ...changes }],
        execute: async (gate: RequiredGate) => ({ ...createAttempt(gate.id), attempt: 2 }),
        writeManifest: async () => undefined,
        writeReport: async () => undefined,
      } as never),
    ).rejects.toThrow("previous_attempts_invalid");
  });

  it("fails closed when a prior command argv does not match the current code-owned policy", async () => {
    const config = createSingleGateConfig();
    const prior = createAttempt("first");
    if (!prior.command) throw new Error("test_fixture_command_missing");
    prior.command.argv = [process.execPath, "forged-history.js"];
    await expect(
      runRequiredGates(config, {
        actualDirtyWorktreeHash: DIRTY_HASH,
        evidenceCommitSha: null,
        toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
        previousManifest: createPriorManifest(config),
        previousAttempts: [prior],
        execute: async (gate: RequiredGate) => ({ ...createAttempt(gate.id), attempt: 2 }),
        writeManifest: async () => undefined,
        writeReport: async () => undefined,
      } as never),
    ).rejects.toThrow("previous_attempts_invalid");
  });

  it("rejects a prior envelope manifest bound to a different subject", async () => {
    const config = createSingleGateConfig();
    await expect(
      runRequiredGates(config, {
        actualDirtyWorktreeHash: DIRTY_HASH,
        evidenceCommitSha: null,
        toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
        previousManifest: createPriorManifest(config, { commitSha: "e".repeat(40) }),
        previousAttempts: [createAttempt("first")],
        execute: async (gate: RequiredGate) => ({ ...createAttempt(gate.id), attempt: 2 }),
        writeManifest: async () => undefined,
        writeReport: async () => undefined,
      } as never),
    ).rejects.toThrow("previous_evidence_subject_mismatch");
  });

  it("runs later gates but returns non-zero when any required gate is non-PASS", async () => {
    const order: string[] = [];

    const result = await runRequiredGates(createConfig(), {
      actualDirtyWorktreeHash: DIRTY_HASH,
      evidenceCommitSha: null,
      toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
      previousAttempts: [],
      execute: async (gate) => {
        order.push(gate.id);
        return gate.id === "first" ? createAttempt(gate.id, "BLOCKED") : createAttempt(gate.id);
      },
      writeManifest: async () => undefined,
      writeReport: async () => undefined,
    });

    expect(order).toEqual(["first", "second"]);
    expect(result.status).toBe("BLOCKED");
    expect(result.exitCode).toBe(1);
    expect(result.attempts).toHaveLength(2);
  });

  it("orders historical and current commands chronologically and preserves a pre-command BLOCKED attempt", async () => {
    const config = createSingleGateConfig();
    const prior = createAttempt("first");
    const result = await runRequiredGates(config, {
      actualDirtyWorktreeHash: DIRTY_HASH,
      evidenceCommitSha: null,
      toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
      observedToolCommands: [
        createToolCommand("2026-07-20T08:00:00.000Z", "2026-07-20T08:00:01.000Z"),
      ],
      previousManifest: createPriorManifest(config),
      previousAttempts: [prior],
      execute: async () => {
        throw new Error("command_not_found");
      },
      writeManifest: async () => undefined,
      writeReport: async () => undefined,
    });

    expect(result.exitCode).toBe(1);
    expect(result.status).toBe("BLOCKED");
    expect(EvidenceManifestSchema.safeParse(result.manifest).success).toBe(true);
    expect(Date.parse(result.manifest.finishedAt)).toBeGreaterThanOrEqual(
      Date.parse(result.manifest.startedAt),
    );
    expect(result.manifest.commands.map((command) => command.startedAt)).toEqual([
      STARTED_AT,
      "2026-07-20T08:00:00.000Z",
    ]);
    expect(result.attempts[1]?.errorCodes).toContain("command_not_found");
  });

  it.each(["FAIL", "SKIPPED"] as const)(
    "keeps optional %s in attempts/report without blocking or entering authority commands",
    async (optionalStatus) => {
      const config = createConfig();
      const optionalGate = config.gates[1];
      if (!optionalGate) throw new Error("test_fixture_gate_missing");
      optionalGate.required = false;
      const writeReport = vi.fn(async (_path: string, _report: string) => undefined);
      const result = await runRequiredGates(config, {
        actualDirtyWorktreeHash: DIRTY_HASH,
        evidenceCommitSha: null,
        toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
        previousAttempts: [],
        execute: async (gate) => {
          if (gate.required) return createAttempt(gate.id);
          if (optionalStatus === "FAIL") return createAttempt(gate.id, "FAIL");
          return {
            ...createAttempt(gate.id, "SKIPPED"),
            evidenceLevel: "SKIPPED",
            command: null,
            targetExecuted: false,
            failureModeVerified: false,
          };
        },
        writeManifest: async () => undefined,
        writeReport,
      });

      expect(result.exitCode).toBe(0);
      expect(result.status).toBe("PASS");
      expect(result.attempts).toHaveLength(2);
      expect(result.attempts[1]?.status).toBe(optionalStatus);
      expect(result.manifest.commands).toHaveLength(1);
      expect(result.manifest.commands[0]?.exitCode).toBe(0);
      expect(writeReport.mock.calls[0]?.[1]).toContain("second");
      expect(EvidenceManifestSchema.safeParse(result.manifest).success).toBe(true);
    },
  );

  it("fails closed when a required gate attempts to report SKIPPED", async () => {
    const result = await runRequiredGates(createSingleGateConfig(), {
      actualDirtyWorktreeHash: DIRTY_HASH,
      evidenceCommitSha: null,
      toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
      previousAttempts: [],
      execute: async (gate) => ({
        ...createAttempt(gate.id, "SKIPPED"),
        evidenceLevel: "SKIPPED",
        command: null,
        targetExecuted: false,
        failureModeVerified: false,
      }),
      writeManifest: async () => undefined,
      writeReport: async () => undefined,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.exitCode).toBe(1);
    expect(result.attempts[0]?.validationIssues).toContain("required_gate_skipped");
  });

  it("rebinds a repeated SKIPPED attempt by its persisted declaration and appends history", async () => {
    const config = createSingleGateConfig();
    const gate = config.gates[0];
    if (!gate) throw new Error("test_fixture_gate_missing");
    gate.skip = true;
    const prior = {
      ...createAttempt("first", "SKIPPED"),
      declaredEvidenceLevel: "REAL_TEST" as const,
      evidenceLevel: "SKIPPED" as const,
      command: null,
      targetExecuted: false,
      failureModeVerified: false,
      validationIssues: [],
    };
    const result = await runRequiredGates(config, {
      actualDirtyWorktreeHash: DIRTY_HASH,
      evidenceCommitSha: null,
      toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
      previousManifest: createPriorManifest(config, {
        evidenceLevel: "SCENARIO_REGISTERED",
        status: "BLOCKED",
        commands: [],
      }),
      previousAttempts: [prior],
      execute: async () => {
        throw new Error("skipped_gate_must_not_execute");
      },
      writeManifest: async () => undefined,
      writeReport: async () => undefined,
    } as never);

    expect(result.exitCode).toBe(1);
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts.map((attempt) => attempt.status)).toEqual(["SKIPPED", "SKIPPED"]);
    expect(result.attempts[0]?.validationIssues).toEqual(
      expect.arrayContaining(["required_gate_skipped", "evidence_level_mismatch"]),
    );
  });

  it("fails closed when an executor throws for a missing command and still records the attempt", async () => {
    const result = await runRequiredGates(createSingleGateConfig(), {
      actualDirtyWorktreeHash: DIRTY_HASH,
      evidenceCommitSha: null,
      toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
      previousAttempts: [],
      execute: async () => {
        throw new Error("command_not_found");
      },
      writeManifest: async () => undefined,
      writeReport: async () => undefined,
    });

    expect(result.status).toBe("BLOCKED");
    expect(result.exitCode).toBe(1);
    expect(result.attempts).toHaveLength(1);
    expect(result.attempts[0]).toMatchObject({
      gateId: "first",
      status: "BLOCKED",
      errorCodes: ["command_not_found"],
      targetExecuted: false,
    });
  });

  it("rejects malformed previous attempt envelopes before reuse", async () => {
    const config = createSingleGateConfig();
    await expect(
      runRequiredGates(config, {
        actualDirtyWorktreeHash: DIRTY_HASH,
        evidenceCommitSha: null,
        toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
        previousManifest: createPriorManifest(config),
        previousAttempts: [
          {
            gateId: "first",
            attempt: -1,
            required: false,
            status: "PASS",
          },
        ] as never,
        execute: async (gate) => createAttempt(gate.id),
        writeManifest: async () => undefined,
        writeReport: async () => undefined,
      }),
    ).rejects.toThrow("previous_attempts_invalid");
  });

  it("rejects config attempts to self-authorize argv or self-report observed facts", async () => {
    const config = createSingleGateConfig();
    Object.assign(config.gates[0] ?? {}, {
      argv: [process.execPath, "-e", "process.stdout.write(JSON.stringify(process.env))"],
      allowedArgv: [[process.execPath, "--version"]],
      assertions: [{ name: "forged", status: "passed" }],
      failureModeVerified: true,
      serviceStatus: "healthy",
      artifactHashes: [OUTPUT_HASH],
    });

    await expect(
      runRequiredGates(config, {
        actualDirtyWorktreeHash: DIRTY_HASH,
        evidenceCommitSha: null,
        toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
        previousAttempts: [],
        execute: async (gate) => createAttempt(gate.id),
        writeManifest: async () => undefined,
        writeReport: async () => undefined,
      }),
    ).rejects.toThrow("harness_config_invalid");
  });

  it.each([
    "/absolute/reports/ms0/raw/command.log",
    "reports/ms0/raw/../escape.log",
    "reports\\ms0\\raw\\command.log",
  ])("rejects an unsafe persisted raw-log reference: %s", async (rawLogReference) => {
    const config = createSingleGateConfig();
    const prior = { ...createAttempt("first"), rawLogReference };
    await expect(
      runRequiredGates(config, {
        actualDirtyWorktreeHash: DIRTY_HASH,
        evidenceCommitSha: null,
        toolVersions: { node: "v24.11.0", pnpm: "10.33.2" },
        previousManifest: createPriorManifest(config),
        previousAttempts: [prior],
        execute: async (gate) => ({ ...createAttempt(gate.id), attempt: 2 }),
        writeManifest: async () => undefined,
        writeReport: async () => undefined,
      }),
    ).rejects.toThrow("previous_attempts_invalid");
  });
});

type AtomicEvidenceWriter = (
  repositoryRoot: string,
  path: string,
  value: string,
  dependencies?: { beforeRename?: () => void | Promise<void> },
) => Promise<void>;

function atomicWriter(): AtomicEvidenceWriter {
  const writer = (harnessModule as { writeEvidenceAtomically?: AtomicEvidenceWriter })
    .writeEvidenceAtomically;
  if (!writer) throw new Error("atomic_writer_missing");
  return writer;
}

describe("atomic evidence persistence", () => {
  it("preserves old bytes on a pre-rename interruption and atomically replaces with a valid envelope", async () => {
    const root = await mkdtemp(join(tmpdir(), "sartre-atomic-evidence-"));
    temporaryDirectories.push(root);
    const relativePath = "reports/ms0/evidence/manifest.json";
    const absolutePath = join(root, relativePath);
    mkdirSync(join(root, "reports", "ms0", "evidence"), { recursive: true });
    writeFileSync(absolutePath, "old-manifest-bytes\n");
    await expect(
      atomicWriter()(root, relativePath, "new-but-interrupted\n", {
        beforeRename: () => {
          throw new Error("simulated_interruption");
        },
      }),
    ).rejects.toThrow("simulated_interruption");
    expect(readFileSync(absolutePath, "utf8")).toBe("old-manifest-bytes\n");
    expect(readdirSync(join(root, "reports", "ms0", "evidence"))).toEqual(["manifest.json"]);

    const config = createSingleGateConfig();
    const envelope = { manifest: createPriorManifest(config), attempts: [createAttempt("first")] };
    await atomicWriter()(root, relativePath, `${JSON.stringify(envelope)}\n`);
    const parsed = JSON.parse(readFileSync(absolutePath, "utf8")) as typeof envelope;
    expect(EvidenceManifestSchema.safeParse(parsed.manifest).success).toBe(true);
    expect(parsed.attempts).toHaveLength(1);
  });
});

describe("Task 3 ledger state", () => {
  it("records specification approval and the active code-quality WITH FIXES state", () => {
    const ledger = readFileSync(
      join(
        process.cwd(),
        "reports",
        "ms0-repository-constitution",
        "checkpoints",
        "PLAN_LEDGER.md",
      ),
      "utf8",
    );
    expect(ledger).toContain("third specification re-review APPROVED");
    expect(ledger).toContain("code-quality review returned WITH FIXES");
    expect(ledger).toContain("same-quality re-review");
  });
});

type ObserveRepositorySubject = (
  root: string,
  declaration: HarnessConfig["subject"],
) => Promise<{
  commitSha: string;
  subjectTreeHash: string;
  dirtyWorktreeHash: string;
  evidenceCommitSha: string | null;
}>;

function git(root: string, args: string[]): string {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

async function createGitRepository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "sartre-harness-subject-"));
  temporaryDirectories.push(root);
  git(root, ["init", "--quiet"]);
  writeFileSync(join(root, "subject.txt"), "subject\n");
  git(root, ["add", "subject.txt"]);
  git(root, [
    "-c",
    "user.name=Sartre Harness",
    "-c",
    "user.email=harness@example.invalid",
    "commit",
    "--quiet",
    "-m",
    "subject",
  ]);
  return root;
}

function repositoryDirtyHash(root: string): string {
  const input = buildRepositoryWorktreeGitleaksInput(root);
  if (!input) throw new Error("test_subject_observation_failed");
  return createHash("sha256").update(input).digest("hex");
}

function observer(): ObserveRepositorySubject {
  const value = (harnessModule as { observeRepositorySubject?: ObserveRepositorySubject })
    .observeRepositorySubject;
  if (!value) throw new Error("subject_observer_missing");
  return value;
}

describe("observeRepositorySubject", () => {
  it("rejects a declared dirty hash that differs from the physical repository observation", async () => {
    const root = await createGitRepository();
    const commitSha = git(root, ["rev-parse", "HEAD"]);
    const subjectTreeHash = git(root, ["rev-parse", "HEAD^{tree}"]);

    await expect(
      observer()(root, {
        gitMode: "subject-head",
        commitSha,
        subjectTreeHash,
        dirtyWorktreeHash: "e".repeat(64),
        releaseVersion: "0.1.0",
        imageDigest: null,
        electronArtifactHash: null,
        environmentId: "subject-test",
      }),
    ).rejects.toThrow("dirty_worktree_hash_mismatch");
  }, 15_000);

  it("observes and verifies the real evidence-child relationship instead of using null", async () => {
    const root = await createGitRepository();
    const commitSha = git(root, ["rev-parse", "HEAD"]);
    const subjectTreeHash = git(root, ["rev-parse", "HEAD^{tree}"]);
    writeFileSync(join(root, "evidence.txt"), "evidence\n");
    git(root, ["add", "evidence.txt"]);
    git(root, [
      "-c",
      "user.name=Sartre Harness",
      "-c",
      "user.email=harness@example.invalid",
      "commit",
      "--quiet",
      "-m",
      "evidence",
    ]);
    const evidenceCommitSha = git(root, ["rev-parse", "HEAD"]);
    const observed = await observer()(root, {
      gitMode: "evidence-child",
      commitSha,
      subjectTreeHash,
      dirtyWorktreeHash: repositoryDirtyHash(root),
      releaseVersion: "0.1.0",
      imageDigest: null,
      electronArtifactHash: null,
      environmentId: "evidence-child-test",
    });

    expect(observed.commitSha).toBe(commitSha);
    expect(observed.subjectTreeHash).toBe(subjectTreeHash);
    expect(observed.evidenceCommitSha).toBe(evidenceCommitSha);
    expect(observed.evidenceCommitSha).not.toBe(observed.commitSha);
  }, 15_000);
});
