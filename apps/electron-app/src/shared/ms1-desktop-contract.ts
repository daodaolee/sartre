import {
  DesktopAcceptInvitationCommandSchema,
  DesktopAuthStateSchema,
  DesktopChangeMembershipRoleCommandSchema,
  DesktopCreateProjectCommandSchema,
  DesktopCreateWorkspaceCommandSchema,
  DesktopGrantProjectAccessCommandSchema,
  DesktopInvitationResultSchema,
  DesktopInviteMemberCommandSchema,
  DesktopLoginCommandSchema,
  DesktopOpenWorkspaceCommandSchema,
  DesktopRemoveMembershipCommandSchema,
  DesktopWorkspaceViewSchema,
  createResultSchema,
  type DesktopAcceptInvitationCommand,
  type DesktopAuthState,
  type DesktopChangeMembershipRoleCommand,
  type DesktopCreateProjectCommand,
  type DesktopCreateWorkspaceCommand,
  type DesktopGrantProjectAccessCommand,
  type DesktopInviteMemberCommand,
  type DesktopLoginCommand,
  type DesktopOpenWorkspaceCommand,
  type DesktopRemoveMembershipCommand,
  type DesktopWorkspaceView,
  type InvitationSummary,
  type Result,
} from "@sartre/sdk";

export const MS1_AUTH_GET_CHANNEL = "ms1:auth:get";
export const MS1_AUTH_LOGIN_CHANNEL = "ms1:auth:login";
export const MS1_AUTH_LOGOUT_CHANNEL = "ms1:auth:logout";
export const MS1_AUTH_RECOVER_CHANNEL = "ms1:auth:recover";
export const MS1_AUTH_UPDATE_CHANNEL = "ms1:auth:update";

export const MS1_WORKSPACE_CURRENT_CHANNEL = "ms1:workspace:current";
export const MS1_WORKSPACE_CREATE_CHANNEL = "ms1:workspace:create";
export const MS1_WORKSPACE_OPEN_CHANNEL = "ms1:workspace:open";
export const MS1_WORKSPACE_REFRESH_CHANNEL = "ms1:workspace:refresh";
export const MS1_WORKSPACE_INVITE_CHANNEL = "ms1:workspace:invite";
export const MS1_WORKSPACE_ACCEPT_INVITATION_CHANNEL = "ms1:workspace:accept-invitation";
export const MS1_WORKSPACE_CHANGE_ROLE_CHANNEL = "ms1:workspace:change-role";
export const MS1_WORKSPACE_REMOVE_MEMBER_CHANNEL = "ms1:workspace:remove-member";
export const MS1_WORKSPACE_CREATE_PROJECT_CHANNEL = "ms1:workspace:create-project";
export const MS1_WORKSPACE_GRANT_PROJECT_ACCESS_CHANNEL = "ms1:workspace:grant-project-access";

export const DesktopAuthResultSchema = createResultSchema(DesktopAuthStateSchema);
export const DesktopWorkspaceResultSchema = createResultSchema(DesktopWorkspaceViewSchema);
export const DesktopOptionalWorkspaceResultSchema = createResultSchema(
  DesktopWorkspaceViewSchema.nullable(),
);
export const DesktopInvitationResultResultSchema = createResultSchema(
  DesktopInvitationResultSchema,
);

export {
  DesktopAcceptInvitationCommandSchema,
  DesktopChangeMembershipRoleCommandSchema,
  DesktopCreateProjectCommandSchema,
  DesktopCreateWorkspaceCommandSchema,
  DesktopGrantProjectAccessCommandSchema,
  DesktopInviteMemberCommandSchema,
  DesktopLoginCommandSchema,
  DesktopOpenWorkspaceCommandSchema,
  DesktopRemoveMembershipCommandSchema,
};

export type DesktopAuthResult = Result<DesktopAuthState>;
export type DesktopWorkspaceResult = Result<DesktopWorkspaceView>;
export type DesktopOptionalWorkspaceResult = Result<DesktopWorkspaceView | null>;
export type DesktopInvitationResult = Result<InvitationSummary>;

export type {
  DesktopAcceptInvitationCommand,
  DesktopAuthState,
  DesktopChangeMembershipRoleCommand,
  DesktopCreateProjectCommand,
  DesktopCreateWorkspaceCommand,
  DesktopGrantProjectAccessCommand,
  DesktopInviteMemberCommand,
  DesktopLoginCommand,
  DesktopOpenWorkspaceCommand,
  DesktopRemoveMembershipCommand,
  DesktopWorkspaceView,
};

export interface DesktopAuthBridge {
  getState(): Promise<DesktopAuthResult>;
  login(command: DesktopLoginCommand): Promise<DesktopAuthResult>;
  logout(): Promise<DesktopAuthResult>;
  recover(): Promise<DesktopAuthResult>;
  subscribe(listener: (result: DesktopAuthResult) => void): () => void;
}

export interface DesktopWorkspaceBridge {
  current(): Promise<DesktopOptionalWorkspaceResult>;
  create(command: DesktopCreateWorkspaceCommand): Promise<DesktopWorkspaceResult>;
  open(command: DesktopOpenWorkspaceCommand): Promise<DesktopWorkspaceResult>;
  refresh(): Promise<DesktopWorkspaceResult>;
  invite(command: DesktopInviteMemberCommand): Promise<DesktopInvitationResult>;
  acceptInvitation(command: DesktopAcceptInvitationCommand): Promise<DesktopWorkspaceResult>;
  changeMembershipRole(
    command: DesktopChangeMembershipRoleCommand,
  ): Promise<DesktopWorkspaceResult>;
  removeMembership(command: DesktopRemoveMembershipCommand): Promise<DesktopWorkspaceResult>;
  createProject(command: DesktopCreateProjectCommand): Promise<DesktopWorkspaceResult>;
  grantProjectAccess(command: DesktopGrantProjectAccessCommand): Promise<DesktopWorkspaceResult>;
}

export interface SartreDesktopBridge {
  readonly auth: DesktopAuthBridge;
  readonly workspaces: DesktopWorkspaceBridge;
}
