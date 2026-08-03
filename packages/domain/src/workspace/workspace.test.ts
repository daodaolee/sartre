import { describe, expect, it } from "vitest";

import { DomainInvariantError } from "../errors.js";
import { createWorkspace } from "./workspace.js";

const USER_ID = "10000000-0000-4000-8000-000000000001";
const WORKSPACE_ID = "20000000-0000-4000-8000-000000000001";

describe("Workspace creation", () => {
  it("creates an active Workspace with exactly one Human owner", () => {
    expect(
      createWorkspace({
        workspaceId: WORKSPACE_ID,
        name: "  Product Team  ",
        actor: { actorType: "human", userId: USER_ID },
      }),
    ).toEqual({
      workspace: { workspaceId: WORKSPACE_ID, name: "Product Team", status: "active", version: 0 },
      owner: {
        membershipId: USER_ID,
        workspaceId: WORKSPACE_ID,
        userId: USER_ID,
        role: "owner",
        status: "active",
        version: 0,
      },
    });
  });

  it("rejects Endpoint/System creation and invalid names", () => {
    for (const input of [
      {
        workspaceId: WORKSPACE_ID,
        name: "Team",
        actor: { actorType: "endpoint", userId: USER_ID },
      },
      { workspaceId: WORKSPACE_ID, name: " ", actor: { actorType: "human", userId: USER_ID } },
    ] as const) {
      expect(() => createWorkspace(input)).toThrow(DomainInvariantError);
    }
  });
});
