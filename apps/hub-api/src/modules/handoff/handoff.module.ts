import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { HandoffApplicationService } from "./application/handoff-application.service";
import { PostgresHandoffRepository } from "./infrastructure/postgres/postgres-handoff.repository";
import { EventStreamService } from "./infrastructure/sse/event-stream.service";
import { AgentEndpointsController } from "./interfaces/http/agent-endpoints.controller";
import { DeliveriesController } from "./interfaces/http/deliveries.controller";
import { HandoffsController } from "./interfaces/http/handoffs.controller";
import { OverviewController } from "./interfaces/http/overview.controller";
import { HandoffEventsController } from "./interfaces/stream/handoff-events.controller";
import { HANDOFF_REPOSITORY } from "./ports/handoff.repository";

@Module({
  imports: [DatabaseModule],
  controllers: [
    AgentEndpointsController,
    DeliveriesController,
    HandoffEventsController,
    HandoffsController,
    OverviewController,
  ],
  providers: [
    EventStreamService,
    HandoffApplicationService,
    {
      provide: HANDOFF_REPOSITORY,
      useClass: PostgresHandoffRepository,
    },
  ],
})
export class HandoffModule {}
