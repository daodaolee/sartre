import { z } from "zod";
import { ErrorCodeSchema } from "./error-catalog.js";

const StableIdentifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

const NullableUuidSchema = z.uuid().nullable();

export const DiagnosticActorTypeSchema = z.enum(["human", "endpoint", "system"]);
export const DiagnosticStatusSchema = z.enum(["started", "succeeded", "failed", "degraded"]);

export const DiagnosticContextSchema = z
  .object({
    requestId: z.uuid(),
    correlationId: z.uuid(),
    causationId: z.uuid(),
    workspaceId: NullableUuidSchema,
    userId: NullableUuidSchema,
    initiatedByUserId: NullableUuidSchema,
    actorType: DiagnosticActorTypeSchema,
    actorId: StableIdentifierSchema,
    component: StableIdentifierSchema,
    operation: StableIdentifierSchema,
    stage: StableIdentifierSchema,
    status: DiagnosticStatusSchema,
    resourceType: StableIdentifierSchema.nullable(),
    resourceId: NullableUuidSchema,
    requirementId: NullableUuidSchema,
    sessionId: NullableUuidSchema,
    executionId: NullableUuidSchema,
    leaseId: NullableUuidSchema,
    endpointId: NullableUuidSchema,
    occurredAt: z.iso.datetime({ offset: true }),
    errorCode: ErrorCodeSchema.nullable(),
    retryable: z.boolean(),
  })
  .strict();

export type DiagnosticActorType = z.infer<typeof DiagnosticActorTypeSchema>;
export type DiagnosticStatus = z.infer<typeof DiagnosticStatusSchema>;
export type DiagnosticContext = z.infer<typeof DiagnosticContextSchema>;
