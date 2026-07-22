import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { spawnSyncBounded } from "./bounded-process.js";

export interface CleanCloneCommand {
  readonly id: string;
  readonly argv: readonly [string, ...string[]];
}

export interface VerifyCleanCloneOptions {
  readonly repositoryRoot: string;
  readonly subject: string;
  readonly databaseInputs?: CleanCloneDatabaseInputs;
  readonly timeouts?: Partial<CleanCloneTimeouts>;
  readonly commands?: readonly CleanCloneCommand[];
  readonly skipRepositoryPolicy?: boolean;
}

export interface CleanCloneTimeouts {
  readonly gitMs: number;
  readonly installMs: number;
  readonly packMs: number;
  readonly gateMs: number;
}

export interface CleanCloneDatabaseInputs {
  readonly postgres17_6: string;
  readonly postgres17_10: string;
}

export interface CleanCloneVerificationResult {
  readonly subject: string;
  readonly cloneHead: string;
  readonly cloneRoot: string;
}

export interface VerifyEvidenceCommitOptions {
  readonly repositoryRoot: string;
  readonly evidenceCommit: string;
  readonly declaredSubject: string;
  readonly manifestCommitSha?: string;
}

const REQUIRED_CI_JOBS = ["constitution", "postgresql-17-6", "electron-macos-arm64"] as const;
const POSTGRES_17_6_URL = "postgresql://postgres@127.0.0.1:54326/postgres";
const POSTGRES_17_10_URL = "postgresql://postgres@127.0.0.1:55432/postgres";
const DEFAULT_TIMEOUTS: CleanCloneTimeouts = {
  gitMs: 120_000,
  installMs: 900_000,
  packMs: 300_000,
  gateMs: 1_800_000,
};
const DEFAULT_COMMANDS: readonly CleanCloneCommand[] = [
  { id: "toolchain-bootstrap", argv: ["pnpm", "run", "toolchain:bootstrap"] },
  { id: "toolchain-check", argv: ["pnpm", "run", "toolchain:check"] },
  { id: "format", argv: ["pnpm", "run", "format:check"] },
  { id: "lint", argv: ["pnpm", "run", "lint"] },
  { id: "build", argv: ["pnpm", "run", "build"] },
  { id: "typecheck", argv: ["pnpm", "run", "typecheck"] },
  { id: "test", argv: ["pnpm", "run", "test"] },
  { id: "architecture", argv: ["pnpm", "run", "architecture:check"] },
  { id: "secret", argv: ["pnpm", "run", "secret:check"] },
  { id: "docker-context", argv: ["pnpm", "run", "docker-context:check"] },
  { id: "sast", argv: ["pnpm", "run", "sast"] },
  { id: "dependency", argv: ["pnpm", "run", "dependency:check"] },
  { id: "license", argv: ["pnpm", "run", "license:check"] },
  { id: "openspec", argv: ["pnpm", "run", "openspec:validate"] },
  { id: "contract", argv: ["pnpm", "run", "contract:compatibility"] },
  { id: "spec", argv: ["pnpm", "run", "spec:verify"] },
];

