import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import type {
  EndpointHealthCheck,
  EndpointHealthReportRequest,
  EndpointHealthReportResponse,
  EndpointHealthStatus,
  HandoffEnvelope,
} from "@sartre/contracts";
import type { HandoffHubClient } from "@sartre/sdk";
import type { ConnectorProfile } from "./profiles";

export {
  type ConnectorProfile,
  type ConnectorProfileName,
  defaultHubBaseUrl,
  localDemoDevProfile,
  localDemoQaProfile,
  profileForName,
  profileToText,
} from "./profiles";
export {
  type CapabilityMention,
  type CapabilityMentionKind,
  collectCapabilityMentions,
  loadRoleCapabilityPacksFromDirectory,
  roleCapabilityPackToConnectorProfile,
} from "./role-capability-packs";

export type DeliveryRecord = {
  id: string;
  handoffId: string;
  recipientEndpointId: string;
  cursor: number;
  status: string;
  deliveredAt: string | null;
  acknowledgedAt: string | null;
};

export type InboxEntry = {
  handoffId: string;
  path: string;
  title?: string;
  deliveryId?: string;
};

export type HandoffHubConnectorClient = {
  registerAgentEndpoint?: (
    request: Parameters<HandoffHubClient["registerAgentEndpoint"]>[0],
  ) => Promise<unknown>;
  connectAgentEndpoint?: (
    endpointId: string,
    request: Parameters<HandoffHubClient["connectAgentEndpoint"]>[1],
  ) => Promise<unknown>;
  getHandoff?: (handoffId: string) => Promise<unknown>;
  acknowledgeDelivery: (deliveryId: string) => Promise<unknown>;
  failDelivery?: HandoffHubClient["failDelivery"];
  startDelivery?: HandoffHubClient["startDelivery"];
  markDeliveryReportReady?: HandoffHubClient["markDeliveryReportReady"];
  addArtifact: (
    handoffId: string,
    request: Parameters<HandoffHubClient["addArtifact"]>[1],
  ) => Promise<unknown>;
  resolveProviderModelSelection?: HandoffHubClient["resolveProviderModelSelection"];
  createConversation?: HandoffHubClient["createConversation"];
  appendConversationMessage?: HandoffHubClient["appendConversationMessage"];
  createContextProjection?: HandoffHubClient["createContextProjection"];
  recordModelRun?: HandoffHubClient["recordModelRun"];
  reportEndpointHealth?: (
    endpointId: string,
    request: EndpointHealthReportRequest,
  ) => Promise<EndpointHealthReportResponse>;
  streamUrlForEndpoint?: (endpointId: string) => URL;
};

export type CodexProviderProfile = {
  id: string;
  provider: string;
  model: string;
  executorKind: string;
};

export type CodexExecutionPromptInput = {
  profile: ConnectorProfile;
  handoff: HandoffEnvelope;
  delivery: DeliveryRecord;
  providerProfile: CodexProviderProfile;
};

export type CodexTranscriptMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ConnectorErrorCategory =
  | "Timeout"
  | "Unavailable"
  | "RateLimited"
  | "InvalidInput"
  | "Unsupported"
  | "Internal"
  | "NeedUserAction";

export type ClassifiedConnectorError = {
  category: ConnectorErrorCategory;
  message: string;
};

export type CodexExecutionResult = {
  status: "succeeded";
  deliveryId: string;
  providerProfile: CodexProviderProfile;
  transcript: CodexTranscriptMessage[];
  reportMarkdown: string;
  startedAt: string;
  completedAt: string;
  metadata: Record<string, string>;
};

export type CodexExecutionInput = {
  prompt: string;
  profile: ConnectorProfile;
  deliveryId: string;
  providerProfile: CodexProviderProfile;
  now?: () => Date;
};

export type CodexExecutor = {
  execute: (input: CodexExecutionInput) => Promise<CodexExecutionResult>;
};

export type ExecuteDeliveryResult = {
  deliveryId: string;
  handoffId: string;
  status: "report_ready";
  conversationId: string;
  modelRunId: string;
  reportPath: string;
  artifactId: string;
  providerProfileId: string;
};

export type CodexSmokeCommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type CodexCliCommandRunnerOptions = {
  cwd: string;
  timeoutMs: number;
  outputFilePath: string;
};

export type CodexCliCommandRunner = (
  command: string,
  args: string[],
  options: CodexCliCommandRunnerOptions,
) => Promise<CodexSmokeCommandResult>;

export type CodexCliExecutorOptions = {
  codexBinary?: string;
  workspaceDir?: string;
  outputFilePath?: string;
  timeoutMs?: number;
  runCommand?: CodexCliCommandRunner;
};

export type CodexAppServerSmokeResult = {
  status: "REAL_TEST" | "SKIPPED";
  command: string;
  detail: string;
  observedAt: string;
  metadata: Record<string, string>;
};

export type EndpointHealthProbeInput = {
  profile: ConnectorProfile;
  workspaceDir: string;
  now?: () => Date;
  ensureDirectory?: (path: string) => Promise<void>;
  executorCheck?: (input: {
    profile: ConnectorProfile;
    observedAt: string;
  }) => Promise<EndpointHealthCheck> | EndpointHealthCheck;
};

export class ConnectorExecutionError extends Error {
  readonly category: ConnectorErrorCategory;

  constructor(category: ConnectorErrorCategory, message: string) {
    super(message);
    this.name = "ConnectorExecutionError";
    this.category = category;
  }
}

