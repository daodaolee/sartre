import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { spawnSyncBounded } from "./bounded-process.js";

const WORKFLOW_PATH = ".github/workflows/ms0-required.yml";
export const MS0_REQUIRED_CI_JOB_IDS = [
  "constitution",
  "postgresql-17-6",
  "electron-macos-arm64",
] as const;
const DEFAULT_CI_QUERY_TIMEOUT_MS = 30_000;

export interface CiJobRecord {
  readonly name: string;
  readonly status: string;
  readonly conclusion: string | null;
}

export interface CiArtifactRecord {
  readonly name: string;
  readonly expired: boolean;
  readonly digest: string | null;
}

export interface CiRunRecord {
  readonly id: number;
  readonly headSha: string;
  readonly workflowPath: string;
  readonly status: string;
  readonly conclusion: string | null;
  readonly htmlUrl: string;
  readonly jobs: readonly CiJobRecord[];
  readonly artifacts: readonly CiArtifactRecord[];
}

export interface VerifyCiRunOptions {
  readonly subject: string;
  readonly runs: readonly CiRunRecord[];
}

export interface VerifiedCiRun {
  readonly runId: number;
  readonly subject: string;
  readonly artifactDigests: readonly string[];
}

function jobFailureCode(job: CiJobRecord): string {
  if (job.conclusion === "skipped") return "required_ci_job_skipped";
  if (job.conclusion === "cancelled") return "required_ci_job_cancelled";
  if (job.status !== "completed") return "required_ci_job_incomplete";
  return "required_ci_job_failure";
}

export function verifyCiRun(options: VerifyCiRunOptions): VerifiedCiRun {
  if (!/^[0-9a-f]{40}$/u.test(options.subject)) {
    throw new Error("subject_commit_invalid");
  }
  if (options.runs.length === 0) {
    throw new Error("required_ci_run_absent");
  }
  const matching = options.runs
    .filter((run) => run.headSha === options.subject)
    .sort((left, right) => right.id - left.id);
  if (matching.length === 0) {
    throw new Error("required_ci_subject_mismatch");
  }
  const run = matching[0];
  if (!run || run.workflowPath !== WORKFLOW_PATH) {
    throw new Error("required_ci_workflow_mismatch");
  }
  if (run.status !== "completed") {
    throw new Error("required_ci_run_incomplete");
  }
  if (run.conclusion === "cancelled") {
    throw new Error("required_ci_run_cancelled");
  }
  if (run.conclusion !== "success") {
    throw new Error("required_ci_run_failure");
  }

  for (const requiredJob of MS0_REQUIRED_CI_JOB_IDS) {
    const job = run.jobs.find((candidate) => candidate.name === requiredJob);
    if (!job) {
      throw new Error("required_ci_job_absent");
    }
    if (job.status !== "completed" || job.conclusion !== "success") {
      throw new Error(jobFailureCode(job));
    }
  }

  const artifacts = run.artifacts.filter(
    (artifact) => artifact.name === `ms0-required-${options.subject}` && !artifact.expired,
  );
  if (artifacts.length === 0) {
    throw new Error("required_ci_artifact_absent");
  }
  if (
    artifacts.some(
      (artifact) =>
        typeof artifact.digest !== "string" || !/^sha256:[0-9a-f]{64}$/u.test(artifact.digest),
    )
  ) {
    throw new Error("required_ci_artifact_digest_invalid");
  }

  return {
    runId: run.id,
    subject: options.subject,
    artifactDigests: artifacts.map((artifact) => artifact.digest as string),
  };
}

function queryTimeout(value: number): number {
  if (!Number.isInteger(value) || value < 50 || value > 300_000) {
    throw new Error("ci_query_timeout_invalid");
  }
  return value;
}

function ghJson(args: readonly string[], timeoutMs: number): unknown {
  const result = spawnSyncBounded("gh", args, {
    encoding: "utf8",
    timeout: timeoutMs,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error && "code" in result.error && result.error.code === "ETIMEDOUT") {
    throw new Error("ci_query_timeout");
  }
  if (result.status !== 0) {
    throw new Error("ci_unavailable");
  }
  try {
    return JSON.parse(result.stdout);
  } catch {
    throw new Error("ci_response_invalid");
  }
}

function record(value: unknown, code = "ci_response_invalid"): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(code);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("ci_response_invalid");
  return value;
}

function string(value: unknown): string {
  if (typeof value !== "string") throw new Error("ci_response_invalid");
  return value;
}

function nullableString(value: unknown): string | null {
  if (value === null) return null;
  return string(value);
}

function number(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error("ci_response_invalid");
  }
  return value;
}

function repositoryName(timeoutMs: number): string {
  const response = record(ghJson(["repo", "view", "--json", "nameWithOwner"], timeoutMs));
  return string(response.nameWithOwner);
}

export function loadCiRuns(
  subject: string,
  requestedTimeoutMs = DEFAULT_CI_QUERY_TIMEOUT_MS,
): CiRunRecord[] {
  const timeoutMs = queryTimeout(requestedTimeoutMs);
  const repository = repositoryName(timeoutMs);
  const runsResponse = record(
    ghJson(
      [
        "api",
        "--method",
        "GET",
        `repos/${repository}/actions/workflows/ms0-required.yml/runs`,
        "-f",
        `head_sha=${subject}`,
        "-f",
        "per_page=20",
      ],
      timeoutMs,
    ),
  );
  return array(runsResponse.workflow_runs).map((rawRun) => {
    const run = record(rawRun);
    const id = number(run.id);
    const jobsResponse = record(
      ghJson(["api", "--method", "GET", `repos/${repository}/actions/runs/${id}/jobs`], timeoutMs),
    );
    const artifactsResponse = record(
      ghJson(
        ["api", "--method", "GET", `repos/${repository}/actions/runs/${id}/artifacts`],
        timeoutMs,
      ),
    );
    return {
      id,
      headSha: string(run.head_sha),
      workflowPath: string(run.path),
      status: string(run.status),
      conclusion: nullableString(run.conclusion),
      htmlUrl: string(run.html_url),
      jobs: array(jobsResponse.jobs).map((rawJob) => {
        const job = record(rawJob);
        return {
          name: string(job.name),
          status: string(job.status),
          conclusion: nullableString(job.conclusion),
        };
      }),
      artifacts: array(artifactsResponse.artifacts).map((rawArtifact) => {
        const artifact = record(rawArtifact);
        if (typeof artifact.expired !== "boolean") throw new Error("ci_response_invalid");
        return {
          name: string(artifact.name),
          expired: artifact.expired,
          digest: nullableString(artifact.digest),
        };
      }),
    };
  });
}

function parseSubject(argv: string[]): string {
  const normalized = argv[0] === "--" ? argv.slice(1) : argv;
  if (normalized.length !== 2 || normalized[0] !== "--subject" || !normalized[1]) {
    throw new Error("usage: --subject <commit-sha>");
  }
  return normalized[1];
}

function cli(): void {
  const subject = parseSubject(process.argv.slice(2));
  const verified = verifyCiRun({ subject, runs: loadCiRuns(subject) });
  process.stdout.write(`${JSON.stringify(verified)}\n`);
}

const isEntrypoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href === import.meta.url
  : false;
if (isEntrypoint) {
  try {
    cli();
  } catch (error) {
    const message = error instanceof Error ? error.message : "ci_verification_failed";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}
