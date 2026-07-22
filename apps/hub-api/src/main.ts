import "reflect-metadata";

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
import { readHubHealthConfig, type HubHealthConfig } from "./health/config.js";
import { HealthController, Ms0SelfTestController } from "./health/health.controller.js";
import { HUB_HEALTH_CONFIG, HubHealthService } from "./health/health.service.js";
import { WorkerHeartbeatStore } from "./health/worker-heartbeat.store.js";

interface RedactedHttpResponse {
  status: (status: number) => RedactedHttpResponse;
  json: (body: unknown) => void;
}

@Catch(NotFoundException)
class RedactedNotFoundFilter implements ExceptionFilter {
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

function createHubModule(config: HubHealthConfig): DynamicModule {
  return {
    module: HubApplicationModule,
    controllers: [
      HealthController,
      ...(config.selfTestEnabled ? [Ms0SelfTestController, DiagnosticsController] : []),
    ],
    providers: [
      { provide: HUB_HEALTH_CONFIG, useValue: config },
      HubHealthService,
      ...(config.selfTestEnabled
        ? [WorkerHeartbeatStore, DiagnosticsRepository, DiagnosticsService]
        : []),
    ],
  };
}

async function bootstrap(): Promise<void> {
  const config = readHubHealthConfig(process.env);
  const application = await NestFactory.create(createHubModule(config), { logger: false });
  application.useGlobalFilters(new RedactedNotFoundFilter());
  application.enableShutdownHooks(["SIGINT", "SIGTERM"]);
  await application.listen(config.port, config.host);
}

await bootstrap();
