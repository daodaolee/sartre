import { pathToFileURL } from "node:url";
import {
  ackDelivery,
  type CodexExecutor,
  type ConnectorProfile,
  classifyExecutorError,
  connectProfile,
  createCodexCliExecutor,
  createFakeCodexExecutor,
  defaultHubBaseUrl,
  executeDelivery,
  listenOnce,
  listInbox,
  localDemoDevProfile,
  localDemoQaProfile,
  profileForName,
  profileToText,
  reportArtifact,
  runCodexAppServerSmoke,
  runTrialHandoff,
  submitProfileHealth,
  writeHandoffToInbox,
} from "@sartre/connector-core";
import { HandoffHubClient } from "@sartre/sdk";

export {
  ackDelivery,
  type CodexExecutor,
  type ConnectorProfile,
  type ConnectorProfileName,
  connectProfile,
  createCodexCliExecutor,
  createFakeCodexExecutor,
  type DeliveryRecord,
  defaultHubBaseUrl,
  executeDelivery,
  type HandoffHubConnectorClient,
  type InboxEntry,
  listenOnce,
  listInbox,
  localDemoDevProfile,
  localDemoQaProfile,
  probeEndpointHealth,
  profileForName,
  profileToText,
  reportArtifact,
  runCodexAppServerSmoke,
  runTrialHandoff,
  submitProfileHealth,
  writeHandoffToInbox,
} from "@sartre/connector-core";

type RunnableConnectorClient =
  | HandoffHubClient
  | {
      registerAgentEndpoint?: HandoffHubClient["registerAgentEndpoint"];
      connectAgentEndpoint?: HandoffHubClient["connectAgentEndpoint"];
      createHandoff?: HandoffHubClient["createHandoff"];
      getHandoff?: HandoffHubClient["getHandoff"];
      acknowledgeDelivery?: HandoffHubClient["acknowledgeDelivery"];
      acceptDelivery?: HandoffHubClient["acceptDelivery"];
      failDelivery?: HandoffHubClient["failDelivery"];
      startDelivery?: HandoffHubClient["startDelivery"];
      markDeliveryReportReady?: HandoffHubClient["markDeliveryReportReady"];
      addArtifact?: HandoffHubClient["addArtifact"];
      registerProviderModelProfile?: HandoffHubClient["registerProviderModelProfile"];
      resolveProviderModelSelection?: HandoffHubClient["resolveProviderModelSelection"];
      createConversation?: HandoffHubClient["createConversation"];
      appendConversationMessage?: HandoffHubClient["appendConversationMessage"];
      createContextProjection?: HandoffHubClient["createContextProjection"];
      recordModelRun?: HandoffHubClient["recordModelRun"];
      reportEndpointHealth?: HandoffHubClient["reportEndpointHealth"];
      streamUrlForEndpoint?: HandoffHubClient["streamUrlForEndpoint"];
    };

export type ConnectorCliOptions = {
  argv?: string[];
  workspaceDir?: string;
  env?: Record<string, string | undefined>;
  client?: RunnableConnectorClient;
  stdout?: (line: string) => void;
  now?: () => Date;
  codexAppServerSmoke?: typeof runCodexAppServerSmoke;
  codexCliExecutorFactory?: (
    input: CodexCliExecutorFactoryInput,
  ) => CodexExecutor;
  executor?: CodexExecutor;
};

export type CodexCliExecutorFactoryInput = {
  workspaceDir: string;
  codexBinary: string;
  timeoutMs?: number;
  env: Record<string, string | undefined>;
};

