import { describe, expect, it } from "vitest";
import { DomainInvariantError } from "./errors.js";
import { createAuthIdentity } from "./identity/auth-identity.js";
import {
  createRefreshTokenFamily,
  revokeRefreshTokenFamily,
  rotateRefreshTokenFamily,
} from "./identity/refresh-token-family.js";
import { acceptInvitation, createInvitation } from "./workspace/invitation.js";
import {
  changeMembershipRole,
  removeMembership,
  type WorkspaceMembership,
} from "./workspace/membership.js";
import { resolveProjectPermission } from "./workspace/project-access.js";

const WORKSPACE_ID = "10000000-0000-4000-8000-000000000001";
const PROJECT_ID = "20000000-0000-4000-8000-000000000001";
const OWNER_1 = "30000000-0000-4000-8000-000000000001";
const OWNER_2 = "30000000-0000-4000-8000-000000000002";
const MEMBER_ID = "30000000-0000-4000-8000-000000000003";
const SESSION_ID = "40000000-0000-4000-8000-000000000001";
const TOKEN_1 = "1".repeat(64);
const TOKEN_2 = "2".repeat(64);
const TOKEN_3 = "3".repeat(64);

function expectDomainError(action: () => unknown, code: DomainInvariantError["code"]): void {
  try {
    action();
    throw new Error("expected_domain_error");
  } catch (error) {
    expect(error).toBeInstanceOf(DomainInvariantError);
    expect((error as DomainInvariantError).code).toBe(code);
  }
}

describe("AuthIdentity invariants", () => {
  const policy = {
    approvedEmailDomains: ["example.com"],
  } as const;

  it("requires operator provisioning of an approved company login identifier", () => {
    const identity = createAuthIdentity(
      {
        identityId: "identity-1",
        userId: OWNER_1,
        kind: "company_email",
        email: "Human@Example.COM",
        operatorProvisioned: true,
      },
      policy,
      [],
    );

    expect(identity.providerSubject).toBe("human@example.com");
    expect(identity.verifiedEmail).toBe("human@example.com");
    expectDomainError(
      () =>
        createAuthIdentity(
          {
            identityId: "identity-2",
            userId: OWNER_1,
            kind: "company_email",
            email: "human@example.com",
            operatorProvisioned: false,
          },
          policy,
          [],
        ),
      "forbidden",
    );
    expectDomainError(
      () =>
        createAuthIdentity(
          {
            identityId: "identity-3",
            userId: OWNER_1,
            kind: "company_email",
            email: "human@outside.test",
            operatorProvisioned: true,
          },
          policy,
          [],
        ),
      "forbidden",
    );
  });

  it("rejects duplicate normalized provider identities across users", () => {
    const existing = createAuthIdentity(
      {
        identityId: "identity-1",
        userId: OWNER_1,
        kind: "company_email",
        email: "human@example.com",
        operatorProvisioned: true,
      },
      policy,
      [],
    );

    expectDomainError(
      () =>
        createAuthIdentity(
          {
            identityId: "identity-2",
            userId: MEMBER_ID,
            kind: "company_email",
            email: "HUMAN@EXAMPLE.COM",
            operatorProvisioned: true,
          },
          policy,
          [existing],
        ),
      "state_conflict",
    );
  });
});

