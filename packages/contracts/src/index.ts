import { z } from "zod";

const secretLikePattern =
  /(token|password|secret|private[-_]?key|api[-_]?key|PRIVATE-TOKEN)/i;

export const handoffPartySchema = z.object({
  user_id: z.string().min(1),
  role: z.string().min(1),
  agent_endpoint_id: z.string().min(1),
});

export const handoffArtifactSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().min(1),
  storage_url: z.string().min(1),
  checksum: z.string().min(1),
});

export const handoffPackSchema = z.object({
  entry: z.string().min(1),
  artifacts: z.array(handoffArtifactSchema),
});

export const createHandoffRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  from: handoffPartySchema,
  to: handoffPartySchema,
  title: z.string().min(1),
  summary: z.string(),
  pack: handoffPackSchema,
});

export const handoffStatusSchema = z.enum([
  "draft",
  "created",
  "stored",
  "pending_delivery",
  "delivered",
  "acknowledged",
  "accepted",
  "running",
  "report_ready",
  "closed",
  "failed",
  "expired",
]);

export const handoffEnvelopeSchema = createHandoffRequestSchema.extend({
  id: z.string().min(1),
  status: handoffStatusSchema,
  created_at: z.string().datetime(),
});

export const capabilitySourceTypeSchema = z.enum([
  "skill",
  "hook",
  "plugin",
  "mcp",
  "command",
  "manual_prompt",
  "local_resource",
]);

export const approvalModeSchema = z.enum([
  "manual_confirm",
  "prompt_only",
  "auto_read_only",
  "auto_execute_low_risk",
  "mock",
]);

const safeStringMetadataSchema = z
  .record(z.string(), z.string())
  .superRefine((metadata, context) => {
    for (const [key, value] of Object.entries(metadata)) {
      if (secretLikePattern.test(key) || secretLikePattern.test(value)) {
        context.addIssue({
          code: "custom",
          message: "Metadata must not contain secrets",
          path: [key],
        });
      }
    }
  });

export const agentCapabilitySourceSchema = z.object({
  id: z.string().min(1),
  type: capabilitySourceTypeSchema,
  name: z.string().min(1),
  summary: z.string().min(1),
  capabilities: z.array(z.string().min(1)).default([]),
  approval_mode: approvalModeSchema.default("manual_confirm"),
  enabled: z.boolean().default(true),
  metadata: safeStringMetadataSchema.optional(),
});

export const executorKindSchema = z.enum([
  "codex_cli",
  "claude_code",
  "command",
  "mcp",
  "plugin",
  "manual_prompt",
  "mock",
]);

export const executorBindingSchema = z.object({
  kind: executorKindSchema.default("manual_prompt"),
  label: z.string().min(1).default("Manual prompt"),
  command: z.string().min(1).optional(),
  metadata: safeStringMetadataSchema.optional(),
});

export const approvalPolicySchema = z.object({
  mode: approvalModeSchema.default("manual_confirm"),
  require_human_for: z.array(z.string().min(1)).default([]),
  allow_auto_for: z.array(z.string().min(1)).default([]),
  metadata: safeStringMetadataSchema.optional(),
});

export const roleCapabilityPackRoleSchema = z.enum([
  "product",
  "developer",
  "qa",
  "designer",
  "ops",
  "security",
]);

export const roleCapabilityPackSourceProjectKindSchema = z.enum([
  "qa_automation",
  "frontend_app",
  "bff_service",
  "admin_console",
  "documentation",
  "generic_repo",
]);

export const roleCapabilityPackCommandRiskSchema = z.enum([
  "read_only",
  "local_build",
  "local_test",
  "qa_mutation",
  "prod_mutation",
  "destructive",
]);

export const roleCapabilityPackConstraintSeveritySchema = z.enum([
  "info",
  "warning",
  "blocking",
]);

export const roleCapabilityPackSourceProjectSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: roleCapabilityPackSourceProjectKindSchema,
  local_path: z.string().min(1),
  entry_documents: z.array(z.string().min(1)).default([]),
  metadata: safeStringMetadataSchema.optional(),
});

export const roleCapabilityPackAgentEndpointSchema = z.object({
  tenant_id: z.string().min(1),
  user_id: z.string().min(1),
  role: roleCapabilityPackRoleSchema,
  agent_endpoint_id: z.string().min(1),
  execution_mode: approvalModeSchema.default("manual_confirm"),
  executor: executorBindingSchema,
  approval_policy: approvalPolicySchema,
  metadata: safeStringMetadataSchema.optional(),
});

export const roleCapabilityPackCommandSchema = z
  .object({
    id: z.string().min(1),
    slug: z.string().min(1),
    label: z.string().min(1),
    summary: z.string().min(1),
    command: z.string().min(1),
    cwd: z.string().min(1).optional(),
    capabilities: z.array(z.string().min(1)).default([]),
    risk: roleCapabilityPackCommandRiskSchema,
    approval_mode: approvalModeSchema.default("manual_confirm"),
    enabled: z.boolean().default(true),
    metadata: safeStringMetadataSchema.optional(),
  })
  .superRefine((command, context) => {
    if (
      ["qa_mutation", "prod_mutation", "destructive"].includes(command.risk) &&
      command.approval_mode !== "manual_confirm"
    ) {
      context.addIssue({
        code: "custom",
        message: "High-risk commands must require manual confirmation",
        path: ["approval_mode"],
      });
    }
  });

export const roleCapabilityPackHookSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  label: z.string().min(1),
  summary: z.string().min(1),
  trigger: z.string().min(1),
  capabilities: z.array(z.string().min(1)).default([]),
  approval_mode: approvalModeSchema.default("manual_confirm"),
  enabled: z.boolean().default(true),
  metadata: safeStringMetadataSchema.optional(),
});

export const roleCapabilityPackConstraintSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  label: z.string().min(1),
  summary: z.string().min(1),
  severity: roleCapabilityPackConstraintSeveritySchema.default("warning"),
  source: z.string().min(1).optional(),
  metadata: safeStringMetadataSchema.optional(),
});

export const roleCapabilityPackSchema = z
  .object({
    schema_version: z.literal("1.0"),
    id: z.string().min(1),
    role: roleCapabilityPackRoleSchema,
    label: z.string().min(1),
    summary: z.string().min(1),
    source_project: roleCapabilityPackSourceProjectSchema,
    agent_endpoint: roleCapabilityPackAgentEndpointSchema,
    capability_sources: z.array(agentCapabilitySourceSchema).default([]),
    commands: z.array(roleCapabilityPackCommandSchema).default([]),
    hooks: z.array(roleCapabilityPackHookSchema).default([]),
    constraints: z.array(roleCapabilityPackConstraintSchema).default([]),
    metadata: safeStringMetadataSchema.optional(),
  })
  .superRefine((pack, context) => {
    if (pack.agent_endpoint.role !== pack.role) {
      context.addIssue({
        code: "custom",
        message: "Agent endpoint role must match capability pack role",
        path: ["agent_endpoint", "role"],
      });
    }
  });

export const roleCapabilityMentionKindSchema = z.enum([
  "repo",
  "skill",
  "command",
  "hook",
  "constraint",
]);

export const roleCapabilityMentionSchema = z.object({
  mention: z.string().min(1),
  kind: roleCapabilityMentionKindSchema,
  label: z.string().min(1),
  summary: z.string().min(1),
  role: roleCapabilityPackRoleSchema,
  packId: z.string().min(1),
  sourceProjectId: z.string().min(1),
  targetId: z.string().min(1),
});

export const roleCapabilityCatalogResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  generated_at: z.string().datetime(),
  packs: z.array(roleCapabilityPackSchema),
  mentions: z.array(roleCapabilityMentionSchema),
});

