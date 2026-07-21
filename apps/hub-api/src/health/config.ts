const LOOPBACK_HOST = "127.0.0.1";
const COMMIT_SHA = /^[0-9a-f]{40}$/;
const SELF_TEST_TOKEN = /^[0-9a-f]{64}$/;

export interface HubHealthConfig {
  readonly host: string;
  readonly port: number;
  readonly version: string;
  readonly commitSha: string;
  readonly databaseUrl: string | undefined;
  readonly selfTestEnabled: boolean;
  readonly selfTestToken: string | undefined;
  readonly workerHeartbeatDeadlineMs: number;
  readonly configurationValid: boolean;
}

function readPort(value: string | undefined): number | undefined {
  if (!value || !/^\d{1,5}$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : undefined;
}

function readDeadline(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 100 && parsed <= 60_000 ? parsed : undefined;
}

export function readHubHealthConfig(environment: NodeJS.ProcessEnv): HubHealthConfig {
  const port = readPort(environment.SARTRE_PORT);
  const version = environment.SARTRE_SERVICE_VERSION;
  const commitSha = environment.SARTRE_COMMIT_SHA;
  const requestedSelfTest = environment.SARTRE_MS0_SELF_TEST === "enabled";
  const token = environment.SARTRE_MS0_SELF_TEST_TOKEN;
  const deadline = readDeadline(environment.SARTRE_WORKER_HEARTBEAT_DEADLINE_MS);
  const selfTestEnabled =
    requestedSelfTest &&
    environment.SARTRE_HOST === LOOPBACK_HOST &&
    Boolean(token && SELF_TEST_TOKEN.test(token)) &&
    deadline !== undefined;
  const configurationValid = Boolean(
    port &&
      version &&
      version.length <= 128 &&
      commitSha &&
      COMMIT_SHA.test(commitSha) &&
      environment.SARTRE_DATABASE_URL &&
      (!requestedSelfTest || selfTestEnabled),
  );

  return {
    host: environment.SARTRE_HOST || LOOPBACK_HOST,
    port: port ?? 1,
    version: version && version.length <= 128 ? version : "configuration-invalid",
    commitSha: commitSha && COMMIT_SHA.test(commitSha) ? commitSha : "0".repeat(40),
    databaseUrl: environment.SARTRE_DATABASE_URL,
    selfTestEnabled,
    selfTestToken: selfTestEnabled ? token : undefined,
    workerHeartbeatDeadlineMs: deadline ?? 500,
    configurationValid,
  };
}
