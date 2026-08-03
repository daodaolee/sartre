import { describe, expect, it } from "vitest";
import {
  ActorSchema,
  AuthIdentityRegistrationSchema,
  HumanActorSchema,
  InvitationAcceptCommandSchema,
  InvitationCreateCommandSchema,
  InvitationRevokeCommandSchema,
  InvitationSummarySchema,
  MembershipRemoveCommandSchema,
  MembershipRoleChangeCommandSchema,
  MembershipSummarySchema,
  NonDisclosingAuthorizationProblemSchema,
  ProblemDetailsSchema,
  ProjectAccessGrantCommandSchema,
  ProjectAccessRoleSchema,
  ProjectAccessSummarySchema,
  ProjectCreateCommandSchema,
  ProjectSummarySchema,
  WorkspaceCreateCommandSchema,
  WorkspaceRoleSchema,
  WorkspaceSummarySchema,
} from "./index.js";

const WORKSPACE_ID = "10000000-0000-4000-8000-000000000001";
const USER_ID = "30000000-0000-4000-8000-000000000001";
const SESSION_ID = "40000000-0000-4000-8000-000000000001";
const ENDPOINT_ID = "50000000-0000-4000-8000-000000000001";
const REQUEST_ID = "60000000-0000-4000-8000-000000000001";
const CORRELATION_ID = "70000000-0000-4000-8000-000000000001";

describe("MS1 actor contracts", () => {
  it("parses Human, Endpoint, and System actors as distinct strict shapes", () => {
    expect(
      ActorSchema.parse({
        actorType: "human",
        actorId: USER_ID,
        userId: USER_ID,
        sessionId: SESSION_ID,
        workspaceId: WORKSPACE_ID,
        initiatedByUserId: USER_ID,
      }),
    ).toMatchObject({ actorType: "human", userId: USER_ID });
    expect(
      ActorSchema.parse({
        actorType: "endpoint",
        actorId: ENDPOINT_ID,
        endpointId: ENDPOINT_ID,
        workspaceId: WORKSPACE_ID,
        initiatedByUserId: USER_ID,
      }),
    ).toMatchObject({ actorType: "endpoint", endpointId: ENDPOINT_ID });
    expect(
      ActorSchema.parse({
        actorType: "system",
        actorId: "hub-worker",
        workspaceId: null,
        initiatedByUserId: null,
      }),
    ).toMatchObject({ actorType: "system", actorId: "hub-worker" });
  });

  it("rejects actor id spoofing, missing initiatedBy chain, and cross-type fields", () => {
    expect(() =>
      HumanActorSchema.parse({
        actorType: "human",
        actorId: ENDPOINT_ID,
        userId: USER_ID,
        sessionId: SESSION_ID,
        workspaceId: WORKSPACE_ID,
        initiatedByUserId: USER_ID,
      }),
    ).toThrow();
    expect(() =>
      ActorSchema.parse({
        actorType: "endpoint",
        actorId: ENDPOINT_ID,
        endpointId: ENDPOINT_ID,
        workspaceId: WORKSPACE_ID,
      }),
    ).toThrow();
    expect(() =>
      ActorSchema.parse({
        actorType: "system",
        actorId: "hub-worker",
        workspaceId: null,
        initiatedByUserId: null,
        userId: USER_ID,
      }),
    ).toThrow();
  });
});