export const registerAgentEndpointRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  user_id: z.string().min(1),
  role: z.string().min(1),
  agent_endpoint_id: z.string().min(1),
  online: z.boolean(),
  capabilities: z.array(z.string().min(1)),
  execution_mode: z.string().min(1),
  capability_sources: z.array(agentCapabilitySourceSchema).default([]),
  executor: executorBindingSchema.default({
    kind: "manual_prompt",
    label: "Manual prompt",
  }),
  approval_policy: approvalPolicySchema.default({
    mode: "manual_confirm",
    require_human_for: [],
    allow_auto_for: [],
  }),
});

export const connectAgentEndpointRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  last_seen_cursor: z.number().int().nonnegative(),
});

export const localDemoProfileFacts = {
  dev: {
    tenant_id: "local-demo",
    user_id: "dev_user",
    role: "developer",
    agent_endpoint_id: "dev_codex_local",
    execution_mode: "manual_confirm",
  },
  qa: {
    tenant_id: "local-demo",
    user_id: "qa_user",
    role: "qa",
    agent_endpoint_id: "qa_codex_local",
    execution_mode: "manual_confirm",
  },
} as const;

export const deliveryStatusSchema = z.enum([
  "pending_delivery",
  "delivered",
  "acknowledged",
  "accepted",
  "running",
  "report_ready",
  "closed",
  "failed",
  "expired",
]);

export const deliveryTerminalCommandRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  reason: z.string().min(1).optional(),
});

export const deliveryLifecycleCommandRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  actor_endpoint_id: z.string().min(1),
  reason: z.string().min(1).optional(),
  artifact_ids: z.array(z.string().min(1)).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const endpointHealthStatusSchema = z.enum([
  "passed",
  "warning",
  "blocked",
]);

export const endpointHealthCheckSchema = z
  .object({
    key: z.string().min(1),
    label: z.string().min(1),
    status: endpointHealthStatusSchema,
    detail: z.string().min(1),
    observed_at: z.string().datetime(),
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((check, context) => {
    for (const [key, value] of Object.entries(check.metadata ?? {})) {
      if (secretLikePattern.test(key) || secretLikePattern.test(value)) {
        context.addIssue({
          code: "custom",
          message: "Health report metadata must not contain secrets",
          path: ["metadata", key],
        });
      }
    }
  });

export const endpointHealthReportRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  checks: z.array(endpointHealthCheckSchema).min(1),
});

export const endpointHealthReportResponseSchema =
  endpointHealthReportRequestSchema.extend({
    endpoint_id: z.string().min(1),
    reported_at: z.string().datetime(),
  });

export const providerModelCapabilitySchema = z.enum([
  "chat",
  "streaming",
  "tool_use",
  "vision",
  "embedding",
  "repo_context",
  "local_command",
  "mcp_tool_use",
]);

export const providerModelProfileStatusSchema = z.enum([
  "available",
  "degraded",
  "blocked",
  "disabled",
]);

export const providerModelHealthReportSchema = z.object({
  id: z.string().min(1),
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  profile_id: z.string().min(1),
  status: endpointHealthStatusSchema,
  checks: z.array(endpointHealthCheckSchema).min(1),
  reported_at: z.string().datetime(),
  metadata: safeStringMetadataSchema.optional(),
});

export const providerModelProfileSchema = z.object({
  id: z.string().min(1),
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  agent_endpoint_id: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  label: z.string().min(1),
  executor: executorBindingSchema,
  capabilities: z.array(providerModelCapabilitySchema).default([]),
  context_window: z.number().int().positive().optional(),
  max_output_tokens: z.number().int().positive().optional(),
  default_for_endpoint: z.boolean().default(false),
  status: providerModelProfileStatusSchema.default("available"),
  latest_health: providerModelHealthReportSchema.nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: safeStringMetadataSchema.optional(),
});

