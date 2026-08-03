import { describe, expect, it } from "vitest";

import {
  DesktopAuthStateSchema,
  DesktopCreateWorkspaceCommandSchema,
  DesktopRuntimeStatusSchema,
  DesktopWorkspaceViewSchema,
} from "./ms1-desktop.js";

const WORKSPACE_ID = "10000000-0000-4000-8000-000000000001";
const USER_ID = "20000000-0000-4000-8000-000000000001";
const SESSION_ID = "30000000-0000-4000-8000-000000000001";

describe("MS1 desktop boundary contracts", () => {
  it("exposes authenticated identity metadata without either token", () => {
    const state = DesktopAuthStateSchema.parse({
      status: "authenticated",
      userId: USER_ID,
      sessionId: SESSION_ID,
      accessExpiresAt: "2026-08-03T12:00:00.000Z",
    });

    expect(state.status).toBe("authenticated");
    expect(() =>
      DesktopAuthStateSchema.parse({ ...state, accessToken: "not-renderable" }),
    ).toThrow();
    expect(() =>
      DesktopAuthStateSchema.parse({ ...state, refreshToken: "not-renderable" }),
    ).toThrow();
  });

  it("keeps workspace and Runtime summaries strict and Secret-free", () => {
    const view = DesktopWorkspaceViewSchema.parse({
      workspace: {
        workspaceId: WORKSPACE_ID,
        name: "长名称工作区".repeat(8),
        status: "active",
        role: "owner",
        version: 0,
      },
      members: [],
      projects: [],
      capabilities: { manageMembers: true, manageProjects: true },
      runtime: { status: "runtime_offline", pairingAvailable: false },
      stale: false,
      lastSyncedAt: "2026-08-03T12:00:00.000Z",
    });

    expect(view.runtime.pairingAvailable).toBe(false);
    expect(() =>
      DesktopRuntimeStatusSchema.parse({
        status: "active",
        pairingAvailable: true,
        credential: "not-renderable",
      }),
    ).toThrow();
    expect(() =>
      DesktopWorkspaceViewSchema.parse({ ...view, localPath: "/private/not-renderable" }),
    ).toThrow();
  });

  it("does not accept renderer-supplied command identity", () => {
    expect(DesktopCreateWorkspaceCommandSchema.parse({ name: "核心工作区" })).toEqual({
      name: "核心工作区",
    });
    expect(() =>
      DesktopCreateWorkspaceCommandSchema.parse({
        name: "核心工作区",
        userId: USER_ID,
        idempotencyKey: "40000000-0000-4000-8000-000000000001",
      }),
    ).toThrow();
  });
});
