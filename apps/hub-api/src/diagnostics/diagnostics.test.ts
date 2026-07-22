import { randomUUID } from "node:crypto";

import { describe, expect, test, vi } from "vitest";

const postgresState = vi.hoisted(() => ({
  queryError: undefined as unknown,
  rows: [] as unknown[],
}));

vi.mock("postgres", () => ({
  default: () =>
    Object.assign(
      async () => {
        if (postgresState.queryError) throw postgresState.queryError;
        return postgresState.rows;
      },
      { end: async () => undefined },
    ),
}));

import type { HubHealthConfig } from "../health/config.js";
import { DiagnosticsController } from "./diagnostics.controller.js";
import * as repositoryModule from "./diagnostics.repository.js";
import { DiagnosticsRepository } from "./diagnostics.repository.js";
import { DiagnosticsService } from "./diagnostics.service.js";

const CONFIG: HubHealthConfig = {
  host: "127.0.0.1",
  port: 3000,
  version: "0.1.0-test",
  commitSha: "d".repeat(40),
  databaseUrl: "postgresql://local/test",
  selfTestEnabled: true,
  selfTestToken: "a".repeat(64),
  workerHeartbeatDeadlineMs: 500,
  configurationValid: true,
};

const validRow = () => {
  const userId = randomUUID();
  const occurredAt = "2026-07-22T10:00:00.000Z";
  const recordedAt = "2026-07-22T10:00:00.001Z";
  return {
    record_id: randomUUID(),
    sequence: 1,
    request_id: randomUUID(),
    correlation_id: randomUUID(),
    causation_id: randomUUID(),
    workspace_id: null,
    user_id: userId,
    initiated_by_user_id: userId,
    actor_type: "system",
    actor_id: "ms0-diagnostic-self-test",
    component: "hub-api",
    operation: "diagnostics.probe",
    stage: "request_received",
    status: "succeeded",
    resource_type: null,
    resource_id: null,
    requirement_id: null,
    session_id: null,
    execution_id: null,
    lease_id: null,
    endpoint_id: null,
    occurred_at: occurredAt,
    error_code: null,
    retryable: false,
    recorded_at: recordedAt,
    retention_expires_at: "2026-07-23T10:00:00.001Z",
  };
};

type RepositoryCorruptErrorConstructor = new () => Error & { readonly code: "degraded" };

function repositoryCorruptErrorConstructor(): RepositoryCorruptErrorConstructor {
  const errorConstructor = (
    repositoryModule as typeof repositoryModule & {
      DiagnosticRecordCorruptError?: RepositoryCorruptErrorConstructor;
    }
  ).DiagnosticRecordCorruptError;
  if (errorConstructor) return errorConstructor;
  return class MissingDiagnosticRecordCorruptError extends Error {
    readonly code = "degraded" as const;
  };
}

describe("diagnostics repository corruption boundary", () => {
  test.each([
    ["row validation", () => ({ ...validRow(), actor_id: "" })],
    ["ISO conversion", () => ({ ...validRow(), occurred_at: "not-a-timestamp" })],
  ])("wraps %s failure in a dedicated corruption error", async (_case, invalidRow) => {
    postgresState.queryError = undefined;
    postgresState.rows = [invalidRow()];
    const repository = new DiagnosticsRepository(CONFIG);

    const error = await repository.readByCorrelationId(randomUUID()).catch((reason) => reason);
    const CorruptError = (
      repositoryModule as typeof repositoryModule & {
        DiagnosticRecordCorruptError?: RepositoryCorruptErrorConstructor;
      }
    ).DiagnosticRecordCorruptError;

    expect(CorruptError).toBeTypeOf("function");
    expect(error).toBeInstanceOf(CorruptError as RepositoryCorruptErrorConstructor);
    expect(error).toMatchObject({ code: "degraded" });
  });

  test("does not reclassify SQL failures as row corruption", async () => {
    const queryError = new Error("database_query_failed");
    postgresState.queryError = queryError;
    postgresState.rows = [];
    const repository = new DiagnosticsRepository(CONFIG);

    await expect(repository.readByCorrelationId(randomUUID())).rejects.toBe(queryError);
  });

  test("normalizes repository corruption through service and controller as redacted degraded", async () => {
    const RepositoryCorruptError = repositoryCorruptErrorConstructor();
    const repository = {
      readByCorrelationId: vi.fn(async () => {
        throw new RepositoryCorruptError();
      }),
    } as unknown as DiagnosticsRepository;
    const service = new DiagnosticsService(repository);
    const controller = new DiagnosticsController(CONFIG, service);

    const error = await controller
      .read(CONFIG.selfTestToken, randomUUID())
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({
      status: 503,
      response: { code: "degraded" },
    });
    expect(JSON.stringify(error)).not.toMatch(/actor_id|database_query_failed|Zod/iu);
  });
});
