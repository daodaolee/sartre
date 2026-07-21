import { Inject, Injectable, type OnModuleDestroy } from "@nestjs/common";
import {
  HealthSnapshotSchema,
  Ms0WorkerHeartbeatSchema,
  type HealthSnapshot,
} from "@sartre/contracts";

import type { WorkerHealthConfig } from "./config.js";

export const WORKER_HEALTH_CONFIG = Symbol("WORKER_HEALTH_CONFIG");

@Injectable()
export class WorkerHealthService implements OnModuleDestroy {
  private timer: NodeJS.Timeout | undefined;
  private lastSuccessfulHeartbeat = 0;

  constructor(@Inject(WORKER_HEALTH_CONFIG) private readonly config: WorkerHealthConfig) {}

  startHeartbeat(): void {
    if (this.timer) return;
    void this.sendHeartbeat();
    this.timer = setInterval(() => void this.sendHeartbeat(), this.config.heartbeatIntervalMs);
    this.timer.unref();
  }

  liveness(): HealthSnapshot {
    return this.snapshot("healthy", []);
  }

  readiness(): HealthSnapshot {
    const heartbeatHealthy =
      this.config.configurationValid &&
      Date.now() - this.lastSuccessfulHeartbeat <= this.config.heartbeatIntervalMs * 3;
    if (!heartbeatHealthy) {
      return this.snapshot(
        "degraded",
        [
          {
            service: "hub-api",
            status: "degraded",
            checkedAt: new Date().toISOString(),
            errorCode: this.config.configurationValid
              ? "dependency_unavailable"
              : "validation_failed",
          },
        ],
        this.config.configurationValid ? "dependency_unavailable" : "validation_failed",
      );
    }

    return this.snapshot("healthy", [
      {
        service: "hub-api",
        status: "healthy",
        checkedAt: new Date().toISOString(),
      },
    ]);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.config.configurationValid || !this.config.hubBaseUrl || !this.config.selfTestToken) {
      return;
    }
    try {
      const body = Ms0WorkerHeartbeatSchema.parse({ snapshot: this.readiness() });
      const response = await fetch(`${this.config.hubBaseUrl}/__ms0/self-test/worker-heartbeat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-sartre-ms0-session": this.config.selfTestToken,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.max(this.config.heartbeatIntervalMs * 2, 500)),
      });
      if (response.status === 204) this.lastSuccessfulHeartbeat = Date.now();
    } catch {
      // Readiness remains explicitly degraded until a later heartbeat succeeds.
    }
  }

  private snapshot(
    status: "healthy" | "degraded",
    dependencies: HealthSnapshot["dependencies"],
    errorCode?: "dependency_unavailable" | "validation_failed",
  ): HealthSnapshot {
    return HealthSnapshotSchema.parse({
      service: "hub-worker",
      status,
      version: this.config.version,
      commitSha: this.config.commitSha,
      checkedAt: new Date().toISOString(),
      dependencies,
      ...(errorCode ? { errorCode } : {}),
    });
  }
}
