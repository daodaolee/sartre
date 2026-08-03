import { describe, expect, it } from "vitest";

import * as electronApp from "../../index.js";

interface HealthEnvironment {
  readonly hubBaseUrl: string | undefined;
  readonly localRuntimeBaseUrl: string | undefined;
  readonly selfTestToken: string | undefined;
  readonly pollIntervalMs: number;
  readonly timeoutMs: number;
  readonly staleAfterMs: number;
}

type HealthEnvironmentReader = (
  environment: Readonly<Record<string, string | undefined>>,
) => HealthEnvironment;

function healthEnvironmentReader(): HealthEnvironmentReader {
  const reader = (electronApp as { readHealthEnvironment?: unknown }).readHealthEnvironment;
  expect(reader).toBeTypeOf("function");
  return reader as HealthEnvironmentReader;
}

function validEnvironment(): Readonly<Record<string, string>> {
  return {
    SARTRE_HUB_BASE_URL: "http://127.0.0.1:41001",
    SARTRE_LOCAL_RUNTIME_BASE_URL: "http://127.0.0.1:41002",
    SARTRE_MS0_SELF_TEST_TOKEN: "a".repeat(64),
    SARTRE_HEALTH_POLL_MS: "100",
    SARTRE_HEALTH_TIMEOUT_MS: "1000",
    SARTRE_HEALTH_STALE_MS: "2000",
  };
}

describe("Electron health child environment", () => {
  it("accepts only complete loopback endpoints, a lowercase session token, and bounded timings", () => {
    expect(healthEnvironmentReader()(validEnvironment())).toEqual({
      hubBaseUrl: "http://127.0.0.1:41001",
      localRuntimeBaseUrl: "http://127.0.0.1:41002",
      selfTestToken: "a".repeat(64),
      pollIntervalMs: 100,
      timeoutMs: 1000,
      staleAfterMs: 2000,
    });
  });

  it("allows the uninjected app to degrade but rejects partial Runtime or malformed input", () => {
    const read = healthEnvironmentReader();
    expect(read({})).toMatchObject({
      hubBaseUrl: undefined,
      localRuntimeBaseUrl: undefined,
      selfTestToken: undefined,
    });
    for (const environment of [
      { SARTRE_LOCAL_RUNTIME_BASE_URL: "http://127.0.0.1:41002" },
      { ...validEnvironment(), SARTRE_HUB_BASE_URL: "http://localhost:41001" },
      { ...validEnvironment(), SARTRE_HUB_BASE_URL: "https://127.0.0.1:41001" },
      { ...validEnvironment(), SARTRE_HUB_BASE_URL: "http://user@127.0.0.1:41001" },
      { ...validEnvironment(), SARTRE_HUB_BASE_URL: "http://127.0.0.1:41001/path" },
      { ...validEnvironment(), SARTRE_MS0_SELF_TEST_TOKEN: "A".repeat(64) },
      { ...validEnvironment(), SARTRE_HEALTH_POLL_MS: "49" },
    ]) {
      expect(() => read(environment)).toThrow(
        /health_(?:configuration|endpoint|token|poll)_invalid/u,
      );
    }
  });

  it("allows Hub-only desktop authentication while Runtime health stays unavailable", () => {
    const read = healthEnvironmentReader();
    expect(read({ SARTRE_HUB_BASE_URL: "http://127.0.0.1:41001" })).toMatchObject({
      hubBaseUrl: "http://127.0.0.1:41001",
      localRuntimeBaseUrl: undefined,
      selfTestToken: undefined,
    });
  });
});
