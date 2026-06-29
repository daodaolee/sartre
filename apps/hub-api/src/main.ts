import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { HandoffHttpExceptionFilter } from "./modules/handoff/interfaces/http/handoff-http-exception.filter";

const port = Number(process.env.PORT ?? 3000);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new HandoffHttpExceptionFilter());
  app.enableCors({
    origin: [/^http:\/\/localhost:\d+$/],
    methods: ["GET", "POST"],
    allowedHeaders: ["content-type"],
  });
  await app.listen(port);
}

void bootstrap();