export function renderCodexExecutionPrompt(
  input: CodexExecutionPromptInput,
): string {
  return [
    "# Sartre role Agent execution",
    "",
    `Role Agent: ${input.profile.role} / ${input.profile.agentEndpointId}`,
    `Endpoint Identity: ${input.profile.agentEndpointId}`,
    `Runtime Binding: ${input.providerProfile.provider} / ${input.providerProfile.model}`,
    `Executor Kind: ${input.providerProfile.executorKind}`,
    "",
    "## Delivery",
    "",
    `Delivery: ${input.delivery.id}`,
    `Handoff: ${input.handoff.title}`,
    `Status: ${input.delivery.status}`,
    `From: ${input.handoff.from.role} / ${input.handoff.from.agent_endpoint_id}`,
    `To: ${input.handoff.to.role} / ${input.handoff.to.agent_endpoint_id}`,
    "",
    "## Reason",
    "",
    input.handoff.summary,
    "",
    "## Capabilities",
    "",
    ...renderPromptCapabilitySources(input.profile),
    "",
    "## Task",
    "",
    "Read the delivery context and produce an agent-readable report for the sender.",
    "Include findings, risks, next action, and evidence references when available.",
    "",
  ].join("\n");
}

export function createFakeCodexExecutor(input: {
  assistantOutput: string;
  metadata?: Record<string, string>;
}): CodexExecutor {
  return {
    async execute(executionInput) {
      const startedAt = (
        executionInput.now ?? (() => new Date())
      )().toISOString();
      const completedAt = startedAt;
      const transcript: CodexTranscriptMessage[] = [
        { role: "user", content: executionInput.prompt },
        { role: "assistant", content: input.assistantOutput },
      ];

      return {
        status: "succeeded",
        deliveryId: executionInput.deliveryId,
        providerProfile: executionInput.providerProfile,
        transcript,
        reportMarkdown: renderCodexExecutionReport({
          profile: executionInput.profile,
          deliveryId: executionInput.deliveryId,
          assistantOutput: input.assistantOutput,
          providerProfile: executionInput.providerProfile,
          completedAt,
        }),
        startedAt,
        completedAt,
        metadata: {
          adapter: "fake",
          executor_kind: executionInput.providerProfile.executorKind,
          provider_profile_id: executionInput.providerProfile.id,
          provider: executionInput.providerProfile.provider,
          model: executionInput.providerProfile.model,
          ...(input.metadata ?? {}),
        },
      };
    },
  };
}

export function createCodexCliExecutor(
  input: CodexCliExecutorOptions = {},
): CodexExecutor {
  return {
    async execute(executionInput) {
      const codexBinary = input.codexBinary ?? "codex";
      const workspaceDir = input.workspaceDir ?? process.cwd();
      const timeoutMs = input.timeoutMs ?? 120_000;
      const outputFilePath =
        input.outputFilePath ?? (await createCodexCliOutputFilePath());
      const args = [
        "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "--output-last-message",
        outputFilePath,
        executionInput.prompt,
      ];
      const runCommand = input.runCommand ?? runCodexCliCommand;
      const startedAt = (
        executionInput.now ?? (() => new Date())
      )().toISOString();

      let result: CodexSmokeCommandResult;
      try {
        result = await runCommand(codexBinary, args, {
          cwd: workspaceDir,
          timeoutMs,
          outputFilePath,
        });
      } catch (error) {
        throw connectorExecutionErrorFrom(error);
      }

      if (result.exitCode !== 0) {
        throw connectorExecutionErrorFrom(
          new Error(
            result.stderr || result.stdout || `codex exit ${result.exitCode}`,
          ),
        );
      }

      const assistantOutput = (
        await readCodexCliOutput(outputFilePath, result)
      ).trim();
      if (!assistantOutput) {
        throw new ConnectorExecutionError(
          "Unavailable",
          "Codex CLI completed without assistant output",
        );
      }

      const completedAt = (
        executionInput.now ?? (() => new Date())
      )().toISOString();
      const transcript: CodexTranscriptMessage[] = [
        { role: "user", content: executionInput.prompt },
        { role: "assistant", content: assistantOutput },
      ];

      return {
        status: "succeeded",
        deliveryId: executionInput.deliveryId,
        providerProfile: executionInput.providerProfile,
        transcript,
        reportMarkdown: renderCodexExecutionReport({
          profile: executionInput.profile,
          deliveryId: executionInput.deliveryId,
          assistantOutput,
          providerProfile: executionInput.providerProfile,
          completedAt,
        }),
        startedAt,
        completedAt,
        metadata: {
          adapter: "codex_cli",
          command: `${codexBinary} exec`,
          exit_code: String(result.exitCode),
          executor_kind: executionInput.providerProfile.executorKind,
          provider_profile_id: executionInput.providerProfile.id,
          provider: executionInput.providerProfile.provider,
          model: executionInput.providerProfile.model,
        },
      };
    },
  };
}

export function classifyExecutorError(
  error: unknown,
): ClassifiedConnectorError {
  if (isConnectorExecutionError(error)) {
    return {
      category: error.category,
      message: safeErrorMessage(error),
    };
  }

  const message = safeErrorMessage(error);
  const rawMessage = error instanceof Error ? error.message : String(error);

  if (/timeout|timed out|abort/i.test(rawMessage)) {
    return { category: "Timeout", message };
  }
  if (/rate.?limit|429/i.test(rawMessage)) {
    return { category: "RateLimited", message };
  }
  if (/login|sign.?in|auth|authenticate|confirm|approval/i.test(rawMessage)) {
    return { category: "NeedUserAction", message };
  }
  if (/unsupported/i.test(rawMessage)) {
    return { category: "Unsupported", message };
  }
  if (/invalid|bad request|malformed/i.test(rawMessage)) {
    return { category: "InvalidInput", message };
  }

  return { category: "Unavailable", message };
}

