import type { HandoffOverviewResponse } from "@sartre/contracts";
import { describe, expect, it } from "vitest";
import { deriveEndpointDiagnostics } from "./endpoint-diagnostics";
import { localDemoProfiles } from "./hub-operations";

describe("endpoint diagnostics", () => {
  it("marks an online endpoint with required capabilities as ready", () => {
    const diagnostics = deriveEndpointDiagnostics({
      overview: createOverview({
        qaEndpoint: {
          online: true,
          capabilities: [
            "read_handoff_pack",
            "generate_test_scope",
            "upload_artifact",
          ],
        },
        deliveries: [],
      }),
      actor: "qa",
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "注册状态",
          status: "passed",
          detail: "qa_codex_local 已注册",
        }),
        expect.objectContaining({
          label: "连接状态",
          status: "passed",
          detail: "端点在线",
        }),
        expect.objectContaining({
          label: "能力声明",
          status: "passed",
          detail: "3 项必需能力可用",
        }),
        expect.objectContaining({
          label: "待处理投递",
          status: "passed",
          detail: "暂无待处理投递",
        }),
      ]),
    );
  });

  it("warns when an endpoint is offline and has pending deliveries", () => {
    const diagnostics = deriveEndpointDiagnostics({
      overview: createOverview({
        qaEndpoint: {
          online: false,
          capabilities: [
            "read_handoff_pack",
            "generate_test_scope",
            "upload_artifact",
          ],
        },
        deliveries: [
          {
            id: "delivery_pending",
            status: "pending_delivery",
          },
        ],
      }),
      actor: "qa",
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "连接状态",
          status: "warning",
          detail: "端点离线，请连接后接收待处理工作",
        }),
        expect.objectContaining({
          label: "待处理投递",
          status: "warning",
          detail: "1 条待处理投递",
        }),
      ]),
    );
  });

  it("blocks missing endpoints and missing required capabilities", () => {
    const missingEndpoint = deriveEndpointDiagnostics({
      overview: createOverview({
        qaEndpoint: null,
        deliveries: [],
      }),
      actor: "qa",
    });
    expect(missingEndpoint[0]).toMatchObject({
      label: "注册状态",
      status: "blocked",
      detail: "qa_codex_local 尚未注册",
    });

    const missingCapabilities = deriveEndpointDiagnostics({
      overview: createOverview({
        qaEndpoint: {
          online: true,
          capabilities: ["read_handoff_pack"],
        },
        deliveries: [],
      }),
      actor: "qa",
    });
    expect(missingCapabilities).toContainEqual(
      expect.objectContaining({
        label: "能力声明",
        status: "blocked",
        detail: "缺少 generate_test_scope, upload_artifact",
      }),
    );
  });

  it("includes reported endpoint health checks in diagnostics", () => {
    const diagnostics = deriveEndpointDiagnostics({
      overview: createOverview({
        qaEndpoint: {
          online: true,
          capabilities: [
            "read_handoff_pack",
            "generate_test_scope",
            "upload_artifact",
          ],
          health_report: {
            schema_version: "1.0",
            tenant_id: "local-demo",
            endpoint_id: "qa_codex_local",
            reported_at: "2026-06-23T00:00:02.000Z",
            checks: [
              {
                key: "executor",
                label: "Executor command",
                status: "blocked",
                detail: "Codex CLI unavailable",
                observed_at: "2026-06-23T00:00:00.000Z",
              },
              {
                key: "workspace",
                label: "Workspace",
                status: "warning",
                detail: "Workspace path needs confirmation",
                observed_at: "2026-06-23T00:00:01.000Z",
              },
            ],
          },
        },
        deliveries: [],
      }),
      actor: "qa",
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "执行器命令",
          status: "blocked",
          detail: "Codex CLI 不可用",
        }),
        expect.objectContaining({
          label: "工作区",
          status: "warning",
          detail: "工作区路径需要确认",
        }),
      ]),
    );
  });
});

function createOverview(input: {
  qaEndpoint: null | {
    online: boolean;
    capabilities: string[];
    health_report?: HandoffOverviewResponse["agent_endpoints"][number]["health_report"];
  };
  deliveries: Array<{
    id: string;
    status:
      | "pending_delivery"
      | "delivered"
      | "acknowledged"
      | "failed"
      | "expired";
  }>;
}): HandoffOverviewResponse {
  return {
    schema_version: "1.0",
    tenant_id: "local-demo",
    generated_at: "2026-06-23T00:00:00.000Z",
    agent_endpoints:
      input.qaEndpoint === null
        ? []
        : [
            {
              schema_version: "1.0",
              tenant_id: "local-demo",
              user_id: localDemoProfiles.qa.user_id,
              role: localDemoProfiles.qa.role,
              agent_endpoint_id: localDemoProfiles.qa.agent_endpoint_id,
              online: input.qaEndpoint.online,
              capabilities: input.qaEndpoint.capabilities,
              execution_mode: "manual_confirm",
              capability_sources: [],
              executor: {
                kind: "manual_prompt" as const,
                label: "Manual prompt",
              },
              approval_policy: {
                mode: "manual_confirm" as const,
                require_human_for: [],
                allow_auto_for: [],
              },
              updated_at: "2026-06-23T00:00:00.000Z",
              health_report: input.qaEndpoint.health_report ?? null,
            },
          ].map(({ schema_version: _schemaVersion, ...endpoint }) => endpoint),
    handoffs: [],
    deliveries: input.deliveries.map((delivery) => ({
      id: delivery.id,
      handoff_id: `handoff_${delivery.id}`,
      recipient_endpoint_id: localDemoProfiles.qa.agent_endpoint_id,
      cursor: 1,
      status: delivery.status,
      delivered_at: null,
      acknowledged_at: null,
      title: "QA pending work",
      summary: "Run diagnostics",
      from: {
        user_id: localDemoProfiles.dev.user_id,
        role: localDemoProfiles.dev.role,
        agent_endpoint_id: localDemoProfiles.dev.agent_endpoint_id,
      },
      to: {
        user_id: localDemoProfiles.qa.user_id,
        role: localDemoProfiles.qa.role,
        agent_endpoint_id: localDemoProfiles.qa.agent_endpoint_id,
      },
    })),
    timeline: [],
    reports: [],
    metrics: {
      pending_handoffs: input.deliveries.length,
      failed_deliveries: 0,
      reports_returned: 0,
      endpoint_online: input.qaEndpoint?.online ? 1 : 0,
      endpoint_total: input.qaEndpoint ? 1 : 0,
    },
  };
}
