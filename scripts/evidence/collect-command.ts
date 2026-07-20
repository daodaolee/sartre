import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";

import type { EvidenceAssertion, EvidenceCommand } from "../../packages/contracts/src/evidence.js";
import { scanTextForSecrets } from "../constitution/secret-boundary.js";

export type CommandPolicyId =
  | "tool.node.version"
  | "tool.pnpm.version"
  | "task3.focused-tests"
  | "fixture.missing-command"
  | "fixture.hang"
  | "fixture.flood";

type ExtractorKind = "node-version" | "pnpm-version" | "vitest" | "none";

interface CommandPolicy {
  actualArgv: (repositoryRoot: string) => string[];
  evidenceArgv: readonly string[];
  timeoutMs: number;
  maxOutputBytes: number;
  extractor: ExtractorKind;
}

const HEARTBEAT_CHILD_SCRIPT =
  'const fs=require("node:fs"),p=require("node:path"),m=process.argv[1],r=process.argv[2];process.on("SIGTERM",()=>{});fs.mkdirSync(p.dirname(m),{recursive:true});fs.writeFileSync(r,String(process.pid));fs.appendFileSync(m,"x");setInterval(()=>fs.appendFileSync(m,"x"),10);setTimeout(()=>process.exit(0),8000);';
const HANG_PARENT_SCRIPT =
  'const c=require("node:child_process"),m=process.argv[1],r=process.argv[2],s=process.argv[3];c.spawn(process.execPath,["-e",s,m,r],{stdio:"ignore"});setInterval(()=>{},1000);';
const FLOOD_SCRIPT = 'const chunk="x".repeat(1024);for(;;){process.stdout.write(chunk);}';

const COMMAND_POLICIES: Readonly<Record<CommandPolicyId, CommandPolicy>> = {
  "tool.node.version": {
    actualArgv: () => [process.execPath, "--version"],
    evidenceArgv: ["node", "--version"],
    timeoutMs: 5_000,
    maxOutputBytes: 64 * 1024,
    extractor: "node-version",
  },
  "tool.pnpm.version": {
    actualArgv: () => ["pnpm", "--version"],
    evidenceArgv: ["pnpm", "--version"],
    timeoutMs: 5_000,
    maxOutputBytes: 64 * 1024,
    extractor: "pnpm-version",
  },
  "task3.focused-tests": {
    actualArgv: () => [
      "pnpm",
      "exec",
      "vitest",
      "run",
      "scripts/evidence/validate.test.ts",
      "scripts/harness/run-required-gates.test.ts",
    ],
    evidenceArgv: [
      "pnpm",
      "exec",
      "vitest",
      "run",
      "scripts/evidence/validate.test.ts",
      "scripts/harness/run-required-gates.test.ts",
    ],
    timeoutMs: 120_000,
    maxOutputBytes: 2 * 1024 * 1024,
    extractor: "vitest",
  },
  "fixture.missing-command": {
    actualArgv: () => ["/sartre-ms0-required-command-does-not-exist"],
    evidenceArgv: ["<fixture:missing-command>"],
    timeoutMs: 1_000,
    maxOutputBytes: 4 * 1024,
    extractor: "none",
  },
  "fixture.hang": {
    actualArgv: (repositoryRoot) => [
      process.execPath,
      "-e",
      HANG_PARENT_SCRIPT,
      join(repositoryRoot, "reports", "ms0", "raw", "lifecycle", "heartbeat.log"),
      join(repositoryRoot, "reports", "ms0", "raw", "lifecycle", "descendant.pid"),
      HEARTBEAT_CHILD_SCRIPT,
    ],
    evidenceArgv: ["node", "<fixture:hang>"],
    timeoutMs: 3_000,
    maxOutputBytes: 4 * 1024,
    extractor: "none",
  },
  "fixture.flood": {
    actualArgv: () => [process.execPath, "-e", FLOOD_SCRIPT],
    evidenceArgv: ["node", "<fixture:flood>"],
    timeoutMs: 2_000,
    maxOutputBytes: 4 * 1024,
    extractor: "none",
  },
};

