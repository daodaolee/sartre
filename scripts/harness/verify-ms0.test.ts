import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  buildRepositoryWorktreeGitleaksInput,
  scanRepositorySecrets,
} from "../constitution/secret-boundary.js";
import {
  MS0_CLEAN_CLONE_REQUIRED_SUBGATE_IDS,
  MS0_REQUIRED_GATE_IDS,
  verifyMs0Evidence,
} from "./verify-ms0.js";

const IMAGE_DIGEST = `sha256:${"a".repeat(64)}`;
const ELECTRON_ARTIFACT_CONTENT = "fixture-dmg";
const ELECTRON_ARTIFACT_HASH = createHash("sha256").update(ELECTRON_ARTIFACT_CONTENT).digest("hex");
const CI_ARTIFACT_DIGEST = `sha256:${"c".repeat(64)}`;
const ENVIRONMENT_ID = "ms0-fixture";
const TOOL_VERSIONS = { node: "v24.11.0", pnpm: "10.33.2", gitleaks: "8.28.0" };
const STRUCTURAL_GATE_IDS = new Set([
  "format",
  "lint",
  "typecheck",
  "build",
  "architecture",
  "docker-context",
]);
const tsxCli = fileURLToPath(import.meta.resolve("tsx/cli"));
const verifierCli = resolve("scripts/harness/verify-ms0.ts");
const REPOSITORY_FIXTURE_TIMEOUT_MS = 30_000;

