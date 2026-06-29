import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import type {
  ProviderModelHealthReportRequest,
  RegisterProviderModelProfileRequest,
  ResolveProviderModelSelectionRequest,
} from "@sartre/contracts";
import { ProviderRegistryApplicationService } from "../../application/provider-registry-application.service";

@Controller("provider-model-registry")
export class ProviderRegistryController {
  constructor(
    @Inject(ProviderRegistryApplicationService)
    private readonly registry: ProviderRegistryApplicationService,
  ) {}

  @Post("profiles")
  registerProfile(@Body() body: RegisterProviderModelProfileRequest) {
    return this.registry.registerProfile(body);
  }

  @Post("profiles/:profileId/health")
  reportHealth(
    @Param("profileId") profileId: string,
    @Body() body: ProviderModelHealthReportRequest,
  ) {
    return this.registry.reportHealth({ ...body, profile_id: profileId });
  }

  @Get()
  listProfiles(
    @Query("tenant_id") tenantId: string,
    @Query("endpoint_id") endpointId: string,
  ) {
    return this.registry.listProfiles({ tenantId, endpointId });
  }

  @Post("resolve")
  resolveSelection(@Body() body: ResolveProviderModelSelectionRequest) {
    return this.registry.resolveSelection(body);
  }
}