describe("MS1 identity and workspace contracts", () => {
  it("defines a strict client-idempotent Workspace creation command and summary", () => {
    expect(
      WorkspaceCreateCommandSchema.parse({
        workspaceId: WORKSPACE_ID,
        name: "  Product Team  ",
        idempotencyKey: REQUEST_ID,
      }),
    ).toEqual({ workspaceId: WORKSPACE_ID, name: "Product Team", idempotencyKey: REQUEST_ID });
    expect(() =>
      WorkspaceCreateCommandSchema.parse({
        workspaceId: WORKSPACE_ID,
        name: "Team",
        idempotencyKey: REQUEST_ID,
        userId: USER_ID,
      }),
    ).toThrow();
    expect(
      WorkspaceSummarySchema.parse({
        workspaceId: WORKSPACE_ID,
        name: "Product Team",
        status: "active",
        role: "owner",
        version: 0,
      }),
    ).toMatchObject({ workspaceId: WORKSPACE_ID, role: "owner" });
  });

  it("uses operator-provisioned company login identity shapes", () => {
    expect(() =>
      AuthIdentityRegistrationSchema.parse({
        provider: "feishu",
        providerSubject: "ou_123",
        providerTenantId: "tenant-approved",
      }),
    ).toThrow();
    expect(
      AuthIdentityRegistrationSchema.parse({
        provider: "company_email",
        email: "human@example.com",
        operatorProvisioned: true,
      }),
    ).toMatchObject({ provider: "company_email" });
    expect(() =>
      AuthIdentityRegistrationSchema.parse({
        provider: "company_email",
        email: "human@example.com",
        operatorProvisioned: false,
      }),
    ).toThrow();
  });

  it("keeps Workspace role and ProjectAccess role as separate controlled vocabularies", () => {
    expect(WorkspaceRoleSchema.options).toEqual(["owner", "admin", "member"]);
    expect(ProjectAccessRoleSchema.options).toEqual(["viewer", "editor"]);
    expect(() => WorkspaceRoleSchema.parse("viewer")).toThrow();
    expect(() => ProjectAccessRoleSchema.parse("owner")).toThrow();
  });

  it("does not accept caller-reported actor identity in workspace commands", () => {
    const accept = {
      invitationId: "80000000-0000-4000-8000-000000000001",
      expectedVersion: 0,
      idempotencyKey: "90000000-0000-4000-8000-000000000001",
    };
    expect(InvitationAcceptCommandSchema.parse(accept)).toEqual(accept);
    expect(() => InvitationAcceptCommandSchema.parse({ ...accept, userId: USER_ID })).toThrow();

    const change = {
      membershipId: "80000000-0000-4000-8000-000000000002",
      role: "admin",
      expectedVersion: 4,
      idempotencyKey: "90000000-0000-4000-8000-000000000002",
    };
    expect(MembershipRoleChangeCommandSchema.parse(change)).toEqual(change);
    expect(() =>
      MembershipRoleChangeCommandSchema.parse({ ...change, actorId: USER_ID }),
    ).toThrow();
  });

  it("defines a mail-free invitation and explicit membership lifecycle", () => {
    const invitationId = "80000000-0000-4000-8000-000000000003";
    const invitation = {
      invitationId,
      invitedEmail: "  MEMBER@EXAMPLE.COM  ",
      role: "member",
      expiresAt: "2026-08-10T10:00:00.000Z",
      idempotencyKey: "90000000-0000-4000-8000-000000000003",
    };
    expect(InvitationCreateCommandSchema.parse(invitation)).toEqual({
      ...invitation,
      invitedEmail: "member@example.com",
    });
    expect(() =>
      InvitationCreateCommandSchema.parse({ ...invitation, invitedUserId: USER_ID }),
    ).toThrow();
    expect(() =>
      InvitationCreateCommandSchema.parse({ ...invitation, deliveryChannel: "email" }),
    ).toThrow();
    const revoke = {
      invitationId,
      expectedVersion: 0,
      idempotencyKey: "90000000-0000-4000-8000-000000000007",
    };
    expect(InvitationRevokeCommandSchema.parse(revoke)).toEqual(revoke);
    expect(() => InvitationRevokeCommandSchema.parse({ ...revoke, notify: true })).toThrow();
    expect(
      InvitationSummarySchema.parse({
        workspaceId: WORKSPACE_ID,
        invitationId,
        invitedEmail: "member@example.com",
        role: "member",
        status: "pending",
        expiresAt: invitation.expiresAt,
        version: 0,
      }),
    ).toMatchObject({ invitationId, status: "pending" });

    const remove = {
      membershipId: "80000000-0000-4000-8000-000000000004",
      expectedVersion: 1,
      idempotencyKey: "90000000-0000-4000-8000-000000000004",
    };
    expect(MembershipRemoveCommandSchema.parse(remove)).toEqual(remove);
    expect(() => MembershipRemoveCommandSchema.parse({ ...remove, userId: USER_ID })).toThrow();
    expect(
      MembershipSummarySchema.parse({
        membershipId: remove.membershipId,
        userId: USER_ID,
        displayName: "Member",
        role: "member",
        status: "active",
        version: 1,
      }),
    ).toMatchObject({ userId: USER_ID, status: "active" });
  });

  it("requires Projects and ProjectAccess to be explicit and versioned", () => {
    const projectId = "80000000-0000-4000-8000-000000000005";
    const project = {
      projectId,
      name: "  Repair SaaS  ",
      idempotencyKey: "90000000-0000-4000-8000-000000000005",
    };
    expect(ProjectCreateCommandSchema.parse(project)).toEqual({ ...project, name: "Repair SaaS" });
    expect(() => ProjectCreateCommandSchema.parse({ ...project, ownerUserId: USER_ID })).toThrow();
    expect(
      ProjectSummarySchema.parse({
        projectId,
        name: "Repair SaaS",
        status: "active",
        accessRole: "editor",
        version: 0,
      }),
    ).toMatchObject({ projectId, accessRole: "editor" });

    const grant = {
      projectId,
      userId: USER_ID,
      role: "viewer",
      expectedVersion: null,
      idempotencyKey: "90000000-0000-4000-8000-000000000006",
    };
    expect(ProjectAccessGrantCommandSchema.parse(grant)).toEqual(grant);
    expect(() => ProjectAccessGrantCommandSchema.parse({ ...grant, actorId: USER_ID })).toThrow();
    expect(
      ProjectAccessSummarySchema.parse({
        projectId,
        userId: USER_ID,
        role: "viewer",
        version: 0,
      }),
    ).toEqual({ projectId, userId: USER_ID, role: "viewer", version: 0 });
  });
});

describe("MS1 Problem Details", () => {
  const common = {
    type: "about:blank",
    title: "Request failed",
    requestId: REQUEST_ID,
    correlationId: CORRELATION_ID,
  } as const;

  it("uses controlled error codes and rejects internal details", () => {
    expect(
      ProblemDetailsSchema.parse({
        ...common,
        status: 409,
        code: "version_conflict",
        message: "The resource version changed",
      }),
    ).toMatchObject({ code: "version_conflict", status: 409 });
    expect(() =>
      ProblemDetailsSchema.parse({
        ...common,
        status: 500,
        code: "sql_failed",
        message: "relation workspaces does not exist",
        stack: "internal",
      }),
    ).toThrow();
  });

  it("gives forbidden and not-found responses the same non-disclosing message", () => {
    for (const problem of [
      { ...common, status: 403, code: "forbidden", message: "Access denied" },
      { ...common, status: 403, code: "project_access_denied", message: "Access denied" },
      { ...common, status: 404, code: "resource_not_found", message: "Access denied" },
    ] as const) {
      expect(NonDisclosingAuthorizationProblemSchema.parse(problem).message).toBe("Access denied");
    }
    expect(() =>
      NonDisclosingAuthorizationProblemSchema.parse({
        ...common,
        status: 404,
        code: "resource_not_found",
        message: "Project exists in another Workspace",
      }),
    ).toThrow();
  });
});
