import { describe, expect, it, vi } from "vitest";

import { Ms1ClientError, type Ms1Client } from "@sartre/sdk";

import type { HumanSessionManager } from "../auth/human-session-manager.js";
import { DesktopWorkspaceCoordinator } from "./desktop-workspace-coordinator.js";

const WORKSPACE_ID = "10000000-0000-4000-8000-000000000001";
const TOKEN = `${"a".repeat(20)}.${"b".repeat(20)}.${"c".repeat(20)}`;

function sessions(): HumanSessionManager {
  return {
    authorized: async <Output>(operation: (token: string) => Promise<Output>) => operation(TOKEN),
  } as HumanSessionManager;
}

function client(role: "admin" | "member" | "owner" = "owner") {
  return {
    getWorkspace: vi.fn().mockResolvedValue({
      workspaceId: WORKSPACE_ID,
      name: "基础设施工作区",
      status: "active",
      role,
      version: 1,
    }),
    createWorkspace: vi.fn(),
    listMembers: vi.fn().mockResolvedValue([]),
    listProjects: vi.fn().mockResolvedValue([]),
    createInvitation: vi.fn(),
    acceptInvitation: vi.fn(),
    changeMembershipRole: vi.fn(),
    removeMembership: vi.fn(),
    createProject: vi.fn(),
    grantProjectAccess: vi.fn(),
  } as unknown as Pick<
    Ms1Client,
    | "acceptInvitation"
    | "changeMembershipRole"
    | "createInvitation"
    | "createProject"
    | "createWorkspace"
    | "getWorkspace"
    | "grantProjectAccess"
    | "listMembers"
    | "listProjects"
    | "removeMembership"
  >;
}

describe("DesktopWorkspaceCoordinator", () => {
  it("loads authoritative manager data and keeps Runtime pairing unavailable", async () => {
    const sdk = client();
    const coordinator = new DesktopWorkspaceCoordinator(
      sdk,
      sessions(),
      () => new Date("2026-08-03T12:00:00.000Z"),
    );

    await expect(coordinator.open(WORKSPACE_ID)).resolves.toMatchObject({
      workspace: { workspaceId: WORKSPACE_ID, role: "owner" },
      capabilities: { manageMembers: true, manageProjects: true },
      runtime: { status: "runtime_offline", pairingAvailable: false },
      stale: false,
    });
    expect(sdk.listMembers).toHaveBeenCalledWith(WORKSPACE_ID, TOKEN);
    expect(sdk.listProjects).toHaveBeenCalledWith(WORKSPACE_ID, TOKEN);
  });

  it("uses a forbidden placeholder for member management without probing the manager route", async () => {
    const sdk = client("member");
    const coordinator = new DesktopWorkspaceCoordinator(sdk, sessions());

    const view = await coordinator.open(WORKSPACE_ID);

    expect(view.members).toEqual([]);
    expect(view.capabilities.manageMembers).toBe(false);
    expect(sdk.listMembers).not.toHaveBeenCalled();
  });

  it("retains only the last validated view as stale during an offline refresh", async () => {
    const sdk = client();
    const coordinator = new DesktopWorkspaceCoordinator(sdk, sessions());
    await coordinator.open(WORKSPACE_ID);
    vi.mocked(sdk.getWorkspace).mockRejectedValueOnce(
      new Ms1ClientError("dependency_unavailable", 503),
    );

    await expect(coordinator.refresh()).resolves.toMatchObject({
      workspace: { workspaceId: WORKSPACE_ID },
      stale: true,
    });
  });
});
