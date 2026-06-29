import { afterEach, describe, expect, it, vi } from "vitest";
import { HandoffHubClient } from "./index";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HandoffHubClient", () => {
  it("posts handoff creation requests through the public API boundary", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        handoff: {
          id: "handoff_1",
          title: "订单模块提测",
          status: "created",
        },
        delivery: {
          id: "delivery_1",
          handoffId: "handoff_1",
          recipientEndpointId: "qa_codex_local",
          cursor: 1,
          status: "pending_delivery",
          deliveredAt: null,
          acknowledgedAt: null,
          failedAt: null,
          expiredAt: null,
        },
      }),
    });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    const result = await client.createHandoff({
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
      title: "订单模块提测",
      summary: "请读取 handoff.md",
      pack: {
        entry: "handoff.md",
        artifacts: [
          {
            id: "artifact_entry",
            name: "handoff.md",
            kind: "agent_readable_instruction",
            storage_url: "file://handoff.md",
            checksum: "sha256-entry",
          },
        ],
      },
    });

    expect(result).toMatchObject({
      handoff: { id: "handoff_1" },
      delivery: { id: "delivery_1", status: "pending_delivery" },
    });
    expect(result.delivery.id).toBe("delivery_1");
  });

  it("parses typed endpoint and delivery command responses", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          delivery: {
            id: "delivery_1",
            handoffId: "handoff_1",
            recipientEndpointId: "qa_codex_local",
            cursor: 1,
            status: "acknowledged",
            deliveredAt: "2026-06-23T00:00:00.000Z",
            acknowledgedAt: "2026-06-23T00:01:00.000Z",
            failedAt: null,
            expiredAt: null,
          },
        }),
      });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    await expect(
      client.registerAgentEndpoint({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "qa_user",
        role: "qa",
        agent_endpoint_id: "qa_codex_local",
        online: true,
        capabilities: ["read_handoff_pack"],
        execution_mode: "manual_confirm",
      }),
    ).resolves.toEqual({ ok: true });
    await expect(
      client.acknowledgeDelivery("delivery_1"),
    ).resolves.toMatchObject({
      delivery: {
        id: "delivery_1",
        status: "acknowledged",
      },
    });
  });

  it("keeps handoff packs free-form without fixed repo branch commit fields", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        handoff: { id: "handoff_free_form", status: "created" },
        delivery: {
          id: "delivery_free_form",
          handoffId: "handoff_free_form",
          recipientEndpointId: "qa_codex_local",
          cursor: 2,
          status: "pending_delivery",
          deliveredAt: null,
          acknowledgedAt: null,
          failedAt: null,
          expiredAt: null,
        },
      }),
    });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    await client.createHandoff({
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
      title: "订单模块提测",
      summary: "请读取 handoff.md",
      pack: {
        entry: "handoff.md",
        artifacts: [
          {
            id: "artifact_entry",
            name: "handoff.md",
            kind: "agent_readable_instruction",
            storage_url: "file://handoff.md",
            checksum: "sha256-entry",
          },
        ],
      },
    });

    const requestInit = fetchImpl.mock.calls[0]?.[1] as
      | { body?: string }
      | undefined;
    const payload = JSON.parse(requestInit?.body ?? "{}") as {
      pack: { artifacts: Array<Record<string, unknown>> };
    };
    expect(payload.pack.artifacts[0]).not.toHaveProperty("repo");
    expect(payload.pack.artifacts[0]).not.toHaveProperty("branch");
    expect(payload.pack.artifacts[0]).not.toHaveProperty("commit_range");
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("/handoffs", "http://localhost:3000"),
      expect.any(Object),
    );
  });

  it("wraps connector-facing Handoff Hub endpoints", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ delivery: null, events: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ handoff: { id: "handoff_1" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ delivery: createDeliveryRecord() }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ artifacts: [{ name: "qa-report.md" }] }),
      });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    await client.registerAgentEndpoint({
      schema_version: "1.0",
      tenant_id: "local-demo",
      user_id: "qa_user",
      role: "qa",
      agent_endpoint_id: "qa_codex_local",
      online: true,
      capabilities: ["read_handoff_pack"],
      execution_mode: "manual_confirm",
    });
    await client.connectAgentEndpoint("qa_codex_local", {
      schema_version: "1.0",
      last_seen_cursor: 0,
    });
    await client.getHandoff("handoff_1");
    await client.acknowledgeDelivery("delivery_1");
    await client.addArtifact("handoff_1", {
      schema_version: "1.0",
      artifact: {
        id: "artifact_report",
        name: "qa-report.md",
        kind: "qa_to_dev_report",
        storage_url: "file://qa-report.md",
        checksum: "sha256-report",
      },
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      new URL("/agent-endpoints", "http://localhost:3000"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      new URL(
        "/agent-endpoints/qa_codex_local/connect",
        "http://localhost:3000",
      ),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      new URL("/handoffs/handoff_1", "http://localhost:3000"),
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      new URL("/deliveries/delivery_1/ack", "http://localhost:3000"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      5,
      new URL("/handoffs/handoff_1/artifacts", "http://localhost:3000"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("loads the Web Console overview through the public API boundary", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schema_version: "1.0",
        tenant_id: "local-demo",
        generated_at: "2026-06-23T00:00:00.000Z",
        agent_endpoints: [],
        handoffs: [],
        deliveries: [],
        timeline: [],
        reports: [],
        metrics: {
          pending_handoffs: 0,
          failed_deliveries: 0,
          reports_returned: 0,
          endpoint_online: 0,
          endpoint_total: 0,
        },
      }),
    });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    await expect(client.getOverview("local-demo")).resolves.toMatchObject({
      schema_version: "1.0",
      tenant_id: "local-demo",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("/overview?tenant_id=local-demo", "http://localhost:3000"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("preserves endpoint capability manifests from overview responses", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schema_version: "1.0",
        tenant_id: "local-demo",
        generated_at: "2026-06-24T00:00:00.000Z",
        agent_endpoints: [
          {
            tenant_id: "local-demo",
            user_id: "qa_user",
            role: "qa",
            agent_endpoint_id: "qa_codex_local",
            online: true,
            capabilities: ["read_handoff_pack", "generate_test_scope"],
            execution_mode: "manual_confirm",
            capability_sources: [
              {
                id: "skill_qa_test_scope",
                type: "skill",
                name: "QA 测试范围分析",
                summary: "读取交接包并生成测试范围",
                capabilities: ["read_handoff_pack", "generate_test_scope"],
                approval_mode: "manual_confirm",
                enabled: true,
              },
            ],
            executor: {
              kind: "codex_cli",
              label: "Codex CLI",
              command: "codex",
            },
            approval_policy: {
              mode: "manual_confirm",
              require_human_for: ["run_command"],
              allow_auto_for: [],
            },
            updated_at: "2026-06-24T00:00:00.000Z",
          },
        ],
        handoffs: [],
        deliveries: [],
        timeline: [],
        reports: [],
        metrics: {
          pending_handoffs: 0,
          failed_deliveries: 0,
          reports_returned: 0,
          endpoint_online: 1,
          endpoint_total: 1,
        },
      }),
    });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    const overview = await client.getOverview("local-demo");

    expect(overview.agent_endpoints[0]?.capability_sources).toEqual([
      expect.objectContaining({
        id: "skill_qa_test_scope",
        type: "skill",
      }),
    ]);
    expect(overview.agent_endpoints[0]?.executor.kind).toBe("codex_cli");
    expect(overview.agent_endpoints[0]?.approval_policy.mode).toBe(
      "manual_confirm",
    );
  });

  it("wraps delivery failure and expiry commands", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          delivery: createDeliveryRecord({
            id: "delivery_1",
            status: "failed",
            failedAt: "2026-06-23T00:02:00.000Z",
          }),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          delivery: createDeliveryRecord({
            id: "delivery_2",
            status: "expired",
            expiredAt: "2026-06-23T00:03:00.000Z",
          }),
        }),
      });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    await client.failDelivery("delivery_1", "qa endpoint unreachable");
    await client.expireDelivery("delivery_2", "ack deadline exceeded");

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      new URL("/deliveries/delivery_1/fail", "http://localhost:3000"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          schema_version: "1.0",
          reason: "qa endpoint unreachable",
        }),
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      new URL("/deliveries/delivery_2/expire", "http://localhost:3000"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          schema_version: "1.0",
          reason: "ack deadline exceeded",
        }),
      }),
    );
  });

  it("wraps delivery collaboration lifecycle commands with actor context", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          delivery: createDeliveryRecord({ status: "accepted" }),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          delivery: createDeliveryRecord({ status: "running" }),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          delivery: createDeliveryRecord({ status: "report_ready" }),
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          delivery: createDeliveryRecord({ status: "closed" }),
        }),
      });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    await client.acceptDelivery("delivery_1", {
      schema_version: "1.0",
      actor_endpoint_id: "qa_codex_local",
      reason: "人工确认后放行给 QA Agent",
    });
    await client.startDelivery("delivery_1", {
      schema_version: "1.0",
      actor_endpoint_id: "qa_codex_local",
      reason: "QA Agent 开始执行本地 Codex",
    });
    await client.markDeliveryReportReady("delivery_1", {
      schema_version: "1.0",
      actor_endpoint_id: "qa_codex_local",
      reason: "报告已生成，等待人工发送",
      artifact_ids: ["artifact_qa_report"],
    });
    await client.closeDelivery("delivery_1", {
      schema_version: "1.0",
      actor_endpoint_id: "qa_codex_local",
      reason: "人工检查后发送给开发",
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      new URL("/deliveries/delivery_1/accept", "http://localhost:3000"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          schema_version: "1.0",
          actor_endpoint_id: "qa_codex_local",
          reason: "人工确认后放行给 QA Agent",
        }),
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      new URL("/deliveries/delivery_1/start", "http://localhost:3000"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          schema_version: "1.0",
          actor_endpoint_id: "qa_codex_local",
          reason: "QA Agent 开始执行本地 Codex",
        }),
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      new URL("/deliveries/delivery_1/report-ready", "http://localhost:3000"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          schema_version: "1.0",
          actor_endpoint_id: "qa_codex_local",
          reason: "报告已生成，等待人工发送",
          artifact_ids: ["artifact_qa_report"],
        }),
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      new URL("/deliveries/delivery_1/close", "http://localhost:3000"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("calls default browser fetch through globalThis binding", async () => {
    const fetchImpl = vi.fn(function (
      this: typeof globalThis,
      _input: URL | RequestInfo,
      _init?: RequestInit,
    ) {
      expect(this).toBe(globalThis);
      return Promise.resolve({
        ok: true,
        json: async () => ({
          schema_version: "1.0",
          tenant_id: "local-demo",
          generated_at: "2026-06-23T00:00:00.000Z",
          agent_endpoints: [],
          handoffs: [],
          deliveries: [],
          timeline: [],
          reports: [],
          metrics: {
            pending_handoffs: 0,
            failed_deliveries: 0,
            reports_returned: 0,
            endpoint_online: 0,
            endpoint_total: 0,
          },
        }),
      } as Response);
    });
    vi.stubGlobal("fetch", fetchImpl);
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
    });

    await expect(client.getOverview()).resolves.toMatchObject({
      schema_version: "1.0",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      new URL("/overview?tenant_id=local-demo", "http://localhost:3000"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("loads replay events through the public API boundary", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        after_cursor: 3,
        events: [],
      }),
    });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    await expect(
      client.replayEvents({
        tenantId: "local-demo",
        endpointId: "qa_codex_local",
        afterCursor: 3,
      }),
    ).resolves.toMatchObject({
      schema_version: "1.0",
      endpoint_id: "qa_codex_local",
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL(
        "/events/replay?tenant_id=local-demo&endpoint_id=qa_codex_local&after_cursor=3",
        "http://localhost:3000",
      ),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("wraps platform chat runtime ledger endpoints", async () => {
    const createdAt = "2026-06-25T10:00:00.000Z";
    const conversation = {
      id: "conversation_1",
      schema_version: "1.0",
      tenant_id: "local-demo",
      title: "订单模块联调",
      owner_endpoint_id: "dev_codex_local",
      participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
      status: "active",
      created_at: createdAt,
      updated_at: createdAt,
    };
    const message = {
      id: "message_1",
      conversation_id: conversation.id,
      seq: 1,
      author_endpoint_id: "dev_codex_local",
      role: "user",
      content: "请准备测试范围。",
      references: [],
      created_at: createdAt,
    };
    const projection = {
      id: "projection_1",
      conversation_id: conversation.id,
      provider: "anthropic",
      model: "claude-code",
      source_message_ids: [message.id],
      summary_checkpoint_ids: [],
      reference_ids: [],
      token_budget: 16000,
      rendered_context: "## 历史上下文\n请准备测试范围。",
      created_at: createdAt,
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => conversation })
      .mockResolvedValueOnce({ ok: true, json: async () => message })
      .mockResolvedValueOnce({ ok: true, json: async () => projection })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schema_version: "1.0",
          tenant_id: "local-demo",
          endpoint_id: "dev_codex_local",
          conversations: [
            {
              ...conversation,
              latest_message: message,
              message_count: 1,
              latest_projection: projection,
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schema_version: "1.0",
          tenant_id: "local-demo",
          conversation,
          messages: [message],
          tool_invocations: [],
          summary_checkpoints: [],
          model_runs: [],
          context_projections: [projection],
        }),
      });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    await expect(
      client.createConversation({
        schema_version: "1.0",
        tenant_id: "local-demo",
        title: conversation.title,
        owner_endpoint_id: "dev_codex_local",
        participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
      }),
    ).resolves.toMatchObject({ id: conversation.id });
    await expect(
      client.appendConversationMessage(conversation.id, {
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: conversation.id,
        author_endpoint_id: "dev_codex_local",
        role: "user",
        content: message.content,
      }),
    ).resolves.toMatchObject({ seq: 1 });
    await expect(
      client.createContextProjection(conversation.id, {
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: conversation.id,
        provider: "anthropic",
        model: "claude-code",
        source_message_ids: [message.id],
        token_budget: 16000,
        rendered_context: projection.rendered_context,
      }),
    ).resolves.toMatchObject({ id: projection.id });
    await expect(
      client.getConversations({
        tenantId: "local-demo",
        endpointId: "dev_codex_local",
      }),
    ).resolves.toMatchObject({
      conversations: [expect.objectContaining({ id: conversation.id })],
    });
    await expect(
      client.getConversationDetail(conversation.id, "local-demo"),
    ).resolves.toMatchObject({
      conversation: { id: conversation.id },
      context_projections: [expect.objectContaining({ id: projection.id })],
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      new URL("/conversations", "http://localhost:3000"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      new URL(
        "/conversations/conversation_1/messages",
        "http://localhost:3000",
      ),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      new URL(
        "/conversations/conversation_1/context-projections",
        "http://localhost:3000",
      ),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      new URL(
        "/conversations?tenant_id=local-demo&endpoint_id=dev_codex_local",
        "http://localhost:3000",
      ),
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      5,
      new URL(
        "/conversations/conversation_1?tenant_id=local-demo",
        "http://localhost:3000",
      ),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("submits endpoint health reports through the public API boundary", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        reported_at: "2026-06-23T00:00:02.000Z",
        checks: [
          {
            key: "executor",
            label: "Executor command",
            status: "passed",
            detail: "Codex CLI is available",
            observed_at: "2026-06-23T00:00:00.000Z",
          },
        ],
      }),
    });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    await expect(
      client.reportEndpointHealth("qa_codex_local", {
        schema_version: "1.0",
        tenant_id: "local-demo",
        checks: [
          {
            key: "executor",
            label: "Executor command",
            status: "passed",
            detail: "Codex CLI is available",
            observed_at: "2026-06-23T00:00:00.000Z",
          },
        ],
      }),
    ).resolves.toMatchObject({
      endpoint_id: "qa_codex_local",
      checks: [expect.objectContaining({ key: "executor" })],
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL(
        "/agent-endpoints/qa_codex_local/health",
        "http://localhost:3000",
      ),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Executor command"),
      }),
    );
  });

  it("wraps provider model registry endpoints", async () => {
    const observedAt = "2026-06-25T11:00:00.000Z";
    const profile = {
      id: "profile_qa_claude",
      schema_version: "1.0",
      tenant_id: "local-demo",
      agent_endpoint_id: "qa_codex_local",
      provider: "anthropic",
      model: "claude-code",
      label: "Claude Code",
      executor: {
        kind: "claude_code",
        label: "Claude Code",
        command: "claude",
      },
      capabilities: ["chat", "streaming", "tool_use"],
      context_window: 200000,
      max_output_tokens: 8192,
      default_for_endpoint: true,
      status: "available" as const,
      created_at: observedAt,
      updated_at: observedAt,
    };
    const health = {
      id: "health_1",
      schema_version: "1.0",
      tenant_id: "local-demo",
      profile_id: profile.id,
      status: "passed" as const,
      checks: [
        {
          key: "command",
          label: "Executor command",
          status: "passed" as const,
          detail: "Claude Code is available",
          observed_at: observedAt,
        },
      ],
      reported_at: observedAt,
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockResolvedValueOnce({ ok: true, json: async () => health })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schema_version: "1.0",
          tenant_id: "local-demo",
          endpoint_id: "qa_codex_local",
          default_profile_id: profile.id,
          profiles: [{ ...profile, latest_health: health }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          schema_version: "1.0",
          tenant_id: "local-demo",
          endpoint_id: "qa_codex_local",
          selected_profile_id: profile.id,
          selected_profile: { ...profile, latest_health: health },
          required_capabilities: ["chat", "tool_use"],
          selection_reason: "default_profile_matched",
        }),
      });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    await expect(
      client.registerProviderModelProfile({
        schema_version: "1.0",
        tenant_id: "local-demo",
        agent_endpoint_id: "qa_codex_local",
        provider: "anthropic",
        model: "claude-code",
        label: "Claude Code",
        executor: {
          kind: "claude_code",
          label: "Claude Code",
          command: "claude",
        },
        capabilities: ["chat", "streaming", "tool_use"],
        context_window: 200000,
        max_output_tokens: 8192,
        default_for_endpoint: true,
      }),
    ).resolves.toMatchObject({ id: profile.id });
    await expect(
      client.reportProviderModelHealth(profile.id, {
        schema_version: "1.0",
        tenant_id: "local-demo",
        profile_id: profile.id,
        status: "passed",
        checks: health.checks,
      }),
    ).resolves.toMatchObject({ id: health.id });
    await expect(
      client.getProviderModelRegistry({
        tenantId: "local-demo",
        endpointId: "qa_codex_local",
      }),
    ).resolves.toMatchObject({
      profiles: [expect.objectContaining({ id: profile.id })],
    });
    await expect(
      client.resolveProviderModelSelection({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        required_capabilities: ["chat", "tool_use"],
      }),
    ).resolves.toMatchObject({
      selected_profile_id: profile.id,
      selection_reason: "default_profile_matched",
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      new URL("/provider-model-registry/profiles", "http://localhost:3000"),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      new URL(
        "/provider-model-registry/profiles/profile_qa_claude/health",
        "http://localhost:3000",
      ),
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      3,
      new URL(
        "/provider-model-registry?tenant_id=local-demo&endpoint_id=qa_codex_local",
        "http://localhost:3000",
      ),
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      4,
      new URL("/provider-model-registry/resolve", "http://localhost:3000"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("fetches role capability catalogs for product capability references", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        schema_version: "1.0",
        tenant_id: "local-demo",
        generated_at: "2026-06-26T10:00:00.000Z",
        packs: [],
        mentions: [
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
    });
    const client = new HandoffHubClient({
      baseUrl: "http://localhost:3000",
      fetchImpl,
    });

    const catalog = await client.getRoleCapabilityCatalog("local-demo");

    expect(catalog.mentions).toEqual([
      expect.objectContaining({ mention: "@qa.ui-regression-execution" }),
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      new URL(
        "/role-capabilities?tenant_id=local-demo",
        "http://localhost:3000",
      ),
      expect.objectContaining({ method: "GET" }),
    );
  });
});

function createDeliveryRecord(
  overrides: Partial<{
    id: string;
    handoffId: string;
    recipientEndpointId: string;
    cursor: number;
    status:
      | "pending_delivery"
      | "delivered"
      | "acknowledged"
      | "accepted"
      | "running"
      | "report_ready"
      | "closed"
      | "failed"
      | "expired";
    deliveredAt: string | null;
    acknowledgedAt: string | null;
    failedAt: string | null;
    expiredAt: string | null;
  }> = {},
) {
  return {
    id: "delivery_1",
    handoffId: "handoff_1",
    recipientEndpointId: "qa_codex_local",
    cursor: 1,
    status: "acknowledged" as const,
    deliveredAt: "2026-06-23T00:00:00.000Z",
    acknowledgedAt: "2026-06-23T00:01:00.000Z",
    failedAt: null,
    expiredAt: null,
    ...overrides,
  };
}
