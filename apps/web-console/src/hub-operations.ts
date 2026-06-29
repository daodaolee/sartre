import type {
  ConversationDetailResponse,
  ConversationLedger,
  CreateHandoffRequest,
  CreateHandoffResponse,
  HandoffOverviewResponse,
  RegisterAgentEndpointRequest,
  RoleCapabilityMention,
} from "@sartre/contracts";
import { localDemoProfileFacts } from "@sartre/contracts";
import type { HandoffHubClient } from "@sartre/sdk";
import {
  buildTaskConversationReferences,
  collectReferenceIds,
  renderCapabilityContextBlock,
} from "./capability-references";

export type LocalActor = "dev" | "qa";

export type OperationResult = {
  status: "succeeded" | "failed";
  detail: string;
  nextCursor?: number;
};

export type TaskHandoffAttachmentInput = {
  id: string;
  name: string;
  kind: string;
  storageUrl: string;
  checksum: string;
};

export type CreateTaskHandoffInput = {
  actor: LocalActor;
  title: string;
  description: string;
  descriptionHtml?: string;
  targetActor: LocalActor;
  targetAgentEndpointId: string;
  attachments: TaskHandoffAttachmentInput[];
  capabilityReferences?: RoleCapabilityMention[];
};

export type SendTaskReplyInput = {
  deliveryId: string;
  currentStatus: string;
  actorEndpointId: string;
  targetAgentEndpointId: string;
  content: string;
  contentHtml: string;
  attachments: TaskHandoffAttachmentInput[];
  capabilityReferences?: RoleCapabilityMention[];
  closeTask: boolean;
};

export type WebConsoleOperationClient = Pick<
  HandoffHubClient,
  | "registerAgentEndpoint"
  | "connectAgentEndpoint"
  | "createHandoff"
  | "createConversation"
  | "appendConversationMessage"
  | "createContextProjection"
  | "getConversations"
  | "getConversationDetail"
  | "replayEvents"
  | "acknowledgeDelivery"
  | "failDelivery"
  | "expireDelivery"
  | "acceptDelivery"
  | "markDeliveryReportReady"
  | "sendDeliveryResult"
  | "closeDelivery"
>;

export type WebConsoleOperations = {
  registerActor(actor: LocalActor): Promise<OperationResult>;
  connectActor(
    actor: LocalActor,
    lastSeenCursor: number,
  ): Promise<OperationResult>;
  createDemoHandoff(): Promise<OperationResult>;
  createTaskHandoff(input: CreateTaskHandoffInput): Promise<OperationResult>;
  replayActor(actor: LocalActor, afterCursor: number): Promise<OperationResult>;
  ackDelivery(deliveryId: string): Promise<OperationResult>;
  failDelivery(deliveryId: string, reason: string): Promise<OperationResult>;
  expireDelivery(deliveryId: string, reason: string): Promise<OperationResult>;
  acceptDelivery(
    deliveryId: string,
    actorOrEndpointId: LocalActor | string,
  ): Promise<OperationResult>;
  markDeliveryReportReady(
    deliveryId: string,
    actorOrEndpointId: LocalActor | string,
    artifactIds?: string[],
  ): Promise<OperationResult>;
  closeDelivery(
    deliveryId: string,
    actorOrEndpointId: LocalActor | string,
  ): Promise<OperationResult>;
  sendTaskReply(input: SendTaskReplyInput): Promise<OperationResult>;
};

export const localDemoProfiles = {
  dev: {
    schema_version: "1.0",
    tenant_id: localDemoProfileFacts.dev.tenant_id,
    user_id: localDemoProfileFacts.dev.user_id,
    role: localDemoProfileFacts.dev.role,
    agent_endpoint_id: localDemoProfileFacts.dev.agent_endpoint_id,
    online: true,
    capabilities: ["generate_change_report", "create_handoff_pack"],
    execution_mode: localDemoProfileFacts.dev.execution_mode,
  },
  qa: {
    schema_version: "1.0",
    tenant_id: localDemoProfileFacts.qa.tenant_id,
    user_id: localDemoProfileFacts.qa.user_id,
    role: localDemoProfileFacts.qa.role,
    agent_endpoint_id: localDemoProfileFacts.qa.agent_endpoint_id,
    online: false,
    capabilities: [
      "read_handoff_pack",
      "generate_test_scope",
      "upload_artifact",
    ],
    execution_mode: localDemoProfileFacts.qa.execution_mode,
  },
} satisfies Record<LocalActor, RegisterAgentEndpointRequest>;