function git(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function write(root: string, path: string, content: string): void {
  const absolute = join(root, path);
  mkdirSync(join(absolute, ".."), { recursive: true });
  writeFileSync(absolute, content, "utf8");
}

function commitAll(root: string, message: string): string {
  git(root, ["add", "."]);
  git(root, ["commit", "-m", message]);
  return git(root, ["rev-parse", "HEAD"]);
}

function successfulCiRun(subject: string) {
  return {
    id: 42,
    headSha: subject,
    workflowPath: ".github/workflows/ms0-required.yml",
    status: "completed",
    conclusion: "success",
    htmlUrl: "https://example.invalid/actions/runs/42",
    jobs: ["constitution", "postgresql-17-6", "electron-macos-arm64"].map((name) => ({
      name,
      status: "completed",
      conclusion: "success",
    })),
    artifacts: [
      {
        name: `ms0-required-${subject}`,
        expired: false,
        digest: CI_ARTIFACT_DIGEST,
      },
    ],
  };
}

function createFakeGhBin(subject: string): string {
  const bin = mkdtempSync(join(tmpdir(), "sartre-ms0-fake-gh-"));
  const gh = join(bin, "gh");
  writeFileSync(
    gh,
    `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const args = process.argv.slice(2);
const joined = args.join(" ");
if (args[0] === "run" && args[1] === "download") {
  const destination = args[args.indexOf("-D") + 1];
  if (!destination) process.exit(2);
  fs.mkdirSync(destination, { recursive: true });
  fs.writeFileSync(path.join(destination, "Sartre-0.1.0-arm64.dmg"), ${JSON.stringify(ELECTRON_ARTIFACT_CONTENT)});
  fs.writeFileSync(path.join(destination, "artifact-sha256.txt"), ${JSON.stringify(
    `${ELECTRON_ARTIFACT_HASH}  Sartre-0.1.0-arm64.dmg\n`,
  )});
} else if (joined === "repo view --json nameWithOwner") {
  process.stdout.write(${JSON.stringify(`${JSON.stringify({ nameWithOwner: "fixture/repository" })}\n`)});
} else if (joined.endsWith("/jobs")) {
  process.stdout.write(${JSON.stringify(
    `${JSON.stringify({ jobs: successfulCiRun(subject).jobs })}\n`,
  )});
} else if (joined.endsWith("/artifacts")) {
  process.stdout.write(${JSON.stringify(
    `${JSON.stringify({ artifacts: successfulCiRun(subject).artifacts })}\n`,
  )});
} else if (joined.includes("actions/workflows/ms0-required.yml/runs")) {
  process.stdout.write(${JSON.stringify(
    `${JSON.stringify({
      workflow_runs: [
        {
          id: 42,
          head_sha: subject,
          path: ".github/workflows/ms0-required.yml",
          status: "completed",
          conclusion: "success",
          html_url: "https://example.invalid/actions/runs/42",
        },
      ],
    })}\n`,
  )});
} else {
  process.exit(2);
}
`,
    "utf8",
  );
  chmodSync(gh, 0o700);
  return bin;
}

function passingAttempt(gateId: string) {
  const evidenceLevel = STRUCTURAL_GATE_IDS.has(gateId) ? "STRUCTURAL_CHECK" : "REAL_TEST";
  return {
    gateId,
    attempt: 1,
    required: true,
    declaredEvidenceLevel: evidenceLevel,
    evidenceLevel,
    status: "PASS",
    command: {
      argv: ["pnpm", "run", gateId],
      exitCode: 0,
      startedAt: "2026-07-22T00:00:00.000Z",
      finishedAt: "2026-07-22T00:00:01.000Z",
      assertions: [{ name: `${gateId} passed`, status: "passed" }],
    },
    stdoutHash: "c".repeat(64),
    stderrHash: "d".repeat(64),
    testCount: 1,
    failureCount: 0,
    keyAssertions: [`${gateId} passed`],
    errorCodes: [],
    targetExecuted: true,
    failureModeVerified: true,
    serviceStatus: null,
    artifactHashes: gateId === "ms0-migration-image" ? [IMAGE_DIGEST.slice(7)] : [],
    validationIssues: [],
  };
}

interface FixtureRecords {
  readonly envelope: Record<string, unknown>;
  readonly closeout: Record<string, unknown>;
}

function createPassingEvidenceFixture(mutate?: (records: FixtureRecords) => void): {
  root: string;
  subject: string;
  evidenceCommit: string;
  subjectTreeHash: string;
} {
  const root = mkdtempSync(join(tmpdir(), "sartre-ms0-verifier-"));
  git(root, ["init", "-b", "fixture"]);
  git(root, ["config", "user.name", "Sartre Test"]);
  git(root, ["config", "user.email", "sartre-test@example.invalid"]);
  write(root, "subject.txt", "immutable subject\n");
  write(root, "reports/ms0-repository-constitution/evidence/schema-version.txt", "1\n");
  write(
    root,
    "reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md",
    "# PLAN_LEDGER\n\nTask 9: IN_PROGRESS\n",
  );
  write(
    root,
    "plan/00-master-plan.md",
    [
      "# Fixture Master Plan",
      "",
      "## 5. MS0：Repository Constitution 与证据基线",
      "",
      "MS0 body remains immutable.",
      "",
      "**状态：** 未开始。",
      "",
      "## 6. MS1：Identity",
      "",
      "MS1 body remains immutable.",
      "",
      "**状态：** 未开始。",
      "",
    ].join("\n"),
  );
  const subject = commitAll(root, "candidate subject");
  const subjectTreeHash = git(root, ["rev-parse", `${subject}^{tree}`]);
  const worktreeInput = buildRepositoryWorktreeGitleaksInput(root);
  if (!worktreeInput) throw new Error("fixture_dirty_hash_unavailable");
  const dirtyWorktreeHash = createHash("sha256").update(worktreeInput).digest("hex");

  const attempts = MS0_REQUIRED_GATE_IDS.map((gateId) => passingAttempt(gateId));
  const manifest = {
    schemaVersion: "1",
    commitSha: subject,
    subjectTreeHash,
    dirtyWorktreeHash,
    releaseVersion: "0.1.0",
    imageDigest: IMAGE_DIGEST,
    electronArtifactHash: ELECTRON_ARTIFACT_HASH,
    environmentId: ENVIRONMENT_ID,
    toolVersions: { ...TOOL_VERSIONS },
    evidenceLevel: "STRUCTURAL_CHECK",
    status: "PASS",
    startedAt: "2026-07-22T00:00:00.000Z",
    finishedAt: "2026-07-22T00:01:00.000Z",
    commands: [structuredClone(attempts[0]?.command)],
  };
  const closeout = {
    schemaVersion: "1",
    subject: { commitSha: subject, treeHash: subjectTreeHash, dirtyWorktreeHash },
    cleanClone: {
      status: "PASS",
      subjectCommit: subject,
      subjectTreeHash,
      beforeDirtyWorktreeHash: dirtyWorktreeHash,
      afterDirtyWorktreeHash: dirtyWorktreeHash,
      requiredSubgates: [...MS0_CLEAN_CLONE_REQUIRED_SUBGATE_IDS],
    },
    requiredCi: {
      status: "PASS",
      subjectCommit: subject,
      runId: 42,
      workflowPath: ".github/workflows/ms0-required.yml",
      requiredJobs: ["constitution", "postgresql-17-6", "electron-macos-arm64"],
      artifactDigest: CI_ARTIFACT_DIGEST,
      run: successfulCiRun(subject),
    },
    environment: {
      id: ENVIRONMENT_ID,
      databaseSchemaVersion: "000002_ms0_diagnostics",
      postgresServerVersion: 170006,
    },
    toolVersions: { ...TOOL_VERSIONS },
    artifacts: {
      migrationImageDigest: IMAGE_DIGEST,
      electronArtifactHash: ELECTRON_ARTIFACT_HASH,
    },
  };

  const envelope: Record<string, unknown> = { manifest, attempts };
  mutate?.({ envelope, closeout: closeout as unknown as Record<string, unknown> });
  write(
    root,
    "reports/ms0-repository-constitution/evidence/manifest.json",
    `${JSON.stringify(envelope, null, 2)}\n`,
  );
  write(
    root,
    "reports/ms0-repository-constitution/evidence/closeout.json",
    `${JSON.stringify(closeout, null, 2)}\n`,
  );
  write(
    root,
    "reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md",
    "# PLAN_LEDGER\n\nTask 9: DONE\n",
  );
  write(
    root,
    "reports/ms0-repository-constitution/checkpoints/closeout.md",
    "# MS0 closeout\n\nAll required gates PASS.\n",
  );
  write(
    root,
    "plan/00-master-plan.md",
    [
      "# Fixture Master Plan",
      "",
      "## 5. MS0：Repository Constitution 与证据基线",
      "",
      "MS0 body remains immutable.",
      "",
      "**状态：** 已关闭。",
      "",
      "## 6. MS1：Identity",
      "",
      "MS1 body remains immutable.",
      "",
      "**状态：** 未开始。",
      "",
    ].join("\n"),
  );
  const evidenceCommit = commitAll(root, "bind evidence");
  return { root, subject, evidenceCommit, subjectTreeHash };
}

function expectFixtureFailure(mutate: (records: FixtureRecords) => void, code: string): void {
  const fixture = createPassingEvidenceFixture(mutate);
  expect(() =>
    verifyMs0Evidence({
      repositoryRoot: fixture.root,
      evidenceCommit: fixture.evidenceCommit,
      subjectCommit: fixture.subject,
      scanEvidenceSecrets: () => [],
      loadCiRuns: () => [successfulCiRun(fixture.subject)],
      loadCiArtifactEvidence: () => ({ electronArtifactHash: ELECTRON_ARTIFACT_HASH }),
    }),
  ).toThrow(code);
}

function amendEvidenceFixture(
  fixture: ReturnType<typeof createPassingEvidenceFixture>,
  mutate: () => void,
): ReturnType<typeof createPassingEvidenceFixture> {
  mutate();
  git(fixture.root, ["add", "-A"]);
  git(fixture.root, ["commit", "--amend", "--no-edit"]);
  return { ...fixture, evidenceCommit: git(fixture.root, ["rev-parse", "HEAD"]) };
}

function expectCommittedFixtureFailure(
  fixture: ReturnType<typeof createPassingEvidenceFixture>,
  code: string,
): void {
  expect(() =>
    verifyMs0Evidence({
      repositoryRoot: fixture.root,
      evidenceCommit: fixture.evidenceCommit,
      subjectCommit: fixture.subject,
      scanEvidenceSecrets: () => [],
      loadCiRuns: () => [successfulCiRun(fixture.subject)],
      loadCiArtifactEvidence: () => ({ electronArtifactHash: ELECTRON_ARTIFACT_HASH }),
    }),
  ).toThrow(code);
}

describe("MS0 final evidence verifier", { timeout: REPOSITORY_FIXTURE_TIMEOUT_MS }, () => {
  it("keeps the required CI artifact download bounded with a 15-minute budget", () => {
    const verifier = readFileSync(verifierCli, "utf8");

    expect(verifier).toContain("const CI_ARTIFACT_DOWNLOAD_TIMEOUT_MS = 900_000;");
    expect(verifier).toContain("timeout: CI_ARTIFACT_DOWNLOAD_TIMEOUT_MS");
  });

  it("accepts a complete evidence-only child bound to its immutable subject", () => {
    const fixture = createPassingEvidenceFixture();

    expect(
      verifyMs0Evidence({
        repositoryRoot: fixture.root,
        evidenceCommit: fixture.evidenceCommit,
        subjectCommit: fixture.subject,
        scanEvidenceSecrets: () => [],
        loadCiRuns: () => [successfulCiRun(fixture.subject)],
        loadCiArtifactEvidence: () => ({ electronArtifactHash: ELECTRON_ARTIFACT_HASH }),
      }),
    ).toEqual({
      evidenceCommit: fixture.evidenceCommit,
      subjectCommit: fixture.subject,
      subjectTreeHash: fixture.subjectTreeHash,
      gateIds: [...MS0_REQUIRED_GATE_IDS],
      ciRunId: 42,
    });
  });

  it.each([
    ["direct", false],
    ["pnpm forwarded", true],
  ])("accepts the %s evidence and subject argv shape", (_case, forwarded) => {
    const fixture = createPassingEvidenceFixture();
    const args = [
      ...(forwarded ? ["--"] : []),
      "--evidence-commit",
      fixture.evidenceCommit,
      "--subject-commit",
      fixture.subject,
    ];

    const result = spawnSync(process.execPath, [tsxCli, verifierCli, ...args], {
      cwd: fixture.root,
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${createFakeGhBin(fixture.subject)}:${process.env.PATH ?? ""}`,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      evidenceCommit: fixture.evidenceCommit,
      subjectCommit: fixture.subject,
      ciRunId: 42,
    });
  });

  it("rejects an unknown manifest envelope field", () => {
    expectFixtureFailure(({ envelope }) => {
      envelope.unexpected = true;
    }, "final_evidence_envelope_invalid");
  });

  it("rejects an unknown closeout field", () => {
    expectFixtureFailure((records) => {
      records.closeout.unexpected = true;
    }, "final_closeout_schema_invalid");
  });

  it("rejects an unknown nested closeout field", () => {
    expectFixtureFailure(({ closeout }) => {
      const subject = closeout.subject as Record<string, unknown>;
      subject.unexpected = true;
    }, "final_closeout_schema_invalid");
  });

  it("rejects an unknown gate-attempt field", () => {
    expectFixtureFailure(({ envelope }) => {
      const attempts = envelope.attempts as Record<string, unknown>[];
      const first = attempts[0];
      if (first) first.unexpected = true;
    }, "final_evidence_envelope_invalid");
  });

  it("rejects a missing required gate", () => {
    expectFixtureFailure(({ envelope }) => {
      const attempts = envelope.attempts as Record<string, unknown>[];
      attempts.pop();
    }, "final_required_gate_set_invalid");
  });

  it("rejects a duplicate required gate", () => {
    expectFixtureFailure(({ envelope }) => {
      const attempts = envelope.attempts as Record<string, unknown>[];
      const first = attempts[0];
      if (first) attempts.push({ ...first });
    }, "final_required_gate_set_invalid");
  });

  it("rejects an unknown required gate", () => {
    expectFixtureFailure(({ envelope }) => {
      const attempts = envelope.attempts as Record<string, unknown>[];
      const first = attempts[0];
      if (first) first.gateId = "unknown-gate";
    }, "final_required_gate_set_invalid");
  });

  it("rejects a gate that is not required", () => {
    expectFixtureFailure(({ envelope }) => {
      const attempts = envelope.attempts as Record<string, unknown>[];
      const first = attempts[0];
      if (first) first.required = false;
    }, "final_required_gate_invalid");
  });

  it("rejects a required gate that is not PASS", () => {
    expectFixtureFailure(({ envelope }) => {
      const attempts = envelope.attempts as Record<string, unknown>[];
      const first = attempts[0];
      if (first) first.status = "SKIPPED";
    }, "final_required_gate_invalid");
  });

  it.each([
    ["BLOCKED aggregate", "SCENARIO_REGISTERED", "BLOCKED"],
    ["SKIPPED aggregate", "SKIPPED", "SKIPPED"],
  ])("rejects a %s", (_case, evidenceLevel, status) => {
    expectFixtureFailure(({ envelope }) => {
      const manifest = envelope.manifest as Record<string, unknown>;
      manifest.evidenceLevel = evidenceLevel;
      manifest.status = status;
    }, "final_aggregate_evidence_invalid");
  });

  it("rejects evidence bound to a different subject", () => {
    expectFixtureFailure(({ envelope, closeout }) => {
      const otherSubject = "f".repeat(40);
      const manifest = envelope.manifest as Record<string, unknown>;
      const closeoutSubject = closeout.subject as Record<string, unknown>;
      manifest.commitSha = otherSubject;
      closeoutSubject.commitSha = otherSubject;
    }, "evidence_manifest_subject_mismatch");
  });

  it("rejects a reported subject tree that differs from the detached subject", () => {
    expectFixtureFailure(({ envelope, closeout }) => {
      const wrongTree = "e".repeat(40);
      const manifest = envelope.manifest as Record<string, unknown>;
      const closeoutSubject = closeout.subject as Record<string, unknown>;
      const cleanClone = closeout.cleanClone as Record<string, unknown>;
      manifest.subjectTreeHash = wrongTree;
      closeoutSubject.treeHash = wrongTree;
      cleanClone.subjectTreeHash = wrongTree;
    }, "final_subject_binding_mismatch");
  });

  it("rejects a reported dirty hash that differs from the detached subject", () => {
    expectFixtureFailure(({ envelope, closeout }) => {
      const wrongDirtyHash = "e".repeat(64);
      const manifest = envelope.manifest as Record<string, unknown>;
      const closeoutSubject = closeout.subject as Record<string, unknown>;
      const cleanClone = closeout.cleanClone as Record<string, unknown>;
      manifest.dirtyWorktreeHash = wrongDirtyHash;
      closeoutSubject.dirtyWorktreeHash = wrongDirtyHash;
      cleanClone.beforeDirtyWorktreeHash = wrongDirtyHash;
      cleanClone.afterDirtyWorktreeHash = wrongDirtyHash;
    }, "final_subject_binding_mismatch");
  });

  it("rejects a non-v1 evidence manifest", () => {
    expectFixtureFailure(({ envelope }) => {
      const manifest = envelope.manifest as Record<string, unknown>;
      manifest.schemaVersion = "2";
    }, "final_evidence_binding_mismatch");
  });

  it("rejects a non-MS0 database schema version", () => {
    expectFixtureFailure(({ closeout }) => {
      const environment = closeout.environment as Record<string, unknown>;
      environment.databaseSchemaVersion = "000001_ms0_process_health";
    }, "final_closeout_schema_invalid");
  });

  it("rejects an environment binding mismatch", () => {
    expectFixtureFailure(({ closeout }) => {
      const environment = closeout.environment as Record<string, unknown>;
      environment.id = "another-environment";
    }, "final_evidence_binding_mismatch");
  });

  it("rejects a tool-version binding mismatch", () => {
    expectFixtureFailure(({ closeout }) => {
      const toolVersions = closeout.toolVersions as Record<string, unknown>;
      toolVersions.node = "24.11.1";
    }, "final_evidence_binding_mismatch");
  });

  it("rejects self-consistent but unapproved tool versions", () => {
    expectFixtureFailure(({ envelope, closeout }) => {
      const manifest = envelope.manifest as Record<string, unknown>;
      manifest.toolVersions = { bogus: "bogus" };
      closeout.toolVersions = { bogus: "bogus" };
    }, "final_tool_versions_invalid");
  });

  it("requires the migration-image gate to bind the image digest", () => {
    expectFixtureFailure(({ envelope }) => {
      const attempts = envelope.attempts as Record<string, unknown>[];
      const migrationImage = attempts.find((attempt) => attempt.gateId === "ms0-migration-image");
      if (migrationImage) migrationImage.artifactHashes = [];
    }, "final_migration_image_binding_mismatch");
  });

  it("rejects a null migration image digest", () => {
    expectFixtureFailure(({ envelope }) => {
      const manifest = envelope.manifest as Record<string, unknown>;
      manifest.imageDigest = null;
    }, "final_migration_image_binding_mismatch");
  });

  it("rejects a null Electron artifact hash", () => {
    expectFixtureFailure(({ envelope }) => {
      const manifest = envelope.manifest as Record<string, unknown>;
      manifest.electronArtifactHash = null;
    }, "final_evidence_binding_mismatch");
  });

  it("rejects closeout artifact hashes that do not bind the manifest", () => {
    expectFixtureFailure(({ closeout }) => {
      const artifacts = closeout.artifacts as Record<string, unknown>;
      artifacts.migrationImageDigest = `sha256:${"f".repeat(64)}`;
      artifacts.electronArtifactHash = "f".repeat(64);
    }, "final_evidence_binding_mismatch");
  });

  it("rejects a clean-clone record that is not PASS", () => {
    expectFixtureFailure(({ closeout }) => {
      const cleanClone = closeout.cleanClone as Record<string, unknown>;
      cleanClone.status = "BLOCKED";
    }, "final_clean_clone_binding_mismatch");
  });

  it("rejects clean-clone evidence for another subject", () => {
    expectFixtureFailure(({ closeout }) => {
      const cleanClone = closeout.cleanClone as Record<string, unknown>;
      cleanClone.subjectCommit = "f".repeat(40);
    }, "final_clean_clone_binding_mismatch");
  });

  it("rejects a clean-clone subject-tree mismatch", () => {
    expectFixtureFailure(({ closeout }) => {
      const cleanClone = closeout.cleanClone as Record<string, unknown>;
      cleanClone.subjectTreeHash = "f".repeat(40);
    }, "final_clean_clone_binding_mismatch");
  });

  it("rejects clean-clone before/after dirty-hash mismatch", () => {
    expectFixtureFailure(({ closeout }) => {
      const cleanClone = closeout.cleanClone as Record<string, unknown>;
      cleanClone.beforeDirtyWorktreeHash = "f".repeat(64);
      cleanClone.afterDirtyWorktreeHash = "f".repeat(64);
    }, "final_clean_clone_binding_mismatch");
  });

  it("rejects a missing clean-clone required subgate", () => {
    expectFixtureFailure(({ closeout }) => {
      const cleanClone = closeout.cleanClone as Record<string, unknown>;
      const requiredSubgates = cleanClone.requiredSubgates as string[];
      requiredSubgates.pop();
    }, "final_clean_clone_binding_mismatch");
  });

  it("rejects a declared CI run id that does not match the verified run", () => {
    expectFixtureFailure(({ closeout }) => {
      const requiredCi = closeout.requiredCi as Record<string, unknown>;
      requiredCi.runId = 43;
    }, "final_ci_binding_mismatch");
  });

  it("rejects a recorded CI run for another subject", () => {
    expectFixtureFailure(({ closeout }) => {
      const requiredCi = closeout.requiredCi as Record<string, unknown>;
      const run = requiredCi.run as Record<string, unknown>;
      run.headSha = "f".repeat(40);
    }, "required_ci_subject_mismatch");
  });

  it("rejects a recorded CI run from another workflow", () => {
    expectFixtureFailure(({ closeout }) => {
      const requiredCi = closeout.requiredCi as Record<string, unknown>;
      const run = requiredCi.run as Record<string, unknown>;
      run.workflowPath = ".github/workflows/other.yml";
    }, "required_ci_workflow_mismatch");
  });

  it("rejects a non-PASS recorded required CI job", () => {
    expectFixtureFailure(({ closeout }) => {
      const requiredCi = closeout.requiredCi as Record<string, unknown>;
      const run = requiredCi.run as Record<string, unknown>;
      const jobs = run.jobs as Record<string, unknown>[];
      const first = jobs[0];
      if (first) first.conclusion = "skipped";
    }, "required_ci_job_skipped");
  });

  it("rejects a declared CI artifact digest that differs from the verified run", () => {
    expectFixtureFailure(({ closeout }) => {
      const requiredCi = closeout.requiredCi as Record<string, unknown>;
      requiredCi.artifactDigest = `sha256:${"f".repeat(64)}`;
    }, "final_ci_binding_mismatch");
  });

  it("rejects a downloaded CI artifact whose DMG hash differs from the manifest", () => {
    const fixture = createPassingEvidenceFixture();
    expect(() =>
      verifyMs0Evidence({
        repositoryRoot: fixture.root,
        evidenceCommit: fixture.evidenceCommit,
        subjectCommit: fixture.subject,
        scanEvidenceSecrets: () => [],
        loadCiRuns: () => [successfulCiRun(fixture.subject)],
        loadCiArtifactEvidence: () => ({ electronArtifactHash: "f".repeat(64) }),
      }),
    ).toThrow("final_evidence_binding_mismatch");
  });

  it("rejects a required attempt with validation issues", () => {
    expectFixtureFailure(({ envelope }) => {
      const attempts = envelope.attempts as Record<string, unknown>[];
      const first = attempts[0];
      if (first) first.validationIssues = ["target_not_executed"];
    }, "final_required_gate_evidence_invalid");
  });

  it("rejects a required attempt without an executed command", () => {
    expectFixtureFailure(({ envelope }) => {
      const attempts = envelope.attempts as Record<string, unknown>[];
      const first = attempts[0];
      if (first) first.command = null;
    }, "final_required_gate_evidence_invalid");
  });

  it("rejects a PASS attempt with a failed command and assertion", () => {
    expectFixtureFailure(({ envelope }) => {
      const attempts = envelope.attempts as Record<string, unknown>[];
      const first = attempts[0];
      const command = first?.command as Record<string, unknown> | undefined;
      const assertions = command?.assertions as Record<string, unknown>[] | undefined;
      if (command) command.exitCode = 1;
      if (assertions?.[0]) assertions[0].status = "failed";
    }, "final_required_gate_evidence_invalid");
  });

  it("rejects an evidence level that differs from the code-owned declaration", () => {
    expectFixtureFailure(({ envelope }) => {
      const attempts = envelope.attempts as Record<string, unknown>[];
      const format = attempts.find((attempt) => attempt.gateId === "format");
      if (format) {
        format.declaredEvidenceLevel = "REAL_TEST";
        format.evidenceLevel = "REAL_TEST";
      }
    }, "final_required_gate_evidence_invalid");
  });

  it("rejects an evidence child containing a Secret through the default CLI scanner", () => {
    const fixture = createPassingEvidenceFixture();
    const assignmentName = ["SARTRE", "CODEX", "TEST", "API", "KEY"].join("_");
    write(
      fixture.root,
      "reports/ms0-repository-constitution/checkpoints/closeout.md",
      `# MS0 closeout\n\n${assignmentName}=fixture-${"sensitive"}\n`,
    );
    git(fixture.root, ["add", "reports/ms0-repository-constitution/checkpoints/closeout.md"]);
    git(fixture.root, ["commit", "--amend", "--no-edit"]);
    const evidenceCommit = git(fixture.root, ["rev-parse", "HEAD"]);
    const result = spawnSync(
      process.execPath,
      [
        tsxCli,
        verifierCli,
        "--evidence-commit",
        evidenceCommit,
        "--subject-commit",
        fixture.subject,
      ],
      {
        cwd: fixture.root,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${createFakeGhBin(fixture.subject)}:${process.env.PATH ?? ""}`,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe("final_evidence_secret_boundary_failed");
  });

  it("runs pinned gitleaks in addition to the supplemental evidence scanner", () => {
    const fixture = createPassingEvidenceFixture();
    const assignmentName = ["GENERIC", "API", "KEY"].join("_");
    const syntheticValue = ["a3F9", "Zk8Q", "m2Lp", "R7vX", "c4Nd", "T9sW", "h6Jy"].join("");
    write(
      fixture.root,
      "reports/ms0-repository-constitution/checkpoints/closeout.md",
      `# MS0 closeout\n\n${assignmentName}=${syntheticValue}\n`,
    );
    git(fixture.root, ["add", "reports/ms0-repository-constitution/checkpoints/closeout.md"]);
    git(fixture.root, ["commit", "--amend", "--no-edit"]);
    const evidenceCommit = git(fixture.root, ["rev-parse", "HEAD"]);
    expect(scanRepositorySecrets(fixture.root)).toEqual([]);
    const result = spawnSync(
      process.execPath,
      [
        tsxCli,
        verifierCli,
        "--evidence-commit",
        evidenceCommit,
        "--subject-commit",
        fixture.subject,
      ],
      {
        cwd: fixture.root,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${createFakeGhBin(fixture.subject)}:${process.env.PATH ?? ""}`,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr.trim()).toBe("final_evidence_secret_boundary_failed");
  });

  it("rejects deletion of the required evidence ledger", () => {
    const fixture = createPassingEvidenceFixture();
    const amended = amendEvidenceFixture(fixture, () => {
      rmSync(join(fixture.root, "reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md"));
    });

    expectCommittedFixtureFailure(amended, "final_evidence_file_mode_invalid");
  });

  it("rejects a symlink at the required closeout checkpoint path", () => {
    const fixture = createPassingEvidenceFixture();
    const closeoutPath = join(
      fixture.root,
      "reports/ms0-repository-constitution/checkpoints/closeout.md",
    );
    const amended = amendEvidenceFixture(fixture, () => {
      rmSync(closeoutPath);
      symlinkSync("PLAN_LEDGER.md", closeoutPath);
    });

    expectCommittedFixtureFailure(amended, "final_evidence_file_mode_invalid");
  });

  it("rejects rename of a required evidence path", () => {
    const fixture = createPassingEvidenceFixture();
    const checkpointRoot = join(fixture.root, "reports/ms0-repository-constitution/checkpoints");
    const amended = amendEvidenceFixture(fixture, () => {
      renameSync(join(checkpointRoot, "closeout.md"), join(checkpointRoot, "renamed.md"));
    });

    expectCommittedFixtureFailure(amended, "final_evidence_path_set_invalid");
  });
});
