import { describe, expect, it } from "vitest";
import {
  appendConversationMessageRequestSchema,
  contextProjectionSchema,
  conversationDetailResponseSchema,
  conversationLedgerSchema,
  conversationListResponseSchema,
  conversationReferenceSchema,
  createContextProjectionRequestSchema,
  createConversationRequestSchema,
  createSummaryCheckpointRequestSchema,
  modelRunSchema,
  recordModelRunRequestSchema,
  recordToolInvocationRequestSchema,
  summaryCheckpointSchema,
  toolInvocationRecordSchema,
} from "./index";

const createdAt = "2026-06-25T10:00:00.000Z";

describe("platform chat runtime contracts", () => {
  it("accepts a provider-neutral conversation ledger without provider session id", () => {
    const result = conversationLedgerSchema.safeParse({
      id: "conversation_1",
      schema_version: "1.0",
      tenant_id: "local-demo",
      title: "订单模块联调",
      owner_endpoint_id: "dev_codex_local",
      participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
      status: "active",
      created_at: createdAt,
      updated_at: createdAt,
      metadata: { source: "web-console" },
    });

    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("provider_session_id");
  });

  it("accepts ordered messages with structured handoff artifact references", () => {
    const reference = conversationReferenceSchema.parse({
      id: "reference_1",
      type: "artifact",
      target_id: "artifact_change_report",
      label: "change-report.md",
      metadata: { handoff_id: "handoff_1" },
    });

    const result = appendConversationMessageRequestSchema.safeParse({
      schema_version: "1.0",
      tenant_id: "local-demo",
      conversation_id: "conversation_1",
      author_endpoint_id: "dev_codex_local",
      role: "user",
      content: "请基于这个变更报告准备测试范围。",
      references: [reference],
      metadata: { source: "web-console" },
    });

    expect(result.success).toBe(true);
  });

  it("accepts tool invocations, summary checkpoints, model runs, and context projections", () => {
    expect(
      toolInvocationRecordSchema.safeParse({
        id: "tool_invocation_1",
        conversation_id: "conversation_1",
        source_message_id: "message_1",
        tool_name: "read_handoff_pack",
        status: "succeeded",
        input_summary: "读取 handoff 入口文件",
        output_summary: "找到 2 个关联 artifact",
        created_at: createdAt,
        updated_at: createdAt,
      }).success,
    ).toBe(true);

    expect(
      summaryCheckpointSchema.safeParse({
        id: "summary_1",
        conversation_id: "conversation_1",
        author_endpoint_id: "qa_codex_local",
        covered_message_start_seq: 1,
        covered_message_end_seq: 4,
        summary: "开发已提交订单模块改动，质量准备测试范围。",
        created_at: createdAt,
      }).success,
    ).toBe(true);

    const projection = contextProjectionSchema.parse({
      id: "projection_1",
      conversation_id: "conversation_1",
      provider: "openai-compatible",
      model: "codex-local",
      source_message_ids: ["message_1", "message_2"],
      summary_checkpoint_ids: ["summary_1"],
      reference_ids: ["reference_1"],
      token_budget: 12000,
      rendered_context: "## 历史上下文\n开发已提交订单模块改动。",
      created_at: createdAt,
    });

    expect(
      modelRunSchema.safeParse({
        id: "model_run_1",
        conversation_id: "conversation_1",
        context_projection_id: projection.id,
        executor_endpoint_id: "qa_codex_local",
        provider: projection.provider,
        model: projection.model,
        status: "succeeded",
        started_at: createdAt,
        completed_at: createdAt,
        metadata: { provider_session_kind: "none" },
      }).success,
    ).toBe(true);
  });

  it("accepts command schemas for the first Hub API slice", () => {
    expect(
      createConversationRequestSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        title: "订单模块联调",
        owner_endpoint_id: "dev_codex_local",
        participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
        metadata: { source: "web-console" },
      }).success,
    ).toBe(true);

    expect(
      recordToolInvocationRequestSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: "conversation_1",
        source_message_id: "message_1",
        tool_name: "read_handoff_pack",
        status: "succeeded",
        input_summary: "读取交接包",
        output_summary: "读取成功",
      }).success,
    ).toBe(true);

    expect(
      createSummaryCheckpointRequestSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: "conversation_1",
        author_endpoint_id: "qa_codex_local",
        covered_message_start_seq: 1,
        covered_message_end_seq: 2,
        summary: "已确认测试范围。",
      }).success,
    ).toBe(true);

    expect(
      createContextProjectionRequestSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: "conversation_1",
        provider: "anthropic",
        model: "claude-code",
        source_message_ids: ["message_1"],
        summary_checkpoint_ids: ["summary_1"],
        reference_ids: ["reference_1"],
        token_budget: 16000,
        rendered_context: "## 历史上下文\n已确认测试范围。",
      }).success,
    ).toBe(true);

    expect(
      recordModelRunRequestSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: "conversation_1",
        context_projection_id: "projection_1",
        executor_endpoint_id: "qa_codex_local",
        provider: "anthropic",
        model: "claude-code",
        status: "queued",
      }).success,
    ).toBe(true);
  });

  it("rejects secret-like metadata in chat runtime contracts", () => {
    const result = createConversationRequestSchema.safeParse({
      schema_version: "1.0",
      tenant_id: "local-demo",
      title: "泄露检查",
      owner_endpoint_id: "dev_codex_local",
      participant_endpoint_ids: ["dev_codex_local"],
      metadata: { api_key: "sk-secret-value" },
    });

    expect(result.success).toBe(false);
  });

  it("accepts list and detail projections for Web Console", () => {
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

    expect(
      conversationListResponseSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "dev_codex_local",
        conversations: [
          {
            ...conversation,
            latest_message: message,
            message_count: 1,
            latest_projection: null,
          },
        ],
      }).success,
    ).toBe(true);

    expect(
      conversationDetailResponseSchema.safeParse({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation,
        messages: [message],
        tool_invocations: [],
        summary_checkpoints: [],
        model_runs: [],
        context_projections: [],
      }).success,
    ).toBe(true);
  });
});
