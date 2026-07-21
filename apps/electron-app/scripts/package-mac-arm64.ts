import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertCheckedInElectronPackagingPolicy,
  assertPackagedElectronApplicationInventory,
  normalizeMacPackageArguments,
} from "../src/main/packaging-policy.js";

const PACKAGE_TIMEOUT_MS = 600_000;
const TERMINATION_GRACE_MS = 3_000;
const appRoot = resolve(import.meta.dirname, "..");
const builderCli = fileURLToPath(import.meta.resolve("electron-builder/cli.js"));

async function runBuilder(args: readonly string[]): Promise<void> {
  await new Promise<void>((resolveRun, reject) => {
    const child = spawn(
      process.execPath,
      [builderCli, "--mac", "--arm64", "--config", "electron-builder.yml", ...args],
      {
        cwd: appRoot,
        shell: false,
        stdio: "inherit",
      },
    );
    let timedOut = false;
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), TERMINATION_GRACE_MS);
    }, PACKAGE_TIMEOUT_MS);
    const cleanup = () => {
      clearTimeout(timeout);
      if (forceTimer) clearTimeout(forceTimer);
    };
    child.once("error", () => {
      cleanup();
      reject(new Error("electron_package_spawn_failed"));
    });
    child.once("exit", (code) => {
      cleanup();
      if (code === 0 && !timedOut) {
        resolveRun();
        return;
      }
      reject(new Error(timedOut ? "electron_package_timed_out" : "electron_package_failed"));
    });
  });
}

const packageArguments = normalizeMacPackageArguments(process.argv.slice(2));
await assertCheckedInElectronPackagingPolicy(appRoot);
await import("./build.js");
await runBuilder(packageArguments);
await assertPackagedElectronApplicationInventory(appRoot);