async function createCodexCliOutputFilePath(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "sartre-codex-cli-"));
  return join(directory, "last-message.txt");
}

async function readCodexCliOutput(
  outputFilePath: string,
  result: CodexSmokeCommandResult,
): Promise<string> {
  try {
    return await readFile(outputFilePath, "utf8");
  } catch {
    return result.stdout;
  }
}

function connectorExecutionErrorFrom(error: unknown): ConnectorExecutionError {
  if (isConnectorExecutionError(error)) {
    return error;
  }
  const classified = classifyExecutorError(error);
  return new ConnectorExecutionError(classified.category, classified.message);
}

function isConnectorExecutionError(
  error: unknown,
): error is ConnectorExecutionError {
  return (
    error instanceof ConnectorExecutionError ||
    (typeof error === "object" &&
      error !== null &&
      "category" in error &&
      typeof (error as { category?: unknown }).category === "string")
  );
}

function runCodexCliCommand(
  command: string,
  args: string[],
  options: CodexCliCommandRunnerOptions,
): Promise<CodexSmokeCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;

    const settle = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      callback();
    };

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      settle(() => {
        reject(
          new ConnectorExecutionError(
            "Timeout",
            `codex timed out after ${options.timeoutMs}ms`,
          ),
        );
      });
    }, options.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
    child.on("error", (error) => {
      settle(() => reject(error));
    });
    child.on("close", (code) => {
      settle(() => {
        resolve({
          exitCode: code ?? 1,
          stdout: Buffer.concat(stdoutChunks).toString("utf8"),
          stderr: Buffer.concat(stderrChunks).toString("utf8"),
        });
      });
    });
  });
}

export async function runCodexAppServerSmoke(
  input: {
    codexBinary?: string;
    now?: () => Date;
    runCommand?: (
      command: string,
      args: string[],
    ) => Promise<CodexSmokeCommandResult>;
  } = {},
): Promise<CodexAppServerSmokeResult> {
  const codexBinary = input.codexBinary ?? "codex";
  const args = ["app-server", "--help"];
  const observedAt = (input.now ?? (() => new Date()))().toISOString();
  const command = [codexBinary, ...args].join(" ");
  const runCommand = input.runCommand ?? runLocalCommand;

  try {
    const result = await runCommand(codexBinary, args);
    if (result.exitCode === 0) {
      return {
        status: "REAL_TEST",
        command,
        detail: "Codex app-server help command completed successfully.",
        observedAt,
        metadata: {
          adapter: "codex_app_server",
        },
      };
    }

    return {
      status: "SKIPPED",
      command,
      detail: safeErrorMessage(
        result.stderr || result.stdout || `exit ${result.exitCode}`,
      ),
      observedAt,
      metadata: {
        adapter: "codex_app_server",
      },
    };
  } catch (error) {
    return {
      status: "SKIPPED",
      command,
      detail: safeErrorMessage(error),
      observedAt,
      metadata: {
        adapter: "codex_app_server",
      },
    };
  }
}

function runLocalCommand(
  command: string,
  args: string[],
): Promise<CodexSmokeCommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
      });
    });
  });
}

function renderPromptCapabilitySources(profile: ConnectorProfile): string[] {
  const enabledSources = profile.capabilitySources.filter(
    (source) => source.enabled,
  );
  if (enabledSources.length === 0) {
    return ["- No enabled capability source declared."];
  }

  return enabledSources.flatMap((source) => [
    `- ${source.id}: ${source.name}`,
    `  Type: ${source.type}`,
    `  Approval: ${source.approval_mode}`,
    `  Summary: ${source.summary}`,
    `  Capabilities: ${source.capabilities.join(", ")}`,
  ]);
}

function renderCodexExecutionReport(input: {
  profile: ConnectorProfile;
  deliveryId: string;
  assistantOutput: string;
  providerProfile: CodexProviderProfile;
  completedAt: string;
}): string {
  return [
    "# Codex execution report",
    "",
    `Endpoint: ${input.profile.agentEndpointId}`,
    `Role: ${input.profile.role}`,
    `Delivery: ${input.deliveryId}`,
    `Runtime: ${input.providerProfile.provider} / ${input.providerProfile.model}`,
    `Completed at: ${input.completedAt}`,
    "",
    "## Result",
    "",
    input.assistantOutput,
    "",
  ].join("\n");
}

export async function probeEndpointHealth(
  input: EndpointHealthProbeInput,
): Promise<EndpointHealthReportRequest> {
  const observedAt = (input.now ?? (() => new Date()))().toISOString();
  const ensureDirectory = input.ensureDirectory ?? ensureDirectoryExists;
  const checks: EndpointHealthCheck[] = [
    await probeExecutorReadiness(input, observedAt),
    ...probeCapabilitySourceReadiness(input.profile, observedAt),
    await probeDirectoryReadiness({
      key: "workspace",
      label: "Workspace",
      directory: join(input.workspaceDir, ".sartre"),
      relativePath: ".sartre",
      successDetail: "Workspace control directory is writeable.",
      observedAt,
      ensureDirectory,
      metadata: metadataForProfile(input.profile),
    }),
    await probeDirectoryReadiness({
      key: "inbox",
      label: "Inbox",
      directory: join(input.workspaceDir, ".sartre", "inbox"),
      relativePath: ".sartre/inbox",
      successDetail: "Inbox path is ready for handoff packages.",
      observedAt,
      ensureDirectory,
      metadata: metadataForProfile(input.profile),
    }),
    await probeDirectoryReadiness({
      key: "artifact",
      label: "Artifacts",
      directory: join(input.workspaceDir, ".sartre", "artifacts"),
      relativePath: ".sartre/artifacts",
      successDetail: "Artifact path is ready for local reports.",
      observedAt,
      ensureDirectory,
      metadata: metadataForProfile(input.profile),
    }),
    probeTrialRunReadiness(input.profile, observedAt),
  ];

  return {
    schema_version: "1.0",
    tenant_id: input.profile.tenantId,
    checks,
  };
}

