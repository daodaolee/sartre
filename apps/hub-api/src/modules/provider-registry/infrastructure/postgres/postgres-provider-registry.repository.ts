import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  type ProviderModelCapability,
  type ProviderModelHealthReport,
  type ProviderModelHealthReportRequest,
  type ProviderModelProfile,
  type ProviderModelProfileStatus,
  type ProviderModelRegistryListResponse,
  type ProviderModelSelectionResponse,
  providerModelHealthReportRequestSchema,
  providerModelHealthReportSchema,
  providerModelProfileSchema,
  providerModelRegistryListResponseSchema,
  providerModelSelectionResponseSchema,
  type RegisterProviderModelProfileRequest,
  type ResolveProviderModelSelectionRequest,
  registerProviderModelProfileRequestSchema,
  resolveProviderModelSelectionRequestSchema,
} from "@sartre/contracts";
import { DatabaseService } from "../../../database/database.service";
import type { ProviderRegistryRepository } from "../../ports/provider-registry.repository";

type ProviderModelProfileRow = {
  id: string;
  schema_version: "1.0";
  tenant_id: string;
  agent_endpoint_id: string;
  provider: string;
  model: string;
  label: string;
  executor: ProviderModelProfile["executor"];
  capabilities: ProviderModelCapability[];
  context_window: number | null;
  max_output_tokens: number | null;
  default_for_endpoint: boolean;
  status: ProviderModelProfileStatus;
  metadata: Record<string, string> | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ProviderModelHealthReportRow = {
  id: string;
  schema_version: "1.0";
  tenant_id: string;
  profile_id: string;
  status: ProviderModelHealthReport["status"];
  checks: ProviderModelHealthReport["checks"];
  metadata: Record<string, string> | null;
  reported_at: Date | string;
};

@Injectable()
export class PostgresProviderRegistryRepository
  implements ProviderRegistryRepository
{
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async registerProfile(
    input: RegisterProviderModelProfileRequest,
  ): Promise<ProviderModelProfile> {
    const request = registerProviderModelProfileRequestSchema.parse(input);
    const client = await this.database.pool.connect();
    const now = new Date().toISOString();

    try {
      await client.query("begin");
      if (request.default_for_endpoint) {
        await client.query(
          `
            update provider_model_profiles
            set default_for_endpoint = false,
                updated_at = $3
            where tenant_id = $1
              and agent_endpoint_id = $2
          `,
          [request.tenant_id, request.agent_endpoint_id, now],
        );
      }

      const row = await client.query<ProviderModelProfileRow>(
        `
          insert into provider_model_profiles (
            id,
            schema_version,
            tenant_id,
            agent_endpoint_id,
            provider,
            model,
            label,
            executor,
            capabilities,
            context_window,
            max_output_tokens,
            default_for_endpoint,
            status,
            metadata,
            created_at,
            updated_at
          )
          values ($1, '1.0', $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13::jsonb, $14, $14)
          on conflict (tenant_id, agent_endpoint_id, provider, model, (executor->>'kind'))
          do update set
            label = excluded.label,
            executor = excluded.executor,
            capabilities = excluded.capabilities,
            context_window = excluded.context_window,
            max_output_tokens = excluded.max_output_tokens,
            default_for_endpoint = excluded.default_for_endpoint,
            status = excluded.status,
            metadata = excluded.metadata,
            updated_at = excluded.updated_at
          returning *
        `,
        [
          providerModelProfileId(),
          request.tenant_id,
          request.agent_endpoint_id,
          request.provider,
          request.model,
          request.label,
          optionalJson(request.executor),
          request.capabilities ?? [],
          request.context_window ?? null,
          request.max_output_tokens ?? null,
          request.default_for_endpoint ?? false,
          request.status ?? "available",
          optionalJson(request.metadata),
          now,
        ],
      );
      await client.query("commit");

      return toProviderModelProfile(
        expectReturnedRow(row.rows, "Provider model profile"),
      );
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async reportHealth(
    input: ProviderModelHealthReportRequest,
  ): Promise<ProviderModelHealthReport> {
    const request = providerModelHealthReportRequestSchema.parse(input);
    await this.assertProfileTenant({
      tenantId: request.tenant_id,
      profileId: request.profile_id,
    });
    const row = await this.database.pool.query<ProviderModelHealthReportRow>(
      `
        insert into provider_model_health_reports (
          id,
          schema_version,
          tenant_id,
          profile_id,
          status,
          checks,
          metadata,
          reported_at
        )
        values ($1, '1.0', $2, $3, $4, $5::jsonb, $6::jsonb, $7)
        returning *
      `,
      [
        providerModelHealthReportId(),
        request.tenant_id,
        request.profile_id,
        request.status,
        optionalJson(request.checks),
        optionalJson(request.metadata),
        new Date().toISOString(),
      ],
    );

    return toProviderModelHealthReport(
      expectReturnedRow(row.rows, "Provider model health report"),
    );
  }

  async listProfiles(input: {
    tenantId: string;
    endpointId: string;
  }): Promise<ProviderModelRegistryListResponse> {
    const profiles = await this.database.pool.query<ProviderModelProfileRow>(
      `
        select *
        from provider_model_profiles
        where tenant_id = $1
          and agent_endpoint_id = $2
        order by default_for_endpoint desc, updated_at desc, created_at desc
      `,
      [input.tenantId, input.endpointId],
    );
    const profileItems = await Promise.all(
      profiles.rows.map(async (profile) => {
        const latestHealth =
          await this.database.pool.query<ProviderModelHealthReportRow>(
            `
              select *
              from provider_model_health_reports
              where profile_id = $1
              order by reported_at desc, id desc
              limit 1
            `,
            [profile.id],
          );
        return toProviderModelProfile(profile, latestHealth.rows[0]);
      }),
    );
    const defaultProfile =
      profileItems.find((profile) => profile.default_for_endpoint) ?? null;

    return providerModelRegistryListResponseSchema.parse({
      schema_version: "1.0",
      tenant_id: input.tenantId,
      endpoint_id: input.endpointId,
      default_profile_id: defaultProfile?.id ?? null,
      profiles: profileItems,
    });
  }

  async resolveSelection(
    input: ResolveProviderModelSelectionRequest,
  ): Promise<ProviderModelSelectionResponse> {
    const request = resolveProviderModelSelectionRequestSchema.parse(input);
    const list = await this.listProfiles({
      tenantId: request.tenant_id,
      endpointId: request.endpoint_id,
    });
    const requiredCapabilities = request.required_capabilities ?? [];
    const compatibleProfiles = list.profiles.filter((profile) =>
      isCompatibleProfile(profile, {
        requiredCapabilities,
        minContextWindow: request.min_context_window,
      }),
    );
    const preferredProfile = compatibleProfiles.find(
      (profile) =>
        matchesOptional(profile.provider, request.preferred_provider) &&
        matchesOptional(profile.model, request.preferred_model),
    );

    if (request.preferred_provider || request.preferred_model) {
      if (!preferredProfile) {
        throw unavailable("Provider model selection is unavailable");
      }
      return providerModelSelectionResponseSchema.parse({
        schema_version: "1.0",
        tenant_id: request.tenant_id,
        endpoint_id: request.endpoint_id,
        selected_profile_id: preferredProfile.id,
        selected_profile: preferredProfile,
        required_capabilities: requiredCapabilities,
        selection_reason: "preferred_profile_matched",
      });
    }

    const selectedProfile =
      compatibleProfiles.find((profile) => profile.default_for_endpoint) ??
      compatibleProfiles[0];
    if (!selectedProfile) {
      throw unavailable("Provider model selection is unavailable");
    }

    return providerModelSelectionResponseSchema.parse({
      schema_version: "1.0",
      tenant_id: request.tenant_id,
      endpoint_id: request.endpoint_id,
      selected_profile_id: selectedProfile.id,
      selected_profile: selectedProfile,
      required_capabilities: requiredCapabilities,
      selection_reason: selectedProfile.default_for_endpoint
        ? "default_profile_matched"
        : "first_compatible_profile_matched",
    });
  }

  private async assertProfileTenant(input: {
    tenantId: string;
    profileId: string;
  }) {
    const row = await this.database.pool.query<{ tenant_id: string }>(
      "select tenant_id from provider_model_profiles where id = $1 limit 1",
      [input.profileId],
    );
    const profile = row.rows[0];
    if (!profile) {
      throw unavailable(
        `Provider model profile ${input.profileId} is unavailable`,
      );
    }
    if (profile.tenant_id !== input.tenantId) {
      const error = new Error(
        `Provider model profile ${input.profileId} does not belong to tenant ${input.tenantId}`,
      ) as Error & { category: "InvalidInput" };
      error.category = "InvalidInput";
      throw error;
    }
  }
}

function isCompatibleProfile(
  profile: ProviderModelProfile,
  input: {
    requiredCapabilities: ProviderModelCapability[];
    minContextWindow?: number;
  },
) {
  if (profile.status !== "available") {
    return false;
  }
  if (profile.latest_health?.status === "blocked") {
    return false;
  }
  if (
    input.minContextWindow !== undefined &&
    (profile.context_window ?? 0) < input.minContextWindow
  ) {
    return false;
  }
  return input.requiredCapabilities.every((capability) =>
    profile.capabilities.includes(capability),
  );
}

function matchesOptional(value: string, expected: string | undefined) {
  return expected === undefined || value === expected;
}

function toProviderModelProfile(
  row: ProviderModelProfileRow,
  latestHealth?: ProviderModelHealthReportRow,
): ProviderModelProfile {
  return providerModelProfileSchema.parse({
    id: row.id,
    schema_version: row.schema_version,
    tenant_id: row.tenant_id,
    agent_endpoint_id: row.agent_endpoint_id,
    provider: row.provider,
    model: row.model,
    label: row.label,
    executor: row.executor,
    capabilities: row.capabilities,
    ...(row.context_window
      ? { context_window: Number(row.context_window) }
      : {}),
    ...(row.max_output_tokens
      ? { max_output_tokens: Number(row.max_output_tokens) }
      : {}),
    default_for_endpoint: row.default_for_endpoint,
    status: row.status,
    ...(latestHealth
      ? { latest_health: toProviderModelHealthReport(latestHealth) }
      : {}),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    ...(row.metadata ? { metadata: row.metadata } : {}),
  });
}

function toProviderModelHealthReport(
  row: ProviderModelHealthReportRow,
): ProviderModelHealthReport {
  return providerModelHealthReportSchema.parse({
    id: row.id,
    schema_version: row.schema_version,
    tenant_id: row.tenant_id,
    profile_id: row.profile_id,
    status: row.status,
    checks: row.checks,
    reported_at: toIso(row.reported_at),
    ...(row.metadata ? { metadata: row.metadata } : {}),
  });
}

function optionalJson(value: unknown) {
  return value === undefined ? null : JSON.stringify(value);
}

function expectReturnedRow<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) {
    throw unavailable(`${label} is unavailable`);
  }
  return row;
}

function providerModelProfileId() {
  return `provider_profile_${randomUUID()}`;
}

function providerModelHealthReportId() {
  return `provider_health_${randomUUID()}`;
}

function toIso(value: Date | string) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function unavailable(message: string) {
  return new Error(message);
}
