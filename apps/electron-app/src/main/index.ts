import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AggregatedServiceHealthSchema,
  createMs1Client,
  createHealthClient,
  type HealthSnapshot,
} from "@sartre/sdk";
import { app, BrowserWindow, ipcMain, safeStorage, session } from "electron";

import { HumanSessionManager } from "./auth/human-session-manager.js";
import { SafeStorageRefreshTokenStore } from "./auth/safe-storage-session-store.js";
import { readHealthEnvironment } from "./health/health-environment.js";
import { createHealthMonitor } from "./health/health-monitor.js";
import { registerMs1DesktopHandlers } from "./ipc/ms1-desktop-handlers.js";
import { createSecureWindowOptions } from "./secure-window.js";
import { DesktopWorkspaceCoordinator } from "./workspaces/desktop-workspace-coordinator.js";
import {
  DesktopAuthResultSchema,
  MS1_AUTH_UPDATE_CHANNEL,
} from "../shared/ms1-desktop-contract.js";
import {
  SYSTEM_HEALTH_GET_CHANNEL,
  SYSTEM_HEALTH_UPDATE_CHANNEL,
  SystemHealthResultSchema,
  type SystemHealthResult,
} from "../shared/system-health-contract.js";

const currentDirectory = fileURLToPath(new URL(".", import.meta.url));

function electronSnapshot(): HealthSnapshot {
  return {
    service: "electron",
    status: "healthy",
    version: app.getVersion(),
    commitSha: "0".repeat(40),
    checkedAt: new Date().toISOString(),
    dependencies: [],
  };
}

function successResult(data: unknown): SystemHealthResult {
  return SystemHealthResultSchema.parse({ success: true, data });
}

const healthEnvironment = readHealthEnvironment(process.env);
const poll = async (signal: AbortSignal): Promise<unknown> => {
  if (
    !healthEnvironment.hubBaseUrl ||
    !healthEnvironment.localRuntimeBaseUrl ||
    !healthEnvironment.selfTestToken
  ) {
    throw new Error("health_configuration_unavailable");
  }
  const client = createHealthClient({
    hubBaseUrl: healthEnvironment.hubBaseUrl,
    localRuntimeBaseUrl: healthEnvironment.localRuntimeBaseUrl,
    ms0SelfTestToken: healthEnvironment.selfTestToken,
    timeoutMs: healthEnvironment.timeoutMs,
  });
  return client.readAggregatedHealth(electronSnapshot(), signal);
};
const monitor = createHealthMonitor({
  poll,
  pollIntervalMs: healthEnvironment.pollIntervalMs,
  timeoutMs: healthEnvironment.timeoutMs,
  staleAfterMs: healthEnvironment.staleAfterMs,
});

function createMainWindow(healthOnlyTestMode: boolean): BrowserWindow {
  const preloadPath = join(currentDirectory, "../preload/index.cjs");
  const rendererPath = join(currentDirectory, "../renderer/index.html");
  const window = new BrowserWindow(createSecureWindowOptions(preloadPath));
  window.setMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  window.once("ready-to-show", () => window.show());
  void window.loadFile(
    rendererPath,
    healthOnlyTestMode ? { query: { mode: "health-e2e" } } : undefined,
  );
  return window;
}

void app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });
  const ms1Client = createMs1Client({
    hubBaseUrl: healthEnvironment.hubBaseUrl ?? "http://127.0.0.1:3000",
    timeoutMs: healthEnvironment.timeoutMs,
  });
  const sessions = new HumanSessionManager(
    ms1Client,
    new SafeStorageRefreshTokenStore(app.getPath("userData"), safeStorage),
  );
  const workspaces = new DesktopWorkspaceCoordinator(ms1Client, sessions);
  const removeMs1Handlers = registerMs1DesktopHandlers({ ipc: ipcMain, sessions, workspaces });
  await sessions.restore();
  const healthOnlyTestMode =
    process.env.NODE_ENV === "test" && process.env.SARTRE_E2E_HEALTH_ONLY === "enabled";
  const window = createMainWindow(healthOnlyTestMode);
  const unsubscribeAuth = sessions.subscribe((state) => {
    if (!window.isDestroyed()) {
      window.webContents.send(
        MS1_AUTH_UPDATE_CHANNEL,
        DesktopAuthResultSchema.parse({ success: true, data: state }),
      );
    }
  });
  ipcMain.handle(SYSTEM_HEALTH_GET_CHANNEL, () => successResult(monitor.getSnapshot()));
  const unsubscribe = monitor.subscribe((snapshot) => {
    const validated = AggregatedServiceHealthSchema.parse(snapshot);
    if (!window.isDestroyed()) {
      window.webContents.send(SYSTEM_HEALTH_UPDATE_CHANNEL, successResult(validated));
    }
  });
  window.once("closed", () => {
    unsubscribe();
    unsubscribeAuth();
    removeMs1Handlers();
  });
  monitor.start();
});

app.on("before-quit", () => {
  monitor.stop();
  ipcMain.removeHandler(SYSTEM_HEALTH_GET_CHANNEL);
});

app.on("window-all-closed", () => app.quit());
