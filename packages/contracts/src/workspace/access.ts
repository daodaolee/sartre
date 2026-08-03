import { z } from "zod";

export const WorkspaceRoleSchema = z.enum(["owner", "admin", "member"]);
export const ProjectAccessRoleSchema = z.enum(["viewer", "editor"]);
export const InvitationStatusSchema = z.enum([
  "pending",
  "accepted",
  "declined",
  "revoked",
  "expired",
]);

const CommandIdentitySchema = {
  expectedVersion: z.number().int().nonnegative(),
  idempotencyKey: z.uuid(),
} as const;

const NormalizedEmailSchema = z.string().trim().toLowerCase().pipe(z.email().max(320));

export const WorkspaceCreateCommandSchema = z
  .object({
    workspaceId: z.uuid(),
    name: z.string().trim().min(1).max(200),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const WorkspaceSummarySchema = z
  .object({
    workspaceId: z.uuid(),
    name: z.string().min(1).max(200),
    status: z.literal("active"),
    role: WorkspaceRoleSchema,
    version: z.number().int().nonnegative(),
  })
  .strict();

export const InvitationCreateCommandSchema = z
  .object({
    invitationId: z.uuid(),
    invitedEmail: NormalizedEmailSchema,
    role: WorkspaceRoleSchema,
    expiresAt: z.iso.datetime({ offset: true }),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const InvitationSummarySchema = z
  .object({
    workspaceId: z.uuid(),
    invitationId: z.uuid(),
    invitedEmail: NormalizedEmailSchema,
    role: WorkspaceRoleSchema,
    status: InvitationStatusSchema,
    expiresAt: z.iso.datetime({ offset: true }),
    version: z.number().int().nonnegative(),
  })
  .strict();

export const InvitationAcceptCommandSchema = z
  .object({
    invitationId: z.uuid(),
    ...CommandIdentitySchema,
  })
  .strict();

export const InvitationRevokeCommandSchema = z
  .object({
    invitationId: z.uuid(),
    ...CommandIdentitySchema,
  })
  .strict();

export const MembershipRoleChangeCommandSchema = z
  .object({
    membershipId: z.uuid(),
    role: WorkspaceRoleSchema,
    ...CommandIdentitySchema,
  })
  .strict();

export const MembershipRemoveCommandSchema = z
  .object({
    membershipId: z.uuid(),
    ...CommandIdentitySchema,
  })
  .strict();

export const MembershipSummarySchema = z
  .object({
    membershipId: z.uuid(),
    userId: z.uuid(),
    displayName: z.string().min(1).max(200),
    role: WorkspaceRoleSchema,
    status: z.enum(["active", "removed"]),
    version: z.number().int().nonnegative(),
  })
  .strict();

export const ProjectCreateCommandSchema = z
  .object({
    projectId: z.uuid(),
    name: z.string().trim().min(1).max(200),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const ProjectSummarySchema = z
  .object({
    projectId: z.uuid(),
    name: z.string().min(1).max(200),
    status: z.literal("active"),
    accessRole: ProjectAccessRoleSchema,
    version: z.number().int().nonnegative(),
  })
  .strict();

export const ProjectAccessGrantCommandSchema = z
  .object({
    projectId: z.uuid(),
    userId: z.uuid(),
    role: ProjectAccessRoleSchema,
    expectedVersion: z.number().int().nonnegative().nullable(),
    idempotencyKey: z.uuid(),
  })
  .strict();

export const ProjectAccessSummarySchema = z
  .object({
    projectId: z.uuid(),
    userId: z.uuid(),
    role: ProjectAccessRoleSchema,
    version: z.number().int().nonnegative(),
  })
  .strict();

export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;
export type WorkspaceCreateCommand = z.infer<typeof WorkspaceCreateCommandSchema>;
export type WorkspaceSummary = z.infer<typeof WorkspaceSummarySchema>;
export type ProjectAccessRole = z.infer<typeof ProjectAccessRoleSchema>;
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;
export type InvitationAcceptCommand = z.infer<typeof InvitationAcceptCommandSchema>;
export type InvitationCreateCommand = z.infer<typeof InvitationCreateCommandSchema>;
export type InvitationRevokeCommand = z.infer<typeof InvitationRevokeCommandSchema>;
export type InvitationSummary = z.infer<typeof InvitationSummarySchema>;
export type MembershipRemoveCommand = z.infer<typeof MembershipRemoveCommandSchema>;
export type MembershipRoleChangeCommand = z.infer<typeof MembershipRoleChangeCommandSchema>;
export type MembershipSummary = z.infer<typeof MembershipSummarySchema>;
export type ProjectCreateCommand = z.infer<typeof ProjectCreateCommandSchema>;
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type ProjectAccessGrantCommand = z.infer<typeof ProjectAccessGrantCommandSchema>;
export type ProjectAccessSummary = z.infer<typeof ProjectAccessSummarySchema>;
