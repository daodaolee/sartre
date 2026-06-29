import {
  type AgentCapabilitySource,
  type ApprovalPolicy,
  type ExecutorBinding,
  type LocalDemoProfileName,
  localDemoProfileFacts,
} from "@sartre/contracts";

export type ConnectorProfile = {
  tenantId: string;
  userId: string;
  role: string;
  agentEndpointId: string;
  executionMode: "manual_confirm" | "mock";
  hubBaseUrl: string;
  capabilitySources: AgentCapabilitySource[];
  executor: ExecutorBinding;
  approvalPolicy: ApprovalPolicy;
};

export type ConnectorProfileName = LocalDemoProfileName;

export const defaultHubBaseUrl = "http://127.0.0.1:3000";

export const localDemoDevProfile: ConnectorProfile = toConnectorProfile({
  fact: localDemoProfileFacts.dev,
  capabilitySources: [
    {
      id: "skill_dev_change_report",
      type: "skill",
      name: "开发变更报告",
      summary: "读取本地改动并生成交接报告",
      capabilities: ["generate_change_report", "create_handoff_pack"],
      approval_mode: "manual_confirm",
      enabled: true,
      metadata: { path: ".agents/skills/dev-change-report/SKILL.md" },
    },
    {
      id: "command_dev_test",
      type: "command",
      name: "开发本地测试命令",
      summary: "在人工确认后执行开发侧本地验证命令",
      capabilities: ["run_command"],
      approval_mode: "manual_confirm",
      enabled: true,
    },
  ],
});

export const localDemoQaProfile: ConnectorProfile = toConnectorProfile({
  fact: localDemoProfileFacts.qa,
  capabilitySources: [
    {
      id: "skill_qa_test_scope",
      type: "skill",
      name: "QA 测试范围分析",
      summary: "读取交接包并生成测试范围",
      capabilities: ["read_handoff_pack", "generate_test_scope"],
      approval_mode: "manual_confirm",
      enabled: true,
      metadata: { path: ".agents/skills/qa-test-scope/SKILL.md" },
    },
    {
      id: "hook_delivery_accepted",
      type: "hook",
      name: "接收后准备提示词",
      summary: "delivery.accepted 后生成本地 Agent prompt",
      capabilities: ["prepare_prompt"],
      approval_mode: "prompt_only",
      enabled: true,
    },
    {
      id: "manual_prompt_qa",
      type: "manual_prompt",
      name: "人工确认执行",
      summary: "把任务上下文交给本地 Codex 或人工确认后执行",
      capabilities: ["read_handoff_pack", "write_artifact_report"],
      approval_mode: "manual_confirm",
      enabled: true,
    },
  ],
});

export function profileForName(name: ConnectorProfileName): ConnectorProfile {
  return name === "dev" ? localDemoDevProfile : localDemoQaProfile;
}

export function profileToText(profile: ConnectorProfile): string {
  return [
    `Tenant: ${profile.tenantId}`,
    `User: ${profile.userId}`,
    `Role: ${profile.role}`,
    `Endpoint: ${profile.agentEndpointId}`,
    `Execution Mode: ${profile.executionMode}`,
    `Executor: ${profile.executor.kind}`,
    `Capability Sources: ${profile.capabilitySources.length}`,
    `Hub: ${profile.hubBaseUrl}`,
  ].join("\n");
}

function toConnectorProfile(input: {
  fact: {
    tenant_id: string;
    user_id: string;
    role: string;
    agent_endpoint_id: string;
    execution_mode: "manual_confirm" | "mock";
  };
  capabilitySources: AgentCapabilitySource[];
}): ConnectorProfile {
  return {
    tenantId: input.fact.tenant_id,
    userId: input.fact.user_id,
    role: input.fact.role,
    agentEndpointId: input.fact.agent_endpoint_id,
    executionMode: input.fact.execution_mode,
    hubBaseUrl: defaultHubBaseUrl,
    capabilitySources: input.capabilitySources,
    executor: { kind: "manual_prompt", label: "Manual prompt" },
    approvalPolicy: {
      mode: input.fact.execution_mode,
      require_human_for: ["run_command", "write_file"],
      allow_auto_for: [],
    },
  };
}
