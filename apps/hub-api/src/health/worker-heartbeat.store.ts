import { Inject, Injectable } from "@nestjs/common";
import { HubWorkerHealthSnapshotSchema, type HealthSnapshot } from "@sartre/contracts";

import type { HubHealthConfig } from "./config.js";
import { HUB_HEALTH_CONFIG, HubHealthService } from "./health.service.js";

@Injectable()
export class WorkerHeartbeatStore {
  private heartbeat: { snapshot: HealthSnapshot; receivedAt: number } | undefined;

  constructor(
    @Inject(HUB_HEALTH_CONFIG) private readonly config: HubHealthConfig,
    @Inject(HubHealthService) private readonly hubHealth: HubHealthService,
  ) {}

  record(snapshot: unknown): void {
    this.heartbeat = {
      snapshot: HubWorkerHealthSnapshotSchema.parse(snapshot),
      receivedAt: Date.now(),
    };
  }

  read(): HealthSnapshot {
    if (
      !this.heartbeat ||
      Date.now() - this.heartbeat.receivedAt > this.config.workerHeartbeatDeadlineMs
    ) {
      return this.hubHealth.unavailableWorkerSnapshot();
    }
    return this.heartbeat.snapshot;
  }
}
