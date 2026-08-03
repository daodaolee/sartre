export const moduleBoundary = "sdk" as const;

export {
  AggregatedServiceHealthSchema,
  DesktopAcceptInvitationCommandSchema,
  DesktopAuthStateSchema,
  DesktopChangeMembershipRoleCommandSchema,
  DesktopCreateProjectCommandSchema,
  DesktopCreateWorkspaceCommandSchema,
  DesktopGrantProjectAccessCommandSchema,
  DesktopInvitationResultSchema,
  DesktopInviteMemberCommandSchema,
  DesktopLoginCommandSchema,
  DesktopOpenWorkspaceCommandSchema,
  DesktopRemoveMembershipCommandSchema,
  DesktopRuntimeStatusSchema,
  DesktopWorkspaceViewSchema,
  DiagnosticProbeRequestSchema,
  DiagnosticTimelineSchema,
  HealthSnapshotSchema,
  InvitationSummarySchema,
  MembershipSummarySchema,
  ProjectAccessSummarySchema,
  ProjectSummarySchema,
  WorkspaceSummarySchema,
  createResultSchema,
} from "@sartre/contracts";
export type {
  AggregatedServiceHealth,
  DesktopAcceptInvitationCommand,
  DesktopAuthState,
  DesktopChangeMembershipRoleCommand,
  DesktopCreateProjectCommand,
  DesktopCreateWorkspaceCommand,
  DesktopGrantProjectAccessCommand,
  DesktopInviteMemberCommand,
  DesktopLoginCommand,
  DesktopOpenWorkspaceCommand,
  DesktopRemoveMembershipCommand,
  DesktopRuntimeStatus,
  DesktopWorkspaceView,
  ErrorCode,
  DiagnosticProbeRequest,
  DiagnosticTimeline,
  HealthSnapshot,
  InvitationSummary,
  MembershipSummary,
  ProjectAccessSummary,
  ProjectSummary,
  Result,
  ServiceProcessId,
  WorkspaceSummary,
} from "@sartre/contracts";
export { createHealthClient } from "./health-client.js";
export type { HealthClient, HealthClientOptions } from "./health-client.js";
export { createDiagnosticsClient, DiagnosticsClientError } from "./diagnostics-client.js";
export type {
  DiagnosticsClient,
  DiagnosticsClientOptions,
} from "./diagnostics-client.js";
export { createMs1Client, Ms1ClientError } from "./ms1-client.js";
export type { Ms1Client, Ms1ClientOptions } from "./ms1-client.js";
