import { hash, verify } from "@node-rs/argon2";

const ARGON2ID_OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
} as const;

export interface PasswordHasherPort {
  hash(password: string): Promise<string>;
  verify(encoded: string, password: string): Promise<boolean>;
}

export class Argon2idPasswordHasher implements PasswordHasherPort {
  async hash(password: string): Promise<string> {
    return hash(password, ARGON2ID_OPTIONS);
  }

  async verify(encoded: string, password: string): Promise<boolean> {
    if (!encoded.startsWith("$argon2id$")) return false;
    try {
      return await verify(encoded, password, ARGON2ID_OPTIONS);
    } catch {
      return false;
    }
  }
}
