import { describe, expect, it } from "vitest";

import {
  MacOsKeychainSecureStore,
  type KeychainCommandPort,
  type KeychainCommandResult,
} from "./macos-keychain-secure-store.js";

const SECRET = "k".repeat(43);

class RecordedKeychainCommand implements KeychainCommandPort {
  readonly calls: Array<{ readonly args: readonly string[]; readonly input?: string }> = [];
  results: KeychainCommandResult[] = [];

  async run(args: readonly string[], standardInput?: string): Promise<KeychainCommandResult> {
    this.calls.push({ args, ...(standardInput === undefined ? {} : { input: standardInput }) });
    return this.results.shift() ?? { code: 0, stdout: "" };
  }
}

describe("macOS Keychain Endpoint secure-store adapter", () => {
  it("passes a new credential only through stdin and never through argv", async () => {
    const command = new RecordedKeychainCommand();
    const store = new MacOsKeychainSecureStore(command, "darwin");
    await store.put("endpoint:fixture:v0", SECRET);
    expect(command.calls[0]?.args).toEqual([
      "add-generic-password",
      "-a",
      "endpoint:fixture:v0",
      "-s",
      "com.sartre.local-runtime.endpoint",
      "-U",
      "-w",
    ]);
    expect(command.calls[0]?.args).not.toContain(SECRET);
    expect(command.calls[0]?.input).toBe(`${SECRET}\n`);
  });

  it("reads a bounded credential, distinguishes absence, and deletes by reference", async () => {
    const command = new RecordedKeychainCommand();
    command.results = [
      { code: 0, stdout: `${SECRET}\n` },
      { code: 44, stdout: "" },
      { code: 0, stdout: "" },
    ];
    const store = new MacOsKeychainSecureStore(command, "darwin");
    await expect(store.read("endpoint:fixture:v0")).resolves.toBe(SECRET);
    await expect(store.read("endpoint:missing:v0")).resolves.toBeNull();
    await expect(store.delete("endpoint:fixture:v0")).resolves.toBeUndefined();
    expect(command.calls.flatMap((call) => call.args)).not.toContain(SECRET);
  });

  it("fails closed on unsupported platforms, malformed references, or malformed output", async () => {
    expect(() => new MacOsKeychainSecureStore(new RecordedKeychainCommand(), "linux")).toThrow(
      "keychain_platform_unsupported",
    );
    const command = new RecordedKeychainCommand();
    command.results = [{ code: 0, stdout: "not-a-credential\n" }];
    const store = new MacOsKeychainSecureStore(command, "darwin");
    await expect(store.read("../unsafe")).rejects.toThrow("keychain_reference_invalid");
    await expect(store.read("endpoint:fixture:v0")).rejects.toThrow("keychain_read_failed");
  });
});
