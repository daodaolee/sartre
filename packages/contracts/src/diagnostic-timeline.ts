import { z } from "zod";

import { DiagnosticContextSchema, type DiagnosticContext } from "./diagnostics.js";

export const DIAGNOSTIC_STAGES = [
  "request_received",
  "context_validated",
  "dependency_check",
  "probe_completed",
] as const;

export const DIAGNOSTIC_RECOVERY_ACTIONS = ["none", "restore_dependency_and_retry"] as const;

export const DiagnosticStageSchema = z.enum(DIAGNOSTIC_STAGES);
export const DiagnosticRecoveryActionSchema = z.enum(DIAGNOSTIC_RECOVERY_ACTIONS);
export const DiagnosticCurrentStateSchema = z.enum(["completed", "failed"]);
export const DiagnosticDependencyOutcomeSchema = z.enum(["healthy", "unavailable"]);

const DIAGNOSTIC_CHAIN_IDENTITY_FIELDS = [
  "requestId",
  "correlationId",
  "causationId",
  "workspaceId",
  "userId",
  "initiatedByUserId",
  "actorType",
  "actorId",
  "component",
  "operation",
  "resourceType",
  "resourceId",
  "requirementId",
  "sessionId",
  "executionId",
  "leaseId",
  "endpointId",
] as const satisfies readonly (keyof DiagnosticContext)[];

export const DiagnosticProbeContextSchema = DiagnosticContextSchema.extend({
  workspaceId: z.null(),
  userId: z.uuid(),
  initiatedByUserId: z.uuid(),
  actorType: z.literal("system"),
  actorId: z.literal("ms0-diagnostic-self-test"),
  component: z.literal("hub-api"),
  operation: z.literal("diagnostics.probe"),
  stage: z.literal("request_received"),
  status: z.literal("started"),
  resourceType: z.null(),
  resourceId: z.null(),
  requirementId: z.null(),
  sessionId: z.null(),
  executionId: z.null(),
  leaseId: z.null(),
  endpointId: z.null(),
  errorCode: z.null(),
  retryable: z.literal(false),
}).superRefine((context, issue) => {
  if (context.userId !== context.initiatedByUserId) {
    issue.addIssue({
      code: "custom",
      message: "diagnostic_initiator_mismatch",
      path: ["initiatedByUserId"],
    });
  }
});

export const DiagnosticProbeRequestSchema = z
  .object({
    context: DiagnosticProbeContextSchema,
    dependencyOutcome: DiagnosticDependencyOutcomeSchema,
  })
  .strict();

