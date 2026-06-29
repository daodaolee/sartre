import { Inject, Injectable } from "@nestjs/common";
import type {
  ProviderModelHealthReportRequest,
  RegisterProviderModelProfileRequest,
  ResolveProviderModelSelectionRequest,
} from "@sartre/contracts";
import {
  PROVIDER_REGISTRY_REPOSITORY,
  type ProviderRegistryRepository,
} from "../ports/provider-registry.repository";

@Injectable()
export class ProviderRegistryApplicationService {
  constructor(
    @Inject(PROVIDER_REGISTRY_REPOSITORY)
    private readonly registry: ProviderRegistryRepository,
  ) {}

  registerProfile(input: RegisterProviderModelProfileRequest) {
    return this.registry.registerProfile(input);
  }

  reportHealth(input: ProviderModelHealthReportRequest) {
    return this.registry.reportHealth(input);
  }

  listProfiles(input: { tenantId: string; endpointId: string }) {
    return this.registry.listProfiles(input);
  }

  resolveSelection(input: ResolveProviderModelSelectionRequest) {
    return this.registry.resolveSelection(input);
  }
}
