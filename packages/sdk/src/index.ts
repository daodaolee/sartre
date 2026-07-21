export const moduleBoundary = "sdk" as const;

export {
  AggregatedServiceHealthSchema,
  HealthSnapshotSchema,
  createResultSchema,
} from "@sartre/contracts";
export type {
  AggregatedServiceHealth,
  HealthSnapshot,
  Result,
  ServiceProcessId,
} from "@sartre/contracts";
export { createHealthClient } from "./health-client.js";
export type { HealthClient, HealthClientOptions } from "./health-client.js";