function run(
  root: string,
  argv: readonly [string, ...string[]],
  code: string,
  env?: NodeJS.ProcessEnv,
  timeoutMs = DEFAULT_TIMEOUTS.gitMs,
  timeoutCode = "external_command_timeout",
): string {
  const result = spawnSyncBounded(argv[0], argv.slice(1), {
    cwd: root,
    encoding: "utf8",
    env,
    timeout: timeoutMs,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error && "code" in result.error && result.error.code === "ETIMEDOUT") {
    throw new Error(timeoutCode);
  }
  if (result.status !== 0) {
    throw new Error(code);
  }
  return result.stdout.trim();
}

function runRaw(
  root: string,
  argv: readonly [string, ...string[]],
  code: string,
  env?: NodeJS.ProcessEnv,
  timeoutMs = DEFAULT_TIMEOUTS.gitMs,
  timeoutCode = "external_command_timeout",
): string {
  const result = spawnSyncBounded(argv[0], argv.slice(1), {
    cwd: root,
    encoding: "utf8",
    env,
    timeout: timeoutMs,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error && "code" in result.error && result.error.code === "ETIMEDOUT") {
    throw new Error(timeoutCode);
  }
  if (result.status !== 0) {
    throw new Error(code);
  }
  return result.stdout;
}

function status(
  root: string,
  argv: readonly [string, ...string[]],
  env?: NodeJS.ProcessEnv,
  timeoutMs = DEFAULT_TIMEOUTS.gateMs,
  timeoutCode = "external_command_timeout",
): number {
  const result = spawnSyncBounded(argv[0], argv.slice(1), {
    cwd: root,
    encoding: "utf8",
    env,
    timeout: timeoutMs,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error && "code" in result.error && result.error.code === "ETIMEDOUT") {
    throw new Error(timeoutCode);
  }
  return result.status ?? 1;
}

function resolveTimeouts(input: Partial<CleanCloneTimeouts> | undefined): CleanCloneTimeouts {
  const resolved = { ...DEFAULT_TIMEOUTS, ...input };
  if (
    Object.values(resolved).some(
      (value) => !Number.isInteger(value) || value < 50 || value > 3_600_000,
    )
  ) {
    throw new Error("clean_clone_timeout_invalid");
  }
  return resolved;
}

function validateDatabaseInputs(
  inputs: CleanCloneDatabaseInputs | undefined,
): CleanCloneDatabaseInputs | undefined {
  if (inputs === undefined) return undefined;
  if (inputs.postgres17_6 !== POSTGRES_17_6_URL || inputs.postgres17_10 !== POSTGRES_17_10_URL) {
    throw new Error("clean_clone_database_input_invalid");
  }
  return inputs;
}

function createCleanCloneEnvironment(
  temporaryRoot: string,
  databaseInputs: CleanCloneDatabaseInputs | undefined,
): NodeJS.ProcessEnv {
  const path = process.env.PATH;
  if (!path || path.includes("\0") || path.includes("\n")) {
    throw new Error("clean_clone_environment_invalid");
  }
  const home = join(temporaryRoot, "home");
  const temporaryDirectory = join(temporaryRoot, "tmp");
  const configDirectory = join(home, ".config");
  const cacheDirectory = join(home, ".cache");
  for (const directory of [home, temporaryDirectory, configDirectory, cacheDirectory]) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  }
  const env: NodeJS.ProcessEnv = {
    PATH: path,
    HOME: home,
    TMPDIR: temporaryDirectory,
    XDG_CONFIG_HOME: configDirectory,
    XDG_CACHE_HOME: cacheDirectory,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: join(home, "disabled-gitconfig"),
    LANG: "C",
    LC_ALL: "C",
  };
  const validatedDatabaseInputs = validateDatabaseInputs(databaseInputs);
  if (validatedDatabaseInputs) {
    env.SARTRE_DATABASE_URL = validatedDatabaseInputs.postgres17_6;
    env.SARTRE_POSTGRES_NEGATIVE_URL = validatedDatabaseInputs.postgres17_10;
  }
  return env;
}

function commandCodes(command: CleanCloneCommand): { failure: string; timeout: string } {
  if (!/^[a-z0-9][a-z0-9._-]{0,63}$/u.test(command.id)) {
    throw new Error("clean_clone_gate_invalid");
  }
  const token = basename(command.argv[0]);
  if (!/^[A-Za-z0-9._-]{1,64}$/u.test(token)) {
    throw new Error("clean_clone_gate_invalid");
  }
  return {
    failure: `clean_clone_gate_failed:${command.id}:${token}`,
    timeout: `clean_clone_gate_timeout:${command.id}:${token}`,
  };
}

function assertCleanCheckout(
  root: string,
  code: string,
  env?: NodeJS.ProcessEnv,
  timeoutMs = DEFAULT_TIMEOUTS.gitMs,
): void {
  const dirty = run(
    root,
    ["git", "status", "--porcelain", "--untracked-files=all"],
    "git_status_failed",
    env,
    timeoutMs,
    "clean_clone_git_timeout",
  );
  if (dirty.length > 0) {
    throw new Error(code);
  }
}

export function validateRequiredWorkflow(root: string): void {
  const workflowPath = join(root, ".github", "workflows", "ms0-required.yml");
  if (!existsSync(workflowPath)) {
    throw new Error("required_ci_workflow_missing");
  }
  const workflow = readFileSync(workflowPath, "utf8");
  for (const job of REQUIRED_CI_JOBS) {
    if (!new RegExp(`^  ${job}:\\s*$`, "mu").test(workflow)) {
      throw new Error("required_ci_job_missing");
    }
  }
  if (!/^\s*GITLEAKS_VERSION:\s*8\.28\.0\s*$/mu.test(workflow)) {
    throw new Error("gitleaks_pin_invalid");
  }
  for (const required of [
    "NODE_VERSION: 24.11.0",
    "PNPM_VERSION: 10.33.2",
    "pnpm install --frozen-lockfile --strict-peer-dependencies",
    "pnpm run toolchain:bootstrap",
    "pnpm run toolchain:check",
    "pnpm exec vitest run tests/integration/diagnostic-timeline.integration.test.ts",
    "postgres:17.6",
    "artifact-sha256.txt",
    "actions/upload-artifact@v4",
  ]) {
    if (!workflow.includes(required)) {
      throw new Error("required_ci_workflow_invalid");
    }
  }
  if (workflow.includes("pnpm run ops:trace-correlation -- --self-test")) {
    throw new Error("required_ci_workflow_invalid");
  }
}

function manifestSubjectFromCommit(root: string, evidenceCommit: string): string {
  const path = "reports/ms0-repository-constitution/evidence/manifest.json";
  const content = run(
    root,
    ["git", "show", `${evidenceCommit}:${path}`],
    "evidence_manifest_missing",
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("evidence_manifest_invalid");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("evidence_manifest_invalid");
  }
  const record = parsed as Record<string, unknown>;
  const manifest =
    typeof record.manifest === "object" &&
    record.manifest !== null &&
    !Array.isArray(record.manifest)
      ? (record.manifest as Record<string, unknown>)
      : record;
  if (typeof manifest.commitSha !== "string") {
    throw new Error("evidence_manifest_invalid");
  }
  return manifest.commitSha;
}

function assertMasterPlanStatusOnly(
  root: string,
  subjectCommit: string,
  evidenceCommit: string,
): void {
  const path = "plan/00-master-plan.md";
  const subjectTreeEntry = run(
    root,
    ["git", "ls-tree", subjectCommit, "--", path],
    "evidence_master_plan_scope_invalid",
  ).split(/\s+/u);
  const evidenceTreeEntry = run(
    root,
    ["git", "ls-tree", evidenceCommit, "--", path],
    "evidence_master_plan_scope_invalid",
  ).split(/\s+/u);
  if (
    subjectTreeEntry.length < 3 ||
    evidenceTreeEntry.length < 3 ||
    subjectTreeEntry[0] !== evidenceTreeEntry[0] ||
    subjectTreeEntry[1] !== "blob" ||
    evidenceTreeEntry[1] !== "blob"
  ) {
    throw new Error("evidence_master_plan_scope_invalid");
  }

  const subject = runRaw(
    root,
    ["git", "show", `${subjectCommit}:${path}`],
    "evidence_master_plan_scope_invalid",
  );
  const evidence = runRaw(
    root,
    ["git", "show", `${evidenceCommit}:${path}`],
    "evidence_master_plan_scope_invalid",
  );
  const subjectLines = subject.split("\n");
  const evidenceLines = evidence.split("\n");
  const sectionStart = subjectLines.indexOf("## 5. MS0：Repository Constitution 与证据基线");
  const sectionEnd = subjectLines.findIndex(
    (line, index) => index > sectionStart && /^## 6\./u.test(line),
  );
  const statusIndexes = subjectLines
    .map((line, index) => ({ line, index }))
    .filter(
      ({ line, index }) =>
        index > sectionStart && index < sectionEnd && line.startsWith("**状态：** "),
    )
    .map(({ index }) => index);
  const statusIndex = statusIndexes[0];

  if (
    subjectLines.length !== evidenceLines.length ||
    sectionStart < 0 ||
    sectionEnd < 0 ||
    statusIndexes.length !== 1 ||
    statusIndex === undefined ||
    subjectLines[statusIndex] === evidenceLines[statusIndex] ||
    evidenceLines[statusIndex] !== "**状态：** 已关闭。" ||
    subjectLines.some((line, index) => index !== statusIndex && line !== evidenceLines[index])
  ) {
    throw new Error("evidence_master_plan_scope_invalid");
  }
}

export function verifyEvidenceCommit(options: VerifyEvidenceCommitOptions): void {
  const root = realpathSync(resolve(options.repositoryRoot));
  if (
    !/^[0-9a-f]{40}$/u.test(options.evidenceCommit) ||
    !/^[0-9a-f]{40}$/u.test(options.declaredSubject)
  ) {
    throw new Error("evidence_commit_invalid");
  }
  const manifestCommitSha =
    options.manifestCommitSha ?? manifestSubjectFromCommit(root, options.evidenceCommit);
  if (manifestCommitSha === options.evidenceCommit) {
    throw new Error("evidence_commit_self_reference");
  }

  const relationship = run(
    root,
    ["git", "rev-list", "--parents", "-n", "1", options.evidenceCommit],
    "evidence_commit_invalid",
  ).split(/\s+/u);
  if (relationship.length !== 2 || relationship[1] !== options.declaredSubject) {
    throw new Error("evidence_commit_parent_mismatch");
  }
  if (manifestCommitSha !== options.declaredSubject) {
    throw new Error("evidence_manifest_subject_mismatch");
  }

  const paths = run(
    root,
    ["git", "diff", "--name-only", options.declaredSubject, options.evidenceCommit],
    "evidence_commit_invalid",
  )
    .split("\n")
    .filter(Boolean);
  if (
    paths.some(
      (path) =>
        !path.startsWith("reports/ms0-repository-constitution/") &&
        path !== "plan/00-master-plan.md",
    )
  ) {
    throw new Error("evidence_commit_path_forbidden");
  }
  if (paths.includes("plan/00-master-plan.md")) {
    assertMasterPlanStatusOnly(root, options.declaredSubject, options.evidenceCommit);
  }
}

export async function verifyCleanClone(
  options: VerifyCleanCloneOptions,
): Promise<CleanCloneVerificationResult> {
  if (!/^[0-9a-f]{40}$/u.test(options.subject)) {
    throw new Error("subject_commit_invalid");
  }

  const repositoryRoot = realpathSync(resolve(options.repositoryRoot));
  const temporaryRoot = mkdtempSync(join(tmpdir(), "sartre-clean-clone-"));
  const cloneRoot = join(temporaryRoot, "repository");

  try {
    const timeouts = resolveTimeouts(options.timeouts);
    const childEnvironment = createCleanCloneEnvironment(temporaryRoot, options.databaseInputs);
    run(
      repositoryRoot,
      ["git", "cat-file", "-e", `${options.subject}^{commit}`],
      "subject_missing",
      childEnvironment,
      timeouts.gitMs,
      "clean_clone_git_timeout",
    );
    assertCleanCheckout(repositoryRoot, "source_checkout_dirty", childEnvironment, timeouts.gitMs);
    run(
      repositoryRoot,
      ["git", "clone", "--no-hardlinks", "--no-checkout", repositoryRoot, cloneRoot],
      "clean_clone_failed",
      childEnvironment,
      timeouts.gitMs,
      "clean_clone_git_timeout",
    );
    run(
      cloneRoot,
      ["git", "checkout", "--detach", options.subject],
      "subject_checkout_failed",
      childEnvironment,
      timeouts.gitMs,
      "clean_clone_git_timeout",
    );
    const cloneHead = run(
      cloneRoot,
      ["git", "rev-parse", "HEAD"],
      "subject_observation_failed",
      childEnvironment,
      timeouts.gitMs,
      "clean_clone_git_timeout",
    );
    if (cloneHead !== options.subject) {
      throw new Error("subject_commit_mismatch");
    }

    if (!options.skipRepositoryPolicy) {
      validateRequiredWorkflow(cloneRoot);
      if (
        status(
          cloneRoot,
          ["pnpm", "install", "--frozen-lockfile", "--strict-peer-dependencies"],
          childEnvironment,
          timeouts.installMs,
          "clean_clone_install_timeout",
        ) !== 0
      ) {
        throw new Error("frozen_lockfile_required");
      }
      const packRoot = mkdtempSync(join(tmpdir(), "sartre-root-pack-probe-"));
      try {
        if (
          status(
            cloneRoot,
            ["pnpm", "pack", "--pack-destination", packRoot],
            childEnvironment,
            timeouts.packMs,
            "clean_clone_pack_timeout",
          ) === 0
        ) {
          throw new Error("root_packaging_allowed");
        }
      } finally {
        rmSync(packRoot, { recursive: true, force: true });
      }
    }

    const commands = options.commands ?? DEFAULT_COMMANDS;
    for (const command of commands) {
      const codes = commandCodes(command);
      run(cloneRoot, command.argv, codes.failure, childEnvironment, timeouts.gateMs, codes.timeout);
    }

    assertCleanCheckout(cloneRoot, "generated_source_drift", childEnvironment, timeouts.gitMs);

    return { subject: options.subject, cloneHead, cloneRoot };
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

function parseSubject(argv: string[]): string {
  if (argv.length !== 2 || argv[0] !== "--subject" || !argv[1]) {
    throw new Error("usage: --subject <commit-sha>");
  }
  return argv[1];
}

async function cli(): Promise<void> {
  const subject = parseSubject(process.argv.slice(2));
  const postgres17_6 = process.env.SARTRE_DATABASE_URL;
  const postgres17_10 = process.env.SARTRE_POSTGRES_NEGATIVE_URL;
  const databaseInputs =
    postgres17_6 === undefined && postgres17_10 === undefined
      ? undefined
      : postgres17_6 !== undefined && postgres17_10 !== undefined
        ? { postgres17_6, postgres17_10 }
        : (() => {
            throw new Error("clean_clone_database_input_invalid");
          })();
  await verifyCleanClone({ repositoryRoot: process.cwd(), subject, databaseInputs });
  process.stdout.write(`Clean-clone verification passed for ${subject}.\n`);
}

const isEntrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;
if (isEntrypoint) {
  cli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "clean_clone_verification_failed";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
