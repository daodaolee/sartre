import { createServer, type ServerResponse } from "node:http";

import { createProcessHealthSnapshot } from "@sartre/runtime-core";

const LOOPBACK_HOST = "127.0.0.1";
const COMMIT_SHA = /^[0-9a-f]{40}$/;

function readPort(value: string | undefined): number | undefined {
  if (!value || !/^\d{1,5}$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65_535 ? parsed : undefined;
}

const port = readPort(process.env.SARTRE_PORT);
const version = process.env.SARTRE_SERVICE_VERSION;
const commitSha = process.env.SARTRE_COMMIT_SHA;
const configurationValid = Boolean(
  process.env.SARTRE_HOST === LOOPBACK_HOST &&
    port &&
    version &&
    version.length <= 128 &&
    commitSha &&
    COMMIT_SHA.test(commitSha),
);

function snapshot(readiness: boolean) {
  const healthy = !readiness || configurationValid;
  return createProcessHealthSnapshot({
    service: "local-runtime",
    status: healthy ? "healthy" : "degraded",
    version: version && version.length <= 128 ? version : "configuration-invalid",
    commitSha: commitSha && COMMIT_SHA.test(commitSha) ? commitSha : "0".repeat(40),
    ...(healthy ? {} : { errorCode: "validation_failed" as const }),
  });
}

function writeJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end(JSON.stringify(body));
}

const server = createServer((request, response) => {
  if (request.method === "GET" && request.url === "/livez") {
    writeJson(response, 200, snapshot(false));
    return;
  }
  if (request.method === "GET" && request.url === "/readyz") {
    const readiness = snapshot(true);
    writeJson(response, readiness.status === "healthy" ? 200 : 503, readiness);
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
  server.listen(port ?? 1, LOOPBACK_HOST, resolve);
});

let closing = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    if (closing) return;
    closing = true;
    server.close((error) => {
      process.exitCode = error ? 1 : 0;
    });
  });
}
