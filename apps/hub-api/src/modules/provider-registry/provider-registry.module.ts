import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { ProviderRegistryApplicationService } from "./application/provider-registry-application.service";
import { PostgresProviderRegistryRepository } from "./infrastructure/postgres/postgres-provider-registry.repository";
import { ProviderRegistryController } from "./interfaces/http/provider-registry.controller";
import { PROVIDER_REGISTRY_REPOSITORY } from "./ports/provider-registry.repository";

@Module({
  imports: [DatabaseModule],
  controllers: [ProviderRegistryController],
  providers: [
    ProviderRegistryApplicationService,
    {
      provide: PROVIDER_REGISTRY_REPOSITORY,
      useClass: PostgresProviderRegistryRepository,
    },
  ],
})
export class ProviderRegistryModule {}
