import { createHash, randomBytes } from "node:crypto";
import { type ChildProcess, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { isAbsolute, resolve } from "node:path";

import { _electron as electron, expect, test } from "@playwright/test";

import { withDisposableDatabase } from "../../scripts/postgres/create-test-database.js";
import { migrateApprovedMigrations } from "../../scripts/postgres/migrate.js";

const LOOPBACK_HOST = "127.0.0.1";
const POSTGRES_ADMIN_URL = "postgresql://postgres@127.0.0.1:54326/postgres";
const MINIMAL_CHILD_PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
const TSX_LOADER = import.meta.resolve("tsx");
const ELECTRON_EXECUTABLE = createRequire(import.meta.url)("electron") as string;
const PACKAGED_ELECTRON_EXECUTABLE = resolve(
  "apps/electron-app/release/mac-arm64/Sartre.app/Contents/MacOS/Sartre",
);
const PACKAGED_DMG = resolve("apps/electron-app/release/Sartre-0.1.0-arm64.dmg");
const REQUESTED_ELECTRON_TARGET = process.env.SARTRE_E2E_TARGET;
const ELECTRON_TARGET_LABEL =
  REQUESTED_ELECTRON_TARGET === "development" || REQUESTED_ELECTRON_TARGET === "packaged"
    ? REQUESTED_ELECTRON_TARGET
    : "unconfigured";
const TEST_COMMIT_SHA = "a".repeat(40);
const PROCESS_START_TIMEOUT_MS = 15_000;
const UI_TIMEOUT_MS = 15_000;
const TEST_TIMEOUT_MS = 90_000;

type ServiceName = "hub-api" | "hub-worker" | "local-runtime";

interface RunningProcess {
  readonly name: ServiceName;
  readonly child: ChildProcess;
  readonly baseUrl: string;
  stop: () => Promise<void>;
}

interface ProcessStartOptions {
  readonly startupTimeoutMs?: number;
  readonly onSpawn?: (child: ChildProcess) => void;
}

interface ElectronTarget {
  readonly executablePath: string;
  readonly args: readonly string[];
}

type CleanupTask = () => Promise<void>;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function electronX11Environment(source: NodeJS.ProcessEnv): Record<string, string> {
  const display = source.DISPLAY;
  const xauthority = source.XAUTHORITY;
  if (display === undefined && xauthority === undefined) return {};
  if (!display || display.length > 64 || !/^:[0-9]+(?:\.[0-9]+)?$/u.test(display)) {
    throw new Error("electron_e2e_display_invalid");
  }
  if (
    xauthority !== undefined &&
    (xauthority.length === 0 ||
      xauthority.length > 4_096 ||
      !isAbsolute(xauthority) ||
      /[\0\r\n]/u.test(xauthority))
  ) {
    throw new Error("electron_e2e_xauthority_invalid");
  }
  return {
    DISPLAY: display,
    ...(xauthority === undefined ? {} : { XAUTHORITY: xauthority }),
  };
}

function selectedElectronTarget(): ElectronTarget {
  if (REQUESTED_ELECTRON_TARGET === "development") {
    return { executablePath: ELECTRON_EXECUTABLE, args: [resolve("apps/electron-app")] };
  }
  if (REQUESTED_ELECTRON_TARGET === "packaged") {
    const expectedHash = process.env.SARTRE_E2E_EXPECTED_ARTIFACT_SHA256;
    if (!expectedHash || !/^[a-f0-9]{64}$/u.test(expectedHash)) {
      throw new Error("electron_e2e_packaged_artifact_hash_required");
    }
    const actualHash = createHash("sha256").update(readFileSync(PACKAGED_DMG)).digest("hex");
    if (actualHash !== expectedHash) {
      throw new Error("electron_e2e_packaged_artifact_hash_mismatch");
    }
    return { executablePath: PACKAGED_ELECTRON_EXECUTABLE, args: [] };
  }
  throw new Error("electron_e2e_target_required");
}

async function runCleanupTasks(tasks: readonly CleanupTask[]): Promise<void> {
  const failures: unknown[] = [];
  for (const task of tasks) {
    try {
      await task();
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length > 0) throw new AggregateError(failures, "electron_e2e_cleanup_failed");
}

async function runWithCleanup<Result>(
  operation: () => Promise<Result>,
  cleanupTasks: readonly CleanupTask[],
): Promise<Result> {
  let result: Result | undefined;
  let operationError: unknown;
  try {
    result = await operation();
  } catch (error) {
    operationError = error;
  }

  let cleanupError: unknown;
  try {
    await runCleanupTasks(cleanupTasks);
  } catch (error) {
    cleanupError = error;
  }
  if (operationError !== undefined) {
    if (cleanupError !== undefined) {
      throw new AggregateError([operationError, cleanupError], "electron_e2e_failed_with_cleanup");
    }
    throw operationError;
  }
  if (cleanupError !== undefined) throw cleanupError;
  return result as Result;
}

async function reserveEphemeralPort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, LOOPBACK_HOST, resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("electron_e2e_ephemeral_port_unavailable");
  }
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
  return address.port;
}

