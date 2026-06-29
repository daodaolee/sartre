import { IllegalTransitionError } from "./errors";

export type DeliveryStatus =
  | "pending_delivery"
  | "delivered"
  | "acknowledged"
  | "accepted"
  | "running"
  | "report_ready"
  | "closed"
  | "failed"
  | "expired";

export type DeliveryCreatedInput = {
  id: string;
  handoffId: string;
  recipientEndpointId: string;
  recipientOnline: boolean;
  cursor: number;
  now?: Date;
};

export type DeliveryRestoredInput = {
  id: string;
  handoffId: string;
  recipientEndpointId: string;
  cursor: number;
  status: DeliveryStatus;
  deliveredAt: Date | null;
  acknowledgedAt: Date | null;
  failedAt: Date | null;
  expiredAt: Date | null;
};

export type DeliveryRedeliveredEvent = {
  type: "delivery.redelivered";
  handoffId: string;
  deliveryId: string;
  recipientEndpointId: string;
  cursor: number;
};

export type DeliveryFailedEvent = {
  type: "delivery.failed";
  handoffId: string;
  deliveryId: string;
  recipientEndpointId: string;
  cursor: number;
  reason?: string;
};

export type DeliveryExpiredEvent = {
  type: "delivery.expired";
  handoffId: string;
  deliveryId: string;
  recipientEndpointId: string;
  cursor: number;
  reason?: string;
};

export type DeliveryLifecycleCommandInput = {
  now: Date;
  actorEndpointId: string;
  reason?: string;
  artifactIds?: string[];
};

export type DeliveryLifecycleTransitionEvent = {
  type:
    | "delivery.accepted"
    | "delivery.running"
    | "delivery.report_ready"
    | "delivery.result_sent"
    | "delivery.closed";
  handoffId: string;
  deliveryId: string;
  recipientEndpointId: string;
  cursor: number;
  actorEndpointId: string;
  fromStatus: DeliveryStatus;
  toStatus: DeliveryStatus;
  reason?: string;
  artifactIds?: string[];
};

export class Delivery {
  private constructor(
    readonly id: string,
    readonly handoffId: string,
    readonly recipientEndpointId: string,
    readonly cursor: number,
    readonly status: DeliveryStatus,
    readonly deliveredAt: Date | null,
    readonly acknowledgedAt: Date | null,
    readonly failedAt: Date | null,
    readonly expiredAt: Date | null,
  ) {}

  static create(input: DeliveryCreatedInput): Delivery {
    return new Delivery(
      input.id,
      input.handoffId,
      input.recipientEndpointId,
      input.cursor,
      input.recipientOnline ? "delivered" : "pending_delivery",
      input.recipientOnline ? (input.now ?? new Date()) : null,
      null,
      null,
      null,
    );
  }

  static restore(input: DeliveryRestoredInput): Delivery {
    return new Delivery(
      input.id,
      input.handoffId,
      input.recipientEndpointId,
      input.cursor,
      input.status,
      input.deliveredAt,
      input.acknowledgedAt,
      input.failedAt,
      input.expiredAt,
    );
  }

  redeliver(input: { lastSeenCursor: number; now: Date }): {
    delivery: Delivery;
    events: DeliveryRedeliveredEvent[];
  } {
    if (this.status !== "pending_delivery") {
      return { delivery: this, events: [] };
    }

    if (input.lastSeenCursor >= this.cursor) {
      return { delivery: this, events: [] };
    }

    const delivery = new Delivery(
      this.id,
      this.handoffId,
      this.recipientEndpointId,
      this.cursor,
      "delivered",
      input.now,
      this.acknowledgedAt,
      this.failedAt,
      this.expiredAt,
    );

    return {
      delivery,
      events: [
        {
          type: "delivery.redelivered",
          handoffId: this.handoffId,
          deliveryId: this.id,
          recipientEndpointId: this.recipientEndpointId,
          cursor: this.cursor,
        },
      ],
    };
  }

  acknowledge(input: { now: Date }): Delivery {
    if (this.status !== "delivered") {
      throw new IllegalTransitionError(
        `Illegal transition from ${this.status} to acknowledged`,
      );
    }

    return new Delivery(
      this.id,
      this.handoffId,
      this.recipientEndpointId,
      this.cursor,
      "acknowledged",
      this.deliveredAt,
      input.now,
      this.failedAt,
      this.expiredAt,
    );
  }

  accept(input: DeliveryLifecycleCommandInput): {
    delivery: Delivery;
    events: DeliveryLifecycleTransitionEvent[];
  } {
    return this.transitionLifecycle({
      input,
      allowedFrom: ["acknowledged", "report_ready"],
      toStatus: "accepted",
      eventType: "delivery.accepted",
    });
  }

