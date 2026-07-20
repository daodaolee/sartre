import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

const EXPECTED_IMAGE =
  "postgres:17.6@sha256:00bc86618629af00d2937fdc5a5d63db3ff8450acf52f0636ec813c7f4902929";
const EXPECTED_PROFILE = "local-integration";
const EXPECTED_PROJECT_NAME = "postgres";
const EXPECTED_CONTAINER_NAME = "sartre-postgres-17-6";
const EXPECTED_VOLUME_NAME = "sartre-postgres-17-6-data";
const EXPECTED_RENDERED_VOLUME_NAME = "postgres_sartre-postgres-17-6-data";
const EXPECTED_VOLUME_TARGET = "/var/lib/postgresql/data";
const EXPECTED_NETWORK_NAME = "postgres_default";

const EXPECTED_DOCUMENT_KEYS = ["name", "networks", "services", "volumes"];
const EXPECTED_SERVICE_KEYS = [
  "command",
  "container_name",
  "entrypoint",
  "environment",
  "healthcheck",
  "image",
  "labels",
  "networks",
  "ports",
  "profiles",
  "restart",
  "volumes",
];
const EXPECTED_HEALTHCHECK_KEYS = ["interval", "retries", "test", "timeout"];
const EXPECTED_PORT_KEYS = ["host_ip", "mode", "protocol", "published", "target"];
const EXPECTED_MOUNT_KEYS = ["source", "target", "type", "volume"];

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function hasExactKeys(value: UnknownRecord, expectedKeys: string[]): boolean {
  const actualKeys = Object.keys(value);
  return (
    actualKeys.length === expectedKeys.length &&
    expectedKeys.every((key) => Object.hasOwn(value, key))
  );
}

function isEmptyRecord(value: unknown): boolean {
  const record = asRecord(value);
  return Boolean(record && Object.keys(record).length === 0);
}

export function validatePostgresComposeService(service: unknown): string[] {
  const value = asRecord(service);
  if (!value) {
    return ["postgres_compose_service_missing"];
  }

  const violations: string[] = [];
  if (
    !hasExactKeys(value, EXPECTED_SERVICE_KEYS) ||
    value.command !== null ||
    value.entrypoint !== null
  ) {
    violations.push("postgres_compose_service_shape_unsafe");
  }

  if (value.image !== EXPECTED_IMAGE) {
    violations.push("postgres_compose_image_mismatch");
  }

  if (value.container_name !== EXPECTED_CONTAINER_NAME) {
    violations.push("postgres_compose_container_name_mismatch");
  }

  if (value.restart !== "no") {
    violations.push("postgres_compose_restart_unsafe");
  }

  if (value.network_mode !== undefined) {
    violations.push("postgres_compose_network_mode_unsafe");
  }

  const profiles = Array.isArray(value.profiles) ? value.profiles : [];
  if (profiles.length !== 1 || profiles[0] !== EXPECTED_PROFILE) {
    violations.push("postgres_compose_profile_unsafe");
  }

  const environment = asRecord(value.environment);
  if (
    !environment ||
    !hasExactKeys(environment, ["POSTGRES_HOST_AUTH_METHOD"]) ||
    environment.POSTGRES_HOST_AUTH_METHOD !== "trust"
  ) {
    violations.push("postgres_compose_auth_unsafe");
  }

  const labels = asRecord(value.labels);
  if (
    !labels ||
    !hasExactKeys(labels, ["sartre.environment", "sartre.production-reuse"]) ||
    labels?.["sartre.environment"] !== EXPECTED_PROFILE ||
    labels["sartre.production-reuse"] !== "prohibited"
  ) {
    violations.push("postgres_compose_production_reuse_not_prohibited");
  }

  const ports = Array.isArray(value.ports) ? value.ports : [];
  const port = asRecord(ports[0]);
  if (
    ports.length !== 1 ||
    !port ||
    !hasExactKeys(port, EXPECTED_PORT_KEYS) ||
    port.host_ip !== "127.0.0.1" ||
    port.mode !== "ingress" ||
    port.target !== 5432 ||
    port.published !== "54326" ||
    port.protocol !== "tcp"
  ) {
    violations.push("postgres_compose_port_not_loopback_only");
  }

  const healthcheck = asRecord(value.healthcheck);
  const healthcheckTest = Array.isArray(healthcheck?.test) ? healthcheck.test : [];
  if (
    !healthcheck ||
    !hasExactKeys(healthcheck, EXPECTED_HEALTHCHECK_KEYS) ||
    healthcheckTest.length !== 2 ||
    healthcheckTest[0] !== "CMD-SHELL" ||
    healthcheckTest[1] !== "pg_isready -U postgres -d postgres" ||
    healthcheck.timeout !== "3s" ||
    healthcheck.interval !== "2s" ||
    healthcheck.retries !== 30
  ) {
    violations.push("postgres_compose_healthcheck_unsafe");
  }

  const networks = asRecord(value.networks);
  if (!networks || !hasExactKeys(networks, ["default"]) || networks.default !== null) {
    violations.push("postgres_compose_network_attachment_unsafe");
  }

  const volumes = Array.isArray(value.volumes) ? value.volumes : [];
  const volume = asRecord(volumes[0]);
  if (
    volumes.length !== 1 ||
    !volume ||
    !hasExactKeys(volume, EXPECTED_MOUNT_KEYS) ||
    volume.type !== "volume" ||
    volume.source !== EXPECTED_VOLUME_NAME ||
    volume.target !== EXPECTED_VOLUME_TARGET ||
    !isEmptyRecord(volume.volume)
  ) {
    violations.push("postgres_compose_mount_unsafe");
  }

  return violations;
}

