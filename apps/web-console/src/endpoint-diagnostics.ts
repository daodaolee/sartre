import type { HandoffOverviewResponse } from "@sartre/contracts";
import { type LocalActor, localDemoProfiles } from "./hub-operations";

export type EndpointDiagnosticStatus = "passed" | "warning" | "blocked";

export type EndpointDiagnostic = {
  label: string;
  status: EndpointDiagnosticStatus;
  detail: string;
};

const requiredCapabilities: Record<LocalActor, string[]> = {
  dev: ["generate_change_report", "create_handoff_pack"],
  qa: ["read_handoff_pack", "generate_test_scope", "upload_artifact"],
};

export function deriveEndpointDiagnostics(input: {
  overview: HandoffOverviewResponse;
  actor: LocalActor;
}): EndpointDiagnostic[] {
  const profile = localDemoProfiles[input.actor];
  const endpoint = input.overview.agent_endpoints.find(
    (candidate) => candidate.agent_endpoint_id === profile.agent_endpoint_id,
  );

  if (!endpoint) {
    return [
      {
        label: "注册状态",
        status: "blocked",
        detail: `${profile.agent_endpoint_id} 尚未注册`,
      },
      {
        label: "连接状态",
        status: "blocked",
        detail: "请先注册端点，再发起连接",
      },
      {
        label: "能力声明",
        status: "blocked",
        detail: "端点不可用",
      },
      {
        label: "权限模式",
        status: "blocked",
        detail: "端点不可用",
      },
      pendingDeliveryDiagnostic(input.overview, profile.agent_endpoint_id),
    ];
  }

  return [
    {
      label: "注册状态",
      status: "passed",
      detail: `${profile.agent_endpoint_id} 已注册`,
    },
    {
      label: "连接状态",
      status: endpoint.online ? "passed" : "warning",
      detail: endpoint.online ? "端点在线" : "端点离线，请连接后接收待处理工作",
    },
    capabilityDiagnostic(input.actor, endpoint.capabilities),
    {
      label: "权限模式",
      status:
        endpoint.execution_mode === "manual_confirm" ? "passed" : "warning",
      detail:
        endpoint.execution_mode === "manual_confirm"
          ? "manual_confirm 会保留高风险动作的人工确认"
          : `请复核执行模式 ${endpoint.execution_mode}`,
    },
    ...reportedHealthDiagnostics(endpoint.health_report),
    pendingDeliveryDiagnostic(input.overview, endpoint.agent_endpoint_id),
  ];
}

function reportedHealthDiagnostics(
  healthReport:
    | HandoffOverviewResponse["agent_endpoints"][number]["health_report"]
    | undefined,
): EndpointDiagnostic[] {
  return (healthReport?.checks ?? []).map((check) => ({
    label: formatHealthCheckLabel(check.label),
    status: check.status,
    detail: formatHealthCheckDetail(check.detail),
  }));
}

function capabilityDiagnostic(
  actor: LocalActor,
  capabilities: string[],
): EndpointDiagnostic {
  const missing = requiredCapabilities[actor].filter(
    (capability) => !capabilities.includes(capability),
  );

  if (missing.length > 0) {
    return {
      label: "能力声明",
      status: "blocked",
      detail: `缺少 ${missing.join(", ")}`,
    };
  }

  return {
    label: "能力声明",
    status: "passed",
    detail: `${requiredCapabilities[actor].length} 项必需能力可用`,
  };
}

function pendingDeliveryDiagnostic(
  overview: HandoffOverviewResponse,
  endpointId: string,
): EndpointDiagnostic {
  const pendingCount = overview.deliveries.filter(
    (delivery) =>
      delivery.recipient_endpoint_id === endpointId &&
      (delivery.status === "pending_delivery" ||
        delivery.status === "delivered"),
  ).length;

  if (pendingCount === 0) {
    return {
      label: "待处理投递",
      status: "passed",
      detail: "暂无待处理投递",
    };
  }

  return {
    label: "待处理投递",
    status: "warning",
    detail: `${pendingCount} 条待处理投递`,
  };
}

function formatHealthCheckLabel(label: string) {
  const labels: Record<string, string> = {
    "Executor command": "执行器命令",
    Executor: "执行器",
    Workspace: "工作区",
    Inbox: "收件箱",
    Artifacts: "产物目录",
    "Trial run": "试运行",
  };
  return labels[label] ?? label;
}

function formatHealthCheckDetail(detail: string) {
  const details: Record<string, string> = {
    "Codex CLI unavailable": "Codex CLI 不可用",
    "Codex CLI is available": "Codex CLI 可用",
    "Codex CLI failed": "Codex CLI 执行失败",
    "Workspace path needs confirmation": "工作区路径需要确认",
    "Workspace control directory is writeable.": "工作区控制目录可写。",
    "Inbox path is ready for handoff packages.":
      "收件箱路径已准备好接收交接包。",
    "Artifact path is ready for local reports.":
      "产物路径已准备好保存本地报告。",
    "manual_confirm endpoint is ready for manual confirmation.":
      "manual_confirm 端点已准备好等待人工确认。",
    "Profile can receive a demo handoff and wait for manual confirmation.":
      "配置档可以接收演示交接，并等待人工确认。",
    "Profile needs a dry run before it should receive real handoffs.":
      "配置档需要先完成试运行，再接收真实交接。",
    "Cannot prepare .sartre/inbox: permission denied":
      "无法准备 .sartre/inbox：权限不足",
  };
  const exactDetail = details[detail];
  if (exactDetail) {
    return exactDetail;
  }
  if (detail.startsWith("Cannot prepare ")) {
    return detail.replace("Cannot prepare ", "无法准备 ").replace(": ", "：");
  }
  return detail;
}
