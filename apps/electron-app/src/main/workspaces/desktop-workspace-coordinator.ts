import { randomUUID } from "node:crypto";

import {
  DesktopWorkspaceViewSchema,
  Ms1ClientError,
  type DesktopAcceptInvitationCommand,
  type DesktopChangeMembershipRoleCommand,
  type DesktopCreateProjectCommand,
  type DesktopCreateWorkspaceCommand,
  type DesktopGrantProjectAccessCommand,
  type DesktopInviteMemberCommand,
  type DesktopRemoveMembershipCommand,
  type DesktopWorkspaceView,
  type InvitationSummary,
  type Ms1Client,
  type WorkspaceSummary,
} from "@sartre/sdk";

import type { HumanSessionManager } from "../auth/human-session-manager.js";

type WorkspaceClient = Pick<
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

export class DesktopWorkspaceCoordinator {
  private current: DesktopWorkspaceView | undefined;

  constructor(
    private readonly client: WorkspaceClient,
    private readonly sessions: HumanSessionManager,
    private readonly now: () => Date = () => new Date(),
  ) {}

  getCurrent(): DesktopWorkspaceView | undefined {
    return this.current ? DesktopWorkspaceViewSchema.parse(this.current) : undefined;
  }

  async create(command: DesktopCreateWorkspaceCommand): Promise<DesktopWorkspaceView> {
    const workspace = await this.sessions.authorized((accessToken) =>
      this.client.createWorkspace(
        { workspaceId: randomUUID(), name: command.name, idempotencyKey: randomUUID() },
        accessToken,
      ),
    );
    return this.load(workspace);
  }

  async open(workspaceId: string): Promise<DesktopWorkspaceView> {
    const workspace = await this.sessions.authorized((accessToken) =>
      this.client.getWorkspace(workspaceId, accessToken),
    );
    return this.load(workspace);
  }

  async refresh(): Promise<DesktopWorkspaceView> {
    if (!this.current) throw new Ms1ClientError("resource_not_found", 404);
    try {
      return await this.open(this.current.workspace.workspaceId);
    } catch (error) {
      if (error instanceof Ms1ClientError && error.code === "dependency_unavailable") {
        this.current = DesktopWorkspaceViewSchema.parse({ ...this.current, stale: true });
        return this.current;
      }
      throw error;
    }
  }

  async invite(command: DesktopInviteMemberCommand): Promise<InvitationSummary> {
    const workspaceId = this.requireCurrent().workspace.workspaceId;
    return this.sessions.authorized((accessToken) =>
      this.client.createInvitation(
        workspaceId,
        {
          invitationId: randomUUID(),
          invitedEmail: command.invitedEmail,
          role: command.role,
          expiresAt: command.expiresAt,
          idempotencyKey: randomUUID(),
        },
        accessToken,
      ),
    );
  }

  async accept(command: DesktopAcceptInvitationCommand): Promise<DesktopWorkspaceView> {
    await this.sessions.authorized((accessToken) =>
      this.client.acceptInvitation(
        command.workspaceId,
        {
          invitationId: command.invitationId,
          expectedVersion: command.expectedVersion,
          idempotencyKey: randomUUID(),
        },
        accessToken,
      ),
    );
    return this.open(command.workspaceId);
  }

  async changeMembershipRole(
    command: DesktopChangeMembershipRoleCommand,
  ): Promise<DesktopWorkspaceView> {
    const workspaceId = this.requireCurrent().workspace.workspaceId;
    await this.sessions.authorized((accessToken) =>
      this.client.changeMembershipRole(
        workspaceId,
        { ...command, idempotencyKey: randomUUID() },
        accessToken,
      ),
    );
    return this.refresh();
  }

  async removeMembership(command: DesktopRemoveMembershipCommand): Promise<DesktopWorkspaceView> {
    const workspaceId = this.requireCurrent().workspace.workspaceId;
    await this.sessions.authorized((accessToken) =>
      this.client.removeMembership(
        workspaceId,
        { ...command, idempotencyKey: randomUUID() },
        accessToken,
      ),
    );
    return this.refresh();
  }

  async createProject(command: DesktopCreateProjectCommand): Promise<DesktopWorkspaceView> {
    const workspaceId = this.requireCurrent().workspace.workspaceId;
    await this.sessions.authorized((accessToken) =>
      this.client.createProject(
        workspaceId,
        { projectId: randomUUID(), name: command.name, idempotencyKey: randomUUID() },
        accessToken,
      ),
    );
    return this.refresh();
  }

  async grantProjectAccess(
    command: DesktopGrantProjectAccessCommand,
  ): Promise<DesktopWorkspaceView> {
    const workspaceId = this.requireCurrent().workspace.workspaceId;
    await this.sessions.authorized((accessToken) =>
      this.client.grantProjectAccess(
        workspaceId,
        { ...command, idempotencyKey: randomUUID() },
        accessToken,
      ),
    );
    return this.refresh();
  }

  clear(): void {
    this.current = undefined;
  }

  private async load(workspace: WorkspaceSummary): Promise<DesktopWorkspaceView> {
    const canManage = workspace.role === "owner" || workspace.role === "admin";
    const [members, projects] = await this.sessions.authorized((accessToken) =>
      Promise.all([
        canManage
          ? this.client.listMembers(workspace.workspaceId, accessToken)
          : Promise.resolve([]),
        this.client.listProjects(workspace.workspaceId, accessToken),
      ]),
    );
    this.current = DesktopWorkspaceViewSchema.parse({
      workspace,
      members,
      projects,
      capabilities: { manageMembers: canManage, manageProjects: canManage },
      runtime: { status: "runtime_offline", pairingAvailable: false },
      stale: false,
      lastSyncedAt: this.now().toISOString(),
    });
    return this.current;
  }

  private requireCurrent(): DesktopWorkspaceView {
    if (!this.current) throw new Ms1ClientError("resource_not_found", 404);
    return this.current;
  }
}
