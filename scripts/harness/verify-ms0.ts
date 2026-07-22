import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  EvidenceCommandSchema,
  EvidenceLevelSchema,
  type EvidenceManifest,
  EvidenceManifestSchema,
  EvidenceStatusSchema,
} from "../../packages/contracts/src/evidence.js";
import {
  runGitleaksGitScan,
  runGitleaksWorktreeScan,
  verifyPinnedGitleaks,
} from "../constitution/gitleaks-tool.js";
import {
  buildRepositoryWorktreeGitleaksInput,
  type SecretViolation,
  scanRepositorySecrets,
} from "../constitution/secret-boundary.js";
import { spawnSyncBounded } from "./bounded-process.js";
import type { GateAttempt } from "./run-required-gates.js";
import {
  type CiRunRecord,
  loadCiRuns,
  MS0_REQUIRED_CI_JOB_IDS,
  verifyCiRun,
} from "./verify-ci-run.js";
import { verifyEvidenceCommit } from "./verify-clean-clone.js";

export const MS0_REQUIRED_GATE_IDS = [
  "clean-clone",
  "required-ci",
  "format",
  "lint",
  "typecheck",
  "test",
  "build",
  "architecture",
  "secret",
  "docker-context",
  "artifact-secret",
  "postgresql-17-6",
  "migration",
  "ms0-migration-image",
  "health",
  "electron-e2e",
  "diagnostic-timeline",
  "negative-controls",
] as const;

export const MS0_CLEAN_CLONE_REQUIRED_SUBGATE_IDS = [
  "toolchain-bootstrap",
  "toolchain-check",
  "format",
  "lint",
  "build",
  "typecheck",
  "test",
  "architecture",
  "secret",
  "docker-context",
  "sast",
  "dependency",
  "license",
  "openspec",
  "contract",
  "spec",
] as const;

const MS0_STRUCTURAL_GATE_IDS = new Set([
  "format",
  "lint",
  "typecheck",
  "build",
  "architecture",
  "docker-context",
]);

const CI_ARTIFACT_DOWNLOAD_TIMEOUT_MS = 900_000;

const REQUIRED_EVIDENCE_PATHS = [
  "plan/00-master-plan.md",
  "reports/ms0-repository-constitution/checkpoints/PLAN_LEDGER.md",
  "reports/ms0-repository-constitution/checkpoints/closeout.md",
  "reports/ms0-repository-constitution/evidence/closeout.json",
  "reports/ms0-repository-constitution/evidence/manifest.json",
] as const;

interface VerifyMs0EvidenceOptions {
  readonly repositoryRoot: string;
  readonly evidenceCommit: string;
  readonly subjectCommit: string;
  readonly scanEvidenceSecrets?: (repositoryRoot: string) => readonly SecretViolation[];
  readonly loadCiRuns?: (subject: string) => readonly CiRunRecord[];
  readonly loadCiArtifactEvidence?: (
    repositoryRoot: string,
    closeout: CloseoutRecord,
  ) => CiArtifactEvidence;
}

interface CiArtifactEvidence {
  readonly electronArtifactHash: string;
}

export interface VerifiedMs0Evidence {
  readonly evidenceCommit: string;
  readonly subjectCommit: string;
  readonly subjectTreeHash: string;
  readonly gateIds: readonly (typeof MS0_REQUIRED_GATE_IDS)[number][];
  readonly ciRunId: number;
}

interface CloseoutRecord {
  readonly schemaVersion: "1";
  readonly subject: {
    readonly commitSha: string;
    readonly treeHash: string;
    readonly dirtyWorktreeHash: string;
  };
  readonly cleanClone: {
    readonly status: string;
    readonly subjectCommit: string;
    readonly subjectTreeHash: string;
    readonly beforeDirtyWorktreeHash: string;
    readonly afterDirtyWorktreeHash: string;
    readonly requiredSubgates: string[];
  };
  readonly requiredCi: {
    readonly status: "PASS";
    readonly subjectCommit: string;
    readonly runId: number;
    readonly workflowPath: string;
    readonly requiredJobs: string[];
    readonly artifactDigest: string;
    readonly run: CiRunRecord;
  };
  readonly environment: {
    readonly id: string;
    readonly databaseSchemaVersion: "000002_ms0_diagnostics";
    readonly postgresServerVersion: 170006;
  };
  readonly toolVersions: Record<string, string>;
  readonly artifacts: {
    readonly migrationImageDigest: string;
    readonly electronArtifactHash: string;
  };
}

