import { describe, expect, it } from "vitest";

describe("local demo fixture", () => {
  it("exposes stable Dev and QA identities", async () => {
    const { localDemoProfiles } = await import("./local-demo.fixture");

    expect(localDemoProfiles.dev).toMatchObject({
      tenant_id: "local-demo",
      user_id: "dev_user",
      role: "developer",
      agent_endpoint_id: "dev_codex_local",
      execution_mode: "manual_confirm",
    });
    expect(localDemoProfiles.qa).toMatchObject({
      tenant_id: "local-demo",
      user_id: "qa_user",
      role: "qa",
      agent_endpoint_id: "qa_codex_local",
      execution_mode: "manual_confirm",
    });
    expect(localDemoProfiles.dev.capabilities).toContain(
      "generate_change_report",
    );
    expect(localDemoProfiles.qa.capabilities).toContain("read_handoff_pack");
  });
});
