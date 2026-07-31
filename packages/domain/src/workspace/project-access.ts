import type { WorkspaceRole } from "./membership.js";

export type ProjectAccessRole = "editor" | "viewer";

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