export function createWebConsoleOperations(input: {
  client: WebConsoleOperationClient;
  refreshOverview: () => Promise<HandoffOverviewResponse | unknown>;
}): WebConsoleOperations {
  async function refreshAfterCommand() {
    await input.refreshOverview();
  }

  return {
    async registerActor(actor) {
      return asOperationResult(async () => {
        const profile = localDemoProfiles[actor];
        await input.client.registerAgentEndpoint(profile);
        await refreshAfterCommand();
        return `已注册 ${profile.agent_endpoint_id}`;
      });
    },

    async connectActor(actor, lastSeenCursor) {
      return asOperationResult(async () => {
        const profile = localDemoProfiles[actor];
        const response = await input.client.connectAgentEndpoint(
          profile.agent_endpoint_id,
          {
            schema_version: "1.0",
            last_seen_cursor: lastSeenCursor,
          },
        );
        await refreshAfterCommand();
        return {
          detail: `已连接 ${profile.agent_endpoint_id}，同步 ${countEvents(response)} 个事件`,
          nextCursor: extractNextCursor(response, lastSeenCursor),
        };
      });
    },

    async createDemoHandoff() {
      return asOperationResult(async () => {
        const response = await input.client.createHandoff(
          createDemoHandoffRequest(),
        );
        await refreshAfterCommand();
        return `已创建投递 ${response.delivery.id}`;
      });
    },

    async createTaskHandoff(taskInput) {
      return asOperationResult(async () => {
        const request = createTaskHandoffRequest(taskInput);
        const response = await input.client.createHandoff(request);
        await mirrorCreatedTaskIntoConversation({
          client: input.client,
          request,
          response,
          taskInput,
        });
        await refreshAfterCommand();
        return `已发送任务 ${response.delivery.id}`;
      });
    },

    async replayActor(actor, afterCursor) {
      return asOperationResult(async () => {
        const profile = localDemoProfiles[actor];
        const response = await input.client.replayEvents({
          tenantId: profile.tenant_id,
          endpointId: profile.agent_endpoint_id,
          afterCursor,
        });
        const nextCursor = response.events.reduce(
          (cursor, event) => Math.max(cursor, event.cursor ?? cursor),
          afterCursor,
        );
        return {
          detail: `已重放 ${response.events.length} 个事件`,
          nextCursor,
        };
      });
    },

    async ackDelivery(deliveryId) {
      return asOperationResult(async () => {
        await input.client.acknowledgeDelivery(deliveryId);
        await refreshAfterCommand();
        return `已确认 ${deliveryId}`;
      });
    },

    async failDelivery(deliveryId, reason) {
      return asOperationResult(async () => {
        await input.client.failDelivery(deliveryId, reason);
        await refreshAfterCommand();
        return `已标记失败 ${deliveryId}`;
      });
    },

    async expireDelivery(deliveryId, reason) {
      return asOperationResult(async () => {
        await input.client.expireDelivery(deliveryId, reason);
        await refreshAfterCommand();
        return `已标记过期 ${deliveryId}`;
      });
    },

    async acceptDelivery(deliveryId, actorOrEndpointId) {
      return asOperationResult(async () => {
        const actorEndpointId = endpointIdForActorOrEndpoint(actorOrEndpointId);
        await input.client.acceptDelivery(deliveryId, {
          schema_version: "1.0",
          actor_endpoint_id: actorEndpointId,
          reason: "人工确认后放行给当前岗位 Agent",
          metadata: {
            source: "web-console",
            actor_endpoint_id: actorEndpointId,
          },
        });
        await refreshAfterCommand();
        return `已放行 ${deliveryId}`;
      });
    },

    async markDeliveryReportReady(
      deliveryId,
      actorOrEndpointId,
      artifactIds = [],
    ) {
      return asOperationResult(async () => {
        const actorEndpointId = endpointIdForActorOrEndpoint(actorOrEndpointId);
        await input.client.markDeliveryReportReady(deliveryId, {
          schema_version: "1.0",
          actor_endpoint_id: actorEndpointId,
          reason: "Agent 已完成并写入结果",
          artifact_ids: artifactIds,
          metadata: {
            source: "web-console",
            actor_endpoint_id: actorEndpointId,
          },
        });
        await refreshAfterCommand();
        return `已生成结果 ${deliveryId}`;
      });
    },

    async closeDelivery(deliveryId, actorOrEndpointId) {
      return asOperationResult(async () => {
        const actorEndpointId = endpointIdForActorOrEndpoint(actorOrEndpointId);
        await input.client.closeDelivery(deliveryId, {
          schema_version: "1.0",
          actor_endpoint_id: actorEndpointId,
          reason: "人工检查后发送结果",
          metadata: {
            source: "web-console",
            actor_endpoint_id: actorEndpointId,
          },
        });
        await refreshAfterCommand();
        return `已发送结果 ${deliveryId}`;
      });
    },

    async sendTaskReply(replyInput) {
      return asOperationResult(async () => {
        const capabilityReferences = replyInput.capabilityReferences ?? [];
        const artifactIds = replyInput.attachments.map(
          (attachment) => attachment.id,
        );
        const metadata = {
          source: "web-console",
          actor_endpoint_id: replyInput.actorEndpointId,
          target_agent_endpoint_id: replyInput.targetAgentEndpointId,
          content: replyInput.content,
          content_html: replyInput.contentHtml,
          attachment_ids: artifactIds,
          ...(capabilityReferences.length === 0
            ? {}
            : {
                capability_reference_ids: capabilityReferences
                  .map((reference) => reference.targetId)
                  .join(","),
                capability_mentions: capabilityReferences
                  .map((reference) => reference.mention)
                  .join(","),
              }),
        };

        if (
          replyInput.currentStatus === "delivered" ||
          replyInput.currentStatus === "acknowledged"
        ) {
          await input.client.acceptDelivery(replyInput.deliveryId, {
            schema_version: "1.0",
            actor_endpoint_id: replyInput.actorEndpointId,
            reason: "人工接手并准备回传结果",
            metadata,
          });
        }

        if (
          replyInput.currentStatus !== "report_ready" &&
          replyInput.currentStatus !== "closed"
        ) {
          await input.client.markDeliveryReportReady(replyInput.deliveryId, {
            schema_version: "1.0",
            actor_endpoint_id: replyInput.actorEndpointId,
            reason: replyInput.content || "人工回传结果",
            artifact_ids: artifactIds,
            metadata,
          });
        }

        if (
          replyInput.currentStatus === "report_ready" &&
          !replyInput.closeTask
        ) {
          await input.client.sendDeliveryResult(replyInput.deliveryId, {
            schema_version: "1.0",
            actor_endpoint_id: replyInput.actorEndpointId,
            reason: replyInput.content || "人工发送结果",
            artifact_ids: artifactIds,
            metadata,
          });
        }

        if (replyInput.closeTask && replyInput.currentStatus !== "closed") {
          await input.client.closeDelivery(replyInput.deliveryId, {
            schema_version: "1.0",
            actor_endpoint_id: replyInput.actorEndpointId,
            reason: replyInput.content || "人工结束任务",
            metadata,
          });
        }

        await appendReplyToTaskConversation({
          client: input.client,
          replyInput,
        });
        await refreshAfterCommand();
        return replyInput.closeTask
          ? `已发送并结束 ${replyInput.deliveryId}`
          : `已发送结果 ${replyInput.deliveryId}`;
      });
    },
  };
}

