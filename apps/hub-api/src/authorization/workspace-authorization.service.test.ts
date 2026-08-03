import { describe, expect, it } from "vitest";

import { WorkspaceError } from "../workspaces/errors.js";
import { WorkspaceAuthorizationService } from "./workspace-authorization.service.js";

const MEMBER = {
  workspaceId: "10000000-0000-4000-8000-000000000001",
  membershipId: "20000000-0000-4000-8000-000000000001",
  userId: "30000000-0000-4000-8000-000000000001",
  role: "member",
  status: "active",
  version: 0,
} as const;

function expectCode(action: () => unknown, code: WorkspaceError["code"]): void {
  try {
    action();
    throw new Error("expected_workspace_error");
  } catch (error) {
    expect(error).toBeInstanceOf(WorkspaceError);
    expect((error as WorkspaceError).code).toBe(code);
  }
}

describe("WorkspaceAuthorizationService", () => {
  const authorization = new WorkspaceAuthorizationService();

  it("fails closed for absent membership and limits governance to owner/admin", () => {
    expectCode(() => authorization.requireMember(null), "resource_not_found");
    expectCode(() => authorization.requireManager(MEMBER), "forbidden");
    expect(authorization.requireManager({ ...MEMBER, role: "admin" }).role).toBe("admin");
  });

  it("never derives Project access from Workspace role", () => {
    expectCode(() => authorization.requireProjectAccess(null), "project_access_denied");
    expect(authorization.requireProjectAccess("viewer")).toBe("viewer");
    expect(authorization.requireProjectAccess("editor")).toBe("editor");
  });

  it("matches invitation recipient identity and normalized login identifier exactly", () => {
    expect(() =>
      authorization.requireInvitationRecipient({
        invitedUserId: MEMBER.userId,
        invitedEmail: "member@example.com",
        actorUserId: MEMBER.userId,
        actorEmail: "member@example.com",
      }),
    ).not.toThrow();
    expectCode(
      () =>
        authorization.requireInvitationRecipient({
          invitedUserId: MEMBER.userId,
          invitedEmail: "member@example.com",
          actorUserId: "30000000-0000-4000-8000-000000000002",
          actorEmail: "member@example.com",
        }),
      "forbidden",
    );
  });
});
