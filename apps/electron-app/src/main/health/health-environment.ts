const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_TIMEOUT_MS = 1_000;
const DEFAULT_STALE_AFTER_MS = 5_000;
const SESSION_TOKEN = /^[a-f0-9]{64}$/u;

export interface HealthEnvironment {
  readonly hubBaseUrl: string | undefined;
  readonly localRuntimeBaseUrl: string | undefined;
  readonly selfTestToken: string | undefined;
  readonly pollIntervalMs: number;
  readonly timeoutMs: number;
  readonly staleAfterMs: number;
}

function boundedInteger(raw: string | undefined, fallback: number, label: string): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 50 || value > 300_000) {
    throw new Error(`health_${label}_invalid`);
  }
  return value;
}

function loopbackOrigin(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("health_endpoint_invalid");
  }
  const port = Number(url.port);
  if (
    url.protocol !== "http:" ||
    url.hostname !== "127.0.0.1" ||
    !Number.isSafeInteger(port) ||
    port <= 0 ||
    port > 65_535 ||
    url.username !== "" ||
    url.password !== "" ||
    url.pathname !== "/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("health_endpoint_invalid");
  }
  return url.origin;
}

export function readHealthEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): HealthEnvironment {
  const rawHubBaseUrl = environment.SARTRE_HUB_BASE_URL;
  const rawLocalRuntimeBaseUrl = environment.SARTRE_LOCAL_RUNTIME_BASE_URL;
  const rawSelfTestToken = environment.SARTRE_MS0_SELF_TEST_TOKEN;
  if ((rawLocalRuntimeBaseUrl === undefined) !== (rawSelfTestToken === undefined)) {
    throw new Error("health_configuration_invalid");
  }
  if (rawSelfTestToken !== undefined && !SESSION_TOKEN.test(rawSelfTestToken)) {
    throw new Error("health_token_invalid");
  }
  return {
    hubBaseUrl: rawHubBaseUrl === undefined ? undefined : loopbackOrigin(rawHubBaseUrl),
    localRuntimeBaseUrl:
      rawLocalRuntimeBaseUrl === undefined ? undefined : loopbackOrigin(rawLocalRuntimeBaseUrl),
    selfTestToken: rawSelfTestToken,
    pollIntervalMs: boundedInteger(
      environment.SARTRE_HEALTH_POLL_MS,
      DEFAULT_POLL_INTERVAL_MS,
      "poll",
    ),
    timeoutMs: boundedInteger(environment.SARTRE_HEALTH_TIMEOUT_MS, DEFAULT_TIMEOUT_MS, "timeout"),
    staleAfterMs: boundedInteger(
      environment.SARTRE_HEALTH_STALE_MS,
      DEFAULT_STALE_AFTER_MS,
      "stale",
    ),
  };
}