async function waitForExit(child: ChildProcess, timeoutMs: number): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolveExit, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error("electron_e2e_process_stop_timeout"));
    }, timeoutMs);
    const onExit = () => {
      cleanup();
      resolveExit();
    };
    const cleanup = () => {
      clearTimeout(timeout);
      child.off("exit", onExit);
    };
    child.once("exit", onExit);
  });
}

async function stopChild(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  try {
    await waitForExit(child, 3_000);
  } catch (gracefulError) {
    child.kill("SIGKILL");
    try {
      await waitForExit(child, 3_000);
    } catch (forcedError) {
      throw new AggregateError(
        [gracefulError, forcedError],
        "electron_e2e_process_termination_failed",
      );
    }
  }
}

async function waitForHttp(
  processHandle: RunningProcess,
  timeoutMs = PROCESS_START_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (processHandle.child.exitCode !== null || processHandle.child.signalCode !== null) {
      throw new Error(`${processHandle.name}_exited_before_health`);
    }
    try {
      const response = await fetch(`${processHandle.baseUrl}/livez`, {
        signal: AbortSignal.timeout(1_000),
      });
      if (response.status === 200) return;
    } catch {
      // A refused connection is expected while the real child binds its loopback port.
    }
    await delay(50);
  }
  throw new Error(`${processHandle.name}_health_timeout`);
}

async function startProcess(
  name: ServiceName,
  entrypoint: string,
  environment: Readonly<Record<string, string>>,
  requestedPort?: number,
  options: ProcessStartOptions = {},
): Promise<RunningProcess> {
  const port = requestedPort ?? (await reserveEphemeralPort());
  const baseUrl = `http://${LOOPBACK_HOST}:${port}`;
  const applicationRoot = entrypoint.slice(0, entrypoint.indexOf("/src/"));
  const child = spawn(process.execPath, ["--import", TSX_LOADER, entrypoint], {
    cwd: process.cwd(),
    env: {
      NODE_ENV: "test",
      PATH: MINIMAL_CHILD_PATH,
      SARTRE_HOST: LOOPBACK_HOST,
      SARTRE_PORT: String(port),
      SARTRE_SERVICE_VERSION: "0.1.0-test",
      SARTRE_COMMIT_SHA: TEST_COMMIT_SHA,
      TSX_TSCONFIG_PATH: `${applicationRoot}/tsconfig.json`,
      ...environment,
    },
    shell: false,
    stdio: "ignore",
  });
  options.onSpawn?.(child);
  const running: RunningProcess = {
    name,
    child,
    baseUrl,
    stop: async () => stopChild(child),
  };
  try {
    await waitForHttp(running, options.startupTimeoutMs);
  } catch (operationError) {
    try {
      await running.stop();
    } catch (cleanupError) {
      throw new AggregateError(
        [operationError, cleanupError],
        "electron_e2e_process_start_failed_with_cleanup",
      );
    }
    throw operationError;
  }
  return running;
}

