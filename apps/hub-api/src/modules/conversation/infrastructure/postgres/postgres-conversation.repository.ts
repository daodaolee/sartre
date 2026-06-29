import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
  type AppendConversationMessageRequest,
  appendConversationMessageRequestSchema,
  type ContextProjection,
  type ConversationDetailResponse,
  type ConversationLedger,
  type ConversationListResponse,
  type ConversationMessage,
  type CreateContextProjectionRequest,
  type CreateConversationRequest,
  type CreateSummaryCheckpointRequest,
  contextProjectionSchema,
  conversationDetailResponseSchema,
  conversationLedgerSchema,
  conversationListResponseSchema,
  conversationMessageSchema,
  createContextProjectionRequestSchema,
  createConversationRequestSchema,
  createSummaryCheckpointRequestSchema,
  type ModelRun,
  modelRunSchema,
  type RecordModelRunRequest,
  type RecordToolInvocationRequest,
  recordModelRunRequestSchema,
  recordToolInvocationRequestSchema,
  type SummaryCheckpoint,
  summaryCheckpointSchema,
  type ToolInvocationRecord,
  toolInvocationRecordSchema,
} from "@sartre/contracts";
import type { PoolClient } from "pg";
import { DatabaseService } from "../../../database/database.service";
import type { ConversationRepository } from "../../ports/conversation.repository";

