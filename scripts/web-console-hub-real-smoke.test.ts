import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { HandoffEnvelope } from "@sartre/contracts";
import { HandoffHubClient } from "@sartre/sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../apps/hub-api/src/app.module";
import { HandoffHttpExceptionFilter } from "../apps/hub-api/src/modules/handoff/interfaces/http/handoff-http-exception.filter";
import {
  createWebConsoleOperations,
  localDemoProfiles,
} from "../apps/web-console/src/hub-operations";
import {
  connectProfile,
  createFakeCodexExecutor,
  executeDelivery,
  localDemoQaProfile,
  writeHandoffToInbox,
} from "../packages/connector-core/src/index";

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.SARTRE_HUB_DATABASE_URL ??
  "postgresql://xy@localhost:55432/sartre_hub";

describe("Web Console real Hub smoke", () => {
  let app: INestApplication;
  let client: HandoffHubClient;
  const workspaceDirs: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.SARTRE_TEST_RESET = "true";

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new HandoffHttpExceptionFilter());
    await app.init();
    await app.listen(0, "127.0.0.1");

    client = new HandoffHubClient({ baseUrl: await app.getUrl() });
  }, 30_000);

  afterAll(async () => {
    await Promise.all(
      workspaceDirs.map((workspaceDir) =>
        rm(workspaceDir, { recursive: true, force: true }),
      ),
    );
    await app?.close();
  });

  it("drives Dev to QA handoff recovery through Web operations against a real Hub API", async () => {
    let latestOverview = await client.getOverview("local-demo");
    const operations = createWebConsoleOperations({
      client,
      refreshOverview: async () => {
        latestOverview = await client.getOverview("local-demo");
        return latestOverview;
      },
    });

    await expect(operations.registerActor("dev")).resolves.toMatchObject({
      status: "succeeded",
      detail: `已注册 ${localDemoProfiles.dev.agent_endpoint_id}`,
    });
    await expect(operations.registerActor("qa")).resolves.toMatchObject({
      status: "succeeded",
      detail: `已注册 ${localDemoProfiles.qa.agent_endpoint_id}`,
    });

    expect(latestOverview.agent_endpoints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agent_endpoint_id: localDemoProfiles.dev.agent_endpoint_id,
          online: true,
        }),
        expect.objectContaining({
          agent_endpoint_id: localDemoProfiles.qa.agent_endpoint_id,
          online: false,
        }),
      ]),
    );

    await expect(operations.createDemoHandoff()).resolves.toMatchObject({
      status: "succeeded",
    });

    const pendingDelivery = findQaDelivery(latestOverview);
    expect(pendingDelivery.status).toBe("pending_delivery");

    await expect(operations.replayActor("qa", 0)).resolves.toMatchObject({
      status: "succeeded",
      nextCursor: pendingDelivery.cursor,
    });

    await expect(operations.connectActor("qa", 0)).resolves.toMatchObject({
      status: "succeeded",
      nextCursor: pendingDelivery.cursor,
    });
    expect(findQaDelivery(latestOverview)).toMatchObject({
      id: pendingDelivery.id,
      status: "delivered",
    });

    await expect(
      operations.ackDelivery(pendingDelivery.id),
    ).resolves.toMatchObject({
      status: "succeeded",
      detail: `已确认 ${pendingDelivery.id}`,
    });

    expect(findQaDelivery(latestOverview)).toMatchObject({
      id: pendingDelivery.id,
      status: "acknowledged",
    });
    expect(latestOverview.timeline.map((event) => event.label)).toEqual(
      expect.arrayContaining(["Queued", "Redelivered", "Acknowledged"]),
    );
  }, 30_000);

  it("drives Dev to QA to fake Codex execution and sends the result back to Dev", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-web-full-loop-"));
    workspaceDirs.push(workspaceDir);
    let latestOverview = await client.getOverview("local-demo");
    const operations = createWebConsoleOperations({
      client,
      refreshOverview: async () => {
        latestOverview = await client.getOverview("local-demo");
        return latestOverview;
      },
    });

    await operations.registerActor("dev");
    await operations.registerActor("qa");
    await client.registerProviderModelProfile({
      schema_version: "1.0",
      tenant_id: "local-demo",
      agent_endpoint_id: localDemoProfiles.qa.agent_endpoint_id,
      provider: "codex",
      model: "gpt-5",
      label: "QA Codex Smoke",
      executor: {
        kind: "codex_cli",
        label: "Codex CLI",
        command: "codex",
      },
      capabilities: ["chat", "repo_context", "local_command"],
      context_window: 16000,
      max_output_tokens: 4096,
      default_for_endpoint: true,
      status: "available",
      metadata: {
        source: "web-console-real-smoke",
      },
    });

    await expect(
      operations.createTaskHandoff({
        actor: "dev",
        title: "checkout-flow-full-loop-smoke",
        description:
          "请质量使用 @qa.ui-regression-execution 验证 checkout flow，并把结果发送给开发。",
        descriptionHtml:
          "<p>请质量使用 @qa.ui-regression-execution 验证 checkout flow，并把结果发送给开发。</p>",
        targetActor: "qa",
        targetAgentEndpointId: localDemoProfiles.qa.agent_endpoint_id,
        attachments: [],
        capabilityReferences: [
          {
            mention: "@qa.ui-regression-execution",
            kind: "skill",
            label: "QA UI Regression",
            summary: "Run the reviewed UI regression workflow.",
            role: "qa",
            packId: "qa-falcocut-capability-pack",
            sourceProjectId: "ai-native-qa",
            targetId: "qa_skill_ui_regression_execution",
          },
        ],
      }),
    ).resolves.toMatchObject({ status: "succeeded" });

    const pendingDelivery = findDeliveryByTitle(
      latestOverview,
      "checkout-flow-full-loop-smoke",
    );
    expect(pendingDelivery.status).toBe("pending_delivery");

    const inboxEntries = await connectProfile({
      client,
      profile: localDemoQaProfile,
      workspaceDir,
      lastSeenCursor: 0,
    });
    expect(inboxEntries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          deliveryId: pendingDelivery.id,
        }),
      ]),
    );

    await client.acknowledgeDelivery(pendingDelivery.id);
    const accepted = await client.acceptDelivery(pendingDelivery.id, {
      schema_version: "1.0",
      actor_endpoint_id: localDemoProfiles.qa.agent_endpoint_id,
      reason: "人工确认后放行给 QA Codex Agent",
      metadata: {
        source: "web-console-real-smoke",
      },
    });
    const handoff = (
      (await client.getHandoff(pendingDelivery.handoff_id)) as {
        handoff: HandoffEnvelope;
      }
    ).handoff;
    await writeHandoffToInbox({
      workspaceDir,
      profile: localDemoQaProfile,
      handoff,
      delivery: accepted.delivery,
    });

    await expect(
      executeDelivery({
        client,
        profile: localDemoQaProfile,
        workspaceDir,
        deliveryId: pendingDelivery.id,
        executor: createFakeCodexExecutor({
          assistantOutput:
            "checkout flow smoke passed; 建议开发复核 Safari 支付按钮。",
          metadata: {
            source: "web-console-real-smoke",
          },
        }),
      }),
    ).resolves.toMatchObject({
      deliveryId: pendingDelivery.id,
      status: "report_ready",
    });

    latestOverview = await client.getOverview("local-demo");
    expect(latestOverview.timeline.map((event) => event.label)).toEqual(
      expect.arrayContaining(["Running", "Report ready"]),
    );

    await expect(
      operations.sendTaskReply({
        deliveryId: pendingDelivery.id,
        currentStatus: "report_ready",
        actorEndpointId: localDemoProfiles.qa.agent_endpoint_id,
        targetAgentEndpointId: localDemoProfiles.dev.agent_endpoint_id,
        content: "质量回传：checkout flow smoke passed，建议开发复核 Safari。",
        contentHtml:
          "<p>质量回传：checkout flow smoke passed，建议开发复核 Safari。</p>",
        attachments: [],
        closeTask: false,
      }),
    ).resolves.toMatchObject({
      status: "succeeded",
      detail: `已发送结果 ${pendingDelivery.id}`,
    });

    const returnedDelivery = findDeliveryByTitle(
      latestOverview,
      "checkout-flow-full-loop-smoke",
    );
    expect(returnedDelivery).toMatchObject({
      id: pendingDelivery.id,
      status: "report_ready",
      active_actor_endpoint_id: localDemoProfiles.qa.agent_endpoint_id,
      active_target_agent_endpoint_id: localDemoProfiles.dev.agent_endpoint_id,
    });
    expect(latestOverview.timeline.map((event) => event.label)).toEqual(
      expect.arrayContaining(["Result sent"]),
    );

    const devConversations = await client.getConversations({
      tenantId: "local-demo",
      endpointId: localDemoProfiles.dev.agent_endpoint_id,
    });
    expect(devConversations.conversations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "checkout-flow-full-loop-smoke",
        }),
      ]),
    );
  }, 30_000);
});

function findQaDelivery(
  overview: Awaited<ReturnType<HandoffHubClient["getOverview"]>>,
) {
  const delivery = overview.deliveries.find(
    (candidate) =>
      candidate.recipient_endpoint_id ===
        localDemoProfiles.qa.agent_endpoint_id &&
      candidate.title === "web-console-demo-handoff",
  );
  expect(delivery).toBeDefined();
  return delivery;
}

function findDeliveryByTitle(
  overview: Awaited<ReturnType<HandoffHubClient["getOverview"]>>,
  title: string,
) {
  const delivery = overview.deliveries.find(
    (candidate) => candidate.title === title,
  );
  expect(delivery).toBeDefined();
  return delivery;
}
