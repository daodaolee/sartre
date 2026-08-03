import { requireDomain } from "../errors.js";
import type { WorkspaceMembership } from "./membership.js";
import type { ProjectAccess } from "./project-access.js";

export type Project = {
  readonly workspaceId: string;
  readonly projectId: string;
  readonly name: string;
  readonly status: "active" | "archived";
  readonly version: number;
};

export function createProject(input: {
  readonly workspaceId: string;
  readonly projectId: string;
  readonly name: string;
  readonly actor: {
    readonly actorType: "endpoint" | "human" | "system";
    readonly userId: string;
  };
  readonly actorMembership: WorkspaceMembership;
}): { readonly project: Project; readonly creatorAccess: ProjectAccess } {
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
    "project_management_forbidden",
  );
  const name = input.name.trim();
  requireDomain(name.length > 0 && name.length <= 200, "invariant_failed", "invalid_project_name");
  return {
    project: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      name,
      status: "active",
      version: 0,
    },
    creatorAccess: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      userId: input.actor.userId,
      role: "editor",
      version: 0,
    },
  };
}
