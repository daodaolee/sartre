import { z } from "zod";
import { ErrorCodeSchema } from "./error-catalog.js";

const StableNameSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const CommitShaSchema = z.string().regex(/^[0-9a-f]{40}$/);

export const HealthStatusSchema = z.enum(["healthy", "degraded", "unavailable"]);

export const HealthDependencySchema = z
  .object({
    service: StableNameSchema,
    status: HealthStatusSchema,
    checkedAt: z.iso.datetime({ offset: true }),
    errorCode: ErrorCodeSchema.optional(),
  })
  .strict();

export const HealthSnapshotSchema = z
  .object({
    service: StableNameSchema,
    status: HealthStatusSchema,
    version: z.string().min(1).max(128),
    commitSha: CommitShaSchema,
    checkedAt: z.iso.datetime({ offset: true }),
    dependencies: z.array(HealthDependencySchema),
    errorCode: ErrorCodeSchema.optional(),
  })
  .strict();

export type HealthStatus = z.infer<typeof HealthStatusSchema>;
export type HealthDependency = z.infer<typeof HealthDependencySchema>;
export type HealthSnapshot = z.infer<typeof HealthSnapshotSchema>;