export const registerProviderModelProfileRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  agent_endpoint_id: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  label: z.string().min(1),
  executor: executorBindingSchema,
  capabilities: z.array(providerModelCapabilitySchema).default([]),
  context_window: z.number().int().positive().optional(),
  max_output_tokens: z.number().int().positive().optional(),
  default_for_endpoint: z.boolean().default(false),
  status: providerModelProfileStatusSchema.default("available"),
  metadata: safeStringMetadataSchema.optional(),
});

export const providerModelHealthReportRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  profile_id: z.string().min(1),
  status: endpointHealthStatusSchema,
  checks: z.array(endpointHealthCheckSchema).min(1),
  metadata: safeStringMetadataSchema.optional(),
});

export const providerModelRegistryListResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  endpoint_id: z.string().min(1),
  default_profile_id: z.string().min(1).nullable(),
  profiles: z.array(providerModelProfileSchema),
});

export const resolveProviderModelSelectionRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  endpoint_id: z.string().min(1),
  preferred_provider: z.string().min(1).optional(),
  preferred_model: z.string().min(1).optional(),
  required_capabilities: z.array(providerModelCapabilitySchema).default([]),
  min_context_window: z.number().int().positive().optional(),
});

export const providerModelSelectionResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  endpoint_id: z.string().min(1),
  selected_profile_id: z.string().min(1),
  selected_profile: providerModelProfileSchema,
  required_capabilities: z.array(providerModelCapabilitySchema).default([]),
  selection_reason: z.string().min(1),
});

export const handoffErrorCategorySchema = z.enum([
  "Timeout",
  "Unavailable",
  "RateLimited",
  "InvalidInput",
  "Unsupported",
  "Internal",
  "NeedUserAction",
]);

export const conversationStatusSchema = z.enum(["active", "archived"]);

export const conversationMessageRoleSchema = z.enum([
  "system",
  "user",
  "assistant",
  "tool",
]);

export const conversationReferenceTypeSchema = z.enum([
  "handoff",
  "delivery",
  "task",
  "artifact",
  "capability",
  "conversation",
  "external",
]);

export const toolInvocationStatusSchema = z.enum([
  "pending",
  "running",
  "succeeded",
  "failed",
  "skipped",
]);

export const modelRunStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
  "cancelled",
]);

export const conversationReferenceSchema = z.object({
  id: z.string().min(1),
  type: conversationReferenceTypeSchema,
  target_id: z.string().min(1),
  label: z.string().min(1).optional(),
  metadata: safeStringMetadataSchema.optional(),
});

export const conversationLedgerSchema = z.object({
  id: z.string().min(1),
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  title: z.string().min(1),
  owner_endpoint_id: z.string().min(1),
  participant_endpoint_ids: z.array(z.string().min(1)).min(1),
  status: conversationStatusSchema.default("active"),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: safeStringMetadataSchema.optional(),
});

export const conversationMessageSchema = z.object({
  id: z.string().min(1),
  conversation_id: z.string().min(1),
  seq: z.number().int().positive(),
  author_endpoint_id: z.string().min(1),
  role: conversationMessageRoleSchema,
  content: z.string().min(1),
  references: z.array(conversationReferenceSchema).default([]),
  created_at: z.string().datetime(),
  metadata: safeStringMetadataSchema.optional(),
});

export const toolInvocationRecordSchema = z.object({
  id: z.string().min(1),
  conversation_id: z.string().min(1),
  source_message_id: z.string().min(1).nullable().optional(),
  tool_name: z.string().min(1),
  status: toolInvocationStatusSchema,
  input_summary: z.string().min(1),
  output_summary: z.string().min(1).nullable().optional(),
  error: z
    .object({
      category: handoffErrorCategorySchema,
      message: z.string().min(1),
    })
    .optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: safeStringMetadataSchema.optional(),
});