function probeCapabilitySourceReadiness(
  profile: ConnectorProfile,
  observedAt: string,
): EndpointHealthCheck[] {
  return profile.capabilitySources.map((source) => {
    const status: EndpointHealthStatus = source.enabled ? "passed" : "warning";
    return createHealthCheck({
      key: `capability_source:${source.id}`,
      label: `Capability source: ${source.name}`,
      status,
      detail: source.enabled
        ? `${source.type} source is available for ${source.approval_mode}.`
        : `${source.type} source is disabled and will not be used.`,
      observedAt,
      metadata: {
        ...metadataForProfile(profile),
        source_id: source.id,
        source_type: source.type,
        approval_mode: source.approval_mode,
      },
    });
  });
}

export async function submitProfileHealth(input: {
  client: {
    reportEndpointHealth: (
      endpointId: string,
      request: EndpointHealthReportRequest,
    ) => Promise<EndpointHealthReportResponse>;
  };
  profile: ConnectorProfile;
  workspaceDir: string;
  now?: () => Date;
  ensureDirectory?: EndpointHealthProbeInput["ensureDirectory"];
  executorCheck?: EndpointHealthProbeInput["executorCheck"];
}): Promise<EndpointHealthReportResponse> {
  const report = await probeEndpointHealth({
    profile: input.profile,
    workspaceDir: input.workspaceDir,
    now: input.now,
    ensureDirectory: input.ensureDirectory,
    executorCheck: input.executorCheck,
  });

  return input.client.reportEndpointHealth(
    input.profile.agentEndpointId,
    report,
  );
}

export type TrialHandoffResult = {
  handoffId: string;
  deliveryId: string;
  endpointId: string;
  inboxPath: string;
  reportPath: string;
  artifactResult: unknown;
};

export async function runTrialHandoff(input: {
  client: Required<
    Pick<
      HandoffHubConnectorClient,
      | "registerAgentEndpoint"
      | "connectAgentEndpoint"
      | "getHandoff"
      | "acknowledgeDelivery"
      | "addArtifact"
    >
  >;
  profile: ConnectorProfile;
  workspaceDir: string;
  lastSeenCursor?: number;
  now?: () => Date;
}): Promise<TrialHandoffResult> {
  const entries = await connectProfile({
    client: input.client,
    profile: input.profile,
    workspaceDir: input.workspaceDir,
    lastSeenCursor: input.lastSeenCursor,
  });
  const entry = entries[0];
  if (!entry?.deliveryId) {
    throw new Error(`No pending handoff for ${input.profile.agentEndpointId}`);
  }

  const reportPath = await writeTrialReport({
    workspaceDir: input.workspaceDir,
    handoffId: entry.handoffId,
    deliveryId: entry.deliveryId,
    endpointId: input.profile.agentEndpointId,
    inboxPath: entry.path,
    observedAt: (input.now ?? (() => new Date()))().toISOString(),
  });
  await ackDelivery({
    client: input.client,
    deliveryId: entry.deliveryId,
  });
  const artifactResult = await reportArtifact({
    client: input.client,
    handoffId: entry.handoffId,
    filePath: reportPath,
  });

  return {
    handoffId: entry.handoffId,
    deliveryId: entry.deliveryId,
    endpointId: input.profile.agentEndpointId,
    inboxPath: entry.path,
    reportPath,
    artifactResult,
  };
}

