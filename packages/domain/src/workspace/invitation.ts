import { requireDomain } from "../errors.js";
import type { WorkspaceRole } from "./membership.js";
import type { ProjectAccessRole } from "./project-access.js";

export type InvitationStatus = "accepted" | "declined" | "expired" | "pending" | "revoked";

export type WorkspaceInvitation = {
  readonly invitationId: string;
  readonly workspaceId: string;
  readonly invitedUserId: string | null;
  readonly invitedEmail: string;
  readonly workspaceRole: WorkspaceRole;
  readonly projectAccess: readonly {
    readonly projectId: string;
    readonly role: ProjectAccessRole;
  }[];
  readonly inviterUserId: string;
  readonly expiresAt: string;
  readonly status: InvitationStatus;
  readonly version: number;
};

export type CreateInvitationInput = Omit<
  WorkspaceInvitation,
  "invitedEmail" | "status" | "version"
> & {
  readonly invitedEmail: string;
  readonly inviterRole: WorkspaceRole;
};

type AcceptInvitationInput = {
  readonly userId: string;
  readonly verifiedEmail: string;
  readonly now: string;
  readonly expectedVersion: number;
};

type AcceptedInvitation = {
  readonly outcome: "accepted";
  readonly invitation: WorkspaceInvitation;
  readonly membership: {
    readonly membershipId: string;
    readonly workspaceId: string;
    readonly userId: string;
    readonly role: WorkspaceRole;
    readonly status: "active";
    readonly version: 0;
  };
  readonly projectAccess: readonly {
    readonly workspaceId: string;
    readonly projectId: string;
    readonly userId: string;
    readonly role: ProjectAccessRole;
  }[];
};

type ExpiredInvitation = {
  readonly outcome: "expired";
  readonly invitation: WorkspaceInvitation;
};

function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  requireDomain(/^[^@\s]+@[^@\s]+$/u.test(normalized), "invariant_failed", "invalid_email");
  return normalized;
}

const ROLE_RANK: Readonly<Record<WorkspaceRole, number>> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export function createInvitation(input: CreateInvitationInput): WorkspaceInvitation {
  requireDomain(input.inviterRole !== "member", "forbidden", "inviter_role_forbidden");
  requireDomain(
    ROLE_RANK[input.workspaceRole] <= ROLE_RANK[input.inviterRole],
    "forbidden",
    "invitation_role_cap_exceeded",
  );
  requireDomain(
    new Set(input.projectAccess.map((access) => access.projectId)).size ===
      input.projectAccess.length,
    "invariant_failed",
    "duplicate_project_access",
  );
  requireDomain(Number.isFinite(Date.parse(input.expiresAt)), "invariant_failed", "invalid_expiry");
  return {
    invitationId: input.invitationId,
    workspaceId: input.workspaceId,
    invitedUserId: input.invitedUserId,
    invitedEmail: normalizeEmail(input.invitedEmail),
    workspaceRole: input.workspaceRole,
    projectAccess: input.projectAccess.map((access) => ({ ...access })),
    inviterUserId: input.inviterUserId,
    expiresAt: new Date(Date.parse(input.expiresAt)).toISOString(),
    status: "pending",
    version: 0,
  };
}

export function acceptInvitation(
  invitation: WorkspaceInvitation,
  input: AcceptInvitationInput,
): AcceptedInvitation | ExpiredInvitation {
  requireDomain(
    invitation.version === input.expectedVersion,
    "version_conflict",
    "version_conflict",
  );
  requireDomain(invitation.status === "pending", "state_conflict", "invitation_not_pending");
  const now = Date.parse(input.now);
  requireDomain(Number.isFinite(now), "invariant_failed", "invalid_timestamp");
  if (now >= Date.parse(invitation.expiresAt)) {
    return {
      outcome: "expired",
      invitation: { ...invitation, status: "expired", version: invitation.version + 1 },
    };
  }
  requireDomain(
    invitation.invitedUserId === null || invitation.invitedUserId === input.userId,
    "forbidden",
    "invited_identity_mismatch",
  );
  requireDomain(
    invitation.invitedEmail === normalizeEmail(input.verifiedEmail),
    "forbidden",
    "invited_email_mismatch",
  );
  return {
    outcome: "accepted",
    invitation: { ...invitation, status: "accepted", version: invitation.version + 1 },
    membership: {
      membershipId: invitation.invitationId,
      workspaceId: invitation.workspaceId,
      userId: input.userId,
      role: invitation.workspaceRole,
      status: "active",
      version: 0,
    },
    projectAccess: invitation.projectAccess.map((access) => ({
      workspaceId: invitation.workspaceId,
      projectId: access.projectId,
      userId: input.userId,
      role: access.role,
    })),
  };
}