export const summaryCheckpointSchema = z.object({
  id: z.string().min(1),
  conversation_id: z.string().min(1),
  author_endpoint_id: z.string().min(1),
  covered_message_start_seq: z.number().int().positive(),
  covered_message_end_seq: z.number().int().positive(),
  summary: z.string().min(1),
  created_at: z.string().datetime(),
  metadata: safeStringMetadataSchema.optional(),
});

export const contextProjectionSchema = z.object({
  id: z.string().min(1),
  conversation_id: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  source_message_ids: z.array(z.string().min(1)).default([]),
  summary_checkpoint_ids: z.array(z.string().min(1)).default([]),
  reference_ids: z.array(z.string().min(1)).default([]),
  token_budget: z.number().int().positive(),
  rendered_context: z.string().min(1),
  created_at: z.string().datetime(),
  metadata: safeStringMetadataSchema.optional(),
});

export const modelRunSchema = z.object({
  id: z.string().min(1),
  conversation_id: z.string().min(1),
  context_projection_id: z.string().min(1),
  executor_endpoint_id: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  status: modelRunStatusSchema,
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  error: z
    .object({
      category: handoffErrorCategorySchema,
      message: z.string().min(1),
    })
    .optional(),
  metadata: safeStringMetadataSchema.optional(),
});

export const createConversationRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  title: z.string().min(1),
  owner_endpoint_id: z.string().min(1),
  participant_endpoint_ids: z.array(z.string().min(1)).min(1),
  metadata: safeStringMetadataSchema.optional(),
});

export const appendConversationMessageRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  conversation_id: z.string().min(1),
  author_endpoint_id: z.string().min(1),
  role: conversationMessageRoleSchema,
  content: z.string().min(1),
  references: z.array(conversationReferenceSchema).default([]),
  metadata: safeStringMetadataSchema.optional(),
});

export const recordToolInvocationRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  conversation_id: z.string().min(1),
  source_message_id: z.string().min(1).nullable().optional(),
  tool_name: z.string().min(1),
  status: toolInvocationStatusSchema,
  input_summary: z.string().min(1),
  output_summary: z.string().min(1).nullable().optional(),
  error: z
    .object({
      category: handoffErrorCategorySchema,
      message: z.string().min(1),
    })
    .optional(),
  metadata: safeStringMetadataSchema.optional(),
});

export const createSummaryCheckpointRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  conversation_id: z.string().min(1),
  author_endpoint_id: z.string().min(1),
  covered_message_start_seq: z.number().int().positive(),
  covered_message_end_seq: z.number().int().positive(),
  summary: z.string().min(1),
  metadata: safeStringMetadataSchema.optional(),
});

export const createContextProjectionRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  conversation_id: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  source_message_ids: z.array(z.string().min(1)).default([]),
  summary_checkpoint_ids: z.array(z.string().min(1)).default([]),
  reference_ids: z.array(z.string().min(1)).default([]),
  token_budget: z.number().int().positive(),
  rendered_context: z.string().min(1),
  metadata: safeStringMetadataSchema.optional(),
});

export const recordModelRunRequestSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  conversation_id: z.string().min(1),
  context_projection_id: z.string().min(1),
  executor_endpoint_id: z.string().min(1),
  provider: z.string().min(1),
  model: z.string().min(1),
  status: modelRunStatusSchema,
  started_at: z.string().datetime().nullable().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  error: z
    .object({
      category: handoffErrorCategorySchema,
      message: z.string().min(1),
    })
    .optional(),
  metadata: safeStringMetadataSchema.optional(),
});

export const conversationListItemSchema = conversationLedgerSchema.extend({
  latest_message: conversationMessageSchema.nullable(),
  message_count: z.number().int().nonnegative(),
  latest_projection: contextProjectionSchema.nullable(),
});

export const conversationListResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  endpoint_id: z.string().min(1),
  conversations: z.array(conversationListItemSchema),
});

