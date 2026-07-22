export const moduleBoundary = "sdk" as const;

export {
  AggregatedServiceHealthSchema,
  DiagnosticProbeRequestSchema,
  DiagnosticTimelineSchema,
  HealthSnapshotSchema,
  createResultSchema,
} from "@sartre/contracts";
export type {
  AggregatedServiceHealth,
  DiagnosticProbeRequest,
  DiagnosticTimeline,
  HealthSnapshot,
  Result,
  ServiceProcessId,
} from "@sartre/contracts";
export { createHealthClient } from "./health-client.js";
export type { HealthClient, HealthClientOptions } from "./health-client.js";
export { createDiagnosticsClient, DiagnosticsClientError } from "./diagnostics-client.js";
export type {
  DiagnosticsClient,
  DiagnosticsClientOptions,
} from "./diagnostics-client.js";