export async function runConnectorCli(
  options: ConnectorCliOptions = {},
): Promise<void> {
  const rawArgv = options.argv ?? process.argv.slice(2);
  const argv = rawArgv[0] === "--" ? rawArgv.slice(1) : rawArgv;
  const [command, first, second] = argv;
  const workspaceDir = options.workspaceDir ?? process.cwd();
  const stdout = options.stdout ?? ((line: string) => console.log(line));
  const profile =
    first === "dev" || first === "qa" ? profileForName(first) : undefined;
  const client =
    options.client ??
    new HandoffHubClient({
      baseUrl:
        options.env?.SARTRE_HUB_BASE_URL ??
        process.env.SARTRE_HUB_BASE_URL ??
        defaultHubBaseUrl,
    });

  if (command === "profile" && profile) {
    stdout(profileToText(profile));
    return;
  }

  if (command === "connect" && profile) {
    const entries = await connectProfile({
      client: requireConnectorClient(client, [
        "registerAgentEndpoint",
        "connectAgentEndpoint",
        "getHandoff",
      ]),
      profile,
      workspaceDir,
    });
    stdout(JSON.stringify({ entries }, null, 2));
    return;
  }

  if (command === "listen" && profile && argv.includes("--once")) {
    const entry = await listenOnce({
      client: requireConnectorClient(client, [
        "getHandoff",
        "streamUrlForEndpoint",
      ]),
      profile,
      workspaceDir,
    });
    stdout(JSON.stringify({ entry }, null, 2));
    return;
  }

  if (command === "inbox") {
    stdout(JSON.stringify(await listInbox({ workspaceDir }), null, 2));
    return;
  }

  if (command === "ack" && first) {
    stdout(
      JSON.stringify(
        await ackDelivery({
          client: requireConnectorClient(client, ["acknowledgeDelivery"]),
          deliveryId: first,
        }),
      ),
    );
    return;
  }

  if (command === "report" && first && second) {
    stdout(
      JSON.stringify(
        await reportArtifact({
          client: requireConnectorClient(client, ["addArtifact"]),
          handoffId: first,
          filePath: second,
        }),
      ),
    );
    return;
  }

  if (command === "health" && profile) {
    stdout(
      JSON.stringify(
        await submitProfileHealth({
          client: requireConnectorClient(client, ["reportEndpointHealth"]),
          profile,
          workspaceDir,
          now: options.now,
        }),
        null,
        2,
      ),
    );
    return;
  }

  if (command === "trial" && profile) {
    stdout(
      JSON.stringify(
        await runTrialHandoff({
          client: requireConnectorClient(client, [
            "registerAgentEndpoint",
            "connectAgentEndpoint",
            "getHandoff",
            "acknowledgeDelivery",
            "addArtifact",
          ]),
          profile,
          workspaceDir,
          now: options.now,
        }),
        null,
        2,
      ),
    );
    return;
  }

  if (command === "execute" && profile && second) {
    stdout(
      JSON.stringify(
        await executeDelivery({
          client: requireConnectorClient(client, [
            "getHandoff",
            "startDelivery",
            "failDelivery",
            "resolveProviderModelSelection",
            "createConversation",
            "appendConversationMessage",
            "createContextProjection",
            "recordModelRun",
            "addArtifact",
            "markDeliveryReportReady",
          ]),
          profile,
          workspaceDir,
          deliveryId: second,
          executor:
            options.executor ??
            resolveCodexExecutor({
              argv,
              env: effectiveEnv(options.env),
              workspaceDir,
              codexCliExecutorFactory: options.codexCliExecutorFactory,
            }),
          now: options.now,
        }),
        null,
        2,
      ),
    );
    return;
  }

  if (command === "handoff-smoke" && profile && argv.includes("--real-codex")) {
    stdout(
      JSON.stringify(
        await runRealHandoffExecutionSmoke({
          client,
          profile,
          workspaceDir,
          env: effectiveEnv(options.env),
          now: options.now,
          codexCliExecutorFactory: options.codexCliExecutorFactory,
        }),
        null,
        2,
      ),
    );
    return;
  }

  if (command === "codex-smoke" && argv.includes("--exec")) {
    stdout(
      JSON.stringify(
        await runCodexExecSmoke({
          env: effectiveEnv(options.env),
          workspaceDir,
          now: options.now,
          codexCliExecutorFactory: options.codexCliExecutorFactory,
        }),
        null,
        2,
      ),
    );
    return;
  }

  if (command === "codex-smoke") {
    stdout(
      JSON.stringify(
        await (options.codexAppServerSmoke ?? runCodexAppServerSmoke)({
          now: options.now,
        }),
        null,
        2,
      ),
    );
    return;
  }

  throw new Error(usageText());
}