export const conversationDetailResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  conversation: conversationLedgerSchema,
  messages: z.array(conversationMessageSchema),
  tool_invocations: z.array(toolInvocationRecordSchema),
  summary_checkpoints: z.array(summaryCheckpointSchema),
  model_runs: z.array(modelRunSchema),
  context_projections: z.array(contextProjectionSchema),
});

export const handoffErrorResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  error: z.object({
    category: handoffErrorCategorySchema,
    message: z.string().min(1),
  }),
});

export const deliveryLifecycleEventTypeSchema = z.enum([
  "handoff.queued",
  "delivery.delivered",
  "delivery.redelivered",
  "delivery.acknowledged",
  "delivery.accepted",
  "delivery.running",
  "delivery.report_ready",
  "delivery.result_sent",
  "delivery.closed",
  "delivery.failed",
  "delivery.expired",
  "artifact.report_returned",
]);

export const deliveryEventSchema = z.object({
  schema_version: z.literal("1.0"),
  type: z.string().min(1),
  event_id: z.string().min(1),
  handoff_id: z.string().min(1),
  delivery_id: z.string().min(1),
  recipient_endpoint_id: z.string().min(1),
  cursor: z.number().int().nonnegative(),
});

export const handoffRecordSchema = z
  .object({
    id: z.string().min(1),
    status: handoffStatusSchema,
  })
  .passthrough();

export const deliveryRecordSchema = z.object({
  id: z.string().min(1),
  handoffId: z.string().min(1),
  recipientEndpointId: z.string().min(1),
  cursor: z.number().int().nonnegative(),
  status: deliveryStatusSchema,
  deliveredAt: z.string().datetime().nullable(),
  acknowledgedAt: z.string().datetime().nullable(),
  failedAt: z.string().datetime().nullable(),
  expiredAt: z.string().datetime().nullable(),
});

export const createHandoffResponseSchema = z.object({
  handoff: handoffRecordSchema,
  delivery: deliveryRecordSchema,
});

export const registerAgentEndpointResponseSchema = z.object({
  ok: z.literal(true),
});

export const deliveryCommandResponseSchema = z.object({
  delivery: deliveryRecordSchema,
});

export const handoffReplayEventSchema = z.object({
  id: z.string().min(1),
  type: deliveryLifecycleEventTypeSchema,
  handoff_id: z.string().min(1),
  delivery_id: z.string().min(1).nullable(),
  recipient_endpoint_id: z.string().min(1).nullable(),
  cursor: z.number().int().nonnegative().nullable(),
  occurred_at: z.string().datetime(),
  payload: z.record(z.string(), z.unknown()),
});

export const handoffEventReplayResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  endpoint_id: z.string().min(1),
  after_cursor: z.number().int().nonnegative(),
  events: z.array(handoffReplayEventSchema),
});

export const overviewAgentEndpointSchema = registerAgentEndpointRequestSchema
  .omit({ schema_version: true })
  .extend({
    updated_at: z.string().datetime(),
    health_report: endpointHealthReportResponseSchema.nullable().optional(),
  });

export const overviewHandoffSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string(),
  status: handoffStatusSchema,
  created_at: z.string().datetime(),
  from: handoffPartySchema,
  to: handoffPartySchema,
  entry_artifact_name: z.string().min(1),
  artifact_count: z.number().int().nonnegative(),
});

export const overviewDeliverySchema = z.object({
  id: z.string().min(1),
  handoff_id: z.string().min(1),
  recipient_endpoint_id: z.string().min(1),
  cursor: z.number().int().nonnegative(),
  status: deliveryStatusSchema,
  delivered_at: z.string().datetime().nullable(),
  acknowledged_at: z.string().datetime().nullable(),
  title: z.string().min(1),
  summary: z.string(),
  from: handoffPartySchema,
  to: handoffPartySchema,
  active_actor_endpoint_id: z.string().min(1).nullable().optional(),
  active_target_agent_endpoint_id: z.string().min(1).nullable().optional(),
});

