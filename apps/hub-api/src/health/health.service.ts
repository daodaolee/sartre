import { Inject, Injectable } from "@nestjs/common";
import { HealthSnapshotSchema, type ErrorCode, type HealthSnapshot } from "@sartre/contracts";
import postgres from "postgres";

import { assertDatabaseSchemaCompatible } from "../infrastructure/database/schema-compatibility.js";
import { loadExpectedBaselineArtifact } from "./baseline-artifact.js";
import type { HubHealthConfig } from "./config.js";

export const HUB_HEALTH_CONFIG = Symbol("HUB_HEALTH_CONFIG");

function stableDatabaseError(error: unknown): ErrorCode {
  if (typeof error === "object" && error !== null && "code" in error) {
    if (error.code === "schema_incompatible") return error.code;
    if (error.code === "postgres_version_mismatch") return error.code;
  }
  return "dependency_unavailable";
}

@Injectable()
export class HubHealthService {
  constructor(@Inject(HUB_HEALTH_CONFIG) private readonly config: HubHealthConfig) {}

  liveness(): HealthSnapshot {
    return this.snapshot("healthy", []);
  }

  async readiness(): Promise<HealthSnapshot> {
    if (!this.config.configurationValid || !this.config.databaseUrl) {
      return this.snapshot(
        "degraded",
        [this.databaseDependency("degraded", "validation_failed")],
        "validation_failed",
      );
    }

    const sql = postgres(this.config.databaseUrl, {
      connect_timeout: 1,
      idle_timeout: 1,
      max: 1,
      prepare: false,
    });
    let snapshot: HealthSnapshot;
    try {
      await assertDatabaseSchemaCompatible({
        database: {
          query: async (text) => ({ rows: [...(await sql.unsafe(text))] }),
        },
        artifact: await loadExpectedBaselineArtifact(),
      });
      snapshot = this.snapshot("healthy", [this.databaseDependency("healthy")]);
    } catch (error) {
      const errorCode = stableDatabaseError(error);
      snapshot = this.snapshot(
        "degraded",
        [this.databaseDependency("degraded", errorCode)],
        errorCode,
      );
    }
    try {
      await sql.end({ timeout: 1 });
    } catch {
      return this.snapshot(
        "degraded",
        [this.databaseDependency("degraded", "dependency_unavailable")],
        "dependency_unavailable",
      );
    }
    return snapshot;
  }

  unavailableWorkerSnapshot(): HealthSnapshot {
    return HealthSnapshotSchema.parse({
      service: "hub-worker",
      status: "unavailable",
      version: this.config.version,
      commitSha: this.config.commitSha,
      checkedAt: new Date().toISOString(),
      dependencies: [],
      errorCode: "dependency_unavailable",
    });
  }

  private databaseDependency(status: "healthy" | "degraded", errorCode?: ErrorCode) {
    return {
      service: "postgresql",
      status,
      checkedAt: new Date().toISOString(),
      ...(errorCode ? { errorCode } : {}),
    } as const;
  }

  private snapshot(
    status: "healthy" | "degraded",
    dependencies: HealthSnapshot["dependencies"],
    errorCode?: ErrorCode,
  ): HealthSnapshot {
    return HealthSnapshotSchema.parse({
      service: "hub-api",
      status,
      version: this.config.version,
      commitSha: this.config.commitSha,
      checkedAt: new Date().toISOString(),
      dependencies,
      ...(errorCode ? { errorCode } : {}),
    });
  }
}
