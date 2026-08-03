import { spawn } from "node:child_process";

import type { RuntimeSecureStorePort } from "@sartre/runtime-core";

const SECURITY_EXECUTABLE = "/usr/bin/security";
const KEYCHAIN_SERVICE = "com.sartre.local-runtime.endpoint";
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9:._-]{0,199}$/u;
const MAX_SECRET_BYTES = 512;

export type KeychainCommandResult = {
  readonly code: number;
  readonly stdout: string;
};

export interface KeychainCommandPort {
  run(args: readonly string[], standardInput?: string): Promise<KeychainCommandResult>;
}

function createKeychainCommand(): KeychainCommandPort {
  return {
    run: async (args, standardInput) =>
      new Promise<KeychainCommandResult>((resolve, reject) => {
        const child = spawn(SECURITY_EXECUTABLE, [...args], {
          shell: false,
          stdio: ["pipe", "pipe", "ignore"],
        });
        const chunks: Buffer[] = [];
        let size = 0;
        child.stdout.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_SECRET_BYTES) {
            child.kill("SIGKILL");
            return;
          }
          chunks.push(chunk);
        });
        child.once("error", () => reject(new Error("keychain_command_unavailable")));
        child.once("close", (code) => {
          if (size > MAX_SECRET_BYTES) {
            reject(new Error("keychain_output_invalid"));
            return;
          }
          resolve({ code: code ?? 1, stdout: Buffer.concat(chunks).toString("utf8") });
        });
        child.stdin.end(standardInput);
      }),
  };
}

function requireReference(reference: string): void {
  if (!REFERENCE.test(reference)) throw new Error("keychain_reference_invalid");
}

export class MacOsKeychainSecureStore implements RuntimeSecureStorePort {
  constructor(
    private readonly command: KeychainCommandPort = createKeychainCommand(),
    platform: NodeJS.Platform = process.platform,
  ) {
    if (platform !== "darwin") throw new Error("keychain_platform_unsupported");
  }

  async put(reference: string, secret: string): Promise<void> {
    requireReference(reference);
    if (!/^[A-Za-z0-9_-]{43}$/u.test(secret)) throw new Error("keychain_secret_invalid");
    const result = await this.command.run(
      ["add-generic-password", "-a", reference, "-s", KEYCHAIN_SERVICE, "-U", "-w"],
      `${secret}\n`,
    );
    if (result.code !== 0 || result.stdout !== "") throw new Error("keychain_write_failed");
  }

  async read(reference: string): Promise<string | null> {
    requireReference(reference);
    const result = await this.command.run([
      "find-generic-password",
      "-a",
      reference,
      "-s",
      KEYCHAIN_SERVICE,
      "-w",
    ]);
    if (result.code === 44) return null;
    const secret = result.stdout.replace(/\r?\n$/u, "");
    if (result.code !== 0 || !/^[A-Za-z0-9_-]{43}$/u.test(secret)) {
      throw new Error("keychain_read_failed");
    }
    return secret;
  }

  async delete(reference: string): Promise<void> {
    requireReference(reference);
    const result = await this.command.run([
      "delete-generic-password",
      "-a",
      reference,
      "-s",
      KEYCHAIN_SERVICE,
    ]);
    if (result.code !== 0 && result.code !== 44) throw new Error("keychain_delete_failed");
  }
}