export function validatePostgresComposeDocument(document: unknown): string[] {
  const value = asRecord(document);
  if (!value) {
    return ["postgres_compose_document_missing"];
  }

  const violations: string[] = [];
  if (!hasExactKeys(value, EXPECTED_DOCUMENT_KEYS) || value.name !== EXPECTED_PROJECT_NAME) {
    violations.push("postgres_compose_document_shape_unsafe");
  }

  const services = asRecord(value.services);
  if (!services || !hasExactKeys(services, ["postgres"])) {
    violations.push("postgres_compose_service_set_unsafe");
  }

  const volumes = asRecord(value.volumes);
  if (!volumes || !hasExactKeys(volumes, [EXPECTED_VOLUME_NAME])) {
    violations.push("postgres_compose_volume_set_unsafe");
  }
  const volume = asRecord(volumes?.[EXPECTED_VOLUME_NAME]);
  if (!volume || !hasExactKeys(volume, ["name"]) || volume.name !== EXPECTED_RENDERED_VOLUME_NAME) {
    violations.push("postgres_compose_volume_definition_unsafe");
  }

  const networks = asRecord(value.networks);
  if (!networks || !hasExactKeys(networks, ["default"])) {
    violations.push("postgres_compose_network_set_unsafe");
  }
  const network = asRecord(networks?.default);
  if (
    !network ||
    !hasExactKeys(network, ["ipam", "name"]) ||
    network.name !== EXPECTED_NETWORK_NAME ||
    !isEmptyRecord(network.ipam)
  ) {
    violations.push("postgres_compose_network_definition_unsafe");
  }

  violations.push(...validatePostgresComposeService(services?.postgres));
  return violations;
}

async function loadRenderedPostgresComposeDocument(): Promise<unknown> {
  const composePath = fileURLToPath(new URL("../../docker/postgres/compose.yml", import.meta.url));
  const result = await execFileAsync(
    "docker",
    ["compose", "-f", composePath, "--profile", EXPECTED_PROFILE, "config", "--format", "json"],
    { encoding: "utf8", maxBuffer: 1024 * 1024 },
  );
  return JSON.parse(result.stdout) as unknown;
}

export async function runPostgresComposePolicyCli(): Promise<number> {
  try {
    const violations = validatePostgresComposeDocument(await loadRenderedPostgresComposeDocument());
    if (violations.length > 0) {
      for (const violation of violations) {
        console.error(violation);
      }
      return 1;
    }
    console.info("postgres_compose_policy=pass");
    return 0;
  } catch {
    console.error("postgres_compose_policy_check_failed");
    return 1;
  }
}

const executedPath = process.argv[1];
if (executedPath && import.meta.url === pathToFileURL(executedPath).href) {
  process.exitCode = await runPostgresComposePolicyCli();
}