export const overviewTimelineEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string().min(1),
  detail: z.string().min(1),
  time: z.string().min(1),
  tone: z.enum(["blue", "green", "yellow", "red"]),
  handoff_id: z.string().min(1),
  delivery_id: z.string().min(1).nullable(),
});

export const overviewReportSchema = z.object({
  id: z.string().min(1),
  handoff_id: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().min(1),
  storage_url: z.string().min(1),
  created_at: z.string().datetime(),
  title: z.string().min(1),
});

export const handoffOverviewResponseSchema = z.object({
  schema_version: z.literal("1.0"),
  tenant_id: z.string().min(1),
  generated_at: z.string().datetime(),
  agent_endpoints: z.array(overviewAgentEndpointSchema),
  handoffs: z.array(overviewHandoffSchema),
  deliveries: z.array(overviewDeliverySchema),
  timeline: z.array(overviewTimelineEventSchema),
  reports: z.array(overviewReportSchema),
  metrics: z.object({
    pending_handoffs: z.number().int().nonnegative(),
    failed_deliveries: z.number().int().nonnegative(),
    reports_returned: z.number().int().nonnegative(),
    endpoint_online: z.number().int().nonnegative(),
    endpoint_total: z.number().int().nonnegative(),
  }),
});

export type CreateHandoffRequest = z.infer<typeof createHandoffRequestSchema>;
export type HandoffEnvelope = z.infer<typeof handoffEnvelopeSchema>;
export type DeliveryEvent = z.infer<typeof deliveryEventSchema>;
export type CapabilitySourceType = z.infer<typeof capabilitySourceTypeSchema>;
export type ApprovalMode = z.infer<typeof approvalModeSchema>;
export type AgentCapabilitySource = z.infer<typeof agentCapabilitySourceSchema>;
export type ExecutorKind = z.infer<typeof executorKindSchema>;
export type ExecutorBinding = z.infer<typeof executorBindingSchema>;
export type ApprovalPolicy = z.infer<typeof approvalPolicySchema>;
export type RoleCapabilityPackRole = z.infer<
  typeof roleCapabilityPackRoleSchema
>;
export type RoleCapabilityPackSourceProjectKind = z.infer<
  typeof roleCapabilityPackSourceProjectKindSchema
>;
export type RoleCapabilityPackCommandRisk = z.infer<
  typeof roleCapabilityPackCommandRiskSchema
>;
export type RoleCapabilityPackSourceProject = z.infer<
  typeof roleCapabilityPackSourceProjectSchema
>;
export type RoleCapabilityPackAgentEndpoint = z.infer<
  typeof roleCapabilityPackAgentEndpointSchema
>;
export type RoleCapabilityPackCommand = z.infer<
  typeof roleCapabilityPackCommandSchema
>;
export type RoleCapabilityPackHook = z.infer<
  typeof roleCapabilityPackHookSchema
>;
export type RoleCapabilityPackConstraint = z.infer<
  typeof roleCapabilityPackConstraintSchema
>;
export type RoleCapabilityPack = z.infer<typeof roleCapabilityPackSchema>;
export type RoleCapabilityMentionKind = z.infer<
  typeof roleCapabilityMentionKindSchema
>;
export type RoleCapabilityMention = z.infer<typeof roleCapabilityMentionSchema>;
export type RoleCapabilityCatalogResponse = z.infer<
  typeof roleCapabilityCatalogResponseSchema
>;
export type DeliveryTerminalCommandRequest = z.infer<
  typeof deliveryTerminalCommandRequestSchema
>;
export type DeliveryLifecycleCommandRequest = z.infer<
  typeof deliveryLifecycleCommandRequestSchema
>;
export type EndpointHealthStatus = z.infer<typeof endpointHealthStatusSchema>;
export type EndpointHealthCheck = z.infer<typeof endpointHealthCheckSchema>;
export type EndpointHealthReportRequest = z.infer<
  typeof endpointHealthReportRequestSchema
