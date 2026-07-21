import {
  AggregatedServiceHealthSchema,
  ElectronHealthSnapshotSchema,
  HubApiHealthSnapshotSchema,
  HubWorkerHealthSnapshotSchema,
  LocalRuntimeHealthSnapshotSchema,
  type AggregatedServiceHealth,
  type HealthSnapshot,
} from "@sartre/contracts";

export interface HealthClient {
  readAggregatedHealth(electronSnapshot: HealthSnapshot): Promise<AggregatedServiceHealth>;
}

export interface HealthClientOptions {
  readonly hubBaseUrl: string;
  readonly localRuntimeBaseUrl: string;
  readonly ms0SelfTestToken: string;
  readonly timeoutMs: number;
}

type SnapshotParser = { parse: (input: unknown) => HealthSnapshot };

function unavailable(service: "hub-api" | "hub-worker" | "local-runtime"): HealthSnapshot {
  return {
    service,
    status: "unavailable",
    version: "unavailable",
    commitSha: "0".repeat(40),
    checkedAt: new Date().toISOString(),
    dependencies: [],
    errorCode: "dependency_unavailable",
  };
}

function normalizedBaseUrl(value: string): string {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "http:" ||
    parsed.hostname !== "127.0.0.1" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("health_endpoint_invalid");
  }
  return parsed.origin;
}

async function readSnapshot(options: {
  url: string;
  parser: SnapshotParser;
  service: "hub-api" | "hub-worker" | "local-runtime";
  timeoutMs: number;
  authorization?: string;
}): Promise<HealthSnapshot> {
  try {
    const response = await fetch(options.url, {
      ...(options.authorization
        ? { headers: { "x-sartre-ms0-session": options.authorization } }
        : {}),
      signal: AbortSignal.timeout(options.timeoutMs),
    });
    if (response.status !== 200 && response.status !== 503) return unavailable(options.service);
    return options.parser.parse(await response.json());
  } catch {
    return unavailable(options.service);
  }
}

export function createHealthClient(options: HealthClientOptions): HealthClient {
  const hubBaseUrl = normalizedBaseUrl(options.hubBaseUrl);
  const localRuntimeBaseUrl = normalizedBaseUrl(options.localRuntimeBaseUrl);
  if (!/^[0-9a-f]{64}$/.test(options.ms0SelfTestToken)) {
    throw new Error("health_self_test_token_invalid");
  }
  if (
    !Number.isInteger(options.timeoutMs) ||
    options.timeoutMs < 50 ||
    options.timeoutMs > 30_000
  ) {
    throw new Error("health_timeout_invalid");
  }

  return {
    async readAggregatedHealth(electronSnapshot) {
      const electron = ElectronHealthSnapshotSchema.parse(electronSnapshot);
      const [hub, worker, runtime] = await Promise.all([
        readSnapshot({
          url: `${hubBaseUrl}/readyz`,
          parser: HubApiHealthSnapshotSchema,
          service: "hub-api",
          timeoutMs: options.timeoutMs,
        }),
        readSnapshot({
          url: `${hubBaseUrl}/__ms0/self-test/worker-health`,
          parser: HubWorkerHealthSnapshotSchema,
          service: "hub-worker",
          timeoutMs: options.timeoutMs,
          authorization: options.ms0SelfTestToken,
        }),
        readSnapshot({
          url: `${localRuntimeBaseUrl}/readyz`,
          parser: LocalRuntimeHealthSnapshotSchema,
          service: "local-runtime",
          timeoutMs: options.timeoutMs,
        }),
      ]);
      const processes = {
        electron,
        "hub-api": hub,
        "hub-worker": worker,
        "local-runtime": runtime,
      };
      return AggregatedServiceHealthSchema.parse({
        status: Object.values(processes).every((snapshot) => snapshot.status === "healthy")
          ? "healthy"
          : "degraded",
        checkedAt: new Date().toISOString(),
        processes,
      });
    },
  };
}
