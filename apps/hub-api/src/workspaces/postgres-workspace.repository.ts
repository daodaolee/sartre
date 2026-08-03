import postgres from "postgres";

import { WorkspaceSummarySchema, type WorkspaceSummary } from "@sartre/contracts";

import { WorkspaceError } from "./errors.js";

type ReceiptRow = {
  request_hash: string;
  result: unknown;
};

type WorkspaceRow = {
  workspace_id: string;
  name: string;
  status: "active";
  role: "admin" | "member" | "owner";
  version: number;
};

function postgresCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

function summary(row: WorkspaceRow): WorkspaceSummary {
  return WorkspaceSummarySchema.parse({
    workspaceId: row.workspace_id,
    name: row.name,
    status: row.status,
    role: row.role,
    version: row.version,
  });
}

export class PostgresWorkspaceRepository {
  private readonly sql;

  constructor(connectionString: string) {
    this.sql = postgres(connectionString, {
      connect_timeout: 3,
      idle_timeout: 5,
      max: 10,
      prepare: false,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.sql.end({ timeout: 3 });
  }

  async createWorkspace(input: {
    readonly workspaceId: string;
    readonly name: string;
    readonly ownerUserId: string;
    readonly ownerMembershipId: string;
    readonly idempotencyKey: string;
    readonly requestHash: string;
    readonly eventId: string;
    readonly outboxEventId: string;
    readonly auditEventId: string;
    readonly correlationId: string;
    readonly now: Date;
  }): Promise<WorkspaceSummary> {
    try {
      return await this.sql.begin(async (transaction) => {
        await transaction.unsafe("SET LOCAL ROLE sartre_app");
        await transaction`SELECT set_config('app.current_workspace_id', ${input.workspaceId}, true)`;
        await transaction`SELECT set_config('app.current_actor_id', ${input.ownerUserId}, true)`;
        await transaction`SELECT pg_advisory_xact_lock(
          hashtextextended(${`${input.workspaceId}:${input.idempotencyKey}`}, 0)
        )`;

        const receipts = await transaction<ReceiptRow[]>`
          SELECT request_hash, result
            FROM workspace_command_receipts
           WHERE workspace_id = ${input.workspaceId}
             AND idempotency_key = ${input.idempotencyKey}
             AND created_by_user_id = ${input.ownerUserId}
        `;
        const receipt = receipts[0];
        if (receipt) {
          if (receipt.request_hash !== input.requestHash)
            throw new WorkspaceError("state_conflict");
          return WorkspaceSummarySchema.parse(receipt.result);
        }

        await transaction`
          INSERT INTO workspaces (workspace_id, name, status, version, created_at, updated_at)
          VALUES (${input.workspaceId}, ${input.name}, 'active', 0, ${input.now}, ${input.now})
        `;
        await transaction`
          INSERT INTO memberships (
            workspace_id, membership_id, user_id, role, status, version, created_at, updated_at
          ) VALUES (
            ${input.workspaceId}, ${input.ownerMembershipId}, ${input.ownerUserId}, 'owner',
            'active', 0, ${input.now}, ${input.now}
          )
        `;
        const result = WorkspaceSummarySchema.parse({
          workspaceId: input.workspaceId,
          name: input.name,
          status: "active",
          role: "owner",
          version: 0,
        });
        await transaction`
          INSERT INTO domain_events (
            workspace_id, event_id, workspace_cursor, aggregate_type, aggregate_id,
            aggregate_version, event_type, actor_type, actor_id, initiated_by_user_id,
            correlation_id, causation_id, occurred_at, payload
          ) VALUES (
            ${input.workspaceId}, ${input.eventId}, 1, 'Workspace', ${input.workspaceId}, 1,
            'workspace.created', 'human', ${input.ownerUserId}, ${input.ownerUserId},
            ${input.correlationId}, ${input.idempotencyKey}, ${input.now},
            ${this.sql.json({ name: input.name })}
          )
        `;
        await transaction`
          INSERT INTO outbox_events (
            workspace_id, outbox_event_id, event_id, status, attempt_count, available_at,
            claimed_until, created_at
          ) VALUES (
            ${input.workspaceId}, ${input.outboxEventId}, ${input.eventId}, 'pending', 0,
            ${input.now}, NULL, ${input.now}
          )
        `;
        await transaction`
          INSERT INTO audit_events (
            workspace_id, audit_event_id, event_type, actor_type, actor_id,
            initiated_by_user_id, correlation_id, occurred_at, payload
          ) VALUES (
            ${input.workspaceId}, ${input.auditEventId}, 'workspace.created', 'human',
            ${input.ownerUserId}, ${input.ownerUserId}, ${input.correlationId}, ${input.now},
            ${this.sql.json({ workspaceId: input.workspaceId })}
          )
        `;
        await transaction`
          INSERT INTO workspace_command_receipts (
            workspace_id, idempotency_key, command_type, request_hash, result,
            created_by_user_id, created_at
          ) VALUES (
            ${input.workspaceId}, ${input.idempotencyKey}, 'workspace.create',
            ${input.requestHash}, ${this.sql.json(result)}, ${input.ownerUserId}, ${input.now}
          )
        `;
        return result;
      });
    } catch (error) {
      if (error instanceof WorkspaceError) throw error;
      if (postgresCode(error) === "23505") throw new WorkspaceError("state_conflict");
      throw error;
    }
  }

  async getWorkspace(input: {
    readonly workspaceId: string;
    readonly userId: string;
  }): Promise<WorkspaceSummary | null> {
    const rows = await this.sql.begin(async (transaction) => {
      await transaction.unsafe("SET LOCAL ROLE sartre_app");
      await transaction`SELECT set_config('app.current_workspace_id', ${input.workspaceId}, true)`;
      await transaction`SELECT set_config('app.current_actor_id', ${input.userId}, true)`;
      return transaction<WorkspaceRow[]>`
        SELECT workspace_row.workspace_id, workspace_row.name, workspace_row.status,
               membership_row.role, workspace_row.version
          FROM workspaces AS workspace_row
          JOIN memberships AS membership_row
            ON membership_row.workspace_id = workspace_row.workspace_id
           AND membership_row.user_id = ${input.userId}
           AND membership_row.status = 'active'
         WHERE workspace_row.workspace_id = ${input.workspaceId}
           AND workspace_row.status = 'active'
         LIMIT 1
      `;
    });
    return rows[0] ? summary(rows[0]) : null;
  }
}