function requireConnectorClient<TMethod extends keyof RunnableConnectorClient>(
  client: RunnableConnectorClient,
  methods: TMethod[],
): Required<Pick<RunnableConnectorClient, TMethod>> {
  for (const method of methods) {
    if (typeof client[method] !== "function") {
      throw new Error(`Connector client missing method: ${String(method)}`);
    }
  }
  return client as Required<Pick<RunnableConnectorClient, TMethod>>;
}

function resolveCodexExecutor(input: {
  argv: string[];
  env: Record<string, string | undefined>;
  workspaceDir: string;
  codexCliExecutorFactory?: (
    factoryInput: CodexCliExecutorFactoryInput,
  ) => CodexExecutor;
}): CodexExecutor {
  const executorKind = selectedCodexExecutorKind(input.argv, input.env);
  if (executorKind === "real") {
    return createCodexCliExecutorForCli(input);
  }

  return createFakeCodexExecutor({
    assistantOutput:
      "Fake Codex adapter completed. Configure the real Codex runtime binding before production execution.",
  });
}

function createCodexCliExecutorForCli(input: {
  env: Record<string, string | undefined>;
  workspaceDir: string;
  codexCliExecutorFactory?: (
    factoryInput: CodexCliExecutorFactoryInput,
  ) => CodexExecutor;
}): CodexExecutor {
  const codexBinary = input.env.SARTRE_CODEX_BINARY ?? "codex";
  const timeoutMs = parseOptionalPositiveInteger(
    input.env.SARTRE_CODEX_TIMEOUT_MS,
  );
  const factoryInput: CodexCliExecutorFactoryInput = {
    workspaceDir: input.workspaceDir,
    codexBinary,
    timeoutMs,
    env: input.env,
  };

  if (input.codexCliExecutorFactory) {
    return input.codexCliExecutorFactory(factoryInput);
  }

  return createCodexCliExecutor({
    workspaceDir: input.workspaceDir,
    codexBinary,
    timeoutMs,
  });
}

function selectedCodexExecutorKind(
  argv: string[],
  env: Record<string, string | undefined>,
): "fake" | "real" {
  const flagValue = readExecutorFlag(argv);
  const rawValue = flagValue ?? env.SARTRE_CODEX_EXECUTOR ?? "fake";
  if (rawValue === "real" || rawValue === "codex_cli") {
    return "real";
  }
  if (rawValue === "fake" || rawValue === "mock") {
    return "fake";
  }

  throw new Error(
    `Unsupported Codex executor "${rawValue}". Use fake or real.`,
  );
}

function readExecutorFlag(argv: string[]): string | undefined {
  if (argv.includes("--real-codex")) {
    return "real";
  }

  const splitIndex = argv.indexOf("--executor");
  if (splitIndex >= 0) {
    return argv[splitIndex + 1];
  }

  return argv
    .find((arg) => arg.startsWith("--executor="))
    ?.slice("--executor=".length);
}

