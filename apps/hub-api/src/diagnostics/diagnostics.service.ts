import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import {
  DiagnosticStageRecordSchema,
  DiagnosticTimelineSchema,
  type DiagnosticProbeRequest,
  type DiagnosticStage,
  type DiagnosticStageRecord,
  type DiagnosticTimeline,
} from "@sartre/contracts";

import { DiagnosticRecordCorruptError, DiagnosticsRepository } from "./diagnostics.repository.js";

const RETENTION_MILLISECONDS = 24 * 60 * 60 * 1_000;

export class DiagnosticTimelineNotFoundError extends Error {
  readonly code = "resource_not_found" as const;

  constructor() {
    super("resource_not_found");
    this.name = "DiagnosticTimelineNotFoundError";
  }
}

export class DiagnosticTimelineCorruptError extends Error {
  readonly code = "degraded" as const;

  constructor() {
    super("degraded");
    this.name = "DiagnosticTimelineCorruptError";
  }
}

function createRecord(options: {
  request: DiagnosticProbeRequest;
  sequence: number;
  stage: DiagnosticStage;
  status: "succeeded" | "failed";
  occurredAt: Date;
  errorCode?: "dependency_unavailable";
}): DiagnosticStageRecord {
  const recordedAt = new Date(options.occurredAt.getTime() + 1);
  return DiagnosticStageRecordSchema.parse({
    recordId: randomUUID(),
    sequence: options.sequence,
    context: {
      ...options.request.context,
      stage: options.stage,
      status: options.status,
      occurredAt: options.occurredAt.toISOString(),
      errorCode: options.errorCode ?? null,
      retryable: options.status === "failed",
    },
    recordedAt: recordedAt.toISOString(),
    retentionExpiresAt: new Date(recordedAt.getTime() + RETENTION_MILLISECONDS).toISOString(),
  });
}

function projectTimeline(
  correlationId: string,
  timelineItems: readonly DiagnosticStageRecord[],
): DiagnosticTimeline {
  const failed = timelineItems.find((item) => item.context.status === "failed");
  const lastSuccessful = timelineItems.filter((item) => item.context.status === "succeeded").at(-1);
  const parsed = DiagnosticTimelineSchema.safeParse({
    correlationId,
    timelineItems,
    lastSuccessfulStage: lastSuccessful?.context.stage ?? null,
    firstFailedStage: failed?.context.stage ?? null,
    currentState: failed ? "failed" : "completed",
    suggestedRecoveryAction: failed ? "restore_dependency_and_retry" : "none",
    evidenceRefs: [],
    correlationIds: [correlationId],
  });
  if (!parsed.success) throw new DiagnosticTimelineCorruptError();
  return parsed.data;
}

@Injectable()
export class DiagnosticsService {
  constructor(@Inject(DiagnosticsRepository) private readonly repository: DiagnosticsRepository) {}

  async probe(request: DiagnosticProbeRequest): Promise<DiagnosticTimeline> {
    const baseTime = Date.now();
    const stages: DiagnosticStageRecord[] = [
      createRecord({
        request,
        sequence: 1,
        stage: "request_received",
        status: "succeeded",
        occurredAt: new Date(baseTime),
      }),
      createRecord({
        request,
        sequence: 2,
        stage: "context_validated",
        status: "succeeded",
        occurredAt: new Date(baseTime + 2),
      }),
      createRecord({
        request,
        sequence: 3,
        stage: "dependency_check",
        status: request.dependencyOutcome === "healthy" ? "succeeded" : "failed",
        occurredAt: new Date(baseTime + 4),
        ...(request.dependencyOutcome === "unavailable"
          ? { errorCode: "dependency_unavailable" as const }
          : {}),
      }),
    ];
    if (request.dependencyOutcome === "healthy") {
      stages.push(
        createRecord({
          request,
          sequence: 4,
          stage: "probe_completed",
          status: "succeeded",
          occurredAt: new Date(baseTime + 6),
        }),
      );
    }

    await this.repository.append(stages);
    return this.read(request.context.correlationId);
  }

  async read(correlationId: string): Promise<DiagnosticTimeline> {
    let records: readonly DiagnosticStageRecord[];
    try {
      records = await this.repository.readByCorrelationId(correlationId);
    } catch (error) {
      if (error instanceof DiagnosticRecordCorruptError) {
        throw new DiagnosticTimelineCorruptError();
      }
      throw error;
    }
    if (records.length === 0) throw new DiagnosticTimelineNotFoundError();
    return projectTimeline(correlationId, records);
  }
}
