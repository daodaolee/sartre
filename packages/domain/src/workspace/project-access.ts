import { requireDomain } from "../errors.js";
import type { WorkspaceMembership, WorkspaceRole } from "./membership.js";

export type ProjectAccessRole = "editor" | "viewer";

export type ProjectAccess = {
  readonly workspaceId: string;
  readonly projectId: string;
  readonly userId: string;
  readonly role: ProjectAccessRole;
  readonly version: number;
};

export type ProjectPermission = {
  readonly canRead: boolean;
  readonly canWrite: boolean;
};

export function resolveProjectPermission(input: {
  readonly workspaceRole: WorkspaceRole;
  readonly explicitAccess: ProjectAccessRole | null;
}): ProjectPermission {
  void input.workspaceRole;
  return {
    canRead: input.explicitAccess === "viewer" || input.explicitAccess === "editor",
    canWrite: input.explicitAccess === "editor",
  };
}

export function grantProjectAccess(input: {
  readonly workspaceId: string;
  readonly projectId: string;
  readonly actor: {
    readonly actorType: "endpoint" | "human" | "system";
    readonly userId: string;
  };
  readonly actorMembership: WorkspaceMembership;
  readonly targetMembership: WorkspaceMembership;
  readonly role: ProjectAccessRole;
  readonly existingAccess: ProjectAccess | null;
  readonly expectedVersion: number | null;
}): ProjectAccess {
  requireDomain(input.actor.actorType === "human", "forbidden", "human_actor_required");
  requireDomain(
    input.actorMembership.workspaceId === input.workspaceId &&
      input.actorMembership.userId === input.actor.userId &&
      input.actorMembership.status === "active",
    "forbidden",
    "actor_not_workspace_member",
  );
  requireDomain(
    input.actorMembership.role === "owner" || input.actorMembership.role === "admin",
    "forbidden",
    "project_access_management_forbidden",
  );
  requireDomain(
    input.targetMembership.workspaceId === input.workspaceId &&
      input.targetMembership.status === "active",
    "state_conflict",
    "target_membership_not_active",
  );
  requireDomain(
    input.existingAccess === null
      ? input.expectedVersion === null
      : input.expectedVersion === input.existingAccess.version,
    "version_conflict",
    "version_conflict",
  );
  if (input.existingAccess) {
    requireDomain(
      input.existingAccess.workspaceId === input.workspaceId &&
        input.existingAccess.projectId === input.projectId &&
        input.existingAccess.userId === input.targetMembership.userId,
      "state_conflict",
      "project_access_target_mismatch",
    );
  }
  return {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    userId: input.targetMembership.userId,
    role: input.role,
    version: input.existingAccess ? input.existingAccess.version + 1 : 0,
  };
}
