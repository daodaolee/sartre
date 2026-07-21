import { createServer } from "node:http";

const host = process.env.SARTRE_HOST;
const port = Number(process.env.SARTRE_PORT);
if (host !== "127.0.0.1" || !Number.isSafeInteger(port) || port <= 0) {
  throw new Error("never_healthy_fixture_config_invalid");
}

process.on("SIGTERM", () => {
  // The real fixture deliberately requires the Harness SIGKILL escalation path.
});

createServer((request, response) => {
  if (request.url === "/shutdown") {
    response.writeHead(204).end();
    setImmediate(() => process.exit(0));
    return;
  }
  response.writeHead(503, { "content-type": "application/json" });
  response.end(JSON.stringify({ status: "unavailable" }));
}).listen(port, host);
