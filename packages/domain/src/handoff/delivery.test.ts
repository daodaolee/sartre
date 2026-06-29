import { describe, expect, it } from "vitest";
import { Delivery } from "./delivery";

describe("Delivery", () => {
  it("keeps a handoff pending when the target endpoint is offline", () => {
    const delivery = Delivery.create({
      id: "delivery_1",
      handoffId: "handoff_1",
      recipientEndpointId: "qa_codex_local",
      recipientOnline: false,
      cursor: 1,
    });

    expect(delivery.status).toBe("pending_delivery");
    expect(delivery.deliveredAt).toBeNull();
  });

  it("redelivers a pending handoff when the endpoint reconnects behind the cursor", () => {
    const delivery = Delivery.create({
      id: "delivery_1",
      handoffId: "handoff_1",
      recipientEndpointId: "qa_codex_local",
      recipientOnline: false,
      cursor: 9,
    });

    const result = delivery.redeliver({
      lastSeenCursor: 3,
      now: new Date("2026-06-22T10:00:00.000Z"),
    });

    expect(result.delivery.status).toBe("delivered");
    expect(result.delivery.deliveredAt?.toISOString()).toBe(
      "2026-06-22T10:00:00.000Z",
    );
    expect(result.events).toEqual([
      {
        type: "delivery.redelivered",
        handoffId: "handoff_1",
        deliveryId: "delivery_1",
        recipientEndpointId: "qa_codex_local",
        cursor: 9,
      },
    ]);
  });

  it("rejects acknowledging a delivery before it is delivered", () => {
    const delivery = Delivery.create({
      id: "delivery_1",
      handoffId: "handoff_1",
      recipientEndpointId: "qa_codex_local",
      recipientOnline: false,
      cursor: 1,
    });

    expect(() =>
      delivery.acknowledge({ now: new Date("2026-06-22T10:00:00.000Z") }),
    ).toThrow(/illegal transition/i);
  });

  it("marks a pending delivery as failed with an audit event", () => {
    const delivery = Delivery.create({
      id: "delivery_1",
      handoffId: "handoff_1",
      recipientEndpointId: "qa_codex_local",
      recipientOnline: false,
      cursor: 1,
    });

    const result = delivery.fail({
      now: new Date("2026-06-22T10:05:00.000Z"),
      reason: "qa endpoint unreachable",
    });

    expect(result.delivery.status).toBe("failed");
    expect(result.delivery.failedAt?.toISOString()).toBe(
      "2026-06-22T10:05:00.000Z",
    );
    expect(result.events).toEqual([
      {
        type: "delivery.failed",
        handoffId: "handoff_1",
        deliveryId: "delivery_1",
        recipientEndpointId: "qa_codex_local",
        cursor: 1,
        reason: "qa endpoint unreachable",
      },
    ]);
  });

  it("marks a delivered delivery as expired and rejects later acknowledgement", () => {
    const delivery = Delivery.create({
      id: "delivery_1",
      handoffId: "handoff_1",
      recipientEndpointId: "qa_codex_local",
      recipientOnline: true,
      cursor: 2,
      now: new Date("2026-06-22T10:00:00.000Z"),
    });

    const result = delivery.expire({
      now: new Date("2026-06-22T11:00:00.000Z"),
      reason: "ack deadline exceeded",
    });

    expect(result.delivery.status).toBe("expired");
    expect(result.delivery.expiredAt?.toISOString()).toBe(
      "2026-06-22T11:00:00.000Z",
    );
    expect(result.events[0]).toMatchObject({
      type: "delivery.expired",
      reason: "ack deadline exceeded",
    });
    expect(() =>
      result.delivery.acknowledge({
        now: new Date("2026-06-22T12:00:00.000Z"),
      }),
    ).toThrow(/illegal transition/i);
  });

  it("moves an acknowledged delivery through human release, agent execution, report ready, and closed", () => {
    const acknowledged = Delivery.create({
      id: "delivery_1",
      handoffId: "handoff_1",
      recipientEndpointId: "qa_codex_local",
      recipientOnline: true,
      cursor: 3,
      now: new Date("2026-06-22T10:00:00.000Z"),
    }).acknowledge({ now: new Date("2026-06-22T10:01:00.000Z") });

    const accepted = acknowledged.accept({
      now: new Date("2026-06-22T10:02:00.000Z"),
      actorEndpointId: "qa_codex_local",
      reason: "人工确认后放行给 QA Agent",
    });
    expect(accepted.delivery.status).toBe("accepted");
    expect(accepted.events).toEqual([
      {
        type: "delivery.accepted",
        handoffId: "handoff_1",
        deliveryId: "delivery_1",
        recipientEndpointId: "qa_codex_local",
        cursor: 3,
        actorEndpointId: "qa_codex_local",
        fromStatus: "acknowledged",
        toStatus: "accepted",
        reason: "人工确认后放行给 QA Agent",
      },
    ]);

    const running = accepted.delivery.start({
      now: new Date("2026-06-22T10:03:00.000Z"),
      actorEndpointId: "qa_codex_local",
      reason: "QA Agent 开始执行",
    });
    expect(running.delivery.status).toBe("running");

    const reportReady = running.delivery.markReportReady({
      now: new Date("2026-06-22T10:04:00.000Z"),
      actorEndpointId: "qa_codex_local",
      reason: "QA Agent 已生成报告，等待人工发送",
      artifactIds: ["artifact_qa_report"],
    });
    expect(reportReady.delivery.status).toBe("report_ready");
    expect(reportReady.events[0]).toMatchObject({
      type: "delivery.report_ready",
      artifactIds: ["artifact_qa_report"],
      fromStatus: "running",
      toStatus: "report_ready",
    });

    const closed = reportReady.delivery.close({
      now: new Date("2026-06-22T10:05:00.000Z"),
      actorEndpointId: "qa_codex_local",
      reason: "人工检查后发送给开发",
    });
    expect(closed.delivery.status).toBe("closed");
    expect(closed.events[0]).toMatchObject({
      type: "delivery.closed",
      actorEndpointId: "qa_codex_local",
      fromStatus: "report_ready",
      toStatus: "closed",
    });
  });

  it("rejects report-ready before the recipient has released execution", () => {
    const delivered = Delivery.create({
      id: "delivery_1",
      handoffId: "handoff_1",
      recipientEndpointId: "qa_codex_local",
      recipientOnline: true,
      cursor: 4,
    });

    expect(() =>
      delivered.markReportReady({
        now: new Date("2026-06-22T10:04:00.000Z"),
        actorEndpointId: "qa_codex_local",
      }),
    ).toThrow(/illegal transition/i);
  });

  it("allows a returned report to be accepted by the next role for another Agent run", () => {
    const acknowledged = Delivery.create({
      id: "delivery_1",
      handoffId: "handoff_1",
      recipientEndpointId: "qa_codex_local",
      recipientOnline: true,
      cursor: 5,
      now: new Date("2026-06-22T10:00:00.000Z"),
    }).acknowledge({ now: new Date("2026-06-22T10:01:00.000Z") });
    const accepted = acknowledged.accept({
      now: new Date("2026-06-22T10:02:00.000Z"),
      actorEndpointId: "qa_codex_local",
    });
    const reportReady = accepted.delivery.markReportReady({
      now: new Date("2026-06-22T10:03:00.000Z"),
      actorEndpointId: "qa_codex_local",
      reason: "质量发送回传给开发",
    });

    const nextAccepted = reportReady.delivery.accept({
      now: new Date("2026-06-22T10:04:00.000Z"),
      actorEndpointId: "dev_codex_local",
      reason: "开发接收质量回传后交给 Agent",
    });

    expect(nextAccepted.delivery.status).toBe("accepted");
    expect(nextAccepted.events[0]).toMatchObject({
      type: "delivery.accepted",
      actorEndpointId: "dev_codex_local",
      fromStatus: "report_ready",
      toStatus: "accepted",
    });
  });

  it("records sending a generated result without adding another status", () => {
    const acknowledged = Delivery.create({
      id: "delivery_1",
      handoffId: "handoff_1",
      recipientEndpointId: "qa_codex_local",
      recipientOnline: true,
      cursor: 6,
      now: new Date("2026-06-22T10:00:00.000Z"),
    }).acknowledge({ now: new Date("2026-06-22T10:01:00.000Z") });
    const accepted = acknowledged.accept({
      now: new Date("2026-06-22T10:02:00.000Z"),
      actorEndpointId: "qa_codex_local",
    });
    const reportReady = accepted.delivery.markReportReady({
      now: new Date("2026-06-22T10:03:00.000Z"),
      actorEndpointId: "qa_codex_local",
      reason: "质量报告已生成",
    });

    const sent = reportReady.delivery.sendResult({
      now: new Date("2026-06-22T10:04:00.000Z"),
      actorEndpointId: "qa_codex_local",
      reason: "人工发送给开发 Agent",
    });

    expect(sent.delivery.status).toBe("report_ready");
    expect(sent.events).toEqual([
      {
        type: "delivery.result_sent",
        handoffId: "handoff_1",
        deliveryId: "delivery_1",
        recipientEndpointId: "qa_codex_local",
        cursor: 6,
        actorEndpointId: "qa_codex_local",
        fromStatus: "report_ready",
        toStatus: "report_ready",
        reason: "人工发送给开发 Agent",
      },
    ]);
  });
});
