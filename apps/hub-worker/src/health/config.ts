const LOOPBACK_HOST = "127.0.0.1";
const COMMIT_SHA = /^[0-9a-f]{40}$/;
const SELF_TEST_TOKEN = /^[0-9a-f]{64}$/;

export interface WorkerHealthConfig {
  readonly host: typeof LOOPBACK_HOST;
  readonly port: number;
  readonly version: string;
  readonly commitSha: string;
  readonly hubBaseUrl: string | undefined;
  readonly selfTestToken: string | undefined;
  readonly heartbeatIntervalMs: number;
  readonly configurationValid: boolean;
}

function readInteger(
  value: string | undefined,
  minimum: number,
  maximum: number,
): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined;
}

function isSafeLoopbackUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === "http:" &&
      parsed.hostname === LOOPBACK_HOST &&
      parsed.username === "" &&
      parsed.password === "" &&
      parsed.search === "" &&
      parsed.hash === ""
    );
  } catch {
    return false;
  }
}

export function readWorkerHealthConfig(environment: NodeJS.ProcessEnv): WorkerHealthConfig {
  const port = readInteger(environment.SARTRE_PORT, 1, 65_535);
  const interval = readInteger(environment.SARTRE_WORKER_HEARTBEAT_INTERVAL_MS, 50, 10_000);
  const version = environment.SARTRE_SERVICE_VERSION;
  const commitSha = environment.SARTRE_COMMIT_SHA;
  const token = environment.SARTRE_MS0_SELF_TEST_TOKEN;
  const selfTestEnabled = environment.SARTRE_MS0_SELF_TEST === "enabled";
  const configurationValid = Boolean(
    environment.SARTRE_HOST === LOOPBACK_HOST &&
      port &&
      version &&
      version.length <= 128 &&
      commitSha &&
      COMMIT_SHA.test(commitSha) &&
      interval &&
      selfTestEnabled &&
      token &&
      SELF_TEST_TOKEN.test(token) &&
      isSafeLoopbackUrl(environment.SARTRE_HUB_BASE_URL),
  );

  return {
    host: LOOPBACK_HOST,
    port: port ?? 1,
    version: version && version.length <= 128 ? version : "configuration-invalid",
    commitSha: commitSha && COMMIT_SHA.test(commitSha) ? commitSha : "0".repeat(40),
    hubBaseUrl: isSafeLoopbackUrl(environment.SARTRE_HUB_BASE_URL)
      ? environment.SARTRE_HUB_BASE_URL
      : undefined,
    selfTestToken: token && SELF_TEST_TOKEN.test(token) ? token : undefined,
    heartbeatIntervalMs: interval ?? 500,
    configurationValid,
  };
}
