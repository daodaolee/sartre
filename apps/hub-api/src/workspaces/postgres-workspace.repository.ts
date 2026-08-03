import { randomUUID } from "node:crypto";
import {
  type InvitationSummary,
  InvitationSummarySchema,
  type MembershipSummary,
  MembershipSummarySchema,
  type ProjectAccessSummary,
  ProjectAccessSummarySchema,
  type ProjectSummary,
  ProjectSummarySchema,
  type WorkspaceSummary,
  WorkspaceSummarySchema,
} from "@sartre/contracts";
import {
  acceptInvitation,
  changeMembershipRole,
  createInvitation,
  createProject,
  DomainInvariantError,
  grantProjectAccess,
  type ProjectAccess,
  removeMembership,
  revokeInvitation,
  type WorkspaceInvitation,
  type WorkspaceMembership,
} from "@sartre/domain";
import postgres from "postgres";

import { WorkspaceAuthorizationService } from "../authorization/workspace-authorization.service.js";
import { WorkspaceError } from "./errors.js";

type TenantTransaction = postgres.TransactionSql;

type ReceiptRow = {
  command_type: string;
  request_hash: string;
  result: unknown;
};

type WorkspaceRow = {
  workspace_id: string;
  name: string;
  status: "active";
  role: "admin" | "member" | "owner";
  version: number;
};

type MembershipRow = {
  workspace_id: string;
  membership_id: string;
  user_id: string;
  role: "admin" | "member" | "owner";
  status: "active" | "removed";
  version: number;
};

type MembershipSummaryRow = MembershipRow & { display_name: string };

type InvitationRow = {
  workspace_id: string;
  invitation_id: string;
  invited_user_id: string | null;
  invited_email: string;
  inviter_user_id: string;
  role: "admin" | "member" | "owner";
  status: "accepted" | "declined" | "expired" | "pending" | "revoked";
  expires_at: Date | string;
  version: number;
};

type IdentityRow = {
  user_id: string;
  verified_email: string;
};

type ProjectRow = {
  workspace_id: string;
  project_id: string;
  name: string;
  status: "active";
  version: number;
};

type ProjectSummaryRow = ProjectRow & { access_role: "editor" | "viewer" };

type ProjectAccessRow = {
  workspace_id: string;
  project_id: string;
  user_id: string;
  role: "editor" | "viewer";
  version: number;
};

type CommandContext = {
  readonly workspaceId: string;
  readonly actorUserId: string;
  readonly idempotencyKey: string;
  readonly requestHash: string;
  readonly commandType: string;
  readonly correlationId: string;
  readonly now: Date;
};

type MutationEvent = {
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly aggregateVersion: number;
  readonly eventType: string;
  readonly payload: Readonly<Record<string, unknown>>;
};

function postgresCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

function iso(value: Date | string): string {
  return new Date(value).toISOString();
}

function jsonValue(value: unknown): postgres.JSONValue {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new WorkspaceError("dependency_unavailable");
  return JSON.parse(encoded) as postgres.JSONValue;
}

function workspaceSummary(row: WorkspaceRow): WorkspaceSummary {
  return WorkspaceSummarySchema.parse({
    workspaceId: row.workspace_id,
    name: row.name,
    status: row.status,
    role: row.role,
    version: row.version,
  });
}

function membership(row: MembershipRow): WorkspaceMembership {
  return {
    workspaceId: row.workspace_id,
    membershipId: row.membership_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    version: row.version,
  };
}

function membershipSummary(row: MembershipSummaryRow): MembershipSummary {
  return MembershipSummarySchema.parse({
    membershipId: row.membership_id,
    userId: row.user_id,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    version: row.version,
  });
}

function invitation(row: InvitationRow): WorkspaceInvitation {
  return {
    workspaceId: row.workspace_id,
    invitationId: row.invitation_id,
    invitedUserId: row.invited_user_id,
    invitedEmail: row.invited_email,
    inviterUserId: row.inviter_user_id,
    workspaceRole: row.role,
    projectAccess: [],
    expiresAt: iso(row.expires_at),
    status: row.status,
    version: row.version,
  };
}

function invitationSummary(value: WorkspaceInvitation): InvitationSummary {
  return InvitationSummarySchema.parse({
    workspaceId: value.workspaceId,
    invitationId: value.invitationId,
    invitedEmail: value.invitedEmail,
    role: value.workspaceRole,
    status: value.status,
    expiresAt: value.expiresAt,
    version: value.version,
  });
}

