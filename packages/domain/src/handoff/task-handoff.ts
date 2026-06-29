import { DomainInvariantError } from "./errors";
import type { HandoffPack } from "./handoff-pack";

export type HandoffParty = {
  userId: string;
  role: string;
  agentEndpointId: string;
};

export type TaskHandoffStatus = "created";

export type TaskHandoffInput = {
  id: string;
  tenantId: string;
  from: HandoffParty;
  to: HandoffParty;
  title: string;
  summary: string;
  pack: HandoffPack;
  now: Date;
};

export class TaskHandoff {
  private constructor(
    readonly id: string,
    readonly tenantId: string,
    readonly from: HandoffParty,
    readonly to: HandoffParty,
    readonly title: string,
    readonly summary: string,
    readonly pack: HandoffPack,
    readonly status: TaskHandoffStatus,
    readonly createdAt: Date,
  ) {}

  static create(input: TaskHandoffInput): TaskHandoff {
    if (!input.tenantId.trim()) {
      throw new DomainInvariantError("TaskHandoff tenant id is required");
    }

    if (!input.title.trim()) {
      throw new DomainInvariantError("TaskHandoff title is required");
    }

    return new TaskHandoff(
      input.id,
      input.tenantId,
      input.from,
      input.to,
      input.title,
      input.summary,
      input.pack,
      "created",
      input.now,
    );
  }
}
