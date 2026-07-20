import { describe, expect, test } from "vitest";

import * as composePolicy from "./check-compose-policy.js";
import { validatePostgresComposeService } from "./check-compose-policy.js";

const APPROVED_SERVICE = {
  image: "postgres:17.6@sha256:00bc86618629af00d2937fdc5a5d63db3ff8450acf52f0636ec813c7f4902929",
  command: null,
  container_name: "sartre-postgres-17-6",
  entrypoint: null,
  profiles: ["local-integration"],
  restart: "no",
  environment: {
    POSTGRES_HOST_AUTH_METHOD: "trust",
  },
  labels: {
    "sartre.environment": "local-integration",
    "sartre.production-reuse": "prohibited",
  },
  healthcheck: {
    test: ["CMD-SHELL", "pg_isready -U postgres -d postgres"],
    timeout: "3s",
    interval: "2s",
    retries: 30,
  },
  networks: { default: null },
  ports: [
    {
      host_ip: "127.0.0.1",
      mode: "ingress",
      target: 5432,
      published: "54326",
      protocol: "tcp",
    },
  ],
  volumes: [
    {
      type: "volume",
      source: "sartre-postgres-17-6-data",
      target: "/var/lib/postgresql/data",
      volume: {},
    },
  ],
};

const APPROVED_DOCUMENT = {
  name: "postgres",
  services: {
    postgres: APPROVED_SERVICE,
  },
  networks: {
    default: { name: "postgres_default", ipam: {} },
  },
  volumes: {
    "sartre-postgres-17-6-data": {
      name: "postgres_sartre-postgres-17-6-data",
    },
  },
};

function validatePostgresComposeDocument(document: unknown): string[] {
  const validator = Reflect.get(composePolicy, "validatePostgresComposeDocument") as unknown;
  if (typeof validator !== "function") {
    return ["postgres_compose_document_validator_missing"];
  }
  return (validator as (value: unknown) => string[])(document);
}

