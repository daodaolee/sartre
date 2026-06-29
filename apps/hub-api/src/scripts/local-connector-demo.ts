import "reflect-metadata";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Test } from "@nestjs/testing";
import {
  ackDelivery,
  connectProfile,
  listenOnce,
  localDemoQaProfile,
  reportArtifact,
} from "@sartre/connector-core";
import { HandoffHubClient } from "@sartre/sdk";
import { AppModule } from "../app.module";

process.env.DATABASE_URL ??= "postgresql://xy@localhost:55432/sartre_hub";
process.env.SARTRE_TEST_RESET = "true";

const moduleRef = await Test.createTestingModule({
  imports: [AppModule],
}).compile();
const app = moduleRef.createNestApplication();

await app.init();
await app.listen(0, "127.0.0.1");

try {
  const baseUrl = await app.getUrl();
  const client = new HandoffHubClient({ baseUrl });
  const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-demo-"));

  await client.registerAgentEndpoint({
    schema_version: "1.0",
    tenant_id: "local-demo",
    user_id: "qa_user",
    role: "qa",
    agent_endpoint_id: "qa_codex_local",
    online: false,
    capabilities: ["read_handoff_pack", "write_artifact_report"],
    execution_mode: "manual_confirm",
  });

  const created = asHandoffCreated(
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
      title: "本地 Connector 提测演示",
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
    }),
  );

  assertEqual(
    created.delivery.status,
    "pending_delivery",
    "offline handoff should start as pending delivery",
  );

  const entries = await connectProfile({
    client,
    profile: { ...localDemoQaProfile, hubBaseUrl: baseUrl },
    workspaceDir,
  });
  const entry = entries[0];
  if (!entry) {
    throw new Error("Connector did not write an inbox entry");
  }

  const handoffMarkdown = await readFile(
    join(entry.path, "handoff.md"),
    "utf8",
  );
  if (
    !handoffMarkdown.includes(`ack ${created.delivery.id}`) ||
    !handoffMarkdown.includes(`report ${created.handoff.id}`)
  ) {
    throw new Error("handoff.md is missing ack/report instructions");
  }

  const acknowledged = asDeliveryAcknowledged(
    await ackDelivery({ client, deliveryId: created.delivery.id }),
  );
  assertEqual(
    acknowledged.delivery.status,
    "acknowledged",
    "ack command should acknowledge delivery",
  );

  const reportPath = join(workspaceDir, "qa-report.md");
  await writeFile(
    reportPath,
    "QA report: local connector demo passed.\n",
    "utf8",
  );
  const reported = asArtifactsReported(
    await reportArtifact({
      client,
      handoffId: created.handoff.id,
      filePath: reportPath,
    }),
  );
  if (
    !reported.artifacts.some((artifact) => artifact.name === "qa-report.md")
  ) {
    throw new Error("report command did not register qa-report.md");
  }

  const listenPromise = listenOnce({
    client,
    profile: { ...localDemoQaProfile, hubBaseUrl: baseUrl },
    workspaceDir,
    timeoutMs: 5_000,
  });
  await waitForSseSubscription();
  const liveCreated = asHandoffCreated(
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
      title: "本地 Connector SSE 演示",
      summary: "这条 handoff 应通过 listen --once 写入 inbox",
      pack: {
        entry: "handoff.md",
        artifacts: [
          {
            id: "artifact_sse_entry",
            name: "handoff.md",
            kind: "agent_readable_instruction",
            storage_url: "file://handoff.md",
            checksum: "sha256-sse-entry",
          },
        ],
      },
    }),
  );
  assertEqual(
    liveCreated.delivery.status,
    "delivered",
    "online handoff should be delivered immediately",
  );
  const liveEntry = await listenPromise;
  assertEqual(
    liveEntry.handoffId,
    liveCreated.handoff.id,
    "listenOnce should write the live SSE handoff",
  );

  console.log(
    JSON.stringify(
      {
        hub: baseUrl,
        workspaceDir,
        handoff: created.handoff.id,
        initial_delivery_status: created.delivery.status,
        inbox_entry: entry.handoffId,
        acknowledged_status: acknowledged.delivery.status,
        sse_delivery_status: liveCreated.delivery.status,
        sse_inbox_entry: liveEntry.handoffId,
        artifacts: reported.artifacts.map((artifact) => artifact.name),
      },
      null,
      2,
    ),
  );
} finally {
  await app.close();
}

type HandoffCreated = {
  handoff: { id: string };
  delivery: { id: string; status: string };
};

type DeliveryAcknowledged = {
  delivery: { id: string; status: string };
};

type ArtifactsReported = {
  artifacts: Array<{ name: string }>;
};

function asHandoffCreated(value: unknown): HandoffCreated {
  if (
    isRecord(value) &&
    isRecord(value.handoff) &&
    typeof value.handoff.id === "string" &&
    isRecord(value.delivery) &&
    typeof value.delivery.id === "string" &&
    typeof value.delivery.status === "string"
  ) {
    return {
      handoff: { id: value.handoff.id },
      delivery: {
        id: value.delivery.id,
        status: value.delivery.status,
      },
    };
  }
  throw new Error("Unexpected handoff creation response");
}

function asDeliveryAcknowledged(value: unknown): DeliveryAcknowledged {
  if (
    isRecord(value) &&
    isRecord(value.delivery) &&
    typeof value.delivery.id === "string" &&
    typeof value.delivery.status === "string"
  ) {
    return {
      delivery: {
        id: value.delivery.id,
        status: value.delivery.status,
      },
    };
  }
  throw new Error("Unexpected delivery acknowledgement response");
}

function asArtifactsReported(value: unknown): ArtifactsReported {
  if (
    isRecord(value) &&
    Array.isArray(value.artifacts) &&
    value.artifacts.every(
      (artifact) => isRecord(artifact) && typeof artifact.name === "string",
    )
  ) {
    return {
      artifacts: value.artifacts.map((artifact) => ({ name: artifact.name })),
    };
  }
  throw new Error("Unexpected artifact report response");
}

function assertEqual(actual: string, expected: string, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function waitForSseSubscription(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