interface EvidenceEnvelope {
  readonly manifest: EvidenceManifest;
  readonly attempts: GateAttempt[];
}

function scanFullEvidenceSecretBoundary(repositoryRoot: string): readonly SecretViolation[] {
  const toolRoot = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), "../.."));
  const toolReady = verifyPinnedGitleaks(toolRoot).length === 0;
  const gitleaksPassed =
    toolReady &&
    runGitleaksGitScan(repositoryRoot, false, toolRoot) &&
    runGitleaksWorktreeScan(repositoryRoot, toolRoot);
  const violations = scanRepositorySecrets(repositoryRoot);
  return gitleaksPassed
    ? violations
    : [{ ruleId: "secret-pattern", path: "<gitleaks-boundary>" }, ...violations];
}

function git(root: string, args: string[]): string {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    throw new Error("final_verifier_git_failed");
  }
}

function resolveCommit(root: string, value: string): string {
  const commit = git(root, ["rev-parse", `${value}^{commit}`]);
  if (!/^[0-9a-f]{40}$/u.test(commit)) throw new Error("final_verifier_commit_invalid");
  return commit;
}

function readJsonAtCommit(root: string, commit: string, path: string): unknown {
  const content = git(root, ["show", `${commit}:${path}`]);
  try {
    return JSON.parse(content);
  } catch {
    throw new Error("final_evidence_json_invalid");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    Object.keys(value).every((key) => allowed.has(key))
  );
}

function isGitHash(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/u.test(value);
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

function isImageDigest(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[0-9a-f]{64}$/u.test(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isGateAttempt(value: unknown): value is GateAttempt {
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      [
        "gateId",
        "attempt",
        "required",
        "declaredEvidenceLevel",
        "evidenceLevel",
        "status",
        "command",
        "stdoutHash",
        "stderrHash",
        "testCount",
        "failureCount",
        "keyAssertions",
        "errorCodes",
        "targetExecuted",
        "failureModeVerified",
        "serviceStatus",
        "artifactHashes",
      ],
      ["rawLogReference", "validationIssues"],
    )
  ) {
    return false;
  }
  return (
    typeof value.gateId === "string" &&
    value.gateId.length > 0 &&
    Number.isInteger(value.attempt) &&
    Number(value.attempt) > 0 &&
    typeof value.required === "boolean" &&
    EvidenceLevelSchema.safeParse(value.declaredEvidenceLevel).success &&
    EvidenceLevelSchema.safeParse(value.evidenceLevel).success &&
    EvidenceStatusSchema.safeParse(value.status).success &&
    (value.command === null || EvidenceCommandSchema.safeParse(value.command).success) &&
    (value.stdoutHash === null || isSha256(value.stdoutHash)) &&
    (value.stderrHash === null || isSha256(value.stderrHash)) &&
    Number.isInteger(value.testCount) &&
    Number(value.testCount) >= 0 &&
    Number.isInteger(value.failureCount) &&
    Number(value.failureCount) >= 0 &&
    isStringArray(value.keyAssertions) &&
    isStringArray(value.errorCodes) &&
    typeof value.targetExecuted === "boolean" &&
    typeof value.failureModeVerified === "boolean" &&
    (value.serviceStatus === null ||
      ["healthy", "degraded", "unreachable"].includes(String(value.serviceStatus))) &&
    Array.isArray(value.artifactHashes) &&
    value.artifactHashes.every(isSha256) &&
    (value.rawLogReference === undefined || typeof value.rawLogReference === "string") &&
    (value.validationIssues === undefined || isStringArray(value.validationIssues))
  );
}

function parseEvidenceEnvelope(value: unknown): EvidenceEnvelope | null {
  if (!isRecord(value) || !hasExactKeys(value, ["manifest", "attempts"])) return null;
  const manifest = EvidenceManifestSchema.safeParse(value.manifest);
  if (!manifest.success || !Array.isArray(value.attempts) || !value.attempts.every(isGateAttempt)) {
    return null;
  }
  return { manifest: manifest.data, attempts: value.attempts };
}

function parseCiRun(value: unknown): CiRunRecord | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "id",
      "headSha",
      "workflowPath",
      "status",
      "conclusion",
      "htmlUrl",
      "jobs",
      "artifacts",
    ]) ||
    !Number.isSafeInteger(value.id) ||
    Number(value.id) <= 0 ||
    !isGitHash(value.headSha) ||
    typeof value.workflowPath !== "string" ||
    value.workflowPath.length === 0 ||
    typeof value.status !== "string" ||
    value.status.length === 0 ||
    !isNullableString(value.conclusion) ||
    typeof value.htmlUrl !== "string" ||
    value.htmlUrl.length === 0 ||
    !Array.isArray(value.jobs) ||
    !Array.isArray(value.artifacts)
  ) {
    return null;
  }
  const jobs = value.jobs;
  const artifacts = value.artifacts;
  if (
    !jobs.every(
      (job) =>
        isRecord(job) &&
        hasExactKeys(job, ["name", "status", "conclusion"]) &&
        typeof job.name === "string" &&
        job.name.length > 0 &&
        typeof job.status === "string" &&
        job.status.length > 0 &&
        isNullableString(job.conclusion),
    ) ||
    !artifacts.every(
      (artifact) =>
        isRecord(artifact) &&
        hasExactKeys(artifact, ["name", "expired", "digest"]) &&
        typeof artifact.name === "string" &&
        artifact.name.length > 0 &&
        typeof artifact.expired === "boolean" &&
        isNullableString(artifact.digest),
    )
  ) {
    return null;
  }
  return value as unknown as CiRunRecord;
}

