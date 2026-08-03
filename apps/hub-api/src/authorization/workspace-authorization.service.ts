import type { WorkspaceMembership } from "@sartre/domain";

import { WorkspaceError } from "../workspaces/errors.js";

export class WorkspaceAuthorizationService {
  requireMember(membership: WorkspaceMembership | null): WorkspaceMembership {
    if (membership?.status !== "active") {
      throw new WorkspaceError("resource_not_found");
    }
    return membership;
  }

  requireManager(membership: WorkspaceMembership | null): WorkspaceMembership {
    const active = this.requireMember(membership);
    if (active.role !== "owner" && active.role !== "admin") {
      throw new WorkspaceError("forbidden");
    }
    return active;
  }

  requireProjectAccess(accessRole: "editor" | "viewer" | null): "editor" | "viewer" {
    if (!accessRole) throw new WorkspaceError("project_access_denied");
    return accessRole;
  }

  requireInvitationRecipient(input: {
    readonly invitedUserId: string | null;
    readonly invitedEmail: string;
    readonly actorUserId: string;
    readonly actorEmail: string;
  }): void {
    if (
      (input.invitedUserId !== null && input.invitedUserId !== input.actorUserId) ||
      input.invitedEmail !== input.actorEmail
    ) {
      throw new WorkspaceError("forbidden");
    }
  }
}
