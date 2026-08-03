import { mkdtemp, readFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  ProtectedSessionStoreError,
  SafeStorageRefreshTokenStore,
  type SafeStorageCipher,
} from "./safe-storage-session-store.js";

const REFRESH_TOKEN = "session_token_".repeat(4);
const roots: string[] = [];

function cipher(available = true): SafeStorageCipher {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (value) =>
      Buffer.from(`protected:${value.split("").reverse().join("")}`, "utf8"),
    decryptString: (value) => {
      const encoded = value.toString("utf8");
      if (!encoded.startsWith("protected:")) throw new Error("ciphertext_invalid");
      return encoded.slice(10).split("").reverse().join("");
    },
  };
}

async function root(): Promise<string> {
  const value = await mkdtemp(join(tmpdir(), "sartre-electron-session-"));
  roots.push(value);
  return value;
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(roots.splice(0).map((value) => rm(value, { recursive: true, force: true })));
});

describe("safeStorage refresh-token store", () => {
  it("persists only protected bytes with private permissions", async () => {
    const userData = await root();
    const store = new SafeStorageRefreshTokenStore(userData, cipher());

    await store.write(REFRESH_TOKEN);

    const path = join(userData, "session", "refresh-token.protected");
    const persisted = await readFile(path);
    expect(persisted.toString("utf8")).not.toContain(REFRESH_TOKEN);
    expect(await store.read()).toBe(REFRESH_TOKEN);
    const { stat } = await import("node:fs/promises");
    expect((await stat(path)).mode & 0o777).toBe(0o600);
  });

  it("clears the protected value and treats a missing value as signed out", async () => {
    const store = new SafeStorageRefreshTokenStore(await root(), cipher());
    expect(await store.read()).toBeUndefined();
    await store.write(REFRESH_TOKEN);
    await store.clear();
    expect(await store.read()).toBeUndefined();
  });

  it("fails closed for unavailable encryption and a symlink target", async () => {
    const userData = await root();
    const unavailable = new SafeStorageRefreshTokenStore(userData, cipher(false));
    await expect(unavailable.write(REFRESH_TOKEN)).rejects.toEqual(
      new ProtectedSessionStoreError("protected_store_unavailable"),
    );

    const store = new SafeStorageRefreshTokenStore(userData, cipher());
    const sessionDirectory = join(userData, "session");
    const { mkdir } = await import("node:fs/promises");
    await mkdir(sessionDirectory, { recursive: true });
    await symlink(join(userData, "outside"), join(sessionDirectory, "refresh-token.protected"));
    await expect(store.read()).rejects.toEqual(
      new ProtectedSessionStoreError("protected_store_invalid"),
    );
  });
});
