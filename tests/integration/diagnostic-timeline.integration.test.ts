import { randomBytes, randomUUID } from "node:crypto";
import { type ChildProcess, spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, test } from "vitest";

import * as contracts from "../../packages/contracts/src/index.js";
import * as sdk from "../../packages/sdk/src/index.js";
import {
  type DisposableDatabase,
  queryDatabase,
  withDisposableDatabase,
} from "../../scripts/postgres/create-test-database.js";
import * as migrations from "../../scripts/postgres/migrate.js";
import { verifyPostgresVersion } from "../../scripts/postgres/verify-version.js";

const LOOPBACK_HOST = "127.0.0.1";
const POSTGRES_ADMIN_URL = "postgresql://postgres@127.0.0.1:54326/postgres";
const EXPECTED_SERVER_VERSION_NUM = "170006";
const TEST_COMMIT_SHA = "d".repeat(40);
const TSX_CLI = fileURLToPath(import.meta.resolve("tsx/cli"));
const START_TIMEOUT_MS = 15_000;
const TEST_TIMEOUT_MS = 60_000;
const OUTPUT_LIMIT_BYTES = 32 * 1024;

interface RunningHub {
  readonly child: ChildProcess;
  readonly baseUrl: string;
  stop: () => Promise<void>;
}

interface DiagnosticsClient {
  submitProbe: (request: unknown) => Promise<unknown>;
  readCorrelation: (correlationId: string) => Promise<unknown>;
}

type DiagnosticsClientFactory = (options: {
  hubBaseUrl: string;
  ms0SelfTestToken: string;
  timeoutMs: number;
}) => DiagnosticsClient;

type DiagnosticHarness = {
  readonly database: DisposableDatabase;
  readonly hub: RunningHub;
  readonly selfTestToken: string;
};

const liveHubs = new Set<RunningHub>();

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function reserveEphemeralPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, LOOPBACK_HOST, resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("diagnostic_loopback_port_unavailable");
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return address.port;
}

async function waitForExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.off("exit", onExit);
      reject(new Error("diagnostic_process_stop_timeout"));
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timeout);
      resolve();
    };
    child.once("exit", onExit);
  });
}

async function stopHub(hub: RunningHub): Promise<void> {
  if (hub.child.exitCode === null && hub.child.signalCode === null) {
    hub.child.kill("SIGTERM");
    try {
      await waitForExit(hub.child, 3_000);
    } catch (gracefulError) {
      hub.child.kill("SIGKILL");
      try {
        await waitForExit(hub.child, 3_000);
      } catch (forcedError) {
        throw new AggregateError([gracefulError, forcedError], "diagnostic_hub_stop_failed");
      }
    }
  }
  liveHubs.delete(hub);
}

async function waitForLiveness(hub: RunningHub): Promise<void> {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (hub.child.exitCode !== null || hub.child.signalCode !== null) {
      throw new Error("diagnostic_hub_exited_before_liveness");
    }
    try {
      const response = await fetch(`${hub.baseUrl}/livez`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.status === 200) return;
    } catch {
      // Connection refusal is expected while the real child binds its loopback port.
    }
    await delay(50);
  }
  throw new Error("diagnostic_hub_liveness_timeout");
}

async function startHub(options: {
  databaseUrl: string;
  selfTestToken?: string;
}): Promise<RunningHub> {
  const port = await reserveEphemeralPort();
  const child = spawn(
    process.execPath,
    [TSX_CLI, "--tsconfig", "apps/hub-api/tsconfig.json", "apps/hub-api/src/main.ts"],
    {
      cwd: process.cwd(),
      env: {
        NODE_ENV: "test",
        SARTRE_HOST: LOOPBACK_HOST,
        SARTRE_PORT: String(port),
        SARTRE_SERVICE_VERSION: "0.1.0-test",
        SARTRE_COMMIT_SHA: TEST_COMMIT_SHA,
        SARTRE_DATABASE_URL: options.databaseUrl,
        ...(options.selfTestToken
          ? {
              SARTRE_MS0_SELF_TEST: "enabled",
              SARTRE_MS0_SELF_TEST_TOKEN: options.selfTestToken,
              SARTRE_WORKER_HEARTBEAT_DEADLINE_MS: "500",
            }
          : {}),
      },
      shell: false,
      stdio: "ignore",
    },
  );
  const hub: RunningHub = {
    child,
    baseUrl: `http://${LOOPBACK_HOST}:${port}`,
    stop: async () => stopHub(hub),
  };
  liveHubs.add(hub);
  child.once("exit", () => liveHubs.delete(hub));
  child.once("error", () => {
    if (child.pid === undefined) liveHubs.delete(hub);
  });
  await waitForLiveness(hub);
  return hub;
}

