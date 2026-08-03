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
  Post,
} from "@nestjs/common";
import {
  ProblemDetailsSchema,
  WorkspaceCreateCommandSchema,
  type ErrorCode,
  type ProblemDetails,
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
    error.code === "resource_not_found"
      ? "Access denied"
      : error.code === "state_conflict"
        ? "State conflict"
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

  private async run<Result>(operation: () => Promise<Result>, ids: RequestIds): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      const normalized = controlled(error);
      throw new HttpException(problem(normalized, ids), normalized.status);
    }
  }
}
