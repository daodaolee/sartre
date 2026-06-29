import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { AppModule } from "../app.module";
import { HandoffApplicationService } from "../modules/handoff/application/handoff-application.service";

process.env.DATABASE_URL ??= "postgresql://xy@localhost:55432/sartre_hub";
process.env.SARTRE_TEST_RESET = "true";

const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
}).compile();

await moduleRef.init();

try {
  const handoffs = moduleRef.get(HandoffApplicationService);

  await handoffs.registerAgentEndpoint({
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
  });

  const created = await handoffs.createHandoff({
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
    title: "本地双身份提测演示",
    summary: "请读取 handoff.md 并产出 qa-report.md",
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

  const reconnected = await handoffs.connectAgentEndpoint("qa_codex_local", {
    schema_version: "1.0",
    last_seen_cursor: 0,
  });

  const delivery = reconnected.delivery;
  if (!delivery) {
    throw new Error("Expected delivery to be redelivered");
  }

  const acknowledged = await handoffs.acknowledgeDelivery(delivery.id);
  const artifacts = await handoffs.addArtifact(created.handoff.id, {
    id: "artifact_qa_report",
    name: "qa-report.md",
    kind: "qa_to_dev_report",
    storageUrl: "file://qa-report.md",
    checksum: "sha256-qa-report",
  });

  console.log(
    JSON.stringify(
      {
        handoff: created.handoff.id,
        initial_delivery_status: created.delivery.status,
        redelivery_status: delivery.status,
        acknowledged_status: acknowledged.status,
        artifacts: artifacts.map((artifact) => artifact.name),
      },
      null,
      2,
    ),
  );
} finally {
  await moduleRef.close();
}