function diagnosticsClientFactory(): DiagnosticsClientFactory {
  const factory = (sdk as typeof sdk & { createDiagnosticsClient?: unknown })
    .createDiagnosticsClient;
  expect(factory).toBeTypeOf("function");
  return factory as DiagnosticsClientFactory;
}

function timelineSchema(): { parse: (input: unknown) => Record<string, unknown> } {
  const schema = (
    contracts as typeof contracts & {
      DiagnosticTimelineSchema?: { parse: (input: unknown) => Record<string, unknown> };
    }
  ).DiagnosticTimelineSchema;
  expect(schema).toBeDefined();
  return schema as { parse: (input: unknown) => Record<string, unknown> };
}

function createProbeRequest(correlationId: string, dependencyOutcome: "healthy" | "unavailable") {
  const userId = randomUUID();
  return {
    context: {
      requestId: randomUUID(),
      correlationId,
      causationId: randomUUID(),
      workspaceId: null,
      userId,
      initiatedByUserId: userId,
      actorType: "system",
      actorId: "ms0-diagnostic-self-test",
      component: "hub-api",
      operation: "diagnostics.probe",
      stage: "request_received",
      status: "started",
      resourceType: null,
      resourceId: null,
      requirementId: null,
      sessionId: null,
      executionId: null,
      leaseId: null,
      endpointId: null,
      occurredAt: new Date().toISOString(),
      errorCode: null,
      retryable: false,
    },
    dependencyOutcome,
  } as const;
}

async function applyApprovedMigrations(connectionString: string): Promise<void> {
  const loadApprovedMigrations = (
    migrations as typeof migrations & {
      loadApprovedMigrations?: () => Promise<readonly migrations.MigrationArtifact[]>;
    }
  ).loadApprovedMigrations;
  expect(loadApprovedMigrations).toBeTypeOf("function");
  const artifacts = await loadApprovedMigrations?.();
  expect(artifacts?.map((artifact) => artifact.version)).toEqual([
    "000001_ms0_baseline",
    "000002_ms0_diagnostics",
  ]);
  for (const artifact of artifacts ?? []) {
    await migrations.migrateDatabase({ connectionString, artifact });
  }
}

async function withDiagnosticHarness(
  operation: (harness: DiagnosticHarness) => Promise<void>,
): Promise<void> {
  const version = await verifyPostgresVersion(POSTGRES_ADMIN_URL);
  expect(version.serverVersionNum).toBe(EXPECTED_SERVER_VERSION_NUM);

  await withDisposableDatabase(POSTGRES_ADMIN_URL, "diagnostics", async (database) => {
    let hub: RunningHub | undefined;
    let operationError: unknown;
    try {
      await applyApprovedMigrations(database.connectionString);
      const selfTestToken = randomBytes(32).toString("hex");
      hub = await startHub({ databaseUrl: database.connectionString, selfTestToken });
      await operation({ database, hub, selfTestToken });
    } catch (error) {
      operationError = error;
    }

    let cleanupError: unknown;
    if (hub) {
      try {
        await hub.stop();
      } catch (error) {
        cleanupError = error;
      }
    }
    if (operationError !== undefined && cleanupError !== undefined) {
      throw new AggregateError(
        [operationError, cleanupError],
        "diagnostic_operation_and_cleanup_failed",
      );
    }
    if (operationError !== undefined) throw operationError;
    if (cleanupError !== undefined) throw cleanupError;
  });
}

async function runCliSubprocess(options: {
  hubBaseUrl: string;
  selfTestToken: string;
  correlationId: string;
}): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        TSX_CLI,
        "scripts/ops/trace-correlation.ts",
        "--self-test",
        "--correlation-id",
        options.correlationId,
      ],
      {
        cwd: process.cwd(),
        env: {
          NODE_ENV: "test",
          SARTRE_HUB_BASE_URL: options.hubBaseUrl,
          SARTRE_MS0_SELF_TEST_TOKEN: options.selfTestToken,
        },
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      child.kill("SIGKILL");
      settled = true;
      reject(new Error("diagnostic_cli_timeout"));
    }, START_TIMEOUT_MS);
    const append = (target: "stdout" | "stderr", chunk: Buffer) => {
      if (settled) return;
      if (
        Buffer.byteLength(stdout) + Buffer.byteLength(stderr) + chunk.length >
        OUTPUT_LIMIT_BYTES
      ) {
        child.kill("SIGKILL");
        settled = true;
        clearTimeout(timeout);
        reject(new Error("diagnostic_cli_output_limit_exceeded"));
        return;
      }
      if (target === "stdout") stdout += chunk.toString("utf8");
      else stderr += chunk.toString("utf8");
    };
    child.stdout?.on("data", (chunk: Buffer) => append("stdout", chunk));
    child.stderr?.on("data", (chunk: Buffer) => append("stderr", chunk));
    child.once("error", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(new Error("diagnostic_cli_spawn_failed"));
    });
    child.once("exit", (exitCode) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ exitCode, stdout, stderr });
    });
  });
}

