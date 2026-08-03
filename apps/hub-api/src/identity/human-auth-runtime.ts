import { createPrivateKey, createPublicKey, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

import { Argon2idPasswordHasher } from "./argon2id-password-hasher.js";
import { Ed25519HumanAccessTokenCodec } from "./human-access-token.js";
import { HumanAuthService } from "./human-auth.service.js";
import { PostgresHumanAuthRepository } from "./postgres-human-auth.repository.js";

export type HumanAuthRuntime = {
  readonly service: HumanAuthService;
  readonly repository: PostgresHumanAuthRepository;
};

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name];
  if (!value) throw new Error("human_auth_configuration_invalid");
  return value;
}

export async function createHumanAuthRuntime(
  environment: NodeJS.ProcessEnv,
): Promise<HumanAuthRuntime | undefined> {
  const mode = environment.SARTRE_AUTH_MODE;
  if (!mode) return undefined;
  if (mode !== "operator_provisioned") throw new Error("human_auth_configuration_invalid");

  const approvedEmailDomains = required(environment, "SARTRE_AUTH_APPROVED_EMAIL_DOMAINS")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  if (
    approvedEmailDomains.length === 0 ||
    approvedEmailDomains.some((domain) => domain.includes("@"))
  ) {
    throw new Error("human_auth_configuration_invalid");
  }

  const [privateKeyPem, publicKeyPem] = await Promise.all([
    readFile(required(environment, "SARTRE_AUTH_PRIVATE_KEY_PATH"), "utf8"),
    readFile(required(environment, "SARTRE_AUTH_PUBLIC_KEY_PATH"), "utf8"),
  ]);
  const passwordHasher = new Argon2idPasswordHasher();
  const repository = new PostgresHumanAuthRepository(required(environment, "SARTRE_DATABASE_URL"));
  try {
    const kid = required(environment, "SARTRE_AUTH_KEY_ID");
    const accessTokens = new Ed25519HumanAccessTokenCodec({
      issuer: required(environment, "SARTRE_AUTH_ISSUER"),
      activeKey: { kid, privateKey: createPrivateKey(privateKeyPem) },
      verificationKeys: [{ kid, publicKey: createPublicKey(publicKeyPem) }],
      ttlSeconds: 600,
    });
    const dummyPasswordHash = await passwordHasher.hash(randomBytes(32).toString("base64url"));
    return {
      repository,
      service: new HumanAuthService({
        repository,
        passwordHasher,
        accessTokens,
        clock: { now: () => new Date() },
        dummyPasswordHash,
        policy: {
          approvedEmailDomains,
          sessionAbsoluteTtlMs: 30 * 24 * 60 * 60_000,
          sessionIdleTtlMs: 7 * 24 * 60 * 60_000,
        },
      }),
    };
  } catch (error) {
    await repository.close();
    throw error;
  }
}
