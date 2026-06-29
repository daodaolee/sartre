import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { localDemoProfileFacts } from "@sartre/contracts";
import { describe, expect, it, vi } from "vitest";
import {
  ackDelivery,
  type CodexCliCommandRunner,
  classifyExecutorError,
  connectProfile,
  createCodexCliExecutor,
  createFakeCodexExecutor,
  executeDelivery,
  listInbox,
  localDemoDevProfile,
  localDemoQaProfile,
  probeEndpointHealth,
  profileToText,
  renderCodexExecutionPrompt,
  reportArtifact,
  runCodexAppServerSmoke,
  runTrialHandoff,
  submitProfileHealth,
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

async function runFailingCodexCli(input: {
  runCommand: CodexCliCommandRunner;
}) {
  const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-codex-cli-"));
  const executor = createCodexCliExecutor({
    workspaceDir,
    outputFilePath: join(workspaceDir, "last-message.txt"),
    runCommand: input.runCommand,
  });

  try {
    await executor.execute({
      prompt: "请分析订单模块提测交接。",
      profile: localDemoQaProfile,
      deliveryId: "delivery_1",
      providerProfile: {
        id: "provider_profile_codex_default",
        provider: "codex",
        model: "gpt-5",
        executorKind: "codex_cli",
      },
      now: () => new Date("2026-06-25T04:31:00.000Z"),
    });
  } catch (error) {
    return classifyExecutorError(error);
  }

  throw new Error("Expected Codex CLI execution to fail");
}

async function createAcceptedExecutionFixture() {
  const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-execute-"));
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
      deliveredAt: "2026-06-25T06:00:00.000Z",
      acknowledgedAt: "2026-06-25T06:00:10.000Z",
    },
  });

  const conversation = {
    id: "conversation_delivery_1",
    schema_version: "1.0",
    tenant_id: "local-demo",
    title: "订单模块提测",
    owner_endpoint_id: "qa_codex_local",
    participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
    status: "active" as const,
    created_at: "2026-06-25T06:00:20.000Z",
    updated_at: "2026-06-25T06:00:20.000Z",
  };
  const providerProfile = {
    id: "provider_profile_codex_default",
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
    created_at: "2026-06-25T06:00:00.000Z",
    updated_at: "2026-06-25T06:00:00.000Z",
  };
  const client = {
    getHandoff: vi.fn().mockResolvedValue({ handoff }),
    startDelivery: vi.fn().mockResolvedValue({
      delivery: { id: "delivery_1", status: "running" },
    }),
    resolveProviderModelSelection: vi.fn().mockResolvedValue({
      schema_version: "1.0",
      tenant_id: "local-demo",
      endpoint_id: "qa_codex_local",
      selected_profile_id: providerProfile.id,
      selected_profile: providerProfile,
      required_capabilities: ["chat"],
      selection_reason: "default_profile_matched",
    }),
    createConversation: vi.fn().mockResolvedValue(conversation),
    appendConversationMessage: vi.fn().mockResolvedValue({
      id: "message_prompt",
      conversation_id: conversation.id,
      seq: 1,
      author_endpoint_id: "qa_codex_local",
      role: "user",
      content: "prompt",
      references: [],
      created_at: "2026-06-25T06:00:21.000Z",
    }),
    createContextProjection: vi.fn().mockResolvedValue({
      id: "projection_delivery_1",
      conversation_id: conversation.id,
      provider: "codex",
      model: "gpt-5",
      source_message_ids: ["message_prompt"],
      summary_checkpoint_ids: [],
      reference_ids: ["handoff_1", "delivery_1"],
      token_budget: 16000,
      rendered_context: "prompt",
      created_at: "2026-06-25T06:00:22.000Z",
    }),
    recordModelRun: vi.fn().mockResolvedValue({
      id: "model_run_failed",
      conversation_id: conversation.id,
      context_projection_id: "projection_delivery_1",
      executor_endpoint_id: "qa_codex_local",
      provider: "codex",
      model: "gpt-5",
      status: "failed",
      started_at: "2026-06-25T06:00:30.000Z",
      completed_at: "2026-06-25T06:00:30.000Z",
    }),
    addArtifact: vi.fn(),
    markDeliveryReportReady: vi.fn(),
    failDelivery: vi.fn().mockResolvedValue({
      delivery: { id: "delivery_1", status: "failed" },
    }),
  };

  return { workspaceDir, client, conversation, providerProfile };
}