function projectSummary(row: ProjectSummaryRow): ProjectSummary {
  return ProjectSummarySchema.parse({
    projectId: row.project_id,
    name: row.name,
    status: row.status,
    accessRole: row.access_role,
    version: row.version,
  });
}

function projectAccess(row: ProjectAccessRow): ProjectAccess {
  return {
    workspaceId: row.workspace_id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role,
    version: row.version,
  };
}

function projectAccessSummary(value: ProjectAccess): ProjectAccessSummary {
  return ProjectAccessSummarySchema.parse({
    projectId: value.projectId,
    userId: value.userId,
    role: value.role,
    version: value.version,
  });
}

function domainError(error: DomainInvariantError): WorkspaceError {
  switch (error.code) {
    case "forbidden":
      return new WorkspaceError("forbidden");
    case "version_conflict":
      return new WorkspaceError("version_conflict");
    case "invariant_failed":
    case "state_conflict":
      return new WorkspaceError("state_conflict");
    default:
      return new WorkspaceError("dependency_unavailable");
  }
}

export class PostgresWorkspaceRepository {
  private readonly sql;
  private readonly authorization = new WorkspaceAuthorizationService();

  constructor(connectionString: string) {
    this.sql = postgres(connectionString, {
      connect_timeout: 3,
      idle_timeout: 5,
      max: 10,
      prepare: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.sql.end({ timeout: 3 });
  }

  async createWorkspace(input: {
    readonly workspaceId: string;
    readonly name: string;
    readonly ownerUserId: string;
    readonly ownerMembershipId: string;
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly eventId: string;
    readonly outboxEventId: string;
    readonly auditEventId: string;
    readonly correlationId: string;
    readonly now: Date;
  }): Promise<WorkspaceSummary> {
    try {
      return await this.sql.begin(async (transaction) => {
        await this.setTenant(transaction, input.workspaceId, input.ownerUserId);
        await transaction`SELECT pg_advisory_xact_lock(
          hashtextextended(${`${input.workspaceId}:${input.idempotencyKey}`}, 0)
        )`;

        const receipts = await transaction<ReceiptRow[]>`
          SELECT command_type, request_hash, result
            FROM workspace_command_receipts
           WHERE workspace_id = ${input.workspaceId}
             AND idempotency_key = ${input.idempotencyKey}
             AND created_by_user_id = ${input.ownerUserId}
        `;
        const receipt = receipts[0];
        if (receipt) {
          if (
            receipt.command_type !== "workspace.create" ||
            receipt.request_hash !== input.requestHash
          ) {
            throw new WorkspaceError("idempotency_conflict");
          }
          return WorkspaceSummarySchema.parse(receipt.result);
        }

        await transaction`
          INSERT INTO workspaces (workspace_id, name, status, version, created_at, updated_at)
          VALUES (${input.workspaceId}, ${input.name}, 'active', 0, ${input.now}, ${input.now})
        `;
        await transaction`
          INSERT INTO memberships (
            workspace_id, membership_id, user_id, role, status, version, created_at, updated_at
          ) VALUES (
            ${input.workspaceId}, ${input.ownerMembershipId}, ${input.ownerUserId}, 'owner',
            'active', 0, ${input.now}, ${input.now}
          )
        `;
        const result = WorkspaceSummarySchema.parse({
          workspaceId: input.workspaceId,
          name: input.name,
          status: "active",
          role: "owner",
          version: 0,
        });
        await transaction`
          INSERT INTO domain_events (
            workspace_id, event_id, workspace_cursor, aggregate_type, aggregate_id,
            aggregate_version, event_type, actor_type, actor_id, initiated_by_user_id,
            correlation_id, causation_id, occurred_at, payload
          ) VALUES (
            ${input.workspaceId}, ${input.eventId}, 1, 'Workspace', ${input.workspaceId}, 1,
            'workspace.created', 'human', ${input.ownerUserId}, ${input.ownerUserId},
            ${input.correlationId}, ${input.idempotencyKey}, ${input.now},
            ${this.sql.json({ workspaceId: input.workspaceId })}
          )
        `;
        await transaction`
          INSERT INTO outbox_events (
            workspace_id, outbox_event_id, event_id, status, attempt_count, available_at,
            claimed_until, created_at
          ) VALUES (
            ${input.workspaceId}, ${input.outboxEventId}, ${input.eventId}, 'pending', 0,
            ${input.now}, NULL, ${input.now}
          )
        `;
        await transaction`
          INSERT INTO audit_events (
            workspace_id, audit_event_id, event_type, actor_type, actor_id,
            initiated_by_user_id, correlation_id, occurred_at, payload
          ) VALUES (
            ${input.workspaceId}, ${input.auditEventId}, 'workspace.created', 'human',
            ${input.ownerUserId}, ${input.ownerUserId}, ${input.correlationId}, ${input.now},
            ${this.sql.json({ workspaceId: input.workspaceId })}
          )
        `;
        await transaction`
          INSERT INTO workspace_command_receipts (
            workspace_id, idempotency_key, command_type, request_hash, result,
            created_by_user_id, created_at
          ) VALUES (
            ${input.workspaceId}, ${input.idempotencyKey}, 'workspace.create',
            ${input.requestHash}, ${this.sql.json(result)}, ${input.ownerUserId}, ${input.now}
          )
        `;
        return result;
      });
    } catch (error) {
      throw this.translate(error);
    }
  }

  async getWorkspace(input: {
    readonly workspaceId: string;
    readonly userId: string;
  }): Promise<WorkspaceSummary | null> {
    const rows = await this.inTenant(
      input.workspaceId,
      input.userId,
      (transaction) =>
        transaction<WorkspaceRow[]>`
        SELECT workspace_row.workspace_id, workspace_row.name, workspace_row.status,
               membership_row.role, workspace_row.version
          FROM workspaces AS workspace_row
          JOIN memberships AS membership_row
            ON membership_row.workspace_id = workspace_row.workspace_id
           AND membership_row.user_id = ${input.userId}
           AND membership_row.status = 'active'
         WHERE workspace_row.workspace_id = ${input.workspaceId}
           AND workspace_row.status = 'active'
         LIMIT 1
      `,
    );
    return rows[0] ? workspaceSummary(rows[0]) : null;
  }

  async createInvitation(
    input: CommandContext & {
      readonly invitationId: string;
      readonly invitedEmail: string;
      readonly role: "admin" | "member" | "owner";
      readonly expiresAt: string;
    },
  ): Promise<InvitationSummary> {
    return this.mutate(
      input,
      (value) => InvitationSummarySchema.parse(value),
      async (transaction) => {
        this.authorization.requireManager(
          await this.activeMembership(transaction, input.workspaceId, input.actorUserId),
        );
      },
      async (transaction) => {
        const actor = this.authorization.requireManager(
          await this.activeMembership(transaction, input.workspaceId, input.actorUserId),
        );
        const identities = await transaction<IdentityRow[]>`
        SELECT identity_row.user_id, identity_row.verified_email
          FROM auth_identities AS identity_row
          JOIN users AS user_row ON user_row.user_id = identity_row.user_id
         WHERE identity_row.provider = 'company_email'
           AND identity_row.provider_subject = ${input.invitedEmail}
           AND user_row.status = 'active'
         LIMIT 1
      `;
        const target = identities[0];
        if (!target) throw new WorkspaceError("resource_not_found");
        const existingMemberships = await transaction<MembershipRow[]>`
        SELECT workspace_id, membership_id, user_id, role, status, version
          FROM memberships
         WHERE workspace_id = ${input.workspaceId}
           AND user_id = ${target.user_id}
         LIMIT 1
      `;
        if (existingMemberships[0]) throw new WorkspaceError("state_conflict");
        const created = createInvitation({
          workspaceId: input.workspaceId,
          invitationId: input.invitationId,
          invitedUserId: target.user_id,
          invitedEmail: target.verified_email,
          inviterUserId: input.actorUserId,
          inviterRole: actor.role,
          workspaceRole: input.role,
          projectAccess: [],
          expiresAt: input.expiresAt,
        });
        await transaction`
        INSERT INTO invitations (
          workspace_id, invitation_id, invited_user_id, invited_email, inviter_user_id, role,
          status, expires_at, version, created_at, updated_at
        ) VALUES (
          ${created.workspaceId}, ${created.invitationId}, ${created.invitedUserId},
          ${created.invitedEmail}, ${created.inviterUserId}, ${created.workspaceRole},
          ${created.status}, ${created.expiresAt}, ${created.version}, ${input.now}, ${input.now}
        )
      `;
        return {
          result: invitationSummary(created),
          event: {
            aggregateType: "Invitation",
            aggregateId: created.invitationId,
            aggregateVersion: created.version + 1,
            eventType: "invitation.created",
            payload: { invitationId: created.invitationId, role: created.workspaceRole },
          },
        };
      },
    );
  }

  async acceptInvitation(
    input: CommandContext & {
      readonly invitationId: string;
      readonly expectedVersion: number;
    },
  ): Promise<InvitationSummary> {
    return this.mutate(
      input,
      (value) => InvitationSummarySchema.parse(value),
      async (transaction) => {
        const rows = await transaction<InvitationRow[]>`
          SELECT workspace_id, invitation_id, invited_user_id, invited_email, inviter_user_id,
                 role, status, expires_at, version
            FROM invitations
           WHERE workspace_id = ${input.workspaceId}
             AND invitation_id = ${input.invitationId}
           LIMIT 1
        `;
        const current = rows[0];
        if (!current) throw new WorkspaceError("resource_not_found");
        const identities = await transaction<IdentityRow[]>`
          SELECT user_id, verified_email
            FROM auth_identities
           WHERE provider = 'company_email'
             AND user_id = ${input.actorUserId}
           LIMIT 1
        `;
        const identity = identities[0];
        if (!identity) throw new WorkspaceError("resource_not_found");
        this.authorization.requireInvitationRecipient({
          invitedUserId: current.invited_user_id,
          invitedEmail: current.invited_email,
          actorUserId: input.actorUserId,
          actorEmail: identity.verified_email,
        });
      },
      async (transaction) => {
        const rows = await transaction<InvitationRow[]>`
        SELECT workspace_id, invitation_id, invited_user_id, invited_email, inviter_user_id,
               role, status, expires_at, version
          FROM invitations
         WHERE workspace_id = ${input.workspaceId}
           AND invitation_id = ${input.invitationId}
         FOR UPDATE
      `;
        const current = rows[0];
        if (!current) throw new WorkspaceError("resource_not_found");
        const identities = await transaction<IdentityRow[]>`
        SELECT user_id, verified_email
          FROM auth_identities
         WHERE provider = 'company_email'
           AND user_id = ${input.actorUserId}
         LIMIT 1
      `;
        const identity = identities[0];
        if (!identity) throw new WorkspaceError("resource_not_found");
        const accepted = acceptInvitation(invitation(current), {
          userId: input.actorUserId,
          verifiedEmail: identity.verified_email,
          now: input.now.toISOString(),
          expectedVersion: input.expectedVersion,
        });
        await transaction`
        UPDATE invitations
           SET status = ${accepted.invitation.status},
               version = ${accepted.invitation.version},
               updated_at = ${input.now}
         WHERE workspace_id = ${input.workspaceId}
           AND invitation_id = ${input.invitationId}
      `;
        if (accepted.outcome === "accepted") {
          await transaction`
          INSERT INTO memberships (
            workspace_id, membership_id, user_id, role, status, version, created_at, updated_at
          ) VALUES (
            ${accepted.membership.workspaceId}, ${accepted.membership.membershipId},
            ${accepted.membership.userId}, ${accepted.membership.role},
            ${accepted.membership.status}, ${accepted.membership.version}, ${input.now}, ${input.now}
          )
        `;
        }
        return {
          result: invitationSummary(accepted.invitation),
          event: {
            aggregateType: "Invitation",
            aggregateId: accepted.invitation.invitationId,
            aggregateVersion: accepted.invitation.version + 1,
            eventType:
              accepted.outcome === "accepted" ? "invitation.accepted" : "invitation.expired",
            payload: {
              invitationId: accepted.invitation.invitationId,
              outcome: accepted.outcome,
            },
          },
        };
      },
    );
  }

  async revokeInvitation(
    input: CommandContext & {
      readonly invitationId: string;
      readonly expectedVersion: number;
    },
  ): Promise<InvitationSummary> {
    return this.mutate(
      input,
      (value) => InvitationSummarySchema.parse(value),
      async (transaction) => {
        this.authorization.requireManager(
          await this.activeMembership(transaction, input.workspaceId, input.actorUserId),
        );
      },
      async (transaction) => {
        const actor = this.authorization.requireManager(
          await this.activeMembership(transaction, input.workspaceId, input.actorUserId),
        );
        const rows = await transaction<InvitationRow[]>`
          SELECT workspace_id, invitation_id, invited_user_id, invited_email, inviter_user_id,
                 role, status, expires_at, version
            FROM invitations
           WHERE workspace_id = ${input.workspaceId}
             AND invitation_id = ${input.invitationId}
           FOR UPDATE
        `;
        const current = rows[0];
        if (!current) throw new WorkspaceError("resource_not_found");
        const revoked = revokeInvitation(invitation(current), {
          actorType: "human",
          revokerRole: actor.role,
          expectedVersion: input.expectedVersion,
        });
        await transaction`
          UPDATE invitations
             SET status = ${revoked.status}, version = ${revoked.version}, updated_at = ${input.now}
           WHERE workspace_id = ${input.workspaceId}
             AND invitation_id = ${input.invitationId}
        `;
        return {
          result: invitationSummary(revoked),
          event: {
            aggregateType: "Invitation",
            aggregateId: revoked.invitationId,
            aggregateVersion: revoked.version + 1,
            eventType: "invitation.revoked",
            payload: { invitationId: revoked.invitationId },
          },
        };
      },
    );
  }

  async listMembers(input: {
    readonly workspaceId: string;
    readonly actorUserId: string;
  }): Promise<readonly MembershipSummary[]> {
    return this.inTenant(input.workspaceId, input.actorUserId, async (transaction) => {
      this.authorization.requireManager(
        await this.activeMembership(transaction, input.workspaceId, input.actorUserId),
      );
      const rows = await transaction<MembershipSummaryRow[]>`
        SELECT membership_row.workspace_id, membership_row.membership_id,
               membership_row.user_id, membership_row.role, membership_row.status,
               membership_row.version, user_row.display_name
          FROM memberships AS membership_row
          JOIN users AS user_row ON user_row.user_id = membership_row.user_id
         WHERE membership_row.workspace_id = ${input.workspaceId}
           AND membership_row.status = 'active'
         ORDER BY membership_row.created_at, membership_row.membership_id
      `;
      return rows.map(membershipSummary);
    });
  }

  async changeMembershipRole(
    input: CommandContext & {
      readonly membershipId: string;
      readonly role: "admin" | "member" | "owner";
      readonly expectedVersion: number;
    },
  ): Promise<MembershipSummary> {
    return this.mutate(
      input,
      (value) => MembershipSummarySchema.parse(value),
      async (transaction) => {
        this.authorization.requireManager(
          await this.activeMembership(transaction, input.workspaceId, input.actorUserId),
        );
      },
      async (transaction) => {
        const rows = await transaction<MembershipRow[]>`
        SELECT workspace_id, membership_id, user_id, role, status, version
          FROM memberships
         WHERE workspace_id = ${input.workspaceId}
         ORDER BY membership_id
         FOR UPDATE
      `;
        const memberships = rows.map(membership);
        this.authorization.requireManager(
          memberships.find((item) => item.userId === input.actorUserId) ?? null,
        );
        const changed = changeMembershipRole(memberships, {
          actor: { actorType: "human", userId: input.actorUserId },
          targetMembershipId: input.membershipId,
          role: input.role,
          expectedVersion: input.expectedVersion,
        });
        const target = changed.find((item) => item.membershipId === input.membershipId);
        if (!target) throw new WorkspaceError("resource_not_found");
        await transaction`
        UPDATE memberships
           SET role = ${target.role}, version = ${target.version}, updated_at = ${input.now}
         WHERE workspace_id = ${input.workspaceId}
           AND membership_id = ${input.membershipId}
      `;
        const result = await this.membershipSummaryById(
          transaction,
          input.workspaceId,
          input.membershipId,
        );
        return {
          result,
          event: {
            aggregateType: "Membership",
            aggregateId: target.membershipId,
            aggregateVersion: target.version + 1,
            eventType: "membership.role.changed",
            payload: { membershipId: target.membershipId, role: target.role },
          },
        };
      },
    );
  }

  async removeMembership(
    input: CommandContext & {
      readonly membershipId: string;
      readonly expectedVersion: number;
    },
  ): Promise<MembershipSummary> {
    return this.mutate(
      input,
      (value) => MembershipSummarySchema.parse(value),
      async (transaction) => {
        this.authorization.requireManager(
          await this.activeMembership(transaction, input.workspaceId, input.actorUserId),
        );
      },
      async (transaction) => {
        const rows = await transaction<MembershipRow[]>`
        SELECT workspace_id, membership_id, user_id, role, status, version
          FROM memberships
         WHERE workspace_id = ${input.workspaceId}
         ORDER BY membership_id
         FOR UPDATE
      `;
        const memberships = rows.map(membership);
        this.authorization.requireManager(
          memberships.find((item) => item.userId === input.actorUserId) ?? null,
        );
        const changed = removeMembership(memberships, {
          actor: { actorType: "human", userId: input.actorUserId },
          targetMembershipId: input.membershipId,
          expectedVersion: input.expectedVersion,
        });
        const target = changed.find((item) => item.membershipId === input.membershipId);
        if (!target) throw new WorkspaceError("resource_not_found");
        await transaction`
        UPDATE memberships
           SET status = ${target.status}, version = ${target.version}, updated_at = ${input.now}
         WHERE workspace_id = ${input.workspaceId}
           AND membership_id = ${input.membershipId}
      `;
        const result = await this.membershipSummaryById(
          transaction,
          input.workspaceId,
          input.membershipId,
        );
        return {
          result,
          event: {
            aggregateType: "Membership",
            aggregateId: target.membershipId,
            aggregateVersion: target.version + 1,
            eventType: "membership.removed",
            payload: { membershipId: target.membershipId },
          },
        };
      },
    );
  }

  async createProject(
    input: CommandContext & {
      readonly projectId: string;
      readonly name: string;
    },
  ): Promise<ProjectSummary> {
    return this.mutate(
      input,
      (value) => ProjectSummarySchema.parse(value),
      async (transaction) => {
        this.authorization.requireManager(
          await this.activeMembership(transaction, input.workspaceId, input.actorUserId),
        );
      },
      async (transaction) => {
        const actor = this.authorization.requireManager(
          await this.activeMembership(transaction, input.workspaceId, input.actorUserId),
        );
        const created = createProject({
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          name: input.name,
          actor: { actorType: "human", userId: input.actorUserId },
          actorMembership: actor,
        });
        await transaction`
        INSERT INTO projects (
          workspace_id, project_id, name, status, version, created_at, updated_at
        ) VALUES (
          ${created.project.workspaceId}, ${created.project.projectId}, ${created.project.name},
          ${created.project.status}, ${created.project.version}, ${input.now}, ${input.now}
        )
      `;
        await transaction`
        INSERT INTO project_access (
          workspace_id, project_id, user_id, role, version, created_at, updated_at
        ) VALUES (
          ${created.creatorAccess.workspaceId}, ${created.creatorAccess.projectId},
          ${created.creatorAccess.userId}, ${created.creatorAccess.role},
          ${created.creatorAccess.version}, ${input.now}, ${input.now}
        )
      `;
        const result = ProjectSummarySchema.parse({
          projectId: created.project.projectId,
          name: created.project.name,
          status: created.project.status,
          accessRole: created.creatorAccess.role,
          version: created.project.version,
        });
        return {
          result,
          event: {
            aggregateType: "Project",
            aggregateId: created.project.projectId,
            aggregateVersion: created.project.version + 1,
            eventType: "project.created",
            payload: { projectId: created.project.projectId },
          },
        };
      },
    );
  }

  async listProjects(input: {
    readonly workspaceId: string;
    readonly actorUserId: string;
  }): Promise<readonly ProjectSummary[]> {
    return this.inTenant(input.workspaceId, input.actorUserId, async (transaction) => {
      this.authorization.requireMember(
        await this.activeMembership(transaction, input.workspaceId, input.actorUserId),
      );
      const rows = await transaction<ProjectSummaryRow[]>`
        SELECT project_row.workspace_id, project_row.project_id, project_row.name,
               project_row.status, project_row.version, access_row.role AS access_role
          FROM projects AS project_row
          JOIN project_access AS access_row
            ON access_row.workspace_id = project_row.workspace_id
           AND access_row.project_id = project_row.project_id
           AND access_row.user_id = ${input.actorUserId}
         WHERE project_row.workspace_id = ${input.workspaceId}
           AND project_row.status = 'active'
         ORDER BY project_row.created_at, project_row.project_id
      `;
      return rows.map(projectSummary);
    });
  }

  async grantProjectAccess(
    input: CommandContext & {
      readonly projectId: string;
      readonly targetUserId: string;
      readonly role: "editor" | "viewer";
      readonly expectedVersion: number | null;
    },
  ): Promise<ProjectAccessSummary> {
    return this.mutate(
      input,
      (value) => ProjectAccessSummarySchema.parse(value),
      async (transaction) => {
        this.authorization.requireManager(
          await this.activeMembership(transaction, input.workspaceId, input.actorUserId),
        );
      },
      async (transaction) => {
        const membershipRows = await transaction<MembershipRow[]>`
          SELECT workspace_id, membership_id, user_id, role, status, version
            FROM memberships
           WHERE workspace_id = ${input.workspaceId}
             AND user_id IN (${input.actorUserId}, ${input.targetUserId})
           ORDER BY membership_id
           FOR UPDATE
        `;
        const memberships = membershipRows.map(membership);
        const actor = this.authorization.requireManager(
          memberships.find((item) => item.userId === input.actorUserId) ?? null,
        );
        const target = memberships.find(
          (item) => item.userId === input.targetUserId && item.status === "active",
        );
        if (!target) throw new WorkspaceError("resource_not_found");
        const projects = await transaction<ProjectRow[]>`
          SELECT workspace_id, project_id, name, status, version
            FROM projects
           WHERE workspace_id = ${input.workspaceId}
             AND project_id = ${input.projectId}
             AND status = 'active'
           FOR UPDATE
        `;
        if (!projects[0]) throw new WorkspaceError("resource_not_found");
        const accessRows = await transaction<ProjectAccessRow[]>`
          SELECT workspace_id, project_id, user_id, role, version
            FROM project_access
           WHERE workspace_id = ${input.workspaceId}
             AND project_id = ${input.projectId}
             AND user_id = ${input.targetUserId}
           FOR UPDATE
        `;
        const existing = accessRows[0] ? projectAccess(accessRows[0]) : null;
        const granted = grantProjectAccess({
          workspaceId: input.workspaceId,
          projectId: input.projectId,
          actor: { actorType: "human", userId: input.actorUserId },
          actorMembership: actor,
          targetMembership: target,
          role: input.role,
          existingAccess: existing,
          expectedVersion: input.expectedVersion,
        });
        if (existing) {
          await transaction`
            UPDATE project_access
               SET role = ${granted.role}, version = ${granted.version}, updated_at = ${input.now}
             WHERE workspace_id = ${input.workspaceId}
               AND project_id = ${input.projectId}
               AND user_id = ${input.targetUserId}
          `;
        } else {
          await transaction`
            INSERT INTO project_access (
              workspace_id, project_id, user_id, role, version, created_at, updated_at
            ) VALUES (
              ${granted.workspaceId}, ${granted.projectId}, ${granted.userId}, ${granted.role},
              ${granted.version}, ${input.now}, ${input.now}
            )
          `;
        }
        await transaction`
          UPDATE projects
             SET version = version + 1, updated_at = ${input.now}
           WHERE workspace_id = ${input.workspaceId}
             AND project_id = ${input.projectId}
        `;
        return {
          result: projectAccessSummary(granted),
          event: {
            aggregateType: "Project",
            aggregateId: granted.projectId,
            aggregateVersion: projects[0].version + 2,
            eventType: "project.access.granted",
            payload: {
              projectId: granted.projectId,
              targetUserId: granted.userId,
              role: granted.role,
            },
          },
        };
      },
    );
  }

  private async mutate<Result extends object>(
    input: CommandContext,
    parseResult: (value: unknown) => Result,
    authorize: (transaction: TenantTransaction) => Promise<void>,
    operation: (
      transaction: TenantTransaction,
    ) => Promise<{ readonly result: Result; readonly event: MutationEvent }>,
  ): Promise<Result> {
    return this.inTenant(input.workspaceId, input.actorUserId, async (transaction) => {
      await authorize(transaction);
      await transaction`SELECT pg_advisory_xact_lock(
        hashtextextended(${`${input.workspaceId}:${input.idempotencyKey}`}, 0)
      )`;
      const receipts = await transaction<ReceiptRow[]>`
        SELECT command_type, request_hash, result
          FROM workspace_command_receipts
         WHERE workspace_id = ${input.workspaceId}
           AND idempotency_key = ${input.idempotencyKey}
           AND created_by_user_id = ${input.actorUserId}
      `;
      const receipt = receipts[0];
      if (receipt) {
        if (
          receipt.command_type !== input.commandType ||
          receipt.request_hash !== input.requestHash
        ) {
          throw new WorkspaceError("idempotency_conflict");
        }
        return parseResult(receipt.result);
      }

      const outcome = await operation(transaction);
      await this.appendMutation(transaction, input, outcome.event);
      await transaction`
        INSERT INTO workspace_command_receipts (
          workspace_id, idempotency_key, command_type, request_hash, result,
          created_by_user_id, created_at
        ) VALUES (
          ${input.workspaceId}, ${input.idempotencyKey}, ${input.commandType},
          ${input.requestHash}, ${this.sql.json(jsonValue(outcome.result))},
          ${input.actorUserId}, ${input.now}
        )
      `;
      return outcome.result;
    });
  }

  private async appendMutation(
    transaction: TenantTransaction,
    input: CommandContext,
    event: MutationEvent,
  ): Promise<void> {
    await transaction`SELECT pg_advisory_xact_lock(hashtextextended(${input.workspaceId}, 1))`;
    const cursors = await transaction<{ next_cursor: string | number }[]>`
      SELECT COALESCE(max(workspace_cursor), 0) + 1 AS next_cursor
        FROM domain_events
       WHERE workspace_id = ${input.workspaceId}
    `;
    const nextCursor = Number(cursors[0]?.next_cursor);
    if (!Number.isSafeInteger(nextCursor) || nextCursor <= 0) {
      throw new WorkspaceError("dependency_unavailable");
    }
    const eventId = randomUUID();
    await transaction`
      INSERT INTO domain_events (
        workspace_id, event_id, workspace_cursor, aggregate_type, aggregate_id,
        aggregate_version, event_type, actor_type, actor_id, initiated_by_user_id,
        correlation_id, causation_id, occurred_at, payload
      ) VALUES (
        ${input.workspaceId}, ${eventId}, ${nextCursor}, ${event.aggregateType},
        ${event.aggregateId}, ${event.aggregateVersion}, ${event.eventType}, 'human',
        ${input.actorUserId}, ${input.actorUserId}, ${input.correlationId},
        ${input.idempotencyKey}, ${input.now}, ${this.sql.json(jsonValue(event.payload))}
      )
    `;
    await transaction`
      INSERT INTO outbox_events (
        workspace_id, outbox_event_id, event_id, status, attempt_count, available_at,
        claimed_until, created_at
      ) VALUES (
        ${input.workspaceId}, ${randomUUID()}, ${eventId}, 'pending', 0,
        ${input.now}, NULL, ${input.now}
      )
    `;
    await transaction`
      INSERT INTO audit_events (
        workspace_id, audit_event_id, event_type, actor_type, actor_id,
        initiated_by_user_id, correlation_id, occurred_at, payload
      ) VALUES (
        ${input.workspaceId}, ${randomUUID()}, ${event.eventType}, 'human',
        ${input.actorUserId}, ${input.actorUserId}, ${input.correlationId}, ${input.now},
        ${this.sql.json(jsonValue(event.payload))}
      )
    `;
  }

  private async activeMembership(
    transaction: TenantTransaction,
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMembership | null> {
    const rows = await transaction<MembershipRow[]>`
      SELECT workspace_id, membership_id, user_id, role, status, version
        FROM memberships
       WHERE workspace_id = ${workspaceId}
         AND user_id = ${userId}
         AND status = 'active'
       LIMIT 1
       FOR UPDATE
    `;
    return rows[0] ? membership(rows[0]) : null;
  }

  private async membershipSummaryById(
    transaction: TenantTransaction,
    workspaceId: string,
    membershipId: string,
  ): Promise<MembershipSummary> {
    const rows = await transaction<MembershipSummaryRow[]>`
      SELECT membership_row.workspace_id, membership_row.membership_id,
             membership_row.user_id, membership_row.role, membership_row.status,
             membership_row.version, user_row.display_name
        FROM memberships AS membership_row
        JOIN users AS user_row ON user_row.user_id = membership_row.user_id
       WHERE membership_row.workspace_id = ${workspaceId}
         AND membership_row.membership_id = ${membershipId}
       LIMIT 1
    `;
    if (!rows[0]) throw new WorkspaceError("resource_not_found");
    return membershipSummary(rows[0]);
  }

  private async setTenant(
    transaction: TenantTransaction,
    workspaceId: string,
    actorUserId: string,
  ): Promise<void> {
    await transaction.unsafe("SET LOCAL ROLE sartre_app");
    await transaction`SELECT set_config('app.current_workspace_id', ${workspaceId}, true)`;
    await transaction`SELECT set_config('app.current_actor_id', ${actorUserId}, true)`;
  }

  private async inTenant<Result>(
    workspaceId: string,
    actorUserId: string,
    operation: (transaction: TenantTransaction) => Promise<Result>,
  ): Promise<Result> {
    try {
      const result: unknown = await this.sql.begin(async (transaction) => {
        await this.setTenant(transaction, workspaceId, actorUserId);
        return operation(transaction);
      });
      return result as Result;
    } catch (error) {
      throw this.translate(error);
    }
  }

  private translate(error: unknown): unknown {
    if (error instanceof WorkspaceError) return error;
    if (error instanceof DomainInvariantError) return domainError(error);
    if (["23503", "23505", "23514"].includes(postgresCode(error) ?? "")) {
      return new WorkspaceError("state_conflict");
    }
    return error;
  }
}
