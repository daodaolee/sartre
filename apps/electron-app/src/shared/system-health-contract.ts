import {
  AggregatedServiceHealthSchema,
  createResultSchema,
  type AggregatedServiceHealth,
  type Result,
} from "@sartre/sdk";

export type { AggregatedServiceHealth, HealthSnapshot } from "@sartre/sdk";

export const SYSTEM_HEALTH_GET_CHANNEL = "system-health:get-snapshot";
export const SYSTEM_HEALTH_UPDATE_CHANNEL = "system-health:update";
export const SystemHealthResultSchema = createResultSchema(AggregatedServiceHealthSchema);

export type SystemHealthResult = Result<AggregatedServiceHealth>;

export interface SystemHealthBridge {
  getSnapshot: () => Promise<SystemHealthResult>;
  subscribe: (listener: (result: SystemHealthResult) => void) => () => void;
}