async function mirrorCreatedTaskIntoConversation(input: {
  client: WebConsoleOperationClient;
  request: CreateHandoffRequest;
  response: CreateHandoffResponse;
  taskInput: CreateTaskHandoffInput;
}) {
  const from = localDemoProfiles[input.taskInput.actor];
  const conversation = await input.client.createConversation({
    schema_version: "1.0",
    tenant_id: input.request.tenant_id,
    title: input.request.title,
    owner_endpoint_id: from.agent_endpoint_id,
    participant_endpoint_ids: [
      from.agent_endpoint_id,
      input.taskInput.targetAgentEndpointId,
    ],
    metadata: {
      source: "web-console",
      handoff_id: input.response.handoff.id,
      delivery_id: input.response.delivery.id,
    },
  });

  const references = buildTaskConversationReferences({
    handoffId: input.response.handoff.id,
    deliveryId: input.response.delivery.id,
    attachments: input.taskInput.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      kind: attachment.kind,
    })),
    capabilityReferences: input.taskInput.capabilityReferences,
  });
  const message = await input.client.appendConversationMessage(
    conversation.id,
    {
      schema_version: "1.0",
      tenant_id: input.request.tenant_id,
      conversation_id: conversation.id,
      author_endpoint_id: from.agent_endpoint_id,
      role: "user",
      content: input.taskInput.description,
      references,
      metadata: {
        source: "web-console",
        handoff_id: input.response.handoff.id,
        delivery_id: input.response.delivery.id,
      },
    },
  );

  await input.client.createContextProjection(conversation.id, {
    schema_version: "1.0",
    tenant_id: input.request.tenant_id,
    conversation_id: conversation.id,
    provider: "sartre",
    model: "role-capability-context",
    source_message_ids: [message.id],
    summary_checkpoint_ids: [],
    reference_ids: collectReferenceIds(references),
    token_budget: 16000,
    rendered_context: renderCapabilityContextBlock({
      title: input.taskInput.title,
      content: input.taskInput.description,
      authorEndpointId: from.agent_endpoint_id,
      targetEndpointId: input.taskInput.targetAgentEndpointId,
      references,
    }),
    metadata: {
      source: "web-console",
      projection_mode: "capability_reference_context",
      handoff_id: input.response.handoff.id,
      delivery_id: input.response.delivery.id,
    },
  });
}

