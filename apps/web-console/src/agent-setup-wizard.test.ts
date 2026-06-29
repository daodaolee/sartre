import { describe, expect, it } from "vitest";
import {
  deriveAgentSetupWizard,
  type SetupWizardDiagnostic,
} from "./agent-setup-wizard";

describe("agent setup wizard", () => {
  it("derives a manual-confirm QA setup path from diagnostics", () => {
    const wizard = deriveAgentSetupWizard({
      actor: "qa",
      diagnostics: [
        diagnostic("注册状态", "passed"),
        diagnostic("连接状态", "warning"),
        diagnostic("能力声明", "passed"),
        diagnostic("权限模式", "passed"),
        diagnostic("待处理投递", "warning"),
      ],
    });

    expect(wizard.endpointId).toBe("qa_codex_local");
    expect(wizard.recommendedExecutor).toBe("Codex CLI");
    expect(wizard.permissionMode).toBe("manual_confirm");
    expect(wizard.steps.map((step) => step.label)).toEqual([
      "岗位",
      "执行器",
      "能力",
      "权限",
      "健康",
      "试运行",
    ]);
    expect(wizard.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "健康",
          status: "warning",
          detail: "连接状态和待处理投递检查需要处理",
        }),
        expect.objectContaining({
          label: "试运行",
          status: "ready",
          action: "创建演示交接",
        }),
      ]),
    );
  });

  it("blocks health when diagnostics contain blocked items", () => {
    const wizard = deriveAgentSetupWizard({
      actor: "dev",
      diagnostics: [
        diagnostic("注册状态", "blocked"),
        diagnostic("能力声明", "blocked"),
      ],
    });

    expect(wizard.steps).toContainEqual(
      expect.objectContaining({
        label: "健康",
        status: "blocked",
        detail: "注册状态和能力声明检查被阻塞",
      }),
    );
    expect(wizard.steps).toContainEqual(
      expect.objectContaining({
        label: "试运行",
        status: "blocked",
        detail: "先解决阻塞诊断，再执行试运行交接",
      }),
    );
  });
});

function diagnostic(
  label: SetupWizardDiagnostic["label"],
  status: SetupWizardDiagnostic["status"],
): SetupWizardDiagnostic {
  return {
    label,
    status,
    detail: `${label} detail`,
  };
}