export function isCommandPolicyId(value: unknown): value is CommandPolicyId {
  return typeof value === "string" && value in COMMAND_POLICIES;
}

export function matchesCommandPolicyArgv(
  policyId: CommandPolicyId,
  argv: readonly string[],
): boolean {
  const expected = COMMAND_POLICIES[policyId].evidenceArgv;
  return expected.length === argv.length && expected.every((value, index) => value === argv[index]);
}

export interface CollectCommandInput {
  gateId: string;
  policyId: CommandPolicyId;
  repositoryRoot: string;
  rawLogDirectory: string;
}

export interface CommandExecutionOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
  targetExecuted: boolean;
}

export interface CollectCommandDependencies {
  execute?: (argv: readonly string[]) => Promise<CommandExecutionOutput>;
  signalProcess?: (target: number, signal: NodeJS.Signals) => boolean | undefined;
}

export interface CollectedCommandAttempt {
  gateId: string;
  command: EvidenceCommand;
  stdoutHash: string;
  stderrHash: string;
  testCount: number;
  failureCount: number;
  keyAssertions: string[];
  errorCodes: string[];
  toolVersions: Record<string, string>;
  targetExecuted: boolean;
  failureModeVerified: boolean;
  serviceStatus: null;
  artifactHashes: string[];
  rawLogReference: string;
}

interface ExtractedFacts {
  assertions: EvidenceAssertion[];
  testCount: number;
  failureCount: number;
  keyAssertions: string[];
  errorCodes: string[];
  toolVersions: Record<string, string>;
  failureModeVerified: boolean;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(record: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(record).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function parseInput(input: unknown): CollectCommandInput {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, ["gateId", "policyId", "repositoryRoot", "rawLogDirectory"]) ||
    typeof input.gateId !== "string" ||
    input.gateId.length === 0 ||
    !isCommandPolicyId(input.policyId) ||
    typeof input.repositoryRoot !== "string" ||
    input.repositoryRoot.length === 0 ||
    typeof input.rawLogDirectory !== "string" ||
    input.rawLogDirectory.length === 0
  ) {
    throw new Error("command_input_invalid");
  }
  return input as unknown as CollectCommandInput;
}

function isContained(root: string, path: string): boolean {
  const pathFromRoot = relative(root, path);
  return (
    pathFromRoot === "" ||
    (!isAbsolute(pathFromRoot) && pathFromRoot !== ".." && !pathFromRoot.startsWith(`..${sep}`))
  );
}

async function containedRawDirectory(
  repositoryRoot: string,
  rawLogDirectory: string,
): Promise<{ absolute: string; repositoryRelative: string }> {
  const root = await realpath(resolve(repositoryRoot));
  const absolute = resolve(root, rawLogDirectory);
  if (!isContained(root, absolute)) throw new Error("raw_log_path_unsafe");
  const repositoryRelative = relative(root, absolute);
  const segments = repositoryRelative.split(sep);
  if (segments[0] !== "reports" || !segments.includes("raw")) {
    throw new Error("raw_log_path_unsafe");
  }

  let cursor = root;
  for (const segment of segments) {
    cursor = join(cursor, segment);
    try {
      const stat = await lstat(cursor);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new Error("raw_log_path_unsafe");
      }
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") break;
      throw error;
    }
  }

  await mkdir(absolute, { recursive: true });
  const stat = await lstat(absolute);
  const canonical = await realpath(absolute);
  if (!stat.isDirectory() || stat.isSymbolicLink() || !isContained(root, canonical)) {
    throw new Error("raw_log_path_unsafe");
  }
  return { absolute: canonical, repositoryRelative };
}

