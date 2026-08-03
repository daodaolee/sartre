import { randomUUID, timingSafeEqual } from "node:crypto";

import {
  EndpointPairingIntentSummarySchema,
  EndpointSummarySchema,
  type EndpointPairingIntentSummary,
  type EndpointSummary,
} from "@sartre/contracts";
import postgres from "postgres";

import { EndpointAuthError } from "./errors.js";

type TenantTransaction = postgres.TransactionSql;

type MembershipRow = { readonly user_id: string; readonly status: "active" | "removed" };
type ReceiptRow = {
  readonly command_type: string;
  readonly request_hash: string;
  readonly result: unknown;
};
type PairingRow = {
  readonly workspace_id: string;
  readonly pairing_intent_id: string;
  readonly owner_user_id: string;
  readonly challenge_hash: string;
  readonly status: "consumed" | "expired" | "pending" | "revoked";
  readonly expires_at: Date | string;
  readonly version: number;
};
type EndpointRow = {
  readonly endpoint_id: string;
  readonly owner_user_id: string;
  readonly credential_hash: string;
  readonly endpoint_status: "active" | "revoked";
  readonly endpoint_version: number;
  readonly grant_status: "active" | "revoked";
  readonly grant_version: number;
};

type MutationContext = {
  readonly workspaceId: string;
  readonly actorUserId: string;
  readonly idempotencyKey: string;
  readonly requestHash: string;
  readonly commandType:
    | "endpoint.credential.rotate"
    | "endpoint.pairing.create"
    | "endpoint.revoke";
  readonly correlationId: string;
  readonly now: Date;
};

type MutationEvent = {
  readonly aggregateId: string;
  readonly aggregateVersion: number;
  readonly eventType: string;
  readonly payload: Readonly<Record<string, unknown>>;
};

function iso(value: Date | string): string {
  return new Date(value).toISOString();
}

function equalHash(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/u.test(left) || !/^[a-f0-9]{64}$/u.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "ascii"), Buffer.from(right, "ascii"));
}

function pairingSummary(row: PairingRow): EndpointPairingIntentSummary {
  return EndpointPairingIntentSummarySchema.parse({
    workspaceId: row.workspace_id,
    pairingIntentId: row.pairing_intent_id,
    status: "pending",
    expiresAt: iso(row.expires_at),
    version: row.version,
  });
}

function postgresCode(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : undefined;
}

export class PostgresEndpointRepository {
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

  async createPairingIntent(
    input: MutationContext & {
      readonly pairingIntentId: string;
      readonly challengeHash: string;
      readonly expiresAt: Date;
    },
  ): Promise<EndpointPairingIntentSummary> {
    return this.mutate(
      input,
      (value) => EndpointPairingIntentSummarySchema.parse(value),
      async (transaction) => {
        await this.requireActiveMember(transaction, input.workspaceId, input.actorUserId);
      },
      async (transaction) => {
        await transaction`
          UPDATE endpoint_pairing_intents
             SET status = 'expired', version = version + 1, updated_at = ${input.now}
           WHERE workspace_id = ${input.workspaceId}
             AND owner_user_id = ${input.actorUserId}
             AND status = 'pending'
             AND expires_at <= ${input.now}
        `;
        const rows = await transaction<PairingRow[]>`
          INSERT INTO endpoint_pairing_intents (
            workspace_id, pairing_intent_id, owner_user_id, challenge_hash, status,
            expires_at, consumed_at, version, created_at, updated_at
          ) VALUES (
            ${input.workspaceId}, ${input.pairingIntentId}, ${input.actorUserId},
            ${input.challengeHash}, 'pending', ${input.expiresAt}, NULL, 0, ${input.now}, ${input.now}
          )
          RETURNING workspace_id, pairing_intent_id, owner_user_id, challenge_hash,
                    status, expires_at, version
        `;
        const row = rows[0];
        if (!row) throw new EndpointAuthError("dependency_unavailable");
        return {
          result: pairingSummary(row),
          event: {
            aggregateId: row.pairing_intent_id,
            aggregateVersion: 1,
            eventType: "endpoint.pairing.created",
            payload: { pairingIntentId: row.pairing_intent_id, expiresAt: iso(row.expires_at) },
          },
        };
      },
    );
  }

