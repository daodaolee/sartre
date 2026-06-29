import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../app.module";
import { DatabaseService } from "./infrastructure/postgres/database.service";
import { HandoffHttpExceptionFilter } from "./interfaces/http/handoff-http-exception.filter";
import { HandoffEventsController } from "./interfaces/stream/handoff-events.controller";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://xy@localhost:55432/sartre_hub";

describe("Handoff Hub API", () => {
  let app: INestApplication;
  let database: DatabaseService;
  let events: HandoffEventsController;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.SARTRE_TEST_RESET = "true";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    database = moduleRef.get(DatabaseService);
    events = moduleRef.get(HandoffEventsController);
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HandoffHttpExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("delivers a pending Dev -> QA handoff when the QA endpoint reconnects", async () => {
    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "qa_user",
        role: "qa",
        agent_endpoint_id: "qa_codex_local",
        online: false,
        capabilities: [
          "read_handoff_pack",
          "generate_test_scope",
          "upload_artifact",
        ],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post("/handoffs")
      .send({
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
        summary: "请读取 handoff.md 并产出 QA report",
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
      })
      .expect(201);

    expect(created.body.handoff.status).toBe("created");
    expect(created.body.delivery.status).toBe("pending_delivery");

    await request(app.getHttpServer())
      .get(`/handoffs/${created.body.handoff.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.handoff).toMatchObject({
          id: created.body.handoff.id,
          title: "订单模块提测",
          summary: "请读取 handoff.md 并产出 QA report",
        });
        expect(body.handoff.pack.entry).toBe("handoff.md");
      });

    const reconnected = await request(app.getHttpServer())
      .post("/agent-endpoints/qa_codex_local/connect")
      .send({
        schema_version: "1.0",
        last_seen_cursor: 0,
      })
      .expect(200);

    expect(reconnected.body.events).toHaveLength(1);
    expect(reconnected.body.events[0].type).toBe("delivery.redelivered");
    expect(reconnected.body.delivery.status).toBe("delivered");

    const deliveryId = reconnected.body.delivery.id;
    await request(app.getHttpServer())
      .post(`/deliveries/${deliveryId}/ack`)
      .send({ schema_version: "1.0" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivery.status).toBe("acknowledged");
      });

    await request(app.getHttpServer())
      .post(`/handoffs/${created.body.handoff.id}/artifacts`)
      .send({
        schema_version: "1.0",
        artifact: {
          id: "artifact_qa_report",
          name: "qa-report.md",
          kind: "qa_to_dev_report",
          storage_url: "file://qa-report.md",
          checksum: "sha256-qa-report",
        },
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.artifacts).toContainEqual(
          expect.objectContaining({
            name: "qa-report.md",
            kind: "qa_to_dev_report",
          }),
        );
      });
  });

  it("wires the SSE controller to the event stream service", () => {
    const stream = events.stream("qa_codex_local");

    expect(stream).toBeDefined();
    expect(typeof stream.subscribe).toBe("function");
  });

  it("returns a tenant-scoped overview for Web Console", async () => {
    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "dev_user",
        role: "developer",
        agent_endpoint_id: "dev_codex_local",
        online: true,
        capabilities: ["generate_change_report"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "qa_user",
        role: "qa",
        agent_endpoint_id: "qa_codex_local",
        online: true,
        capabilities: ["read_handoff_pack", "upload_artifact"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post("/handoffs")
      .send({
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
        title: "checkout-flow-regression",
        summary: "Run QA smoke and return report",
        pack: {
          entry: "handoff.md",
          artifacts: [
            {
              id: "artifact_entry_overview",
              name: "handoff.md",
              kind: "agent_readable_instruction",
              storage_url: "file://handoff.md",
              checksum: "sha256-entry-overview",
            },
          ],
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/ack`)
      .send({ schema_version: "1.0" })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/handoffs/${created.body.handoff.id}/artifacts`)
      .send({
        schema_version: "1.0",
        artifact: {
          id: "artifact_qa_report_overview",
          name: "qa-report.md",
          kind: "qa_to_dev_report",
          storage_url: "file://qa-report.md",
          checksum: "sha256-qa-report-overview",
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .get("/overview?tenant_id=local-demo")
      .expect(200)
      .expect(({ body }) => {
        expect(body.schema_version).toBe("1.0");
        expect(body.tenant_id).toBe("local-demo");
        expect(body.agent_endpoints).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              agent_endpoint_id: "dev_codex_local",
              role: "developer",
              online: true,
            }),
            expect.objectContaining({
              agent_endpoint_id: "qa_codex_local",
              role: "qa",
              online: true,
            }),
          ]),
        );
        expect(body.handoffs).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: created.body.handoff.id,
              title: "checkout-flow-regression",
            }),
          ]),
        );
        expect(body.deliveries).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: created.body.delivery.id,
              status: "acknowledged",
              title: "checkout-flow-regression",
            }),
          ]),
        );
        expect(
          body.timeline.map((event: { label: string }) => event.label),
        ).toEqual(
          expect.arrayContaining([
            "Queued",
            "Delivered",
            "Acknowledged",
            "Report returned",
          ]),
        );
        expect(body.reports).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              name: "qa-report.md",
              kind: "qa_to_dev_report",
            }),
          ]),
        );
        expect(body.metrics.endpoint_total).toBe(2);
        expect(body.metrics.endpoint_online).toBe(2);
        expect(body.metrics.reports_returned).toBeGreaterThanOrEqual(1);
      });
  });

  it("allows Dev to accept a QA returned report for the next Agent run", async () => {
    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo-next-run",
        user_id: "dev_user",
        role: "developer",
        agent_endpoint_id: "dev_next_run_codex_local",
        online: true,
        capabilities: ["fix_bug"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo-next-run",
        user_id: "qa_user",
        role: "qa",
        agent_endpoint_id: "qa_next_run_codex_local",
        online: true,
        capabilities: ["test_scope"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post("/handoffs")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo-next-run",
        from: {
          user_id: "dev_user",
          role: "developer",
          agent_endpoint_id: "dev_next_run_codex_local",
        },
        to: {
          user_id: "qa_user",
          role: "qa",
          agent_endpoint_id: "qa_next_run_codex_local",
        },
        title: "checkout-flow-regression-next-run",
        summary: "Run QA smoke and return report",
        pack: {
          entry: "handoff.md",
          artifacts: [
            {
              id: "artifact_entry_next_run",
              name: "handoff.md",
              kind: "agent_readable_instruction",
              storage_url: "file://handoff-next-run.md",
              checksum: "sha256-entry-next-run",
            },
          ],
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/ack`)
      .send({ schema_version: "1.0" })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/accept`)
      .send({
        schema_version: "1.0",
        actor_endpoint_id: "qa_next_run_codex_local",
        reason: "质量接手",
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/report-ready`)
      .send({
        schema_version: "1.0",
        actor_endpoint_id: "qa_next_run_codex_local",
        reason: "质量发送检测结果给开发",
        metadata: {
          source: "web-console",
          actor_endpoint_id: "qa_next_run_codex_local",
          target_agent_endpoint_id: "dev_next_run_codex_local",
        },
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/accept`)
      .send({
        schema_version: "1.0",
        actor_endpoint_id: "dev_next_run_codex_local",
        reason: "开发接收质量回传后交给 Agent",
        metadata: {
          source: "web-console",
          actor_endpoint_id: "dev_next_run_codex_local",
        },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivery.status).toBe("accepted");
      });

    await request(app.getHttpServer())
      .get("/overview?tenant_id=local-demo-next-run")
      .expect(200)
      .expect(({ body }) => {
        expect(body.deliveries).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: created.body.delivery.id,
              active_actor_endpoint_id: "dev_next_run_codex_local",
            }),
          ]),
        );
      });
  });

  it("stores endpoint health reports and exposes the latest report in overview", async () => {
    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "qa_health_user",
        role: "qa",
        agent_endpoint_id: "qa_health_endpoint",
        online: true,
        capabilities: ["read_handoff_pack"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/agent-endpoints/qa_health_endpoint/health")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        checks: [
          {
            key: "executor",
            label: "Executor command",
            status: "blocked",
            detail: "Codex CLI unavailable",
            observed_at: "2026-06-23T00:00:00.000Z",
          },
          {
            key: "workspace",
            label: "Workspace",
            status: "warning",
            detail: "Workspace path needs confirmation",
            observed_at: "2026-06-23T00:00:01.000Z",
          },
        ],
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.endpoint_id).toBe("qa_health_endpoint");
        expect(body.checks).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              key: "executor",
              status: "blocked",
            }),
          ]),
        );
      });

    await request(app.getHttpServer())
      .get("/overview?tenant_id=local-demo")
      .expect(200)
      .expect(({ body }) => {
        expect(body.agent_endpoints).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              agent_endpoint_id: "qa_health_endpoint",
              health_report: expect.objectContaining({
                endpoint_id: "qa_health_endpoint",
                checks: expect.arrayContaining([
                  expect.objectContaining({
                    key: "executor",
                    status: "blocked",
                  }),
                ]),
              }),
            }),
          ]),
        );
      });
  });

  it("persists endpoint capability manifests and exposes legacy defaults", async () => {
    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "qa_manifest_user",
        role: "qa",
        agent_endpoint_id: "qa_manifest_endpoint",
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
        },
        approval_policy: {
          mode: "manual_confirm",
          require_human_for: ["run_command"],
          allow_auto_for: [],
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "dev_legacy_user",
        role: "developer",
        agent_endpoint_id: "dev_legacy_endpoint",
        online: true,
        capabilities: ["generate_change_report"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    await request(app.getHttpServer())
      .get("/overview?tenant_id=local-demo")
      .expect(200)
      .expect(({ body }) => {
        expect(body.agent_endpoints).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              agent_endpoint_id: "qa_manifest_endpoint",
              capability_sources: expect.arrayContaining([
                expect.objectContaining({
                  id: "skill_qa_test_scope",
                  type: "skill",
                }),
                expect.objectContaining({
                  id: "hook_delivery_accepted",
                  type: "hook",
                }),
              ]),
              executor: expect.objectContaining({
                kind: "codex_cli",
                command: "codex",
              }),
              approval_policy: expect.objectContaining({
                mode: "manual_confirm",
                require_human_for: ["run_command"],
              }),
            }),
            expect.objectContaining({
              agent_endpoint_id: "dev_legacy_endpoint",
              capability_sources: [],
              executor: expect.objectContaining({ kind: "manual_prompt" }),
              approval_policy: expect.objectContaining({
                mode: "manual_confirm",
              }),
            }),
          ]),
        );
      });
  });

  it("rejects missing endpoints and secret-looking endpoint health reports", async () => {
    await request(app.getHttpServer())
      .post("/agent-endpoints/missing_health_endpoint/health")
      .send({
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
      })
      .expect(404)
      .expect(({ body }) => {
        expect(body.error.category).toBe("Unavailable");
      });

    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "qa_secret_user",
        role: "qa",
        agent_endpoint_id: "qa_secret_endpoint",
        online: true,
        capabilities: ["read_handoff_pack"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/agent-endpoints/qa_secret_endpoint/health")
      .send({
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
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.category).toBe("InvalidInput");
      });
  });

  it("persists failed and expired delivery events for overview", async () => {
    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "qa_user_events",
        role: "qa",
        agent_endpoint_id: "qa_events_endpoint",
        online: true,
        capabilities: ["read_handoff_pack"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    const failedHandoff = await request(app.getHttpServer())
      .post("/handoffs")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        from: {
          user_id: "dev_user_events",
          role: "developer",
          agent_endpoint_id: "dev_events_endpoint",
        },
        to: {
          user_id: "qa_user_events",
          role: "qa",
          agent_endpoint_id: "qa_events_endpoint",
        },
        title: "failed delivery demo",
        summary: "Force a failed delivery",
        pack: {
          entry: "handoff.md",
          artifacts: [
            {
              id: "artifact_failed_entry",
              name: "handoff.md",
              kind: "agent_readable_instruction",
              storage_url: "file://failed-handoff.md",
              checksum: "sha256-failed-entry",
            },
          ],
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/deliveries/${failedHandoff.body.delivery.id}/fail`)
      .send({
        schema_version: "1.0",
        reason: "qa endpoint unreachable",
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivery.status).toBe("failed");
      });

    const expiredHandoff = await request(app.getHttpServer())
      .post("/handoffs")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        from: {
          user_id: "dev_user_events",
          role: "developer",
          agent_endpoint_id: "dev_events_endpoint",
        },
        to: {
          user_id: "qa_user_events",
          role: "qa",
          agent_endpoint_id: "qa_events_endpoint",
        },
        title: "expired delivery demo",
        summary: "Force an expired delivery",
        pack: {
          entry: "handoff.md",
          artifacts: [
            {
              id: "artifact_expired_entry",
              name: "handoff.md",
              kind: "agent_readable_instruction",
              storage_url: "file://expired-handoff.md",
              checksum: "sha256-expired-entry",
            },
          ],
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/deliveries/${expiredHandoff.body.delivery.id}/expire`)
      .send({
        schema_version: "1.0",
        reason: "ack deadline exceeded",
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivery.status).toBe("expired");
      });

    await request(app.getHttpServer())
      .post(`/deliveries/${expiredHandoff.body.delivery.id}/ack`)
      .send({ schema_version: "1.0" })
      .expect(400)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          schema_version: "1.0",
          error: {
            category: "InvalidInput",
          },
        });
        expect(body.error.message).toMatch(/expired to acknowledged/i);
      });

    const eventRows = await database.pool.query<{ type: string }>(
      `
        select type from delivery_events
        where delivery_id in ($1, $2)
        order by occurred_at asc, id asc
      `,
      [failedHandoff.body.delivery.id, expiredHandoff.body.delivery.id],
    );
    expect(eventRows.rows.map((row) => row.type)).toEqual(
      expect.arrayContaining(["delivery.failed", "delivery.expired"]),
    );

    await request(app.getHttpServer())
      .get("/overview?tenant_id=local-demo")
      .expect(200)
      .expect(({ body }) => {
        expect(body.metrics.failed_deliveries).toBeGreaterThanOrEqual(1);
        expect(
          body.timeline.map((event: { label: string }) => event.label),
        ).toEqual(expect.arrayContaining(["Failed", "Expired"]));
      });
  });

  it("persists recipient release, execution start, report-ready, and send-back lifecycle events", async () => {
    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "dev_lifecycle_user",
        role: "developer",
        agent_endpoint_id: "dev_lifecycle_endpoint",
        online: true,
        capabilities: ["generate_change_report"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "qa_lifecycle_user",
        role: "qa",
        agent_endpoint_id: "qa_lifecycle_endpoint",
        online: true,
        capabilities: ["read_handoff_pack", "upload_artifact"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post("/handoffs")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        from: {
          user_id: "dev_lifecycle_user",
          role: "developer",
          agent_endpoint_id: "dev_lifecycle_endpoint",
        },
        to: {
          user_id: "qa_lifecycle_user",
          role: "qa",
          agent_endpoint_id: "qa_lifecycle_endpoint",
        },
        title: "checkout-flow-lifecycle",
        summary: "请验证任务创建到结果回传闭环",
        pack: {
          entry: "handoff.md",
          artifacts: [
            {
              id: "artifact_lifecycle_entry",
              name: "handoff.md",
              kind: "agent_readable_instruction",
              storage_url: "file://lifecycle-handoff.md",
              checksum: "sha256-lifecycle-entry",
            },
          ],
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/ack`)
      .send({ schema_version: "1.0" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivery.status).toBe("acknowledged");
      });

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/accept`)
      .send({
        schema_version: "1.0",
        actor_endpoint_id: "qa_lifecycle_endpoint",
        reason: "人工确认后放行给 QA Agent",
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivery.status).toBe("accepted");
      });

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/start`)
      .send({
        schema_version: "1.0",
        actor_endpoint_id: "qa_lifecycle_endpoint",
        reason: "QA Agent 开始执行本地 Codex",
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivery.status).toBe("running");
      });

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/report-ready`)
      .send({
        schema_version: "1.0",
        actor_endpoint_id: "qa_lifecycle_endpoint",
        reason: "QA Agent 已生成报告，等待人工发送",
        artifact_ids: ["artifact_lifecycle_report"],
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivery.status).toBe("report_ready");
      });

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/send-result`)
      .send({
        schema_version: "1.0",
        actor_endpoint_id: "qa_lifecycle_endpoint",
        reason: "人工发送给开发 Agent",
        metadata: {
          target_agent_endpoint_id: "dev_lifecycle_endpoint",
        },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivery.status).toBe("report_ready");
      });

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/close`)
      .send({
        schema_version: "1.0",
        actor_endpoint_id: "qa_lifecycle_endpoint",
        reason: "人工检查后发送给开发",
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivery.status).toBe("closed");
      });

    const eventRows = await database.pool.query<{
      type: string;
      payload: { actor_endpoint_id?: string; status_to?: string };
    }>(
      `
        select type, payload from delivery_events
        where delivery_id = $1
          and type in ('delivery.accepted', 'delivery.running', 'delivery.report_ready', 'delivery.result_sent', 'delivery.closed')
        order by occurred_at asc, id asc
      `,
      [created.body.delivery.id],
    );
    expect(eventRows.rows).toEqual([
      expect.objectContaining({
        type: "delivery.accepted",
        payload: expect.objectContaining({
          actor_endpoint_id: "qa_lifecycle_endpoint",
          status_to: "accepted",
        }),
      }),
      expect.objectContaining({
        type: "delivery.running",
        payload: expect.objectContaining({
          actor_endpoint_id: "qa_lifecycle_endpoint",
          status_to: "running",
        }),
      }),
      expect.objectContaining({
        type: "delivery.report_ready",
        payload: expect.objectContaining({
          actor_endpoint_id: "qa_lifecycle_endpoint",
          status_to: "report_ready",
        }),
      }),
      expect.objectContaining({
        type: "delivery.result_sent",
        payload: expect.objectContaining({
          actor_endpoint_id: "qa_lifecycle_endpoint",
          status_from: "report_ready",
          status_to: "report_ready",
          metadata: expect.objectContaining({
            target_agent_endpoint_id: "dev_lifecycle_endpoint",
          }),
        }),
      }),
      expect.objectContaining({
        type: "delivery.closed",
        payload: expect.objectContaining({
          actor_endpoint_id: "qa_lifecycle_endpoint",
          status_to: "closed",
        }),
      }),
    ]);

    await request(app.getHttpServer())
      .get("/overview?tenant_id=local-demo")
      .expect(200)
      .expect(({ body }) => {
        expect(body.deliveries).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: created.body.delivery.id,
              status: "closed",
            }),
          ]),
        );
        expect(
          body.timeline.map((event: { label: string }) => event.label),
        ).toEqual(
          expect.arrayContaining([
            "Accepted",
            "Running",
            "Report ready",
            "Result sent",
            "Closed",
          ]),
        );
      });
  });

  it("rejects starting a delivered delivery before human release", async () => {
    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "qa_start_guard_user",
        role: "qa",
        agent_endpoint_id: "qa_start_guard_endpoint",
        online: true,
        capabilities: ["read_handoff_pack"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post("/handoffs")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        from: {
          user_id: "dev_start_guard_user",
          role: "developer",
          agent_endpoint_id: "dev_start_guard_endpoint",
        },
        to: {
          user_id: "qa_start_guard_user",
          role: "qa",
          agent_endpoint_id: "qa_start_guard_endpoint",
        },
        title: "start guard demo",
        summary: "Start must wait for human release",
        pack: {
          entry: "handoff.md",
          artifacts: [
            {
              id: "artifact_start_guard_entry",
              name: "handoff.md",
              kind: "agent_readable_instruction",
              storage_url: "file://start-guard.md",
              checksum: "sha256-start-guard-entry",
            },
          ],
        },
      })
      .expect(201);

    expect(created.body.delivery.status).toBe("delivered");

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/start`)
      .send({
        schema_version: "1.0",
        actor_endpoint_id: "qa_start_guard_endpoint",
        reason: "尝试绕过人工放行",
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.error.category).toBe("InvalidInput");
        expect(body.error.message).toMatch(/delivered to running/i);
      });
  });

  it("auto-acknowledges delivered tasks when the recipient releases them to an agent", async () => {
    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "qa_release_user",
        role: "qa",
        agent_endpoint_id: "qa_release_endpoint",
        online: true,
        capabilities: ["read_handoff_pack", "upload_artifact"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post("/handoffs")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        from: {
          user_id: "dev_release_user",
          role: "developer",
          agent_endpoint_id: "dev_release_endpoint",
        },
        to: {
          user_id: "qa_release_user",
          role: "qa",
          agent_endpoint_id: "qa_release_endpoint",
        },
        title: "release-without-manual-ack",
        summary: "用户点击执行/放行时应自动确认收到再放行",
        pack: {
          entry: "handoff.md",
          artifacts: [
            {
              id: "artifact_release_entry",
              name: "handoff.md",
              kind: "agent_readable_instruction",
              storage_url: "file://release-handoff.md",
              checksum: "sha256-release-entry",
            },
          ],
        },
      })
      .expect(201);

    expect(created.body.delivery.status).toBe("delivered");

    await request(app.getHttpServer())
      .post(`/deliveries/${created.body.delivery.id}/accept`)
      .send({
        schema_version: "1.0",
        actor_endpoint_id: "qa_release_endpoint",
        reason: "人工确认后放行给 QA Agent",
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.delivery.status).toBe("accepted");
        expect(body.delivery.acknowledgedAt).toEqual(expect.any(String));
      });

    const eventRows = await database.pool.query<{
      type: string;
      payload: { actor_endpoint_id?: string; status_to?: string };
    }>(
      `
        select type, payload from delivery_events
        where delivery_id = $1
          and type in ('delivery.acknowledged', 'delivery.accepted')
      `,
      [created.body.delivery.id],
    );
    expect(eventRows.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "delivery.acknowledged" }),
        expect.objectContaining({
          type: "delivery.accepted",
          payload: expect.objectContaining({
            actor_endpoint_id: "qa_release_endpoint",
            status_to: "accepted",
          }),
        }),
      ]),
    );
  });

  it("returns a classified 404 for missing delivery commands", async () => {
    await request(app.getHttpServer())
      .post("/deliveries/delivery_missing/fail")
      .send({
        schema_version: "1.0",
        reason: "missing delivery",
      })
      .expect(404)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          schema_version: "1.0",
          error: {
            category: "Unavailable",
          },
        });
        expect(body.error.message).toMatch(/delivery_missing/i);
      });
  });

  it("replays endpoint delivery events after a cursor", async () => {
    await request(app.getHttpServer())
      .post("/agent-endpoints")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        user_id: "qa_replay_user",
        role: "qa",
        agent_endpoint_id: "qa_replay_endpoint",
        online: true,
        capabilities: ["read_handoff_pack"],
        execution_mode: "manual_confirm",
      })
      .expect(201);

    const created = await request(app.getHttpServer())
      .post("/handoffs")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        from: {
          user_id: "dev_replay_user",
          role: "developer",
          agent_endpoint_id: "dev_replay_endpoint",
        },
        to: {
          user_id: "qa_replay_user",
          role: "qa",
          agent_endpoint_id: "qa_replay_endpoint",
        },
        title: "replay demo",
        summary: "Replay persisted lifecycle events",
        pack: {
          entry: "handoff.md",
          artifacts: [
            {
              id: "artifact_replay_entry",
              name: "handoff.md",
              kind: "agent_readable_instruction",
              storage_url: "file://replay-handoff.md",
              checksum: "sha256-replay-entry",
            },
          ],
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(
        "/events/replay?tenant_id=local-demo&endpoint_id=qa_replay_endpoint&after_cursor=0",
      )
      .expect(200)
      .expect(({ body }) => {
        expect(body.schema_version).toBe("1.0");
        expect(body.events).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              type: "delivery.delivered",
              delivery_id: created.body.delivery.id,
              cursor: created.body.delivery.cursor,
            }),
          ]),
        );
      });

    await request(app.getHttpServer())
      .get(
        `/events/replay?tenant_id=local-demo&endpoint_id=qa_replay_endpoint&after_cursor=${created.body.delivery.cursor}`,
      )
      .expect(200)
      .expect(({ body }) => {
        expect(body.events).toHaveLength(0);
      });
  });
});
