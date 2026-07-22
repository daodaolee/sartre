import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { assertPackagedElectronApplicationInventory } from "../src/main/packaging-policy.js";

const appRoot = resolve(import.meta.dirname, "..");
const packageScript = resolve(import.meta.dirname, "package-mac-arm64.ts");
const tsxCli = fileURLToPath(import.meta.resolve("tsx/cli"));

describe("real macOS arm64 package wrapper", () => {
  it("builds the unpacked app and leaves an exact wrapper-validated asar inventory", async () => {
    const result = spawnSync(process.execPath, [tsxCli, packageScript, "--", "--dir"], {
      cwd: appRoot,
      encoding: "utf8",
      shell: false,
      timeout: 300_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    await expect(assertPackagedElectronApplicationInventory(appRoot)).resolves.toBeUndefined();
  }, 310_000);
});
