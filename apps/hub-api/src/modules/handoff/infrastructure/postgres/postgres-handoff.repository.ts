import { Inject, Injectable } from "@nestjs/common";
import {
  type CreateHandoffRequest,
  createHandoffRequestSchema,
  type DeliveryLifecycleCommandRequest,
  type EndpointHealthReportRequest,
  type EndpointHealthReportResponse,
  type HandoffOverviewResponse,
  registerAgentEndpointRequestSchema,
} from "@sartre/contracts";
import {
  type Artifact,
  Delivery,
  type DeliveryStatus,
  HandoffPack,
  TaskHandoff,
} from "@sartre/domain";
import type { PoolClient } from "pg";
import type {
  ConnectAgentEndpointInput,
  DeliveryEventRecord,
  DeliveryRecord,
  HandoffRecord,
  HandoffRepository,
  RegisterAgentEndpointInput,
  ReplayDeliveryEventsInput,
} from "../../ports/handoff.repository";
import { DatabaseService } from "./database.service";

@Injectable()
export class PostgresHandoffRepository implements HandoffRepository {
  constructor(
    @Inject(DatabaseService) private readonly database: DatabaseService,
  ) {}

  async registerAgentEndpoint(
    input: RegisterAgentEndpointInput,
  ): Promise<void> {
    const request = registerAgentEndpointRequestSchema.parse(input);
    await this.database.pool.query(
      `
        insert into agent_endpoints (
          agent_endpoint_id,
          tenant_id,
          user_id,
          role,
          online,
          capabilities,
          execution_mode,
          capability_sources,
          executor,
          approval_policy,
          updated_at
        )
        values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10::jsonb, now())
        on conflict (agent_endpoint_id) do update set
          tenant_id = excluded.tenant_id,
          user_id = excluded.user_id,
          role = excluded.role,
          online = excluded.online,
          capabilities = excluded.capabilities,
          execution_mode = excluded.execution_mode,
          capability_sources = excluded.capability_sources,
          executor = excluded.executor,
          approval_policy = excluded.approval_policy,
          updated_at = now()
      `,
      [
        request.agent_endpoint_id,
        request.tenant_id,
        request.user_id,
        request.role,
        request.online,
        JSON.stringify(request.capabilities),
        request.execution_mode,
        JSON.stringify(request.capability_sources),
        JSON.stringify(request.executor),
        JSON.stringify(request.approval_policy),
      ],
    );
  }

  async submitEndpointHealthReport(
    endpointId: string,
    input: EndpointHealthReportRequest,
  ): Promise<EndpointHealthReportResponse> {
    const endpoint = await this.database.pool.query<{ tenant_id: string }>(
      "select tenant_id from agent_endpoints where agent_endpoint_id = $1",
      [endpointId],
    );
    const endpointRow = endpoint.rows[0];
    if (!endpointRow) {
      throw new Error(`Agent endpoint ${endpointId} is unavailable`);
    }
    if (endpointRow.tenant_id !== input.tenant_id) {
      const error = new Error(
        `Health report tenant ${input.tenant_id} does not match endpoint ${endpointId}`,
      ) as Error & { category: "InvalidInput" };
      error.category = "InvalidInput";
      throw error;
    }

    const reportedAt = new Date();
    await this.database.pool.query(
      `
        insert into agent_endpoint_health_reports (
          endpoint_id, tenant_id, checks, reported_at, updated_at
        )
        values ($1, $2, $3::jsonb, $4, now())
        on conflict (endpoint_id) do update set
          tenant_id = excluded.tenant_id,
          checks = excluded.checks,
          reported_at = excluded.reported_at,
          updated_at = now()
      `,
      [
        endpointId,
        input.tenant_id,
        JSON.stringify(input.checks),
        reportedAt.toISOString(),
      ],
    );

    return {
      schema_version: input.schema_version,
      tenant_id: input.tenant_id,
      endpoint_id: endpointId,
      reported_at: reportedAt.toISOString(),
      checks: input.checks,
    };
  }