type ConversationLedgerRow = {
  id: string;
  schema_version: "1.0";
  tenant_id: string;
  title: string;
  owner_endpoint_id: string;
  participant_endpoint_ids: string[];
  status: "active" | "archived";
  metadata: Record<string, string> | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ConversationMessageRow = {
  id: string;
  conversation_id: string;
  seq: number;
  author_endpoint_id: string;
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  message_references: ConversationMessage["references"];
  metadata: Record<string, string> | null;
  created_at: Date | string;
};

type ToolInvocationRow = {
  id: string;
  conversation_id: string;
  source_message_id: string | null;
  tool_name: string;
  status: ToolInvocationRecord["status"];
  input_summary: string;
  output_summary: string | null;
  error: ToolInvocationRecord["error"] | null;
  metadata: Record<string, string> | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type SummaryCheckpointRow = {
  id: string;
  conversation_id: string;
  author_endpoint_id: string;
  covered_message_start_seq: number;
  covered_message_end_seq: number;
  summary: string;
  metadata: Record<string, string> | null;
  created_at: Date | string;
};

type ContextProjectionRow = {
  id: string;
  conversation_id: string;
  provider: string;
  model: string;
  source_message_ids: string[];
  summary_checkpoint_ids: string[];
  reference_ids: string[];
  token_budget: number;
  rendered_context: string;
  metadata: Record<string, string> | null;
  created_at: Date | string;
};

type ModelRunRow = {
  id: string;
  conversation_id: string;
  context_projection_id: string;
  executor_endpoint_id: string;
  provider: string;
  model: string;
  status: ModelRun["status"];
  started_at: Date | string | null;
  completed_at: Date | string | null;
  error: ModelRun["error"] | null;
  metadata: Record<string, string> | null;
};

@Injectable()
export class PostgresConversationRepository implements ConversationRepository {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async createConversation(
    input: CreateConversationRequest,
  ): Promise<ConversationLedger> {
    const request = createConversationRequestSchema.parse(input);
    const now = new Date().toISOString();
    const participants = Array.from(
      new Set([request.owner_endpoint_id, ...request.participant_endpoint_ids]),
    );
    const row = await this.database.pool.query<ConversationLedgerRow>(
      `
        insert into conversation_ledgers (
          id,
          schema_version,
          tenant_id,
          title,
          owner_endpoint_id,
          participant_endpoint_ids,
          status,
          metadata,
          created_at,
          updated_at
        )
        values ($1, '1.0', $2, $3, $4, $5, 'active', $6::jsonb, $7, $7)
        returning *
      `,
      [
        conversationId(),
        request.tenant_id,
        request.title,
        request.owner_endpoint_id,
        participants,
        optionalJson(request.metadata),
        now,
      ],
    );

    return toConversationLedger(
      expectReturnedRow(row.rows, "Conversation ledger"),
    );
  }

  async appendMessage(
    input: AppendConversationMessageRequest,
  ): Promise<ConversationMessage> {
    const request = appendConversationMessageRequestSchema.parse(input);
    const client = await this.database.pool.connect();

    try {
      await client.query("begin");
      await this.assertConversationTenant(client, {
        tenantId: request.tenant_id,
        conversationId: request.conversation_id,
      });
      const nextSeq = await client.query<{ next_seq: number }>(
        `
          select coalesce(max(seq), 0) + 1 as next_seq
          from conversation_messages
          where conversation_id = $1
        `,
        [request.conversation_id],
      );
      const now = new Date().toISOString();
      const inserted = await client.query<ConversationMessageRow>(
        `
          insert into conversation_messages (
            id,
            conversation_id,
            seq,
            author_endpoint_id,
            role,
            content,
            message_references,
            metadata,
            created_at
          )
          values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
          returning *
        `,
        [
          messageId(),
          request.conversation_id,
          Number(nextSeq.rows[0]?.next_seq ?? 1),
          request.author_endpoint_id,
          request.role,
          request.content,
          JSON.stringify(request.references ?? []),
          optionalJson(request.metadata),
          now,
        ],
      );
      await client.query(
        "update conversation_ledgers set updated_at = $2 where id = $1",
        [request.conversation_id, now],
      );
      await client.query("commit");

      return toConversationMessage(
        expectReturnedRow(inserted.rows, "Conversation message"),
      );
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async recordToolInvocation(
    input: RecordToolInvocationRequest,
  ): Promise<ToolInvocationRecord> {
    const request = recordToolInvocationRequestSchema.parse(input);
    await this.assertConversationTenant(this.database.pool, {
      tenantId: request.tenant_id,
      conversationId: request.conversation_id,
    });
    const now = new Date().toISOString();
    const row = await this.database.pool.query<ToolInvocationRow>(
      `
        insert into conversation_tool_invocations (
          id,
          conversation_id,
          source_message_id,
          tool_name,
          status,
          input_summary,
          output_summary,
          error,
          metadata,
          created_at,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $10)
        returning *
      `,
      [
        toolInvocationId(),
        request.conversation_id,
        request.source_message_id ?? null,
        request.tool_name,
        request.status,
        request.input_summary,
        request.output_summary ?? null,
        optionalJson(request.error),
        optionalJson(request.metadata),
        now,
      ],
    );

    return toToolInvocation(expectReturnedRow(row.rows, "Tool invocation"));
  }

  async createSummaryCheckpoint(
    input: CreateSummaryCheckpointRequest,
  ): Promise<SummaryCheckpoint> {
    const request = createSummaryCheckpointRequestSchema.parse(input);
    await this.assertConversationTenant(this.database.pool, {
      tenantId: request.tenant_id,
      conversationId: request.conversation_id,
    });
    const row = await this.database.pool.query<SummaryCheckpointRow>(
      `
        insert into conversation_summary_checkpoints (
          id,
          conversation_id,
          author_endpoint_id,
          covered_message_start_seq,
          covered_message_end_seq,
          summary,
          metadata,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
        returning *
      `,
      [
        summaryCheckpointId(),
        request.conversation_id,
        request.author_endpoint_id,
        request.covered_message_start_seq,
        request.covered_message_end_seq,
        request.summary,
        optionalJson(request.metadata),
        new Date().toISOString(),
      ],
    );

    return toSummaryCheckpoint(
      expectReturnedRow(row.rows, "Summary checkpoint"),
    );
  }

  async createContextProjection(
    input: CreateContextProjectionRequest,
  ): Promise<ContextProjection> {
    const request = createContextProjectionRequestSchema.parse(input);
    await this.assertConversationTenant(this.database.pool, {
      tenantId: request.tenant_id,
      conversationId: request.conversation_id,
    });
    const row = await this.database.pool.query<ContextProjectionRow>(
      `
        insert into conversation_context_projections (
          id,
          conversation_id,
          provider,
          model,
          source_message_ids,
          summary_checkpoint_ids,
          reference_ids,
          token_budget,
          rendered_context,
          metadata,
          created_at
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11)
        returning *
      `,
      [
        contextProjectionId(),
        request.conversation_id,
        request.provider,
        request.model,
        request.source_message_ids ?? [],
        request.summary_checkpoint_ids ?? [],
        request.reference_ids ?? [],
        request.token_budget,
        request.rendered_context,
        optionalJson(request.metadata),
        new Date().toISOString(),
      ],
    );

    return toContextProjection(
      expectReturnedRow(row.rows, "Context projection"),
    );
  }

  async recordModelRun(input: RecordModelRunRequest): Promise<ModelRun> {
    const request = recordModelRunRequestSchema.parse(input);
    await this.assertConversationTenant(this.database.pool, {
      tenantId: request.tenant_id,
      conversationId: request.conversation_id,
    });
    const row = await this.database.pool.query<ModelRunRow>(
      `
        insert into conversation_model_runs (
          id,
          conversation_id,
          context_projection_id,
          executor_endpoint_id,
          provider,
          model,
          status,
          started_at,
          completed_at,
          error,
          metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
        returning *
      `,
      [
        modelRunId(),
        request.conversation_id,
        request.context_projection_id,
        request.executor_endpoint_id,
        request.provider,
        request.model,
        request.status,
        request.started_at ?? null,
        request.completed_at ?? null,
        optionalJson(request.error),
        optionalJson(request.metadata),
      ],
    );

    return toModelRun(expectReturnedRow(row.rows, "Model run"));
  }

  async listConversations(input: {
    tenantId: string;
    endpointId: string;
  }): Promise<ConversationListResponse> {
    const conversations = await this.database.pool.query<ConversationLedgerRow>(
      `
        select *
        from conversation_ledgers
        where tenant_id = $1
          and (owner_endpoint_id = $2 or $2 = any(participant_endpoint_ids))
        order by updated_at desc, created_at desc
      `,
      [input.tenantId, input.endpointId],
    );

    const items = await Promise.all(
      conversations.rows.map(async (row) => {
        const [latestMessage, messageCount, latestProjection] =
          await Promise.all([
            this.database.pool.query<ConversationMessageRow>(
              `
                select *
                from conversation_messages
                where conversation_id = $1
                order by seq desc
                limit 1
              `,
              [row.id],
            ),
            this.database.pool.query<{ count: string }>(
              `
                select count(*)::text as count
                from conversation_messages
                where conversation_id = $1
              `,
              [row.id],
            ),
            this.database.pool.query<ContextProjectionRow>(
              `
                select *
                from conversation_context_projections
                where conversation_id = $1
                order by created_at desc
                limit 1
              `,
              [row.id],
            ),
          ]);

        return {
          ...toConversationLedger(row),
          latest_message: latestMessage.rows[0]
            ? toConversationMessage(latestMessage.rows[0])
            : null,
          message_count: Number(messageCount.rows[0]?.count ?? 0),
          latest_projection: latestProjection.rows[0]
            ? toContextProjection(latestProjection.rows[0])
            : null,
        };
      }),
    );

    return conversationListResponseSchema.parse({
      schema_version: "1.0",
      tenant_id: input.tenantId,
      endpoint_id: input.endpointId,
      conversations: items,
    });
  }

  async getConversationDetail(input: {
    tenantId: string;
    conversationId: string;
  }): Promise<ConversationDetailResponse> {
    const conversation = await this.database.pool.query<ConversationLedgerRow>(
      `
        select *
        from conversation_ledgers
        where tenant_id = $1
          and id = $2
        limit 1
      `,
      [input.tenantId, input.conversationId],
    );
    const row = conversation.rows[0];
    if (!row) {
      throw unavailable(`Conversation ${input.conversationId} is unavailable`);
    }

    const [
      messages,
      toolInvocations,
      summaryCheckpoints,
      modelRuns,
      contextProjections,
    ] = await Promise.all([
      this.database.pool.query<ConversationMessageRow>(
        `
          select *
          from conversation_messages
          where conversation_id = $1
          order by seq asc
        `,
        [input.conversationId],
      ),
      this.database.pool.query<ToolInvocationRow>(
        `
          select *
          from conversation_tool_invocations
          where conversation_id = $1
          order by created_at asc
        `,
        [input.conversationId],
      ),
      this.database.pool.query<SummaryCheckpointRow>(
        `
          select *
          from conversation_summary_checkpoints
          where conversation_id = $1
          order by created_at asc
        `,
        [input.conversationId],
      ),
      this.database.pool.query<ModelRunRow>(
        `
          select *
          from conversation_model_runs
          where conversation_id = $1
          order by created_at asc
        `,
        [input.conversationId],
      ),
      this.database.pool.query<ContextProjectionRow>(
        `
          select *
          from conversation_context_projections
          where conversation_id = $1
          order by created_at asc
        `,
        [input.conversationId],
      ),
    ]);

    return conversationDetailResponseSchema.parse({
      schema_version: "1.0",
      tenant_id: input.tenantId,
      conversation: toConversationLedger(row),
      messages: messages.rows.map(toConversationMessage),
      tool_invocations: toolInvocations.rows.map(toToolInvocation),
      summary_checkpoints: summaryCheckpoints.rows.map(toSummaryCheckpoint),
      model_runs: modelRuns.rows.map(toModelRun),
      context_projections: contextProjections.rows.map(toContextProjection),
    });
  }

  private async assertConversationTenant(
    client: Pick<PoolClient, "query">,
    input: { tenantId: string; conversationId: string },
  ) {
    const row = await client.query<{ tenant_id: string }>(
      "select tenant_id from conversation_ledgers where id = $1 limit 1",
      [input.conversationId],
    );
    const conversation = row.rows[0];
    if (!conversation) {
      throw unavailable(`Conversation ${input.conversationId} is unavailable`);
    }
    if (conversation.tenant_id !== input.tenantId) {
      const error = new Error(
        `Conversation ${input.conversationId} does not belong to tenant ${input.tenantId}`,
      ) as Error & { category: "InvalidInput" };
      error.category = "InvalidInput";
      throw error;
    }
  }
}

function optionalJson(value: unknown) {
  return value === undefined ? null : JSON.stringify(value);
}

function expectReturnedRow<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) {
    throw unavailable(`${label} is unavailable`);
  }
  return row;
}

function conversationId() {
  return `conversation_${randomUUID()}`;
}

function messageId() {
  return `message_${randomUUID()}`;
}

function toolInvocationId() {
  return `tool_invocation_${randomUUID()}`;
}

function summaryCheckpointId() {
  return `summary_${randomUUID()}`;
}

function contextProjectionId() {
  return `projection_${randomUUID()}`;
}

function modelRunId() {
  return `model_run_${randomUUID()}`;
}

function toConversationLedger(row: ConversationLedgerRow): ConversationLedger {
  return conversationLedgerSchema.parse({
    id: row.id,
    schema_version: row.schema_version,
    tenant_id: row.tenant_id,
    title: row.title,
    owner_endpoint_id: row.owner_endpoint_id,
    participant_endpoint_ids: row.participant_endpoint_ids,
    status: row.status,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    ...(row.metadata ? { metadata: row.metadata } : {}),
  });
}

function toConversationMessage(row: ConversationMessageRow) {
  return conversationMessageSchema.parse({
    id: row.id,
    conversation_id: row.conversation_id,
    seq: Number(row.seq),
    author_endpoint_id: row.author_endpoint_id,
    role: row.role,
    content: row.content,
    references: row.message_references ?? [],
    created_at: toIso(row.created_at),
    ...(row.metadata ? { metadata: row.metadata } : {}),
  });
}

function toToolInvocation(row: ToolInvocationRow) {
  return toolInvocationRecordSchema.parse({
    id: row.id,
    conversation_id: row.conversation_id,
    source_message_id: row.source_message_id,
    tool_name: row.tool_name,
    status: row.status,
    input_summary: row.input_summary,
    output_summary: row.output_summary,
    ...(row.error ? { error: row.error } : {}),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    ...(row.metadata ? { metadata: row.metadata } : {}),
  });
}

function toSummaryCheckpoint(row: SummaryCheckpointRow) {
  return summaryCheckpointSchema.parse({
    id: row.id,
    conversation_id: row.conversation_id,
    author_endpoint_id: row.author_endpoint_id,
    covered_message_start_seq: Number(row.covered_message_start_seq),
    covered_message_end_seq: Number(row.covered_message_end_seq),
    summary: row.summary,
    created_at: toIso(row.created_at),
    ...(row.metadata ? { metadata: row.metadata } : {}),
  });
}

function toContextProjection(row: ContextProjectionRow) {
  return contextProjectionSchema.parse({
    id: row.id,
    conversation_id: row.conversation_id,
    provider: row.provider,
    model: row.model,
    source_message_ids: row.source_message_ids,
    summary_checkpoint_ids: row.summary_checkpoint_ids,
    reference_ids: row.reference_ids,
    token_budget: Number(row.token_budget),
    rendered_context: row.rendered_context,
    created_at: toIso(row.created_at),
    ...(row.metadata ? { metadata: row.metadata } : {}),
  });
}

function toModelRun(row: ModelRunRow) {
  return modelRunSchema.parse({
    id: row.id,
    conversation_id: row.conversation_id,
    context_projection_id: row.context_projection_id,
    executor_endpoint_id: row.executor_endpoint_id,
    provider: row.provider,
    model: row.model,
    status: row.status,
    started_at: row.started_at ? toIso(row.started_at) : null,
    completed_at: row.completed_at ? toIso(row.completed_at) : null,
    ...(row.error ? { error: row.error } : {}),
    ...(row.metadata ? { metadata: row.metadata } : {}),
  });
}

function toIso(value: Date | string) {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function unavailable(message: string) {
  return new Error(message);
}
