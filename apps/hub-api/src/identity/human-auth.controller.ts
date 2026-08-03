import { randomUUID } from "node:crypto";

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  Inject,
  Post,
  Req,
} from "@nestjs/common";
import {
  CompanyEmailLoginCommandSchema,
  HumanRefreshCommandSchema,
  ProblemDetailsSchema,
  type HumanAuthSession,
  type HumanSessionInventory,
  type ProblemDetails,
} from "@sartre/contracts";
import { asHumanAuthError, HumanAuthError } from "./errors.js";
import { HumanAuthService } from "./human-auth.service.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const AUTHORIZATION_SCHEME = ["Bea", "rer"].join("");
const JWT_SHAPE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;

type AuthHttpRequest = {
  readonly ip?: string;
  readonly headers?: Readonly<Record<string, string | readonly string[] | undefined>>;
};

type RequestIds = {
  readonly requestId: string;
  readonly correlationId: string;
};

function requestIds(requestId: string | undefined, correlationId: string | undefined): RequestIds {
  return {
    requestId: requestId && UUID.test(requestId) ? requestId : randomUUID(),
    correlationId: correlationId && UUID.test(correlationId) ? correlationId : randomUUID(),
  };
}

function problem(error: HumanAuthError, ids: RequestIds): ProblemDetails {
  const message =
    error.code === "dependency_unavailable"
      ? "Dependency unavailable"
      : error.code === "rate_limited"
        ? "Too many requests"
        : error.code === "validation_failed"
          ? "Invalid request"
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

function networkKey(request: AuthHttpRequest): string {
  const ip = request.ip && request.ip.length <= 128 ? request.ip : "network-unavailable";
  const header = request.headers?.["x-sartre-client-fingerprint"];
  const fingerprint =
    typeof header === "string" && /^[A-Za-z0-9._:-]{1,128}$/u.test(header)
      ? header
      : "fingerprint-unavailable";
  return `${ip}:${fingerprint}`;
}

@Controller("v1/auth")
export class HumanAuthController {
  constructor(@Inject(HumanAuthService) private readonly auth: HumanAuthService) {}

  @Post("email/login")
  @HttpCode(200)
  async loginCompanyEmail(
    @Body() body: unknown,
    @Req() request: AuthHttpRequest,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<HumanAuthSession> {
    const ids = requestIds(requestId, correlationId);
    const command = this.parse(CompanyEmailLoginCommandSchema, body, ids);
    return this.run(
      () => this.auth.loginCompanyEmail(command, { networkKey: networkKey(request) }),
      ids,
    );
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Body() body: unknown,
    @Req() request: AuthHttpRequest,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<HumanAuthSession> {
    const ids = requestIds(requestId, correlationId);
    const command = this.parse(HumanRefreshCommandSchema, body, ids);
    return this.run(() => this.auth.refresh(command, { networkKey: networkKey(request) }), ids);
  }

  @Post("logout")
  @HttpCode(204)
  async logoutCurrent(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<void> {
    const ids = requestIds(requestId, correlationId);
    const token = this.bearer(authorization, ids);
    return this.run(() => this.auth.logoutCurrent(token), ids);
  }

  @Post("logout-all")
  @HttpCode(204)
  async logoutAll(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<void> {
    const ids = requestIds(requestId, correlationId);
    const token = this.bearer(authorization, ids);
    return this.run(() => this.auth.logoutAll(token), ids);
  }

  @Get("sessions")
  async listSessions(
    @Headers("authorization") authorization: string | undefined,
    @Headers("x-request-id") requestId?: string,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<HumanSessionInventory> {
    const ids = requestIds(requestId, correlationId);
    const token = this.bearer(authorization, ids);
    return this.run(() => this.auth.listSessions(token), ids);
  }

  private parse<Output>(
    schema: {
      safeParse: (
        value: unknown,
      ) => { readonly success: true; readonly data: Output } | { readonly success: false };
    },
    body: unknown,
    ids: RequestIds,
  ): Output {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const error = new HumanAuthError("validation_failed");
      throw new HttpException(problem(error, ids), error.status);
    }
    return parsed.data;
  }

  private bearer(authorization: string | undefined, ids: RequestIds): string {
    const segments = authorization && authorization.length <= 8_200 ? authorization.split(" ") : [];
    const scheme = segments[0];
    const token = segments[1];
    if (
      segments.length !== 2 ||
      scheme !== AUTHORIZATION_SCHEME ||
      !token ||
      !JWT_SHAPE.test(token)
    ) {
      const error = new HumanAuthError("unauthenticated");
      throw new HttpException(problem(error, ids), error.status);
    }
    return token;
  }

  private async run<Result>(operation: () => Promise<Result>, ids: RequestIds): Promise<Result> {
    try {
      return await operation();
    } catch (error) {
      const normalized = asHumanAuthError(error);
      throw new HttpException(problem(normalized, ids), normalized.status);
    }
  }
}