async function spawnCommand(
  argv: readonly string[],
  timeoutMs: number,
  maxOutputBytes: number,
  signalProcess?: (target: number, signal: NodeJS.Signals) => boolean | undefined,
): Promise<CommandExecutionOutput> {
  const command = argv[0];
  if (!command) throw new Error("command_policy_invalid");
  const stdoutChunks: Buffer[] = [];
  const stderrChunks: Buffer[] = [];
  let targetExecuted = false;
  let outputBytes = 0;
  const exitCode = await new Promise<number>((resolvePromise, reject) => {
    const detachedGroup = process.platform !== "win32";
    const child = spawn(command, argv.slice(1), {
      detached: detachedGroup,
      shell: false,
      stdio: "pipe",
    });
    let settled = false;
    let terminationCode: "command_timed_out" | "command_output_limit_exceeded" | null = null;
    let forceTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = (): void => {
      clearTimeout(timeoutTimer);
      if (forceTimer) clearTimeout(forceTimer);
      child.stdout.removeAllListeners("data");
      child.stderr.removeAllListeners("data");
    };

    const settleWithError = (code: string): void => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(code));
    };

    const settleWithExit = (code: number): void => {
      if (settled) return;
      settled = true;
      cleanup();
      resolvePromise(code);
    };

    const signalChild = (signal: NodeJS.Signals): "sent" | "gone" | "failed" => {
      if (!child.pid) return "gone";
      try {
        const target = detachedGroup ? -child.pid : child.pid;
        const result = signalProcess
          ? signalProcess(target, signal)
          : detachedGroup
            ? process.kill(target, signal)
            : child.kill(signal);
        return result === false ? "failed" : "sent";
      } catch (error) {
        return error instanceof Error && "code" in error && error.code === "ESRCH"
          ? "gone"
          : "failed";
      }
    };

    const terminate = (code: "command_timed_out" | "command_output_limit_exceeded"): void => {
      if (terminationCode !== null || settled) return;
      terminationCode = code;
      child.stdout.pause();
      child.stderr.pause();
      const gracefulSignal = signalChild("SIGTERM");
      if (gracefulSignal === "failed") {
        settleWithError("command_termination_failed");
        return;
      }
      if (gracefulSignal === "gone") {
        settleWithError(code);
        return;
      }
      forceTimer = setTimeout(() => {
        const forcedSignal = signalChild("SIGKILL");
        settleWithError(forcedSignal === "failed" ? "command_termination_failed" : code);
      }, 100);
    };

    const timeoutTimer = setTimeout(() => terminate("command_timed_out"), timeoutMs);
    const capture = (chunks: Buffer[], chunk: Buffer | string): void => {
      if (terminationCode !== null || settled) return;
      const buffer = Buffer.from(chunk);
      if (outputBytes + buffer.length > maxOutputBytes) {
        terminate("command_output_limit_exceeded");
        return;
      }
      outputBytes += buffer.length;
      chunks.push(buffer);
    };

    child.once("spawn", () => {
      targetExecuted = true;
    });
    child.stdout.on("data", (chunk: Buffer | string) => capture(stdoutChunks, chunk));
    child.stderr.on("data", (chunk: Buffer | string) => capture(stderrChunks, chunk));
    child.once("error", (error: NodeJS.ErrnoException) => {
      if (settled) return;
      if (terminationCode !== null) return;
      settleWithError(error.code === "ENOENT" ? "command_not_found" : "command_execution_failed");
    });
    child.once("close", (code, signal) => {
      if (settled) return;
      if (terminationCode !== null) return;
      settleWithExit(code ?? (signal === null ? 1 : 128));
    });
  });
  return {
    exitCode,
    stdout: Buffer.concat(stdoutChunks).toString("utf8"),
    stderr: Buffer.concat(stderrChunks).toString("utf8"),
    targetExecuted,
  };
}

function toolVersionFacts(name: "node" | "pnpm", output: CommandExecutionOutput): ExtractedFacts {
  const version = output.stdout.trim();
  const valid = output.exitCode === 0 && /^[v]?[0-9]+(?:\.[0-9]+){2}$/.test(version);
  return {
    assertions: [{ name: "tool_version_observed", status: valid ? "passed" : "failed" }],
    testCount: 0,
    failureCount: valid ? 0 : 1,
    keyAssertions: ["tool_version_observed"],
    errorCodes: valid ? [] : ["tool_version_invalid"],
    toolVersions: valid ? { [name]: version } : {},
    failureModeVerified: false,
  };
}

