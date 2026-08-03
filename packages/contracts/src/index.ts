export const moduleBoundary = "contracts" as const;

export {
  ActorSchema,
  EndpointActorSchema,
  HumanActorSchema,
  SystemActorSchema,
} from "./authorization/actors.js";

export {
  DiagnosticActorTypeSchema,
  DiagnosticContextSchema,
  DiagnosticStatusSchema,
} from "./diagnostics.js";
export {
  DIAGNOSTIC_RECOVERY_ACTIONS,
  DIAGNOSTIC_STAGES,
  DiagnosticCurrentStateSchema,
  DiagnosticDependencyOutcomeSchema,
  DiagnosticProbeContextSchema,
  DiagnosticProbeRequestSchema,
  DiagnosticRecoveryActionSchema,
  DiagnosticStageRecordSchema,
  DiagnosticStageSchema,
  DiagnosticTimelineSchema,
} from "./diagnostic-timeline.js";
export { ERROR_CODES, ErrorCodeSchema } from "./error-catalog.js";
export {
  AuthIdentityRegistrationSchema,
  AuthProviderSchema,
} from "./identity/auth-identity.js";
export {
  CompanyEmailLoginCommandSchema,
  CompanyEmailRegistrationCommandSchema,
  EmailVerificationAcceptedSchema,
  EmailVerificationRequestSchema,
  FeishuAuthorizationCallbackCommandSchema,
  FeishuAuthorizationStartCommandSchema,
  FeishuAuthorizationStartResultSchema,
  HumanAccessTokenClaimsSchema,
  HumanAuthSessionSchema,
  HumanRefreshCommandSchema,
  HumanSessionInventoryItemSchema,
  HumanSessionInventorySchema,
} from "./identity/human-auth.js";
export {
  NonDisclosingAuthorizationProblemSchema,
  ProblemDetailsSchema,
} from "./http/problem-details.js";
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
export {
  InvitationAcceptCommandSchema,
  InvitationStatusSchema,
  MembershipRoleChangeCommandSchema,
  ProjectAccessRoleSchema,
  WorkspaceRoleSchema,
} from "./workspace/access.js";

export type {
  DiagnosticActorType,
  DiagnosticContext,
  DiagnosticStatus,
} from "./diagnostics.js";
export type {
  Actor,
  EndpointActor,
  HumanActor,
  SystemActor,
} from "./authorization/actors.js";
export type {
  DiagnosticDependencyOutcome,
  DiagnosticProbeRequest,
  DiagnosticRecoveryAction,
  DiagnosticStage,
  DiagnosticStageRecord,
  DiagnosticTimeline,
} from "./diagnostic-timeline.js";
export type { ErrorCode } from "./error-catalog.js";
export type {
  AuthIdentityRegistration,
  AuthProvider,
} from "./identity/auth-identity.js";
export type {
  CompanyEmailLoginCommand,
  CompanyEmailRegistrationCommand,
  EmailVerificationRequest,
  FeishuAuthorizationCallbackCommand,
  FeishuAuthorizationStartCommand,
  FeishuAuthorizationStartResult,
  HumanAccessTokenClaims,
  HumanAuthSession,
  HumanRefreshCommand,
  HumanSessionInventory,
  HumanSessionInventoryItem,
} from "./identity/human-auth.js";
export type {
  NonDisclosingAuthorizationProblem,
  ProblemDetails,
} from "./http/problem-details.js";
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
export type {
  InvitationAcceptCommand,
  InvitationStatus,
  MembershipRoleChangeCommand,
  ProjectAccessRole,
  WorkspaceRole,
} from "./workspace/access.js";