async function startWorker(options: {
  readonly hubBaseUrl: string;
  readonly selfTestToken: string;
  readonly port?: number;
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

test("forwards only the allowlisted X11 variables to Electron", () => {
  expect(
    electronX11Environment({
      DISPLAY: ":99",
      XAUTHORITY: "/tmp/xvfb-auth",
      GH_TOKEN: "must-not-be-forwarded",
    }),
  ).toEqual({
    DISPLAY: ":99",
    XAUTHORITY: "/tmp/xvfb-auth",
  });
});

test("stops a real child that stays alive but never becomes healthy", async () => {
  const port = await reserveEphemeralPort();
  const baseUrl = `http://${LOOPBACK_HOST}:${port}`;
  let capturedChild: ChildProcess | undefined;
  try {
    await expect(
      startProcess("local-runtime", "tests/e2e/fixtures/never-healthy/src/main.ts", {}, port, {
        startupTimeoutMs: 250,
        onSpawn: (child) => {
          capturedChild = child;
        },
      }),
    ).rejects.toThrow("local-runtime_health_timeout");
    expect(capturedChild).toBeDefined();
    expect(capturedChild?.signalCode).toBe("SIGKILL");
    await expect
      .poll(
        () =>
          fetch(`${baseUrl}/livez`, { signal: AbortSignal.timeout(250) }).then(
            () => "reachable",
            () => "stopped",
          ),
        { timeout: 2_000, intervals: [50, 100, 200] },
      )
      .toBe("stopped");
  } finally {
    await fetch(`${baseUrl}/shutdown`, { signal: AbortSignal.timeout(250) }).catch(() => undefined);
    if (capturedChild) await stopChild(capturedChild).catch(() => undefined);
  }
}, 25_000);

test(
  `shows the stable four-process workbench through Worker loss and recovery [${ELECTRON_TARGET_LABEL}]`,
  async () => {
    const electronTarget = selectedElectronTarget();
    await withDisposableDatabase(POSTGRES_ADMIN_URL, "electron_health", async (database) => {
      await migrateApprovedMigrations({ connectionString: database.connectionString });
      const selfTestToken = randomBytes(32).toString("hex");
      let hub: RunningProcess | undefined;
      let worker: RunningProcess | undefined;
      let runtime: RunningProcess | undefined;
      let electronApplication: Awaited<ReturnType<typeof electron.launch>> | undefined;

      await runWithCleanup(async () => {
        hub = await startProcess("hub-api", "apps/hub-api/src/main.ts", {
          SARTRE_DATABASE_URL: database.connectionString,
          SARTRE_MS0_SELF_TEST: "enabled",
          SARTRE_MS0_SELF_TEST_TOKEN: selfTestToken,
          SARTRE_WORKER_HEARTBEAT_DEADLINE_MS: "500",
        });
        worker = await startWorker({ hubBaseUrl: hub.baseUrl, selfTestToken });
        runtime = await startProcess("local-runtime", "apps/local-runtime/src/main.ts", {});

        electronApplication = await electron.launch({
          executablePath: electronTarget.executablePath,
          args: [...electronTarget.args],
          env: {
            ...electronX11Environment(process.env),
            NODE_ENV: "test",
            PATH: MINIMAL_CHILD_PATH,
            SARTRE_HUB_BASE_URL: hub.baseUrl,
            SARTRE_LOCAL_RUNTIME_BASE_URL: runtime.baseUrl,
            SARTRE_MS0_SELF_TEST_TOKEN: selfTestToken,
            SARTRE_HEALTH_POLL_MS: "100",
            SARTRE_HEALTH_TIMEOUT_MS: "1000",
            SARTRE_HEALTH_STALE_MS: "2000",
          },
          timeout: UI_TIMEOUT_MS,
        });
        const electronSpawnArguments = electronApplication.process().spawnargs.join("\n");
        expect(electronSpawnArguments).not.toContain(hub.baseUrl);
        expect(electronSpawnArguments).not.toContain(runtime.baseUrl);
        expect(electronSpawnArguments).not.toContain(selfTestToken);
        const page = await electronApplication.firstWindow();
        const rendererDiagnostics: string[] = [];
        page.on("console", (message) => rendererDiagnostics.push(message.text()));
        page.on("pageerror", (error) => rendererDiagnostics.push(error.message));
        const rows = page.locator('[data-testid^="health-row-"]');
        await expect(rows).toHaveCount(4);
        await expect(rows.first()).toHaveCSS("display", "grid");
        expect(
          await rows.evaluateAll((elements) => elements.map((element) => element.dataset.process)),
        ).toEqual(["electron", "hub-api", "hub-worker", "local-runtime"]);
        for (const label of ["Electron", "Hub API", "Hub Worker", "Local Runtime"]) {
          await expect(page.getByRole("row", { name: new RegExp(`^${label} `, "u") })).toHaveCount(
            1,
          );
        }
        await expect(page.getByTestId("health-status-healthy")).toHaveCount(4, {
          timeout: UI_TIMEOUT_MS,
        });

        const bridgeSurface = await page.evaluate(() => {
          const health = (window as Window & { systemHealth?: unknown }).systemHealth;
          const browserGlobal = window as Window & {
            require?: unknown;
            process?: unknown;
            ipcRenderer?: unknown;
          };
          return {
            keys:
              typeof health === "object" && health !== null
                ? Object.keys(health as object).sort()
                : [],
            hasRequire: typeof browserGlobal.require !== "undefined",
            hasProcess: typeof browserGlobal.process !== "undefined",
            hasRawIpc: typeof browserGlobal.ipcRenderer !== "undefined",
            text: document.body.innerText,
          };
        });
        expect(bridgeSurface).toMatchObject({
          keys: ["getSnapshot", "subscribe"],
          hasRequire: false,
          hasProcess: false,
          hasRawIpc: false,
        });
        expect(bridgeSurface.text).not.toContain(hub.baseUrl);
        expect(bridgeSurface.text).not.toContain(runtime.baseUrl);
        expect(bridgeSurface.text).not.toContain(selfTestToken);
        expect(rendererDiagnostics.join("\n")).not.toContain(hub.baseUrl);
        expect(rendererDiagnostics.join("\n")).not.toContain(runtime.baseUrl);
        expect(rendererDiagnostics.join("\n")).not.toContain(selfTestToken);

        const before = await rows.evaluateAll((elements) =>
          elements.map((element) => {
            const rectangle = element.getBoundingClientRect();
            return { top: rectangle.top, height: rectangle.height };
          }),
        );
        const workerPort = Number(new URL(worker.baseUrl).port);
        await worker.stop();
        await expect(page.getByTestId("health-status-unavailable")).toHaveCount(1, {
          timeout: UI_TIMEOUT_MS,
        });
        await expect(page.getByTestId("health-row-hub-worker")).toContainText("Unavailable");
        await expect(page.getByTestId("health-status-healthy")).toHaveCount(3);
        expect(await rows.evaluateAll((elements) => elements.length)).toBe(4);
        expect(
          await rows.evaluateAll((elements) =>
            elements.map((element) => {
              const rectangle = element.getBoundingClientRect();
              return { top: rectangle.top, height: rectangle.height };
            }),
          ),
        ).toEqual(before);

        worker = await startWorker({
          hubBaseUrl: hub.baseUrl,
          selfTestToken,
          port: workerPort,
        });
        await expect(page.getByTestId("health-status-healthy")).toHaveCount(4, {
          timeout: UI_TIMEOUT_MS,
        });
      }, [
        async () => electronApplication?.close(),
        async () => worker?.stop(),
        async () => runtime?.stop(),
        async () => hub?.stop(),
      ]);
    });
  },
  TEST_TIMEOUT_MS,
);
