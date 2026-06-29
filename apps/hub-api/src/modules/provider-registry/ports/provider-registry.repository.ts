import type {
  ProviderModelHealthReport,
  ProviderModelHealthReportRequest,
  ProviderModelProfile,
  ProviderModelRegistryListResponse,
  ProviderModelSelectionResponse,
  RegisterProviderModelProfileRequest,
  ResolveProviderModelSelectionRequest,
} from "@sartre/contracts";

export const PROVIDER_REGISTRY_REPOSITORY = Symbol(
  "PROVIDER_REGISTRY_REPOSITORY",
);

export type ProviderRegistryRepository = {
  registerProfile(
    input: RegisterProviderModelProfileRequest,
  ): Promise<ProviderModelProfile>;
  reportHealth(
    input: ProviderModelHealthReportRequest,
  ): Promise<ProviderModelHealthReport>;
  listProfiles(input: {
    tenantId: string;
    endpointId: string;
  }): Promise<ProviderModelRegistryListResponse>;
  resolveSelection(
    input: ResolveProviderModelSelectionRequest,
  ): Promise<ProviderModelSelectionResponse>;
};