describe("connector-core", () => {
  it("maps local demo profiles from shared contract facts", () => {
    expect(localDemoQaProfile).toMatchObject({
      tenantId: localDemoProfileFacts.qa.tenant_id,
      userId: localDemoProfileFacts.qa.user_id,
      role: localDemoProfileFacts.qa.role,
      agentEndpointId: localDemoProfileFacts.qa.agent_endpoint_id,
      executionMode: localDemoProfileFacts.qa.execution_mode,
    });
    expect(localDemoDevProfile).toMatchObject({
      tenantId: localDemoProfileFacts.dev.tenant_id,
      userId: localDemoProfileFacts.dev.user_id,
      role: localDemoProfileFacts.dev.role,
      agentEndpointId: localDemoProfileFacts.dev.agent_endpoint_id,
      executionMode: localDemoProfileFacts.dev.execution_mode,
    });
    expect(profileToText(localDemoQaProfile)).toContain("qa_codex_local");
  });

  it("declares capability sources and executor bindings on local profiles", () => {
    expect(localDemoQaProfile.capabilitySources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "skill_qa_test_scope",
          type: "skill",
        }),
        expect.objectContaining({
          id: "hook_delivery_accepted",
          type: "hook",
        }),
      ]),
    );
    expect(localDemoQaProfile.executor.kind).toBe("manual_prompt");
    expect(localDemoQaProfile.approvalPolicy.mode).toBe("manual_confirm");
    expect(localDemoDevProfile.capabilitySources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "skill_dev_change_report",
          type: "skill",
        }),
      ]),
    );
  });

  it("writes an agent-readable inbox entry", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));

    const entry = await writeHandoffToInbox({
      workspaceDir,
      profile: localDemoQaProfile,
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
    expect(handoffMarkdown).toContain("## Agent Capabilities");
    expect(handoffMarkdown).toContain("QA 测试范围分析");
    expect(handoffMarkdown).toContain("skill");
    expect(handoffMarkdown).toContain("ack delivery_1");
    expect(handoffMarkdown).toContain("report handoff_1");
    expect(packJson.entry).toBe("handoff.md");
    expect(deliveryJson.id).toBe("delivery_1");
    await expect(listInbox({ workspaceDir })).resolves.toContainEqual(
      expect.objectContaining({ handoffId: "handoff_1" }),
    );
  });

  it("registers profile capability manifests through the SDK boundary", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));
    const client = {
      registerAgentEndpoint: vi.fn().mockResolvedValue({ ok: true }),
      connectAgentEndpoint: vi.fn().mockResolvedValue({ events: [] }),
      getHandoff: vi.fn(),
    };

    await connectProfile({
      client,
      profile: localDemoQaProfile,
      workspaceDir,
    });

    expect(client.registerAgentEndpoint).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_endpoint_id: "qa_codex_local",
        capability_sources: expect.arrayContaining([
          expect.objectContaining({
            id: "skill_qa_test_scope",
            type: "skill",
          }),
        ]),
        executor: expect.objectContaining({ kind: "manual_prompt" }),
        approval_policy: expect.objectContaining({ mode: "manual_confirm" }),
      }),
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

  it("builds a local endpoint health report without executing real providers", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));
    const report = await probeEndpointHealth({
      profile: localDemoQaProfile,
      workspaceDir,
      now: () => new Date("2026-06-23T10:00:00.000Z"),
    });

    expect(report).toMatchObject({
      schema_version: "1.0",
      tenant_id: "local-demo",
    });
    expect(report.checks.map((check) => check.key)).toEqual(
      expect.arrayContaining([
        "executor",
        "workspace",
        "inbox",
        "artifact",
        "trial_run",
      ]),
    );
    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "executor",
          status: "passed",
          detail: expect.stringContaining("manual_confirm"),
          metadata: expect.objectContaining({
            profile: "qa_codex_local",
            role: "qa",
          }),
        }),
        expect.objectContaining({
          key: "trial_run",
          status: "passed",
          detail: expect.stringContaining("manual confirmation"),
        }),
      ]),
    );
  });

  it("reports capability source readiness without leaking secrets", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));
    const report = await probeEndpointHealth({
      profile: localDemoQaProfile,
      workspaceDir,
      now: () => new Date("2026-06-23T10:00:00.000Z"),
    });

    expect(report.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "capability_source:skill_qa_test_scope",
          status: "passed",
          metadata: expect.objectContaining({
            source_id: "skill_qa_test_scope",
            source_type: "skill",
          }),
        }),
        expect.objectContaining({
          key: "capability_source:manual_prompt_qa",
          status: "passed",
          metadata: expect.objectContaining({
            source_id: "manual_prompt_qa",
            source_type: "manual_prompt",
          }),
        }),
      ]),
    );
    expect(JSON.stringify(report)).not.toMatch(
      /token|password|secret|api[-_]?key|private[-_]?key/i,
    );
  });

  it("marks workspace readiness as blocked when required paths cannot be created", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));

    const report = await probeEndpointHealth({
      profile: localDemoDevProfile,
      workspaceDir,
      now: () => new Date("2026-06-23T10:00:00.000Z"),
      ensureDirectory: async (path) => {
        if (path.endsWith(".sartre/inbox")) {
          throw new Error("permission denied for local inbox");
        }
      },
    });

    expect(report.checks).toContainEqual(
      expect.objectContaining({
        key: "inbox",
        status: "blocked",
        detail:
          "Cannot prepare .sartre/inbox: permission denied for local inbox",
      }),
    );
    expect(JSON.stringify(report)).not.toMatch(
      /token|password|secret|api[-_]?key|private[-_]?key/i,
    );
  });

  it("submits profile health through the SDK boundary", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));
    const client = {
      reportEndpointHealth: vi.fn().mockResolvedValue({
        endpoint_id: "qa_codex_local",
        schema_version: "1.0",
        tenant_id: "local-demo",
        reported_at: "2026-06-23T10:00:01.000Z",
        checks: [],
      }),
    };

    await submitProfileHealth({
      client,
      profile: localDemoQaProfile,
      workspaceDir,
      now: () => new Date("2026-06-23T10:00:00.000Z"),
    });

    expect(client.reportEndpointHealth).toHaveBeenCalledWith(
      "qa_codex_local",
      expect.objectContaining({
        schema_version: "1.0",
        tenant_id: "local-demo",
        checks: expect.arrayContaining([
          expect.objectContaining({ key: "executor" }),
        ]),
      }),
    );
  });

  it("runs one local trial handoff through inbox, ack, and report upload", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));
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

    const result = await runTrialHandoff({
      client,
      profile: localDemoQaProfile,
      workspaceDir,
      now: () => new Date("2026-06-23T10:00:00.000Z"),
    });

    expect(result).toMatchObject({
      handoffId: "handoff_1",
      deliveryId: "delivery_1",
      endpointId: "qa_codex_local",
    });
    expect(result.reportPath).toContain("handoff_1-trial-report.md");
    await expect(readFile(result.reportPath, "utf8")).resolves.toContain(
      "Trial report for handoff_1",
    );
    expect(client.acknowledgeDelivery).toHaveBeenCalledWith("delivery_1");
    expect(client.addArtifact).toHaveBeenCalledWith(
      "handoff_1",
      expect.objectContaining({
        artifact: expect.objectContaining({
          name: "handoff_1-trial-report.md",
          kind: "qa_to_dev_report",
        }),
      }),
    );
  });

  it("fails clearly when trial run has no pending handoff", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-connector-"));
    const client = {
      registerAgentEndpoint: vi.fn().mockResolvedValue({ ok: true }),
      connectAgentEndpoint: vi.fn().mockResolvedValue({ events: [] }),
      getHandoff: vi.fn(),
      acknowledgeDelivery: vi.fn(),
      addArtifact: vi.fn(),
    };

    await expect(
      runTrialHandoff({
        client,
        profile: localDemoQaProfile,
        workspaceDir,
      }),
    ).rejects.toThrow("No pending handoff for qa_codex_local");
    expect(client.acknowledgeDelivery).not.toHaveBeenCalled();
    expect(client.addArtifact).not.toHaveBeenCalled();
  });

  it("renders agent, capability, and delivery context for Codex execution", () => {
    const prompt = renderCodexExecutionPrompt({
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
      providerProfile: {
        id: "provider_profile_codex_default",
        provider: "codex",
        model: "gpt-5",
        executorKind: "codex_app_server",
      },
    });

    expect(prompt).toContain("Role Agent: qa / qa_codex_local");
    expect(prompt).toContain("Runtime Binding: codex / gpt-5");
    expect(prompt).toContain("Delivery: delivery_1");
    expect(prompt).toContain("Handoff: 订单模块提测");
    expect(prompt).toContain("QA 测试范围分析");
    expect(prompt).toContain("hook_delivery_accepted");
    expect(prompt).not.toMatch(/computer/i);
  });

  it("executes a deterministic fake Codex run with transcript and report output", async () => {
    const executor = createFakeCodexExecutor({
      assistantOutput: "已读取交接内容。建议补充订单取消和退款状态回归测试。",
    });

    const result = await executor.execute({
      prompt: "请分析订单模块提测交接。",
      profile: localDemoQaProfile,
      deliveryId: "delivery_1",
      providerProfile: {
        id: "provider_profile_codex_default",
        provider: "codex",
        model: "gpt-5",
        executorKind: "codex_app_server",
      },
      now: () => new Date("2026-06-25T04:00:00.000Z"),
    });

    expect(result).toMatchObject({
      status: "succeeded",
      deliveryId: "delivery_1",
      providerProfile: {
        id: "provider_profile_codex_default",
        provider: "codex",
        model: "gpt-5",
      },
    });
    expect(result.transcript).toEqual([
      { role: "user", content: "请分析订单模块提测交接。" },
      {
        role: "assistant",
        content: "已读取交接内容。建议补充订单取消和退款状态回归测试。",
      },
    ]);
    expect(result.reportMarkdown).toContain("# Codex execution report");
    expect(result.reportMarkdown).toContain("qa_codex_local");
    expect(result.metadata).toMatchObject({
      executor_kind: "codex_app_server",
      adapter: "fake",
    });
  });

  it("runs Codex CLI exec with an output file and captures the final assistant message", async () => {
    const workspaceDir = await mkdtemp(join(tmpdir(), "sartre-codex-cli-"));
    const outputFilePath = join(workspaceDir, "last-message.txt");
    const runCommand = vi.fn(
      async (
        _command: string,
        _args: string[],
        options: {
          cwd: string;
          timeoutMs: number;
          outputFilePath: string;
        },
      ) => {
        await writeFile(options.outputFilePath, "真实 Codex 执行完成", "utf8");
        return {
          exitCode: 0,
          stdout: "codex completed",
          stderr: "",
        };
      },
    );
    const executor = createCodexCliExecutor({
      codexBinary: "codex-test",
      workspaceDir,
      outputFilePath,
      timeoutMs: 1234,
      runCommand,
    });

    const result = await executor.execute({
      prompt: "请分析订单模块提测交接。",
      profile: localDemoQaProfile,
      deliveryId: "delivery_1",
      providerProfile: {
        id: "provider_profile_codex_default",
        provider: "codex",
        model: "gpt-5",
        executorKind: "codex_cli",
      },
      now: () => new Date("2026-06-25T04:30:00.000Z"),
    });

    expect(runCommand).toHaveBeenCalledWith(
      "codex-test",
      [
        "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "--output-last-message",
        outputFilePath,
        "请分析订单模块提测交接。",
      ],
      {
        cwd: workspaceDir,
        timeoutMs: 1234,
        outputFilePath,
      },
    );
    expect(result.transcript).toContainEqual({
      role: "assistant",
      content: "真实 Codex 执行完成",
    });
    expect(result.reportMarkdown).toContain("真实 Codex 执行完成");
    expect(result.metadata).toMatchObject({
      adapter: "codex_cli",
      command: "codex-test exec",
      exit_code: "0",
    });
  });

  it("classifies Codex CLI timeout failures", async () => {
    const failure = await runFailingCodexCli({
      runCommand: async () => {
        throw new Error("codex timed out after 10ms");
      },
    });

    expect(failure).toEqual({
      category: "Timeout",
      message: "codex timed out after 10ms",
    });
  });

  it("classifies missing Codex CLI without leaking secrets", async () => {
    const failure = await runFailingCodexCli({
      runCommand: async () => {
        throw new Error("spawn codex ENOENT API_KEY=sk-test");
      },
    });

    expect(failure).toEqual({
      category: "Unavailable",
      message: "redacted local error",
    });
  });

  it("classifies Codex CLI user-action failures", async () => {
    const failure = await runFailingCodexCli({
      runCommand: async () => ({
        exitCode: 1,
        stdout: "",
        stderr: "Please login to Codex before running this command",
      }),
    });

    expect(failure).toEqual({
      category: "NeedUserAction",
      message: "Please login to Codex before running this command",
    });
  });

  it("classifies Codex CLI rate-limit failures", async () => {
    const failure = await runFailingCodexCli({
      runCommand: async () => ({
        exitCode: 1,
        stdout: "",
        stderr: "429 rate limit exceeded",
      }),
    });

    expect(failure).toEqual({
      category: "RateLimited",
      message: "429 rate limit exceeded",
    });
  });

  it("classifies Codex CLI invalid-input failures", async () => {
    const failure = await runFailingCodexCli({
      runCommand: async () => ({
        exitCode: 2,
        stdout: "",
        stderr: "invalid prompt payload",
      }),
    });

    expect(failure).toEqual({
      category: "InvalidInput",
      message: "invalid prompt payload",
    });
  });

  it("classifies executor failures without leaking secrets", () => {
    const failure = classifyExecutorError(
      new Error("codex API_KEY=sk-test failed with token abc"),
    );

    expect(failure).toEqual({
      category: "Unavailable",
      message: "redacted local error",
    });
  });

  it("writes failed model run and fails delivery when execution fails after start", async () => {
    const fixture = await createAcceptedExecutionFixture();
    const executor = {
      execute: vi.fn(async () => {
        throw new Error("Please login to Codex before running this command");
      }),
    };

    await expect(
      executeDelivery({
        client: fixture.client,
        profile: localDemoQaProfile,
        workspaceDir: fixture.workspaceDir,
        deliveryId: "delivery_1",
        executor,
        now: () => new Date("2026-06-25T06:00:30.000Z"),
      }),
    ).rejects.toThrow("Please login to Codex before running this command");

    expect(fixture.client.startDelivery).toHaveBeenCalled();
    expect(fixture.client.recordModelRun).toHaveBeenCalledWith(
      fixture.conversation.id,
      expect.objectContaining({
        status: "failed",
        error: {
          category: "NeedUserAction",
          message: "Please login to Codex before running this command",
        },
        metadata: expect.objectContaining({
          error_category: "NeedUserAction",
          error_message: "Please login to Codex before running this command",
          handoff_id: "handoff_1",
          delivery_id: "delivery_1",
          provider_profile_id: fixture.providerProfile.id,
        }),
      }),
    );
    expect(fixture.client.failDelivery).toHaveBeenCalledWith(
      "delivery_1",
      "Codex execution failed (NeedUserAction): Please login to Codex before running this command",
    );
    expect(fixture.client.addArtifact).not.toHaveBeenCalled();
    expect(fixture.client.markDeliveryReportReady).not.toHaveBeenCalled();
  });

  it("redacts secret-like executor failure before Hub writeback", async () => {
    const fixture = await createAcceptedExecutionFixture();
    const executor = {
      execute: vi.fn(async () => {
        throw new Error("codex API_KEY=sk-test failed with token abc");
      }),
    };

    await expect(
      executeDelivery({
        client: fixture.client,
        profile: localDemoQaProfile,
        workspaceDir: fixture.workspaceDir,
        deliveryId: "delivery_1",
        executor,
        now: () => new Date("2026-06-25T06:00:30.000Z"),
      }),
    ).rejects.toThrow("redacted local error");

    const modelRunCallJson = JSON.stringify(
      fixture.client.recordModelRun.mock.calls,
    );
    const failDeliveryCallJson = JSON.stringify(
      fixture.client.failDelivery.mock.calls,
    );

    expect(modelRunCallJson).toContain("redacted local error");
    expect(failDeliveryCallJson).toContain("redacted local error");
    expect(modelRunCallJson).not.toMatch(/sk-test|token abc|API_KEY/i);
    expect(failDeliveryCallJson).not.toMatch(/sk-test|token abc|API_KEY/i);
  });

  it("runs a labeled Codex app-server smoke through an injectable command runner", async () => {
    const result = await runCodexAppServerSmoke({
      now: () => new Date("2026-06-25T04:10:00.000Z"),
      runCommand: vi.fn().mockResolvedValue({
        exitCode: 0,
        stdout: "Usage: codex app-server --listen stdio://",
        stderr: "",
      }),
    });

    expect(result).toEqual({
      status: "REAL_TEST",
      command: "codex app-server --help",
      detail: "Codex app-server help command completed successfully.",
      observedAt: "2026-06-25T04:10:00.000Z",
      metadata: {
        adapter: "codex_app_server",
      },
    });
  });

  it("labels Codex app-server smoke as skipped when Codex is unavailable", async () => {
    const result = await runCodexAppServerSmoke({
      now: () => new Date("2026-06-25T04:11:00.000Z"),
      runCommand: vi.fn().mockResolvedValue({
        exitCode: 127,
        stdout: "",
        stderr: "codex: command not found",
      }),
    });

    expect(result).toMatchObject({
      status: "SKIPPED",
      command: "codex app-server --help",
      detail: "codex: command not found",
      observedAt: "2026-06-25T04:11:00.000Z",
    });
  });
});
