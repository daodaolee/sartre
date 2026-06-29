import type { RegisterAgentEndpointInput } from "../ports/handoff.repository";

export const localDemoProfiles = {
  dev: {
    schema_version: "1.0",
    tenant_id: "local-demo",
    user_id: "dev_user",
    role: "developer",
    agent_endpoint_id: "dev_codex_local",
    online: true,
    capabilities: ["generate_change_report", "create_handoff_pack"],
    execution_mode: "manual_confirm",
  },
  qa: {
    schema_version: "1.0",
    tenant_id: "local-demo",
    user_id: "qa_user",
    role: "qa",
    agent_endpoint_id: "qa_codex_local",
    online: false,
    capabilities: [
      "read_handoff_pack",
      "generate_test_scope",
      "upload_artifact",
    ],
    execution_mode: "manual_confirm",
  },
} satisfies Record<"dev" | "qa", RegisterAgentEndpointInput>;
