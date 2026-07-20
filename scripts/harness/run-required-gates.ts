import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, realpathSync } from "node:fs";
import { lstat, readFile, realpath } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

import type {
  EvidenceCommand,
  EvidenceLevel,
  EvidenceManifest,
  EvidenceStatus,
} from "../../packages/contracts/src/evidence.js";
import {
  EvidenceCommandSchema,
  EvidenceManifestSchema,
} from "../../packages/contracts/src/evidence.js";
import { buildRepositoryWorktreeGitleaksInput } from "../constitution/secret-boundary.js";
import type { CommandPolicyId } from "../evidence/collect-command.js";
import {
  collectCommand,
  isCommandPolicyId,
  matchesCommandPolicyArgv,
} from "../evidence/collect-command.js";
import { validateEvidenceRecord } from "../evidence/validate.js";
import { writeEvidenceAtomically } from "./atomic-write.js";

export { writeEvidenceAtomically } from "./atomic-write.js";

export type GateTargetKind = "test" | "build" | "service" | "command";
export type GitEvidenceMode = "subject-head" | "evidence-child";

export interface HarnessSubject {
  gitMode: GitEvidenceMode;
  commitSha: string;
  subjectTreeHash: string;
  dirtyWorktreeHash: string;
  releaseVersion: string;
  imageDigest: string | null;
  electronArtifactHash: string | null;
  environmentId: string;
}

export interface RequiredGate {
  id: string;
  required: boolean;
  evidenceLevel: EvidenceLevel;
  targetKind: GateTargetKind;
  requiresArtifactHash: boolean;
  policyId: CommandPolicyId;
  skip?: boolean;
}

export interface HarnessConfig {
  schemaVersion: string;
  subject: HarnessSubject;
  gates: RequiredGate[];
  output: {
    manifestPath: string;
    reportPath: string;
    rawLogDirectory?: string;
  };
}

export interface GateAttempt {
  gateId: string;
  attempt: number;
  required: boolean;
  declaredEvidenceLevel: EvidenceLevel;
  evidenceLevel: EvidenceLevel;
  status: EvidenceStatus;
  command: EvidenceCommand | null;
  stdoutHash: string | null;
  stderrHash: string | null;
  testCount: number;
  failureCount: number;
  keyAssertions: string[];
  errorCodes: string[];
  targetExecuted: boolean;
  failureModeVerified: boolean;
  serviceStatus: "healthy" | "degraded" | "unreachable" | null;
  artifactHashes: string[];
  rawLogReference?: string;
  validationIssues?: string[];
}

export interface HarnessRunResult {
  status: "PASS" | "BLOCKED";
  exitCode: 0 | 1;
  manifest: EvidenceManifest;
  attempts: GateAttempt[];
}

export interface HarnessDependencies {
  actualDirtyWorktreeHash: string;
  evidenceCommitSha: string | null;
  toolVersions: Record<string, string>;
  observedToolCommands?: EvidenceCommand[];
  previousManifest?: EvidenceManifest | null;
  previousAttempts: GateAttempt[];
  execute: (gate: RequiredGate) => Promise<GateAttempt | Omit<GateAttempt, "attempt">>;
  writeManifest: (path: string, value: unknown) => Promise<void>;
  writeReport: (path: string, report: string) => Promise<void>;
}

export interface ObservedRepositorySubject {
  commitSha: string;
  subjectTreeHash: string;
  dirtyWorktreeHash: string;
  evidenceCommitSha: string | null;
}

type SubjectMetadata = Pick<
  HarnessSubject,
  "releaseVersion" | "imageDigest" | "electronArtifactHash" | "environmentId"
>;