export async function executeDelivery(input: {
  client: Required<
    Pick<
      HandoffHubConnectorClient,
      | "getHandoff"
      | "startDelivery"
      | "failDelivery"
      | "resolveProviderModelSelection"
      | "createConversation"
      | "appendConversationMessage"
      | "createContextProjection"
      | "recordModelRun"
      | "addArtifact"
      | "markDeliveryReportReady"
    >
  >;
  profile: ConnectorProfile;
  workspaceDir: string;
  deliveryId: string;
  executor: CodexExecutor;
  now?: () => Date;
}): Promise<ExecuteDeliveryResult> {
  const entry = await findInboxEntryByDeliveryId({
    workspaceDir: input.workspaceDir,
    deliveryId: input.deliveryId,
  });
  if (!entry) {
    throw new Error(
      `Delivery ${input.deliveryId} is not available in local inbox. Run connector connect/listen first.`,
    );
  }

  const delivery = await readDeliveryRecord(entry.path);
  if (delivery.status !== "accepted") {
    throw new Error(
      `Delivery ${input.deliveryId} must be accepted before execution; current status is ${delivery.status}.`,
    );
  }

  const handoff = await fetchHandoffEnvelope(input.client, entry.handoffId);
  const selection = await input.client.resolveProviderModelSelection({
    schema_version: "1.0",
    tenant_id: input.profile.tenantId,
    endpoint_id: input.profile.agentEndpointId,
    preferred_provider: "codex",
    required_capabilities: ["chat"],
  });
  if (selection.selected_profile.provider !== "codex") {
    throw new Error(
      `No compatible Codex provider profile for ${input.profile.agentEndpointId}`,
    );
  }

  const providerProfile: CodexProviderProfile = {
    id: selection.selected_profile.id,
    provider: selection.selected_profile.provider,
    model: selection.selected_profile.model,
    executorKind: selection.selected_profile.executor.kind,
  };
  const prompt = renderCodexExecutionPrompt({
    profile: input.profile,
    handoff,
    delivery,
    providerProfile,
  });

  await input.client.startDelivery(input.deliveryId, {
    schema_version: "1.0",
    actor_endpoint_id: input.profile.agentEndpointId,
    reason: `${input.profile.role} Agent 开始本地 Codex 执行`,
    metadata: executionMetadata({
      providerProfile,
      handoffId: handoff.id,
      deliveryId: input.deliveryId,
    }),
  });

  const conversation = await input.client.createConversation({
    schema_version: "1.0",
    tenant_id: input.profile.tenantId,
    title: handoff.title,
    owner_endpoint_id: input.profile.agentEndpointId,
    participant_endpoint_ids: uniqueStrings([
      handoff.from.agent_endpoint_id,
      handoff.to.agent_endpoint_id,
      input.profile.agentEndpointId,
    ]),
    metadata: {
      handoff_id: handoff.id,
      delivery_id: input.deliveryId,
      provider_profile_id: providerProfile.id,
    },
  });
  const promptMessage = await input.client.appendConversationMessage(
    conversation.id,
    {
      schema_version: "1.0",
      tenant_id: input.profile.tenantId,
      conversation_id: conversation.id,
      author_endpoint_id: input.profile.agentEndpointId,
      role: "user",
      content: prompt,
      references: [
        {
          id: `ref_handoff_${handoff.id}`,
          type: "handoff",
          target_id: handoff.id,
        },
        {
          id: `ref_delivery_${input.deliveryId}`,
          type: "delivery",
          target_id: input.deliveryId,
        },
      ],
      metadata: {
        source: "connector_execute",
      },
    },
  );
  const projection = await input.client.createContextProjection(
    conversation.id,
    {
      schema_version: "1.0",
      tenant_id: input.profile.tenantId,
      conversation_id: conversation.id,
      provider: providerProfile.provider,
      model: providerProfile.model,
      source_message_ids: [promptMessage.id],
      reference_ids: [handoff.id, input.deliveryId],
      token_budget: selection.selected_profile.context_window ?? 16000,
      rendered_context: prompt,
      metadata: executionMetadata({
        providerProfile,
        handoffId: handoff.id,
        deliveryId: input.deliveryId,
      }),
    },
  );

  const executionStartedAt = (input.now ?? (() => new Date()))().toISOString();
  const execution = await input.executor
    .execute({
      prompt,
      profile: input.profile,
      deliveryId: input.deliveryId,
      providerProfile,
      now: input.now,
    })
    .catch(async (error: unknown) => {
      const classified = classifyExecutorError(error);
      const failedAt = (input.now ?? (() => new Date()))().toISOString();
      const metadata = {
        ...executionMetadata({
          providerProfile,
          handoffId: handoff.id,
          deliveryId: input.deliveryId,
        }),
        prompt_message_id: promptMessage.id,
        error_category: classified.category,
        error_message: classified.message,
      };

      await input.client.recordModelRun(conversation.id, {
        schema_version: "1.0",
        tenant_id: input.profile.tenantId,
        conversation_id: conversation.id,
        context_projection_id: projection.id,
        executor_endpoint_id: input.profile.agentEndpointId,
        provider: providerProfile.provider,
        model: providerProfile.model,
        status: "failed",
        started_at: executionStartedAt,
        completed_at: failedAt,
        error: classified,
        metadata,
      });

      await input.client.failDelivery(
        input.deliveryId,
        formatExecutionFailureReason(classified),
      );

      throw new ConnectorExecutionError(
        classified.category,
        classified.message,
      );
    });
  const assistantMessage = await input.client.appendConversationMessage(
    conversation.id,
    {
      schema_version: "1.0",
      tenant_id: input.profile.tenantId,
      conversation_id: conversation.id,
      author_endpoint_id: input.profile.agentEndpointId,
      role: "assistant",
      content:
        execution.transcript.find((message) => message.role === "assistant")
          ?.content ?? execution.reportMarkdown,
      references: [
        {
          id: `ref_handoff_${handoff.id}`,
          type: "handoff",
          target_id: handoff.id,
        },
        {
          id: `ref_delivery_${input.deliveryId}`,
          type: "delivery",
          target_id: input.deliveryId,
        },
      ],
      metadata: {
        source: "connector_execute",
      },
    },
  );
  const modelRun = await input.client.recordModelRun(conversation.id, {
    schema_version: "1.0",
    tenant_id: input.profile.tenantId,
    conversation_id: conversation.id,
    context_projection_id: projection.id,
    executor_endpoint_id: input.profile.agentEndpointId,
    provider: providerProfile.provider,
    model: providerProfile.model,
    status: execution.status,
    started_at: execution.startedAt,
    completed_at: execution.completedAt,
    metadata: {
      ...execution.metadata,
      prompt_message_id: promptMessage.id,
      assistant_message_id: assistantMessage.id,
      handoff_id: handoff.id,
      delivery_id: input.deliveryId,
    },
  });
  const reportPath = await writeExecutionReport({
    workspaceDir: input.workspaceDir,
    handoffId: handoff.id,
    deliveryId: input.deliveryId,
    reportMarkdown: execution.reportMarkdown,
  });
  const artifact = await buildLocalReportArtifact(reportPath);
  await input.client.addArtifact(handoff.id, {
    schema_version: "1.0",
    artifact,
  });
  await input.client.markDeliveryReportReady(input.deliveryId, {
    schema_version: "1.0",
    actor_endpoint_id: input.profile.agentEndpointId,
    reason: `${input.profile.role} Agent 已生成报告，等待人工发送`,
    artifact_ids: [artifact.id],
    metadata: {
      conversation_id: conversation.id,
      model_run_id: modelRun.id,
      provider_profile_id: providerProfile.id,
    },
  });

  return {
    deliveryId: input.deliveryId,
    handoffId: handoff.id,
    status: "report_ready",
    conversationId: conversation.id,
    modelRunId: modelRun.id,
    reportPath,
    artifactId: artifact.id,
    providerProfileId: providerProfile.id,
  };
}

