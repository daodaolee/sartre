import { describe, expect, it } from "vitest";
import {
  conversationReferenceSchema,
  conversationReferenceTypeSchema,
  createHandoffRequestSchema,
  deliveryLifecycleCommandRequestSchema,
  deliveryLifecycleEventTypeSchema,
  deliveryStatusSchema,
  endpointHealthReportRequestSchema,
  endpointHealthReportResponseSchema,
  handoffEnvelopeSchema,
  handoffErrorResponseSchema,
  handoffOverviewResponseSchema,
  localDemoProfileFacts,
  overviewDeliverySchema,
  overviewTimelineEventSchema,
  roleCapabilityCatalogResponseSchema,
} from "./index";

describe("handoff contracts", () => {
  it("requires schema_version on network handoff envelopes", () => {
    const result = handoffEnvelopeSchema.safeParse({
      id: "handoff_1",
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
        artifacts: [],
      },
      status: "created",
      created_at: "2026-06-22T10:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a free-form handoff pack without requiring dev-to-qa fields", () => {
    const result = createHandoffRequestSchema.safeParse({
      schema_version: "1.0",
      tenant_id: "local-demo",
      from: {
        user_id: "qa_user",
        role: "qa",
        agent_endpoint_id: "qa_codex_local",
      },
      to: {
        user_id: "dev_user",
        role: "developer",
        agent_endpoint_id: "dev_codex_local",
      },
      title: "测试报告回传",
      summary: "请读取 qa-report.md 和 bug-list.md",
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
          {
            id: "artifact_report",
            name: "qa-report.md",
            kind: "qa_to_dev_report",
            storage_url: "file://qa-report.md",
            checksum: "sha256-report",
          },
        ],
      },
    });

    expect(result.success).toBe(true);
  });

  it("allows failed and expired delivery status values", () => {
    expect(deliveryStatusSchema.safeParse("failed").success).toBe(true);
    expect(deliveryStatusSchema.safeParse("expired").success).toBe(true);
  });

  it("allows collaboration delivery statuses and lifecycle event types", () => {
    for (const status of ["accepted", "running", "report_ready", "closed"]) {
      expect(deliveryStatusSchema.safeParse(status).success).toBe(true);
    }
    for (const eventType of [
      "delivery.accepted",
      "delivery.running",
      "delivery.report_ready",
      "delivery.result_sent",
      "delivery.closed",
    ]) {
      expect(
        deliveryLifecycleEventTypeSchema.safeParse(eventType).success,
      ).toBe(true);
    }
  });

  it("requires actor context on delivery lifecycle commands", () => {
    const accepted = deliveryLifecycleCommandRequestSchema.safeParse({
      schema_version: "1.0",
      actor_endpoint_id: "qa_codex_local",
      reason: "人工确认后放行给 QA Agent",
      artifact_ids: ["artifact_qa_report"],
      metadata: {
        source: "web-console",
        state_note: "等待人工发送",
      },
    });
    expect(accepted.success).toBe(true);

    const missingActor = deliveryLifecycleCommandRequestSchema.safeParse({
      schema_version: "1.0",
      reason: "missing actor",
    });
    expect(missingActor.success).toBe(false);
  });

  it("accepts event-backed failed timeline metadata", () => {
    const result = overviewTimelineEventSchema.safeParse({
      id: "event_1",
      type: "delivery.failed",
      label: "Failed",
      detail: "Delivery failed: qa endpoint unreachable",
      time: "10:05",
      tone: "red",
      handoff_id: "handoff_1",
      delivery_id: "delivery_1",
    });

    expect(result.success).toBe(true);
  });

  it("accepts active turn metadata on overview deliveries", () => {
    const result = overviewDeliverySchema.safeParse({
      id: "delivery_1",
      handoff_id: "handoff_1",
      recipient_endpoint_id: "qa_codex_local",
      cursor: 1,
      status: "report_ready",
      delivered_at: "2026-06-23T00:03:00.000Z",
      acknowledged_at: "2026-06-23T00:04:00.000Z",
      title: "checkout-flow-regression",
      summary: "QA result is ready",
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
      active_actor_endpoint_id: "qa_codex_local",
      active_target_agent_endpoint_id: "dev_codex_local",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      active_actor_endpoint_id: "qa_codex_local",
      active_target_agent_endpoint_id: "dev_codex_local",
    });
  });

  it("accepts classified error envelopes", () => {
    const result = handoffErrorResponseSchema.safeParse({
      schema_version: "1.0",
      error: {
        category: "InvalidInput",
        message: "Illegal transition from expired to acknowledged",
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts event replay responses", async () => {
    const contracts = await import("./index");
    expect("handoffEventReplayResponseSchema" in contracts).toBe(true);

    const result = contracts.handoffEventReplayResponseSchema.safeParse({
      schema_version: "1.0",
      tenant_id: "local-demo",
      endpoint_id: "qa_codex_local",
      after_cursor: 0,
      events: [
        {
          id: "event_1",
          type: "delivery.delivered",
          handoff_id: "handoff_1",
          delivery_id: "delivery_1",
          recipient_endpoint_id: "qa_codex_local",
          cursor: 1,
          occurred_at: "2026-06-23T00:00:00.000Z",
          payload: { title: "replay demo" },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("accepts role capability catalogs with stable mention candidates", () => {
    const result = roleCapabilityCatalogResponseSchema.safeParse({
      schema_version: "1.0",
      tenant_id: "local-demo",
      generated_at: "2026-06-26T10:00:00.000Z",
      packs: [
        {
          schema_version: "1.0",
          id: "qa-falcocut-capability-pack",
          role: "qa",
          label: "FalcoCut QA Agent",
          summary: "QA capability pack",
          source_project: {
            id: "ai-native-qa",
            label: "FalcoCut QA",
            kind: "qa_automation",
            local_path: "/Users/xy/xykj/ai-native-qa",
          },
          agent_endpoint: {
            tenant_id: "local-demo",
            user_id: "qa_user",
            role: "qa",
            agent_endpoint_id: "qa_falcocut_local",
            execution_mode: "manual_confirm",
            executor: {
              kind: "codex_cli",
              label: "Codex CLI",
              command: "codex",
            },
            approval_policy: {
              mode: "manual_confirm",
              require_human_for: ["run_command"],
              allow_auto_for: ["read_repo"],
            },
          },
          capability_sources: [],
          commands: [],
          hooks: [],
          constraints: [],
        },
      ],
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
    });

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("Expected role capability catalog to parse");
    }
    expect(result.data.mentions[0]?.mention).toBe(
      "@qa.ui-regression-execution",
    );
  });

  it("accepts capability references in provider-neutral conversation ledgers", () => {
    expect(
      conversationReferenceTypeSchema.safeParse("capability").success,
    ).toBe(true);

    const result = conversationReferenceSchema.safeParse({
      id: "reference_capability_1",
      type: "capability",
      target_id: "qa_skill_ui_regression_execution",
      label: "@qa.ui-regression-execution",
      metadata: {
        mention: "@qa.ui-regression-execution",
        kind: "skill",
        pack_id: "qa-falcocut-capability-pack",
        source_project_id: "ai-native-qa",
      },
    });

    expect(result.success).toBe(true);
  });

  it("exports shared local demo profile facts", () => {
    expect(localDemoProfileFacts.dev).toEqual({
      tenant_id: "local-demo",
      user_id: "dev_user",
      role: "developer",
      agent_endpoint_id: "dev_codex_local",
      execution_mode: "manual_confirm",
    });
    expect(localDemoProfileFacts.qa).toEqual({
      tenant_id: "local-demo",
      user_id: "qa_user",
      role: "qa",
      agent_endpoint_id: "qa_codex_local",
      execution_mode: "manual_confirm",
    });
  });

  it("accepts generic endpoint health reports without source-control fields", () => {
    const result = endpointHealthReportRequestSchema.safeParse({
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
        {
          key: "workspace",
          label: "Workspace",
          status: "warning",
          detail: "Workspace path needs confirmation",
          observed_at: "2026-06-23T00:00:01.000Z",
          metadata: { path_kind: "local" },
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data?.checks[0]).not.toHaveProperty("repo");
    expect(result.data?.checks[0]).not.toHaveProperty("branch");
    expect(result.data?.checks[0]).not.toHaveProperty("commit_range");
  });

  it("rejects secret-looking health report metadata", () => {
    const result = endpointHealthReportRequestSchema.safeParse({
      schema_version: "1.0",
      tenant_id: "local-demo",
      checks: [
        {
          key: "executor",
          label: "Executor command",
          status: "blocked",
          detail: "Codex CLI failed",
          observed_at: "2026-06-23T00:00:00.000Z",
          metadata: { token: "abc123secret" },
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("accepts health report responses and overview projection", () => {
    const healthReport = {
      schema_version: "1.0",
      tenant_id: "local-demo",
      endpoint_id: "qa_codex_local",
      reported_at: "2026-06-23T00:00:02.000Z",
      checks: [
        {
          key: "executor",
          label: "Executor command",
          status: "blocked",
          detail: "Codex CLI unavailable",
          observed_at: "2026-06-23T00:00:00.000Z",
        },
      ],
    };

    expect(
      endpointHealthReportResponseSchema.safeParse(healthReport).success,
    ).toBe(true);
    expect(
      handoffOverviewResponseSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        generated_at: "2026-06-23T00:00:03.000Z",
        agent_endpoints: [
          {
            tenant_id: "local-demo",
            user_id: "qa_user",
            role: "qa",
            agent_endpoint_id: "qa_codex_local",
            online: true,
            capabilities: ["read_handoff_pack"],
            execution_mode: "manual_confirm",
            updated_at: "2026-06-23T00:00:00.000Z",
            health_report: healthReport,
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
      }).success,
    ).toBe(true);
  });

  it("accepts structured endpoint capability manifests", async () => {
    const contracts = await import("./index");
    expect("agentCapabilitySourceSchema" in contracts).toBe(true);
    expect("executorBindingSchema" in contracts).toBe(true);
    expect("approvalPolicySchema" in contracts).toBe(true);

    const manifest = {
      schema_version: "1.0",
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
          metadata: {
            path: ".agents/skills/qa-test-scope/SKILL.md",
          },
        },
        {
          id: "hook_delivery_accepted",
          type: "hook",
          name: "接收后准备提示词",
          summary: "delivery.accepted 后生成本地 Agent prompt",
          capabilities: ["prepare_prompt"],
          approval_mode: "prompt_only",
          enabled: true,
        },
      ],
      executor: {
        kind: "codex_cli",
        label: "Codex CLI",
        command: "codex",
        metadata: {
          workspace: "local",
        },
      },
      approval_policy: {
        mode: "manual_confirm",
        require_human_for: ["run_command", "write_file"],
      },
    };

    expect(
      contracts.registerAgentEndpointRequestSchema.safeParse(manifest).success,
    ).toBe(true);
    expect(
      contracts.handoffOverviewResponseSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        generated_at: "2026-06-24T00:00:00.000Z",
        agent_endpoints: [
          {
            ...manifest,
            schema_version: undefined,
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
      }).success,
    ).toBe(true);
  });

  it("keeps legacy endpoint registration valid with manifest defaults", () => {
    const result = handoffOverviewResponseSchema.safeParse({
      schema_version: "1.0",
      tenant_id: "local-demo",
      generated_at: "2026-06-24T00:00:00.000Z",
      agent_endpoints: [
        {
          tenant_id: "local-demo",
          user_id: "dev_user",
          role: "developer",
          agent_endpoint_id: "dev_codex_local",
          online: true,
          capabilities: ["generate_change_report"],
          execution_mode: "manual_confirm",
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
    });

    expect(result.success).toBe(true);
    expect(result.data?.agent_endpoints[0]?.capability_sources).toEqual([]);
    expect(result.data?.agent_endpoints[0]?.executor.kind).toBe(
      "manual_prompt",
    );
    expect(result.data?.agent_endpoints[0]?.approval_policy.mode).toBe(
      "manual_confirm",
    );
  });
});
