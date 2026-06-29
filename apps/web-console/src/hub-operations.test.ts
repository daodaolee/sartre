import { describe, expect, it, vi } from "vitest";
import {
  createWebConsoleOperations,
  localDemoProfiles,
  type WebConsoleOperationClient,
} from "./hub-operations";

describe("Web Console Hub operations", () => {
  it("exposes local Dev and QA profile semantics outside Hub internals", () => {
    expect(localDemoProfiles.dev).toMatchObject({
      tenant_id: "local-demo",
      user_id: "dev_user",
      role: "developer",
      agent_endpoint_id: "dev_codex_local",
      execution_mode: "manual_confirm",
    });
    expect(localDemoProfiles.qa).toMatchObject({
      tenant_id: "local-demo",
      user_id: "qa_user",
      role: "qa",
      agent_endpoint_id: "qa_codex_local",
      execution_mode: "manual_confirm",
    });
  });

  it("registers the selected actor and refreshes overview", async () => {
    const refreshOverview = vi
      .fn()
      .mockResolvedValue({ schema_version: "1.0" });
    const client = createOperationClientStub({
      registerAgentEndpoint: vi.fn().mockResolvedValue({ ok: true }),
    });
    const operations = createWebConsoleOperations({
      client,
      refreshOverview,
    });

    await expect(operations.registerActor("qa")).resolves.toMatchObject({
      status: "succeeded",
      detail: "已注册 qa_codex_local",
    });

    expect(client.registerAgentEndpoint).toHaveBeenCalledWith(
      localDemoProfiles.qa,
    );
    expect(refreshOverview).toHaveBeenCalledTimes(1);
  });

  it("creates a free-form Dev to QA demo handoff", async () => {
    const createHandoff = vi.fn().mockResolvedValue({
      delivery: { id: "delivery_1", status: "pending_delivery" },
    });
    const client = createOperationClientStub({
      createHandoff,
    });
    const operations = createWebConsoleOperations({
      client,
      refreshOverview: vi.fn().mockResolvedValue({ schema_version: "1.0" }),
    });

    await expect(operations.createDemoHandoff()).resolves.toMatchObject({
      status: "succeeded",
      detail: "已创建投递 delivery_1",
    });

    const request = createHandoff.mock.calls[0]?.[0];
    expect(request.from.agent_endpoint_id).toBe("dev_codex_local");
    expect(request.to.agent_endpoint_id).toBe("qa_codex_local");
    expect(request.pack.artifacts[0]).not.toHaveProperty("repo");
    expect(request.pack.artifacts[0]).not.toHaveProperty("branch");
    expect(request.pack.artifacts[0]).not.toHaveProperty("commit_range");
  });

  it("creates a task handoff with ordered attachment artifacts and a target Agent", async () => {
    const createHandoff = vi.fn().mockResolvedValue({
      handoff: { id: "handoff_task", status: "created" },
      delivery: { id: "delivery_task", status: "delivered" },
    });
    const client = createOperationClientStub({
      createHandoff,
    });
    const operations = createWebConsoleOperations({
      client,
      refreshOverview: vi.fn().mockResolvedValue({ schema_version: "1.0" }),
    });

    await expect(
      operations.createTaskHandoff({
        actor: "dev",
        title: "v0.2 checkout: 支付回归",
        description: "支付入口已改完，请按附件顺序看图并执行冒烟。",
        targetActor: "qa",
        targetAgentEndpointId: "qa_codex_local",
        attachments: [
          {
            id: "attachment_1",
            name: "01-entry.png",
            kind: "pasted_image",
            storageUrl:
              "https://assets.falcocut.ai/sartre/dev_user/01-entry.png",
            checksum: "sha256-attachment-1",
          },
          {
            id: "attachment_2",
            name: "02-result.png",
            kind: "uploaded_file",
            storageUrl:
              "https://assets.falcocut.ai/sartre/dev_user/02-result.png",
            checksum: "sha256-attachment-2",
          },
        ],
      }),
    ).resolves.toMatchObject({
      status: "succeeded",
      detail: "已发送任务 delivery_task",
    });

    const request = createHandoff.mock.calls[0]?.[0];
    expect(request).toMatchObject({
      schema_version: "1.0",
      tenant_id: "local-demo",
      from: {
        user_id: "dev_user",
        role: "developer",
        agent_endpoint_id: "dev_codex_local",
      },
      to: {
        user_id: "qa_user",
        role: "qa",
        agent_endpoint_id: "qa_codex_local",
      },
      title: "v0.2 checkout: 支付回归",
      summary: "支付入口已改完，请按附件顺序看图并执行冒烟。",
    });
    expect(request.pack.entry).toBe("task.md");
    expect(
      request.pack.artifacts.map((artifact: { name: string }) => artifact.name),
    ).toEqual(["task.md", "01-entry.png", "02-result.png"]);
    expect(JSON.stringify(request)).not.toMatch(/secret|password|token/i);
  });

  it("mirrors capability-backed task creation into the conversation ledger", async () => {
    const createHandoff = vi.fn().mockResolvedValue({
      handoff: { id: "handoff_task", status: "created" },
      delivery: { id: "delivery_task", status: "delivered" },
    });
    const createConversation = vi.fn().mockResolvedValue({
      id: "conversation_task",
      tenant_id: "local-demo",
    });
    const appendConversationMessage = vi.fn().mockResolvedValue({
      id: "message_task",
      conversation_id: "conversation_task",
      seq: 1,
    });
    const createContextProjection = vi.fn().mockResolvedValue({
      id: "projection_task",
      conversation_id: "conversation_task",
    });
    const client = createOperationClientStub({
      createHandoff,
      createConversation,
      appendConversationMessage,
      createContextProjection,
    });
    const operations = createWebConsoleOperations({
      client,
      refreshOverview: vi.fn().mockResolvedValue({ schema_version: "1.0" }),
    });

    await expect(
      operations.createTaskHandoff({
        actor: "dev",
        title: "v0.2 checkout: 支付回归",
        description: "请 @qa.ui-regression-execution 执行回归。",
        targetActor: "qa",
        targetAgentEndpointId: "qa_codex_local",
        attachments: [],
        capabilityReferences: [
          {
            mention: "@qa.ui-regression-execution",
            kind: "skill",
            label: "UI regression execution",
            summary: "Run reviewed UI regression.",
            role: "qa",
            packId: "qa-falcocut-capability-pack",
            sourceProjectId: "ai-native-qa",
            targetId: "qa_skill_ui_regression_execution",
          },
        ],
      }),
    ).resolves.toMatchObject({
      status: "succeeded",
      detail: "已发送任务 delivery_task",
    });

    expect(createConversation).toHaveBeenCalledWith(
      expect.objectContaining({
        schema_version: "1.0",
        tenant_id: "local-demo",
        title: "v0.2 checkout: 支付回归",
        owner_endpoint_id: "dev_codex_local",
        participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
        metadata: expect.objectContaining({
          handoff_id: "handoff_task",
          delivery_id: "delivery_task",
          source: "web-console",
        }),
      }),
    );
    expect(appendConversationMessage).toHaveBeenCalledWith(
      "conversation_task",
      expect.objectContaining({
        author_endpoint_id: "dev_codex_local",
        content: "请 @qa.ui-regression-execution 执行回归。",
        references: expect.arrayContaining([
          expect.objectContaining({
            type: "capability",
            target_id: "qa_skill_ui_regression_execution",
            label: "@qa.ui-regression-execution",
            metadata: expect.objectContaining({
              pack_id: "qa-falcocut-capability-pack",
              source_project_id: "ai-native-qa",
            }),
          }),
          expect.objectContaining({
            type: "delivery",
            target_id: "delivery_task",
          }),
        ]),
      }),
    );
    expect(createContextProjection).toHaveBeenCalledWith(
      "conversation_task",
      expect.objectContaining({
        provider: "sartre",
        model: "role-capability-context",
        source_message_ids: ["message_task"],
        reference_ids: expect.arrayContaining([
          "delivery_task",
          "qa_skill_ui_regression_execution",
        ]),
        rendered_context: expect.stringContaining(
          "@qa.ui-regression-execution",
        ),
        metadata: expect.objectContaining({
          projection_mode: "capability_reference_context",
          delivery_id: "delivery_task",
        }),
      }),
    );
  });

  it("replays endpoint events and records zero events as success", async () => {
    const client = createOperationClientStub({
      replayEvents: vi.fn().mockResolvedValue({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        after_cursor: 4,
        events: [],
      }),
    });
    const operations = createWebConsoleOperations({
      client,
      refreshOverview: vi.fn().mockResolvedValue({ schema_version: "1.0" }),
    });

    await expect(operations.replayActor("qa", 4)).resolves.toMatchObject({
      status: "succeeded",
      detail: "已重放 0 个事件",
      nextCursor: 4,
    });
  });

  it("connects an actor and returns the next replay cursor", async () => {
    const refreshOverview = vi
      .fn()
      .mockResolvedValue({ schema_version: "1.0" });
    const client = createOperationClientStub({
      connectAgentEndpoint: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", cursor: 7 },
        events: [
          {
            type: "delivery.redelivered",
            cursor: 7,
          },
        ],
      }),
    });
    const operations = createWebConsoleOperations({
      client,
      refreshOverview,
    });

    await expect(operations.connectActor("qa", 4)).resolves.toMatchObject({
      status: "succeeded",
      detail: "已连接 qa_codex_local，同步 1 个事件",
      nextCursor: 7,
    });

    expect(client.connectAgentEndpoint).toHaveBeenCalledWith("qa_codex_local", {
      schema_version: "1.0",
      last_seen_cursor: 4,
    });
    expect(refreshOverview).toHaveBeenCalledTimes(1);
  });

  it("maps classified failures into operation log entries", async () => {
    const client = createOperationClientStub({
      acknowledgeDelivery: vi
        .fn()
        .mockRejectedValue(
          new Error(
            "InvalidInput: Illegal transition from expired to acknowledged",
          ),
        ),
    });
    const operations = createWebConsoleOperations({
      client,
      refreshOverview: vi.fn().mockResolvedValue({ schema_version: "1.0" }),
    });

    await expect(operations.ackDelivery("delivery_1")).resolves.toMatchObject({
      status: "failed",
      detail: "InvalidInput: Illegal transition from expired to acknowledged",
    });
  });

  it("runs collaboration lifecycle commands with the selected actor context", async () => {
    const client = createOperationClientStub({
      acceptDelivery: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", status: "accepted" },
      }),
      markDeliveryReportReady: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", status: "report_ready" },
      }),
      closeDelivery: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", status: "closed" },
      }),
    });
    const operations = createWebConsoleOperations({
      client,
      refreshOverview: vi.fn().mockResolvedValue({ schema_version: "1.0" }),
    });

    await operations.acceptDelivery("delivery_1", "qa");
    await operations.markDeliveryReportReady("delivery_1", "qa", [
      "artifact_qa_report",
    ]);
    await operations.closeDelivery("delivery_1", "qa");

    expect(client.acceptDelivery).toHaveBeenCalledWith("delivery_1", {
      schema_version: "1.0",
      actor_endpoint_id: "qa_codex_local",
      reason: "人工确认后放行给当前岗位 Agent",
      metadata: {
        source: "web-console",
        actor_endpoint_id: "qa_codex_local",
      },
    });
    expect(client.markDeliveryReportReady).toHaveBeenCalledWith("delivery_1", {
      schema_version: "1.0",
      actor_endpoint_id: "qa_codex_local",
      reason: "Agent 已完成并写入结果",
      artifact_ids: ["artifact_qa_report"],
      metadata: {
        source: "web-console",
        actor_endpoint_id: "qa_codex_local",
      },
    });
    expect(client.closeDelivery).toHaveBeenCalledWith("delivery_1", {
      schema_version: "1.0",
      actor_endpoint_id: "qa_codex_local",
      reason: "人工检查后发送结果",
      metadata: {
        source: "web-console",
        actor_endpoint_id: "qa_codex_local",
      },
    });
  });

  it("writes a manual task reply as auditable lifecycle events", async () => {
    const client = createOperationClientStub({
      acceptDelivery: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", status: "accepted" },
      }),
      markDeliveryReportReady: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", status: "report_ready" },
      }),
      closeDelivery: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", status: "closed" },
      }),
    });
    const refreshOverview = vi
      .fn()
      .mockResolvedValue({ schema_version: "1.0" });
    const operations = createWebConsoleOperations({
      client,
      refreshOverview,
    });

    await expect(
      operations.sendTaskReply({
        deliveryId: "delivery_1",
        currentStatus: "acknowledged",
        actorEndpointId: "qa_codex_local",
        targetAgentEndpointId: "dev_codex_local",
        content: "Safari 下支付按钮不可点击。",
        contentHtml: "<p>Safari 下支付按钮不可点击。</p>",
        attachments: [
          {
            id: "artifact_screenshot",
            name: "safari.png",
            kind: "pasted_image",
            storageUrl: "https://assets.falcocut.ai/sartre/qa_user/safari.png",
            checksum: "sha256-safari",
          },
        ],
        closeTask: true,
      }),
    ).resolves.toMatchObject({
      status: "succeeded",
      detail: "已发送并结束 delivery_1",
    });

    const expectedMetadata = {
      source: "web-console",
      actor_endpoint_id: "qa_codex_local",
      target_agent_endpoint_id: "dev_codex_local",
      content: "Safari 下支付按钮不可点击。",
      content_html: "<p>Safari 下支付按钮不可点击。</p>",
      attachment_ids: ["artifact_screenshot"],
    };
    expect(client.acceptDelivery).toHaveBeenCalledWith("delivery_1", {
      schema_version: "1.0",
      actor_endpoint_id: "qa_codex_local",
      reason: "人工接手并准备回传结果",
      metadata: expectedMetadata,
    });
    expect(client.markDeliveryReportReady).toHaveBeenCalledWith("delivery_1", {
      schema_version: "1.0",
      actor_endpoint_id: "qa_codex_local",
      reason: "Safari 下支付按钮不可点击。",
      artifact_ids: ["artifact_screenshot"],
      metadata: expectedMetadata,
    });
    expect(client.closeDelivery).toHaveBeenCalledWith("delivery_1", {
      schema_version: "1.0",
      actor_endpoint_id: "qa_codex_local",
      reason: "Safari 下支付按钮不可点击。",
      metadata: expectedMetadata,
    });
    expect(refreshOverview).toHaveBeenCalledTimes(1);
  });

  it("appends manual replies with capability references to the task conversation", async () => {
    const sendDeliveryResult = vi.fn().mockResolvedValue({
      delivery: { id: "delivery_1", status: "report_ready" },
    });
    const appendConversationMessage = vi.fn().mockResolvedValue({
      id: "message_reply",
      conversation_id: "conversation_task",
      seq: 2,
    });
    const createContextProjection = vi.fn().mockResolvedValue({
      id: "projection_reply",
      conversation_id: "conversation_task",
    });
    const client = createOperationClientStub({
      markDeliveryReportReady: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", status: "report_ready" },
      }),
      getConversations: vi.fn().mockResolvedValue({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        conversations: [
          {
            id: "conversation_task",
            schema_version: "1.0",
            tenant_id: "local-demo",
            title: "checkout-flow-regression",
            owner_endpoint_id: "dev_codex_local",
            participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
            status: "active",
            created_at: "2026-06-26T10:00:00.000Z",
            updated_at: "2026-06-26T10:01:00.000Z",
            metadata: { delivery_id: "delivery_1" },
            latest_message: null,
            message_count: 1,
            latest_projection: null,
          },
        ],
      }),
      getConversationDetail: vi.fn().mockResolvedValue({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation: {
          id: "conversation_task",
          schema_version: "1.0",
          tenant_id: "local-demo",
          title: "checkout-flow-regression",
          owner_endpoint_id: "dev_codex_local",
          participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
          status: "active",
          created_at: "2026-06-26T10:00:00.000Z",
          updated_at: "2026-06-26T10:01:00.000Z",
          metadata: { delivery_id: "delivery_1" },
        },
        messages: [],
        tool_invocations: [],
        summary_checkpoints: [],
        model_runs: [],
        context_projections: [],
      }),
      appendConversationMessage,
      createContextProjection,
      sendDeliveryResult,
    });
    const operations = createWebConsoleOperations({
      client,
      refreshOverview: vi.fn().mockResolvedValue({ schema_version: "1.0" }),
    });

    await expect(
      operations.sendTaskReply({
        deliveryId: "delivery_1",
        currentStatus: "report_ready",
        actorEndpointId: "qa_codex_local",
        targetAgentEndpointId: "dev_codex_local",
        content: "建议开发用 @dev.frontend.build-qa 复跑 QA 构建。",
        contentHtml: "<p>建议开发用 @dev.frontend.build-qa 复跑 QA 构建。</p>",
        attachments: [],
        capabilityReferences: [
          {
            mention: "@dev.frontend.build-qa",
            kind: "command",
            label: "Build US QA frontend",
            summary: "Run the frontend QA build.",
            role: "developer",
            packId: "frontend-marketing-ai-aws-capability-pack",
            sourceProjectId: "marketing-ai-aws",
            targetId: "dev.frontend.command.build-qa",
          },
        ],
        closeTask: false,
      }),
    ).resolves.toMatchObject({
      status: "succeeded",
      detail: "已发送结果 delivery_1",
    });

    expect(appendConversationMessage).toHaveBeenCalledWith(
      "conversation_task",
      expect.objectContaining({
        author_endpoint_id: "qa_codex_local",
        content: "建议开发用 @dev.frontend.build-qa 复跑 QA 构建。",
        references: expect.arrayContaining([
          expect.objectContaining({
            type: "capability",
            target_id: "dev.frontend.command.build-qa",
            label: "@dev.frontend.build-qa",
          }),
          expect.objectContaining({
            type: "delivery",
            target_id: "delivery_1",
          }),
        ]),
      }),
    );
    expect(createContextProjection).toHaveBeenCalledWith(
      "conversation_task",
      expect.objectContaining({
        source_message_ids: ["message_reply"],
        reference_ids: expect.arrayContaining([
          "delivery_1",
          "dev.frontend.command.build-qa",
        ]),
        rendered_context: expect.stringContaining("@dev.frontend.build-qa"),
      }),
    );
    expect(sendDeliveryResult).toHaveBeenCalledWith(
      "delivery_1",
      expect.objectContaining({
        schema_version: "1.0",
        actor_endpoint_id: "qa_codex_local",
        reason: "建议开发用 @dev.frontend.build-qa 复跑 QA 构建。",
        metadata: expect.objectContaining({
          source: "web-console",
          actor_endpoint_id: "qa_codex_local",
          target_agent_endpoint_id: "dev_codex_local",
          capability_mentions: "@dev.frontend.build-qa",
        }),
      }),
    );
  });
});

