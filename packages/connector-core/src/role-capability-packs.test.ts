import { roleCapabilityPackSchema } from "@sartre/contracts";
import { describe, expect, it } from "vitest";
import {
  collectCapabilityMentions,
  loadRoleCapabilityPacksFromDirectory,
  roleCapabilityPackToConnectorProfile,
} from "./role-capability-packs";

const rolePackDirectory = new URL(
  "../../../.agents/capabilities/roles/",
  import.meta.url,
);

describe("role capability packs", () => {
  it("loads the installed QA and developer role capability packs", async () => {
    const packs = await loadRoleCapabilityPacksFromDirectory(rolePackDirectory);

    expect(packs.map((pack) => pack.id).sort()).toEqual([
      "bff-marketing-bff-capability-pack",
      "frontend-marketing-ai-aws-capability-pack",
      "qa-falcocut-capability-pack",
      "vcm-hot-template-admin-capability-pack",
    ]);
    expect(packs.filter((pack) => pack.role === "qa")).toHaveLength(1);
    expect(packs.filter((pack) => pack.role === "developer")).toHaveLength(3);
  });

  it("keeps high-risk QA execution behind manual confirmation", async () => {
    const packs = await loadRoleCapabilityPacksFromDirectory(rolePackDirectory);
    const qaPack = packs.find((pack) => pack.role === "qa");

    expect(qaPack).toBeDefined();
    expect(qaPack?.capability_sources.map((source) => source.id)).toContain(
      "qa_skill_ui_regression_execution",
    );
    expect(
      qaPack?.commands.filter(
        (command) =>
          command.risk === "prod_mutation" || command.risk === "qa_mutation",
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          approval_mode: "manual_confirm",
        }),
      ]),
    );
    expect(
      qaPack?.commands.some(
        (command) =>
          command.risk === "prod_mutation" &&
          command.command.includes("--confirm-prod-submit"),
      ),
    ).toBe(false);
  });

  it("turns a role capability pack into a connector profile", async () => {
    const packs = await loadRoleCapabilityPacksFromDirectory(rolePackDirectory);
    const frontendPack = packs.find(
      (pack) => pack.id === "frontend-marketing-ai-aws-capability-pack",
    );

    if (!frontendPack) {
      throw new Error("Expected frontend role capability pack to be installed");
    }

    const profile = roleCapabilityPackToConnectorProfile(frontendPack);

    expect(profile.agentEndpointId).toBe("dev_frontend_falcocut_local");
    expect(profile.role).toBe("developer");
    expect(profile.executor.kind).toBe("codex_cli");
    expect(profile.capabilitySources.length).toBeGreaterThan(3);
    expect(profile.approvalPolicy.require_human_for).toContain("run_command");
  });

  it("exposes stable mention candidates for chat references", async () => {
    const packs = await loadRoleCapabilityPacksFromDirectory(rolePackDirectory);
    const mentions = collectCapabilityMentions(packs);

    expect(mentions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          mention: "@qa.ui-regression-execution",
          kind: "skill",
          role: "qa",
        }),
        expect.objectContaining({
          mention: "@dev.frontend.build-qa",
          kind: "command",
          role: "developer",
        }),
        expect.objectContaining({
          mention: "@repo.marketing-bff-server",
          kind: "repo",
          sourceProjectId: "marketing-bff-server",
        }),
      ]),
    );
  });

  it("rejects capability pack metadata that leaks secret-like values", () => {
    const result = roleCapabilityPackSchema.safeParse({
      schema_version: "1.0",
      id: "bad-pack",
      role: "qa",
      label: "Bad Pack",
      summary: "Should be rejected",
      source_project: {
        id: "bad-source",
        label: "Bad Source",
        kind: "qa_automation",
        local_path: "/tmp/bad",
      },
      agent_endpoint: {
        tenant_id: "local-demo",
        user_id: "qa_user",
        role: "qa",
        agent_endpoint_id: "qa_bad_local",
        execution_mode: "manual_confirm",
        executor: {
          kind: "codex_cli",
          label: "Codex CLI",
          command: "codex",
        },
        approval_policy: {
          mode: "manual_confirm",
          require_human_for: ["run_command"],
          allow_auto_for: [],
        },
      },
      capability_sources: [
        {
          id: "bad_secret_source",
          type: "skill",
          name: "Bad Secret",
          summary: "Leaks a secret-like value",
          capabilities: ["qa"],
          approval_mode: "manual_confirm",
          enabled: true,
          metadata: {
            token: "abc",
          },
        },
      ],
      commands: [],
      hooks: [],
      constraints: [],
    });

    expect(result.success).toBe(false);
  });
});
