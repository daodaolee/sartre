export const moduleBoundary = "domain" as const;

export { DomainInvariantError } from "./errors.js";
export { createAuthIdentity } from "./identity/auth-identity.js";
export {
  createRefreshTokenFamily,
  revokeRefreshTokenFamily,
  rotateRefreshTokenFamily,
} from "./identity/refresh-token-family.js";
export { acceptInvitation, createInvitation } from "./workspace/invitation.js";
export { changeMembershipRole, removeMembership } from "./workspace/membership.js";
export { resolveProjectPermission } from "./workspace/project-access.js";

export type { DomainErrorCode } from "./errors.js";
export type {
  AuthIdentity,
  AuthIdentityPolicy,
  AuthProvider,
  CreateAuthIdentityInput,
} from "./identity/auth-identity.js";
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
  ProjectAccessRole,
  ProjectPermission,
} from "./workspace/project-access.js";
