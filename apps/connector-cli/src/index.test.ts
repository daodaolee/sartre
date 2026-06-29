import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ackDelivery,
  createFakeCodexExecutor,
  listInbox,
  localDemoDevProfile,
  localDemoQaProfile,
  profileToText,
  reportArtifact,
  runConnectorCli,
  runTrialHandoff,
  writeHandoffToInbox,
} from "./index";

const handoff = {
  id: "handoff_1",
  schema_version: "1.0" as const,
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
  status: "delivered" as const,
  created_at: "2026-06-22T09:00:00.000Z",
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
};

async function createExecutionScenario() {
  const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));
  const output: string[] = [];
  await writeHandoffToInbox({
    workspaceDir,
    profile: localDemoQaProfile,
    handoff,
    delivery: {
      id: "delivery_1",
      handoffId: "handoff_1",
      recipientEndpointId: "qa_codex_local",
      cursor: 1,
      status: "accepted",
      deliveredAt: "2026-06-22T09:00:01.000Z",
      acknowledgedAt: "2026-06-22T09:00:02.000Z",
    },
  });
  const providerProfile = {
    id: "profile_codex_qa_default",
    schema_version: "1.0",
    tenant_id: "local-demo",
    agent_endpoint_id: "qa_codex_local",
    provider: "codex",
    model: "gpt-5",
    label: "Codex GPT-5",
    executor: {
      kind: "codex_cli",
      label: "Codex CLI",
      command: "codex",
    },
    capabilities: ["chat", "tool_use"],
    context_window: 16000,
    max_output_tokens: 4096,
    default_for_endpoint: true,
    status: "available" as const,
    created_at: "2026-06-25T05:00:00.000Z",
    updated_at: "2026-06-25T05:00:00.000Z",
  };
  const conversation = {
    id: "conversation_delivery_1",
    schema_version: "1.0",
    tenant_id: "local-demo",
    title: "订单模块提测",
    owner_endpoint_id: "qa_codex_local",
    participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
    status: "active" as const,
    created_at: "2026-06-25T05:00:00.000Z",
    updated_at: "2026-06-25T05:00:00.000Z",
  };
  const client = {
    getHandoff: vi.fn().mockResolvedValue({ handoff }),
    resolveProviderModelSelection: vi.fn().mockResolvedValue({
      schema_version: "1.0",
      tenant_id: "local-demo",
      endpoint_id: "qa_codex_local",
      selected_profile_id: providerProfile.id,
      selected_profile: providerProfile,
      required_capabilities: ["chat"],
      selection_reason: "default_profile_matched",
    }),
    startDelivery: vi.fn().mockResolvedValue({
      delivery: { id: "delivery_1", status: "running" },
    }),
    createConversation: vi.fn().mockResolvedValue(conversation),
    appendConversationMessage: vi
      .fn()
      .mockResolvedValueOnce({
        id: "message_prompt",
        conversation_id: conversation.id,
        seq: 1,
        author_endpoint_id: "qa_codex_local",
        role: "user",
        content: "prompt",
        references: [],
        created_at: "2026-06-25T05:00:01.000Z",
      })
      .mockResolvedValueOnce({
        id: "message_result",
        conversation_id: conversation.id,
        seq: 2,
        author_endpoint_id: "qa_codex_local",
        role: "assistant",
        content: "result",
        references: [],
        created_at: "2026-06-25T05:00:02.000Z",
      }),
    createContextProjection: vi.fn().mockResolvedValue({
      id: "projection_delivery_1",
      conversation_id: conversation.id,
      provider: "codex",
      model: "gpt-5",
      source_message_ids: ["message_prompt"],
      summary_checkpoint_ids: [],
      reference_ids: [],
      token_budget: 16000,
      rendered_context: "prompt",
      created_at: "2026-06-25T05:00:01.000Z",
    }),
    recordModelRun: vi.fn().mockResolvedValue({
      id: "model_run_delivery_1",
      conversation_id: conversation.id,
      context_projection_id: "projection_delivery_1",
      executor_endpoint_id: "qa_codex_local",
      provider: "codex",
      model: "gpt-5",
      status: "succeeded",
      started_at: "2026-06-25T05:00:00.000Z",
      completed_at: "2026-06-25T05:00:00.000Z",
    }),
    addArtifact: vi.fn().mockResolvedValue({ artifacts: [] }),
    markDeliveryReportReady: vi.fn().mockResolvedValue({
      delivery: { id: "delivery_1", status: "report_ready" },
    }),
    failDelivery: vi.fn().mockResolvedValue({
      delivery: { id: "delivery_1", status: "failed" },
    }),
  };

  return { workspaceDir, output, providerProfile, conversation, client };
}

