import { Module } from "@nestjs/common";
import { ConversationModule } from "./modules/conversation/conversation.module";
import { HandoffModule } from "./modules/handoff/handoff.module";
import { ProviderRegistryModule } from "./modules/provider-registry/provider-registry.module";
import { RoleCapabilitiesModule } from "./modules/role-capabilities/role-capabilities.module";

@Module({
  imports: [
    HandoffModule,
    ConversationModule,
    ProviderRegistryModule,
    RoleCapabilitiesModule,
  ],
})
export class AppModule {}
