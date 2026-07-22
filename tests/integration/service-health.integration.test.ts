import { randomBytes } from "node:crypto";
import { type ChildProcess, spawn } from "node:child_process";
import { createServer, type Socket } from "node:net";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, test } from "vitest";

import * as contracts from "../../packages/contracts/src/index.js";
import { HealthSnapshotSchema, type HealthSnapshot } from "../../packages/contracts/src/index.js";
import * as sdk from "../../packages/sdk/src/index.js";
import {
  type DisposableDatabase,
  withDisposableDatabase,
} from "../../scripts/postgres/create-test-database.js";
import { migrateApprovedMigrations } from "../../scripts/postgres/migrate.js";

const LOOPBACK_HOST = "127.0.0.1";
const POSTGRES_ADMIN_URL = "postgresql://postgres@127.0.0.1:54326/postgres";
const POSTGRES_CONTAINER = "sartre-postgres-17-6";
const DOCKER_CLI = "docker";
const MINIMAL_CHILD_PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
const TSX_CLI = fileURLToPath(import.meta.resolve("tsx/cli"));
const TEST_COMMIT_SHA = "a".repeat(40);
const PROCESS_START_TIMEOUT_MS = 15_000;
const POLL_TIMEOUT_MS = 10_000;
const TEST_TIMEOUT_MS = 90_000;
const DEFAULT_COMMAND_POLICY: CommandPolicy = {
  timeoutMs: 20_000,
  terminationGraceMs: 2_000,
};

type ServiceName = "hub-api" | "hub-worker" | "local-runtime";
type ProcessName = ServiceName | "electron";

interface RunningProcess {
  readonly name: ServiceName;
  readonly child: ChildProcess;
  readonly baseUrl: string;
  stop: () => Promise<void>;
}

interface RunningHarness {
  readonly database: DisposableDatabase;
  readonly hub: RunningProcess;
  readonly worker: RunningProcess;
  readonly runtime: RunningProcess;
  readonly selfTestToken: string;
  restartWorker: () => Promise<RunningProcess>;
}

interface HealthClient {
  readAggregatedHealth: (
    electronSnapshot: HealthSnapshot,
    signal?: AbortSignal,
  ) => Promise<unknown>;
}

type HealthClientFactory = (options: {
  hubBaseUrl: string;
  localRuntimeBaseUrl: string;
  ms0SelfTestToken: string;
  timeoutMs: number;
}) => HealthClient;

const liveChildren = new Set<RunningProcess>();
const liveCommands = new Set<ChildProcess>();

type CleanupTask = () => Promise<void>;
interface CommandPolicy {
  readonly timeoutMs: number;
  readonly terminationGraceMs: number;
}

interface RunCommandOptions {
  readonly policy?: CommandPolicy;
  readonly onSpawn?: (child: ChildProcess) => void;
}

interface PostgresRecoveryController {
  needsRecovery: () => boolean;
  stop: () => Promise<void>;
  start: () => Promise<void>;
}

