import { Ms1ClientError, type ErrorCode, type Result } from "@sartre/sdk";

import type { HumanSessionManager } from "../auth/human-session-manager.js";
import type { DesktopWorkspaceCoordinator } from "../workspaces/desktop-workspace-coordinator.js";
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
} from "../../shared/ms1-desktop-contract.js";

type Parser<Output> = { readonly parse: (value: unknown) => Output };
type IpcHandler = (event: unknown, value?: unknown) => Promise<unknown> | unknown;

export interface IpcHandlerRegistry {
  handle(channel: string, listener: IpcHandler): void;
  removeHandler(channel: string): void;
}

const CHANNELS = [
  MS1_AUTH_GET_CHANNEL,
  MS1_AUTH_LOGIN_CHANNEL,
  MS1_AUTH_LOGOUT_CHANNEL,
  MS1_AUTH_RECOVER_CHANNEL,
  MS1_WORKSPACE_CURRENT_CHANNEL,
  MS1_WORKSPACE_CREATE_CHANNEL,
  MS1_WORKSPACE_OPEN_CHANNEL,
  MS1_WORKSPACE_REFRESH_CHANNEL,
  MS1_WORKSPACE_INVITE_CHANNEL,
  MS1_WORKSPACE_ACCEPT_INVITATION_CHANNEL,
  MS1_WORKSPACE_CHANGE_ROLE_CHANNEL,
  MS1_WORKSPACE_REMOVE_MEMBER_CHANNEL,
  MS1_WORKSPACE_CREATE_PROJECT_CHANNEL,
  MS1_WORKSPACE_GRANT_PROJECT_ACCESS_CHANNEL,
] as const;

function controlledError(error: unknown): { readonly code: ErrorCode; readonly message: string } {
  const code = error instanceof Ms1ClientError ? error.code : "validation_failed";
  const message =
    code === "unauthenticated"
      ? "会话已失效，请重新登录"
      : code === "forbidden" || code === "resource_not_found" || code === "project_access_denied"
        ? "没有权限访问该资源"
        : code === "dependency_unavailable" || code === "degraded"
          ? "服务暂时不可用，请稍后重试"
          : code === "version_conflict" || code === "state_conflict"
            ? "数据已发生变化，请刷新后重试"
            : "请求格式无效";
  return { code, message };
}

async function result<Output>(
  parser: Parser<Result<Output>>,
  operation: () => Promise<Output> | Output,
): Promise<Result<Output>> {
  try {
    return parser.parse({ success: true, data: await operation() });
  } catch (error) {
    return parser.parse({ success: false, error: controlledError(error) });
  }
}

export function registerMs1DesktopHandlers(input: {
  readonly ipc: IpcHandlerRegistry;
  readonly sessions: HumanSessionManager;
  readonly workspaces: DesktopWorkspaceCoordinator;
}): () => void {
  const { ipc, sessions, workspaces } = input;
  ipc.handle(MS1_AUTH_GET_CHANNEL, () =>
    result(DesktopAuthResultSchema, () => sessions.getState()),
  );
  ipc.handle(MS1_AUTH_LOGIN_CHANNEL, (_event, value) =>
    result(DesktopAuthResultSchema, () => sessions.login(DesktopLoginCommandSchema.parse(value))),
  );
  ipc.handle(MS1_AUTH_LOGOUT_CHANNEL, () =>
    result(DesktopAuthResultSchema, async () => {
      workspaces.clear();
      return sessions.logout();
    }),
  );
  ipc.handle(MS1_AUTH_RECOVER_CHANNEL, () =>
    result(DesktopAuthResultSchema, async () => {
      workspaces.clear();
      return sessions.recover();
    }),
  );
  ipc.handle(MS1_WORKSPACE_CURRENT_CHANNEL, () =>
    result(DesktopOptionalWorkspaceResultSchema, () => workspaces.getCurrent() ?? null),
  );
  ipc.handle(MS1_WORKSPACE_CREATE_CHANNEL, (_event, value) =>
    result(DesktopWorkspaceResultSchema, () =>
      workspaces.create(DesktopCreateWorkspaceCommandSchema.parse(value)),
    ),
  );
  ipc.handle(MS1_WORKSPACE_OPEN_CHANNEL, (_event, value) =>
    result(DesktopWorkspaceResultSchema, () => {
      const command = DesktopOpenWorkspaceCommandSchema.parse(value);
      return workspaces.open(command.workspaceId);
    }),
  );
  ipc.handle(MS1_WORKSPACE_REFRESH_CHANNEL, () =>
    result(DesktopWorkspaceResultSchema, () => workspaces.refresh()),
  );
  ipc.handle(MS1_WORKSPACE_INVITE_CHANNEL, (_event, value) =>
    result(DesktopInvitationResultResultSchema, () =>
      workspaces.invite(DesktopInviteMemberCommandSchema.parse(value)),
    ),
  );
  ipc.handle(MS1_WORKSPACE_ACCEPT_INVITATION_CHANNEL, (_event, value) =>
    result(DesktopWorkspaceResultSchema, () =>
      workspaces.accept(DesktopAcceptInvitationCommandSchema.parse(value)),
    ),
  );
  ipc.handle(MS1_WORKSPACE_CHANGE_ROLE_CHANNEL, (_event, value) =>
    result(DesktopWorkspaceResultSchema, () =>
      workspaces.changeMembershipRole(DesktopChangeMembershipRoleCommandSchema.parse(value)),
    ),
  );
  ipc.handle(MS1_WORKSPACE_REMOVE_MEMBER_CHANNEL, (_event, value) =>
    result(DesktopWorkspaceResultSchema, () =>
      workspaces.removeMembership(DesktopRemoveMembershipCommandSchema.parse(value)),
    ),
  );
  ipc.handle(MS1_WORKSPACE_CREATE_PROJECT_CHANNEL, (_event, value) =>
    result(DesktopWorkspaceResultSchema, () =>
      workspaces.createProject(DesktopCreateProjectCommandSchema.parse(value)),
    ),
  );
  ipc.handle(MS1_WORKSPACE_GRANT_PROJECT_ACCESS_CHANNEL, (_event, value) =>
    result(DesktopWorkspaceResultSchema, () =>
      workspaces.grantProjectAccess(DesktopGrantProjectAccessCommandSchema.parse(value)),
    ),
  );

  return () => {
    for (const channel of CHANNELS) ipc.removeHandler(channel);
  };
}
