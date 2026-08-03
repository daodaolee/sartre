import { requireDomain } from "../errors.js";

export type Workspace = {
  readonly workspaceId: string;
  readonly name: string;
  readonly status: "active";
  readonly version: 0;
};

export function createWorkspace(input: {
  readonly workspaceId: string;
  readonly name: string;
  readonly actor: { readonly actorType: "endpoint" | "human" | "system"; readonly userId: string };
}): {
  readonly workspace: Workspace;
  readonly owner: {
    readonly membershipId: string;
    readonly workspaceId: string;
    readonly userId: string;
    readonly role: "owner";
    readonly status: "active";
    readonly version: 0;
  };
} {
  requireDomain(input.actor.actorType === "human", "forbidden", "human_actor_required");
  requireDomain(
    input.workspaceId.length > 0 && input.actor.userId.length > 0,
    "invariant_failed",
    "id_required",
  );
  const name = input.name.trim();
  requireDomain(
    name.length >= 1 && name.length <= 200,
    "invariant_failed",
    "workspace_name_invalid",
  );
  return {
    workspace: {
      workspaceId: input.workspaceId,
      name,
      status: "active",
      version: 0,
    },
    owner: {
      membershipId: input.actor.userId,
      workspaceId: input.workspaceId,
      userId: input.actor.userId,
      role: "owner",
      status: "active",
      version: 0,
    },
  };
}
