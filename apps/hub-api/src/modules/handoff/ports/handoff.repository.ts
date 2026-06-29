import type {
  CreateHandoffRequest,
  DeliveryLifecycleCommandRequest,
  EndpointHealthReportRequest,
  EndpointHealthReportResponse,
  HandoffEventReplayResponse,
  HandoffOverviewResponse,
  RegisterAgentEndpointRequest,
} from "@sartre/contracts";
import type { Artifact } from "@sartre/domain";

export const HANDOFF_REPOSITORY = Symbol("HANDOFF_REPOSITORY");

export type RegisterAgentEndpointInput = RegisterAgentEndpointRequest;

export type ConnectAgentEndpointInput = {
  schema_version: "1.0";
  last_seen_cursor: number;
};

export type HandoffRecord = {
  id: string;
  schema_version: "1.0";
  tenant_id: string;
  from: {
    user_id: string;
    role: string;
    agent_endpoint_id: string;
  };
  to: {
    user_id: string;
    role: string;
    agent_endpoint_id: string;
  };
  title: string;
  summary: string;
  pack: {
    entry: string;
    artifacts: Artifact[];
  };
  status: string;
  created_at: string;
};

export type DeliveryRecord = {
  id: string;
  handoffId: string;
  recipientEndpointId: string;
  cursor: number;
  status: string;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
  failedAt: string | null;
  expiredAt: string | null;
};

export type DeliveryEventRecord = {
  type: string;
  handoffId: string;
  deliveryId: string;
  recipientEndpointId: string;
  cursor: number;
  reason?: string;
  actorEndpointId?: string;
  fromStatus?: string;
  toStatus?: string;
  artifactIds?: string[];
};

export type ReplayDeliveryEventsInput = {
  tenantId: string;
  endpointId: string;
  afterCursor: number;
};

export interface HandoffRepository {
  registerAgentEndpoint(input: RegisterAgentEndpointInput): Promise<void>;
  submitEndpointHealthReport(
    endpointId: string,
    input: EndpointHealthReportRequest,
  ): Promise<EndpointHealthReportResponse>;
  createHandoff(
    input: CreateHandoffRequest,
  ): Promise<{ handoff: HandoffRecord; delivery: DeliveryRecord }>;
  getHandoff(handoffId: string): Promise<HandoffRecord | null>;
  connectAgentEndpoint(
    endpointId: string,
    input: ConnectAgentEndpointInput,
  ): Promise<{
    delivery: DeliveryRecord | null;
    events: DeliveryEventRecord[];
  }>;
  acknowledgeDelivery(deliveryId: string): Promise<DeliveryRecord>;
  failDelivery(
    deliveryId: string,
    input: { schema_version: "1.0"; reason?: string },
  ): Promise<DeliveryRecord>;
  expireDelivery(
    deliveryId: string,
    input: { schema_version: "1.0"; reason?: string },
  ): Promise<DeliveryRecord>;
  acceptDelivery(
    deliveryId: string,
    input: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryRecord>;
  startDelivery(
    deliveryId: string,
    input: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryRecord>;
  markDeliveryReportReady(
    deliveryId: string,
    input: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryRecord>;
  sendDeliveryResult(
    deliveryId: string,
    input: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryRecord>;
  closeDelivery(
    deliveryId: string,
    input: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryRecord>;
  replayEvents(
    input: ReplayDeliveryEventsInput,
  ): Promise<HandoffEventReplayResponse>;
  addArtifact(handoffId: string, artifact: Artifact): Promise<Artifact[]>;
  getOverview(tenantId: string): Promise<HandoffOverviewResponse>;
}
