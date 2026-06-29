import type {
  AppendConversationMessageRequest,
  ConnectAgentEndpointRequest,
  ContextProjection,
  ConversationDetailResponse,
  ConversationLedger,
  ConversationListResponse,
  ConversationMessage,
  CreateContextProjectionRequest,
  CreateConversationRequest,
  CreateHandoffRequest,
  CreateHandoffResponse,
  CreateSummaryCheckpointRequest,
  DeliveryCommandResponse,
  DeliveryLifecycleCommandRequest,
  EndpointHealthReportRequest,
  EndpointHealthReportResponse,
  HandoffEventReplayResponse,
  HandoffOverviewResponse,
  ModelRun,
  ProviderModelHealthReport,
  ProviderModelHealthReportRequest,
  ProviderModelProfile,
  ProviderModelRegistryListResponse,
  ProviderModelSelectionResponse,
  RecordModelRunRequest,
  RecordToolInvocationRequest,
  RegisterAgentEndpointRequest,
  RegisterAgentEndpointResponse,
  RegisterProviderModelProfileRequest,
  ResolveProviderModelSelectionRequest,
  RoleCapabilityCatalogResponse,
  SummaryCheckpoint,
  ToolInvocationRecord,
} from "@sartre/contracts";
import {
  contextProjectionSchema,
  conversationDetailResponseSchema,
  conversationLedgerSchema,
  conversationListResponseSchema,
  conversationMessageSchema,
  createHandoffResponseSchema,
  deliveryCommandResponseSchema,
  endpointHealthReportResponseSchema,
  handoffErrorResponseSchema,
  handoffEventReplayResponseSchema,
  handoffOverviewResponseSchema,
  modelRunSchema,
  providerModelHealthReportSchema,
  providerModelProfileSchema,
  providerModelRegistryListResponseSchema,
  providerModelSelectionResponseSchema,
  registerAgentEndpointResponseSchema,
  roleCapabilityCatalogResponseSchema,
  summaryCheckpointSchema,
  toolInvocationRecordSchema,
} from "@sartre/contracts";

export type HandoffHubClientOptions = {
  baseUrl: string;
  fetchImpl?: typeof fetch;
};

