import { Inject, Injectable } from "@nestjs/common";
import {
  DIAGNOSTIC_STAGES,
  DiagnosticStageRecordSchema,
  type DiagnosticStageRecord,
} from "@sartre/contracts";
import postgres from "postgres";

import type { HubHealthConfig } from "../health/config.js";
import { HUB_HEALTH_CONFIG } from "../health/health.service.js";

const QUERY_LIMIT = DIAGNOSTIC_STAGES.length + 1;

type DiagnosticRow = {
  record_id: string;
  sequence: number;
  request_id: string;
  correlation_id: string;
  causation_id: string;
  workspace_id: string | null;
  user_id: string;
  initiated_by_user_id: string;
  actor_type: string;
  actor_id: string;
  component: string;
  operation: string;
  stage: string;
  status: string;
  resource_type: string | null;
  resource_id: string | null;
  requirement_id: string | null;
  session_id: string | null;
  execution_id: string | null;
  lease_id: string | null;
  endpoint_id: string | null;
  occurred_at: Date | string;
  error_code: string | null;
  retryable: boolean;
  recorded_at: Date | string;
  retention_expires_at: Date | string;
};

export class DiagnosticRecordCorruptError extends Error {
  readonly code = "degraded" as const;

  constructor() {
    super("degraded");
    this.name = "DiagnosticRecordCorruptError";
  }
}

function asIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toRecord(row: DiagnosticRow): DiagnosticStageRecord {
  return DiagnosticStageRecordSchema.parse({
    recordId: row.record_id,
    sequence: row.sequence,
    context: {
      requestId: row.request_id,
      correlationId: row.correlation_id,
      causationId: row.causation_id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      initiatedByUserId: row.initiated_by_user_id,
      actorType: row.actor_type,
      actorId: row.actor_id,
      component: row.component,
      operation: row.operation,
      stage: row.stage,
      status: row.status,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      requirementId: row.requirement_id,
      sessionId: row.session_id,
      executionId: row.execution_id,
      leaseId: row.lease_id,
      endpointId: row.endpoint_id,
      occurredAt: asIso(row.occurred_at),
      errorCode: row.error_code,
      retryable: row.retryable,
    },
    recordedAt: asIso(row.recorded_at),
    retentionExpiresAt: asIso(row.retention_expires_at),
  });
}

@Injectable()
export class DiagnosticsRepository {
  constructor(@Inject(HUB_HEALTH_CONFIG) private readonly config: HubHealthConfig) {}

  async append(records: readonly DiagnosticStageRecord[]): Promise<void> {
    const databaseUrl = this.requireDatabaseUrl();
    const sql = postgres(databaseUrl, {
      connect_timeout: 1,
      idle_timeout: 1,
      max: 1,
      prepare: false,
    });
    try {
      await sql.begin(async (transaction) => {
        for (const record of records) {
          const context = record.context;
          await transaction`
            INSERT INTO diagnostic_records (
              record_id, correlation_id, sequence, request_id, causation_id,
              workspace_id, user_id, initiated_by_user_id, actor_type, actor_id,
              component, operation, stage, status, resource_type, resource_id,
              requirement_id, session_id, execution_id, lease_id, endpoint_id,
              occurred_at, error_code, retryable, recorded_at, retention_expires_at
            ) VALUES (
              ${record.recordId}, ${context.correlationId}, ${record.sequence},
              ${context.requestId}, ${context.causationId}, ${context.workspaceId},
              ${context.userId}, ${context.initiatedByUserId}, ${context.actorType},
              ${context.actorId}, ${context.component}, ${context.operation},
              ${context.stage}, ${context.status}, ${context.resourceType},
              ${context.resourceId}, ${context.requirementId}, ${context.sessionId},
              ${context.executionId}, ${context.leaseId}, ${context.endpointId},
              ${context.occurredAt}, ${context.errorCode}, ${context.retryable},
              ${record.recordedAt}, ${record.retentionExpiresAt}
            )
          `;
        }
      });
    } finally {
      await sql.end({ timeout: 1 });
    }
  }

  async readByCorrelationId(correlationId: string): Promise<readonly DiagnosticStageRecord[]> {
    const databaseUrl = this.requireDatabaseUrl();
    const sql = postgres(databaseUrl, {
      connect_timeout: 1,
      idle_timeout: 1,
      max: 1,
      prepare: false,
    });
    try {
      const rows = await sql<DiagnosticRow[]>`
        SELECT record_id, correlation_id, sequence, request_id, causation_id,
               workspace_id, user_id, initiated_by_user_id, actor_type, actor_id,
               component, operation, stage, status, resource_type, resource_id,
               requirement_id, session_id, execution_id, lease_id, endpoint_id,
               occurred_at, error_code, retryable, recorded_at, retention_expires_at
          FROM diagnostic_records
         WHERE correlation_id = ${correlationId}
         ORDER BY sequence
         LIMIT ${QUERY_LIMIT}
      `;
      try {
        return rows.map(toRecord);
      } catch {
        throw new DiagnosticRecordCorruptError();
      }
    } finally {
      await sql.end({ timeout: 1 });
    }
  }

  private requireDatabaseUrl(): string {
    if (!this.config.databaseUrl) throw new Error("dependency_unavailable");
    return this.config.databaseUrl;
  }
}