  async createHandoff(
    input: CreateHandoffRequest,
  ): Promise<{ handoff: HandoffRecord; delivery: DeliveryRecord }> {
    const request = createHandoffRequestSchema.parse(input);
    const pack = HandoffPack.create({
      entryArtifactName: request.pack.entry,
      artifacts: request.pack.artifacts.map(fromContractArtifact),
    });
    const now = new Date();
    const handoff = TaskHandoff.create({
      id: `handoff_${crypto.randomUUID()}`,
      tenantId: request.tenant_id,
      from: {
        userId: request.from.user_id,
        role: request.from.role,
        agentEndpointId: request.from.agent_endpoint_id,
      },
      to: {
        userId: request.to.user_id,
        role: request.to.role,
        agentEndpointId: request.to.agent_endpoint_id,
      },
      title: request.title,
      summary: request.summary,
      pack,
      now,
    });

    const endpoint = await this.database.pool.query<{ online: boolean }>(
      "select online from agent_endpoints where agent_endpoint_id = $1",
      [request.to.agent_endpoint_id],
    );

    if (endpoint.rowCount === 0) {
      throw new Error(
        `Agent endpoint ${request.to.agent_endpoint_id} is unavailable`,
      );
    }

    const cursorResult = await this.database.pool.query<{ cursor: string }>(
      "select nextval('delivery_cursor_seq')::text as cursor",
    );
    const cursor = Number(cursorResult.rows[0]?.cursor ?? 1);
    const delivery = Delivery.create({
      id: `delivery_${crypto.randomUUID()}`,
      handoffId: handoff.id,
      recipientEndpointId: request.to.agent_endpoint_id,
      recipientOnline: endpoint.rows[0]?.online === true,
      cursor,
    });

    await this.withTransaction(async (client) => {
      await client.query(
        `
          insert into handoffs (
            id, schema_version, tenant_id, from_party, to_party, title, summary, pack, status, created_at
          )
          values ($1, '1.0', $2, $3::jsonb, $4::jsonb, $5, $6, $7::jsonb, $8, $9)
        `,
        [
          handoff.id,
          handoff.tenantId,
          JSON.stringify(toContractParty(handoff.from)),
          JSON.stringify(toContractParty(handoff.to)),
          handoff.title,
          handoff.summary,
          JSON.stringify({
            entry: pack.entryArtifactName,
            artifacts: pack.artifacts.map(toContractArtifact),
          }),
          handoff.status,
          handoff.createdAt.toISOString(),
        ],
      );

      await client.query(
        `
          insert into deliveries (
            id, handoff_id, recipient_endpoint_id, cursor, status, delivered_at, acknowledged_at, failed_at, expired_at
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          delivery.id,
          delivery.handoffId,
          delivery.recipientEndpointId,
          delivery.cursor,
          delivery.status,
          delivery.deliveredAt?.toISOString() ?? null,
          delivery.acknowledgedAt?.toISOString() ?? null,
          delivery.failedAt?.toISOString() ?? null,
          delivery.expiredAt?.toISOString() ?? null,
        ],
      );

      await this.appendDeliveryEvent(client, {
        tenantId: request.tenant_id,
        type: "handoff.queued",
        handoffId: handoff.id,
        deliveryId: null,
        recipientEndpointId: request.to.agent_endpoint_id,
        cursor: delivery.cursor,
        occurredAt: now,
        payload: { title: request.title },
      });

      if (delivery.status === "delivered") {
        await this.appendDeliveryEvent(client, {
          tenantId: request.tenant_id,
          type: "delivery.delivered",
          handoffId: delivery.handoffId,
          deliveryId: delivery.id,
          recipientEndpointId: delivery.recipientEndpointId,
          cursor: delivery.cursor,
          occurredAt: delivery.deliveredAt ?? now,
          payload: { title: request.title },
        });
      }
    });

    return {
      handoff: this.toHandoffRecord({
        id: handoff.id,
        schema_version: "1.0",
        tenant_id: handoff.tenantId,
        from_party: toContractParty(handoff.from),
        to_party: toContractParty(handoff.to),
        title: handoff.title,
        summary: handoff.summary,
        pack: {
          entry: pack.entryArtifactName,
          artifacts: pack.artifacts.map(toContractArtifact),
        },
        status: handoff.status,
        created_at: handoff.createdAt,
      }),
      delivery: this.toDeliveryRecord({
        id: delivery.id,
        handoff_id: delivery.handoffId,
        recipient_endpoint_id: delivery.recipientEndpointId,
        cursor: delivery.cursor,
        status: delivery.status,
        delivered_at: delivery.deliveredAt,
        acknowledged_at: delivery.acknowledgedAt,
        failed_at: delivery.failedAt,
        expired_at: delivery.expiredAt,
      }),
    };
  }

  async getHandoff(handoffId: string): Promise<HandoffRecord | null> {
    const result = await this.database.pool.query<HandoffRow>(
      "select * from handoffs where id = $1",
      [handoffId],
    );
    const row = result.rows[0];
    return row ? this.toHandoffRecord(row) : null;
  }

  async connectAgentEndpoint(
    endpointId: string,
    input: ConnectAgentEndpointInput,
  ): Promise<{
    delivery: DeliveryRecord | null;
    events: DeliveryEventRecord[];
  }> {
    return this.withTransaction(async (client) => {
      await client.query(
        "update agent_endpoints set online = true, updated_at = now() where agent_endpoint_id = $1",
        [endpointId],
      );

      const pending = await client.query<DeliveryWithHandoffRow>(
        `
          select d.*, h.tenant_id, h.title
          from deliveries d
          join handoffs h on h.id = d.handoff_id
          where d.recipient_endpoint_id = $1
            and d.status = 'pending_delivery'
            and d.cursor > $2
          order by d.cursor asc
          limit 1
        `,
        [endpointId, input.last_seen_cursor],
      );

      const row = pending.rows[0];
      if (!row) {
        return { delivery: null, events: [] };
      }

      const delivery = this.restoreDelivery(row);
      const redelivered = delivery.redeliver({
        lastSeenCursor: input.last_seen_cursor,
        now: new Date(),
      });
      const redelivery = redelivered.delivery;

      await client.query(
        `
          update deliveries
          set status = $1, delivered_at = $2
          where id = $3
        `,
        [
          redelivery.status,
          redelivery.deliveredAt?.toISOString() ?? null,
          redelivery.id,
        ],
      );

      for (const event of redelivered.events) {
        await this.appendDeliveryEvent(client, {
          tenantId: row.tenant_id,
          type: event.type,
          handoffId: event.handoffId,
          deliveryId: event.deliveryId,
          recipientEndpointId: event.recipientEndpointId,
          cursor: event.cursor,
          occurredAt: redelivery.deliveredAt ?? new Date(),
          payload: { title: row.title },
        });
      }

      return {
        delivery: this.toDeliveryRecord({
          ...row,
          status: redelivery.status,
          delivered_at: redelivery.deliveredAt,
        }),
        events: redelivered.events,
      };
    });
  }

  async acknowledgeDelivery(deliveryId: string): Promise<DeliveryRecord> {
    return this.withTransaction(async (client) => {
      const result = await client.query<DeliveryWithHandoffRow>(
        `
          select d.*, h.tenant_id, h.title
          from deliveries d
          join handoffs h on h.id = d.handoff_id
          where d.id = $1
        `,
        [deliveryId],
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error(`Delivery ${deliveryId} is unavailable`);
      }

      const restored = this.restoreDelivery(row).acknowledge({
        now: new Date(),
      });

      await client.query(
        "update deliveries set status = $1, acknowledged_at = $2 where id = $3",
        [
          restored.status,
          restored.acknowledgedAt?.toISOString() ?? null,
          deliveryId,
        ],
      );

      await this.appendDeliveryEvent(client, {
        tenantId: row.tenant_id,
        type: "delivery.acknowledged",
        handoffId: restored.handoffId,
        deliveryId: restored.id,
        recipientEndpointId: restored.recipientEndpointId,
        cursor: restored.cursor,
        occurredAt: restored.acknowledgedAt ?? new Date(),
        payload: { title: row.title },
      });

      return this.toDeliveryRecord({
        ...row,
        status: restored.status,
        acknowledged_at: restored.acknowledgedAt,
      });
    });
  }

  failDelivery(
    deliveryId: string,
    input: { schema_version: "1.0"; reason?: string },
  ): Promise<DeliveryRecord> {
    return this.markDeliveryTerminal(deliveryId, {
      status: "failed",
      reason: input.reason,
    });
  }

  expireDelivery(
    deliveryId: string,
    input: { schema_version: "1.0"; reason?: string },
  ): Promise<DeliveryRecord> {
    return this.markDeliveryTerminal(deliveryId, {
      status: "expired",
      reason: input.reason,
    });
  }

  acceptDelivery(
    deliveryId: string,
    input: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryRecord> {
    return this.markDeliveryLifecycle(deliveryId, "accept", input);
  }

  startDelivery(
    deliveryId: string,
    input: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryRecord> {
    return this.markDeliveryLifecycle(deliveryId, "start", input);
  }

  markDeliveryReportReady(
    deliveryId: string,
    input: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryRecord> {
    return this.markDeliveryLifecycle(deliveryId, "report-ready", input);
  }

  sendDeliveryResult(
    deliveryId: string,
    input: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryRecord> {
    return this.markDeliveryLifecycle(deliveryId, "send-result", input);
  }

  closeDelivery(
    deliveryId: string,
    input: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryRecord> {
    return this.markDeliveryLifecycle(deliveryId, "close", input);
  }

  async replayEvents(input: ReplayDeliveryEventsInput) {
    const result = await this.database.pool.query<DeliveryEventReplayRow>(
      `
        select *
        from delivery_events
        where tenant_id = $1
          and recipient_endpoint_id = $2
          and cursor is not null
          and cursor > $3
        order by cursor asc, occurred_at asc, id asc
      `,
      [input.tenantId, input.endpointId, input.afterCursor],
    );

    return {
      schema_version: "1.0" as const,
      tenant_id: input.tenantId,
      endpoint_id: input.endpointId,
      after_cursor: input.afterCursor,
      events: result.rows.map((row) => ({
        id: row.id,
        type: row.type,
        handoff_id: row.handoff_id,
        delivery_id: row.delivery_id,
        recipient_endpoint_id: row.recipient_endpoint_id,
        cursor: row.cursor === null ? null : Number(row.cursor),
        occurred_at: new Date(row.occurred_at).toISOString(),
        payload: row.payload,
      })),
    };
  }

  async addArtifact(
    handoffId: string,
    artifact: Artifact,
  ): Promise<Artifact[]> {
    return this.withTransaction(async (client) => {
      const inserted = await client.query<ArtifactRow & { created_at: Date }>(
        `
          insert into artifacts (id, handoff_id, name, kind, storage_url, checksum)
          values ($1, $2, $3, $4, $5, $6)
          on conflict (id) do update set
            name = excluded.name,
            kind = excluded.kind,
            storage_url = excluded.storage_url,
            checksum = excluded.checksum
          returning *
        `,
        [
          artifact.id,
          handoffId,
          artifact.name,
          artifact.kind,
          artifact.storageUrl,
          artifact.checksum,
        ],
      );

      if (artifact.kind.includes("report")) {
        const context = await client.query<{
          tenant_id: string;
          title: string;
          delivery_id: string | null;
          recipient_endpoint_id: string | null;
          cursor: string | null;
        }>(
          `
            select
              h.tenant_id,
              h.title,
              d.id as delivery_id,
              d.recipient_endpoint_id,
              d.cursor::text
            from handoffs h
            left join deliveries d on d.handoff_id = h.id
            where h.id = $1
            order by d.cursor desc nulls last
            limit 1
          `,
          [handoffId],
        );
        const row = context.rows[0];
        if (row) {
          await this.appendDeliveryEvent(client, {
            tenantId: row.tenant_id,
            type: "artifact.report_returned",
            handoffId,
            deliveryId: row.delivery_id,
            recipientEndpointId: row.recipient_endpoint_id,
            cursor: row.cursor ? Number(row.cursor) : null,
            occurredAt: inserted.rows[0]?.created_at ?? new Date(),
            payload: {
              artifact_id: artifact.id,
              kind: artifact.kind,
              name: artifact.name,
              title: row.title,
            },
          });
        }
      }

      const result = await client.query<ArtifactRow>(
        "select * from artifacts where handoff_id = $1 order by created_at asc",
        [handoffId],
      );

      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
        storageUrl: row.storage_url,
        checksum: row.checksum,
      }));
    });
  }

  async getOverview(tenantId: string): Promise<HandoffOverviewResponse> {
    const [
      endpoints,
      handoffs,
      deliveries,
      reports,
      events,
      failedCount,
      healthReports,
    ] = await Promise.all([
      this.database.pool.query<AgentEndpointRow>(
        `
          select * from agent_endpoints
          where tenant_id = $1
          order by role asc, agent_endpoint_id asc
        `,
        [tenantId],
      ),
      this.database.pool.query<HandoffRow>(
        `
          select * from handoffs
          where tenant_id = $1
          order by created_at desc
          limit 20
        `,
        [tenantId],
      ),
      this.database.pool.query<DeliveryOverviewRow>(
        `
          select
            d.*,
            h.title,
            h.summary,
            h.from_party,
            h.to_party,
            h.created_at
          from deliveries d
          join handoffs h on h.id = d.handoff_id
          where h.tenant_id = $1
          order by d.cursor desc
          limit 20
        `,
        [tenantId],
      ),
      this.database.pool.query<ReportArtifactRow>(
        `
          select
            a.*,
            h.title
          from artifacts a
          join handoffs h on h.id = a.handoff_id
          where h.tenant_id = $1
            and a.kind like '%report%'
          order by a.created_at desc
          limit 20
        `,
        [tenantId],
      ),
      this.database.pool.query<DeliveryEventOverviewRow>(
        `
          select
            e.*,
            h.title,
            h.from_party,
            h.to_party
          from delivery_events e
          join handoffs h on h.id = e.handoff_id
          where e.tenant_id = $1
          order by e.occurred_at desc, e.id desc
          limit 20
        `,
        [tenantId],
      ),
      this.database.pool.query<{ count: string }>(
        `
          select count(*)::text as count
          from deliveries d
          join handoffs h on h.id = d.handoff_id
          where h.tenant_id = $1
            and d.status = 'failed'
        `,
        [tenantId],
      ),
      this.database.pool.query<EndpointHealthReportRow>(
        `
          select *
          from agent_endpoint_health_reports
          where tenant_id = $1
        `,
        [tenantId],
      ),
    ]);
    const healthReportByEndpoint = new Map(
      healthReports.rows.map((row) => [row.endpoint_id, row]),
    );
    const activeTurnByDeliveryId = latestActiveTurnByDeliveryId(events.rows);

    const overviewHandoffs = handoffs.rows.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      status:
        row.status as HandoffOverviewResponse["handoffs"][number]["status"],
      created_at: new Date(row.created_at).toISOString(),
      from: row.from_party,
      to: row.to_party,
      entry_artifact_name: row.pack.entry,
      artifact_count: row.pack.artifacts.length,
    }));

    const overviewDeliveries = deliveries.rows.map((row) => {
      const activeTurn = activeTurnByDeliveryId.get(row.id);
      return {
        id: row.id,
        handoff_id: row.handoff_id,
        recipient_endpoint_id: row.recipient_endpoint_id,
        cursor: Number(row.cursor),
        status:
          row.status as HandoffOverviewResponse["deliveries"][number]["status"],
        delivered_at: row.delivered_at
          ? new Date(row.delivered_at).toISOString()
          : null,
        acknowledged_at: row.acknowledged_at
          ? new Date(row.acknowledged_at).toISOString()
          : null,
        title: row.title,
        summary: row.summary,
        from: row.from_party,
        to: row.to_party,
        ...(activeTurn?.actorEndpointId
          ? { active_actor_endpoint_id: activeTurn.actorEndpointId }
          : {}),
        ...(activeTurn?.targetAgentEndpointId
          ? {
              active_target_agent_endpoint_id: activeTurn.targetAgentEndpointId,
            }
          : {}),
      };
    });

    const overviewReports = reports.rows.map((row) => ({
      id: row.id,
      handoff_id: row.handoff_id,
      name: row.name,
      kind: row.kind,
      storage_url: row.storage_url,
      created_at: new Date(row.created_at).toISOString(),
      title: row.title,
    }));

    const timeline = events.rows.map(toOverviewTimelineEvent);

    return {
      schema_version: "1.0",
      tenant_id: tenantId,
      generated_at: new Date().toISOString(),
      agent_endpoints: endpoints.rows.map((row) => ({
        agent_endpoint_id: row.agent_endpoint_id,
        tenant_id: row.tenant_id,
        user_id: row.user_id,
        role: row.role,
        online: row.online,
        capabilities: row.capabilities,
        execution_mode: row.execution_mode,
        capability_sources: row.capability_sources,
        executor: row.executor,
        approval_policy: row.approval_policy,
        updated_at: new Date(row.updated_at).toISOString(),
        health_report: toEndpointHealthReport(
          healthReportByEndpoint.get(row.agent_endpoint_id),
        ),
      })),
      handoffs: overviewHandoffs,
      deliveries: overviewDeliveries,
      timeline,
      reports: overviewReports,
      metrics: {
        pending_handoffs: overviewDeliveries.filter(
          (delivery) => delivery.status !== "acknowledged",
        ).length,
        failed_deliveries: Number(failedCount.rows[0]?.count ?? 0),
        reports_returned: overviewReports.length,
        endpoint_online: endpoints.rows.filter((endpoint) => endpoint.online)
          .length,
        endpoint_total: endpoints.rows.length,
      },
    };
  }

  private async markDeliveryTerminal(
    deliveryId: string,
    input: { status: "failed" | "expired"; reason?: string },
  ): Promise<DeliveryRecord> {
    return this.withTransaction(async (client) => {
      const result = await client.query<DeliveryWithHandoffRow>(
        `
          select d.*, h.tenant_id, h.title
          from deliveries d
          join handoffs h on h.id = d.handoff_id
          where d.id = $1
        `,
        [deliveryId],
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error(`Delivery ${deliveryId} is unavailable`);
      }

      const transition =
        input.status === "failed"
          ? this.restoreDelivery(row).fail({
              now: new Date(),
              reason: input.reason,
            })
          : this.restoreDelivery(row).expire({
              now: new Date(),
              reason: input.reason,
            });
      const restored = transition.delivery;

      await client.query(
        `
          update deliveries
          set status = $1, failed_at = $2, expired_at = $3
          where id = $4
        `,
        [
          restored.status,
          restored.failedAt?.toISOString() ?? null,
          restored.expiredAt?.toISOString() ?? null,
          deliveryId,
        ],
      );

      for (const event of transition.events) {
        await this.appendDeliveryEvent(client, {
          tenantId: row.tenant_id,
          type: event.type,
          handoffId: event.handoffId,
          deliveryId: event.deliveryId,
          recipientEndpointId: event.recipientEndpointId,
          cursor: event.cursor,
          occurredAt: restored.failedAt ?? restored.expiredAt ?? new Date(),
          payload: {
            ...(event.reason ? { reason: event.reason } : {}),
            title: row.title,
          },
        });
      }

      return this.toDeliveryRecord({
        ...row,
        status: restored.status,
        failed_at: restored.failedAt,
        expired_at: restored.expiredAt,
      });
    });
  }

  private async markDeliveryLifecycle(
    deliveryId: string,
    command: "accept" | "start" | "report-ready" | "send-result" | "close",
    input: DeliveryLifecycleCommandRequest,
  ): Promise<DeliveryRecord> {
    return this.withTransaction(async (client) => {
      const result = await client.query<DeliveryWithHandoffRow>(
        `
          select d.*, h.tenant_id, h.title
          from deliveries d
          join handoffs h on h.id = d.handoff_id
          where d.id = $1
        `,
        [deliveryId],
      );
      const row = result.rows[0];
      if (!row) {
        throw new Error(`Delivery ${deliveryId} is unavailable`);
      }

      const restored = this.restoreDelivery(row);
      const now = new Date();
      if (command === "accept" && restored.status === "delivered") {
        const acknowledged = restored.acknowledge({ now });
        const transition = acknowledged.accept({
          now,
          actorEndpointId: input.actor_endpoint_id,
          reason: input.reason,
        });
        const delivery = transition.delivery;

        await client.query(
          `
            update deliveries
            set status = $1, acknowledged_at = $2
            where id = $3
          `,
          [
            delivery.status,
            acknowledged.acknowledgedAt?.toISOString() ?? null,
            delivery.id,
          ],
        );

        await this.appendDeliveryEvent(client, {
          tenantId: row.tenant_id,
          type: "delivery.acknowledged",
          handoffId: acknowledged.handoffId,
          deliveryId: acknowledged.id,
          recipientEndpointId: acknowledged.recipientEndpointId,
          cursor: acknowledged.cursor,
          occurredAt: acknowledged.acknowledgedAt ?? now,
          payload: { title: row.title },
        });

        for (const event of transition.events) {
          await this.appendDeliveryEvent(client, {
            tenantId: row.tenant_id,
            type: event.type,
            handoffId: event.handoffId,
            deliveryId: event.deliveryId,
            recipientEndpointId: event.recipientEndpointId,
            cursor: event.cursor,
            occurredAt: now,
            payload: {
              title: row.title,
              actor_endpoint_id: event.actorEndpointId,
              status_from: event.fromStatus,
              status_to: event.toStatus,
              ...(event.reason ? { reason: event.reason } : {}),
              ...(input.metadata ? { metadata: input.metadata } : {}),
            },
          });
        }

        return this.toDeliveryRecord({
          ...row,
          status: delivery.status,
          acknowledged_at: acknowledged.acknowledgedAt,
        });
      }

      const transition =
        command === "accept"
          ? restored.accept({
              now,
              actorEndpointId: input.actor_endpoint_id,
              reason: input.reason,
            })
          : command === "start"
            ? restored.start({
                now,
                actorEndpointId: input.actor_endpoint_id,
                reason: input.reason,
              })
            : command === "report-ready"
              ? restored.markReportReady({
                  now,
                  actorEndpointId: input.actor_endpoint_id,
                  reason: input.reason,
                  artifactIds: input.artifact_ids,
                })
              : command === "send-result"
                ? restored.sendResult({
                    now,
                    actorEndpointId: input.actor_endpoint_id,
                    reason: input.reason,
                    artifactIds: input.artifact_ids,
                  })
                : restored.close({
                    now,
                    actorEndpointId: input.actor_endpoint_id,
                    reason: input.reason,
                  });
      const delivery = transition.delivery;

      await client.query("update deliveries set status = $1 where id = $2", [
        delivery.status,
        delivery.id,
      ]);

      for (const event of transition.events) {
        await this.appendDeliveryEvent(client, {
          tenantId: row.tenant_id,
          type: event.type,
          handoffId: event.handoffId,
          deliveryId: event.deliveryId,
          recipientEndpointId: event.recipientEndpointId,
          cursor: event.cursor,
          occurredAt: now,
          payload: {
            title: row.title,
            actor_endpoint_id: event.actorEndpointId,
            status_from: event.fromStatus,
            status_to: event.toStatus,
            ...(event.reason ? { reason: event.reason } : {}),
            ...(event.artifactIds ? { artifact_ids: event.artifactIds } : {}),
            ...(input.metadata ? { metadata: input.metadata } : {}),
          },
        });
      }

      return this.toDeliveryRecord({
        ...row,
        status: delivery.status,
      });
    });
  }

  private restoreDelivery(row: DeliveryRow): Delivery {
    return Delivery.restore({
      id: row.id,
      handoffId: row.handoff_id,
      recipientEndpointId: row.recipient_endpoint_id,
      cursor: Number(row.cursor),
      status: row.status as DeliveryStatus,
      deliveredAt: row.delivered_at,
      acknowledgedAt: row.acknowledged_at,
      failedAt: row.failed_at,
      expiredAt: row.expired_at,
    });
  }

  private async appendDeliveryEvent(
    client: PoolClient,
    event: DeliveryEventInsert,
  ) {
    await client.query(
      `
        insert into delivery_events (
          id, tenant_id, type, handoff_id, delivery_id, recipient_endpoint_id, cursor, occurred_at, payload
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      `,
      [
        `event_${crypto.randomUUID()}`,
        event.tenantId,
        event.type,
        event.handoffId,
        event.deliveryId,
        event.recipientEndpointId,
        event.cursor,
        event.occurredAt.toISOString(),
        JSON.stringify(event.payload),
      ],
    );
  }

  private async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.database.pool.connect();
    try {
      await client.query("begin");
      const result = await callback(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  private toHandoffRecord(row: HandoffRow): HandoffRecord {
    return {
      id: row.id,
      schema_version: "1.0",
      tenant_id: row.tenant_id,
      from: row.from_party,
      to: row.to_party,
      title: row.title,
      summary: row.summary,
      pack: {
        entry: row.pack.entry,
        artifacts: row.pack.artifacts.map(fromContractArtifact),
      },
      status: row.status,
      created_at: new Date(row.created_at).toISOString(),
    };
  }

  private toDeliveryRecord(row: DeliveryRow): DeliveryRecord {
    return {
      id: row.id,
      handoffId: row.handoff_id,
      recipientEndpointId: row.recipient_endpoint_id,
      cursor: Number(row.cursor),
      status: row.status,
      deliveredAt: row.delivered_at
        ? new Date(row.delivered_at).toISOString()
        : null,
      acknowledgedAt: row.acknowledged_at
        ? new Date(row.acknowledged_at).toISOString()
        : null,
      failedAt: row.failed_at ? new Date(row.failed_at).toISOString() : null,
      expiredAt: row.expired_at ? new Date(row.expired_at).toISOString() : null,
    };
  }
}

type HandoffRow = {
  id: string;
  schema_version: "1.0";
  tenant_id: string;
  from_party: { user_id: string; role: string; agent_endpoint_id: string };
  to_party: { user_id: string; role: string; agent_endpoint_id: string };
  title: string;
  summary: string;
  pack: {
    entry: string;
    artifacts: Array<{
      id: string;
      name: string;
      kind: string;
      storage_url: string;
      checksum: string;
    }>;
  };
  status: string;
  created_at: Date;
};

type DeliveryRow = {
  id: string;
  handoff_id: string;
  recipient_endpoint_id: string;
  cursor: number | string;
  status: string;
  delivered_at: Date | null;
  acknowledged_at: Date | null;
  failed_at: Date | null;
  expired_at: Date | null;
};

type DeliveryWithHandoffRow = DeliveryRow & {
  tenant_id: string;
  title: string;
};

type ArtifactRow = {
  id: string;
  name: string;
  kind: string;
  storage_url: string;
  checksum: string;
};

type AgentEndpointRow = {
  agent_endpoint_id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  online: boolean;
  capabilities: string[];
  execution_mode: string;
  capability_sources: HandoffOverviewResponse["agent_endpoints"][number]["capability_sources"];
  executor: HandoffOverviewResponse["agent_endpoints"][number]["executor"];
  approval_policy: HandoffOverviewResponse["agent_endpoints"][number]["approval_policy"];
  updated_at: Date;
};

type EndpointHealthReportRow = {
  endpoint_id: string;
  tenant_id: string;
  checks: EndpointHealthReportResponse["checks"];
  reported_at: Date;
};

type DeliveryOverviewRow = DeliveryRow & {
  title: string;
  summary: string;
  from_party: HandoffRow["from_party"];
  to_party: HandoffRow["to_party"];
  created_at: Date;
};

type ReportArtifactRow = ArtifactRow & {
  handoff_id: string;
  created_at: Date;
  title: string;
};

type DeliveryEventInsert = {
  tenantId: string;
  type:
    | "handoff.queued"
    | "delivery.delivered"
    | "delivery.redelivered"
    | "delivery.acknowledged"
    | "delivery.accepted"
    | "delivery.running"
    | "delivery.report_ready"
    | "delivery.result_sent"
    | "delivery.closed"
    | "delivery.failed"
    | "delivery.expired"
    | "artifact.report_returned";
  handoffId: string;
  deliveryId: string | null;
  recipientEndpointId: string | null;
  cursor: number | null;
  occurredAt: Date;
  payload: Record<string, unknown>;
};

type DeliveryEventOverviewRow = {
  id: string;
  tenant_id: string;
  type: DeliveryEventInsert["type"];
  handoff_id: string;
  delivery_id: string | null;
  recipient_endpoint_id: string | null;
  cursor: string | null;
  occurred_at: Date;
  payload: {
    reason?: string;
    name?: string;
    title?: string;
    actor_endpoint_id?: string;
    status_from?: string;
    status_to?: string;
    artifact_ids?: string[];
    metadata?: {
      target_agent_endpoint_id?: string;
    };
  };
  title: string;
  from_party: HandoffRow["from_party"];
  to_party: HandoffRow["to_party"];
};

type DeliveryEventReplayRow = {
  id: string;
  type: DeliveryEventInsert["type"];
  handoff_id: string;
  delivery_id: string | null;
  recipient_endpoint_id: string | null;
  cursor: string | null;
  occurred_at: Date;
  payload: Record<string, unknown>;
};

function toContractParty(party: {
  userId: string;
  role: string;
  agentEndpointId: string;
}) {
  return {
    user_id: party.userId,
    role: party.role,
    agent_endpoint_id: party.agentEndpointId,
  };
}

function fromContractArtifact(artifact: {
  id: string;
  name: string;
  kind: string;
  storage_url?: string;
  storageUrl?: string;
  checksum: string;
}): Artifact {
  return {
    id: artifact.id,
    name: artifact.name,
    kind: artifact.kind,
    storageUrl: artifact.storageUrl ?? artifact.storage_url ?? "",
    checksum: artifact.checksum,
  };
}

function toContractArtifact(artifact: Artifact) {
  return {
    id: artifact.id,
    name: artifact.name,
    kind: artifact.kind,
    storage_url: artifact.storageUrl,
    checksum: artifact.checksum,
  };
}

function toEndpointHealthReport(
  row: EndpointHealthReportRow | undefined,
): EndpointHealthReportResponse | null {
  if (!row) {
    return null;
  }

  return {
    schema_version: "1.0",
    tenant_id: row.tenant_id,
    endpoint_id: row.endpoint_id,
    reported_at: new Date(row.reported_at).toISOString(),
    checks: row.checks,
  };
}

function latestActiveTurnByDeliveryId(rows: DeliveryEventOverviewRow[]) {
  const activeTurnByDeliveryId = new Map<
    string,
    { actorEndpointId?: string; targetAgentEndpointId?: string }
  >();

  for (const row of rows) {
    if (!row.delivery_id || activeTurnByDeliveryId.has(row.delivery_id)) {
      continue;
    }

    const actorEndpointId = row.payload.actor_endpoint_id;
    const targetAgentEndpointId =
      row.payload.metadata?.target_agent_endpoint_id;
    if (actorEndpointId || targetAgentEndpointId) {
      activeTurnByDeliveryId.set(row.delivery_id, {
        actorEndpointId,
        targetAgentEndpointId,
      });
    }
  }

  return activeTurnByDeliveryId;
}

function toOverviewTimelineEvent(row: DeliveryEventOverviewRow) {
  const base = {
    id: row.id,
    type: row.type,
    time: formatTime(new Date(row.occurred_at).toISOString()),
    handoff_id: row.handoff_id,
    delivery_id: row.delivery_id,
  };

  if (row.type === "handoff.queued") {
    return {
      ...base,
      label: "Queued",
      detail: `${formatRole(row.from_party.role)} published ${row.title}`,
      tone: "blue" as const,
    };
  }

  if (row.type === "delivery.delivered") {
    return {
      ...base,
      label: "Delivered",
      detail: `${formatRole(row.to_party.role)} endpoint received ${row.title}`,
      tone: "blue" as const,
    };
  }

  if (row.type === "delivery.redelivered") {
    return {
      ...base,
      label: "Redelivered",
      detail: `${formatRole(row.to_party.role)} endpoint reconnected for ${row.title}`,
      tone: "blue" as const,
    };
  }

  if (row.type === "delivery.acknowledged") {
    return {
      ...base,
      label: "Acknowledged",
      detail: `${formatRole(row.to_party.role)} accepted ownership`,
      tone: "yellow" as const,
    };
  }

  if (row.type === "delivery.accepted") {
    return {
      ...base,
      label: "Accepted",
      detail: `${formatRole(row.to_party.role)} released ${row.title} to Agent`,
      tone: "yellow" as const,
    };
  }

  if (row.type === "delivery.running") {
    return {
      ...base,
      label: "Running",
      detail: `${formatRole(row.to_party.role)} Agent started ${row.title}`,
      tone: "yellow" as const,
    };
  }

  if (row.type === "delivery.report_ready") {
    return {
      ...base,
      label: "Report ready",
      detail: `${formatRole(row.to_party.role)} result is ready for ${row.title}`,
      tone: "yellow" as const,
    };
  }

  if (row.type === "delivery.result_sent") {
    return {
      ...base,
      label: "Result sent",
      detail: `${formatRole(row.to_party.role)} sent result for ${row.title}`,
      tone: "green" as const,
    };
  }

  if (row.type === "delivery.closed") {
    return {
      ...base,
      label: "Closed",
      detail: `${formatRole(row.to_party.role)} sent result for ${row.title}`,
      tone: "green" as const,
    };
  }

  if (row.type === "delivery.failed") {
    return {
      ...base,
      label: "Failed",
      detail: `Delivery failed: ${row.payload.reason ?? "No reason provided"}`,
      tone: "red" as const,
    };
  }

  if (row.type === "delivery.expired") {
    return {
      ...base,
      label: "Expired",
      detail: `Delivery expired: ${row.payload.reason ?? "No reason provided"}`,
      tone: "red" as const,
    };
  }

  return {
    ...base,
    label: "Report returned",
    detail: `${row.payload.name ?? "Report"} uploaded to Hub`,
    tone: "green" as const,
  };
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatRole(role: string) {
  if (role === "qa") {
    return "QA";
  }
  if (role === "developer") {
    return "Dev";
  }
  return role;
}