const EVIDENCE_LEVELS = new Set<EvidenceLevel>([
  "REAL_TEST",
  "STRUCTURAL_CHECK",
  "SCENARIO_REGISTERED",
  "SKIPPED",
  "MANUAL_REQUIRED",
]);
const EVIDENCE_STATUSES = new Set<EvidenceStatus>(["PASS", "FAIL", "BLOCKED", "SKIPPED"]);
const TARGET_KINDS = new Set<GateTargetKind>(["test", "build", "service", "command"]);
const SERVICE_STATUSES = new Set(["healthy", "degraded", "unreachable"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  record: Record<string, unknown>,
  required: string[],
  optional: string[] = [],
): boolean {
  const allowed = new Set([...required, ...optional]);
  return (
    required.every((key) => Object.hasOwn(record, key)) &&
    Object.keys(record).every((key) => allowed.has(key))
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

function isGitHash(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value);
}

function isStableString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 256;
}

function isNullableHash(value: unknown): boolean {
  return value === null || isSha256(value);
}

function isNullableImageDigest(value: unknown): boolean {
  return value === null || (typeof value === "string" && /^sha256:[0-9a-f]{64}$/.test(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSafeRawLogReference(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 256) return false;
  if (value.startsWith("/") || value.includes("\\")) return false;
  const segments = value.split("/");
  const rawIndex = segments.indexOf("raw");
  return (
    segments[0] === "reports" &&
    rawIndex > 0 &&
    rawIndex < segments.length - 1 &&
    segments.every((segment) => segment.length > 0 && segment !== "." && segment !== "..")
  );
}

function parseHarnessConfig(input: unknown): HarnessConfig {
  if (!isRecord(input) || !hasExactKeys(input, ["schemaVersion", "subject", "gates", "output"])) {
    throw new Error("harness_config_invalid");
  }
  const subject = input.subject;
  const output = input.output;
  if (
    !isRecord(subject) ||
    !hasExactKeys(subject, [
      "gitMode",
      "commitSha",
      "subjectTreeHash",
      "dirtyWorktreeHash",
      "releaseVersion",
      "imageDigest",
      "electronArtifactHash",
      "environmentId",
    ]) ||
    (subject.gitMode !== "subject-head" && subject.gitMode !== "evidence-child") ||
    !isGitHash(subject.commitSha) ||
    !isGitHash(subject.subjectTreeHash) ||
    !isSha256(subject.dirtyWorktreeHash) ||
    !isStableString(subject.releaseVersion) ||
    !isNullableImageDigest(subject.imageDigest) ||
    !isNullableHash(subject.electronArtifactHash) ||
    !isStableString(subject.environmentId) ||
    !Array.isArray(input.gates) ||
    input.gates.length === 0 ||
    !isRecord(output) ||
    !hasExactKeys(output, ["manifestPath", "reportPath"], ["rawLogDirectory"]) ||
    !isStableString(output.manifestPath) ||
    !isStableString(output.reportPath) ||
    !(output.rawLogDirectory === undefined || isStableString(output.rawLogDirectory))
  ) {
    throw new Error("harness_config_invalid");
  }

  const gateIds = new Set<string>();
  for (const gate of input.gates) {
    if (
      !isRecord(gate) ||
      !hasExactKeys(
        gate,
        ["id", "required", "evidenceLevel", "targetKind", "requiresArtifactHash", "policyId"],
        ["skip"],
      ) ||
      !isStableString(gate.id) ||
      gateIds.has(gate.id) ||
      typeof gate.required !== "boolean" ||
      !EVIDENCE_LEVELS.has(gate.evidenceLevel as EvidenceLevel) ||
      !TARGET_KINDS.has(gate.targetKind as GateTargetKind) ||
      typeof gate.requiresArtifactHash !== "boolean" ||
      !isCommandPolicyId(gate.policyId) ||
      !(gate.skip === undefined || typeof gate.skip === "boolean")
    ) {
      throw new Error("harness_config_invalid");
    }
    gateIds.add(gate.id);
  }
  return input as unknown as HarnessConfig;
}

function isGateAttempt(input: unknown): input is GateAttempt {
  if (
    !isRecord(input) ||
    !hasExactKeys(
      input,
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
    ) ||
    !isStableString(input.gateId) ||
    typeof input.attempt !== "number" ||
    !Number.isInteger(input.attempt) ||
    input.attempt < 1 ||
    typeof input.required !== "boolean" ||
    !EVIDENCE_LEVELS.has(input.declaredEvidenceLevel as EvidenceLevel) ||
    !EVIDENCE_LEVELS.has(input.evidenceLevel as EvidenceLevel) ||
    !EVIDENCE_STATUSES.has(input.status as EvidenceStatus) ||
    !(input.command === null || EvidenceCommandSchema.safeParse(input.command).success) ||
    !(input.stdoutHash === null || isSha256(input.stdoutHash)) ||
    !(input.stderrHash === null || isSha256(input.stderrHash)) ||
    typeof input.testCount !== "number" ||
    !Number.isInteger(input.testCount) ||
    input.testCount < 0 ||
    typeof input.failureCount !== "number" ||
    !Number.isInteger(input.failureCount) ||
    input.failureCount < 0 ||
    !isStringArray(input.keyAssertions) ||
    !isStringArray(input.errorCodes) ||
    typeof input.targetExecuted !== "boolean" ||
    typeof input.failureModeVerified !== "boolean" ||
    !(input.serviceStatus === null || SERVICE_STATUSES.has(String(input.serviceStatus))) ||
    !Array.isArray(input.artifactHashes) ||
    !input.artifactHashes.every(isSha256) ||
    !(input.rawLogReference === undefined || isSafeRawLogReference(input.rawLogReference)) ||
    !(input.validationIssues === undefined || isStringArray(input.validationIssues))
  ) {
    return false;
  }
  return true;
}

function gitOutput(root: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
  } catch {
    throw new Error("subject_observation_failed");
  }
}

function physicalSubjectFacts(root: string, mode: GitEvidenceMode): ObservedRepositorySubject {
  const canonicalRoot = realpathSync(resolve(root));
  const head = gitOutput(canonicalRoot, ["rev-parse", "HEAD"]);
  let commitSha = head;
  let evidenceCommitSha: string | null = null;
  if (mode === "evidence-child") {
    const parentLine = gitOutput(canonicalRoot, ["rev-list", "--parents", "-n", "1", "HEAD"]);
    const hashes = parentLine.split(/\s+/u);
    if (hashes.length !== 2 || hashes[0] !== head || !isGitHash(hashes[1])) {
      throw new Error("evidence_commit_relationship_invalid");
    }
    evidenceCommitSha = head;
    commitSha = hashes[1];
  }
  const subjectTreeHash = gitOutput(canonicalRoot, ["rev-parse", `${commitSha}^{tree}`]);
  const worktreeInput = buildRepositoryWorktreeGitleaksInput(canonicalRoot);
  if (!worktreeInput) throw new Error("subject_observation_failed");
  const dirtyWorktreeHash = createHash("sha256").update(worktreeInput).digest("hex");
  if (!isGitHash(commitSha) || !isGitHash(subjectTreeHash) || !isSha256(dirtyWorktreeHash)) {
    throw new Error("subject_observation_failed");
  }
  return { commitSha, subjectTreeHash, dirtyWorktreeHash, evidenceCommitSha };
}

export function createRepositorySubjectDeclaration(
  root: string,
  gitMode: GitEvidenceMode,
  metadata: SubjectMetadata,
): HarnessSubject {
  const facts = physicalSubjectFacts(root, gitMode);
  return {
    gitMode,
    commitSha: facts.commitSha,
    subjectTreeHash: facts.subjectTreeHash,
    dirtyWorktreeHash: facts.dirtyWorktreeHash,
    ...metadata,
  };
}

export async function observeRepositorySubject(
  root: string,
  declaration: HarnessSubject,
): Promise<ObservedRepositorySubject> {
  const observed = physicalSubjectFacts(root, declaration.gitMode);
  if (observed.commitSha !== declaration.commitSha) throw new Error("subject_commit_mismatch");
  if (observed.subjectTreeHash !== declaration.subjectTreeHash) {
    throw new Error("subject_tree_hash_mismatch");
  }
  if (observed.dirtyWorktreeHash !== declaration.dirtyWorktreeHash) {
    throw new Error("dirty_worktree_hash_mismatch");
  }
  if (observed.evidenceCommitSha === observed.commitSha) {
    throw new Error("evidence_commit_self_reference");
  }
  return observed;
}

function nextAttemptNumber(previous: GateAttempt[], gateId: string): number {
  return (
    previous.reduce(
      (highest, attempt) =>
        attempt.gateId === gateId ? Math.max(highest, attempt.attempt) : highest,
      0,
    ) + 1
  );
}

function stableErrorCode(error: unknown): string {
  if (error instanceof Error && /^[A-Za-z0-9_.:-]{1,128}$/.test(error.message)) {
    return error.message;
  }
  return "gate_execution_failed";
}

function blockedAttempt(gate: RequiredGate, attempt: number, code: string): GateAttempt {
  return {
    gateId: gate.id,
    attempt,
    required: gate.required,
    declaredEvidenceLevel: gate.evidenceLevel,
    evidenceLevel: gate.skip ? "SKIPPED" : gate.evidenceLevel,
    status: gate.skip ? "SKIPPED" : "BLOCKED",
    command: null,
    stdoutHash: null,
    stderrHash: null,
    testCount: 0,
    failureCount: 0,
    keyAssertions: [],
    errorCodes: [code],
    targetExecuted: false,
    failureModeVerified: false,
    serviceStatus: null,
    artifactHashes: [],
  };
}

function manifestSubject(
  config: HarnessConfig,
): Omit<
  EvidenceManifest,
  | "schemaVersion"
  | "toolVersions"
  | "evidenceLevel"
  | "status"
  | "startedAt"
  | "finishedAt"
  | "commands"
> {
  return {
    commitSha: config.subject.commitSha,
    subjectTreeHash: config.subject.subjectTreeHash,
    dirtyWorktreeHash: config.subject.dirtyWorktreeHash,
    releaseVersion: config.subject.releaseVersion,
    imageDigest: config.subject.imageDigest,
    electronArtifactHash: config.subject.electronArtifactHash,
    environmentId: config.subject.environmentId,
  };
}

function attemptManifest(
  config: HarnessConfig,
  attempt: GateAttempt,
  toolVersions: Record<string, string>,
): unknown {
  const timestamp = attempt.command?.startedAt ?? new Date().toISOString();
  return {
    ...manifestSubject(config),
    schemaVersion: config.schemaVersion,
    toolVersions,
    evidenceLevel: attempt.evidenceLevel,
    status: attempt.status,
    startedAt: timestamp,
    finishedAt: attempt.command?.finishedAt ?? timestamp,
    commands: attempt.command === null ? [] : [attempt.command],
  };
}

function validateAttempt(
  config: HarnessConfig,
  gate: RequiredGate,
  attempt: GateAttempt,
  dependencies: Pick<
    HarnessDependencies,
    "actualDirtyWorktreeHash" | "evidenceCommitSha" | "toolVersions"
  >,
): string[] {
  return validateEvidenceRecord({
    manifest: attemptManifest(config, attempt, dependencies.toolVersions),
    declaration: {
      gateId: gate.id,
      required: gate.required,
      evidenceLevel: gate.evidenceLevel,
      targetKind: gate.targetKind,
      requiresArtifactHash: gate.requiresArtifactHash,
    },
    observation: {
      actualDirtyWorktreeHash: dependencies.actualDirtyWorktreeHash,
      evidenceCommitSha: dependencies.evidenceCommitSha,
      targetExecuted: attempt.targetExecuted,
      failureModeVerified: attempt.failureModeVerified,
      serviceStatus: attempt.serviceStatus,
      artifactHashes: attempt.artifactHashes,
    },
  }).issues.map((issue) => issue.code);
}

function aggregateEvidenceLevel(attempts: GateAttempt[]): EvidenceLevel {
  if (attempts.some((attempt) => attempt.evidenceLevel === "STRUCTURAL_CHECK")) {
    return "STRUCTURAL_CHECK";
  }
  if (attempts.length > 0 && attempts.every((attempt) => attempt.evidenceLevel === "REAL_TEST")) {
    return "REAL_TEST";
  }
  return "SCENARIO_REGISTERED";
}

function reportFor(result: HarnessRunResult): string {
  const lines = [
    "# Evidence Harness Report",
    "",
    `Status: ${result.status}`,
    `Subject commit: ${result.manifest.commitSha}`,
    `Dirty worktree hash: ${result.manifest.dirtyWorktreeHash}`,
    "",
    "## Attempts",
    "",
  ];
  for (const attempt of result.attempts) {
    lines.push(
      `- ${attempt.gateId} attempt ${attempt.attempt}: ${attempt.status} (${attempt.evidenceLevel})`,
      `  - exitCode: ${attempt.command?.exitCode ?? "not executed"}`,
      `  - validationIssues: ${attempt.validationIssues?.join(", ") || "none"}`,
      `  - errorCodes: ${attempt.errorCodes.join(", ") || "none"}`,
    );
  }
  return `${lines.join("\n")}\n`;
}

function verifiedToolVersions(input: Record<string, string>): Record<string, string> {
  if (
    Object.keys(input).length !== 2 ||
    !/^[v]?[0-9]+(?:\.[0-9]+){2}$/.test(input.node ?? "") ||
    !/^[v]?[0-9]+(?:\.[0-9]+){2}$/.test(input.pnpm ?? "")
  ) {
    throw new Error("tool_versions_invalid");
  }
  return { node: input.node ?? "", pnpm: input.pnpm ?? "" };
}

function sameStringRecord(left: Record<string, string>, right: Record<string, string>): boolean {
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key])
  );
}

