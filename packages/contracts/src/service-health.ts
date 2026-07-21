import { z } from "zod";

import { HealthSnapshotSchema, HealthStatusSchema } from "./health.js";

export const ServiceProcessIdSchema = z.enum([
  "electron",
  "hub-api",
  "hub-worker",
  "local-runtime",
]);

export const ElectronHealthSnapshotSchema = HealthSnapshotSchema.extend({
  service: z.literal("electron"),
}).strict();

export const HubApiHealthSnapshotSchema = HealthSnapshotSchema.extend({
  service: z.literal("hub-api"),
}).strict();

export const HubWorkerHealthSnapshotSchema = HealthSnapshotSchema.extend({
  service: z.literal("hub-worker"),
}).strict();

export const LocalRuntimeHealthSnapshotSchema = HealthSnapshotSchema.extend({
  service: z.literal("local-runtime"),
}).strict();

export const Ms0WorkerHeartbeatSchema = z
  .object({
    snapshot: HubWorkerHealthSnapshotSchema,
  })
  .strict();

export const AggregatedServiceHealthSchema = z
  .object({
    status: HealthStatusSchema,
    checkedAt: z.iso.datetime({ offset: true }),
    processes: z
      .object({
        electron: ElectronHealthSnapshotSchema,
        "hub-api": HubApiHealthSnapshotSchema,
        "hub-worker": HubWorkerHealthSnapshotSchema,
        "local-runtime": LocalRuntimeHealthSnapshotSchema,
      })
      .strict(),
  })
  .strict();

export type ServiceProcessId = z.infer<typeof ServiceProcessIdSchema>;
export type Ms0WorkerHeartbeat = z.infer<typeof Ms0WorkerHeartbeatSchema>;
export type AggregatedServiceHealth = z.infer<typeof AggregatedServiceHealthSchema>;
