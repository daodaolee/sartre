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
export type ProjectAccessRole = z.infer<typeof ProjectAccessRoleSchema>;
export type InvitationStatus = z.infer<typeof InvitationStatusSchema>;
export type InvitationAcceptCommand = z.infer<typeof InvitationAcceptCommandSchema>;
export type MembershipRoleChangeCommand = z.infer<typeof MembershipRoleChangeCommandSchema>;
