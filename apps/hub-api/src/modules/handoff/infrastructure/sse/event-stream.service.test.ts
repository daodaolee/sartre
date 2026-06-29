import { firstValueFrom, take } from "rxjs";
import { describe, expect, it } from "vitest";
import { EventStreamService } from "./event-stream.service";

describe("EventStreamService", () => {
  it("pushes delivery events to subscribers of the recipient endpoint", async () => {
    const stream = new EventStreamService();
    const message = firstValueFrom(
      stream.streamForEndpoint("qa_codex_local").pipe(take(1)),
    );

    stream.publish("qa_codex_local", {
      type: "delivery.redelivered",
      handoffId: "handoff_1",
      deliveryId: "delivery_1",
      recipientEndpointId: "qa_codex_local",
      cursor: 1,
    });

    await expect(message).resolves.toEqual({
      type: "delivery.redelivered",
      data: {
        type: "delivery.redelivered",
        handoffId: "handoff_1",
        deliveryId: "delivery_1",
        recipientEndpointId: "qa_codex_local",
        cursor: 1,
      },
    });
  });
});
