import { createHash, randomUUID } from "node:crypto";

import {
  EndpointActorSchema,
  EndpointAuthSessionSchema,
  EndpointCredentialExchangeCommandSchema,
  EndpointCredentialRotateCommandSchema,
  EndpointPairingCompleteCommandSchema,
  EndpointPairingIntentCreateCommandSchema,
  EndpointPairingResultSchema,
  EndpointRevokeCommandSchema,
  EndpointSummarySchema,
  HumanActorSchema,
  type EndpointActor,
  type EndpointAuthSession,
  type EndpointCredentialExchangeCommand,
  type EndpointCredentialRotateCommand,
  type EndpointPairingCompleteCommand,
  type EndpointPairingIntentCreateCommand,
  type EndpointPairingIntentSummary,
  type EndpointPairingResult,
  type EndpointRevokeCommand,
  type EndpointSummary,
  type HumanActor,
} from "@sartre/contracts";

import type { EndpointAccessTokenPort } from "./endpoint-access-token.js";
import { EndpointAuthError } from "./errors.js";
import type { PostgresEndpointRepository } from "./postgres-endpoint.repository.js";

const PAIRING_TTL_MS = 5 * 60_000;

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function requestHash(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function parseOrReject<Output>(parse: () => Output): Output {
  try {
    return parse();
  } catch {
    throw new EndpointAuthError("validation_failed");
  }
}

export class EndpointService {
  constructor(
    private readonly repository: PostgresEndpointRepository,
    private readonly accessTokens: EndpointAccessTokenPort,
    private readonly clock: { readonly now: () => Date } = { now: () => new Date() },
  ) {}

  async createPairingIntent(
    workspaceId: string,
    command: EndpointPairingIntentCreateCommand,
    actor: HumanActor,
    correlationId: string,
  ): Promise<EndpointPairingIntentSummary> {
    const parsed = parseOrReject(() => EndpointPairingIntentCreateCommandSchema.parse(command));
    const human = parseOrReject(() => HumanActorSchema.parse(actor));
    const now = this.clock.now();
    return this.repository.createPairingIntent({
      workspaceId,
      actorUserId: human.userId,
      pairingIntentId: parsed.pairingIntentId,
      challengeHash: sha256(parsed.challenge),
      expiresAt: new Date(now.getTime() + PAIRING_TTL_MS),
      idempotencyKey: parsed.idempotencyKey,
      requestHash: requestHash(parsed),
      commandType: "endpoint.pairing.create",
      correlationId,
      now,
    });
  }

  async completePairing(
    workspaceId: string,
    command: EndpointPairingCompleteCommand,
    correlationId: string,
  ): Promise<EndpointPairingResult> {
    const parsed = parseOrReject(() => EndpointPairingCompleteCommandSchema.parse(command));
    const endpoint = await this.repository.completePairing({
      workspaceId,
      pairingIntentId: parsed.pairingIntentId,
      endpointId: parsed.endpointId,
      challengeHash: sha256(parsed.challenge),
      credentialHash: sha256(parsed.credential),
      correlationId,
      now: this.clock.now(),
    });
    return EndpointPairingResultSchema.parse({
      workspaceId: endpoint.workspaceId,
      endpointId: endpoint.endpointId,
      credential: parsed.credential,
      version: endpoint.version,
    });
  }

  async exchangeCredential(
    workspaceId: string,
    command: EndpointCredentialExchangeCommand,
  ): Promise<EndpointAuthSession> {
    const parsed = parseOrReject(() => EndpointCredentialExchangeCommandSchema.parse(command));
    try {
      const endpoint = await this.repository.findActiveEndpoint({
        workspaceId,
        endpointId: parsed.endpointId,
        credentialHash: sha256(parsed.credential),
      });
      const issued = await this.accessTokens.issue({
        endpointId: endpoint.endpoint_id,
        workspaceId,
        ownerUserId: endpoint.owner_user_id,
        endpointVersion: endpoint.endpoint_version,
        tokenId: randomUUID(),
        now: this.clock.now(),
      });
      return EndpointAuthSessionSchema.parse({
        endpointId: endpoint.endpoint_id,
        workspaceId,
        accessToken: issued.token,
        accessExpiresAt: issued.expiresAt,
      });
    } catch (error) {
      if (error instanceof EndpointAuthError && error.code === "endpoint_credential_invalid") {
        throw error;
      }
      throw error;
    }
  }

  async authenticate(accessToken: string, workspaceId: string): Promise<EndpointActor> {
    const { claims } = await this.requireAuthenticatedEndpoint(accessToken, workspaceId);
    return EndpointActorSchema.parse({
      actorType: "endpoint",
      actorId: claims.sub,
      endpointId: claims.sub,
      workspaceId,
      initiatedByUserId: claims.uid,
    });
  }

  async status(accessToken: string, workspaceId: string): Promise<EndpointSummary> {
    const { claims, endpointVersion } = await this.requireAuthenticatedEndpoint(
      accessToken,
      workspaceId,
    );
    return EndpointSummarySchema.parse({
      endpointId: claims.sub,
      workspaceId,
      status: "active",
      version: endpointVersion,
    });
  }

  private async requireAuthenticatedEndpoint(
    accessToken: string,
    workspaceId: string,
  ): Promise<{
    readonly claims: Awaited<ReturnType<EndpointAccessTokenPort["verify"]>>;
    readonly endpointVersion: number;
  }> {
    const claims = await this.accessTokens.verify(accessToken, this.clock.now());
    if (claims.wid !== workspaceId) throw new EndpointAuthError("unauthenticated");
    try {
      const endpoint = await this.repository.findActiveEndpoint({
        workspaceId,
        endpointId: claims.sub,
        ownerUserId: claims.uid,
      });
      if (endpoint.endpoint_version !== claims.ver) {
        throw new EndpointAuthError("unauthenticated");
      }
    } catch (error) {
      if (error instanceof EndpointAuthError && error.code === "endpoint_credential_invalid") {
        throw new EndpointAuthError("unauthenticated");
      }
      throw error;
    }
    return { claims, endpointVersion: claims.ver };
  }

  async rotateCredential(
    workspaceId: string,
    command: EndpointCredentialRotateCommand,
    actor: HumanActor,
    correlationId: string,
  ): Promise<EndpointSummary> {
    const parsed = parseOrReject(() => EndpointCredentialRotateCommandSchema.parse(command));
    const human = parseOrReject(() => HumanActorSchema.parse(actor));
    return this.repository.rotateCredential({
      workspaceId,
      actorUserId: human.userId,
      endpointId: parsed.endpointId,
      replacementCredentialHash: sha256(parsed.replacementCredential),
      expectedVersion: parsed.expectedVersion,
      idempotencyKey: parsed.idempotencyKey,
      requestHash: requestHash(parsed),
      commandType: "endpoint.credential.rotate",
      correlationId,
      now: this.clock.now(),
    });
  }

  async revokeEndpoint(
    workspaceId: string,
    command: EndpointRevokeCommand,
    actor: HumanActor,
    correlationId: string,
  ): Promise<EndpointSummary> {
    const parsed = parseOrReject(() => EndpointRevokeCommandSchema.parse(command));
    const human = parseOrReject(() => HumanActorSchema.parse(actor));
    return this.repository.revokeEndpoint({
      workspaceId,
      actorUserId: human.userId,
      endpointId: parsed.endpointId,
      expectedVersion: parsed.expectedVersion,
      idempotencyKey: parsed.idempotencyKey,
      requestHash: requestHash(parsed),
      commandType: "endpoint.revoke",
      correlationId,
      now: this.clock.now(),
    });
  }
}