describe("Refresh Token family invariants", () => {
  function activeFamily() {
    return createRefreshTokenFamily({
      familyId: "family-1",
      userId: OWNER_1,
      sessionId: SESSION_ID,
      tokenHash: TOKEN_1,
      createdAt: "2026-07-31T00:00:00.000Z",
      absoluteExpiresAt: "2026-08-30T00:00:00.000Z",
      idleExpiresAt: "2026-08-07T00:00:00.000Z",
    });
  }

  it("rotates once, hashes only, and advances version and idle timeout", () => {
    const result = rotateRefreshTokenFamily(activeFamily(), {
      presentedTokenHash: TOKEN_1,
      replacementTokenHash: TOKEN_2,
      now: "2026-08-01T00:00:00.000Z",
      idleTimeoutMs: 7 * 24 * 60 * 60 * 1000,
      expectedVersion: 0,
    });

    expect(result.outcome).toBe("rotated");
    expect(result.family).toMatchObject({
      currentTokenHash: TOKEN_2,
      usedTokenHashes: [TOKEN_1],
      idleExpiresAt: "2026-08-08T00:00:00.000Z",
      status: "active",
      version: 1,
    });
  });

  it("revokes the whole family when an old token is reused or races", () => {
    const first = rotateRefreshTokenFamily(activeFamily(), {
      presentedTokenHash: TOKEN_1,
      replacementTokenHash: TOKEN_2,
      now: "2026-08-01T00:00:00.000Z",
      idleTimeoutMs: 7 * 24 * 60 * 60 * 1000,
      expectedVersion: 0,
    });
    const replay = rotateRefreshTokenFamily(first.family, {
      presentedTokenHash: TOKEN_1,
      replacementTokenHash: TOKEN_3,
      now: "2026-08-01T00:00:01.000Z",
      idleTimeoutMs: 7 * 24 * 60 * 60 * 1000,
      expectedVersion: 0,
    });

    expect(replay).toMatchObject({
      outcome: "replay_detected",
      family: { status: "revoked", revocationReason: "reuse_detected", version: 2 },
    });
  });

  it("expires on absolute or idle timeout and never rotates a revoked family", () => {
    const expired = rotateRefreshTokenFamily(activeFamily(), {
      presentedTokenHash: TOKEN_1,
      replacementTokenHash: TOKEN_2,
      now: "2026-08-08T00:00:00.000Z",
      idleTimeoutMs: 7 * 24 * 60 * 60 * 1000,
      expectedVersion: 0,
    });
    expect(expired).toMatchObject({
      outcome: "expired",
      family: { status: "revoked", revocationReason: "expired" },
    });

    const revoked = revokeRefreshTokenFamily(activeFamily(), "logout", 0);
    expectDomainError(
      () =>
        rotateRefreshTokenFamily(revoked, {
          presentedTokenHash: TOKEN_1,
          replacementTokenHash: TOKEN_2,
          now: "2026-08-01T00:00:00.000Z",
          idleTimeoutMs: 1,
          expectedVersion: 1,
        }),
      "unauthenticated",
    );
  });

  it("rejects a stale expectedVersion when no replay is involved", () => {
    expectDomainError(
      () =>
        rotateRefreshTokenFamily(activeFamily(), {
          presentedTokenHash: TOKEN_1,
          replacementTokenHash: TOKEN_2,
          now: "2026-08-01T00:00:00.000Z",
          idleTimeoutMs: 1,
          expectedVersion: 9,
        }),
      "version_conflict",
    );
  });
});

describe("Invitation invariants", () => {
  function pendingInvitation(overrides: Partial<Parameters<typeof createInvitation>[0]> = {}) {
    return createInvitation({
      invitationId: "invitation-1",
      workspaceId: WORKSPACE_ID,
      invitedUserId: MEMBER_ID,
      invitedEmail: "member@example.com",
      workspaceRole: "member",
      projectAccess: [{ projectId: PROJECT_ID, role: "viewer" }],
      inviterUserId: OWNER_1,
      inviterRole: "owner",
      expiresAt: "2026-08-07T00:00:00.000Z",
      ...overrides,
    });
  }

  it("enforces inviter role caps", () => {
    expectDomainError(
      () => pendingInvitation({ inviterRole: "admin", workspaceRole: "owner" }),
      "forbidden",
    );
    expectDomainError(
      () => pendingInvitation({ inviterRole: "member", workspaceRole: "member" }),
      "forbidden",
    );
    expect(pendingInvitation({ inviterRole: "admin", workspaceRole: "admin" }).status).toBe(
      "pending",
    );
  });

  it("accepts only the exact invited identity and creates explicit access", () => {
    const result = acceptInvitation(pendingInvitation(), {
      userId: MEMBER_ID,
      verifiedEmail: "MEMBER@EXAMPLE.COM",
      now: "2026-08-01T00:00:00.000Z",
      expectedVersion: 0,
    });

    expect(result.outcome).toBe("accepted");
    if (result.outcome !== "accepted") throw new Error("expected_accepted");
    expect(result.invitation).toMatchObject({ status: "accepted", version: 1 });
    expect(result.membership).toMatchObject({
      workspaceId: WORKSPACE_ID,
      userId: MEMBER_ID,
      role: "member",
    });
    expect(result.projectAccess).toEqual([
      { workspaceId: WORKSPACE_ID, projectId: PROJECT_ID, userId: MEMBER_ID, role: "viewer" },
    ]);
  });

  it("rejects a wrong identity, wrong verified email, or a second acceptance", () => {
    expectDomainError(
      () =>
        acceptInvitation(pendingInvitation(), {
          userId: OWNER_2,
          verifiedEmail: "member@example.com",
          now: "2026-08-01T00:00:00.000Z",
          expectedVersion: 0,
        }),
      "forbidden",
    );
    expectDomainError(
      () =>
        acceptInvitation(pendingInvitation(), {
          userId: MEMBER_ID,
          verifiedEmail: "other@example.com",
          now: "2026-08-01T00:00:00.000Z",
          expectedVersion: 0,
        }),
      "forbidden",
    );

    const accepted = acceptInvitation(pendingInvitation(), {
      userId: MEMBER_ID,
      verifiedEmail: "member@example.com",
      now: "2026-08-01T00:00:00.000Z",
      expectedVersion: 0,
    });
    expectDomainError(
      () =>
        acceptInvitation(accepted.invitation, {
          userId: MEMBER_ID,
          verifiedEmail: "member@example.com",
          now: "2026-08-01T00:00:01.000Z",
          expectedVersion: 1,
        }),
      "state_conflict",
    );
  });

  it("transitions an expired pending invitation without granting access", () => {
    const result = acceptInvitation(pendingInvitation(), {
      userId: MEMBER_ID,
      verifiedEmail: "member@example.com",
      now: "2026-08-07T00:00:00.000Z",
      expectedVersion: 0,
    });

    expect(result).toMatchObject({
      outcome: "expired",
      invitation: { status: "expired", version: 1 },
    });
    expect("membership" in result).toBe(false);
  });
});