function assertPreviousManifestBinding(
  config: HarnessConfig,
  manifest: EvidenceManifest,
  dependencies: Pick<HarnessDependencies, "actualDirtyWorktreeHash" | "toolVersions">,
): void {
  const subject = manifestSubject(config);
  if (
    manifest.schemaVersion !== config.schemaVersion ||
    manifest.commitSha !== subject.commitSha ||
    manifest.subjectTreeHash !== subject.subjectTreeHash ||
    manifest.dirtyWorktreeHash !== subject.dirtyWorktreeHash ||
    manifest.dirtyWorktreeHash !== dependencies.actualDirtyWorktreeHash ||
    manifest.releaseVersion !== subject.releaseVersion ||
    manifest.imageDigest !== subject.imageDigest ||
    manifest.electronArtifactHash !== subject.electronArtifactHash ||
    manifest.environmentId !== subject.environmentId ||
    !sameStringRecord(manifest.toolVersions, dependencies.toolVersions)
  ) {
    throw new Error("previous_evidence_subject_mismatch");
  }
}

export async function runRequiredGates(
  unsafeConfig: unknown,
  dependencies: HarnessDependencies,
): Promise<HarnessRunResult> {
  const config = parseHarnessConfig(unsafeConfig);
  const toolVersions = verifiedToolVersions(dependencies.toolVersions);
  if (
    !Array.isArray(dependencies.previousAttempts) ||
    !dependencies.previousAttempts.every(isGateAttempt)
  ) {
    throw new Error("previous_attempts_invalid");
  }
  const previousManifest = dependencies.previousManifest ?? null;
  const parsedPreviousManifest =
    previousManifest === null ? null : EvidenceManifestSchema.safeParse(previousManifest);
  if (
    (dependencies.previousAttempts.length > 0 && parsedPreviousManifest === null) ||
    (parsedPreviousManifest !== null && !parsedPreviousManifest.success)
  ) {
    throw new Error("previous_attempts_invalid");
  }
  if (parsedPreviousManifest?.success) {
    assertPreviousManifestBinding(config, parsedPreviousManifest.data, {
      actualDirtyWorktreeHash: dependencies.actualDirtyWorktreeHash,
      toolVersions,
    });
  }

  const gatesById = new Map(config.gates.map((gate) => [gate.id, gate]));
  const attempts: GateAttempt[] = [];
  for (const stored of dependencies.previousAttempts) {
    const gate = gatesById.get(stored.gateId);
    if (
      !gate ||
      stored.required !== gate.required ||
      stored.declaredEvidenceLevel !== gate.evidenceLevel ||
      (stored.command !== null && !matchesCommandPolicyArgv(gate.policyId, stored.command.argv))
    ) {
      throw new Error("previous_attempts_invalid");
    }
    const attempt = { ...stored };
    attempt.validationIssues = validateAttempt(config, gate, attempt, {
      actualDirtyWorktreeHash: dependencies.actualDirtyWorktreeHash,
      evidenceCommitSha: dependencies.evidenceCommitSha,
      toolVersions,
    });
    attempts.push(attempt);
  }

  for (const gate of config.gates) {
    const attemptNumber = nextAttemptNumber(attempts, gate.id);
    let attempt: GateAttempt;
    try {
      const executed = gate.skip
        ? blockedAttempt(gate, attemptNumber, "required_gate_skipped")
        : await dependencies.execute(gate);
      attempt = {
        ...executed,
        gateId: gate.id,
        attempt: "attempt" in executed ? executed.attempt : attemptNumber,
        required: gate.required,
        declaredEvidenceLevel: gate.evidenceLevel,
      } as GateAttempt;
      if (!isGateAttempt(attempt)) throw new Error("gate_attempt_invalid");
    } catch (error) {
      attempt = blockedAttempt(gate, attemptNumber, stableErrorCode(error));
    }
    attempt.validationIssues = validateAttempt(config, gate, attempt, {
      actualDirtyWorktreeHash: dependencies.actualDirtyWorktreeHash,
      evidenceCommitSha: dependencies.evidenceCommitSha,
      toolVersions,
    });
    attempts.push(attempt);
  }

  const attemptBlocked = attempts.some(
    (attempt) =>
      attempt.required &&
      (attempt.status !== "PASS" || (attempt.validationIssues?.length ?? 0) > 0),
  );
  const requiredAttempts = attempts.filter((attempt) => attempt.required);
  const allCommands = [
    ...(dependencies.observedToolCommands ?? []),
    ...requiredAttempts.flatMap((attempt) => (attempt.command === null ? [] : [attempt.command])),
  ].sort((left, right) => {
    const startedDifference = Date.parse(left.startedAt) - Date.parse(right.startedAt);
    return startedDifference !== 0
      ? startedDifference
      : Date.parse(left.finishedAt) - Date.parse(right.finishedAt);
  });
  const now = new Date().toISOString();
  const startedAt =
    allCommands.length === 0
      ? now
      : new Date(
          Math.min(...allCommands.map((command) => Date.parse(command.startedAt))),
        ).toISOString();
  const finishedAt =
    allCommands.length === 0
      ? startedAt
      : new Date(
          Math.max(...allCommands.map((command) => Date.parse(command.finishedAt))),
        ).toISOString();
  const successfulLevel = aggregateEvidenceLevel(requiredAttempts);
  const candidate = {
    ...manifestSubject(config),
    schemaVersion: config.schemaVersion,
    toolVersions,
    evidenceLevel: attemptBlocked ? "SCENARIO_REGISTERED" : successfulLevel,
    status: attemptBlocked ? "BLOCKED" : "PASS",
    startedAt,
    finishedAt,
    commands: allCommands,
  };
  let parsedManifest = EvidenceManifestSchema.safeParse(candidate);
  let blocked = attemptBlocked;
  if (!parsedManifest.success) {
    blocked = true;
    parsedManifest = EvidenceManifestSchema.safeParse({
      ...candidate,
      evidenceLevel: "SCENARIO_REGISTERED",
      status: "BLOCKED",
    });
  }
  if (!parsedManifest.success) throw new Error("aggregate_manifest_invalid");
  const result: HarnessRunResult = {
    status: blocked ? "BLOCKED" : "PASS",
    exitCode: blocked ? 1 : 0,
    manifest: parsedManifest.data,
    attempts,
  };
  await dependencies.writeManifest(config.output.manifestPath, {
    manifest: result.manifest,
    attempts,
  });
  await dependencies.writeReport(config.output.reportPath, reportFor(result));
  return result;
}

