import "reflect-metadata";

import { readHubHealthConfig } from "./health/config.js";
import { createHubApplication, RedactedNotFoundFilter } from "./hub-application.js";
import { createHumanAuthRuntime } from "./identity/human-auth-runtime.js";

async function bootstrap(): Promise<void> {
  const config = readHubHealthConfig(process.env);
  const humanAuth = await createHumanAuthRuntime(process.env);
  const application = await createHubApplication(config, humanAuth);
  application.useGlobalFilters(new RedactedNotFoundFilter());
  application.enableShutdownHooks(["SIGINT", "SIGTERM"]);
  await application.listen(config.port, config.host);
}

await bootstrap();