export class HandoffHubClient {
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: HandoffHubClientOptions) {
    this.fetchImpl =
      options.fetchImpl ?? ((input, init) => globalThis.fetch(input, init));
  }

  async createHandoff(
    request: CreateHandoffRequest,
  ): Promise<CreateHandoffResponse> {
    const response = await this.requestJson("/handoffs", {
      method: "POST",
      body: request,
    });
    return createHandoffResponseSchema.parse(response);
  }

  async registerAgentEndpoint(
    request: RegisterAgentEndpointRequest,
  ): Promise<RegisterAgentEndpointResponse> {
    const response = await this.requestJson("/agent-endpoints", {
      method: "POST",
      body: request,
    });
    return registerAgentEndpointResponseSchema.parse(response);
  }

  async connectAgentEndpoint(
    endpointId: string,
    request: ConnectAgentEndpointRequest,
  ): Promise<unknown> {
    return this.requestJson(`/agent-endpoints/${endpointId}/connect`, {
      method: "POST",
      body: request,
    });
  }

  async reportEndpointHealth(
    endpointId: string,
    request: EndpointHealthReportRequest,
  ): Promise<EndpointHealthReportResponse> {
    const response = await this.requestJson(
      `/agent-endpoints/${endpointId}/health`,
      {
        method: "POST",
        body: request,
      },
    );
    return endpointHealthReportResponseSchema.parse(response);
  }

  async getHandoff(handoffId: string): Promise<unknown> {
    return this.requestJson(`/handoffs/${handoffId}`, { method: "GET" });
  }

  async getOverview(tenantId = "local-demo"): Promise<HandoffOverviewResponse> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    const response = await this.requestJson(`/overview?${params.toString()}`, {
      method: "GET",
    });
    return handoffOverviewResponseSchema.parse(response);
  }

  async getRoleCapabilityCatalog(
    tenantId = "local-demo",
  ): Promise<RoleCapabilityCatalogResponse> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    const response = await this.requestJson(
      `/role-capabilities?${params.toString()}`,
      { method: "GET" },
    );
    return roleCapabilityCatalogResponseSchema.parse(response);
  }

  async createConversation(
    request: CreateConversationRequest,
  ): Promise<ConversationLedger> {
    const response = await this.requestJson("/conversations", {
      method: "POST",
      body: request,
    });
    return conversationLedgerSchema.parse(response);
  }

  async appendConversationMessage(
    conversationId: string,
    request: AppendConversationMessageRequest,
  ): Promise<ConversationMessage> {
    const response = await this.requestJson(
      `/conversations/${conversationId}/messages`,
      {
        method: "POST",
        body: request,
      },
    );
    return conversationMessageSchema.parse(response);
  }

  async recordToolInvocation(
    conversationId: string,
    request: RecordToolInvocationRequest,
  ): Promise<ToolInvocationRecord> {
    const response = await this.requestJson(
      `/conversations/${conversationId}/tool-invocations`,
      {
        method: "POST",
        body: request,
      },
    );
    return toolInvocationRecordSchema.parse(response);
  }

  async createSummaryCheckpoint(
    conversationId: string,
    request: CreateSummaryCheckpointRequest,
  ): Promise<SummaryCheckpoint> {
    const response = await this.requestJson(
      `/conversations/${conversationId}/summary-checkpoints`,
      {
        method: "POST",
        body: request,
      },
    );
    return summaryCheckpointSchema.parse(response);
  }

  async createContextProjection(
    conversationId: string,
    request: CreateContextProjectionRequest,
  ): Promise<ContextProjection> {
    const response = await this.requestJson(
      `/conversations/${conversationId}/context-projections`,
      {
        method: "POST",
        body: request,
      },
    );
    return contextProjectionSchema.parse(response);
  }

  async recordModelRun(
    conversationId: string,
    request: RecordModelRunRequest,
  ): Promise<ModelRun> {
    const response = await this.requestJson(
      `/conversations/${conversationId}/model-runs`,
      {
        method: "POST",
        body: request,
      },
    );
    return modelRunSchema.parse(response);
  }

  async getConversations(input: {
    tenantId: string;
    endpointId: string;
  }): Promise<ConversationListResponse> {
    const params = new URLSearchParams({
      tenant_id: input.tenantId,
      endpoint_id: input.endpointId,
    });
    const response = await this.requestJson(
      `/conversations?${params.toString()}`,
      { method: "GET" },
    );
    return conversationListResponseSchema.parse(response);
  }

  async getConversationDetail(
    conversationId: string,
    tenantId: string,
  ): Promise<ConversationDetailResponse> {
    const params = new URLSearchParams({ tenant_id: tenantId });
    const response = await this.requestJson(
      `/conversations/${conversationId}?${params.toString()}`,
      { method: "GET" },
    );
    return conversationDetailResponseSchema.parse(response);
  }

  async registerProviderModelProfile(
    request: RegisterProviderModelProfileRequest,
  ): Promise<ProviderModelProfile> {
    const response = await this.requestJson(
      "/provider-model-registry/profiles",
      {
        method: "POST",
        body: request,
      },
    );
    return providerModelProfileSchema.parse(response);
  }

  async reportProviderModelHealth(
    profileId: string,
    request: ProviderModelHealthReportRequest,
  ): Promise<ProviderModelHealthReport> {
    const response = await this.requestJson(
      `/provider-model-registry/profiles/${profileId}/health`,
      {
        method: "POST",
        body: request,
      },
    );
    return providerModelHealthReportSchema.parse(response);
  }

  async getProviderModelRegistry(input: {
    tenantId: string;
    endpointId: string;
  }): Promise<ProviderModelRegistryListResponse> {
    const params = new URLSearchParams({
      tenant_id: input.tenantId,
      endpoint_id: input.endpointId,
    });
    const response = await this.requestJson(
      `/provider-model-registry?${params.toString()}`,
      { method: "GET" },
    );
    return providerModelRegistryListResponseSchema.parse(response);
  }

  async resolveProviderModelSelection(
    request: ResolveProviderModelSelectionRequest,
  ): Promise<ProviderModelSelectionResponse> {
    const response = await this.requestJson(
      "/provider-model-registry/resolve",
      {
        method: "POST",
        body: request,
      },
    );
    return providerModelSelectionResponseSchema.parse(response);
  }

  async replayEvents(input: {
    tenantId: string;
    endpointId: string;
    afterCursor: number;
  }): Promise<HandoffEventReplayResponse> {
    const params = new URLSearchParams({
      tenant_id: input.tenantId,
      endpoint_id: input.endpointId,
      after_cursor: String(input.afterCursor),
    });
    const response = await this.requestJson(
      `/events/replay?${params.toString()}`,
      { method: "GET" },
    );
    return handoffEventReplayResponseSchema.parse(response);
  }

  async acknowledgeDelivery(
    deliveryId: string,
  ): Promise<DeliveryCommandResponse> {
    const response = await this.requestJson(`/deliveries/${deliveryId}/ack`, {
      method: "POST",
      body: { schema_version: "1.0" },
    });
    return deliveryCommandResponseSchema.parse(response);
  }

  async failDelivery(
    deliveryId: string,
    reason?: string,
  ): Promise<DeliveryCommandResponse> {
    const response = await this.requestJson(`/deliveries/${deliveryId}/fail`, {
      method: "POST",
      body: { schema_version: "1.0", ...(reason ? { reason } : {}) },
    });
    return deliveryCommandResponseSchema.parse(response);
  }

  async expireDelivery(
    deliveryId: string,
    reason?: string,
  ): Promise<DeliveryCommandResponse> {
    const response = await this.requestJson(
      `/deliveries/${deliveryId}/expire`,
      {
        method: "POST",
        body: { schema_version: "1.0", ...(reason ? { reason } : {}) },
      },
    );
    return deliveryCommandResponseSchema.parse(response);
  }

  async acceptDelivery(
    deliveryId: string,
    request: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryCommandResponse> {
    return this.deliveryLifecycleCommand(deliveryId, "accept", request);
  }

  async startDelivery(
    deliveryId: string,
    request: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryCommandResponse> {
    return this.deliveryLifecycleCommand(deliveryId, "start", request);
  }

  async markDeliveryReportReady(
    deliveryId: string,
    request: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryCommandResponse> {
    return this.deliveryLifecycleCommand(deliveryId, "report-ready", request);
  }

  async sendDeliveryResult(
    deliveryId: string,
    request: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryCommandResponse> {
    return this.deliveryLifecycleCommand(deliveryId, "send-result", request);
  }

  async closeDelivery(
    deliveryId: string,
    request: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryCommandResponse> {
    return this.deliveryLifecycleCommand(deliveryId, "close", request);
  }

  async addArtifact(
    handoffId: string,
    request: {
      schema_version: "1.0";
      artifact: {
        id: string;
        name: string;
        kind: string;
        storage_url: string;
        checksum: string;
      };
    },
  ): Promise<unknown> {
    return this.requestJson(`/handoffs/${handoffId}/artifacts`, {
      method: "POST",
      body: request,
    });
  }

  streamUrlForEndpoint(endpointId: string): URL {
    return new URL(
      `/events/stream/${encodeURIComponent(endpointId)}`,
      this.options.baseUrl,
    );
  }

  private async requestJson(
    path: string,
    options: { method: string; body?: unknown },
  ): Promise<unknown> {
    const init: RequestInit = { method: options.method };
    if (options.body !== undefined) {
      init.headers = { "content-type": "application/json" };
      init.body = JSON.stringify(options.body);
    }

    const response = await this.fetchImpl(
      new URL(path, this.options.baseUrl),
      init,
    );

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const parsed = handoffErrorResponseSchema.safeParse(errorBody);
      if (parsed.success) {
        throw new Error(
          `${parsed.data.error.category}: ${parsed.data.error.message}`,
        );
      }
      throw new Error(`Handoff Hub request failed: ${response.status}`);
    }

    return response.json();
  }

  private async deliveryLifecycleCommand(
    deliveryId: string,
    command: "accept" | "start" | "report-ready" | "send-result" | "close",
    request: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryCommandResponse> {
    const response = await this.requestJson(
      `/deliveries/${deliveryId}/${command}`,
      {
        method: "POST",
        body: request,
      },
    );
    return deliveryCommandResponseSchema.parse(response);
  }
}
