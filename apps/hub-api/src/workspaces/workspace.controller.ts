import { randomUUID } from "node:crypto";

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  Inject,
  Param,
  Patch,
  Post,
  Put,
} from "@nestjs/common";
import {
  type ErrorCode,
  InvitationAcceptCommandSchema,
  InvitationCreateCommandSchema,
  InvitationRevokeCommandSchema,
  type InvitationSummary,
  MembershipRemoveCommandSchema,
  MembershipRoleChangeCommandSchema,
  type MembershipSummary,
  type ProblemDetails,
  ProblemDetailsSchema,
  ProjectAccessGrantCommandSchema,
  type ProjectAccessSummary,
  ProjectCreateCommandSchema,
  type ProjectSummary,
  WorkspaceCreateCommandSchema,
  type WorkspaceSummary,
} from "@sartre/contracts";

import { HumanAuthError } from "../identity/errors.js";
import { HumanAuthService } from "../identity/human-auth.service.js";
import { WorkspaceError } from "./errors.js";
import { WorkspaceService } from "./workspace.service.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;

type RequestIds = { readonly requestId: string; readonly correlationId: string };
type ControlledError = { readonly code: ErrorCode; readonly status: number };

function requestIds(requestId?: string, correlationId?: string): RequestIds {
  return {
    requestId: requestId && UUID.test(requestId) ? requestId : randomUUID(),
    correlationId: correlationId && UUID.test(correlationId) ? correlationId : randomUUID(),
  };
}

function controlled(error: unknown): ControlledError {
  if (error instanceof HumanAuthError || error instanceof WorkspaceError) return error;
  return new WorkspaceError("dependency_unavailable");
}

function problem(error: ControlledError, ids: RequestIds): ProblemDetails {
  const message =
    error.code === "resource_not_found" ||
    error.code === "forbidden" ||
    error.code === "project_access_denied"
      ? "Access denied"
      : error.code === "state_conflict"
        ? "State conflict"
        : error.code === "version_conflict"
          ? "Version conflict"
          : error.code === "idempotency_conflict"
            ? "Idempotency conflict"
            : error.code === "validation_failed"
              ? "Invalid request"
              : error.code === "dependency_unavailable"
                ? "Dependency unavailable"
                : "Authentication failed";
  return ProblemDetailsSchema.parse({
    type: "about:blank",
    title: "Request failed",
    status: error.status,
    code: error.code,
    message,
    ...ids,
  });
}