interface PostgresRecoveryDependencies {
  runDocker: (args: readonly string[]) => Promise<void>;
  probeReadiness: () => Promise<void>;
  waitBetweenProbes: () => Promise<void>;
  maxProbeAttempts: number;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function runCleanupTasks(tasks: readonly CleanupTask[]): Promise<void> {
  const errors: unknown[] = [];
  for (const task of tasks) {
    try {
      await task();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, "service_health_cleanup_failed");
  }
}

function createGlobalCleanupTasks<Entry>(options: {
  leadingTasks: readonly CleanupTask[];
  liveRegistry: ReadonlySet<Entry>;
  cleanupEntry: (entry: Entry) => Promise<void>;
}): CleanupTask[] {
  return [
    ...options.leadingTasks,
    async () => {
      const registeredEntries = [...options.liveRegistry];
      await runCleanupTasks(
        registeredEntries.map((entry) => async () => options.cleanupEntry(entry)),
      );
    },
  ];
}

function aggregateErrors(error: unknown): readonly unknown[] {
  return error instanceof AggregateError ? error.errors : [error];
}

async function runWithCleanup<Result>(
  operation: () => Promise<Result>,
  cleanupTasks: readonly CleanupTask[],
): Promise<Result> {
  let operationSucceeded = false;
  let result: Result | undefined;
  let operationError: unknown;
  try {
    result = await operation();
    operationSucceeded = true;
  } catch (error) {
    operationError = error;
  }

  let cleanupError: unknown;
  try {
    await runCleanupTasks(cleanupTasks);
  } catch (error) {
    cleanupError = error;
  }

  if (!operationSucceeded) {
    if (cleanupError !== undefined) {
      throw new AggregateError(
        [operationError, ...aggregateErrors(cleanupError)],
        "service_health_operation_and_cleanup_failed",
      );
    }
    throw operationError;
  }
  if (cleanupError !== undefined) throw cleanupError;
  return result as Result;
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
    throw new Error("ephemeral_loopback_port_unavailable");
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return address.port;
}

async function runCommand(
  executable: string,
  args: readonly string[],
  options: RunCommandOptions = {},
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const policy = options.policy ?? DEFAULT_COMMAND_POLICY;
    const child = spawn(executable, args, {
      cwd: process.cwd(),
      env: { PATH: MINIMAL_CHILD_PATH },
      shell: false,
      stdio: "ignore",
    });
    liveCommands.add(child);
    child.once("exit", () => liveCommands.delete(child));
    child.once("error", () => {
      if (child.pid === undefined) liveCommands.delete(child);
    });
    options.onSpawn?.(child);
    let terminating = false;
    let settled = false;
    const settle = (operation: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      child.off("error", onError);
      child.off("exit", onExit);
      operation();
    };
    const onError = () => {
      if (!terminating) settle(() => reject(new Error("command_spawn_failed")));
    };
    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      if (terminating) return;
      if (code === 0) {
        settle(resolve);
        return;
      }
      settle(() => reject(new Error(`command_failed:${code ?? signal ?? "unknown"}`)));
    };
    child.once("error", onError);
    child.once("exit", onExit);
    const timeout = setTimeout(() => {
      terminating = true;
      void terminateCommand(child, policy.terminationGraceMs).then(
        () => settle(() => reject(new Error("command_timed_out"))),
        (error: unknown) =>
          settle(() =>
            reject(new AggregateError(aggregateErrors(error), "command_termination_failed")),
          ),
      );
    }, policy.timeoutMs);
  });
}

function createPostgresRecoveryController(
  dependencies: PostgresRecoveryDependencies,
): PostgresRecoveryController {
  let needsRecovery = false;
  return {
    needsRecovery: () => needsRecovery,
    stop: async () => {
      needsRecovery = true;
      await dependencies.runDocker(["stop", POSTGRES_CONTAINER]);
    },
    start: async () => {
      needsRecovery = true;
      await dependencies.runDocker(["start", POSTGRES_CONTAINER]);
      let consecutiveReady = 0;
      for (let attempt = 0; attempt < dependencies.maxProbeAttempts; attempt += 1) {
        try {
          await dependencies.probeReadiness();
          consecutiveReady += 1;
          if (consecutiveReady >= 2) {
            needsRecovery = false;
            return;
          }
        } catch {
          consecutiveReady = 0;
        }
        if (attempt + 1 < dependencies.maxProbeAttempts) {
          await dependencies.waitBetweenProbes();
        }
      }
      throw new Error("postgres_recovery_timeout");
    },
  };
}

const postgresRecovery = createPostgresRecoveryController({
  runDocker: async (args) => runCommand(DOCKER_CLI, args),
  probeReadiness: async () =>
    withDisposableDatabase(POSTGRES_ADMIN_URL, "recovery_probe", async () => undefined),
  waitBetweenProbes: async () => delay(100),
  maxProbeAttempts: Math.ceil(POLL_TIMEOUT_MS / 100),
});

async function startPostgres(): Promise<void> {
  await postgresRecovery.start();
}

async function stopPostgres(): Promise<void> {
  await postgresRecovery.stop();
}

async function waitForExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("process_stop_timeout"));
    }, timeoutMs);
    const onExit = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      clearTimeout(timer);
      child.off("exit", onExit);
    };
    child.once("exit", onExit);
  });
}

async function stopProcess(processHandle: RunningProcess): Promise<void> {
  if (processHandle.child.exitCode !== null || processHandle.child.signalCode !== null) {
    liveChildren.delete(processHandle);
    return;
  }
  processHandle.child.kill("SIGTERM");
  try {
    await waitForExit(processHandle.child, 3_000);
  } catch (gracefulStopError) {
    processHandle.child.kill("SIGKILL");
    try {
      await waitForExit(processHandle.child, 3_000);
    } catch (forcedStopError) {
      throw new AggregateError(
        [gracefulStopError, forcedStopError],
        "service_health_process_stop_failed",
      );
    }
  }
  liveChildren.delete(processHandle);
}

