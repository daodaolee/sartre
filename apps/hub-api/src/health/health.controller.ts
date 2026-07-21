import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  Post,
} from "@nestjs/common";
import { Ms0WorkerHeartbeatSchema, type HealthSnapshot } from "@sartre/contracts";
import { timingSafeEqual } from "node:crypto";

import type { HubHealthConfig } from "./config.js";
import { HUB_HEALTH_CONFIG, HubHealthService } from "./health.service.js";
import { WorkerHeartbeatStore } from "./worker-heartbeat.store.js";

@Controller()
export class HealthController {
  constructor(@Inject(HubHealthService) private readonly health: HubHealthService) {}

  @Get("livez")
  liveness(): HealthSnapshot {
    return this.health.liveness();
  }

  @Get("readyz")
  async readiness(): Promise<HealthSnapshot> {
    const snapshot = await this.health.readiness();
    if (snapshot.status !== "healthy") {
      throw new HttpException(snapshot, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return snapshot;
  }
}

function tokenMatches(header: string | undefined, expected: string | undefined): boolean {
  if (!header || !expected) return false;
  const actual = Buffer.from(header, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

@Controller("__ms0/self-test")
export class Ms0SelfTestController {
  constructor(
    @Inject(HUB_HEALTH_CONFIG) private readonly config: HubHealthConfig,
    @Inject(WorkerHeartbeatStore) private readonly workerHeartbeat: WorkerHeartbeatStore,
  ) {}

  @Get("worker-health")
  workerHealth(@Headers("x-sartre-ms0-session") sessionToken?: string): HealthSnapshot {
    this.requireToken(sessionToken);
    return this.workerHeartbeat.read();
  }

  @Post("worker-heartbeat")
  @HttpCode(204)
  workerHeartbeatUpdate(
    @Headers("x-sartre-ms0-session") sessionToken: string | undefined,
    @Body() body: unknown,
  ): void {
    this.requireToken(sessionToken);
    const parsed = Ms0WorkerHeartbeatSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { statusCode: 400, code: "validation_failed", message: "Invalid request" },
        HttpStatus.BAD_REQUEST,
      );
    }
    this.workerHeartbeat.record(parsed.data.snapshot);
  }

  private requireToken(sessionToken: string | undefined): void {
    if (!tokenMatches(sessionToken, this.config.selfTestToken)) {
      throw new NotFoundException();
    }
  }
}
