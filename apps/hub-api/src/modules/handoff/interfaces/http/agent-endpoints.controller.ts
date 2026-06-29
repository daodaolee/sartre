import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Param,
  Post,
} from "@nestjs/common";
import { endpointHealthReportRequestSchema } from "@sartre/contracts";
import { HandoffApplicationService } from "../../application/handoff-application.service";

@Controller("agent-endpoints")
export class AgentEndpointsController {
  constructor(
    @Inject(HandoffApplicationService)
    private readonly handoffs: HandoffApplicationService,
  ) {}

  @Post()
  async register(
    @Body() body: Parameters<
      HandoffApplicationService["registerAgentEndpoint"]
    >[0],
  ) {
    await this.handoffs.registerAgentEndpoint(body);
    return { ok: true };
  }

  @Post(":endpointId/connect")
  @HttpCode(200)
  connect(
    @Param("endpointId") endpointId: string,
    @Body() body: { schema_version: "1.0"; last_seen_cursor: number },
  ) {
    return this.handoffs.connectAgentEndpoint(endpointId, body);
  }

  @Post(":endpointId/health")
  health(@Param("endpointId") endpointId: string, @Body() body: unknown) {
    const request = endpointHealthReportRequestSchema.parse(body);
    return this.handoffs.submitEndpointHealthReport(endpointId, request);
  }
}
