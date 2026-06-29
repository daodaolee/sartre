import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../app.module";
import { DatabaseService } from "../handoff/infrastructure/postgres/database.service";
import { HandoffHttpExceptionFilter } from "../handoff/interfaces/http/handoff-http-exception.filter";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://xy@localhost:55432/sartre_hub";

describe("Platform Chat Runtime API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.SARTRE_TEST_RESET = "true";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    moduleRef.get(DatabaseService);
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HandoffHttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("persists a provider-neutral conversation ledger and ordered messages", async () => {
    const conversation = await request(app.getHttpServer())
      .post("/conversations")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        title: "订单模块联调",
        owner_endpoint_id: "dev_codex_local",
        participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
      })
      .expect(201);

    expect(conversation.body).toMatchObject({
      schema_version: "1.0",
      tenant_id: "local-demo",
      title: "订单模块联调",
      owner_endpoint_id: "dev_codex_local",
      participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
      status: "active",
    });
    expect(conversation.body).not.toHaveProperty("provider_session_id");

    const message = await request(app.getHttpServer())
      .post(`/conversations/${conversation.body.id}/messages`)
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: conversation.body.id,
        author_endpoint_id: "dev_codex_local",
        role: "user",
        content: "请基于交接包准备测试范围。",
        references: [
          {
            id: "reference_1",
            type: "artifact",
            target_id: "artifact_change_report",
            label: "change-report.md",
          },
        ],
      })
      .expect(201);

    expect(message.body).toMatchObject({
      conversation_id: conversation.body.id,
      seq: 1,
      role: "user",
      references: [
        expect.objectContaining({
          type: "artifact",
          target_id: "artifact_change_report",
        }),
      ],
    });

    const secondMessage = await request(app.getHttpServer())
      .post(`/conversations/${conversation.body.id}/messages`)
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: conversation.body.id,
        author_endpoint_id: "qa_codex_local",
        role: "assistant",
        content: "已准备测试范围，等待人工确认。",
      })
      .expect(201);

    expect(secondMessage.body.seq).toBe(2);
  });

  it("records projections and model runs while keeping provider data off the ledger identity", async () => {
    const conversation = await request(app.getHttpServer())
      .post("/conversations")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        title: "模型切换验证",
        owner_endpoint_id: "dev_codex_local",
        participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
      })
      .expect(201);

    const message = await request(app.getHttpServer())
      .post(`/conversations/${conversation.body.id}/messages`)
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: conversation.body.id,
        author_endpoint_id: "dev_codex_local",
        role: "user",
        content: "先用 Codex，再切 Claude。",
      })
      .expect(201);

    const summary = await request(app.getHttpServer())
      .post(`/conversations/${conversation.body.id}/summary-checkpoints`)
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: conversation.body.id,
        author_endpoint_id: "dev_codex_local",
        covered_message_start_seq: 1,
        covered_message_end_seq: 1,
        summary: "用户要求验证模型切换上下文连续性。",
      })
      .expect(201);

    const projection = await request(app.getHttpServer())
      .post(`/conversations/${conversation.body.id}/context-projections`)
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: conversation.body.id,
        provider: "anthropic",
        model: "claude-code",
        source_message_ids: [message.body.id],
        summary_checkpoint_ids: [summary.body.id],
        reference_ids: [],
        token_budget: 16000,
        rendered_context: "## 历史上下文\n用户要求验证模型切换上下文连续性。",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/conversations/${conversation.body.id}/model-runs`)
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: conversation.body.id,
        context_projection_id: projection.body.id,
        executor_endpoint_id: "qa_codex_local",
        provider: "anthropic",
        model: "claude-code",
        status: "queued",
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/conversations/${conversation.body.id}?tenant_id=local-demo`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.conversation.id).toBe(conversation.body.id);
        expect(body.conversation).not.toHaveProperty("provider_session_id");
        expect(body.messages.map((item: { seq: number }) => item.seq)).toEqual([
          1,
        ]);
        expect(body.summary_checkpoints[0]).toMatchObject({
          id: summary.body.id,
          covered_message_start_seq: 1,
        });
        expect(body.context_projections[0]).toMatchObject({
          id: projection.body.id,
          provider: "anthropic",
          source_message_ids: [message.body.id],
          summary_checkpoint_ids: [summary.body.id],
        });
        expect(body.model_runs[0]).toMatchObject({
          conversation_id: conversation.body.id,
          context_projection_id: projection.body.id,
          provider: "anthropic",
          model: "claude-code",
        });
      });
  });

  it("persists capability references and renders them into context projections", async () => {
    const conversation = await request(app.getHttpServer())
      .post("/conversations")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        title: "能力引用验证",
        owner_endpoint_id: "dev_codex_local",
        participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
      })
      .expect(201);

    const message = await request(app.getHttpServer())
      .post(`/conversations/${conversation.body.id}/messages`)
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: conversation.body.id,
        author_endpoint_id: "dev_codex_local",
        role: "user",
        content: "请使用 @qa.ui-regression-execution 执行回归。",
        references: [
          {
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
          },
        ],
      })
      .expect(201);

    const projection = await request(app.getHttpServer())
      .post(`/conversations/${conversation.body.id}/context-projections`)
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        conversation_id: conversation.body.id,
        provider: "sartre",
        model: "role-capability-context",
        source_message_ids: [message.body.id],
        summary_checkpoint_ids: [],
        reference_ids: ["qa_skill_ui_regression_execution"],
        token_budget: 16000,
        rendered_context:
          "## 能力引用\n@qa.ui-regression-execution: Run reviewed UI regression.",
        metadata: {
          projection_mode: "capability_reference_context",
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/conversations/${conversation.body.id}?tenant_id=local-demo`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.messages[0].references).toEqual([
          expect.objectContaining({
            type: "capability",
            target_id: "qa_skill_ui_regression_execution",
            metadata: expect.objectContaining({
              mention: "@qa.ui-regression-execution",
              pack_id: "qa-falcocut-capability-pack",
            }),
          }),
        ]);
        expect(body.context_projections[0]).toMatchObject({
          id: projection.body.id,
          reference_ids: ["qa_skill_ui_regression_execution"],
          rendered_context: expect.stringContaining(
            "@qa.ui-regression-execution",
          ),
          metadata: {
            projection_mode: "capability_reference_context",
          },
        });
      });
  });

  it("returns endpoint-scoped conversation lists", async () => {
    await request(app.getHttpServer())
      .post("/conversations")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        title: "开发与质量联调",
        owner_endpoint_id: "dev_codex_local",
        participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/conversations")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        title: "只属于产品",
        owner_endpoint_id: "pm_codex_local",
        participant_endpoint_ids: ["pm_codex_local"],
      })
      .expect(201);

    await request(app.getHttpServer())
      .get("/conversations?tenant_id=local-demo&endpoint_id=qa_codex_local")
      .expect(200)
      .expect(({ body }) => {
        expect(body.endpoint_id).toBe("qa_codex_local");
        expect(body.conversations).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              title: "开发与质量联调",
              participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
            }),
          ]),
        );
        expect(body.conversations).not.toEqual([
          expect.objectContaining({
            title: "只属于产品",
          }),
        ]);
      });
  });
});
