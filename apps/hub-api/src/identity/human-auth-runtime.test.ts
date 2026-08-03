import { generateKeyPairSync } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createHumanAuthRuntime } from "./human-auth-runtime.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("Human auth runtime composition", () => {
  it("keeps Human auth routes disabled unless an explicit mode is configured", async () => {
    await expect(createHumanAuthRuntime({})).resolves.toBeUndefined();
  });

  it("rejects unsupported modes before reading any Secret files", async () => {
    await expect(createHumanAuthRuntime({ SARTRE_AUTH_MODE: "email" })).rejects.toThrow(
      "human_auth_configuration_invalid",
    );
  });

  it("loads an operator-provisioned runtime from explicit key paths", async () => {
    const directory = await mkdtemp(join(tmpdir(), "sartre-auth-runtime-"));
    temporaryDirectories.push(directory);
    const pair = generateKeyPairSync("ed25519");
    const privatePath = join(directory, "private.pem");
    const publicPath = join(directory, "public.pem");
    await Promise.all([
      writeFile(privatePath, pair.privateKey.export({ type: "pkcs8", format: "pem" })),
      writeFile(publicPath, pair.publicKey.export({ type: "spki", format: "pem" })),
    ]);

    const runtime = await createHumanAuthRuntime({
      SARTRE_AUTH_MODE: "operator_provisioned",
      SARTRE_AUTH_APPROVED_EMAIL_DOMAINS: "example.com",
      SARTRE_AUTH_PRIVATE_KEY_PATH: privatePath,
      SARTRE_AUTH_PUBLIC_KEY_PATH: publicPath,
      SARTRE_AUTH_KEY_ID: "local-test-key",
      SARTRE_AUTH_ISSUER: "https://hub.internal.example",
      SARTRE_DATABASE_URL: "postgresql://postgres@127.0.0.1:1/unreachable",
    });

    expect(runtime?.service).toBeDefined();
    await runtime?.repository.close();
  });
});