  async completePairing(input: {
    readonly workspaceId: string;
    readonly pairingIntentId: string;
    readonly endpointId: string;
    readonly challengeHash: string;
    readonly credentialHash: string;
    readonly correlationId: string;
    readonly now: Date;
  }): Promise<EndpointSummary> {
    try {
      return await this.sql.begin(async (transaction) => {
        await this.setTenant(transaction, input.workspaceId, input.endpointId);
        const rows = await transaction<PairingRow[]>`
          SELECT workspace_id, pairing_intent_id, owner_user_id, challenge_hash,
                 status, expires_at, version
            FROM endpoint_pairing_intents
           WHERE workspace_id = ${input.workspaceId}
             AND pairing_intent_id = ${input.pairingIntentId}
           FOR UPDATE
        `;
        const pairing = rows[0];
        if (!pairing) throw new EndpointAuthError("endpoint_credential_invalid");
        if (
          pairing.status !== "pending" ||
          new Date(pairing.expires_at).getTime() <= input.now.getTime() ||
          !equalHash(pairing.challenge_hash, input.challengeHash)
        ) {
          throw new EndpointAuthError("endpoint_credential_invalid");
        }
        await this.requireActiveMember(transaction, input.workspaceId, pairing.owner_user_id);

        const consumed = await transaction<{ version: number }[]>`
          UPDATE endpoint_pairing_intents
             SET status = 'consumed', consumed_at = ${input.now}, version = version + 1,
                 updated_at = ${input.now}
           WHERE workspace_id = ${input.workspaceId}
             AND pairing_intent_id = ${input.pairingIntentId}
             AND status = 'pending'
             AND version = ${pairing.version}
          RETURNING version
        `;
        if (!consumed[0]) throw new EndpointAuthError("endpoint_credential_invalid");
        await transaction`
          INSERT INTO endpoint_identities (
            endpoint_id, owner_user_id, credential_hash, status, revoked_at,
            version, created_at, updated_at
          ) VALUES (
            ${input.endpointId}, ${pairing.owner_user_id}, ${input.credentialHash},
            'active', NULL, 0, ${input.now}, ${input.now}
          )
        `;
        await transaction`
          INSERT INTO endpoint_workspace_grants (
            workspace_id, endpoint_id, status, version, created_at, updated_at
          ) VALUES (${input.workspaceId}, ${input.endpointId}, 'active', 0, ${input.now}, ${input.now})
        `;
        await this.appendEvent(
          transaction,
          {
            workspaceId: input.workspaceId,
            actorUserId: pairing.owner_user_id,
            idempotencyKey: input.pairingIntentId,
            requestHash: input.challengeHash,
            commandType: "endpoint.pairing.create",
            correlationId: input.correlationId,
            now: input.now,
          },
          {
            aggregateId: input.endpointId,
            aggregateVersion: 1,
            eventType: "endpoint.pairing.completed",
            payload: { endpointId: input.endpointId, pairingIntentId: input.pairingIntentId },
          },
        );
        return EndpointSummarySchema.parse({
          endpointId: input.endpointId,
          workspaceId: input.workspaceId,
          status: "active",
          version: 0,
        });
      });
    } catch (error) {
      if (error instanceof EndpointAuthError) throw error;
      if (["23503", "23505", "23514"].includes(postgresCode(error) ?? "")) {
        throw new EndpointAuthError("endpoint_credential_invalid");
      }
      throw error;
    }
  }

  async findActiveEndpoint(input: {
    readonly workspaceId: string;
    readonly endpointId: string;
    readonly credentialHash?: string;
    readonly ownerUserId?: string;
  }): Promise<EndpointRow> {
    try {
      return await this.sql.begin(async (transaction) => {
        await this.setTenant(transaction, input.workspaceId, input.endpointId);
        const rows = await transaction<EndpointRow[]>`
          SELECT identity_row.endpoint_id, identity_row.owner_user_id,
                 identity_row.credential_hash, identity_row.status AS endpoint_status,
                 identity_row.version AS endpoint_version, grant_row.status AS grant_status,
                 grant_row.version AS grant_version
            FROM endpoint_identities AS identity_row
            JOIN endpoint_workspace_grants AS grant_row
              ON grant_row.endpoint_id = identity_row.endpoint_id
             AND grant_row.workspace_id = ${input.workspaceId}
            JOIN memberships AS membership_row
              ON membership_row.workspace_id = grant_row.workspace_id
             AND membership_row.user_id = identity_row.owner_user_id
             AND membership_row.status = 'active'
           WHERE identity_row.endpoint_id = ${input.endpointId}
             AND identity_row.status = 'active'
             AND grant_row.status = 'active'
           LIMIT 1
        `;
        const row = rows[0];
        if (
          !row ||
          (input.ownerUserId !== undefined && row.owner_user_id !== input.ownerUserId) ||
          (input.credentialHash !== undefined &&
            !equalHash(row.credential_hash, input.credentialHash))
        ) {
          throw new EndpointAuthError("endpoint_credential_invalid");
        }
        return row;
      });
    } catch (error) {
      if (error instanceof EndpointAuthError) throw error;
      throw error;
    }
  }