async function terminateCommand(child: ChildProcess, graceMs: number): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    liveCommands.delete(child);
    return;
  }
  child.kill("SIGTERM");
  try {
    await waitForExit(child, graceMs);
  } catch (gracefulStopError) {
    child.kill("SIGKILL");
    try {
      await waitForExit(child, graceMs);
    } catch (forcedStopError) {
      throw new AggregateError([gracefulStopError, forcedStopError], "command_termination_failed");
    }
  }
  liveCommands.delete(child);
}

async function waitForHttpStatus(
  processHandle: RunningProcess,
  path: string,
  expectedStatus: number,
  timeoutMs = PROCESS_START_TIMEOUT_MS,
): Promise<Response> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (processHandle.child.exitCode !== null || processHandle.child.signalCode !== null) {
      throw new Error(`${processHandle.name}_process_exited_before_health_response`);
    }
    try {
      const response = await fetch(`${processHandle.baseUrl}${path}`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.status === expectedStatus) return response;
    } catch {
      // Connection refusal is expected while the real child process is binding its port.
    }
    await delay(50);
  }
  throw new Error(`${processHandle.name}_health_response_timeout`);
}

async function startProcess(
  name: ServiceName,
  entrypoint: string,
  environment: Readonly<Record<string, string>>,
  requestedPort?: number,
): Promise<RunningProcess> {
  const port = requestedPort ?? (await reserveEphemeralPort());
  const baseUrl = `http://${LOOPBACK_HOST}:${port}`;
  const applicationRoot = entrypoint.slice(0, entrypoint.indexOf("/src/"));
  const child = spawn(
    process.execPath,
    [TSX_CLI, "--tsconfig", `${applicationRoot}/tsconfig.json`, entrypoint],
    {
      cwd: process.cwd(),
      env: {
        NODE_ENV: "test",
        SARTRE_HOST: LOOPBACK_HOST,
        SARTRE_PORT: String(port),
        SARTRE_SERVICE_VERSION: "0.1.0-test",
        SARTRE_COMMIT_SHA: TEST_COMMIT_SHA,
        ...environment,
      },
      shell: false,
      stdio: "ignore",
    },
  );
  const running: RunningProcess = {
    name,
    child,
    baseUrl,
    stop: async () => stopProcess(running),
  };
  liveChildren.add(running);
  child.once("error", () => {
    if (child.pid === undefined) liveChildren.delete(running);
  });
  child.once("exit", () => liveChildren.delete(running));
  await waitForHttpStatus(running, "/livez", 200);
  return running;
}

async function startHub(options: {
  databaseUrl: string;
  selfTestToken?: string;
  workerDeadlineMs?: number;
}): Promise<RunningProcess> {
  const selfTestEnvironment = options.selfTestToken
    ? {
        SARTRE_MS0_SELF_TEST: "enabled",
        SARTRE_MS0_SELF_TEST_TOKEN: options.selfTestToken,
        SARTRE_WORKER_HEARTBEAT_DEADLINE_MS: String(options.workerDeadlineMs ?? 500),
      }
    : {};
  return startProcess("hub-api", "apps/hub-api/src/main.ts", {
    SARTRE_DATABASE_URL: options.databaseUrl,
    ...selfTestEnvironment,
  });
}

async function startWorker(options: {
  hubBaseUrl: string;
  selfTestToken: string;
  port?: number;
}): Promise<RunningProcess> {
  return startProcess(
    "hub-worker",
    "apps/hub-worker/src/main.ts",
    {
      SARTRE_HUB_BASE_URL: options.hubBaseUrl,
      SARTRE_MS0_SELF_TEST: "enabled",
      SARTRE_MS0_SELF_TEST_TOKEN: options.selfTestToken,
      SARTRE_WORKER_HEARTBEAT_INTERVAL_MS: "100",
    },
    options.port,
  );
}

async function startRuntime(): Promise<RunningProcess> {
  return startProcess("local-runtime", "apps/local-runtime/src/main.ts", {});
}