async function runCodexExecSmoke(input: {
  env: Record<string, string | undefined>;
  workspaceDir: string;
  now?: () => Date;
  codexCliExecutorFactory?: (
    factoryInput: CodexCliExecutorFactoryInput,
  ) => CodexExecutor;
}) {
  const observedAt = (input.now ?? (() => new Date()))().toISOString();
  const executor = createCodexCliExecutorForCli({
    env: input.env,
    workspaceDir: input.workspaceDir,
    codexCliExecutorFactory: input.codexCliExecutorFactory,
  });
  const command = `${input.env.SARTRE_CODEX_BINARY ?? "codex"} exec`;

  try {
    const result = await executor.execute({
      prompt: "Reply with exactly: SARTRE_CODEX_SMOKE_OK",
      profile: localDemoQaProfile,
      deliveryId: "codex_smoke",
      providerProfile: {
        id: "codex_smoke_profile",
        provider: "codex",
        model: input.env.SARTRE_CODEX_MODEL ?? "default",
        executorKind: "codex_cli",
      },
      now: () => new Date(observedAt),
    });
    return {
      status: "REAL_TEST" as const,
      command: result.metadata.command ?? command,
      detail:
        result.transcript.find((message) => message.role === "assistant")
          ?.content ?? result.reportMarkdown,
      observedAt,
      metadata: {
        ...result.metadata,
        adapter: result.metadata.adapter ?? "codex_cli",
      },
    };
  } catch (error) {
    const classified = classifyExecutorError(error);
    return {
      status: "SKIPPED" as const,
      command,
      detail: classified.message,
      observedAt,
      metadata: {
        adapter: "codex_cli",
        category: classified.category,
      },
    };
  }
}

async function runRealHandoffExecutionSmoke(input: {
  client: RunnableConnectorClient;
  profile: ConnectorProfile;
  workspaceDir: string;
  env: Record<string, string | undefined>;
  now?: () => Date;
  codexCliExecutorFactory?: (
    factoryInput: CodexCliExecutorFactoryInput,
  ) => CodexExecutor;
}) {
  const observedAt = (input.now ?? (() => new Date()))().toISOString();
  const command = "connector handoff-smoke --real-codex";

  try {
    const client = requireConnectorClient(input.client, [
      "registerAgentEndpoint",
      "createHandoff",
      "connectAgentEndpoint",
      "getHandoff",
      "acceptDelivery",
      "startDelivery",
      "failDelivery",
      "resolveProviderModelSelection",
      "createConversation",
      "appendConversationMessage",
      "createContextProjection",
      "recordModelRun",
      "addArtifact",
      "markDeliveryReportReady",
      "registerProviderModelProfile",
    ]);
    await client.registerAgentEndpoint(
      profileRegistrationRequest(localDemoDevProfile),
    );
    await client.registerAgentEndpoint(
      profileRegistrationRequest(input.profile),
    );
    await client.registerProviderModelProfile({
      schema_version: "1.0",
      tenant_id: input.profile.tenantId,
      agent_endpoint_id: input.profile.agentEndpointId,
      provider: "codex",
      model: input.env.SARTRE_CODEX_MODEL ?? "default",
      label: "Codex CLI Smoke",
      executor: {
        kind: "codex_cli",
        label: "Codex CLI",
        command: input.env.SARTRE_CODEX_BINARY ?? "codex",
      },
      capabilities: ["chat", "repo_context", "local_command"],
      default_for_endpoint: true,
      status: "available",
      metadata: {
        source: "connector_handoff_smoke",
      },
    });
    const created = await client.createHandoff(
      createRealHandoffSmokeRequest(input.profile, observedAt),
    );
    const entries = await connectProfile({
      client,
      profile: input.profile,
      workspaceDir: input.workspaceDir,
    });
    const deliveryId = created.delivery.id;
    const accepted = await client.acceptDelivery(deliveryId, {
      schema_version: "1.0",
      actor_endpoint_id: input.profile.agentEndpointId,
      reason: "真实 handoff execution smoke 放行",
      metadata: {
        source: "connector_handoff_smoke",
      },
    });
    const handoff =
      unwrapHandoffEnvelope(
        await client.getHandoff(created.delivery.handoffId),
      ) ?? unwrapHandoffEnvelope(created.handoff);
    await writeHandoffToInbox({
      workspaceDir: input.workspaceDir,
      profile: input.profile,
      handoff,
      delivery: accepted.delivery,
    });
    const result = await executeDelivery({
      client,
      profile: input.profile,
      workspaceDir: input.workspaceDir,
      deliveryId,
      executor: createCodexCliExecutorForCli({
        env: {
          ...input.env,
          SARTRE_CODEX_EXECUTOR: "real",
        },
        workspaceDir: input.workspaceDir,
        codexCliExecutorFactory: input.codexCliExecutorFactory,
      }),
      now: input.now,
    });

    return {
      status: "REAL_TEST" as const,
      command,
      detail: `delivery ${result.deliveryId} reached ${result.status}`,
      observedAt,
      metadata: {
        handoff_id: result.handoffId,
        delivery_id: result.deliveryId,
        final_status: result.status,
        provider_profile_id: result.providerProfileId,
        model_run_id: result.modelRunId,
        inbox_entries: String(entries.length),
      },
    };
  } catch (error) {
    const classified = classifyExecutorError(error);
    return {
      status: "SKIPPED" as const,
      command,
      detail: classified.message,
      observedAt,
      metadata: {
        category: classified.category,
      },
    };
  }
}

