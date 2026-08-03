import {
  Catch,
  type DynamicModule,
  type ExceptionFilter,
  Module,
  NotFoundException,
} from "@nestjs/common";
import type { ArgumentsHost } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";

import { DiagnosticsController } from "./diagnostics/diagnostics.controller.js";
import { DiagnosticsRepository } from "./diagnostics/diagnostics.repository.js";
import { DiagnosticsService } from "./diagnostics/diagnostics.service.js";
import type { HubHealthConfig } from "./health/config.js";
import { HealthController, Ms0SelfTestController } from "./health/health.controller.js";
import { HUB_HEALTH_CONFIG, HubHealthService } from "./health/health.service.js";
import { WorkerHeartbeatStore } from "./health/worker-heartbeat.store.js";
import { HumanAuthController } from "./identity/human-auth.controller.js";
import type { HumanAuthRuntime } from "./identity/human-auth-runtime.js";
import { HumanAuthService } from "./identity/human-auth.service.js";
import { PostgresHumanAuthRepository } from "./identity/postgres-human-auth.repository.js";
import { PostgresWorkspaceRepository } from "./workspaces/postgres-workspace.repository.js";
import { WorkspaceController } from "./workspaces/workspace.controller.js";
import { WorkspaceService } from "./workspaces/workspace.service.js";

interface RedactedHttpResponse {
  status: (status: number) => RedactedHttpResponse;
  json: (body: unknown) => void;
}

@Catch(NotFoundException)
export class RedactedNotFoundFilter implements ExceptionFilter {
  catch(_exception: NotFoundException, host: ArgumentsHost): void {
    host
      .switchToHttp()
      .getResponse<RedactedHttpResponse>()
      .status(404)
      .json({ statusCode: 404, code: "resource_not_found", message: "Not found" });
  }
}

@Module({})
class HubApplicationModule {}

export function createHubModule(
  config: HubHealthConfig,
  humanAuth?: HumanAuthRuntime,
): DynamicModule {
  const workspaceRepository =
    humanAuth && config.databaseUrl
      ? new PostgresWorkspaceRepository(config.databaseUrl)
      : undefined;
  const workspaceService = workspaceRepository
    ? new WorkspaceService(workspaceRepository)
    : undefined;
  return {
    module: HubApplicationModule,
    controllers: [
      HealthController,
      ...(humanAuth ? [HumanAuthController] : []),
      ...(workspaceService ? [WorkspaceController] : []),
      ...(config.selfTestEnabled ? [Ms0SelfTestController, DiagnosticsController] : []),
    ],
    providers: [
      { provide: HUB_HEALTH_CONFIG, useValue: config },
      ...(humanAuth
        ? [
            { provide: HumanAuthService, useValue: humanAuth.service },
            { provide: PostgresHumanAuthRepository, useValue: humanAuth.repository },
          ]
        : []),
      ...(workspaceRepository && workspaceService
        ? [
            { provide: PostgresWorkspaceRepository, useValue: workspaceRepository },
            { provide: WorkspaceService, useValue: workspaceService },
          ]
        : []),
      HubHealthService,
      ...(config.selfTestEnabled
        ? [WorkerHeartbeatStore, DiagnosticsRepository, DiagnosticsService]
        : []),
    ],
  };
}

export async function createHubApplication(config: HubHealthConfig, humanAuth?: HumanAuthRuntime) {
  return NestFactory.create(createHubModule(config, humanAuth), { logger: false });
}