>;
export type EndpointHealthReportResponse = z.infer<
  typeof endpointHealthReportResponseSchema
>;
export type ProviderModelCapability = z.infer<
  typeof providerModelCapabilitySchema
>;
export type ProviderModelProfileStatus = z.infer<
  typeof providerModelProfileStatusSchema
>;
export type ProviderModelHealthReport = z.infer<
  typeof providerModelHealthReportSchema
>;
export type ProviderModelProfile = z.infer<typeof providerModelProfileSchema>;
export type RegisterProviderModelProfileRequest = z.input<
  typeof registerProviderModelProfileRequestSchema
>;
export type ProviderModelHealthReportRequest = z.input<
  typeof providerModelHealthReportRequestSchema
>;
export type ProviderModelRegistryListResponse = z.infer<
  typeof providerModelRegistryListResponseSchema
>;
export type ResolveProviderModelSelectionRequest = z.input<
  typeof resolveProviderModelSelectionRequestSchema
>;
export type ProviderModelSelectionResponse = z.infer<
  typeof providerModelSelectionResponseSchema
>;
export type HandoffErrorResponse = z.infer<typeof handoffErrorResponseSchema>;
export type ConversationStatus = z.infer<typeof conversationStatusSchema>;
export type ConversationMessageRole = z.infer<
  typeof conversationMessageRoleSchema
>;
export type ConversationReferenceType = z.infer<
  typeof conversationReferenceTypeSchema
>;
export type ToolInvocationStatus = z.infer<typeof toolInvocationStatusSchema>;
export type ModelRunStatus = z.infer<typeof modelRunStatusSchema>;
export type ConversationReference = z.infer<typeof conversationReferenceSchema>;
export type ConversationLedger = z.infer<typeof conversationLedgerSchema>;
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;
export type ToolInvocationRecord = z.infer<typeof toolInvocationRecordSchema>;
export type SummaryCheckpoint = z.infer<typeof summaryCheckpointSchema>;
export type ContextProjection = z.infer<typeof contextProjectionSchema>;
export type ModelRun = z.infer<typeof modelRunSchema>;
export type CreateConversationRequest = z.input<
  typeof createConversationRequestSchema
>;
export type AppendConversationMessageRequest = z.input<
  typeof appendConversationMessageRequestSchema
>;
export type RecordToolInvocationRequest = z.input<
  typeof recordToolInvocationRequestSchema
>;
export type CreateSummaryCheckpointRequest = z.input<
  typeof createSummaryCheckpointRequestSchema
>;
export type CreateContextProjectionRequest = z.input<
  typeof createContextProjectionRequestSchema
>;
export type RecordModelRunRequest = z.input<typeof recordModelRunRequestSchema>;
export type ConversationListItem = z.infer<typeof conversationListItemSchema>;
export type ConversationListResponse = z.infer<
  typeof conversationListResponseSchema
>;
export type ConversationDetailResponse = z.infer<
  typeof conversationDetailResponseSchema
>;
export type CreateHandoffResponse = z.infer<typeof createHandoffResponseSchema>;
export type DeliveryCommandResponse = z.infer<
  typeof deliveryCommandResponseSchema
>;
export type RegisterAgentEndpointResponse = z.infer<
  typeof registerAgentEndpointResponseSchema
>;
export type HandoffReplayEvent = z.infer<typeof handoffReplayEventSchema>;
export type HandoffEventReplayResponse = z.infer<
  typeof handoffEventReplayResponseSchema
>;
export type RegisterAgentEndpointRequest = z.input<
  typeof registerAgentEndpointRequestSchema
>;
export type LocalDemoProfileName = keyof typeof localDemoProfileFacts;
export type ConnectAgentEndpointRequest = z.infer<
  typeof connectAgentEndpointRequestSchema
>;
export type HandoffOverviewResponse = z.infer<
  typeof handoffOverviewResponseSchema
>;