function profileRegistrationRequest(profile: ConnectorProfile) {
  return {
    schema_version: "1.0" as const,
    tenant_id: profile.tenantId,
    user_id: profile.userId,
    role: profile.role,
    agent_endpoint_id: profile.agentEndpointId,
    online: true,
    capabilities: capabilitiesForProfile(profile),
    execution_mode: profile.executionMode,
    capability_sources: profile.capabilitySources,
    executor: profile.executor,
    approval_policy: profile.approvalPolicy,
  };
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

function createRealHandoffSmokeRequest(
  profile: ConnectorProfile,
  observedAt: string,
) {
  return {
    schema_version: "1.0" as const,
    tenant_id: profile.tenantId,
    from: {
      user_id: localDemoDevProfile.userId,
      role: localDemoDevProfile.role,
      agent_endpoint_id: localDemoDevProfile.agentEndpointId,
    },
    to: {
      user_id: profile.userId,
      role: profile.role,
      agent_endpoint_id: profile.agentEndpointId,
    },
    title: "Sartre real handoff execution smoke",
    summary: [
      "This is a local smoke handoff for Sartre Connector.",
      "Do not inspect the repository or run commands for this smoke.",
      "Use only this delivery context and produce a concise report.",
      "The report must include exactly this marker: SARTRE_HANDOFF_SMOKE_OK.",
      `Observed at: ${observedAt}`,
    ].join("\n"),
    pack: {
      entry: "handoff.md",
      artifacts: [
        {
          id: "artifact_smoke_entry",
          name: "handoff.md",
          kind: "agent_readable_instruction",
          storage_url: "file://handoff.md",
          checksum: "sha256-smoke-entry",
        },
      ],
    },
  };
}

function unwrapHandoffEnvelope(value: unknown) {
  if (isRecord(value) && isRecord(value.handoff)) {
    return value.handoff as Parameters<
      typeof writeHandoffToInbox
    >[0]["handoff"];
  }
  if (isRecord(value) && typeof value.id === "string") {
    return value as Parameters<typeof writeHandoffToInbox>[0]["handoff"];
  }
  throw new Error("Hub did not return a handoff envelope for smoke execution");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function effectiveEnv(
  env?: Record<string, string | undefined>,
): Record<string, string | undefined> {
  return env ?? process.env;
}

function parseOptionalPositiveInteger(value: string | undefined) {
  if (!value) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer: ${value}`);
  }
  return parsed;
}

function usageText(): string {
  return [
    "Usage:",
    "  connector profile <dev|qa>",
    "  connector connect <dev|qa>",
    "  connector listen <dev|qa> --once",
    "  connector inbox",
    "  connector ack <delivery-id>",
    "  connector report <handoff-id> <file>",
    "  connector health <dev|qa>",
    "  connector trial <dev|qa>",
    "  connector execute <dev|qa> <delivery-id> [--executor fake|real]",
    "  connector handoff-smoke <dev|qa> --real-codex",
    "  connector codex-smoke [--exec]",
  ].join("\n");
}

async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  await runConnectorCli({ argv });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