  async rotateCredential(
    input: MutationContext & {
      readonly endpointId: string;
      readonly replacementCredentialHash: string;
      readonly expectedVersion: number;
    },
  ): Promise<EndpointSummary> {
    return this.mutateEndpoint(input, async (transaction, endpoint) => {
      if (endpoint.endpoint_version !== input.expectedVersion) {
        throw new EndpointAuthError("version_conflict");
      }
      await transaction`
        UPDATE endpoint_identities
           SET credential_hash = ${input.replacementCredentialHash},
               version = version + 1, updated_at = ${input.now}
         WHERE endpoint_id = ${input.endpointId}
           AND status = 'active'
           AND version = ${input.expectedVersion}
      `;
      const result = EndpointSummarySchema.parse({
        endpointId: input.endpointId,
        workspaceId: input.workspaceId,
        status: "active",
        version: input.expectedVersion + 1,
      });
      return {
        result,
        event: {
          aggregateId: input.endpointId,
          aggregateVersion: input.expectedVersion + 2,
          eventType: "endpoint.credential.rotated",
          payload: { endpointId: input.endpointId },
        },
      };
    });
  }

  async revokeEndpoint(
    input: MutationContext & { readonly endpointId: string; readonly expectedVersion: number },
  ): Promise<EndpointSummary> {
    return this.mutateEndpoint(input, async (transaction, endpoint) => {
      if (endpoint.endpoint_version !== input.expectedVersion) {
        throw new EndpointAuthError("version_conflict");
      }
      await transaction`
        UPDATE endpoint_identities
           SET status = 'revoked', revoked_at = ${input.now}, version = version + 1,
               updated_at = ${input.now}
         WHERE endpoint_id = ${input.endpointId}
           AND status = 'active'
           AND version = ${input.expectedVersion}
      `;
      await transaction`
        UPDATE endpoint_workspace_grants
           SET status = 'revoked', version = version + 1, updated_at = ${input.now}
         WHERE workspace_id = ${input.workspaceId}
           AND endpoint_id = ${input.endpointId}
           AND status = 'active'
      `;
      const result = EndpointSummarySchema.parse({
        endpointId: input.endpointId,
        workspaceId: input.workspaceId,
        status: "revoked",
        version: input.expectedVersion + 1,
      });
      return {
        result,
        event: {
          aggregateId: input.endpointId,
          aggregateVersion: input.expectedVersion + 2,
          eventType: "endpoint.revoked",
          payload: { endpointId: input.endpointId },
        },
      };
    });
  }

  private async mutateEndpoint(
    input: MutationContext & { readonly endpointId: string },
    operation: (
      transaction: TenantTransaction,
      endpoint: EndpointRow,
    ) => Promise<{ readonly result: EndpointSummary; readonly event: MutationEvent }>,
  ): Promise<EndpointSummary> {
    return this.mutate(
      input,
      (value) => EndpointSummarySchema.parse(value),
      async (transaction) => {
        await this.requireActiveMember(transaction, input.workspaceId, input.actorUserId);
      },
      async (transaction) => {
        const rows = await this.endpointRows(
          transaction,
          input.workspaceId,
          input.endpointId,
          true,
        );
        const endpoint = rows[0];
        if (
          !endpoint ||
          endpoint.owner_user_id !== input.actorUserId ||
          endpoint.endpoint_status !== "active" ||
          endpoint.grant_status !== "active"
        ) {
          throw new EndpointAuthError("resource_not_found");
        }
        return operation(transaction, endpoint);
      },
    );
  }

  private async mutate<Result extends object>(
    input: MutationContext,
    parseResult: (value: unknown) => Result,
    authorize: (transaction: TenantTransaction) => Promise<void>,
    operation: (
      transaction: TenantTransaction,
    ) => Promise<{ readonly result: Result; readonly event: MutationEvent }>,
  ): Promise<Result> {
    try {
      const result: unknown = await this.sql.begin(async (transaction) => {
        await this.setTenant(transaction, input.workspaceId, input.actorUserId);
        await authorize(transaction);
        await transaction`SELECT pg_advisory_xact_lock(
          hashtextextended(${`${input.workspaceId}:${input.idempotencyKey}`}, 0)
        )`;
        const receipts = await transaction<ReceiptRow[]>`
          SELECT command_type, request_hash, result
            FROM workspace_command_receipts
           WHERE workspace_id = ${input.workspaceId}
             AND idempotency_key = ${input.idempotencyKey}
             AND created_by_user_id = ${input.actorUserId}
        `;
        const receipt = receipts[0];
        if (receipt) {
          if (
            receipt.command_type !== input.commandType ||
            receipt.request_hash !== input.requestHash
          ) {
            throw new EndpointAuthError("idempotency_conflict");
          }
          return parseResult(receipt.result);
        }
        const outcome = await operation(transaction);
        await this.appendEvent(transaction, input, outcome.event);
        await transaction`
          INSERT INTO workspace_command_receipts (
            workspace_id, idempotency_key, command_type, request_hash, result,
            created_by_user_id, created_at
          ) VALUES (
            ${input.workspaceId}, ${input.idempotencyKey}, ${input.commandType},
            ${input.requestHash}, ${this.sql.json(outcome.result as postgres.JSONValue)},
            ${input.actorUserId}, ${input.now}
          )
        `;
        return outcome.result;
      });
      return result as Result;
    } catch (error) {
      if (error instanceof EndpointAuthError) throw error;
      if (["23503", "23505", "23514"].includes(postgresCode(error) ?? "")) {
        throw new EndpointAuthError("state_conflict");
      }
      throw error;
    }
  }