function isContained(root: string, path: string): boolean {
  const pathFromRoot = relative(root, path);
  return (
    pathFromRoot === "" ||
    (!isAbsolute(pathFromRoot) && pathFromRoot !== ".." && !pathFromRoot.startsWith(`..${sep}`))
  );
}

async function assertSafeParentSegments(root: string, path: string): Promise<void> {
  const parent = dirname(path);
  const segments = relative(root, parent).split(sep).filter(Boolean);
  let cursor = root;
  for (const segment of segments) {
    cursor = join(cursor, segment);
    try {
      const stat = await lstat(cursor);
      if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("path_unsafe");
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
      throw error;
    }
  }
}

async function containedRegularInput(root: string, path: string, code: string): Promise<string> {
  const absolute = resolve(root, path);
  if (!isContained(root, absolute)) throw new Error(code);
  try {
    await assertSafeParentSegments(root, absolute);
    const stat = await lstat(absolute);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(code);
    const canonical = await realpath(absolute);
    if (!isContained(root, canonical)) throw new Error(code);
    return canonical;
  } catch {
    throw new Error(code);
  }
}

async function loadConfig(pathArgument: string): Promise<unknown> {
  const root = await realpath(process.cwd());
  const canonicalPath = await containedRegularInput(root, pathArgument, "config_path_unsafe");
  const module = (await import(pathToFileURL(canonicalPath).href)) as { default?: unknown };
  if (!Object.hasOwn(module, "default")) throw new Error("config_export_invalid");
  return module.default;
}

