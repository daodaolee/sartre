import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Query,
  Sse,
} from "@nestjs/common";
import type { Observable } from "rxjs";
import { HandoffApplicationService } from "../../application/handoff-application.service";
import {
  EventStreamService,
  type HandoffStreamMessage,
} from "../../infrastructure/sse/event-stream.service";

@Controller("events")
export class HandoffEventsController {
  constructor(
    @Inject(EventStreamService) private readonly events: EventStreamService,
    @Inject(HandoffApplicationService)
    private readonly handoffs: HandoffApplicationService,
  ) {}

  @Get("replay")
  replay(
    @Query("tenant_id") tenantId: string | undefined,
    @Query("endpoint_id") endpointId: string | undefined,
    @Query("after_cursor") afterCursorRaw = "0",
  ) {
    if (!tenantId || !endpointId) {
      throw new BadRequestException("tenant_id and endpoint_id are required");
    }

    const afterCursor = Number(afterCursorRaw);
    if (!Number.isInteger(afterCursor) || afterCursor < 0) {
      throw new BadRequestException(
        "after_cursor must be a nonnegative integer",
      );
    }

    return this.handoffs.replayEvents({
      tenantId,
      endpointId,
      afterCursor,
    });
  }

  @Sse("stream/:endpointId")
  stream(
    @Param("endpointId") endpointId: string,
  ): Observable<HandoffStreamMessage> {
    return this.events.streamForEndpoint(endpointId);
  }
}
