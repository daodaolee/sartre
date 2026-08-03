import { contextBridge, ipcRenderer } from "electron";
import type {
  DesktopAcceptInvitationCommand,
  DesktopChangeMembershipRoleCommand,
  DesktopCreateProjectCommand,
  DesktopCreateWorkspaceCommand,
  DesktopGrantProjectAccessCommand,
  DesktopInviteMemberCommand,
  DesktopLoginCommand,
  DesktopOpenWorkspaceCommand,
  DesktopRemoveMembershipCommand,
} from "@sartre/sdk";

import {
  SYSTEM_HEALTH_GET_CHANNEL,
  SYSTEM_HEALTH_UPDATE_CHANNEL,
  SystemHealthResultSchema,
  type SystemHealthBridge,
  type SystemHealthResult,
} from "../shared/system-health-contract.js";
import {
  DesktopAcceptInvitationCommandSchema,
  DesktopAuthResultSchema,
  DesktopChangeMembershipRoleCommandSchema,
  DesktopCreateProjectCommandSchema,
  DesktopCreateWorkspaceCommandSchema,
  DesktopGrantProjectAccessCommandSchema,
  DesktopInvitationResultResultSchema,
  DesktopInviteMemberCommandSchema,
  DesktopLoginCommandSchema,
  DesktopOpenWorkspaceCommandSchema,
  DesktopOptionalWorkspaceResultSchema,
  DesktopRemoveMembershipCommandSchema,
  DesktopWorkspaceResultSchema,
  MS1_AUTH_GET_CHANNEL,
  MS1_AUTH_LOGIN_CHANNEL,
  MS1_AUTH_LOGOUT_CHANNEL,
  MS1_AUTH_RECOVER_CHANNEL,
  MS1_AUTH_UPDATE_CHANNEL,
  MS1_WORKSPACE_ACCEPT_INVITATION_CHANNEL,
  MS1_WORKSPACE_CHANGE_ROLE_CHANNEL,
  MS1_WORKSPACE_CREATE_CHANNEL,
  MS1_WORKSPACE_CREATE_PROJECT_CHANNEL,
  MS1_WORKSPACE_CURRENT_CHANNEL,
  MS1_WORKSPACE_GRANT_PROJECT_ACCESS_CHANNEL,
  MS1_WORKSPACE_INVITE_CHANNEL,
  MS1_WORKSPACE_OPEN_CHANNEL,
  MS1_WORKSPACE_REFRESH_CHANNEL,
  MS1_WORKSPACE_REMOVE_MEMBER_CHANNEL,
  type SartreDesktopBridge,
} from "../shared/ms1-desktop-contract.js";

const systemHealth: SystemHealthBridge = Object.freeze({
  getSnapshot: async () =>
    SystemHealthResultSchema.parse(await ipcRenderer.invoke(SYSTEM_HEALTH_GET_CHANNEL)),
  subscribe: (listener: (result: SystemHealthResult) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: unknown): void => {
      listener(SystemHealthResultSchema.parse(value));
    };
    ipcRenderer.on(SYSTEM_HEALTH_UPDATE_CHANNEL, handler);
    return () => ipcRenderer.removeListener(SYSTEM_HEALTH_UPDATE_CHANNEL, handler);
  },
});

const sartre: SartreDesktopBridge = Object.freeze({
  auth: Object.freeze({
    getState: async () =>
      DesktopAuthResultSchema.parse(await ipcRenderer.invoke(MS1_AUTH_GET_CHANNEL)),
    login: async (command: DesktopLoginCommand) =>
      DesktopAuthResultSchema.parse(
        await ipcRenderer.invoke(MS1_AUTH_LOGIN_CHANNEL, DesktopLoginCommandSchema.parse(command)),
      ),
    logout: async () =>
      DesktopAuthResultSchema.parse(await ipcRenderer.invoke(MS1_AUTH_LOGOUT_CHANNEL)),
    recover: async () =>
      DesktopAuthResultSchema.parse(await ipcRenderer.invoke(MS1_AUTH_RECOVER_CHANNEL)),
    subscribe: (listener: Parameters<SartreDesktopBridge["auth"]["subscribe"]>[0]) => {
      const handler = (_event: Electron.IpcRendererEvent, value: unknown): void => {
        listener(DesktopAuthResultSchema.parse(value));
      };
      ipcRenderer.on(MS1_AUTH_UPDATE_CHANNEL, handler);
      return () => ipcRenderer.removeListener(MS1_AUTH_UPDATE_CHANNEL, handler);
    },
  }),
  workspaces: Object.freeze({
    current: async () =>
      DesktopOptionalWorkspaceResultSchema.parse(
        await ipcRenderer.invoke(MS1_WORKSPACE_CURRENT_CHANNEL),
      ),
    create: async (command: DesktopCreateWorkspaceCommand) =>
      DesktopWorkspaceResultSchema.parse(
        await ipcRenderer.invoke(
          MS1_WORKSPACE_CREATE_CHANNEL,
          DesktopCreateWorkspaceCommandSchema.parse(command),
        ),
      ),
    open: async (command: DesktopOpenWorkspaceCommand) =>
      DesktopWorkspaceResultSchema.parse(
        await ipcRenderer.invoke(
          MS1_WORKSPACE_OPEN_CHANNEL,
          DesktopOpenWorkspaceCommandSchema.parse(command),
        ),
      ),
    refresh: async () =>
      DesktopWorkspaceResultSchema.parse(await ipcRenderer.invoke(MS1_WORKSPACE_REFRESH_CHANNEL)),
    invite: async (command: DesktopInviteMemberCommand) =>
      DesktopInvitationResultResultSchema.parse(
        await ipcRenderer.invoke(
          MS1_WORKSPACE_INVITE_CHANNEL,
          DesktopInviteMemberCommandSchema.parse(command),
        ),
      ),
    acceptInvitation: async (command: DesktopAcceptInvitationCommand) =>
      DesktopWorkspaceResultSchema.parse(
        await ipcRenderer.invoke(
          MS1_WORKSPACE_ACCEPT_INVITATION_CHANNEL,
          DesktopAcceptInvitationCommandSchema.parse(command),
        ),
      ),
    changeMembershipRole: async (command: DesktopChangeMembershipRoleCommand) =>
      DesktopWorkspaceResultSchema.parse(
        await ipcRenderer.invoke(
          MS1_WORKSPACE_CHANGE_ROLE_CHANNEL,
          DesktopChangeMembershipRoleCommandSchema.parse(command),
        ),
      ),
    removeMembership: async (command: DesktopRemoveMembershipCommand) =>
      DesktopWorkspaceResultSchema.parse(
        await ipcRenderer.invoke(
          MS1_WORKSPACE_REMOVE_MEMBER_CHANNEL,
          DesktopRemoveMembershipCommandSchema.parse(command),
        ),
      ),
    createProject: async (command: DesktopCreateProjectCommand) =>
      DesktopWorkspaceResultSchema.parse(
        await ipcRenderer.invoke(
          MS1_WORKSPACE_CREATE_PROJECT_CHANNEL,
          DesktopCreateProjectCommandSchema.parse(command),
        ),
      ),
    grantProjectAccess: async (command: DesktopGrantProjectAccessCommand) =>
      DesktopWorkspaceResultSchema.parse(
        await ipcRenderer.invoke(
          MS1_WORKSPACE_GRANT_PROJECT_ACCESS_CHANNEL,
          DesktopGrantProjectAccessCommandSchema.parse(command),
        ),
      ),
  }),
});

contextBridge.exposeInMainWorld("systemHealth", systemHealth);
contextBridge.exposeInMainWorld("sartre", sartre);
