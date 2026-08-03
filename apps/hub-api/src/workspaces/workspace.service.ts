import { createHash, randomUUID } from "node:crypto";

import {
  HumanActorSchema,
  WorkspaceCreateCommandSchema,
  type HumanActor,
  type WorkspaceCreateCommand,
  type WorkspaceSummary,
} from "@sartre/contracts";
import { createWorkspace } from "@sartre/domain";

import { WorkspaceError } from "./errors.js";
import type { PostgresWorkspaceRepository } from "./postgres-workspace.repository.js";

function requestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export class WorkspaceService {
  constructor(private readonly repository: PostgresWorkspaceRepository) {}

  async create(
    command: WorkspaceCreateCommand,
    actor: HumanActor,
    correlationId: string,
  ): Promise<WorkspaceSummary> {
    const parsed = WorkspaceCreateCommandSchema.parse(command);
    const human = HumanActorSchema.parse(actor);
    const created = createWorkspace({
      workspaceId: parsed.workspaceId,
      name: parsed.name,
      actor: { actorType: human.actorType, userId: human.userId },
    });
    return this.repository.createWorkspace({
      workspaceId: created.workspace.workspaceId,
      name: created.workspace.name,
      ownerUserId: created.owner.userId,
      ownerMembershipId: created.owner.membershipId,
      idempotencyKey: parsed.idempotencyKey,
      requestHash: requestHash(parsed),
      eventId: randomUUID(),
      outboxEventId: randomUUID(),
      auditEventId: randomUUID(),
      correlationId,
      now: new Date(),
    });
  }

  async get(workspaceId: string, actor: HumanActor): Promise<WorkspaceSummary> {
    const human = HumanActorSchema.parse(actor);
    const result = await this.repository.getWorkspace({ workspaceId, userId: human.userId });
    if (!result) throw new WorkspaceError("resource_not_found");
    return result;
  }
}
