export const moduleBoundary = "contracts" as const;

export {
  DiagnosticActorTypeSchema,
  DiagnosticContextSchema,
  DiagnosticStatusSchema,
} from "./diagnostics.js";
export { ERROR_CODES, ErrorCodeSchema } from "./error-catalog.js";
export {
  EvidenceAssertionSchema,
  EvidenceCommandSchema,
  EvidenceLevelSchema,
  EvidenceManifestSchema,
  EvidenceStatusSchema,
} from "./evidence.js";
export {
  HealthDependencySchema,
  HealthSnapshotSchema,
  HealthStatusSchema,
} from "./health.js";
export {
  AggregatedServiceHealthSchema,
  ElectronHealthSnapshotSchema,
  HubApiHealthSnapshotSchema,
  HubWorkerHealthSnapshotSchema,
  LocalRuntimeHealthSnapshotSchema,
  Ms0WorkerHeartbeatSchema,
  ServiceProcessIdSchema,
} from "./service-health.js";
export { createResultSchema } from "./result.js";

export type {
  DiagnosticActorType,
  DiagnosticContext,
  DiagnosticStatus,
} from "./diagnostics.js";
export type { ErrorCode } from "./error-catalog.js";
export type {
  EvidenceAssertion,
  EvidenceCommand,
  EvidenceLevel,
  EvidenceManifest,
  EvidenceStatus,
} from "./evidence.js";
export type { HealthDependency, HealthSnapshot, HealthStatus } from "./health.js";
export type {
  AggregatedServiceHealth,
  Ms0WorkerHeartbeat,
  ServiceProcessId,
} from "./service-health.js";
export type { Result } from "./result.js";
