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

export const InvitationAcceptCommandSchema = z
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

export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;
export type WorkspaceCreateCommand = z.infer<typeof WorkspaceCreateCommandSchema>;
export type WorkspaceSummary = z.infer<typeof WorkspaceSummarySchema>;
export type ProjectAccessRole = z.infer<typeof ProjectAccessRoleSchema>;
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;
export type InvitationAcceptCommand = z.infer<typeof InvitationAcceptCommandSchema>;
export type MembershipRoleChangeCommand = z.infer<typeof MembershipRoleChangeCommandSchema>;