  start(input: DeliveryLifecycleCommandInput): {
    delivery: Delivery;
    events: DeliveryLifecycleTransitionEvent[];
  } {
    return this.transitionLifecycle({
      input,
      allowedFrom: ["accepted"],
      toStatus: "running",
      eventType: "delivery.running",
    });
  }

  markReportReady(input: DeliveryLifecycleCommandInput): {
    delivery: Delivery;
    events: DeliveryLifecycleTransitionEvent[];
  } {
    return this.transitionLifecycle({
      input,
      allowedFrom: ["accepted", "running"],
      toStatus: "report_ready",
      eventType: "delivery.report_ready",
    });
  }

  close(input: DeliveryLifecycleCommandInput): {
    delivery: Delivery;
    events: DeliveryLifecycleTransitionEvent[];
  } {
    return this.transitionLifecycle({
      input,
      allowedFrom: ["report_ready"],
      toStatus: "closed",
      eventType: "delivery.closed",
    });
  }

  sendResult(input: DeliveryLifecycleCommandInput): {
    delivery: Delivery;
    events: DeliveryLifecycleTransitionEvent[];
  } {
    return this.transitionLifecycle({
      input,
      allowedFrom: ["report_ready"],
      toStatus: "report_ready",
      eventType: "delivery.result_sent",
    });
  }

  fail(input: { now: Date; reason?: string }): {
    delivery: Delivery;
    events: DeliveryFailedEvent[];
  } {
    if (!this.canEnterTerminalState()) {
      throw new IllegalTransitionError(
        `Illegal transition from ${this.status} to failed`,
      );
    }

    const delivery = new Delivery(
      this.id,
      this.handoffId,
      this.recipientEndpointId,
      this.cursor,
      "failed",
      this.deliveredAt,
      this.acknowledgedAt,
      input.now,
      this.expiredAt,
    );

    return {
      delivery,
      events: [
        {
          type: "delivery.failed",
          handoffId: this.handoffId,
          deliveryId: this.id,
          recipientEndpointId: this.recipientEndpointId,
          cursor: this.cursor,
          ...(input.reason ? { reason: input.reason } : {}),
        },
      ],
    };
  }

  expire(input: { now: Date; reason?: string }): {
    delivery: Delivery;
    events: DeliveryExpiredEvent[];
  } {
    if (!this.canEnterTerminalState()) {
      throw new IllegalTransitionError(
        `Illegal transition from ${this.status} to expired`,
      );
    }

    const delivery = new Delivery(
      this.id,
      this.handoffId,
      this.recipientEndpointId,
      this.cursor,
      "expired",
      this.deliveredAt,
      this.acknowledgedAt,
      this.failedAt,
      input.now,
    );

    return {
      delivery,
      events: [
        {
          type: "delivery.expired",
          handoffId: this.handoffId,
          deliveryId: this.id,
          recipientEndpointId: this.recipientEndpointId,
          cursor: this.cursor,
          ...(input.reason ? { reason: input.reason } : {}),
        },
      ],
    };
  }

  private canEnterTerminalState() {
    return !["failed", "expired", "closed"].includes(this.status);
  }

  private transitionLifecycle(input: {
    input: DeliveryLifecycleCommandInput;
    allowedFrom: DeliveryStatus[];
    toStatus: DeliveryStatus;
    eventType: DeliveryLifecycleTransitionEvent["type"];
  }): { delivery: Delivery; events: DeliveryLifecycleTransitionEvent[] } {
    if (!input.allowedFrom.includes(this.status)) {
      throw new IllegalTransitionError(
        `Illegal transition from ${this.status} to ${input.toStatus}`,
      );
    }

    const delivery = new Delivery(
      this.id,
      this.handoffId,
      this.recipientEndpointId,
      this.cursor,
      input.toStatus,
      this.deliveredAt,
      this.acknowledgedAt,
      this.failedAt,
      this.expiredAt,
    );

    return {
      delivery,
      events: [
        {
          type: input.eventType,
          handoffId: this.handoffId,
          deliveryId: this.id,
          recipientEndpointId: this.recipientEndpointId,
          cursor: this.cursor,
          actorEndpointId: input.input.actorEndpointId,
          fromStatus: this.status,
          toStatus: input.toStatus,
          ...(input.input.reason ? { reason: input.input.reason } : {}),
          ...(input.input.artifactIds
            ? { artifactIds: input.input.artifactIds }
            : {}),
        },
      ],
    };
  }
}
