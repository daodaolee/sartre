import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../../app.module";
import { DatabaseService } from "../handoff/infrastructure/postgres/database.service";
import { HandoffHttpExceptionFilter } from "../handoff/interfaces/http/handoff-http-exception.filter";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://xy@localhost:55432/sartre_hub";
const observedAt = "2026-06-25T11:00:00.000Z";

describe("Provider Model Registry API", () => {
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

  it("upserts profiles, records health, and returns endpoint-scoped registry lists", async () => {
    const first = await request(app.getHttpServer())
      .post("/provider-model-registry/profiles")
      .send(profilePayload({ label: "QA Claude Code" }))
      .expect(201);

    expect(first.body).toMatchObject({
      schema_version: "1.0",
      tenant_id: "local-demo",
      agent_endpoint_id: "qa_codex_local",
      provider: "anthropic",
      model: "claude-code",
      label: "QA Claude Code",
      default_for_endpoint: true,
      status: "available",
    });
    expect(first.body).not.toHaveProperty("api_key");
    expect(first.body).not.toHaveProperty("provider_session_id");

    const updated = await request(app.getHttpServer())
      .post("/provider-model-registry/profiles")
      .send(profilePayload({ label: "QA Claude Code Stable" }))
      .expect(201);

    expect(updated.body.id).toBe(first.body.id);
    expect(updated.body.label).toBe("QA Claude Code Stable");

    await request(app.getHttpServer())
      .post("/provider-model-registry/profiles")
      .send(
        profilePayload({
          agentEndpointId: "dev_codex_local",
          provider: "codex",
          model: "codex-cli",
          label: "Dev Codex CLI",
          executorKind: "codex_cli",
        }),
      )
      .expect(201);

    const health = await request(app.getHttpServer())
      .post(`/provider-model-registry/profiles/${first.body.id}/health`)
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        profile_id: first.body.id,
        status: "passed",
        checks: [
          {
            key: "command",
            label: "Executor command",
            status: "passed",
            detail: "Claude Code is available",
            observed_at: observedAt,
          },
        ],
      })
      .expect(201);

    expect(health.body).toMatchObject({
      profile_id: first.body.id,
      status: "passed",
      checks: [expect.objectContaining({ key: "command" })],
    });

    await request(app.getHttpServer())
      .get(
        "/provider-model-registry?tenant_id=local-demo&endpoint_id=qa_codex_local",
      )
      .expect(200)
      .expect(({ body }) => {
        expect(body.endpoint_id).toBe("qa_codex_local");
        expect(body.default_profile_id).toBe(first.body.id);
        expect(body.profiles).toEqual([
          expect.objectContaining({
            id: first.body.id,
            label: "QA Claude Code Stable",
            latest_health: expect.objectContaining({ status: "passed" }),
          }),
        ]);
        expect(body.profiles).not.toEqual([
          expect.objectContaining({ agent_endpoint_id: "dev_codex_local" }),
        ]);
      });
  });

  it("resolves compatible default and preferred provider model selections", async () => {
    const profile = await request(app.getHttpServer())
      .post("/provider-model-registry/profiles")
      .send(profilePayload({ defaultForEndpoint: true }))
      .expect(201);

    await request(app.getHttpServer())
      .post("/provider-model-registry/resolve")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        required_capabilities: ["chat", "tool_use"],
        min_context_window: 16000,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.selected_profile_id).toBe(profile.body.id);
        expect(body.selection_reason).toBe("default_profile_matched");
      });

    await request(app.getHttpServer())
      .post("/provider-model-registry/resolve")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        preferred_provider: "anthropic",
        preferred_model: "claude-code",
        required_capabilities: ["chat"],
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.selected_profile_id).toBe(profile.body.id);
        expect(body.selection_reason).toBe("preferred_profile_matched");
      });
  });

  it("returns classified unavailable when no compatible profile exists", async () => {
    await request(app.getHttpServer())
      .post("/provider-model-registry/profiles")
      .send(
        profilePayload({
          capabilities: ["chat"],
          defaultForEndpoint: true,
          status: "blocked",
        }),
      )
      .expect(201);

    await request(app.getHttpServer())
      .post("/provider-model-registry/resolve")
      .send({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        required_capabilities: ["tool_use"],
      })
      .expect(404)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          schema_version: "1.0",
          error: {
            category: "Unavailable",
          },
        });
      });
  });
});

function profilePayload(
  overrides: Partial<{
    agentEndpointId: string;
    provider: string;
    model: string;
    label: string;
    executorKind: "codex_cli" | "claude_code";
    capabilities: Array<"chat" | "streaming" | "tool_use">;
    defaultForEndpoint: boolean;
    status: "available" | "blocked";
  }> = {},
) {
  const provider = overrides.provider ?? "anthropic";
  const model = overrides.model ?? "claude-code";
  const executorKind = overrides.executorKind ?? "claude_code";

  return {
    schema_version: "1.0",
    tenant_id: "local-demo",
    agent_endpoint_id: overrides.agentEndpointId ?? "qa_codex_local",
    provider,
    model,
    label: overrides.label ?? "QA Claude Code",
    executor: {
      kind: executorKind,
      label: executorKind === "codex_cli" ? "Codex CLI" : "Claude Code",
      command: executorKind === "codex_cli" ? "codex" : "claude",
    },
    capabilities: overrides.capabilities ?? ["chat", "streaming", "tool_use"],
    context_window: 200000,
    max_output_tokens: 8192,
    default_for_endpoint: overrides.defaultForEndpoint ?? true,
    status: overrides.status ?? "available",
    metadata: {
      source: "provider-registry-e2e",
      provider_model: `${provider}/${model}`,
    },
  };
}
