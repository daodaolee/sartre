import { Inject, Injectable } from "@nestjs/common";
import type {
  CreateHandoffRequest,
  DeliveryLifecycleCommandRequest,
  EndpointHealthReportRequest,
} from "@sartre/contracts";
import type { Artifact } from "@sartre/domain";
import { EventStreamService } from "../infrastructure/sse/event-stream.service";
import {
  type ConnectAgentEndpointInput,
  HANDOFF_REPOSITORY,
  type HandoffRepository,
  type RegisterAgentEndpointInput,
  type ReplayDeliveryEventsInput,
} from "../ports/handoff.repository";

@Injectable()
export class HandoffApplicationService {
  constructor(
    @Inject(HANDOFF_REPOSITORY) private readonly handoffs: HandoffRepository,
    @Inject(EventStreamService) private readonly stream: EventStreamService,
  ) {}

  registerAgentEndpoint(input: RegisterAgentEndpointInput): Promise<void> {
    return this.handoffs.registerAgentEndpoint(input);
  }

  submitEndpointHealthReport(
    endpointId: string,
    input: EndpointHealthReportRequest,
  ) {
    return this.handoffs.submitEndpointHealthReport(endpointId, input);
  }

  async createHandoff(input: CreateHandoffRequest) {
    const result = await this.handoffs.createHandoff(input);
    if (result.delivery.status === "delivered") {
      this.stream.publish(result.delivery.recipientEndpointId, {
        type: "delivery.delivered",
        handoffId: result.delivery.handoffId,
        deliveryId: result.delivery.id,
        recipientEndpointId: result.delivery.recipientEndpointId,
        cursor: result.delivery.cursor,
      });
    }
    return result;
  }

  getHandoff(handoffId: string) {
    return this.handoffs.getHandoff(handoffId);
  }

  async connectAgentEndpoint(
    endpointId: string,
    input: ConnectAgentEndpointInput,
  ) {
    const result = await this.handoffs.connectAgentEndpoint(endpointId, input);
    for (const event of result.events) {
      this.stream.publish(endpointId, event);
    }
    return result;
  }

  acknowledgeDelivery(deliveryId: string) {
    return this.handoffs.acknowledgeDelivery(deliveryId);
  }

  failDelivery(
    deliveryId: string,
    input: { schema_version: "1.0"; reason?: string },
  ) {
    return this.handoffs.failDelivery(deliveryId, input);
  }

  expireDelivery(
    deliveryId: string,
    input: { schema_version: "1.0"; reason?: string },
  ) {
    return this.handoffs.expireDelivery(deliveryId, input);
  }

  acceptDelivery(deliveryId: string, input: DeliveryLifecycleCommandRequest) {
    return this.handoffs.acceptDelivery(deliveryId, input);
  }

  startDelivery(deliveryId: string, input: DeliveryLifecycleCommandRequest) {
    return this.handoffs.startDelivery(deliveryId, input);
  }

  markDeliveryReportReady(
    deliveryId: string,
    input: DeliveryLifecycleCommandRequest,
  ) {
    return this.handoffs.markDeliveryReportReady(deliveryId, input);
  }

  sendDeliveryResult(
    deliveryId: string,
    input: DeliveryLifecycleCommandRequest,
  ) {
    return this.handoffs.sendDeliveryResult(deliveryId, input);
  }

  closeDelivery(deliveryId: string, input: DeliveryLifecycleCommandRequest) {
    return this.handoffs.closeDelivery(deliveryId, input);
  }

  replayEvents(input: ReplayDeliveryEventsInput) {
    return this.handoffs.replayEvents(input);
  }

  addArtifact(handoffId: string, artifact: Artifact) {
    return this.handoffs.addArtifact(handoffId, artifact);
  }

  getOverview(tenantId = "local-demo") {
    return this.handoffs.getOverview(tenantId);
  }
}
