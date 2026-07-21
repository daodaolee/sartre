import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

import { readHubHealthConfig } from "./config.js";

const VALID_SELF_TEST_ENVIRONMENT: NodeJS.ProcessEnv = {
  SARTRE_HOST: "127.0.0.1",
  SARTRE_PORT: "3000",
  SARTRE_SERVICE_VERSION: "0.1.0-test",
  SARTRE_COMMIT_SHA: "a".repeat(40),
  SARTRE_DATABASE_URL: "postgresql://postgres@127.0.0.1:54326/postgres",
  SARTRE_MS0_SELF_TEST: "enabled",
  SARTRE_MS0_SELF_TEST_TOKEN: "b".repeat(64),
  SARTRE_WORKER_HEARTBEAT_DEADLINE_MS: "500",
};

describe("Hub MS0 self-test configuration", () => {
  test("enables the route only for explicit loopback mode with valid token and deadline", () => {
    const config = readHubHealthConfig({ ...VALID_SELF_TEST_ENVIRONMENT });

    expect(config).toMatchObject({
      host: "127.0.0.1",
      selfTestEnabled: true,
      selfTestToken: "b".repeat(64),
      workerHeartbeatDeadlineMs: 500,
    });
  });

  test.each([
    ["wildcard host", { SARTRE_HOST: "0.0.0.0" }],
    ["hostname", { SARTRE_HOST: "localhost" }],
    ["missing host", { SARTRE_HOST: undefined }],
    ["missing mode", { SARTRE_MS0_SELF_TEST: undefined }],
    ["invalid mode", { SARTRE_MS0_SELF_TEST: "true" }],
    ["missing token", { SARTRE_MS0_SELF_TEST_TOKEN: undefined }],
    ["short token", { SARTRE_MS0_SELF_TEST_TOKEN: "b".repeat(63) }],
    ["uppercase token", { SARTRE_MS0_SELF_TEST_TOKEN: "B".repeat(64) }],
    ["missing deadline", { SARTRE_WORKER_HEARTBEAT_DEADLINE_MS: undefined }],
    ["deadline below policy", { SARTRE_WORKER_HEARTBEAT_DEADLINE_MS: "99" }],
    ["deadline above policy", { SARTRE_WORKER_HEARTBEAT_DEADLINE_MS: "60001" }],
    ["deadline not numeric", { SARTRE_WORKER_HEARTBEAT_DEADLINE_MS: "soon" }],
  ])("keeps the controller unregistered for %s", (_name, override) => {
    const config = readHubHealthConfig({
      ...VALID_SELF_TEST_ENVIRONMENT,
      ...override,
    });

    expect(config.selfTestEnabled).toBe(false);
    expect(config.selfTestToken).toBeUndefined();
  });

  test("passes one validated config instance to both module construction and listen", async () => {
    const mainSource = await readFile(new URL("../main.ts", import.meta.url), "utf8");

    expect(mainSource.match(/readHubHealthConfig\(/gu)).toHaveLength(1);
    expect(mainSource).toContain("createHubModule(config)");
    expect(mainSource).toContain("config.selfTestEnabled ? [Ms0SelfTestController] : []");
  });
});