describe("Membership and ProjectAccess invariants", () => {
  const memberships: readonly WorkspaceMembership[] = [
    {
      membershipId: "membership-owner-1",
      workspaceId: WORKSPACE_ID,
      userId: OWNER_1,
      role: "owner",
      status: "active",
      version: 2,
    },
    {
      membershipId: "membership-member",
      workspaceId: WORKSPACE_ID,
      userId: MEMBER_ID,
      role: "member",
      status: "active",
      version: 4,
    },
  ];

  it("cannot remove or demote the last active owner", () => {
    expectDomainError(
      () =>
        removeMembership(memberships, {
          actor: { actorType: "human", userId: OWNER_1 },
          targetMembershipId: "membership-owner-1",
          expectedVersion: 2,
        }),
      "invariant_failed",
    );
    expectDomainError(
      () =>
        changeMembershipRole(memberships, {
          actor: { actorType: "human", userId: OWNER_1 },
          targetMembershipId: "membership-owner-1",
          role: "admin",
          expectedVersion: 2,
        }),
      "invariant_failed",
    );
  });

  it("requires an authorized Human and exact expectedVersion for role changes", () => {
    const withSecondOwner: readonly WorkspaceMembership[] = [
      ...memberships,
      {
        membershipId: "membership-owner-2",
        workspaceId: WORKSPACE_ID,
        userId: OWNER_2,
        role: "owner",
        status: "active",
        version: 0,
      },
    ];

    const changed = changeMembershipRole(withSecondOwner, {
      actor: { actorType: "human", userId: OWNER_2 },
      targetMembershipId: "membership-owner-1",
      role: "admin",
      expectedVersion: 2,
    });
    expect(changed.find((item) => item.userId === OWNER_1)).toMatchObject({
      role: "admin",
      version: 3,
    });

    expectDomainError(
      () =>
        changeMembershipRole(withSecondOwner, {
          actor: { actorType: "human", userId: OWNER_2 },
          targetMembershipId: "membership-member",
          role: "admin",
          expectedVersion: 99,
        }),
      "version_conflict",
    );
    expectDomainError(
      () =>
        changeMembershipRole(withSecondOwner, {
          actor: { actorType: "endpoint", userId: OWNER_2 },
          targetMembershipId: "membership-member",
          role: "admin",
          expectedVersion: 4,
        }),
      "forbidden",
    );
  });

  it("does not infer Project access from owner or admin Workspace role", () => {
    expect(resolveProjectPermission({ workspaceRole: "owner", explicitAccess: null })).toEqual({
      canRead: false,
      canWrite: false,
    });
    expect(resolveProjectPermission({ workspaceRole: "admin", explicitAccess: null })).toEqual({
      canRead: false,
      canWrite: false,
    });
    expect(resolveProjectPermission({ workspaceRole: "member", explicitAccess: "viewer" })).toEqual(
      { canRead: true, canWrite: false },
    );
    expect(resolveProjectPermission({ workspaceRole: "member", explicitAccess: "editor" })).toEqual(
      { canRead: true, canWrite: true },
    );
  });
});
