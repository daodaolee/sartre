import { describe, expect, it, vi } from "vitest";

import type { HumanSessionManager } from "../auth/human-session-manager.js";
import type { DesktopWorkspaceCoordinator } from "../workspaces/desktop-workspace-coordinator.js";
import {
  MS1_AUTH_GET_CHANNEL,
  MS1_AUTH_LOGIN_CHANNEL,
  MS1_WORKSPACE_CREATE_CHANNEL,
} from "../../shared/ms1-desktop-contract.js";
import { registerMs1DesktopHandlers, type IpcHandlerRegistry } from "./ms1-desktop-handlers.js";

type Handler = (event: unknown, value?: unknown) => Promise<unknown> | unknown;

function registry() {
  const handlers = new Map<string, Handler>();
  const removed: string[] = [];
  const ipc: IpcHandlerRegistry = {
    handle(channel, handler) {
      handlers.set(channel, handler);
    },
    removeHandler(channel) {
      removed.push(channel);
      handlers.delete(channel);
    },
  };
  return { ipc, handlers, removed };
}

describe("MS1 named desktop IPC handlers", () => {
  it("returns public auth state without either token", async () => {
    const boundary = registry();
    const state = {
      status: "authenticated" as const,
      userId: "10000000-0000-4000-8000-000000000001",
      sessionId: "20000000-0000-4000-8000-000000000001",
      accessExpiresAt: "2026-08-03T12:00:00.000Z",
    };
    const sessions = {
      getState: vi.fn().mockReturnValue(state),
      login: vi.fn().mockResolvedValue(state),
    } as unknown as HumanSessionManager;
    const workspaces = { clear: vi.fn() } as unknown as DesktopWorkspaceCoordinator;
    registerMs1DesktopHandlers({ ipc: boundary.ipc, sessions, workspaces });

    const result = await boundary.handlers.get(MS1_AUTH_GET_CHANNEL)?.(undefined);

    expect(result).toEqual({ success: true, data: state });
    expect(JSON.stringify(result)).not.toContain("accessToken");
    expect(JSON.stringify(result)).not.toContain("refreshToken");
  });

  it("rejects renderer-supplied actor and command identity before application code", async () => {
    const boundary = registry();
    const sessions = {
      getState: vi.fn().mockReturnValue({ status: "signed_out" }),
      login: vi.fn(),
    } as unknown as HumanSessionManager;
    const workspaces = {
      create: vi.fn(),
      clear: vi.fn(),
    } as unknown as DesktopWorkspaceCoordinator;
    registerMs1DesktopHandlers({ ipc: boundary.ipc, sessions, workspaces });

    const invalidLogin = await boundary.handlers.get(MS1_AUTH_LOGIN_CHANNEL)?.(undefined, {
      email: "owner@example.com",
      password: "A-secure-passphrase",
      userId: "10000000-0000-4000-8000-000000000001",
    });
    const invalidWorkspace = await boundary.handlers.get(MS1_WORKSPACE_CREATE_CHANNEL)?.(
      undefined,
      {
        name: "核心工作区",
        idempotencyKey: "30000000-0000-4000-8000-000000000001",
      },
    );

    expect(invalidLogin).toMatchObject({ success: false, error: { code: "validation_failed" } });
    expect(invalidWorkspace).toMatchObject({
      success: false,
      error: { code: "validation_failed" },
    });
    expect(sessions.login).not.toHaveBeenCalled();
    expect(workspaces.create).not.toHaveBeenCalled();
  });

  it("registers only a fixed allowlist and removes every handler", () => {
    const boundary = registry();
    const dispose = registerMs1DesktopHandlers({
      ipc: boundary.ipc,
      sessions: {} as HumanSessionManager,
      workspaces: {} as DesktopWorkspaceCoordinator,
    });

    expect(boundary.handlers.size).toBe(14);
    expect([...boundary.handlers.keys()].every((channel) => channel.startsWith("ms1:"))).toBe(true);
    dispose();
    expect(boundary.handlers.size).toBe(0);
    expect(boundary.removed).toHaveLength(14);
  });
});
