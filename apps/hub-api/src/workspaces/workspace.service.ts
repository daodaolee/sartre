import { createHash, randomUUID } from "node:crypto";

import {
  type HumanActor,
  HumanActorSchema,
  type InvitationAcceptCommand,
  InvitationAcceptCommandSchema,
  type InvitationCreateCommand,
  InvitationCreateCommandSchema,
  type InvitationRevokeCommand,
  InvitationRevokeCommandSchema,
  type InvitationSummary,
  type MembershipRemoveCommand,
  MembershipRemoveCommandSchema,
  type MembershipRoleChangeCommand,
  MembershipRoleChangeCommandSchema,
  type MembershipSummary,
  type ProjectAccessGrantCommand,
  ProjectAccessGrantCommandSchema,
  type ProjectAccessSummary,
  type ProjectCreateCommand,
  ProjectCreateCommandSchema,
  type ProjectSummary,
  type WorkspaceCreateCommand,
  WorkspaceCreateCommandSchema,
  type WorkspaceSummary,
} from "@sartre/contracts";
import { createWorkspace } from "@sartre/domain";

import { WorkspaceError } from "./errors.js";
import type { PostgresWorkspaceRepository } from "./postgres-workspace.repository.js";

function requestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export class WorkspaceService {
  constructor(private readonly repository: PostgresWorkspaceRepository) {}

  async create(
    command: WorkspaceCreateCommand,
    actor: HumanActor,
    correlationId: string,
  ): Promise<WorkspaceSummary> {
    const parsed = WorkspaceCreateCommandSchema.parse(command);
    const human = HumanActorSchema.parse(actor);
    const created = createWorkspace({
      workspaceId: parsed.workspaceId,
      name: parsed.name,
      actor: { actorType: human.actorType, userId: human.userId },
    });
    return this.repository.createWorkspace({
      workspaceId: created.workspace.workspaceId,
      name: created.workspace.name,
      ownerUserId: created.owner.userId,
      ownerMembershipId: created.owner.membershipId,
      idempotencyKey: parsed.idempotencyKey,
      requestHash: requestHash(parsed),
      eventId: randomUUID(),
      outboxEventId: randomUUID(),
      auditEventId: randomUUID(),
      correlationId,
      now: new Date(),
    });
  }

  async get(workspaceId: string, actor: HumanActor): Promise<WorkspaceSummary> {
    const human = HumanActorSchema.parse(actor);
    const result = await this.repository.getWorkspace({ workspaceId, userId: human.userId });
    if (!result) throw new WorkspaceError("resource_not_found");
    return result;
  }

  async createInvitation(
    workspaceId: string,
    command: InvitationCreateCommand,
    actor: HumanActor,
    correlationId: string,
  ): Promise<InvitationSummary> {
    const parsed = InvitationCreateCommandSchema.parse(command);
    const human = HumanActorSchema.parse(actor);
    const now = new Date();
    if (Date.parse(parsed.expiresAt) <= now.getTime()) {
      throw new WorkspaceError("validation_failed");
    }
    return this.repository.createInvitation({
      workspaceId,
      actorUserId: human.userId,
      invitationId: parsed.invitationId,
      invitedEmail: parsed.invitedEmail,
      role: parsed.role,
      expiresAt: parsed.expiresAt,
      idempotencyKey: parsed.idempotencyKey,
      requestHash: requestHash(parsed),
      commandType: "invitation.create",
      correlationId,
      now,
    });
  }

  async acceptInvitation(
    workspaceId: string,
    command: InvitationAcceptCommand,
    actor: HumanActor,
    correlationId: string,
  ): Promise<InvitationSummary> {
    const parsed = InvitationAcceptCommandSchema.parse(command);
    const human = HumanActorSchema.parse(actor);
    return this.repository.acceptInvitation({
      workspaceId,
      actorUserId: human.userId,
      invitationId: parsed.invitationId,
      expectedVersion: parsed.expectedVersion,
      idempotencyKey: parsed.idempotencyKey,
      requestHash: requestHash(parsed),
      commandType: "invitation.accept",
      correlationId,
      now: new Date(),
    });
  }

  async revokeInvitation(
    workspaceId: string,
    command: InvitationRevokeCommand,
    actor: HumanActor,
    correlationId: string,
  ): Promise<InvitationSummary> {
    const parsed = InvitationRevokeCommandSchema.parse(command);
    const human = HumanActorSchema.parse(actor);
    return this.repository.revokeInvitation({
      workspaceId,
      actorUserId: human.userId,
      invitationId: parsed.invitationId,
      expectedVersion: parsed.expectedVersion,
      idempotencyKey: parsed.idempotencyKey,
      requestHash: requestHash(parsed),
      commandType: "invitation.revoke",
      correlationId,
      now: new Date(),
    });
  }

  async listMembers(workspaceId: string, actor: HumanActor): Promise<readonly MembershipSummary[]> {
    const human = HumanActorSchema.parse(actor);
    return this.repository.listMembers({ workspaceId, actorUserId: human.userId });
  }

  async changeMembershipRole(
    workspaceId: string,
    command: MembershipRoleChangeCommand,
    actor: HumanActor,
    correlationId: string,
  ): Promise<MembershipSummary> {
    const parsed = MembershipRoleChangeCommandSchema.parse(command);
    const human = HumanActorSchema.parse(actor);
    return this.repository.changeMembershipRole({
      workspaceId,
      actorUserId: human.userId,
      membershipId: parsed.membershipId,
      role: parsed.role,
      expectedVersion: parsed.expectedVersion,
      idempotencyKey: parsed.idempotencyKey,
      requestHash: requestHash(parsed),
      commandType: "membership.role.change",
      correlationId,
      now: new Date(),
    });
  }

  async removeMembership(
    workspaceId: string,
    command: MembershipRemoveCommand,
    actor: HumanActor,
    correlationId: string,
  ): Promise<MembershipSummary> {
    const parsed = MembershipRemoveCommandSchema.parse(command);
    const human = HumanActorSchema.parse(actor);
    return this.repository.removeMembership({
      workspaceId,
      actorUserId: human.userId,
      membershipId: parsed.membershipId,
      expectedVersion: parsed.expectedVersion,
      idempotencyKey: parsed.idempotencyKey,
      requestHash: requestHash(parsed),
      commandType: "membership.remove",
      correlationId,
      now: new Date(),
    });
  }

  async createProject(
    workspaceId: string,
    command: ProjectCreateCommand,
    actor: HumanActor,
    correlationId: string,
  ): Promise<ProjectSummary> {
    const parsed = ProjectCreateCommandSchema.parse(command);
    const human = HumanActorSchema.parse(actor);
    return this.repository.createProject({
      workspaceId,
      actorUserId: human.userId,
      projectId: parsed.projectId,
      name: parsed.name,
      idempotencyKey: parsed.idempotencyKey,
      requestHash: requestHash(parsed),
      commandType: "project.create",
      correlationId,
      now: new Date(),
    });
  }

  async listProjects(workspaceId: string, actor: HumanActor): Promise<readonly ProjectSummary[]> {
    const human = HumanActorSchema.parse(actor);
    return this.repository.listProjects({ workspaceId, actorUserId: human.userId });
  }

  async grantProjectAccess(
    workspaceId: string,
    command: ProjectAccessGrantCommand,
    actor: HumanActor,
    correlationId: string,
  ): Promise<ProjectAccessSummary> {
    const parsed = ProjectAccessGrantCommandSchema.parse(command);
    const human = HumanActorSchema.parse(actor);
    return this.repository.grantProjectAccess({
      workspaceId,
      actorUserId: human.userId,
      projectId: parsed.projectId,
      targetUserId: parsed.userId,
      role: parsed.role,
      expectedVersion: parsed.expectedVersion,
      idempotencyKey: parsed.idempotencyKey,
      requestHash: requestHash(parsed),
      commandType: "project.access.grant",
      correlationId,
      now: new Date(),
    });
  }
}
