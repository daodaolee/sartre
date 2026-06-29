import { Module } from "@nestjs/common";
import { RoleCapabilitiesApplicationService } from "./application/role-capabilities-application.service";
import { RoleCapabilitiesController } from "./interfaces/http/role-capabilities.controller";

@Module({
  controllers: [RoleCapabilitiesController],
  providers: [RoleCapabilitiesApplicationService],
})
export class RoleCapabilitiesModule {}
