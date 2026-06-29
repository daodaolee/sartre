import { describe, expect, it } from "vitest";
import { HandoffPack } from "./handoff-pack";
import { TaskHandoff } from "./task-handoff";

describe("TaskHandoff", () => {
  const pack = HandoffPack.create({
    entryArtifactName: "handoff.md",
    artifacts: [
      {
        id: "artifact_entry",
        name: "handoff.md",
        kind: "agent_readable_instruction",
        storageUrl: "file://handoff.md",
        checksum: "sha256-entry",
      },
    ],
  });

  it("creates a handoff envelope without constraining the business pack schema", () => {
    const handoff = TaskHandoff.create({
      id: "handoff_1",
      tenantId: "local-demo",
      from: {
        userId: "dev_user",
        role: "developer",
        agentEndpointId: "dev_codex_local",
      },
      to: {
        userId: "qa_user",
        role: "qa",
        agentEndpointId: "qa_codex_local",
      },
      title: "订单模块提测",
      summary: "请读取 handoff.md 并产出 QA report",
      pack,
      now: new Date("2026-06-22T10:00:00.000Z"),
    });

    expect(handoff.status).toBe("created");
    expect(handoff.pack.entry.name).toBe("handoff.md");
    expect(handoff.to.agentEndpointId).toBe("qa_codex_local");
  });

  it("requires a tenant id because identities are scoped by tenant", () => {
    expect(() =>
      TaskHandoff.create({
        id: "handoff_1",
        tenantId: "",
        from: {
          userId: "dev_user",
          role: "developer",
          agentEndpointId: "dev_codex_local",
        },
        to: {
          userId: "qa_user",
          role: "qa",
          agentEndpointId: "qa_codex_local",
        },
        title: "订单模块提测",
        summary: "请读取 handoff.md",
        pack,
        now: new Date("2026-06-22T10:00:00.000Z"),
      }),
    ).toThrow(/tenant/i);
  });
});