function parseCloseout(value: unknown): CloseoutRecord | null {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      "schemaVersion",
      "subject",
      "cleanClone",
      "requiredCi",
      "environment",
      "toolVersions",
      "artifacts",
    ])
  ) {
    return null;
  }
  const { subject, cleanClone, requiredCi, environment, toolVersions, artifacts } = value;
  if (
    value.schemaVersion !== "1" ||
    !isRecord(subject) ||
    !hasExactKeys(subject, ["commitSha", "treeHash", "dirtyWorktreeHash"]) ||
    !isGitHash(subject.commitSha) ||
    !isGitHash(subject.treeHash) ||
    !isSha256(subject.dirtyWorktreeHash) ||
    !isRecord(cleanClone) ||
    !hasExactKeys(cleanClone, [
      "status",
      "subjectCommit",
      "subjectTreeHash",
      "beforeDirtyWorktreeHash",
      "afterDirtyWorktreeHash",
      "requiredSubgates",
    ]) ||
    typeof cleanClone.status !== "string" ||
    cleanClone.status.length === 0 ||
    !isGitHash(cleanClone.subjectCommit) ||
    !isGitHash(cleanClone.subjectTreeHash) ||
    !isSha256(cleanClone.beforeDirtyWorktreeHash) ||
    !isSha256(cleanClone.afterDirtyWorktreeHash) ||
    !isStringArray(cleanClone.requiredSubgates) ||
    !isRecord(requiredCi) ||
    !hasExactKeys(requiredCi, [
      "status",
      "subjectCommit",
      "runId",
      "workflowPath",
      "requiredJobs",
      "artifactDigest",
      "run",
    ]) ||
    requiredCi.status !== "PASS" ||
    !isGitHash(requiredCi.subjectCommit) ||
    !Number.isSafeInteger(requiredCi.runId) ||
    Number(requiredCi.runId) <= 0 ||
    typeof requiredCi.workflowPath !== "string" ||
    requiredCi.workflowPath.length === 0 ||
    !isStringArray(requiredCi.requiredJobs) ||
    !isImageDigest(requiredCi.artifactDigest) ||
    parseCiRun(requiredCi.run) === null ||
    !isRecord(environment) ||
    !hasExactKeys(environment, ["id", "databaseSchemaVersion", "postgresServerVersion"]) ||
    typeof environment.id !== "string" ||
    environment.id.length === 0 ||
    environment.id.length > 256 ||
    environment.databaseSchemaVersion !== "000002_ms0_diagnostics" ||
    environment.postgresServerVersion !== 170006 ||
    !isRecord(toolVersions) ||
    Object.keys(toolVersions).length === 0 ||
    !Object.values(toolVersions).every(
      (version) => typeof version === "string" && version.length > 0,
    ) ||
    !isRecord(artifacts) ||
    !hasExactKeys(artifacts, ["migrationImageDigest", "electronArtifactHash"]) ||
    !isImageDigest(artifacts.migrationImageDigest) ||
    !isSha256(artifacts.electronArtifactHash)
  ) {
    return null;
  }
  return value as unknown as CloseoutRecord;
}

