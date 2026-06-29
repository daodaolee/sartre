import { Controller, Get, Inject, Query } from "@nestjs/common";
import { HandoffApplicationService } from "../../application/handoff-application.service";

@Controller("overview")
export class OverviewController {
  constructor(
    @Inject(HandoffApplicationService)
    private readonly handoffs: HandoffApplicationService,
  ) {}

  @Get()
  get(@Query("tenant_id") tenantId = "local-demo") {
    return this.handoffs.getOverview(tenantId);
  }
}