async function writeTrialReport(input: {
  workspaceDir: string;
  handoffId: string;
  deliveryId: string;
  endpointId: string;
  inboxPath: string;
  observedAt: string;
}): Promise<string> {
  const reportsPath = join(input.workspaceDir, ".sartre", "reports");
  await mkdir(reportsPath, { recursive: true });
  const reportPath = join(reportsPath, `${input.handoffId}-trial-report.md`);
  await writeFile(reportPath, renderTrialReport(input), "utf8");
  return reportPath;
}

async function writeExecutionReport(input: {
  workspaceDir: string;
  handoffId: string;
  deliveryId: string;
  reportMarkdown: string;
}): Promise<string> {
  const reportsPath = join(input.workspaceDir, ".sartre", "reports");
  await mkdir(reportsPath, { recursive: true });
  const reportPath = join(
    reportsPath,
    `${input.handoffId}-${input.deliveryId}-codex-report.md`,
  );
  await writeFile(reportPath, input.reportMarkdown, "utf8");
  return reportPath;
}

function renderTrialReport(input: {
  handoffId: string;
  deliveryId: string;
  endpointId: string;
  inboxPath: string;
  observedAt: string;
}): string {
  return [
    `# Trial report for ${input.handoffId}`,
    "",
    `Endpoint: ${input.endpointId}`,
    `Delivery: ${input.deliveryId}`,
    `Inbox: ${input.inboxPath}`,
    `Observed at: ${input.observedAt}`,
    "",
    "Result: local Connector trial run completed.",
    "",
  ].join("\n");
}

async function probeExecutorReadiness(
  input: EndpointHealthProbeInput,
  observedAt: string,
): Promise<EndpointHealthCheck> {
  if (input.executorCheck) {
    return input.executorCheck({ profile: input.profile, observedAt });
  }

  return createHealthCheck({
    key: "executor",
    label: "Executor",
    status: "passed",
    detail: `${input.profile.executionMode} endpoint is ready for manual confirmation.`,
    observedAt,
    metadata: metadataForProfile(input.profile),
  });
}

async function probeDirectoryReadiness(input: {
  key: string;
  label: string;
  directory: string;
  relativePath: string;
  successDetail: string;
  observedAt: string;
  ensureDirectory: (path: string) => Promise<void>;
  metadata: Record<string, string>;
}): Promise<EndpointHealthCheck> {
  try {
    await input.ensureDirectory(input.directory);
    return createHealthCheck({
      key: input.key,
      label: input.label,
      status: "passed",
      detail: input.successDetail,
      observedAt: input.observedAt,
      metadata: {
        ...input.metadata,
        local_path: input.relativePath,
      },
    });
  } catch (error) {
    return createHealthCheck({
      key: input.key,
      label: input.label,
      status: "blocked",
      detail: `Cannot prepare ${input.relativePath}: ${safeErrorMessage(error)}`,
      observedAt: input.observedAt,
      metadata: {
        ...input.metadata,
        local_path: input.relativePath,
      },
    });
  }
}

function probeTrialRunReadiness(
  profile: ConnectorProfile,
  observedAt: string,
): EndpointHealthCheck {
  const status: EndpointHealthStatus =
    profile.executionMode === "manual_confirm" ||
    profile.executionMode === "mock"
      ? "passed"
      : "warning";

  return createHealthCheck({
    key: "trial_run",
    label: "Trial run",
    status,
    detail:
      status === "passed"
        ? "Profile can receive a demo handoff and wait for manual confirmation."
        : "Profile needs a dry run before it should receive real handoffs.",
    observedAt,
    metadata: metadataForProfile(profile),
  });
}

