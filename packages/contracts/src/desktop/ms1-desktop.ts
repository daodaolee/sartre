import { z } from "zod";

import { ErrorCodeSchema } from "../error-catalog.js";
import { CompanyEmailLoginCommandSchema } from "../identity/human-auth.js";
import {
  InvitationSummarySchema,
  MembershipSummarySchema,
  ProjectAccessRoleSchema,
  ProjectSummarySchema,
  WorkspaceRoleSchema,
  WorkspaceSummarySchema,
} from "../workspace/access.js";

const VersionedTargetSchema = {
  expectedVersion: z.number().int().nonnegative(),
} as const;

export const DesktopAuthStateSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("signed_out") }).strict(),
  z.object({ status: z.literal("restoring") }).strict(),
  z
    .object({
      status: z.literal("authenticated"),
      userId: z.uuid(),
      sessionId: z.uuid(),
      accessExpiresAt: z.iso.datetime({ offset: true }),
    })
    .strict(),
  z
    .object({
      status: z.literal("recovery_required"),
      errorCode: ErrorCodeSchema,
    })
    .strict(),
]);

export const DesktopLoginCommandSchema = CompanyEmailLoginCommandSchema;

export const DesktopCreateWorkspaceCommandSchema = z
  .object({ name: z.string().trim().min(1).max(200) })
  .strict();

export const DesktopOpenWorkspaceCommandSchema = z.object({ workspaceId: z.uuid() }).strict();

export const DesktopInviteMemberCommandSchema = z
  .object({
    invitedEmail: z.string().trim().toLowerCase().pipe(z.email().max(320)),
    role: WorkspaceRoleSchema,
    expiresAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const DesktopAcceptInvitationCommandSchema = z
  .object({
    workspaceId: z.uuid(),
    invitationId: z.uuid(),
    ...VersionedTargetSchema,
  })
  .strict();

export const DesktopChangeMembershipRoleCommandSchema = z
  .object({
    membershipId: z.uuid(),
    role: WorkspaceRoleSchema,
    ...VersionedTargetSchema,
  })
  .strict();

export const DesktopRemoveMembershipCommandSchema = z
  .object({ membershipId: z.uuid(), ...VersionedTargetSchema })
  .strict();

export const DesktopCreateProjectCommandSchema = z
  .object({ name: z.string().trim().min(1).max(200) })
  .strict();

export const DesktopGrantProjectAccessCommandSchema = z
  .object({
    projectId: z.uuid(),
    userId: z.uuid(),
    role: ProjectAccessRoleSchema,
    expectedVersion: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const DesktopRuntimeStatusSchema = z
  .object({
    status: z.enum([
      "runtime_offline",
      "unpaired",
      "pairing",
      "active",
      "revoked",
      "incompatible",
      "recovery_required",
    ]),
    pairingAvailable: z.boolean(),
    errorCode: ErrorCodeSchema.optional(),
  })
  .strict();

export const DesktopWorkspaceViewSchema = z
  .object({
    workspace: WorkspaceSummarySchema,
    members: z.array(MembershipSummarySchema).max(1_000),
    projects: z.array(ProjectSummarySchema).max(1_000),
    capabilities: z
      .object({
        manageMembers: z.boolean(),
        manageProjects: z.boolean(),
      })
      .strict(),
    runtime: DesktopRuntimeStatusSchema,
    stale: z.boolean(),
    lastSyncedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const DesktopInvitationResultSchema = InvitationSummarySchema;

export type DesktopAuthState = z.infer<typeof DesktopAuthStateSchema>;
export type DesktopLoginCommand = z.infer<typeof DesktopLoginCommandSchema>;
export type DesktopCreateWorkspaceCommand = z.infer<typeof DesktopCreateWorkspaceCommandSchema>;
export type DesktopOpenWorkspaceCommand = z.infer<typeof DesktopOpenWorkspaceCommandSchema>;
export type DesktopInviteMemberCommand = z.infer<typeof DesktopInviteMemberCommandSchema>;
export type DesktopAcceptInvitationCommand = z.infer<typeof DesktopAcceptInvitationCommandSchema>;
export type DesktopChangeMembershipRoleCommand = z.infer<
  typeof DesktopChangeMembershipRoleCommandSchema
>;
export type DesktopRemoveMembershipCommand = z.infer<typeof DesktopRemoveMembershipCommandSchema>;
export type DesktopCreateProjectCommand = z.infer<typeof DesktopCreateProjectCommandSchema>;
export type DesktopGrantProjectAccessCommand = z.infer<
  typeof DesktopGrantProjectAccessCommandSchema
>;
export type DesktopRuntimeStatus = z.infer<typeof DesktopRuntimeStatusSchema>;
export type DesktopWorkspaceView = z.infer<typeof DesktopWorkspaceViewSchema>;
