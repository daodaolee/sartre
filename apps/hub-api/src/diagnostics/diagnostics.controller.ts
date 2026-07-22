import { timingSafeEqual } from "node:crypto";

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpException,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  Post,
} from "@nestjs/common";
import { DiagnosticProbeRequestSchema, type DiagnosticTimeline } from "@sartre/contracts";

import type { HubHealthConfig } from "../health/config.js";
import { HUB_HEALTH_CONFIG } from "../health/health.service.js";
import {
  DiagnosticTimelineCorruptError,
  DiagnosticTimelineNotFoundError,
  DiagnosticsService,
} from "./diagnostics.service.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function tokenMatches(header: string | undefined, expected: string | undefined): boolean {
  if (!header || !expected) return false;
  const actual = Buffer.from(header, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}

@Controller("__ms0/self-test/diagnostics")
export class DiagnosticsController {
  constructor(
    @Inject(HUB_HEALTH_CONFIG) private readonly config: HubHealthConfig,
    @Inject(DiagnosticsService) private readonly diagnostics: DiagnosticsService,
  ) {}

  @Post("probes")
  @HttpCode(200)
  async probe(
    @Headers("x-sartre-ms0-session") sessionToken: string | undefined,
    @Body() body: unknown,
  ): Promise<DiagnosticTimeline> {
    this.requireToken(sessionToken);
    const parsed = DiagnosticProbeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new HttpException(
        { statusCode: 400, code: "validation_failed", message: "Invalid request" },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.run(() => this.diagnostics.probe(parsed.data));
  }

  @Get("correlations/:correlationId")
  async read(
    @Headers("x-sartre-ms0-session") sessionToken: string | undefined,
    @Param("correlationId") correlationId: string,
  ): Promise<DiagnosticTimeline> {
    this.requireToken(sessionToken);
    if (!UUID.test(correlationId)) {
      throw new HttpException(
        { statusCode: 400, code: "validation_failed", message: "Invalid request" },
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.run(() => this.diagnostics.read(correlationId));
  }

  private async run(operation: () => Promise<DiagnosticTimeline>): Promise<DiagnosticTimeline> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof DiagnosticTimelineNotFoundError) throw new NotFoundException();
      if (error instanceof DiagnosticTimelineCorruptError) {
        throw new HttpException(
          { statusCode: 503, code: "degraded", message: "Diagnostics degraded" },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw new HttpException(
        {
          statusCode: 503,
          code: "dependency_unavailable",
          message: "Dependency unavailable",
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private requireToken(sessionToken: string | undefined): void {
    if (!tokenMatches(sessionToken, this.config.selfTestToken)) throw new NotFoundException();
  }
}
