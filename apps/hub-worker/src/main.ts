import "reflect-metadata";

import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { Server } from "node:http";

import { readWorkerHealthConfig } from "./health/config.js";
import { startWorkerProbeServer } from "./health/probe-server.js";
import { WORKER_HEALTH_CONFIG, WorkerHealthService } from "./health/worker-health.service.js";

const config = readWorkerHealthConfig(process.env);

@Module({
  providers: [{ provide: WORKER_HEALTH_CONFIG, useValue: config }, WorkerHealthService],
})
class WorkerApplicationModule {}

const application = await NestFactory.createApplicationContext(WorkerApplicationModule, {
  logger: false,
});
const health = application.get(WorkerHealthService);
health.startHeartbeat();
let server: Server | undefined = await startWorkerProbeServer({ config, health });
let closing = false;

async function shutdown(): Promise<void> {
  if (closing) return;
  closing = true;
  const activeServer = server;
  server = undefined;
  if (activeServer) {
    await new Promise<void>((resolve, reject) => {
      activeServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await application.close();
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown().then(
      () => {
        process.exitCode = 0;
      },
      () => {
        process.exitCode = 1;
      },
    );
  });
}