function createHealthCheck(input: {
  key: string;
  label: string;
  status: EndpointHealthStatus;
  detail: string;
  observedAt: string;
  metadata?: Record<string, string>;
}): EndpointHealthCheck {
  return {
    key: input.key,
    label: input.label,
    status: input.status,
    detail: input.detail,
    observed_at: input.observedAt,
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
}

async function ensureDirectoryExists(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

function metadataForProfile(profile: ConnectorProfile): Record<string, string> {
  return {
    profile: profile.agentEndpointId,
    role: profile.role,
    execution_mode: profile.executionMode,
  };
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/(token|password|secret|private[-_]?key|api[-_]?key)/i.test(message)) {
    return "redacted local error";
  }
  return message || "unknown local error";
}

export async function writeHandoffToInbox(input: {
  workspaceDir: string;
  profile?: ConnectorProfile;
  handoff: HandoffEnvelope;
  delivery: DeliveryRecord;
}): Promise<InboxEntry> {
  const entryPath = join(
    input.workspaceDir,
    ".sartre",
    "inbox",
    input.handoff.id,
  );
  await mkdir(entryPath, { recursive: true });

  await Promise.all([
    writeFile(
      join(entryPath, "handoff.md"),
      renderHandoffMarkdown(input.handoff, input.delivery, input.profile),
      "utf8",
    ),
    writeFile(
      join(entryPath, "pack.json"),
      `${JSON.stringify(input.handoff.pack, null, 2)}\n`,
      "utf8",
    ),
    writeFile(
      join(entryPath, "delivery.json"),
      `${JSON.stringify(input.delivery, null, 2)}\n`,
      "utf8",
    ),
  ]);

  return {
    handoffId: input.handoff.id,
    path: entryPath,
    title: input.handoff.title,
    deliveryId: input.delivery.id,
  };
}

export async function listInbox(input: {
  workspaceDir: string;
}): Promise<InboxEntry[]> {
  const inboxPath = join(input.workspaceDir, ".sartre", "inbox");
  try {
    const inboxStat = await stat(inboxPath);
    if (!inboxStat.isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  const children = await readdir(inboxPath, { withFileTypes: true });
  const entries = await Promise.all(
    children
      .filter((child) => child.isDirectory())
      .map(async (child) => readInboxEntry(inboxPath, child.name)),
  );

  return entries
    .filter((entry): entry is InboxEntry => entry !== null)
    .sort((left, right) => left.handoffId.localeCompare(right.handoffId));
}

export async function ackDelivery(input: {
  client: Pick<HandoffHubConnectorClient, "acknowledgeDelivery">;
  deliveryId: string;
}): Promise<unknown> {
  return input.client.acknowledgeDelivery(input.deliveryId);
}

export async function reportArtifact(input: {
  client: Pick<HandoffHubConnectorClient, "addArtifact">;
  handoffId: string;
  filePath: string;
}): Promise<unknown> {
  const artifact = await buildLocalReportArtifact(input.filePath);
  return input.client.addArtifact(input.handoffId, {
    schema_version: "1.0",
    artifact,
  });
}

export async function connectProfile(input: {
  client: Required<
    Pick<
      HandoffHubConnectorClient,
      "registerAgentEndpoint" | "connectAgentEndpoint" | "getHandoff"
    >
  >;
  profile: ConnectorProfile;
  workspaceDir: string;
  lastSeenCursor?: number;
}): Promise<InboxEntry[]> {
  await input.client.registerAgentEndpoint({
    schema_version: "1.0",
    tenant_id: input.profile.tenantId,
    user_id: input.profile.userId,
    role: input.profile.role,
    agent_endpoint_id: input.profile.agentEndpointId,
    online: true,
    capabilities: capabilitiesForProfile(input.profile),
    execution_mode: input.profile.executionMode,
    capability_sources: input.profile.capabilitySources,
    executor: input.profile.executor,
    approval_policy: input.profile.approvalPolicy,
  });

  const response = await input.client.connectAgentEndpoint(
    input.profile.agentEndpointId,
    {
      schema_version: "1.0",
      last_seen_cursor: input.lastSeenCursor ?? 0,
    },
  );

  const deliveries = extractDeliveries(response);
  const entries: InboxEntry[] = [];
  for (const delivery of deliveries) {
    const handoff = await fetchHandoffEnvelope(
      input.client,
      delivery.handoffId,
    );
    entries.push(
      await writeHandoffToInbox({
        workspaceDir: input.workspaceDir,
        profile: input.profile,
        handoff,
        delivery,
      }),
    );
  }
  return entries;
}

export async function listenOnce(input: {
  client: Required<
    Pick<HandoffHubConnectorClient, "getHandoff" | "streamUrlForEndpoint">
  >;
  profile: ConnectorProfile;
  workspaceDir: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<InboxEntry> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    input.timeoutMs ?? 30_000,
  );

  try {
    const response = await fetchImpl(
      input.client.streamUrlForEndpoint(input.profile.agentEndpointId),
      { signal: controller.signal },
    );
    if (!response.ok || !response.body) {
      throw new Error(`SSE connection failed: ${response.status}`);
    }

    const event = await readFirstDeliveryEvent(response.body);
    const handoff = await fetchHandoffEnvelope(input.client, event.handoffId);
    return writeHandoffToInbox({
      workspaceDir: input.workspaceDir,
      profile: input.profile,
      handoff,
      delivery: {
        id: event.deliveryId,
        handoffId: event.handoffId,
        recipientEndpointId: event.recipientEndpointId,
        cursor: event.cursor,
        status: "delivered",
        deliveredAt: new Date().toISOString(),
        acknowledgedAt: null,
      },
    });
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

function capabilitiesForProfile(profile: ConnectorProfile): string[] {
  const capabilities = new Set<string>();
  for (const source of profile.capabilitySources) {
    if (!source.enabled) {
      continue;
    }
    for (const capability of source.capabilities) {
      capabilities.add(capability);
    }
  }
  return [...capabilities].sort();
}

function renderHandoffMarkdown(
  handoff: HandoffEnvelope,
  delivery: DeliveryRecord,
  profile?: ConnectorProfile,
): string {
  return [
    `# ${handoff.title}`,
    "",
    `From: ${handoff.from.role} / ${handoff.from.user_id}`,
    `To: ${handoff.to.role} / ${handoff.to.user_id}`,
    `Delivery: \`${delivery.id}\``,
    "",
    "## Summary",
    "",
    handoff.summary,
    "",
    ...renderCapabilitySourceSection(profile),
    "## Instructions",
    "",
    "Read `pack.json` and produce the requested report.",
    `Ack with: pnpm --filter @sartre/connector-cli start -- ack ${delivery.id}`,
    `Report with: pnpm --filter @sartre/connector-cli start -- report ${handoff.id} <file>`,
    "",
  ].join("\n");
}

function renderCapabilitySourceSection(profile?: ConnectorProfile): string[] {
  const sources =
    profile?.capabilitySources.filter((source) => source.enabled) ?? [];
  if (sources.length === 0) {
    return [];
  }

  return [
    "## Agent Capabilities",
    "",
    ...sources.flatMap((source) => [
      `- ${source.name} (${source.type}): ${source.capabilities.join(", ")}`,
      `  - ${source.summary}`,
      `  - Approval: ${source.approval_mode}`,
    ]),
    "",
  ];
}

async function readInboxEntry(
  inboxPath: string,
  handoffId: string,
): Promise<InboxEntry | null> {
  const entryPath = join(inboxPath, handoffId);
  try {
    const [handoffMarkdown, deliveryJson] = await Promise.all([
      readFile(join(entryPath, "handoff.md"), "utf8"),
      readFile(join(entryPath, "delivery.json"), "utf8"),
    ]);
    const delivery = JSON.parse(deliveryJson) as Partial<DeliveryRecord>;
    return {
      handoffId,
      path: entryPath,
      title: handoffMarkdown.match(/^# (.+)$/m)?.[1],
      deliveryId: delivery.id,
    };
  } catch {
    return null;
  }
}

async function findInboxEntryByDeliveryId(input: {
  workspaceDir: string;
  deliveryId: string;
}): Promise<InboxEntry | null> {
  const entries = await listInbox({ workspaceDir: input.workspaceDir });
  return entries.find((entry) => entry.deliveryId === input.deliveryId) ?? null;
}

async function readDeliveryRecord(entryPath: string): Promise<DeliveryRecord> {
  const deliveryJson = JSON.parse(
    await readFile(join(entryPath, "delivery.json"), "utf8"),
  );
  if (!isDeliveryRecord(deliveryJson)) {
    throw new Error(`Invalid delivery cache at ${entryPath}`);
  }
  return deliveryJson;
}

async function buildLocalReportArtifact(filePath: string): Promise<{
  id: string;
  name: string;
  kind: string;
  storage_url: string;
  checksum: string;
}> {
  const file = await readFile(filePath);
  const artifactName = basename(filePath);
  const checksum = createHash("sha256").update(file).digest("hex");
  return {
    id: `artifact_${checksum.slice(0, 12)}`,
    name: artifactName,
    kind: "qa_to_dev_report",
    storage_url: pathToFileURL(filePath).toString(),
    checksum: `sha256-${checksum}`,
  };
}

function executionMetadata(input: {
  providerProfile: CodexProviderProfile;
  handoffId: string;
  deliveryId: string;
}): Record<string, string> {
  return {
    source: "connector_execute",
    provider_profile_id: input.providerProfile.id,
    provider: input.providerProfile.provider,
    model: input.providerProfile.model,
    executor_kind: input.providerProfile.executorKind,
    handoff_id: input.handoffId,
    delivery_id: input.deliveryId,
  };
}

function formatExecutionFailureReason(error: ClassifiedConnectorError): string {
  return `Codex execution failed (${error.category}): ${error.message}`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function extractDeliveries(response: unknown): DeliveryRecord[] {
  if (!isRecord(response)) {
    return [];
  }

  const deliveries: DeliveryRecord[] = [];
  if (isDeliveryRecord(response.delivery)) {
    deliveries.push(response.delivery);
  }

  if (Array.isArray(response.events)) {
    for (const event of response.events) {
      if (isDeliveryEvent(event)) {
        deliveries.push({
          id: event.deliveryId,
          handoffId: event.handoffId,
          recipientEndpointId: event.recipientEndpointId,
          cursor: event.cursor,
          status: "delivered",
          deliveredAt: new Date().toISOString(),
          acknowledgedAt: null,
        });
      }
    }
  }

  return deliveries;
}

async function fetchHandoffEnvelope(
  client: Pick<HandoffHubConnectorClient, "getHandoff">,
  handoffId: string,
): Promise<HandoffEnvelope> {
  const response = await client.getHandoff?.(handoffId);
  if (!isRecord(response) || !isHandoffEnvelope(response.handoff)) {
    throw new Error(`Handoff ${handoffId} is unavailable`);
  }
  return response.handoff;
}

async function readFirstDeliveryEvent(
  body: ReadableStream<Uint8Array>,
): Promise<{
  handoffId: string;
  deliveryId: string;
  recipientEndpointId: string;
  cursor: number;
}> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\n\n/);
      buffer = blocks.pop() ?? "";
      for (const block of blocks) {
        const dataLine = block
          .split("\n")
          .find((line) => line.startsWith("data:"));
        if (!dataLine) {
          continue;
        }
        const event = JSON.parse(dataLine.slice("data:".length).trim());
        const payload =
          isRecord(event) && isRecord(event.data) ? event.data : event;
        if (isDeliveryEvent(payload)) {
          await reader.cancel();
          return {
            handoffId: payload.handoffId,
            deliveryId: payload.deliveryId,
            recipientEndpointId: payload.recipientEndpointId,
            cursor: payload.cursor,
          };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  throw new Error("SSE stream ended before a delivery event was received");
}

function isHandoffEnvelope(value: unknown): value is HandoffEnvelope {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.schema_version === "string" &&
    typeof value.tenant_id === "string" &&
    isRecord(value.from) &&
    isRecord(value.to) &&
    typeof value.title === "string" &&
    typeof value.summary === "string" &&
    isRecord(value.pack) &&
    typeof value.status === "string" &&
    typeof value.created_at === "string"
  );
}

function isDeliveryRecord(value: unknown): value is DeliveryRecord {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.handoffId === "string" &&
    typeof value.recipientEndpointId === "string" &&
    typeof value.cursor === "number" &&
    typeof value.status === "string"
  );
}

function isDeliveryEvent(value: unknown): value is {
  handoffId: string;
  deliveryId: string;
  recipientEndpointId: string;
  cursor: number;
} {
  return (
    isRecord(value) &&
    typeof value.handoffId === "string" &&
    typeof value.deliveryId === "string" &&
    typeof value.recipientEndpointId === "string" &&
    typeof value.cursor === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