async function readHealth(
  processHandle: RunningProcess,
  path: "/livez" | "/readyz",
  expectedStatus: number,
): Promise<HealthSnapshot> {
  const response = await waitForHttpStatus(processHandle, path, expectedStatus, POLL_TIMEOUT_MS);
  const parsed = HealthSnapshotSchema.parse(await response.json());
  expect(parsed.service).toBe(processHandle.name);
  return parsed;
}

function healthClientFactory(): HealthClientFactory {
  const factory = (sdk as { createHealthClient?: unknown }).createHealthClient;
  expect(factory).toBeTypeOf("function");
  return factory as HealthClientFactory;
}

function parseAggregatedHealth(value: unknown): {
  status: string;
  processes: Record<ProcessName, HealthSnapshot>;
} {
  const schema = (
    contracts as { AggregatedServiceHealthSchema?: { parse: (input: unknown) => unknown } }
  ).AggregatedServiceHealthSchema;
  expect(schema).toBeDefined();
  return schema?.parse(value) as {
    status: string;
    processes: Record<ProcessName, HealthSnapshot>;
  };
}

function electronHealth(): HealthSnapshot {
  return HealthSnapshotSchema.parse({
    service: "electron",
    status: "healthy",
    version: "0.1.0-test",
    commitSha: TEST_COMMIT_SHA,
    checkedAt: new Date().toISOString(),
    dependencies: [],
  });
}

async function waitForAggregatedWorkerStatus(
  client: HealthClient,
  expected: "healthy" | "unavailable",
): Promise<ReturnType<typeof parseAggregatedHealth>> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const aggregate = parseAggregatedHealth(await client.readAggregatedHealth(electronHealth()));
    if (aggregate.processes["hub-worker"].status === expected) return aggregate;
    await delay(50);
  }
  throw new Error(`worker_${expected}_deadline_exceeded`);
}

async function withHarness(operation: (harness: RunningHarness) => Promise<void>): Promise<void> {
  await withDisposableDatabase(POSTGRES_ADMIN_URL, "service_health", async (database) => {
    let hub: RunningProcess | undefined;
    let worker: RunningProcess | undefined;
    let runtime: RunningProcess | undefined;

    await runWithCleanup(async () => {
      await migrateApprovedMigrations({ connectionString: database.connectionString });
      const selfTestToken = randomBytes(32).toString("hex");
      hub = await startHub({
        databaseUrl: database.connectionString,
        selfTestToken,
        workerDeadlineMs: 500,
      });
      worker = await startWorker({ hubBaseUrl: hub.baseUrl, selfTestToken });
      runtime = await startRuntime();
      await operation({
        database,
        hub,
        worker,
        runtime,
        selfTestToken,
        restartWorker: async () => {
          const port = Number(new URL(worker?.baseUrl ?? "").port);
          worker = await startWorker({
            hubBaseUrl: hub?.baseUrl ?? "",
            selfTestToken,
            port,
          });
          return worker;
        },
      });
    }, [
      async () => {
        if (postgresRecovery.needsRecovery()) await startPostgres();
      },
      async () => {
        if (worker) await worker.stop();
      },
      async () => {
        if (runtime) await runtime.stop();
      },
      async () => {
        if (hub) await hub.stop();
      },
    ]);
  });
}

afterAll(async () => {
  const remainingChildren = [...liveChildren];
  await runCleanupTasks(
    createGlobalCleanupTasks({
      leadingTasks: [
        async () => {
          if (postgresRecovery.needsRecovery()) await startPostgres();
        },
        ...remainingChildren.map((child) => async () => child.stop()),
      ],
      liveRegistry: liveCommands,
      cleanupEntry: async (command) =>
        terminateCommand(command, DEFAULT_COMMAND_POLICY.terminationGraceMs),
    }),
  );
});