function sameStringRecord(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key])
  );
}

function assertExactEvidenceFiles(root: string, subject: string, evidenceCommit: string): void {
  const fields = git(root, [
    "diff",
    "--raw",
    "--no-abbrev",
    "-z",
    "-M",
    "-C",
    subject,
    evidenceCommit,
  ])
    .split("\0")
    .filter(Boolean);
  const actual: string[] = [];
  for (let index = 0; index < fields.length; ) {
    const header = fields[index++];
    const match = header?.match(
      /^:([0-7]{6}) ([0-7]{6}) [0-9a-f]{40} [0-9a-f]{40} ([A-Z])(?:[0-9]+)?$/u,
    );
    const path = fields[index++];
    if (!match || !path) throw new Error("final_evidence_path_set_invalid");
    const [, oldMode, newMode, status] = match;
    if (status === "R" || status === "C") {
      index += 1;
      throw new Error("final_evidence_path_set_invalid");
    }
    if (
      !(
        (status === "A" && oldMode === "000000" && newMode === "100644") ||
        (status === "M" && oldMode === "100644" && newMode === "100644")
      )
    ) {
      throw new Error("final_evidence_file_mode_invalid");
    }
    actual.push(path);
  }
  actual.sort();
  const expected = [...REQUIRED_EVIDENCE_PATHS].sort();
  if (actual.length !== expected.length || actual.some((path, index) => path !== expected[index])) {
    throw new Error("final_evidence_path_set_invalid");
  }

  const latest = git(root, [
    "ls-tree",
    evidenceCommit,
    "--",
    "reports/ms0-repository-constitution/evidence/latest.md",
  ]);
  if (latest && !/^100644 blob [0-9a-f]{40}\t/u.test(latest)) {
    throw new Error("final_evidence_file_mode_invalid");
  }
}

function assertRequiredGates(attempts: GateAttempt[], manifest: EvidenceManifest): void {
  const ids = attempts.map((attempt) => attempt.gateId);
  if (attempts.some((attempt) => !attempt.required || attempt.status !== "PASS")) {
    throw new Error("final_required_gate_invalid");
  }
  if (
    attempts.some((attempt) => {
      const expectedLevel = MS0_STRUCTURAL_GATE_IDS.has(attempt.gateId)
        ? "STRUCTURAL_CHECK"
        : "REAL_TEST";
      return (
        attempt.declaredEvidenceLevel !== expectedLevel ||
        attempt.evidenceLevel !== expectedLevel ||
        (attempt.validationIssues?.length ?? 0) !== 0 ||
        attempt.command === null ||
        attempt.command.exitCode !== 0 ||
        attempt.command.assertions.some((assertion) => assertion.status !== "passed") ||
        (expectedLevel === "REAL_TEST" && (!attempt.targetExecuted || !attempt.failureModeVerified))
      );
    })
  ) {
    throw new Error("final_required_gate_evidence_invalid");
  }
  const actual = [...ids].sort();
  const expected = [...MS0_REQUIRED_GATE_IDS].sort();
  if (
    new Set(ids).size !== ids.length ||
    actual.length !== expected.length ||
    actual.some((id, index) => id !== expected[index])
  ) {
    throw new Error("final_required_gate_set_invalid");
  }
  const migrationImage = attempts.find((attempt) => attempt.gateId === "ms0-migration-image");
  if (
    manifest.imageDigest === null ||
    !migrationImage?.artifactHashes.includes(manifest.imageDigest.slice("sha256:".length))
  ) {
    throw new Error("final_migration_image_binding_mismatch");
  }
}

