import type { EndpointDiagnostic } from "./endpoint-diagnostics";
import { type LocalActor, localDemoProfiles } from "./hub-operations";

export type SetupWizardStatus = "ready" | "warning" | "blocked";

export type SetupWizardDiagnostic = Pick<
  EndpointDiagnostic,
  "label" | "status" | "detail"
>;

export type SetupWizardStep = {
  label: string;
  status: SetupWizardStatus;
  detail: string;
  action?: string;
};

export type AgentSetupWizard = {
  actor: LocalActor;
  endpointId: string;
  recommendedExecutor: string;
  permissionMode: string;
  steps: SetupWizardStep[];
};

export function deriveAgentSetupWizard(input: {
  actor: LocalActor;
  diagnostics: SetupWizardDiagnostic[];
}): AgentSetupWizard {
  const profile = localDemoProfiles[input.actor];
  const blockedLabels = input.diagnostics
    .filter((diagnostic) => diagnostic.status === "blocked")
    .map((diagnostic) => diagnostic.label);
  const warningLabels = input.diagnostics
    .filter((diagnostic) => diagnostic.status === "warning")
    .map((diagnostic) => diagnostic.label);
  const healthStatus: SetupWizardStatus =
    blockedLabels.length > 0
      ? "blocked"
      : warningLabels.length > 0
        ? "warning"
        : "ready";

  return {
    actor: input.actor,
    endpointId: profile.agent_endpoint_id,
    recommendedExecutor: "Codex CLI",
    permissionMode: profile.execution_mode,
    steps: [
      {
        label: "岗位",
        status: "ready",
        detail: `${formatActor(input.actor)}端点映射到 ${profile.user_id}`,
      },
      {
        label: "执行器",
        status: "ready",
        detail: "本地演示推荐使用 Codex CLI 作为执行器",
      },
      {
        label: "能力",
        status: blockedLabels.some((label) => label === "能力声明")
          ? "blocked"
          : "ready",
        detail: summarizeDiagnostic(input.diagnostics, "能力声明"),
      },
      {
        label: "权限",
        status: "ready",
        detail: `${profile.execution_mode} 会保留高风险动作的人工确认`,
      },
      {
        label: "健康",
        status: healthStatus,
        detail: summarizeHealth(blockedLabels, warningLabels),
        action: "连接端点",
      },
      {
        label: "试运行",
        status: blockedLabels.length > 0 ? "blocked" : "ready",
        detail:
          blockedLabels.length > 0
            ? "先解决阻塞诊断，再执行试运行交接"
            : "端点配置就绪后创建演示交接",
        action: "创建演示交接",
      },
    ],
  };
}

function summarizeDiagnostic(
  diagnostics: SetupWizardDiagnostic[],
  label: string,
) {
  return (
    diagnostics.find((diagnostic) => diagnostic.label === label)?.detail ??
    `${label} 检查待执行`
  );
}

function summarizeHealth(blocked: string[], warnings: string[]) {
  if (blocked.length > 0) {
    return `${formatLabels(blocked)}检查被阻塞`;
  }
  if (warnings.length > 0) {
    return `${formatLabels(warnings)}检查需要处理`;
  }
  return "所有端点健康检查已就绪";
}

function formatLabels(labels: string[]) {
  return labels.join("和");
}

function formatActor(actor: LocalActor) {
  return actor === "qa" ? "质量" : "开发";
}