function vitestFacts(output: CommandExecutionOutput): ExtractedFacts {
  const combined = `${output.stdout}\n${output.stderr}`;
  const testsLine = combined.split(/\r?\n/u).find((line) => /^\s*Tests\s+/u.test(line));
  const counts = new Map<string, number>();
  for (const match of testsLine?.matchAll(/(\d+)\s+(passed|failed|skipped)/gu) ?? []) {
    counts.set(match[2] ?? "", Number(match[1] ?? 0));
  }
  const testCount = [...counts.values()].reduce((sum, count) => sum + count, 0);
  const failureCount = counts.get("failed") ?? 0;
  const executed = output.targetExecuted && testCount > 0;
  const noFailures = executed && output.exitCode === 0 && failureCount === 0;
  return {
    assertions: [
      { name: "vitest_tests_executed", status: executed ? "passed" : "failed" },
      { name: "vitest_no_failures", status: noFailures ? "passed" : "failed" },
    ],
    testCount,
    failureCount,
    keyAssertions: ["vitest_tests_executed", "vitest_no_failures"],
    errorCodes: [
      ...(executed ? [] : ["vitest_tests_missing"]),
      ...(noFailures ? [] : ["vitest_failed"]),
    ],
    toolVersions: {},
    failureModeVerified: output.targetExecuted,
  };
}

function extractFacts(kind: ExtractorKind, output: CommandExecutionOutput): ExtractedFacts {
  if (kind === "node-version") return toolVersionFacts("node", output);
  if (kind === "pnpm-version") return toolVersionFacts("pnpm", output);
  if (kind === "vitest") return vitestFacts(output);
  return {
    assertions: [],
    testCount: 0,
    failureCount: output.exitCode === 0 ? 0 : 1,
    keyAssertions: [],
    errorCodes: output.exitCode === 0 ? [] : ["command_failed"],
    toolVersions: {},
    failureModeVerified: false,
  };
}

export async function collectCommand(
  unsafeInput: unknown,
  dependencies: CollectCommandDependencies = {},
): Promise<CollectedCommandAttempt> {
  const input = parseInput(unsafeInput);
  const policy = COMMAND_POLICIES[input.policyId];
  const repositoryRoot = await realpath(resolve(input.repositoryRoot));
  const actualArgv = policy.actualArgv(repositoryRoot);
  const evidenceArgv = [...policy.evidenceArgv];
  const rawDirectory = await containedRawDirectory(input.repositoryRoot, input.rawLogDirectory);
  const startedAt = new Date().toISOString();
  const output = dependencies.execute
    ? await dependencies.execute(actualArgv)
    : await spawnCommand(
        actualArgv,
        policy.timeoutMs,
        policy.maxOutputBytes,
        dependencies.signalProcess,
      );
  const finishedAt = new Date().toISOString();
  const combinedOutput = `stdout\n${output.stdout}\nstderr\n${output.stderr}`;
  if (scanTextForSecrets("evidence-command-output", combinedOutput).length > 0) {
    throw new Error("secret_output_detected");
  }
  const facts = extractFacts(policy.extractor, output);
  const rawLogName = `${input.gateId.replace(/[^A-Za-z0-9_.-]/g, "_")}-${randomUUID()}.log`;
  const rawLogPath = join(rawDirectory.absolute, rawLogName);
  await writeFile(rawLogPath, combinedOutput, { mode: 0o600 });
  return {
    gateId: input.gateId,
    command: {
      argv: evidenceArgv,
      exitCode: output.exitCode,
      startedAt,
      finishedAt,
      assertions: facts.assertions,
    },
    stdoutHash: sha256(output.stdout),
    stderrHash: sha256(output.stderr),
    testCount: facts.testCount,
    failureCount: facts.failureCount,
    keyAssertions: facts.keyAssertions,
    errorCodes: facts.errorCodes,
    toolVersions: facts.toolVersions,
    targetExecuted: output.targetExecuted,
    failureModeVerified: facts.failureModeVerified,
    serviceStatus: null,
    artifactHashes: [],
    rawLogReference: join(rawDirectory.repositoryRelative, rawLogName).split(sep).join("/"),
  };
}