describe("connector-cli", () => {
  it("renders local demo profiles", () => {
    expect(profileToText(localDemoQaProfile)).toContain("qa_codex_local");
    expect(profileToText(localDemoDevProfile)).toContain("dev_codex_local");
  });

  it("writes an agent-readable inbox entry", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));

    const entry = await writeHandoffToInbox({
      workspaceDir,
      handoff,
      delivery: {
        id: "delivery_1",
        handoffId: "handoff_1",
        recipientEndpointId: "qa_codex_local",
        cursor: 1,
        status: "delivered",
        deliveredAt: "2026-06-22T09:00:01.000Z",
        acknowledgedAt: null,
      },
    });

    const handoffMarkdown = await readFile(
      join(entry.path, "handoff.md"),
      "utf8",
    );
    const packJson = JSON.parse(
      await readFile(join(entry.path, "pack.json"), "utf8"),
    );
    const deliveryJson = JSON.parse(
      await readFile(join(entry.path, "delivery.json"), "utf8"),
    );

    expect(handoffMarkdown).toContain("# 订单模块提测");
    expect(handoffMarkdown).toContain("Delivery: `delivery_1`");
    expect(handoffMarkdown).toContain("ack delivery_1");
    expect(handoffMarkdown).toContain("report handoff_1");
    expect(packJson.entry).toBe("handoff.md");
    expect(deliveryJson.id).toBe("delivery_1");
    await expect(listInbox({ workspaceDir })).resolves.toContainEqual(
      expect.objectContaining({ handoffId: "handoff_1" }),
    );
  });

  it("acknowledges deliveries and reports artifacts through the SDK boundary", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));
    const reportPath = join(workspaceDir, "qa-report.md");
    await writeFile(reportPath, "QA result", "utf8");

    const client = {
      acknowledgeDelivery: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", status: "acknowledged" },
      }),
      addArtifact: vi.fn().mockResolvedValue({
        artifacts: [{ name: "qa-report.md" }],
      }),
    };

    await ackDelivery({ client, deliveryId: "delivery_1" });
    await reportArtifact({
      client,
      handoffId: "handoff_1",
      filePath: reportPath,
    });

    expect(client.acknowledgeDelivery).toHaveBeenCalledWith("delivery_1");
    expect(client.addArtifact).toHaveBeenCalledWith(
      "handoff_1",
      expect.objectContaining({
        schema_version: "1.0",
        artifact: expect.objectContaining({
          name: "qa-report.md",
          kind: "qa_to_dev_report",
          storage_url: expect.stringContaining("qa-report.md"),
        }),
      }),
    );
  });

  it("submits QA endpoint health from the CLI command", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));
    const output: string[] = [];
    const client = {
      reportEndpointHealth: vi.fn().mockResolvedValue({
        endpoint_id: "qa_codex_local",
        schema_version: "1.0",
        tenant_id: "local-demo",
        reported_at: "2026-06-23T10:00:01.000Z",
        checks: [],
      }),
    };

    await runConnectorCli({
      argv: ["health", "qa"],
      workspaceDir,
      client,
      stdout: (line) => output.push(line),
      now: () => new Date("2026-06-23T10:00:00.000Z"),
    });

    expect(client.reportEndpointHealth).toHaveBeenCalledWith(
      "qa_codex_local",
      expect.objectContaining({
        schema_version: "1.0",
        tenant_id: "local-demo",
      }),
    );
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      endpoint_id: "qa_codex_local",
      tenant_id: "local-demo",
    });
  });

  it("keeps health usage explicit for invalid profiles", async () => {
    const client = {
      reportEndpointHealth: vi.fn(),
    };

    await expect(
      runConnectorCli({
        argv: ["health", "unknown"],
        workspaceDir: process.cwd(),
        client,
        stdout: () => undefined,
      }),
    ).rejects.toThrow("connector health <dev|qa>");
    expect(client.reportEndpointHealth).not.toHaveBeenCalled();
  });

  it("runs QA trial handoff from the CLI command", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));
    const output: string[] = [];
    const client = {
      registerAgentEndpoint: vi.fn().mockResolvedValue({ ok: true }),
      connectAgentEndpoint: vi.fn().mockResolvedValue({
        delivery: {
          id: "delivery_1",
          handoffId: "handoff_1",
          recipientEndpointId: "qa_codex_local",
          cursor: 1,
          status: "delivered",
          deliveredAt: "2026-06-23T10:00:00.000Z",
          acknowledgedAt: null,
        },
      }),
      getHandoff: vi.fn().mockResolvedValue({ handoff }),
      acknowledgeDelivery: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", status: "acknowledged" },
      }),
      addArtifact: vi.fn().mockResolvedValue({
        artifacts: [{ name: "handoff_1-trial-report.md" }],
      }),
    };

    await runConnectorCli({
      argv: ["trial", "qa"],
      workspaceDir,
      client,
      stdout: (line) => output.push(line),
      now: () => new Date("2026-06-23T10:00:00.000Z"),
    });

    expect(client.acknowledgeDelivery).toHaveBeenCalledWith("delivery_1");
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      handoffId: "handoff_1",
      deliveryId: "delivery_1",
      endpointId: "qa_codex_local",
    });
  });

  it("keeps trial usage explicit for invalid profiles", async () => {
    const client = {
      registerAgentEndpoint: vi.fn(),
      connectAgentEndpoint: vi.fn(),
      getHandoff: vi.fn(),
      acknowledgeDelivery: vi.fn(),
      addArtifact: vi.fn(),
    };

    await expect(
      runConnectorCli({
        argv: ["trial", "unknown"],
        workspaceDir: process.cwd(),
        client,
        stdout: () => undefined,
      }),
    ).rejects.toThrow("connector trial <dev|qa>");
    expect(client.connectAgentEndpoint).not.toHaveBeenCalled();
  });

  it("runs Codex app-server smoke from the CLI without requiring real Codex in tests", async () => {
    const output: string[] = [];

    await runConnectorCli({
      argv: ["--", "codex-smoke"],
      workspaceDir: process.cwd(),
      client: {},
      stdout: (line) => output.push(line),
      codexAppServerSmoke: vi.fn().mockResolvedValue({
        status: "REAL_TEST",
        command: "codex app-server --help",
        detail: "Codex app-server help command completed successfully.",
        observedAt: "2026-06-25T04:20:00.000Z",
        metadata: {
          adapter: "codex_app_server",
        },
      }),
    });

    expect(JSON.parse(output.join("\n"))).toMatchObject({
      status: "REAL_TEST",
      command: "codex app-server --help",
      metadata: {
        adapter: "codex_app_server",
      },
    });
  });

  it("uses the fake Codex executor by default for execute", async () => {
    const scenario = await createExecutionScenario();

    await runConnectorCli({
      argv: ["execute", "qa", "delivery_1"],
      workspaceDir: scenario.workspaceDir,
      client: scenario.client,
      stdout: (line) => scenario.output.push(line),
      now: () => new Date("2026-06-25T05:00:00.000Z"),
    });

    expect(scenario.client.recordModelRun).toHaveBeenCalledWith(
      scenario.conversation.id,
      expect.objectContaining({
        metadata: expect.objectContaining({
          adapter: "fake",
        }),
      }),
    );
  });

  it("selects the real Codex CLI executor from environment", async () => {
    const scenario = await createExecutionScenario();
    const codexCliExecutorFactory = vi.fn(() =>
      createFakeCodexExecutor({
        assistantOutput: "Real Codex CLI stub completed.",
        metadata: {
          adapter: "codex_cli",
          command: "codex exec",
        },
      }),
    );

    await runConnectorCli({
      argv: ["execute", "qa", "delivery_1"],
      env: { SARTRE_CODEX_EXECUTOR: "real" },
      workspaceDir: scenario.workspaceDir,
      client: scenario.client,
      stdout: (line) => scenario.output.push(line),
      now: () => new Date("2026-06-25T05:00:00.000Z"),
      codexCliExecutorFactory,
    });

    expect(codexCliExecutorFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceDir: scenario.workspaceDir,
      }),
    );
    expect(scenario.client.recordModelRun).toHaveBeenCalledWith(
      scenario.conversation.id,
      expect.objectContaining({
        metadata: expect.objectContaining({
          adapter: "codex_cli",
          command: "codex exec",
        }),
      }),
    );
  });

  it("selects the real Codex CLI executor from command options", async () => {
    const scenario = await createExecutionScenario();
    const codexCliExecutorFactory = vi.fn(() =>
      createFakeCodexExecutor({
        assistantOutput: "Real Codex CLI flag stub completed.",
        metadata: {
          adapter: "codex_cli",
        },
      }),
    );

    await runConnectorCli({
      argv: ["execute", "qa", "delivery_1", "--executor", "real"],
      workspaceDir: scenario.workspaceDir,
      client: scenario.client,
      stdout: (line) => scenario.output.push(line),
      now: () => new Date("2026-06-25T05:00:00.000Z"),
      codexCliExecutorFactory,
    });

    expect(codexCliExecutorFactory).toHaveBeenCalledOnce();
    expect(scenario.client.recordModelRun).toHaveBeenCalledWith(
      scenario.conversation.id,
      expect.objectContaining({
        metadata: expect.objectContaining({
          adapter: "codex_cli",
        }),
      }),
    );
  });

  it("runs Codex CLI exec smoke with honest REAL_TEST evidence", async () => {
    const output: string[] = [];

    await runConnectorCli({
      argv: ["codex-smoke", "--exec"],
      workspaceDir: process.cwd(),
      client: {},
      stdout: (line) => output.push(line),
      now: () => new Date("2026-06-25T05:10:00.000Z"),
      codexCliExecutorFactory: vi.fn(() =>
        createFakeCodexExecutor({
          assistantOutput: "SARTRE_CODEX_SMOKE_OK",
          metadata: {
            adapter: "codex_cli",
            command: "codex exec",
          },
        }),
      ),
    });

    expect(JSON.parse(output.join("\n"))).toMatchObject({
      status: "REAL_TEST",
      command: "codex exec",
      detail: "SARTRE_CODEX_SMOKE_OK",
      observedAt: "2026-06-25T05:10:00.000Z",
      metadata: {
        adapter: "codex_cli",
      },
    });
  });

  it("labels Codex CLI exec smoke as skipped when local Codex cannot run", async () => {
    const output: string[] = [];

    await runConnectorCli({
      argv: ["codex-smoke", "--exec"],
      workspaceDir: process.cwd(),
      client: {},
      stdout: (line) => output.push(line),
      codexCliExecutorFactory: vi.fn(() => ({
        execute: async () => {
          throw new Error("Please login to Codex before running this command");
        },
      })),
    });

    expect(JSON.parse(output.join("\n"))).toMatchObject({
      status: "SKIPPED",
      command: "codex exec",
      detail: "Please login to Codex before running this command",
      metadata: {
        adapter: "codex_cli",
        category: "NeedUserAction",
      },
    });
  });

  it("runs real handoff execution smoke through accepted to report ready", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-handoff-smoke-"));
    const output: string[] = [];
    const scenario = await createExecutionScenario();
    const client = {
      ...scenario.client,
      registerAgentEndpoint: vi.fn().mockResolvedValue({ ok: true }),
      registerProviderModelProfile: vi.fn().mockResolvedValue({
        id: "profile_codex_qa_default",
      }),
      createHandoff: vi.fn().mockResolvedValue({
        handoff,
        delivery: {
          id: "delivery_1",
          handoffId: "handoff_1",
          recipientEndpointId: "qa_codex_local",
          cursor: 1,
          status: "delivered",
          deliveredAt: "2026-06-25T07:00:00.000Z",
          acknowledgedAt: null,
        },
      }),
      connectAgentEndpoint: vi.fn().mockResolvedValue({
        delivery: {
          id: "delivery_1",
          handoffId: "handoff_1",
          recipientEndpointId: "qa_codex_local",
          cursor: 1,
          status: "delivered",
          deliveredAt: "2026-06-25T07:00:00.000Z",
          acknowledgedAt: null,
        },
      }),
      acceptDelivery: vi.fn().mockResolvedValue({
        delivery: {
          id: "delivery_1",
          handoffId: "handoff_1",
          recipientEndpointId: "qa_codex_local",
          cursor: 1,
          status: "accepted",
          deliveredAt: "2026-06-25T07:00:00.000Z",
          acknowledgedAt: null,
        },
      }),
    };

    await runConnectorCli({
      argv: ["handoff-smoke", "qa", "--real-codex"],
      workspaceDir,
      client,
      stdout: (line) => output.push(line),
      now: () => new Date("2026-06-25T07:00:10.000Z"),
      codexCliExecutorFactory: vi.fn(() =>
        createFakeCodexExecutor({
          assistantOutput: "SARTRE_HANDOFF_EXECUTION_OK",
          metadata: {
            adapter: "codex_cli",
            command: "codex exec",
          },
        }),
      ),
    });

    expect(client.createHandoff).toHaveBeenCalledOnce();
    expect(client.registerAgentEndpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_endpoint_id: "dev_codex_local",
      }),
    );
    expect(client.registerAgentEndpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_endpoint_id: "qa_codex_local",
      }),
    );
    expect(client.registerProviderModelProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_endpoint_id: "qa_codex_local",
        provider: "codex",
        default_for_endpoint: true,
      }),
    );
    expect(client.createHandoff).toHaveBeenCalledWith(
      expect.objectContaining({
        summary: expect.stringContaining("Do not inspect the repository"),
      }),
    );
    expect(client.acceptDelivery).toHaveBeenCalledWith(
      "delivery_1",
      expect.objectContaining({
        actor_endpoint_id: "qa_codex_local",
      }),
    );
    expect(client.markDeliveryReportReady).toHaveBeenCalledWith(
      "delivery_1",
      expect.objectContaining({
        actor_endpoint_id: "qa_codex_local",
      }),
    );
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      status: "REAL_TEST",
      command: "connector handoff-smoke --real-codex",
      detail: "delivery delivery_1 reached report_ready",
      metadata: {
        handoff_id: "handoff_1",
        delivery_id: "delivery_1",
        final_status: "report_ready",
        provider_profile_id: scenario.providerProfile.id,
        model_run_id: "model_run_delivery_1",
      },
    });
  });

  it("labels real handoff execution smoke as skipped when Hub is unavailable", async () => {
    const output: string[] = [];
    const client = {
      registerAgentEndpoint: vi
        .fn()
        .mockRejectedValue(new Error("Hub offline")),
      createHandoff: vi.fn(),
      connectAgentEndpoint: vi.fn(),
      getHandoff: vi.fn(),
      acceptDelivery: vi.fn(),
      startDelivery: vi.fn(),
      failDelivery: vi.fn(),
      resolveProviderModelSelection: vi.fn(),
      createConversation: vi.fn(),
      appendConversationMessage: vi.fn(),
      createContextProjection: vi.fn(),
      recordModelRun: vi.fn(),
      addArtifact: vi.fn(),
      markDeliveryReportReady: vi.fn(),
      registerProviderModelProfile: vi.fn(),
    };

    await runConnectorCli({
      argv: ["handoff-smoke", "qa", "--real-codex"],
      workspaceDir: process.cwd(),
      client,
      stdout: (line) => output.push(line),
    });

    expect(JSON.parse(output.join("\n"))).toMatchObject({
      status: "SKIPPED",
      command: "connector handoff-smoke --real-codex",
      detail: "Hub offline",
      metadata: {
        category: "Unavailable",
      },
    });
  });

  it("executes an accepted delivery through the SDK and Codex executor boundary", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));
    const output: string[] = [];
    await writeHandoffToInbox({
      workspaceDir,
      profile: localDemoQaProfile,
      handoff,
      delivery: {
        id: "delivery_1",
        handoffId: "handoff_1",
        recipientEndpointId: "qa_codex_local",
        cursor: 1,
        status: "accepted",
        deliveredAt: "2026-06-22T09:00:01.000Z",
        acknowledgedAt: "2026-06-22T09:00:02.000Z",
      },
    });
    const providerProfile = {
      id: "profile_codex_qa_default",
      schema_version: "1.0",
      tenant_id: "local-demo",
      agent_endpoint_id: "qa_codex_local",
      provider: "codex",
      model: "gpt-5",
      label: "Codex GPT-5",
      executor: {
        kind: "codex_cli",
        label: "Codex CLI",
        command: "codex",
      },
      capabilities: ["chat", "tool_use"],
      context_window: 16000,
      max_output_tokens: 4096,
      default_for_endpoint: true,
      status: "available" as const,
      created_at: "2026-06-25T05:00:00.000Z",
      updated_at: "2026-06-25T05:00:00.000Z",
    };
    const conversation = {
      id: "conversation_delivery_1",
      schema_version: "1.0",
      tenant_id: "local-demo",
      title: "订单模块提测",
      owner_endpoint_id: "qa_codex_local",
      participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
      status: "active" as const,
      created_at: "2026-06-25T05:00:00.000Z",
      updated_at: "2026-06-25T05:00:00.000Z",
    };
    const client = {
      getHandoff: vi.fn().mockResolvedValue({ handoff }),
      resolveProviderModelSelection: vi.fn().mockResolvedValue({
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        selected_profile_id: providerProfile.id,
        selected_profile: providerProfile,
        required_capabilities: ["chat"],
        selection_reason: "default_profile_matched",
      }),
      startDelivery: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", status: "running" },
      }),
      createConversation: vi.fn().mockResolvedValue(conversation),
      appendConversationMessage: vi
        .fn()
        .mockResolvedValueOnce({
          id: "message_prompt",
          conversation_id: conversation.id,
          seq: 1,
          author_endpoint_id: "qa_codex_local",
          role: "user",
          content: "prompt",
          references: [],
          created_at: "2026-06-25T05:00:01.000Z",
        })
        .mockResolvedValueOnce({
          id: "message_result",
          conversation_id: conversation.id,
          seq: 2,
          author_endpoint_id: "qa_codex_local",
          role: "assistant",
          content: "result",
          references: [],
          created_at: "2026-06-25T05:00:02.000Z",
        }),
      createContextProjection: vi.fn().mockResolvedValue({
        id: "projection_delivery_1",
        conversation_id: conversation.id,
        provider: "codex",
        model: "gpt-5",
        source_message_ids: ["message_prompt"],
        summary_checkpoint_ids: [],
        reference_ids: [],
        token_budget: 16000,
        rendered_context: "prompt",
        created_at: "2026-06-25T05:00:01.000Z",
      }),
      recordModelRun: vi.fn().mockResolvedValue({
        id: "model_run_delivery_1",
        conversation_id: conversation.id,
        context_projection_id: "projection_delivery_1",
        executor_endpoint_id: "qa_codex_local",
        provider: "codex",
        model: "gpt-5",
        status: "succeeded",
        started_at: "2026-06-25T05:00:00.000Z",
        completed_at: "2026-06-25T05:00:00.000Z",
      }),
      addArtifact: vi.fn().mockResolvedValue({ artifacts: [] }),
      markDeliveryReportReady: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", status: "report_ready" },
      }),
      failDelivery: vi.fn().mockResolvedValue({
        delivery: { id: "delivery_1", status: "failed" },
      }),
    };

    await runConnectorCli({
      argv: ["execute", "qa", "delivery_1"],
      workspaceDir,
      client,
      stdout: (line) => output.push(line),
      now: () => new Date("2026-06-25T05:00:00.000Z"),
      executor: createFakeCodexExecutor({
        assistantOutput: "QA Agent 已生成测试范围和风险报告。",
      }),
    });

    expect(client.resolveProviderModelSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: "local-demo",
        endpoint_id: "qa_codex_local",
        preferred_provider: "codex",
      }),
    );
    expect(client.startDelivery).toHaveBeenCalledWith(
      "delivery_1",
      expect.objectContaining({
        actor_endpoint_id: "qa_codex_local",
        metadata: expect.objectContaining({
          provider_profile_id: providerProfile.id,
        }),
      }),
    );
    expect(client.recordModelRun).toHaveBeenCalledWith(
      conversation.id,
      expect.objectContaining({
        provider: "codex",
        model: "gpt-5",
        status: "succeeded",
      }),
    );
    expect(client.markDeliveryReportReady).toHaveBeenCalledWith(
      "delivery_1",
      expect.objectContaining({
        actor_endpoint_id: "qa_codex_local",
        artifact_ids: [expect.stringMatching(/^artifact_[a-f0-9]{12}$/)],
      }),
    );
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      deliveryId: "delivery_1",
      handoffId: "handoff_1",
      status: "report_ready",
      conversationId: conversation.id,
      providerProfileId: providerProfile.id,
    });
  });

  it("re-exports the trial helper for local packaging adapters", () => {
    expect(runTrialHandoff).toBeTypeOf("function");
  });
});
