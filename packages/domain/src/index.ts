export const moduleBoundary = "domain" as const;

export { DomainInvariantError } from "./errors.js";
export { createAuthIdentity } from "./identity/auth-identity.js";
export {
  createEndpointIdentity,
  revokeEndpointIdentity,
  rotateEndpointCredential,
} from "./identity/endpoint-identity.js";
export {
  consumeEndpointPairingIntent,
  createEndpointPairingIntent,
} from "./identity/endpoint-pairing.js";
export {
  createRefreshTokenFamily,
  revokeRefreshTokenFamily,
  rotateRefreshTokenFamily,
} from "./identity/refresh-token-family.js";
export { acceptInvitation, createInvitation, revokeInvitation } from "./workspace/invitation.js";
export { changeMembershipRole, removeMembership } from "./workspace/membership.js";
export { grantProjectAccess, resolveProjectPermission } from "./workspace/project-access.js";
export { createProject } from "./workspace/project.js";
export { createWorkspace } from "./workspace/workspace.js";

export type { DomainErrorCode } from "./errors.js";
export type {
  AuthIdentity,
  AuthIdentityPolicy,
  AuthProvider,
  CreateAuthIdentityInput,
} from "./identity/auth-identity.js";
export type { EndpointIdentity } from "./identity/endpoint-identity.js";
export type { EndpointPairingIntent } from "./identity/endpoint-pairing.js";
export type {
  RefreshTokenFamily,
  RefreshTokenFamilyStatus,
  RefreshTokenRevocationReason,
  RefreshTokenRotationResult,
} from "./identity/refresh-token-family.js";
export type {
  InvitationStatus,
  WorkspaceInvitation,
} from "./workspace/invitation.js";
export type {
  WorkspaceMembership,
  WorkspaceMembershipStatus,
  WorkspaceRole,
} from "./workspace/membership.js";
export type {
  ProjectAccess,
  ProjectAccessRole,
  ProjectPermission,
} from "./workspace/project-access.js";
export type { Project } from "./workspace/project.js";
export type { Workspace } from "./workspace/workspace.js";
