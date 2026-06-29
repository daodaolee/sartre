import { Controller, Get, Inject, Query } from "@nestjs/common";
import { RoleCapabilitiesApplicationService } from "../../application/role-capabilities-application.service";

@Controller("role-capabilities")
export class RoleCapabilitiesController {
  constructor(
    @Inject(RoleCapabilitiesApplicationService)
    private readonly capabilities: RoleCapabilitiesApplicationService,
  ) {}

  @Get()
  getCatalog(@Query("tenant_id") tenantId = "local-demo") {
    return this.capabilities.getCatalog(tenantId);
  }
}