function createOperationClientStub(
  overrides: Partial<Record<string, unknown>> = {},
): WebConsoleOperationClient {
  return {
    registerAgentEndpoint: vi
      .fn()
      .mockRejectedValue(new Error("unused registerAgentEndpoint")),
    connectAgentEndpoint: vi
      .fn()
      .mockRejectedValue(new Error("unused connectAgentEndpoint")),
    createHandoff: vi.fn().mockRejectedValue(new Error("unused createHandoff")),
    createConversation: vi.fn().mockResolvedValue({
      id: "conversation_stub",
      tenant_id: "local-demo",
      title: "stub",
      metadata: {},
    }),
    appendConversationMessage: vi.fn().mockResolvedValue({
      id: "message_stub",
      conversation_id: "conversation_stub",
      seq: 1,
    }),
    createContextProjection: vi.fn().mockResolvedValue({
      id: "projection_stub",
      conversation_id: "conversation_stub",
    }),
    getConversations: vi.fn().mockResolvedValue({
      schema_version: "1.0",
      tenant_id: "local-demo",
      endpoint_id: "dev_codex_local",
      conversations: [],
    }),
    getConversationDetail: vi
      .fn()
      .mockRejectedValue(new Error("unused getConversationDetail")),
    replayEvents: vi.fn().mockRejectedValue(new Error("unused replayEvents")),
    acknowledgeDelivery: vi
      .fn()
      .mockRejectedValue(new Error("unused acknowledgeDelivery")),
    failDelivery: vi.fn().mockRejectedValue(new Error("unused failDelivery")),
    expireDelivery: vi
      .fn()
      .mockRejectedValue(new Error("unused expireDelivery")),
    acceptDelivery: vi
      .fn()
      .mockRejectedValue(new Error("unused acceptDelivery")),
    markDeliveryReportReady: vi
      .fn()
      .mockRejectedValue(new Error("unused markDeliveryReportReady")),
    sendDeliveryResult: vi
      .fn()
      .mockRejectedValue(new Error("unused sendDeliveryResult")),
    closeDelivery: vi.fn().mockRejectedValue(new Error("unused closeDelivery")),
    ...overrides,
  } as WebConsoleOperationClient;
}