  private async appendEvent(
    transaction: TenantTransaction,
    input: MutationContext,
    event: MutationEvent,
  ): Promise<void> {
    await transaction`SELECT pg_advisory_xact_lock(hashtextextended(${input.workspaceId}, 1))`;
    const cursors = await transaction<{ next_cursor: string | number }[]>`
      SELECT COALESCE(max(workspace_cursor), 0) + 1 AS next_cursor
        FROM domain_events
       WHERE workspace_id = ${input.workspaceId}
    `;
    const cursor = Number(cursors[0]?.next_cursor);
    if (!Number.isSafeInteger(cursor) || cursor <= 0) {
      throw new EndpointAuthError("dependency_unavailable");
    }
    const eventId = randomUUID();
    await transaction`
      INSERT INTO domain_events (
        workspace_id, event_id, workspace_cursor, aggregate_type, aggregate_id,
        aggregate_version, event_type, actor_type, actor_id, initiated_by_user_id,
        correlation_id, causation_id, occurred_at, payload
      ) VALUES (
        ${input.workspaceId}, ${eventId}, ${cursor}, 'EndpointIdentity', ${event.aggregateId},
        ${event.aggregateVersion}, ${event.eventType}, 'human', ${input.actorUserId},
        ${input.actorUserId}, ${input.correlationId}, ${input.idempotencyKey}, ${input.now},
        ${this.sql.json(event.payload as postgres.JSONValue)}
      )
    `;
    await transaction`
      INSERT INTO outbox_events (
        workspace_id, outbox_event_id, event_id, status, attempt_count,
        available_at, claimed_until, created_at
      ) VALUES (
        ${input.workspaceId}, ${randomUUID()}, ${eventId}, 'pending', 0,
        ${input.now}, NULL, ${input.now}
      )
    `;
    await transaction`
      INSERT INTO audit_events (
        workspace_id, audit_event_id, event_type, actor_type, actor_id,
        initiated_by_user_id, correlation_id, occurred_at, payload
      ) VALUES (
        ${input.workspaceId}, ${randomUUID()}, ${event.eventType}, 'human',
        ${input.actorUserId}, ${input.actorUserId}, ${input.correlationId}, ${input.now},
        ${this.sql.json(event.payload as postgres.JSONValue)}
      )
    `;
  }

  private async endpointRows(
    transaction: TenantTransaction,
    workspaceId: string,
    endpointId: string,
    forUpdate: boolean,
  ): Promise<EndpointRow[]> {
    return transaction.unsafe<EndpointRow[]>(
      `SELECT identity_row.endpoint_id, identity_row.owner_user_id,
              identity_row.credential_hash, identity_row.status AS endpoint_status,
              identity_row.version AS endpoint_version, grant_row.status AS grant_status,
              grant_row.version AS grant_version
         FROM endpoint_identities AS identity_row
         JOIN endpoint_workspace_grants AS grant_row
           ON grant_row.endpoint_id = identity_row.endpoint_id
          AND grant_row.workspace_id = $1
        WHERE identity_row.endpoint_id = $2
        LIMIT 1${forUpdate ? " FOR UPDATE OF identity_row, grant_row" : ""}`,
      [workspaceId, endpointId],
    );
  }

  private async requireActiveMember(
    transaction: TenantTransaction,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    const rows = await transaction<MembershipRow[]>`
      SELECT user_id, status
        FROM memberships
       WHERE workspace_id = ${workspaceId}
         AND user_id = ${userId}
         AND status = 'active'
       LIMIT 1
    `;
    if (!rows[0]) throw new EndpointAuthError("resource_not_found");
  }

  private async setTenant(
    transaction: TenantTransaction,
    workspaceId: string,
    actorId: string,
  ): Promise<void> {
    await transaction.unsafe("SET LOCAL ROLE sartre_app");
    await transaction`SELECT set_config('app.current_workspace_id', ${workspaceId}, true)`;
    await transaction`SELECT set_config('app.current_actor_id', ${actorId}, true)`;
  }
}