function parseConfigArgument(argv: string[]): string {
  if (argv.length !== 2 || argv[0] !== "--config" || !argv[1]) {
    throw new Error("usage: --config <contained-config-module>");
  }
  return argv[1];
}

async function readPreviousEvidence(
  path: string,
): Promise<{ manifest: EvidenceManifest | null; attempts: GateAttempt[] }> {
  const root = await realpath(process.cwd());
  const absolute = resolve(root, path);
  if (!isContained(root, absolute)) throw new Error("previous_attempts_invalid");
  try {
    const canonical = await containedRegularInput(root, path, "previous_attempts_invalid");
    const envelope = JSON.parse(await readFile(canonical, "utf8")) as unknown;
    if (
      !isRecord(envelope) ||
      !hasExactKeys(envelope, ["manifest", "attempts"]) ||
      !EvidenceManifestSchema.safeParse(envelope.manifest).success ||
      !Array.isArray(envelope.attempts) ||
      !envelope.attempts.every(isGateAttempt)
    ) {
      throw new Error("previous_attempts_invalid");
    }
    return {
      manifest: EvidenceManifestSchema.parse(envelope.manifest),
      attempts: envelope.attempts,
    };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { manifest: null, attempts: [] };
    }
    if (lstatSync(absolute, { throwIfNoEntry: false }) === undefined) {
      return { manifest: null, attempts: [] };
    }
    throw new Error("previous_attempts_invalid");
  }
}

