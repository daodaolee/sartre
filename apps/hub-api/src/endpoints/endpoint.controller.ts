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
  EndpointCredentialExchangeCommandSchema,
  EndpointCredentialRotateCommandSchema,
  EndpointPairingCompleteCommandSchema,
  EndpointPairingIntentCreateCommandSchema,
  EndpointRevokeCommandSchema,
  ProblemDetailsSchema,
  type EndpointAuthSession,
  type EndpointPairingIntentSummary,
  type EndpointPairingResult,
  type EndpointSummary,
  type ProblemDetails,
} from "@sartre/contracts";

import { HumanAuthError } from "../identity/errors.js";
import { HumanAuthService } from "../identity/human-auth.service.js";
import { asEndpointAuthError, EndpointAuthError } from "./errors.js";
import { EndpointService } from "./endpoint.service.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const JWT = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;
const AUTHORIZATION_SCHEME = ["Bea", "rer"].join("");

type RequestIds = { readonly requestId: string; readonly correlationId: string };

function requestIds(requestId?: string, correlationId?: string): RequestIds {
  return {
    requestId: requestId && UUID.test(requestId) ? requestId : randomUUID(),
    correlationId: correlationId && UUID.test(correlationId) ? correlationId : randomUUID(),
  };
}

function problem(error: EndpointAuthError, ids: RequestIds): ProblemDetails {
  const message =
    error.code === "dependency_unavailable"
      ? "Dependency unavailable"
      : error.code === "validation_failed"
        ? "Invalid request"
        : error.code === "version_conflict"
          ? "Version conflict"
          : error.code === "state_conflict" || error.code === "idempotency_conflict"
            ? "State conflict"
            : error.code === "resource_not_found" || error.code === "forbidden"
              ? "Access denied"
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

@Controller("v1")
export class EndpointController {
  constructor(
    @Inject(HumanAuthService) private readonly humanAuth: HumanAuthService,
    @Inject(EndpointService) private readonly endpoints: EndpointService,
  ) {}

  @Post("workspaces/:workspaceId/endpoint-pairing-intents")
  @HttpCode(201)
  async createPairingIntent(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<EndpointPairingIntentSummary> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuid(workspaceId, ids);
    const command = this.parse(EndpointPairingIntentCreateCommandSchema, body, ids);
    return this.run(async () => {
      const actor = await this.humanAuth.authenticate(this.bearer(authorization, ids));
      return this.endpoints.createPairingIntent(workspaceId, command, actor, ids.correlationId);
    }, ids);
  }

  @Post("endpoint-workspaces/:workspaceId/pairing/complete")
  @HttpCode(201)
  async completePairing(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<EndpointPairingResult> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuid(workspaceId, ids);
    const command = this.parse(EndpointPairingCompleteCommandSchema, body, ids);
    return this.run(
      () => this.endpoints.completePairing(workspaceId, command, ids.correlationId),
      ids,
    );
  }

  @Post("endpoint-workspaces/:workspaceId/auth/token")
  @HttpCode(200)
  async exchangeCredential(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<EndpointAuthSession> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuid(workspaceId, ids);
    const command = this.parse(EndpointCredentialExchangeCommandSchema, body, ids);
    return this.run(() => this.endpoints.exchangeCredential(workspaceId, command), ids);
  }

  @Get("endpoint-workspaces/:workspaceId/me")
  async endpointMe(
    @Param("workspaceId") workspaceId: string,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<EndpointSummary> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuid(workspaceId, ids);
    return this.run(async () => {
      return this.endpoints.status(this.bearer(authorization, ids), workspaceId);
    }, ids);
  }

  @Post("workspaces/:workspaceId/endpoints/:endpointId/rotate")
  async rotateCredential(
    @Param("workspaceId") workspaceId: string,
    @Param("endpointId") endpointId: string,
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<EndpointSummary> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuid(workspaceId, ids);
    this.requireUuid(endpointId, ids);
    const command = this.parse(EndpointCredentialRotateCommandSchema, body, ids);
    if (command.endpointId !== endpointId) throw this.invalid(ids);
    return this.run(async () => {
      const actor = await this.humanAuth.authenticate(this.bearer(authorization, ids));
      return this.endpoints.rotateCredential(workspaceId, command, actor, ids.correlationId);
    }, ids);
  }

  @Post("workspaces/:workspaceId/endpoints/:endpointId/revoke")
  async revokeEndpoint(
    @Param("workspaceId") workspaceId: string,
    @Param("endpointId") endpointId: string,
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<EndpointSummary> {
    const ids = requestIds(requestId, correlationId);
    this.requireUuid(workspaceId, ids);
    this.requireUuid(endpointId, ids);
    const command = this.parse(EndpointRevokeCommandSchema, body, ids);
    if (command.endpointId !== endpointId) throw this.invalid(ids);
    return this.run(async () => {
      const actor = await this.humanAuth.authenticate(this.bearer(authorization, ids));
      return this.endpoints.revokeEndpoint(workspaceId, command, actor, ids.correlationId);
    }, ids);
  }

  private parse<Output>(
    schema: {
      safeParse: (
        value: unknown,
      ) => { readonly success: true; readonly data: Output } | { readonly success: false };
    },
    value: unknown,
    ids: RequestIds,
  ): Output {
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw this.invalid(ids);
    return parsed.data;
  }

  private bearer(authorization: string | undefined, ids: RequestIds): string {
    const parts = authorization && authorization.length <= 8_200 ? authorization.split(" ") : [];
    if (
      parts.length !== 2 ||
      parts[0] !== AUTHORIZATION_SCHEME ||
      !parts[1] ||
      !JWT.test(parts[1])
    ) {
      const error = new EndpointAuthError("unauthenticated");
      throw new HttpException(problem(error, ids), error.status);
    }
    return parts[1];
  }

  private requireUuid(value: string, ids: RequestIds): void {
    if (!UUID.test(value)) throw this.invalid(ids);
  }

  private invalid(ids: RequestIds): HttpException {
    const error = new EndpointAuthError("validation_failed");
    return new HttpException(problem(error, ids), error.status);
  }

  private async run<Result>(operation: () => Promise<Result>, ids: RequestIds): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      const normalized =
        error instanceof HumanAuthError
          ? new EndpointAuthError(
              error.code === "dependency_unavailable" ? error.code : "unauthenticated",
            )
          : asEndpointAuthError(error);
      throw new HttpException(problem(normalized, ids), normalized.status);
    }
  }
}
