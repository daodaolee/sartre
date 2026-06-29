import { describe, expect, it } from "vitest";
import { HandoffPack } from "./handoff-pack";

describe("HandoffPack", () => {
  it("requires the entry artifact to exist in the pack", () => {
    expect(() =>
      HandoffPack.create({
        entryArtifactName: "handoff.md",
        artifacts: [
          {
            id: "artifact_change_report",
            name: "change-report.md",
            kind: "dev_to_qa_report",
            storageUrl: "file://change-report.md",
            checksum: "sha256-change",
          },
        ],
      }),
    ).toThrow(/entry artifact/i);
  });

  it("exposes the agent-readable entry artifact when the pack is valid", () => {
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
        {
          id: "artifact_report",
          name: "change-report.md",
          kind: "dev_to_qa_report",
          storageUrl: "file://change-report.md",
          checksum: "sha256-report",
        },
      ],
    });

    expect(pack.entry.name).toBe("handoff.md");
    expect(pack.artifacts).toHaveLength(2);
  });
});
