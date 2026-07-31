import { requireDomain } from "../errors.js";

export type WorkspaceRole = "admin" | "member" | "owner";
export type WorkspaceMembershipStatus = "active" | "removed";

export type WorkspaceMembership = {
  readonly membershipId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly status: WorkspaceMembershipStatus;
  readonly version: number;
};

type MembershipActor = {
  readonly actorType: "endpoint" | "human" | "system";
  readonly userId: string;
};

type MembershipCommand = {
  readonly actor: MembershipActor;
  readonly targetMembershipId: string;
  readonly expectedVersion: number;
};

type ChangeMembershipRoleCommand = MembershipCommand & {
  readonly role: WorkspaceRole;
};

function commandContext(
  memberships: readonly WorkspaceMembership[],
  command: MembershipCommand,
): { readonly actor: WorkspaceMembership; readonly target: WorkspaceMembership } {
  requireDomain(command.actor.actorType === "human", "forbidden", "human_actor_required");
  const target = memberships.find(
    (membership) =>
      membership.membershipId === command.targetMembershipId && membership.status === "active",
  );
  requireDomain(target, "state_conflict", "membership_not_active");
  const actor = memberships.find(
    (membership) =>
      membership.workspaceId === target.workspaceId &&
      membership.userId === command.actor.userId &&
      membership.status === "active",
  );
  requireDomain(actor, "forbidden", "actor_not_workspace_member");
  requireDomain(target.version === command.expectedVersion, "version_conflict", "version_conflict");
  return { actor, target };
}

function requireManager(actor: WorkspaceMembership, target: WorkspaceMembership): void {
  const allowed = actor.role === "owner" || (actor.role === "admin" && target.role === "member");
  requireDomain(allowed, "forbidden", "membership_management_forbidden");
}

function activeOwnerCount(
  memberships: readonly WorkspaceMembership[],
  workspaceId: string,
): number {
  return memberships.filter(
    (membership) =>
      membership.workspaceId === workspaceId &&
      membership.status === "active" &&
      membership.role === "owner",
  ).length;
}

export function removeMembership(
  memberships: readonly WorkspaceMembership[],
  command: MembershipCommand,
): readonly WorkspaceMembership[] {
  const { actor, target } = commandContext(memberships, command);
  requireManager(actor, target);
  requireDomain(
    target.role !== "owner" || activeOwnerCount(memberships, target.workspaceId) > 1,
    "invariant_failed",
    "last_owner_required",
  );
  return memberships.map((membership) =>
    membership.membershipId === target.membershipId
      ? { ...membership, status: "removed", version: membership.version + 1 }
      : membership,
  );
}

export function changeMembershipRole(
  memberships: readonly WorkspaceMembership[],
  command: ChangeMembershipRoleCommand,
): readonly WorkspaceMembership[] {
  const { actor, target } = commandContext(memberships, command);
  requireManager(actor, target);
  requireDomain(
    actor.role === "owner" || command.role !== "owner",
    "forbidden",
    "owner_role_assignment_forbidden",
  );
  requireDomain(
    target.role !== "owner" ||
      command.role === "owner" ||
      activeOwnerCount(memberships, target.workspaceId) > 1,
    "invariant_failed",
    "last_owner_required",
  );
  return memberships.map((membership) =>
    membership.membershipId === target.membershipId
      ? { ...membership, role: command.role, version: membership.version + 1 }
      : membership,
  );
}
