import { constants } from "node:fs";
import { chmod, lstat, mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";

const MAX_PROTECTED_BYTES = 16_384;
const REFRESH_TOKEN = /^[A-Za-z0-9_-]{43,128}$/u;

export interface SafeStorageCipher {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}

export interface RefreshTokenStore {
  read(): Promise<string | undefined>;
  write(refreshToken: string): Promise<void>;
  clear(): Promise<void>;
}

export class ProtectedSessionStoreError extends Error {
  constructor(readonly code: "protected_store_invalid" | "protected_store_unavailable") {
    super(code);
    this.name = "ProtectedSessionStoreError";
  }
}

function isMissing(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

export class SafeStorageRefreshTokenStore implements RefreshTokenStore {
  private readonly filePath: string;

  constructor(
    userDataPath: string,
    private readonly cipher: SafeStorageCipher,
  ) {
    this.filePath = resolve(userDataPath, "session", "refresh-token.protected");
  }

  async read(): Promise<string | undefined> {
    this.requireCipher();
    await this.ensureDirectory();
    let metadata: Awaited<ReturnType<typeof lstat>>;
    try {
      metadata = await lstat(this.filePath);
    } catch (error) {
      if (isMissing(error)) return undefined;
      throw new ProtectedSessionStoreError("protected_store_unavailable");
    }
    if (metadata.isSymbolicLink() || !metadata.isFile() || metadata.size > MAX_PROTECTED_BYTES) {
      throw new ProtectedSessionStoreError("protected_store_invalid");
    }
    try {
      const handle = await open(this.filePath, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const protectedValue = await readFile(handle);
        if (protectedValue.length === 0 || protectedValue.length > MAX_PROTECTED_BYTES) {
          throw new ProtectedSessionStoreError("protected_store_invalid");
        }
        const refreshToken = this.cipher.decryptString(protectedValue);
        if (!REFRESH_TOKEN.test(refreshToken)) {
          throw new ProtectedSessionStoreError("protected_store_invalid");
        }
        return refreshToken;
      } finally {
        await handle.close();
      }
    } catch (error) {
      if (error instanceof ProtectedSessionStoreError) throw error;
      throw new ProtectedSessionStoreError("protected_store_invalid");
    }
  }

  async write(refreshToken: string): Promise<void> {
    this.requireCipher();
    if (!REFRESH_TOKEN.test(refreshToken)) {
      throw new ProtectedSessionStoreError("protected_store_invalid");
    }
    await this.ensureDirectory();
    const protectedValue = this.cipher.encryptString(refreshToken);
    if (protectedValue.length === 0 || protectedValue.length > MAX_PROTECTED_BYTES) {
      throw new ProtectedSessionStoreError("protected_store_invalid");
    }
    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;
    try {
      const handle = await open(
        temporaryPath,
        constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
        0o600,
      );
      try {
        await handle.writeFile(protectedValue);
        await handle.sync();
      } finally {
        await handle.close();
      }
      try {
        const current = await lstat(this.filePath);
        if (current.isSymbolicLink() || !current.isFile()) {
          throw new ProtectedSessionStoreError("protected_store_invalid");
        }
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
      await rename(temporaryPath, this.filePath);
      await chmod(this.filePath, 0o600);
    } catch (error) {
      await unlink(temporaryPath).catch(() => undefined);
      if (error instanceof ProtectedSessionStoreError) throw error;
      throw new ProtectedSessionStoreError("protected_store_unavailable");
    }
  }

  async clear(): Promise<void> {
    await this.ensureDirectory();
    try {
      const metadata = await lstat(this.filePath);
      if (metadata.isSymbolicLink() || !metadata.isFile()) {
        throw new ProtectedSessionStoreError("protected_store_invalid");
      }
      await unlink(this.filePath);
    } catch (error) {
      if (isMissing(error)) return;
      if (error instanceof ProtectedSessionStoreError) throw error;
      throw new ProtectedSessionStoreError("protected_store_unavailable");
    }
  }

  private requireCipher(): void {
    if (!this.cipher.isEncryptionAvailable()) {
      throw new ProtectedSessionStoreError("protected_store_unavailable");
    }
  }

  private async ensureDirectory(): Promise<void> {
    const directory = dirname(this.filePath);
    try {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const metadata = await lstat(directory);
      if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
        throw new ProtectedSessionStoreError("protected_store_invalid");
      }
      await chmod(directory, 0o700);
    } catch (error) {
      if (error instanceof ProtectedSessionStoreError) throw error;
      throw new ProtectedSessionStoreError("protected_store_unavailable");
    }
  }
}