@Controller("v1/workspaces")
export class WorkspaceController {
  constructor(
    @Inject(HumanAuthService) private readonly auth: HumanAuthService,
    @Inject(WorkspaceService) private readonly workspaces: WorkspaceService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<WorkspaceSummary> {
    const ids = requestIds(requestId, correlationId);
    const parsed = WorkspaceCreateCommandSchema.safeParse(body);
    if (!parsed.success) {
      const error = new WorkspaceError("validation_failed");
      throw new HttpException(problem(error, ids), error.status);
    }
    return this.run(async () => {
      const actor = await this.auth.authenticate(this.bearer(authorization));
      return this.workspaces.create(parsed.data, actor, ids.correlationId);
    }, ids);
  }

  @Get(":workspaceId")
  async get(
    @Param("workspaceId") workspaceId: string,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<WorkspaceSummary> {
    const ids = requestIds(requestId, correlationId);
    if (!UUID.test(workspaceId)) {
      const error = new WorkspaceError("validation_failed");
      throw new HttpException(problem(error, ids), error.status);
    }
    return this.run(async () => {
      const actor = await this.auth.authenticate(this.bearer(authorization));
      return this.workspaces.get(workspaceId, actor);
    }, ids);
  }

  @Post(":workspaceId/invitations")
  @HttpCode(201)
  async createInvitation(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<InvitationSummary> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuids([workspaceId], ids);
    const parsed = InvitationCreateCommandSchema.safeParse(body);
    if (!parsed.success) throw this.invalid(ids);
    return this.run(async () => {
      const actor = await this.auth.authenticate(this.bearer(authorization));
      return this.workspaces.createInvitation(workspaceId, parsed.data, actor, ids.correlationId);
    }, ids);
  }

  @Post(":workspaceId/invitations/:invitationId/accept")
  async acceptInvitation(
    @Param("workspaceId") workspaceId: string,
    @Param("invitationId") invitationId: string,
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<InvitationSummary> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuids([workspaceId, invitationId], ids);
    const parsed = InvitationAcceptCommandSchema.safeParse(body);
    if (!parsed.success || parsed.data.invitationId !== invitationId) throw this.invalid(ids);
    return this.run(async () => {
      const actor = await this.auth.authenticate(this.bearer(authorization));
      return this.workspaces.acceptInvitation(workspaceId, parsed.data, actor, ids.correlationId);
    }, ids);
  }

  @Post(":workspaceId/invitations/:invitationId/revoke")
  async revokeInvitation(
    @Param("workspaceId") workspaceId: string,
    @Param("invitationId") invitationId: string,
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<InvitationSummary> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuids([workspaceId, invitationId], ids);
    const parsed = InvitationRevokeCommandSchema.safeParse(body);
    if (!parsed.success || parsed.data.invitationId !== invitationId) throw this.invalid(ids);
    return this.run(async () => {
      const actor = await this.auth.authenticate(this.bearer(authorization));
      return this.workspaces.revokeInvitation(workspaceId, parsed.data, actor, ids.correlationId);
    }, ids);
  }

  @Get(":workspaceId/members")
  async listMembers(
    @Param("workspaceId") workspaceId: string,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<readonly MembershipSummary[]> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuids([workspaceId], ids);
    return this.run(async () => {
      const actor = await this.auth.authenticate(this.bearer(authorization));
      return this.workspaces.listMembers(workspaceId, actor);
    }, ids);
  }

  @Patch(":workspaceId/members/:membershipId/role")
  async changeMembershipRole(
    @Param("workspaceId") workspaceId: string,
    @Param("membershipId") membershipId: string,
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<MembershipSummary> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuids([workspaceId, membershipId], ids);
    const parsed = MembershipRoleChangeCommandSchema.safeParse(body);
    if (!parsed.success || parsed.data.membershipId !== membershipId) throw this.invalid(ids);
    return this.run(async () => {
      const actor = await this.auth.authenticate(this.bearer(authorization));
      return this.workspaces.changeMembershipRole(
        workspaceId,
        parsed.data,
        actor,
        ids.correlationId,
      );
    }, ids);
  }

  @Post(":workspaceId/members/:membershipId/remove")
  async removeMembership(
    @Param("workspaceId") workspaceId: string,
    @Param("membershipId") membershipId: string,
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<MembershipSummary> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuids([workspaceId, membershipId], ids);
    const parsed = MembershipRemoveCommandSchema.safeParse(body);
    if (!parsed.success || parsed.data.membershipId !== membershipId) throw this.invalid(ids);
    return this.run(async () => {
      const actor = await this.auth.authenticate(this.bearer(authorization));
      return this.workspaces.removeMembership(workspaceId, parsed.data, actor, ids.correlationId);
    }, ids);
  }

  @Post(":workspaceId/projects")
  @HttpCode(201)
  async createProject(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<ProjectSummary> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuids([workspaceId], ids);
    const parsed = ProjectCreateCommandSchema.safeParse(body);
    if (!parsed.success) throw this.invalid(ids);
    return this.run(async () => {
      const actor = await this.auth.authenticate(this.bearer(authorization));
      return this.workspaces.createProject(workspaceId, parsed.data, actor, ids.correlationId);
    }, ids);
  }

  @Get(":workspaceId/projects")
  async listProjects(
    @Param("workspaceId") workspaceId: string,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<readonly ProjectSummary[]> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuids([workspaceId], ids);
    return this.run(async () => {
      const actor = await this.auth.authenticate(this.bearer(authorization));
      return this.workspaces.listProjects(workspaceId, actor);
    }, ids);
  }

  @Put(":workspaceId/projects/:projectId/access/:userId")
  async grantProjectAccess(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Param("userId") userId: string,
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<ProjectAccessSummary> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuids([workspaceId, projectId, userId], ids);
    const parsed = ProjectAccessGrantCommandSchema.safeParse(body);
    if (!parsed.success || parsed.data.projectId !== projectId || parsed.data.userId !== userId) {
      throw this.invalid(ids);
    }
    return this.run(async () => {
      const actor = await this.auth.authenticate(this.bearer(authorization));
      return this.workspaces.grantProjectAccess(workspaceId, parsed.data, actor, ids.correlationId);
    }, ids);
  }

  private bearer(authorization: string | undefined): string {
    const segments = authorization && authorization.length <= 8_200 ? authorization.split(" ") : [];
    if (
      segments.length !== 2 ||
      segments[0] !== "Bearer" ||
      !segments[1] ||
      !JWT.test(segments[1])
    ) {
      throw new HumanAuthError("unauthenticated");
    }
    return segments[1];
  }

  private requireUuids(values: readonly string[], ids: RequestIds): void {
    if (values.some((value) => !UUID.test(value))) throw this.invalid(ids);
  }

  private invalid(ids: RequestIds): HttpException {
    const error = new WorkspaceError("validation_failed");
    return new HttpException(problem(error, ids), error.status);
  }

  private async run<Result>(operation: () => Promise<Result>, ids: RequestIds): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      const normalized = controlled(error);
      throw new HttpException(problem(normalized, ids), normalized.status);
    }
  }
}