describe.sequential("MS0 real service health processes", () => {
  test("sweeps commands registered by an earlier cleanup task at execution time", async () => {
    const calls: string[] = [];
    const liveRegistry = new Set<string>();
    const restoreFailure = new Error("restore_failed");
    const commandFailure = new Error("late_command_cleanup_failed");

    const error = await runCleanupTasks(
      createGlobalCleanupTasks({
        leadingTasks: [
          async () => {
            calls.push("restore");
            liveRegistry.add("late-command");
            throw restoreFailure;
          },
        ],
        liveRegistry,
        cleanupEntry: async (entry) => {
          calls.push(entry);
          throw commandFailure;
        },
      }),
    ).then(
      () => undefined,
      (cleanupError: unknown) => cleanupError,
    );

    expect(calls).toEqual(["restore", "late-command"]);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors[0]).toBe(restoreFailure);
    expect((error as AggregateError).errors[1]).toBeInstanceOf(AggregateError);
    expect(((error as AggregateError).errors[1] as AggregateError).errors).toEqual([
      commandFailure,
    ]);
  });

  test("uses portable Docker resolution with an explicit minimal child PATH", () => {
    expect(DOCKER_CLI).toBe("docker");
    expect(MINIMAL_CHILD_PATH).toBe("/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin");
  });

  test("bounds a SIGTERM-ignoring command and leaves no direct child", async () => {
    let child: ChildProcess | undefined;
    let observedError: unknown;
    try {
      observedError = await Promise.race([
        runCommand(
          process.execPath,
          ["-e", "process.on('SIGTERM',()=>{});setInterval(()=>{},1000)"],
          {
            policy: { timeoutMs: 100, terminationGraceMs: 100 },
            onSpawn: (spawned) => {
              child = spawned;
            },
          },
        ).then(
          () => undefined,
          (error: unknown) => error,
        ),
        delay(500).then(() => new Error("command_policy_timeout_missing")),
      ]);
    } finally {
      if (child && child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await waitForExit(child, 3_000);
      }
    }

    expect(observedError).toMatchObject({ message: "command_timed_out" });
    expect(child?.exitCode !== null || child.signalCode !== null).toBe(true);
  });

  test("marks PostgreSQL recovery before a failing stop attempt", async () => {
    let controller: PostgresRecoveryController;
    controller = createPostgresRecoveryController({
      runDocker: async () => {
        expect(controller.needsRecovery()).toBe(true);
        throw new Error("command_failed");
      },
      probeReadiness: async () => undefined,
      waitBetweenProbes: async () => undefined,
      maxProbeAttempts: 1,
    });

    await expect(controller.stop()).rejects.toThrow("command_failed");
    expect(controller.needsRecovery()).toBe(true);
  });

  test("keeps PostgreSQL recovery pending through probe timeout and retries start", async () => {
    let startCalls = 0;
    let probeResults: Array<"pass" | "fail"> = ["fail", "fail", "fail"];
    const controller = createPostgresRecoveryController({
      runDocker: async (args) => {
        if (args[0] === "start") startCalls += 1;
      },
      probeReadiness: async () => {
        const result = probeResults.shift();
        if (result !== "pass") throw new Error("probe_failed");
      },
      waitBetweenProbes: async () => undefined,
      maxProbeAttempts: 4,
    });
    await controller.stop();

    await expect(controller.start()).rejects.toThrow("postgres_recovery_timeout");
    expect(controller.needsRecovery()).toBe(true);

    probeResults = ["pass", "fail", "pass", "pass"];
    await controller.start();
    expect(startCalls).toBe(2);
    expect(controller.needsRecovery()).toBe(false);
  });

  test("attempts every cleanup task and aggregates failures in task order", async () => {
    const calls: string[] = [];
    const firstFailure = new Error("first_cleanup_failed");
    const thirdFailure = new Error("third_cleanup_failed");

    const error = await runCleanupTasks([
      async () => {
        calls.push("first");
        throw firstFailure;
      },
      async () => {
        calls.push("second");
      },
      async () => {
        calls.push("third");
        throw thirdFailure;
      },
    ]).then(
      () => undefined,
      (cleanupError: unknown) => cleanupError,
    );

    expect(calls).toEqual(["first", "second", "third"]);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([firstFailure, thirdFailure]);
  });

  test("propagates an external abort signal to real loopback health fetches", async () => {
    const sockets = new Set<Socket>();
    const connected = Promise.withResolvers<void>();
    const server = createServer((socket) => {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
      connected.resolve();
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, LOOPBACK_HOST, resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("health_abort_loopback_unavailable");
    }
    const baseUrl = `http://${LOOPBACK_HOST}:${address.port}`;
    const client = healthClientFactory()({
      hubBaseUrl: baseUrl,
      localRuntimeBaseUrl: baseUrl,
      ms0SelfTestToken: "a".repeat(64),
      timeoutMs: 10_000,
    });
    const controller = new AbortController();

    try {
      const pending = client.readAggregatedHealth(electronHealth(), controller.signal);
      await Promise.race([
        connected.promise,
        delay(1_000).then(() => {
          throw new Error("health_abort_request_not_observed");
        }),
      ]);
      controller.abort();
      const aggregate = parseAggregatedHealth(
        await Promise.race([
          pending,
          delay(250).then(() => {
            throw new Error("health_external_abort_not_propagated");
          }),
        ]),
      );

      expect(aggregate.status).toBe("degraded");
      expect(aggregate.processes.electron.status).toBe("healthy");
      expect(aggregate.processes["hub-api"].status).toBe("unavailable");
      expect(aggregate.processes["hub-worker"].status).toBe("unavailable");
      expect(aggregate.processes["local-runtime"].status).toBe("unavailable");
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  test(
    "serves contract-validated liveness and readiness from three real loopback children",
    async () => {
      await withHarness(async ({ hub, worker, runtime }) => {
        for (const processHandle of [hub, worker, runtime]) {
          expect((await readHealth(processHandle, "/livez", 200)).status).toBe("healthy");
          expect((await readHealth(processHandle, "/readyz", 200)).status).toBe("healthy");
        }
      });
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "keeps Hub liveness up while PostgreSQL readiness degrades and recovers",
    async () => {
      await withHarness(async ({ hub }) => {
        await stopPostgres();
        const degraded = await readHealth(hub, "/readyz", 503);
        expect(degraded).toMatchObject({
          service: "hub-api",
          status: "degraded",
          errorCode: "dependency_unavailable",
        });
        expect((await readHealth(hub, "/livez", 200)).status).toBe("healthy");

        await startPostgres();
        expect((await readHealth(hub, "/readyz", 200)).status).toBe("healthy");
      });
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "keeps the MS0 transport absent in production and hides it from a wrong token",
    async () => {
      await withHarness(async ({ database, hub, selfTestToken }) => {
        const internalPath = "/__ms0/self-test/worker-health";
        const wrongTokenResponse = await fetch(`${hub.baseUrl}${internalPath}`, {
          headers: { "x-sartre-ms0-session": `${selfTestToken}-wrong` },
        });
        expect(wrongTokenResponse.status).toBe(404);
        expect(await wrongTokenResponse.text()).not.toMatch(/worker|token|heartbeat/iu);

        const productionHub = await startHub({ databaseUrl: database.connectionString });
        try {
          const productionResponse = await fetch(`${productionHub.baseUrl}${internalPath}`);
          expect(productionResponse.status).toBe(404);
          expect(await productionResponse.text()).not.toMatch(/worker|token|heartbeat/iu);
        } finally {
          await productionHub.stop();
        }
      });
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "aggregates exactly four redacted processes and isolates Worker stop, deadline, and restart",
    async () => {
      await withHarness(async ({ hub, worker, runtime, selfTestToken, restartWorker }) => {
        const client = healthClientFactory()({
          hubBaseUrl: hub.baseUrl,
          localRuntimeBaseUrl: runtime.baseUrl,
          ms0SelfTestToken: selfTestToken,
          timeoutMs: 1_000,
        });
        const initial = await waitForAggregatedWorkerStatus(client, "healthy");
        expect(Object.keys(initial.processes)).toEqual([
          "electron",
          "hub-api",
          "hub-worker",
          "local-runtime",
        ]);
        expect(initial.status).toBe("healthy");
        expect(JSON.stringify(initial)).not.toContain(hub.baseUrl);
        expect(JSON.stringify(initial)).not.toContain(runtime.baseUrl);
        expect(JSON.stringify(initial)).not.toContain(selfTestToken);

        await worker.stop();
        expect((await readHealth(hub, "/readyz", 200)).status).toBe("healthy");
        const unavailable = await waitForAggregatedWorkerStatus(client, "unavailable");
        expect(unavailable.status).toBe("degraded");
        expect(unavailable.processes.electron.status).toBe("healthy");
        expect(unavailable.processes["hub-api"].status).toBe("healthy");
        expect(unavailable.processes["local-runtime"].status).toBe("healthy");
        expect(unavailable.processes["hub-worker"]).toMatchObject({
          status: "unavailable",
          errorCode: "dependency_unavailable",
        });

        await restartWorker();
        const recovered = await waitForAggregatedWorkerStatus(client, "healthy");
        expect(recovered.status).toBe("healthy");
        expect(recovered.processes["hub-api"].status).toBe("healthy");
      });
    },
    TEST_TIMEOUT_MS,
  );
});