async function appendReplyToTaskConversation(input: {
  client: WebConsoleOperationClient;
  replyInput: SendTaskReplyInput;
}) {
  const tenantId = localDemoProfileFacts.dev.tenant_id;
  const conversation =
    (await findTaskConversation({
      client: input.client,
      tenantId,
      endpointId: input.replyInput.actorEndpointId,
      deliveryId: input.replyInput.deliveryId,
    })) ??
    (await input.client.createConversation({
      schema_version: "1.0",
      tenant_id: tenantId,
      title: `任务回传 ${input.replyInput.deliveryId}`,
      owner_endpoint_id: input.replyInput.actorEndpointId,
      participant_endpoint_ids: [
        input.replyInput.actorEndpointId,
        input.replyInput.targetAgentEndpointId,
      ],
      metadata: {
        source: "web-console",
        delivery_id: input.replyInput.deliveryId,
      },
    }));

  const handoffId = conversation.metadata?.handoff_id;
  const references = buildTaskConversationReferences({
    handoffId,
    deliveryId: input.replyInput.deliveryId,
    attachments: input.replyInput.attachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      kind: attachment.kind,
    })),
    capabilityReferences: input.replyInput.capabilityReferences,
  });
  const message = await input.client.appendConversationMessage(
    conversation.id,
    {
      schema_version: "1.0",
      tenant_id: conversation.tenant_id,
      conversation_id: conversation.id,
      author_endpoint_id: input.replyInput.actorEndpointId,
      role: "user",
      content: input.replyInput.content,
      references,
      metadata: {
        source: "web-console",
        delivery_id: input.replyInput.deliveryId,
        target_agent_endpoint_id: input.replyInput.targetAgentEndpointId,
        ...(handoffId ? { handoff_id: handoffId } : {}),
      },
    },
  );

  await input.client.createContextProjection(conversation.id, {
    schema_version: "1.0",
    tenant_id: conversation.tenant_id,
    conversation_id: conversation.id,
    provider: "sartre",
    model: "role-capability-context",
    source_message_ids: [message.id],
    summary_checkpoint_ids: [],
    reference_ids: collectReferenceIds(references),
    token_budget: 16000,
    rendered_context: renderCapabilityContextBlock({
      title: conversation.title,
      content: input.replyInput.content,
      authorEndpointId: input.replyInput.actorEndpointId,
      targetEndpointId: input.replyInput.targetAgentEndpointId,
      references,
    }),
    metadata: {
      source: "web-console",
      projection_mode: "capability_reference_context",
      delivery_id: input.replyInput.deliveryId,
      ...(handoffId ? { handoff_id: handoffId } : {}),
    },
  });
}

async function findTaskConversation(input: {
  client: WebConsoleOperationClient;
  tenantId: string;
  endpointId: string;
  deliveryId: string;
}): Promise<ConversationLedger | null> {
  const list = await input.client.getConversations({
    tenantId: input.tenantId,
    endpointId: input.endpointId,
  });
  for (const conversation of list.conversations) {
    if (conversation.metadata?.delivery_id === input.deliveryId) {
      return conversation;
    }
  }

  for (const conversation of list.conversations) {
    const detail: ConversationDetailResponse =
      await input.client.getConversationDetail(conversation.id, input.tenantId);
    if (
      detail.conversation.metadata?.delivery_id === input.deliveryId ||
      detail.messages.some((message) =>
        message.references.some(
          (reference) =>
            reference.type === "delivery" &&
            reference.target_id === input.deliveryId,
        ),
      )
    ) {
      return detail.conversation;
    }
  }

  return null;
}