function assertToolVersions(toolVersions: Record<string, string>): void {
  const keys = Object.keys(toolVersions).sort();
  if (
    keys.length !== 3 ||
    keys[0] !== "gitleaks" ||
    keys[1] !== "node" ||
    keys[2] !== "pnpm" ||
    toolVersions.node !== "v24.11.0" ||
    toolVersions.pnpm !== "10.33.2" ||
    toolVersions.gitleaks !== "8.28.0"
  ) {
    throw new Error("final_tool_versions_invalid");
  }
}

function downloadCiArtifactEvidence(
  repositoryRoot: string,
  closeout: CloseoutRecord,
): CiArtifactEvidence {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "sartre-ms0-ci-artifact-"));
  const artifactName = `ms0-required-${closeout.subject.commitSha}`;
  try {
    const download = spawnSyncBounded(
      "gh",
      [
        "run",
        "download",
        String(closeout.requiredCi.runId),
        "-n",
        artifactName,
        "-D",
        temporaryRoot,
      ],
      {
        cwd: repositoryRoot,
        encoding: "utf8",
        timeout: CI_ARTIFACT_DOWNLOAD_TIMEOUT_MS,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    if (download.error && "code" in download.error && download.error.code === "ETIMEDOUT") {
      throw new Error("final_ci_artifact_download_timeout");
    }
    if (download.status !== 0) {
      throw new Error("final_ci_artifact_download_failed");
    }
    const expectedNames = ["Sartre-0.1.0-arm64.dmg", "artifact-sha256.txt"];
    const entries = readdirSync(temporaryRoot, { withFileTypes: true });
    const names = entries.map((entry) => entry.name).sort();
    if (
      entries.some((entry) => !entry.isFile() || entry.isSymbolicLink()) ||
      names.length !== expectedNames.length ||
      names.some((name, index) => name !== [...expectedNames].sort()[index])
    ) {
      throw new Error("final_ci_artifact_contents_invalid");
    }
    const dmgPath = join(temporaryRoot, "Sartre-0.1.0-arm64.dmg");
    const checksumPath = join(temporaryRoot, "artifact-sha256.txt");
    if (lstatSync(dmgPath).isSymbolicLink() || lstatSync(checksumPath).isSymbolicLink()) {
      throw new Error("final_ci_artifact_contents_invalid");
    }
    const electronArtifactHash = createHash("sha256").update(readFileSync(dmgPath)).digest("hex");
    const checksum = readFileSync(checksumPath, "utf8");
    if (checksum !== `${electronArtifactHash}  Sartre-0.1.0-arm64.dmg\n`) {
      throw new Error("final_ci_artifact_checksum_invalid");
    }
    return { electronArtifactHash };
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function assertCleanCloneBinding(closeout: CloseoutRecord, manifest: EvidenceManifest): void {
  const cleanClone = closeout.cleanClone;
  const subgates = [...cleanClone.requiredSubgates].sort();
  const expectedSubgates = [...MS0_CLEAN_CLONE_REQUIRED_SUBGATE_IDS].sort();
  if (
    cleanClone.status !== "PASS" ||
    cleanClone.subjectCommit !== manifest.commitSha ||
    cleanClone.subjectTreeHash !== manifest.subjectTreeHash ||
    cleanClone.beforeDirtyWorktreeHash !== manifest.dirtyWorktreeHash ||
    cleanClone.afterDirtyWorktreeHash !== manifest.dirtyWorktreeHash ||
    new Set(cleanClone.requiredSubgates).size !== cleanClone.requiredSubgates.length ||
    subgates.length !== expectedSubgates.length ||
    subgates.some((id, index) => id !== expectedSubgates[index])
  ) {
    throw new Error("final_clean_clone_binding_mismatch");
  }
}

function assertCloseoutBindings(
  closeout: CloseoutRecord,
  manifest: EvidenceManifest,
  subjectCommit: string,
  liveRuns: readonly CiRunRecord[],
  artifactEvidence: CiArtifactEvidence,
): number {
  assertCleanCloneBinding(closeout, manifest);
  assertToolVersions(manifest.toolVersions);
  if (
    closeout.schemaVersion !== "1" ||
    manifest.schemaVersion !== "1" ||
    manifest.status !== "PASS" ||
    manifest.evidenceLevel !== "STRUCTURAL_CHECK" ||
    manifest.commitSha !== subjectCommit ||
    manifest.imageDigest === null ||
    manifest.electronArtifactHash === null ||
    closeout.subject.commitSha !== subjectCommit ||
    closeout.subject.treeHash !== manifest.subjectTreeHash ||
    closeout.subject.dirtyWorktreeHash !== manifest.dirtyWorktreeHash ||
    closeout.requiredCi.status !== "PASS" ||
    closeout.requiredCi.subjectCommit !== subjectCommit ||
    closeout.environment.id !== manifest.environmentId ||
    closeout.environment.postgresServerVersion !== 170006 ||
    !sameStringRecord(closeout.toolVersions, manifest.toolVersions) ||
    closeout.artifacts.migrationImageDigest !== manifest.imageDigest ||
    closeout.artifacts.electronArtifactHash !== manifest.electronArtifactHash ||
    artifactEvidence.electronArtifactHash !== manifest.electronArtifactHash
  ) {
    if (manifest.status !== "PASS" || manifest.evidenceLevel !== "STRUCTURAL_CHECK") {
      throw new Error("final_aggregate_evidence_invalid");
    }
    throw new Error("final_evidence_binding_mismatch");
  }
  const recordedCi = verifyCiRun({ subject: subjectCommit, runs: [closeout.requiredCi.run] });
  const liveCi = verifyCiRun({ subject: subjectCommit, runs: liveRuns });
  const jobs = [...closeout.requiredCi.requiredJobs].sort();
  const expectedJobs = [...MS0_REQUIRED_CI_JOB_IDS].sort();
  if (
    closeout.requiredCi.runId !== recordedCi.runId ||
    closeout.requiredCi.runId !== liveCi.runId ||
    closeout.requiredCi.workflowPath !== closeout.requiredCi.run.workflowPath ||
    new Set(closeout.requiredCi.requiredJobs).size !== closeout.requiredCi.requiredJobs.length ||
    jobs.length !== expectedJobs.length ||
    jobs.some((job, index) => job !== expectedJobs[index]) ||
    !recordedCi.artifactDigests.includes(closeout.requiredCi.artifactDigest) ||
    !liveCi.artifactDigests.includes(closeout.requiredCi.artifactDigest)
  ) {
    throw new Error("final_ci_binding_mismatch");
  }
  return liveCi.runId;
}

function observeDetachedSubjectAndEvidence(
  root: string,
  subjectCommit: string,
  evidenceCommit: string,
  scanEvidenceSecrets: (repositoryRoot: string) => readonly SecretViolation[],
): { readonly subjectTreeHash: string; readonly dirtyWorktreeHash: string } {
  const temporaryRoot = mkdtempSync(join(tmpdir(), "sartre-ms0-final-verifier-"));
  const checkout = join(temporaryRoot, "repository");
  try {
    git(root, ["clone", "--no-hardlinks", "--no-checkout", root, checkout]);
    git(checkout, ["checkout", "--detach", subjectCommit]);
    const subjectTreeHash = git(checkout, ["rev-parse", "HEAD^{tree}"]);
    const input = buildRepositoryWorktreeGitleaksInput(checkout);
    if (!input) throw new Error("final_subject_observation_failed");
    const dirtyWorktreeHash = createHash("sha256").update(input).digest("hex");
    git(checkout, ["checkout", "--detach", evidenceCommit]);
    if (scanEvidenceSecrets(checkout).length !== 0) {
      throw new Error("final_evidence_secret_boundary_failed");
    }
    return { subjectTreeHash, dirtyWorktreeHash };
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

export function verifyMs0Evidence(options: VerifyMs0EvidenceOptions): VerifiedMs0Evidence {
  const root = realpathSync(resolve(options.repositoryRoot));
  const evidenceCommit = resolveCommit(root, options.evidenceCommit);
  const subjectCommit = resolveCommit(root, options.subjectCommit);
  const envelope = parseEvidenceEnvelope(
    readJsonAtCommit(
      root,
      evidenceCommit,
      "reports/ms0-repository-constitution/evidence/manifest.json",
    ),
  );
  if (envelope === null) throw new Error("final_evidence_envelope_invalid");
  const { manifest, attempts } = envelope;

  verifyEvidenceCommit({
    repositoryRoot: root,
    evidenceCommit,
    declaredSubject: subjectCommit,
    manifestCommitSha: manifest.commitSha,
  });
  assertExactEvidenceFiles(root, subjectCommit, evidenceCommit);
  assertRequiredGates(attempts, manifest);
  const closeout = parseCloseout(
    readJsonAtCommit(
      root,
      evidenceCommit,
      "reports/ms0-repository-constitution/evidence/closeout.json",
    ),
  );
  if (closeout === null) throw new Error("final_closeout_schema_invalid");
  const artifactEvidence = (options.loadCiArtifactEvidence ?? downloadCiArtifactEvidence)(
    root,
    closeout,
  );
  const ciRunId = assertCloseoutBindings(
    closeout,
    manifest,
    subjectCommit,
    (options.loadCiRuns ?? loadCiRuns)(subjectCommit),
    artifactEvidence,
  );
  if (
    git(root, [
      "show",
      `${evidenceCommit}:reports/ms0-repository-constitution/evidence/schema-version.txt`,
    ]) !== "1"
  ) {
    throw new Error("final_evidence_schema_version_invalid");
  }
  const observed = observeDetachedSubjectAndEvidence(
    root,
    subjectCommit,
    evidenceCommit,
    options.scanEvidenceSecrets ?? scanFullEvidenceSecretBoundary,
  );
  if (
    observed.subjectTreeHash !== manifest.subjectTreeHash ||
    observed.dirtyWorktreeHash !== manifest.dirtyWorktreeHash
  ) {
    throw new Error("final_subject_binding_mismatch");
  }
  return {
    evidenceCommit,
    subjectCommit,
    subjectTreeHash: observed.subjectTreeHash,
    gateIds: [...MS0_REQUIRED_GATE_IDS],
    ciRunId,
  };
}

function parseCliArgs(argv: string[]): { evidenceCommit: string; subjectCommit: string } {
  const normalized = argv[0] === "--" ? argv.slice(1) : argv;
  if (
    normalized.length !== 4 ||
    normalized[0] !== "--evidence-commit" ||
    !normalized[1] ||
    normalized[2] !== "--subject-commit" ||
    !normalized[3]
  ) {
    throw new Error("usage: --evidence-commit <commit> --subject-commit <commit>");
  }
  return { evidenceCommit: normalized[1], subjectCommit: normalized[3] };
}

function cli(): void {
  const commits = parseCliArgs(process.argv.slice(2));
  const verified = verifyMs0Evidence({ repositoryRoot: process.cwd(), ...commits });
  process.stdout.write(`${JSON.stringify(verified)}\n`);
}

const isEntrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;
if (isEntrypoint) {
  try {
    cli();
  } catch (error) {
    const message = error instanceof Error ? error.message : "final_verifier_failed";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
