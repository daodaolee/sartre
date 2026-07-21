import { createServer, type Server } from "node:http";

import type { WorkerHealthConfig } from "./config.js";
import type { WorkerHealthService } from "./worker-health.service.js";

function writeJson(
  response: import("node:http").ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

export async function startWorkerProbeServer(options: {
  config: WorkerHealthConfig;
  health: WorkerHealthService;
}): Promise<Server> {
  const server = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/livez") {
      writeJson(response, 200, options.health.liveness());
      return;
    }
    if (request.method === "GET" && request.url === "/readyz") {
      const snapshot = options.health.readiness();
      writeJson(response, snapshot.status === "healthy" ? 200 : 503, snapshot);
      return;
    }
    writeJson(response, 404, {
      statusCode: 404,
      code: "resource_not_found",
      message: "Not found",
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.config.port, options.config.host, resolve);
  });
  return server;
}