function endpointIdForActorOrEndpoint(value: LocalActor | string) {
  return value === "dev" || value === "qa"
    ? localDemoProfiles[value].agent_endpoint_id
    : value;
}

function countEvents(response: unknown): number {
  if (!isRecord(response) || !Array.isArray(response.events)) {
    return 0;
  }
  return response.events.length;
}

function extractNextCursor(response: unknown, fallback: number): number {
  if (!isRecord(response)) {
    return fallback;
  }

  const eventCursors = Array.isArray(response.events)
    ? response.events
        .map((event) => (isRecord(event) ? event.cursor : undefined))
        .filter((cursor): cursor is number => typeof cursor === "number")
    : [];
  const deliveryCursor =
    isRecord(response.delivery) && typeof response.delivery.cursor === "number"
      ? response.delivery.cursor
      : undefined;

  return Math.max(fallback, deliveryCursor ?? fallback, ...eventCursors);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createDemoHandoffRequest(): CreateHandoffRequest {
  return {
    schema_version: "1.0",
    tenant_id: "local-demo",
    from: {
      user_id: localDemoProfiles.dev.user_id,
      role: localDemoProfiles.dev.role,
      agent_endpoint_id: localDemoProfiles.dev.agent_endpoint_id,
    },
    to: {
      user_id: localDemoProfiles.qa.user_id,
      role: localDemoProfiles.qa.role,
      agent_endpoint_id: localDemoProfiles.qa.agent_endpoint_id,
    },
    title: "web-console-demo-handoff",
    summary: "执行本地质量冒烟测试，并返回简明报告。",
    pack: {
      entry: "handoff.md",
      artifacts: [
        {
          id: "artifact_web_console_demo_entry",
          name: "handoff.md",
          kind: "agent_readable_instruction",
          storage_url: "file://web-console-demo/handoff.md",
          checksum: "sha256-web-console-demo-entry",
        },
      ],
    },
  };
}

function createTaskHandoffRequest(
  input: CreateTaskHandoffInput,
): CreateHandoffRequest {
  const from = localDemoProfiles[input.actor];
  const target = localDemoProfiles[input.targetActor];
  const capabilityReferences = input.capabilityReferences ?? [];
  const entryArtifact = {
    id: `task_entry_${toStableToken(input.title)}`,
    name: "task.md",
    kind: "agent_readable_instruction",
    storage_url: `inline://sartre/tasks/${toStableToken(input.title)}/task.md`,
    checksum: `sha256-task-${input.title.length}-${input.description.length}`,
  };

  return {
    schema_version: "1.0",
    tenant_id: from.tenant_id,
    from: {
      user_id: from.user_id,
      role: from.role,
      agent_endpoint_id: from.agent_endpoint_id,
    },
    to: {
      user_id: target.user_id,
      role: target.role,
      agent_endpoint_id: input.targetAgentEndpointId,
    },
    title: input.title,
    summary: input.description,
    pack: {
      entry: "task.md",
      artifacts: [
        entryArtifact,
        ...capabilityReferences.map(toCapabilityReferenceArtifact),
        ...input.attachments.map((attachment) => ({
          id: attachment.id,
          name: attachment.name,
          kind: attachment.kind,
          storage_url: attachment.storageUrl,
          checksum: attachment.checksum,
        })),
      ],
    },
  };
}

function toCapabilityReferenceArtifact(reference: RoleCapabilityMention) {
  const stableId = toStableToken(`${reference.packId}-${reference.targetId}`);
  return {
    id: `capability_reference_${stableId}`,
    name: reference.mention,
    kind: `capability_reference_${reference.kind}`,
    storage_url: `sartre://capability/${encodeURIComponent(
      reference.packId,
    )}/${encodeURIComponent(reference.targetId)}`,
    checksum: `sha256-capability-${stableId}`,
  };
}

function toStableToken(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "task"
  );
}

async function asOperationResult(
  run: () => Promise<string | { detail: string; nextCursor?: number }>,
): Promise<OperationResult> {
  try {
    const result = await run();
    if (typeof result === "string") {
      return { status: "succeeded", detail: result };
    }
    return {
      status: "succeeded",
      detail: result.detail,
      ...(result.nextCursor === undefined
        ? {}
        : { nextCursor: result.nextCursor }),
    };
  } catch (error) {
    return {
      status: "failed",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}