export const DiagnosticStageRecordSchema = z
  .object({
    recordId: z.uuid(),
    sequence: z.number().int().positive().max(DIAGNOSTIC_STAGES.length),
    context: DiagnosticContextSchema.extend({
      stage: DiagnosticStageSchema,
      status: z.enum(["succeeded", "failed"]),
    }),
    recordedAt: z.iso.datetime({ offset: true }),
    retentionExpiresAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .superRefine((record, issue) => {
    if (Date.parse(record.retentionExpiresAt) <= Date.parse(record.recordedAt)) {
      issue.addIssue({
        code: "custom",
        message: "diagnostic_retention_invalid",
        path: ["retentionExpiresAt"],
      });
    }
  });

const EvidenceRefSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

export const DiagnosticTimelineSchema = z
  .object({
    correlationId: z.uuid(),
    timelineItems: z.array(DiagnosticStageRecordSchema).min(1).max(DIAGNOSTIC_STAGES.length),
    lastSuccessfulStage: DiagnosticStageSchema.nullable(),
    firstFailedStage: DiagnosticStageSchema.nullable(),
    currentState: DiagnosticCurrentStateSchema,
    suggestedRecoveryAction: DiagnosticRecoveryActionSchema,
    evidenceRefs: z.array(EvidenceRefSchema).max(20),
    correlationIds: z.array(z.uuid()).length(1),
  })
  .strict()
  .superRefine((timeline, issue) => {
    const firstItem = timeline.timelineItems[0];
    for (const [index, item] of timeline.timelineItems.entries()) {
      if (item.sequence !== index + 1 || item.context.stage !== DIAGNOSTIC_STAGES[index]) {
        issue.addIssue({
          code: "custom",
          message: "diagnostic_timeline_order_invalid",
          path: ["timelineItems", index],
        });
      }
      for (const field of DIAGNOSTIC_CHAIN_IDENTITY_FIELDS) {
        if (firstItem && item.context[field] !== firstItem.context[field]) {
          issue.addIssue({
            code: "custom",
            message: "diagnostic_timeline_chain_invalid",
            path: ["timelineItems", index, "context", field],
          });
        }
      }
      const occurredAt = Date.parse(item.context.occurredAt);
      const recordedAt = Date.parse(item.recordedAt);
      const previousItem = timeline.timelineItems[index - 1];
      if (
        recordedAt < occurredAt ||
        (previousItem !== undefined &&
          (occurredAt <= Date.parse(previousItem.context.occurredAt) ||
            recordedAt < Date.parse(previousItem.recordedAt)))
      ) {
        issue.addIssue({
          code: "custom",
          message: "diagnostic_timeline_time_invalid",
          path: ["timelineItems", index],
        });
      }
      if (
        (item.context.status === "succeeded" &&
          (item.context.errorCode !== null || item.context.retryable)) ||
        (item.context.status === "failed" &&
          (item.context.errorCode === null || !item.context.retryable))
      ) {
        issue.addIssue({
          code: "custom",
          message: "diagnostic_timeline_record_status_invalid",
          path: ["timelineItems", index, "context"],
        });
      }
    }

    if (
      timeline.correlationIds[0] !== timeline.correlationId ||
      firstItem?.context.correlationId !== timeline.correlationId ||
      timeline.timelineItems.some((item) => item.context.userId !== item.context.initiatedByUserId)
    ) {
      issue.addIssue({ code: "custom", message: "diagnostic_timeline_scope_invalid" });
    }

    const successful = timeline.timelineItems.filter((item) => item.context.status === "succeeded");
    const failedItems = timeline.timelineItems.filter((item) => item.context.status === "failed");
    const failed = failedItems[0];
    const exactCompleted =
      timeline.timelineItems.length === DIAGNOSTIC_STAGES.length && failedItems.length === 0;
    const exactFailed =
      failedItems.length === 1 &&
      timeline.timelineItems.at(-1) === failed &&
      timeline.timelineItems.slice(0, -1).every((item) => item.context.status === "succeeded");
    if (!exactCompleted && !exactFailed) {
      issue.addIssue({
        code: "custom",
        message: "diagnostic_timeline_incomplete_or_corrupt",
        path: ["timelineItems"],
      });
    }
    const expectedLastSuccessful = successful.at(-1)?.context.stage ?? null;
    const expectedFirstFailed = failed?.context.stage ?? null;
    const expectedState = failed ? "failed" : "completed";
    const expectedAction = failed ? "restore_dependency_and_retry" : "none";
    if (
      timeline.lastSuccessfulStage !== expectedLastSuccessful ||
      timeline.firstFailedStage !== expectedFirstFailed ||
      timeline.currentState !== expectedState ||
      timeline.suggestedRecoveryAction !== expectedAction
    ) {
      issue.addIssue({ code: "custom", message: "diagnostic_timeline_summary_invalid" });
    }
  });

export type DiagnosticStage = z.infer<typeof DiagnosticStageSchema>;
export type DiagnosticRecoveryAction = z.infer<typeof DiagnosticRecoveryActionSchema>;
export type DiagnosticDependencyOutcome = z.infer<typeof DiagnosticDependencyOutcomeSchema>;
export type DiagnosticProbeRequest = z.infer<typeof DiagnosticProbeRequestSchema>;
export type DiagnosticStageRecord = z.infer<typeof DiagnosticStageRecordSchema>;
export type DiagnosticTimeline = z.infer<typeof DiagnosticTimelineSchema>;