async function observeTooling(
  repositoryRoot: string,
  rawLogDirectory: string,
): Promise<{ versions: Record<string, string>; commands: EvidenceCommand[] }> {
  const node = await collectCommand({
    gateId: "tool-node-version",
    policyId: "tool.node.version",
    repositoryRoot,
    rawLogDirectory,
  });
  const pnpm = await collectCommand({
    gateId: "tool-pnpm-version",
    policyId: "tool.pnpm.version",
    repositoryRoot,
    rawLogDirectory,
  });
  const versions = verifiedToolVersions({ ...node.toolVersions, ...pnpm.toolVersions });
  return { versions, commands: [node.command, pnpm.command] };
}

async function cli(): Promise<number> {
  const repositoryRoot = await realpath(process.cwd());
  const config = parseHarnessConfig(await loadConfig(parseConfigArgument(process.argv.slice(2))));
  const observedSubject = await observeRepositorySubject(repositoryRoot, config.subject);
  const rawLogDirectory =
    config.output.rawLogDirectory ?? "reports/ms0-repository-constitution/raw";
  const tooling = await observeTooling(repositoryRoot, rawLogDirectory);
  const previousEvidence = await readPreviousEvidence(config.output.manifestPath);
  const result = await runRequiredGates(config, {
    actualDirtyWorktreeHash: observedSubject.dirtyWorktreeHash,
    evidenceCommitSha: observedSubject.evidenceCommitSha,
    toolVersions: tooling.versions,
    observedToolCommands: tooling.commands,
    previousManifest: previousEvidence.manifest,
    previousAttempts: previousEvidence.attempts,
    execute: async (gate) => {
      const collected = await collectCommand({
        gateId: gate.id,
        policyId: gate.policyId,
        repositoryRoot,
        rawLogDirectory,
      });
      return {
        gateId: gate.id,
        attempt: nextAttemptNumber(previousEvidence.attempts, gate.id),
        required: gate.required,
        declaredEvidenceLevel: gate.evidenceLevel,
        evidenceLevel: gate.evidenceLevel,
        status:
          collected.command.exitCode === 0 &&
          collected.command.assertions.length > 0 &&
          collected.command.assertions.every((assertion) => assertion.status === "passed")
            ? "PASS"
            : "FAIL",
        command: collected.command,
        stdoutHash: collected.stdoutHash,
        stderrHash: collected.stderrHash,
        testCount: collected.testCount,
        failureCount: collected.failureCount,
        keyAssertions: collected.keyAssertions,
        errorCodes: collected.errorCodes,
        targetExecuted: collected.targetExecuted,
        failureModeVerified: collected.failureModeVerified,
        serviceStatus: collected.serviceStatus,
        artifactHashes: collected.artifactHashes,
        rawLogReference: collected.rawLogReference,
      };
    },
    writeManifest: async (path, value) =>
      writeEvidenceAtomically(repositoryRoot, path, `${JSON.stringify(value, null, 2)}\n`),
    writeReport: async (path, report) => writeEvidenceAtomically(repositoryRoot, path, report),
  });
  return result.exitCode;
}

const isEntrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;
if (isEntrypoint) {
  cli()
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "harness_failed";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
}