describe("PostgreSQL compose policy", () => {
  test("accepts only the explicit loopback local-integration trust service", () => {
    expect(validatePostgresComposeService(APPROVED_SERVICE)).toEqual([]);
  });

  test.each([
    ["non-loopback publish", { ports: [{ ...APPROVED_SERVICE.ports[0], host_ip: "0.0.0.0" }] }],
    ["wrong server version", { image: "postgres:17.10" }],
    ["missing local-only profile", { profiles: [] }],
    ["password-bearing environment", { environment: { POSTGRES_PASSWORD: "forbidden" } }],
    ["non-trust auth", { environment: { POSTGRES_HOST_AUTH_METHOD: "scram-sha-256" } }],
    [
      "environment-dependent healthcheck",
      {
        healthcheck: {
          test: ["CMD-SHELL", "pg_isready -U $POSTGRES_USER -d $POSTGRES_DB"],
        },
      },
    ],
    ["missing production prohibition", { labels: { "sartre.environment": "local-integration" } }],
  ])("rejects %s", (_name, override) => {
    expect(
      validatePostgresComposeService({
        ...APPROVED_SERVICE,
        ...override,
      }),
    ).not.toEqual([]);
  });

  test.each([
    ["container-name drift", { container_name: "unexpected-postgres" }],
    ["restart lifecycle drift", { restart: "unless-stopped" }],
    ["host network mode", { network_mode: "host" }],
    [
      "a bind mount",
      {
        volumes: [
          {
            type: "bind",
            source: "/tmp/postgres-data",
            target: "/var/lib/postgresql/data",
          },
        ],
      },
    ],
    [
      "an additional mount",
      {
        volumes: [
          ...APPROVED_SERVICE.volumes,
          {
            type: "volume",
            source: "unexpected-data",
            target: "/unexpected",
            volume: {},
          },
        ],
      },
    ],
  ])("rejects %s", (_name, override) => {
    expect(
      validatePostgresComposeService({
        ...APPROVED_SERVICE,
        ...override,
      }),
    ).not.toEqual([]);
  });

  test("accepts only the exact rendered compose document", () => {
    expect(validatePostgresComposeDocument(APPROVED_DOCUMENT)).toEqual([]);
  });

  test("rejects an additional rendered service", () => {
    expect(
      validatePostgresComposeDocument({
        ...APPROVED_DOCUMENT,
        services: {
          ...APPROVED_DOCUMENT.services,
          unexpected: APPROVED_SERVICE,
        },
      }),
    ).toContain("postgres_compose_service_set_unsafe");
  });

  test("rejects an additional top-level volume", () => {
    expect(
      validatePostgresComposeDocument({
        ...APPROVED_DOCUMENT,
        volumes: {
          ...APPROVED_DOCUMENT.volumes,
          "unexpected-data": {},
        },
      }),
    ).toContain("postgres_compose_volume_set_unsafe");
  });

  test.each([
    ["volumes_from", { volumes_from: ["unmanaged-production"] }],
    ["devices", { devices: ["/dev/null:/dev/production"] }],
    ["tmpfs", { tmpfs: ["/var/lib/postgresql/data"] }],
    ["configs", { configs: [{ source: "unmanaged-config", target: "/etc/postgresql.conf" }] }],
    ["secrets", { secrets: [{ source: "unmanaged-secret", target: "database-secret" }] }],
    ["privileged", { privileged: true }],
    ["command override", { command: ["postgres", "-c", "data_directory=/production"] }],
    ["entrypoint override", { entrypoint: ["/bin/sh", "-c"] }],
  ])("rejects unapproved service channel %s", (_name, override) => {
    expect(
      validatePostgresComposeDocument({
        ...APPROVED_DOCUMENT,
        services: {
          postgres: {
            ...APPROVED_SERVICE,
            ...override,
          },
        },
      }),
    ).toContain("postgres_compose_service_shape_unsafe");
  });

  test.each([
    [
      "healthcheck option",
      { healthcheck: { ...APPROVED_SERVICE.healthcheck, start_period: "30s" } },
      "postgres_compose_healthcheck_unsafe",
    ],
    [
      "port option",
      { ports: [{ ...APPROVED_SERVICE.ports[0], app_protocol: "postgres" }] },
      "postgres_compose_port_not_loopback_only",
    ],
    [
      "mount option",
      { volumes: [{ ...APPROVED_SERVICE.volumes[0], read_only: true }] },
      "postgres_compose_mount_unsafe",
    ],
    [
      "label",
      { labels: { ...APPROVED_SERVICE.labels, "unmanaged.production": "true" } },
      "postgres_compose_production_reuse_not_prohibited",
    ],
    [
      "network attachment",
      { networks: { ...APPROVED_SERVICE.networks, production: null } },
      "postgres_compose_network_attachment_unsafe",
    ],
  ])("rejects unapproved nested service %s", (_name, override, expectedViolation) => {
    expect(
      validatePostgresComposeDocument({
        ...APPROVED_DOCUMENT,
        services: {
          postgres: {
            ...APPROVED_SERVICE,
            ...override,
          },
        },
      }),
    ).toContain(expectedViolation);
  });

  test.each([
    ["external", { external: true, name: "production-database-data" }],
    ["name", { name: "production-database-data" }],
    ["driver", { driver: "local" }],
    ["driver options", { driver_opts: { type: "none", device: "/production" } }],
  ])("rejects top-level volume %s drift", (_name, override) => {
    expect(
      validatePostgresComposeDocument({
        ...APPROVED_DOCUMENT,
        volumes: {
          "sartre-postgres-17-6-data": {
            ...APPROVED_DOCUMENT.volumes["sartre-postgres-17-6-data"],
            ...override,
          },
        },
      }),
    ).toContain("postgres_compose_volume_definition_unsafe");
  });

  test.each([
    ["external", { external: true }],
    ["name", { name: "production-network" }],
    ["driver", { driver: "host" }],
    ["IPAM", { ipam: { driver: "unmanaged" } }],
  ])("rejects default network %s drift", (_name, override) => {
    expect(
      validatePostgresComposeDocument({
        ...APPROVED_DOCUMENT,
        networks: {
          default: {
            ...APPROVED_DOCUMENT.networks.default,
            ...override,
          },
        },
      }),
    ).toContain("postgres_compose_network_definition_unsafe");
  });

  test.each([
    ["configs", { configs: { "unmanaged-config": { external: true } } }],
    ["secrets", { secrets: { "unmanaged-secret": { external: true } } }],
  ])("rejects unapproved top-level %s", (_name, override) => {
    expect(
      validatePostgresComposeDocument({
        ...APPROVED_DOCUMENT,
        ...override,
      }),
    ).toContain("postgres_compose_document_shape_unsafe");
  });

  test("rejects rendered project-name drift", () => {
    expect(
      validatePostgresComposeDocument({
        ...APPROVED_DOCUMENT,
        name: "production",
      }),
    ).toContain("postgres_compose_document_shape_unsafe");
  });

  test("rejects an additional top-level network", () => {
    expect(
      validatePostgresComposeDocument({
        ...APPROVED_DOCUMENT,
        networks: {
          ...APPROVED_DOCUMENT.networks,
          production: { external: true },
        },
      }),
    ).toContain("postgres_compose_network_set_unsafe");
  });

  test("rejects the targeted volumes_from plus external production-volume bypass", () => {
    const violations = validatePostgresComposeDocument({
      ...APPROVED_DOCUMENT,
      services: {
        postgres: {
          ...APPROVED_SERVICE,
          volumes_from: ["unmanaged-production"],
        },
      },
      volumes: {
        "sartre-postgres-17-6-data": {
          external: true,
          name: "production-database-data",
        },
      },
    });

    expect(violations).toContain("postgres_compose_service_shape_unsafe");
    expect(violations).toContain("postgres_compose_volume_definition_unsafe");
  });
});