afterAll(async () => {
  const errors: unknown[] = [];
  for (const hub of [...liveHubs]) {
    try {
      await hub.stop();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) throw new AggregateError(errors, "diagnostic_global_cleanup_failed");
});

describe.sequential("MS0 diagnostic timeline", () => {
  test(
    "persists ordered safe stages and localizes a forced dependency failure through real Hub HTTP",
    async () => {
      await withDiagnosticHarness(async ({ database, hub, selfTestToken }) => {
        const client = diagnosticsClientFactory()({
          hubBaseUrl: hub.baseUrl,
          ms0SelfTestToken: selfTestToken,
          timeoutMs: 2_000,
        });
        const healthyCorrelationId = randomUUID();
        const healthy = timelineSchema().parse(
          await client.submitProbe(createProbeRequest(healthyCorrelationId, "healthy")),
        );
        expect(
          (healthy.timelineItems as Array<{ context: { stage: string } }>).map(
            (item) => item.context.stage,
          ),
        ).toEqual(["request_received", "context_validated", "dependency_check", "probe_completed"]);
        expect(healthy).toMatchObject({
          lastSuccessfulStage: "probe_completed",
          firstFailedStage: null,
          currentState: "completed",
          suggestedRecoveryAction: "none",
        });

        const failedCorrelationId = randomUUID();
        const failed = timelineSchema().parse(
          await client.submitProbe(createProbeRequest(failedCorrelationId, "unavailable")),
        );
        expect(failed).toMatchObject({
          correlationId: failedCorrelationId,
          lastSuccessfulStage: "context_validated",
          firstFailedStage: "dependency_check",
          currentState: "failed",
          suggestedRecoveryAction: "restore_dependency_and_retry",
        });
        expect(
          (failed.timelineItems as Array<{ context: { errorCode: string | null } }>).at(-1)?.context
            .errorCode,
        ).toBe("dependency_unavailable");
        expect(await client.readCorrelation(failedCorrelationId)).toEqual(failed);

        const retainedRows = await queryDatabase<{
          recorded_at: Date;
          retention_expires_at: Date;
        }>(
          database.connectionString,
          `SELECT recorded_at, retention_expires_at
             FROM diagnostic_records
            WHERE correlation_id = $1
            ORDER BY sequence`,
          [failedCorrelationId],
        );
        expect(retainedRows).toHaveLength(3);
        expect(
          retainedRows.every(
            (row) => row.retention_expires_at.getTime() > row.recorded_at.getTime(),
          ),
        ).toBe(true);

        const columns = await queryDatabase<{ column_name: string }>(
          database.connectionString,
          `SELECT column_name
             FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'diagnostic_records'
            ORDER BY column_name`,
        );
        expect(columns.map((column) => column.column_name)).not.toEqual(
          expect.arrayContaining(["aggregate_version", "domain_event", "body", "raw_output"]),
        );
        expect(JSON.stringify({ healthy, failed })).not.toMatch(
          /messageBody|prompt|secret|localPath|sql|stack|rawOutput/iu,
        );
      });
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "keeps diagnostics absent in production and returns the same redacted denial for a wrong token",
    async () => {
      await withDiagnosticHarness(async ({ database, hub, selfTestToken }) => {
        const correlationId = randomUUID();
        const internalPath = `/__ms0/self-test/diagnostics/correlations/${correlationId}`;
        const wrongToken = await fetch(`${hub.baseUrl}${internalPath}`, {
          headers: { "x-sartre-ms0-session": `${selfTestToken.slice(0, -1)}0` },
        });
        expect(wrongToken.status).toBe(404);
        const wrongTokenBody = await wrongToken.text();
        expect(wrongTokenBody).not.toMatch(/diagnostic|correlation|token|database/iu);

        const productionHub = await startHub({ databaseUrl: database.connectionString });
        try {
          const production = await fetch(`${productionHub.baseUrl}${internalPath}`);
          expect(production.status).toBe(404);
          expect(await production.text()).toBe(wrongTokenBody);
        } finally {
          await productionHub.stop();
        }
      });
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "returns a stable degraded SDK and CLI failure for a persisted partial timeline",
    async () => {
      await withDiagnosticHarness(async ({ database, hub, selfTestToken }) => {
        const correlationId = randomUUID();
        const client = diagnosticsClientFactory()({
          hubBaseUrl: hub.baseUrl,
          ms0SelfTestToken: selfTestToken,
          timeoutMs: 2_000,
        });
        await client.submitProbe(createProbeRequest(correlationId, "healthy"));
        await queryDatabase(
          database.connectionString,
          "DELETE FROM diagnostic_records WHERE correlation_id = $1 AND sequence = 4",
          [correlationId],
        );

        let sdkError: unknown;
        try {
          await client.readCorrelation(correlationId);
        } catch (error) {
          sdkError = error;
        }
        const subprocess = await runCliSubprocess({
          hubBaseUrl: hub.baseUrl,
          selfTestToken,
          correlationId,
        });

        expect(sdkError).toMatchObject({ code: "degraded", status: 503 });
        expect(subprocess).toEqual({ exitCode: 1, stdout: "", stderr: "degraded\n" });
        expect(`${subprocess.stdout}${subprocess.stderr}`).not.toContain(selfTestToken);
        expect(`${subprocess.stdout}${subprocess.stderr}`).not.toContain(hub.baseUrl);
        expect(`${subprocess.stdout}${subprocess.stderr}`).not.toContain(correlationId);
      });
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "returns a stable degraded SDK and CLI failure for a persisted malformed row",
    async () => {
      await withDiagnosticHarness(async ({ database, hub, selfTestToken }) => {
        const correlationId = randomUUID();
        const client = diagnosticsClientFactory()({
          hubBaseUrl: hub.baseUrl,
          ms0SelfTestToken: selfTestToken,
          timeoutMs: 2_000,
        });
        await client.submitProbe(createProbeRequest(correlationId, "healthy"));
        await queryDatabase(
          database.connectionString,
          "UPDATE diagnostic_records SET actor_id = '' WHERE correlation_id = $1 AND sequence = 2",
          [correlationId],
        );

        let sdkError: unknown;
        try {
          await client.readCorrelation(correlationId);
        } catch (error) {
          sdkError = error;
        }
        const subprocess = await runCliSubprocess({
          hubBaseUrl: hub.baseUrl,
          selfTestToken,
          correlationId,
        });

        expect(sdkError).toMatchObject({ code: "degraded", status: 503 });
        expect(subprocess).toEqual({ exitCode: 1, stdout: "", stderr: "degraded\n" });
        expect(`${subprocess.stdout}${subprocess.stderr}`).not.toContain(selfTestToken);
        expect(`${subprocess.stdout}${subprocess.stderr}`).not.toContain(hub.baseUrl);
        expect(`${subprocess.stdout}${subprocess.stderr}`).not.toContain(correlationId);
      });
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "uses only the SDK Hub port from programmatic and real subprocess CLI paths",
    async () => {
      await withDiagnosticHarness(async ({ hub, selfTestToken }) => {
        const failedCorrelationId = randomUUID();
        const client = diagnosticsClientFactory()({
          hubBaseUrl: hub.baseUrl,
          ms0SelfTestToken: selfTestToken,
          timeoutMs: 2_000,
        });
        await client.submitProbe(createProbeRequest(failedCorrelationId, "unavailable"));

        const opsModule = (await import("../../scripts/ops/trace-correlation.js")) as {
          runTraceCorrelationCli?: (options: {
            argv: readonly string[];
            environment: Readonly<Record<string, string | undefined>>;
            stdout: (line: string) => void;
            stderr: (line: string) => void;
          }) => Promise<number>;
        };
        expect(opsModule.runTraceCorrelationCli).toBeTypeOf("function");
        const programmaticOutput: string[] = [];
        const programmaticErrors: string[] = [];
        const programmaticExit = await opsModule.runTraceCorrelationCli?.({
          argv: ["--self-test", "--correlation-id", failedCorrelationId],
          environment: {
            SARTRE_HUB_BASE_URL: hub.baseUrl,
            SARTRE_MS0_SELF_TEST_TOKEN: selfTestToken,
          },
          stdout: (line) => programmaticOutput.push(line),
          stderr: (line) => programmaticErrors.push(line),
        });
        expect(programmaticExit).toBe(1);
        expect(programmaticErrors).toEqual([]);
        expect(programmaticOutput.join("\n")).toMatch(/"lastSuccessfulStage":"context_validated"/u);
        expect(programmaticOutput.join("\n")).toMatch(/"firstFailedStage":"dependency_check"/u);

        const subprocess = await runCliSubprocess({
          hubBaseUrl: hub.baseUrl,
          selfTestToken,
          correlationId: failedCorrelationId,
        });
        expect(subprocess.exitCode).toBe(1);
        expect(subprocess.stderr).toBe("");
        expect(subprocess.stdout).toContain('"currentState":"failed"');
        expect(subprocess.stdout).toContain(
          '"suggestedRecoveryAction":"restore_dependency_and_retry"',
        );
        expect(`${programmaticOutput.join("\n")}\n${subprocess.stdout}`).not.toContain(
          selfTestToken,
        );
        expect(`${programmaticOutput.join("\n")}\n${subprocess.stdout}`).not.toContain(hub.baseUrl);
      });
    },
    TEST_TIMEOUT_MS,
  );
});
