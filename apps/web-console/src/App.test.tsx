// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import type {
  ConversationDetailResponse,
  HandoffOverviewResponse,
  ProviderModelCapability,
  ProviderModelRegistryListResponse,
  ProviderModelSelectionResponse,
  RoleCapabilityCatalogResponse,
} from "@sartre/contracts";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

const stylesheet = readFileSync("src/styles.css", "utf8");
const onboardingStorageKey = "sartre:web-console:onboarding-dismissed:v1";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("Web Console control surface", () => {
  it("declares the Vercel Geist visual contract", () => {
    renderDismissed(createElement(App));

    expect(
      screen
        .getByTestId("web-console-frame")
        .getAttribute("data-design-system"),
    ).toBe("vercel-geist");

    for (const expectedToken of [
      "--geist-background-100: #ffffff",
      "--geist-background-200: #fafafa",
      "--geist-primary: #171717",
      "--geist-secondary: #4d4d4d",
      "--geist-gray-alpha-400: #00000014",
      "--geist-blue-700: #006bff",
      "--geist-dark-background-100: #000000",
      "--geist-dark-primary: #ededed",
      "--geist-dark-secondary: #a0a0a0",
      "--geist-dark-gray-alpha-400: #ffffff24",
      "--geist-dark-blue-900: #47a8ff",
      "--space-2: 8px",
      "--space-4: 16px",
      "--space-8: 32px",
      "--radius-sm: 6px",
      "--control-height: 40px",
      "--geist-focus-ring",
      ".nav-icon",
      ".nav-footer",
      ".agent-card-grid",
      ".hook-config-grid",
      ".settings-list-card",
      ".task-workspace",
      ".project-board",
      ".project-column",
      ".project-table",
      ".task-detail-panel",
      ".execution-facts-panel",
      ".onboarding-layer",
    ]) {
      expect(stylesheet).toContain(expectedToken);
    }

    expect(stylesheet).not.toContain(".surface-header");
    expect(stylesheet).not.toContain(".summary-grid");
    expect(stylesheet).not.toContain(".nav-glyph");
    const sourceListBlock =
      stylesheet.match(/\.source-list\s*{[^}]*}/)?.[0] ?? "";
    expect(sourceListBlock).not.toMatch(/(^|\n)\s*height:\s*100vh;/);
    expect(sourceListBlock).toContain("align-self: stretch");
    expect(sourceListBlock).toContain("min-height: 100vh");
  });

  it("opens on a focused inbox board and only reveals timeline after selecting a task", async () => {
    const conversationLoader = vi.fn(async () => ({
      list: {
        schema_version: "1.0" as const,
        tenant_id: "local-demo",
        endpoint_id: "dev_codex_local",
        conversations: [
          {
            ...executionConversationFixture.conversation,
            latest_message: executionConversationFixture.messages[1] ?? null,
            message_count: 2,
            latest_projection:
              executionConversationFixture.context_projections[0] ?? null,
          },
        ],
      },
      detail: executionConversationFixture,
    }));
    const providerRegistryLoader = vi.fn(async () =>
      createProviderRegistryProjection("dev"),
    );
    const { container } = renderDismissed(
      createElement(App, {
        overviewLoader: createPopulatedOverview,
        conversationLoader,
        providerRegistryLoader,
      }),
    );

    const navigation = screen.getByRole("navigation", {
      name: "Sartre 控制台",
    });
    for (const item of [
      "工作区",
      "能力",
      "收件箱",
      "Agent",
      "Hooks",
      "Skills",
      "设置",
    ]) {
      expect(within(navigation).getByText(item)).toBeTruthy();
    }
    for (const removedItem of ["报告", "健康", "监控", "系统", "配置"]) {
      expect(within(navigation).queryByText(removedItem)).toBeNull();
    }
    expect(within(navigation).queryByText(/computer|电脑/i)).toBeNull();
    expect(within(navigation).queryByText("总览")).toBeNull();
    expect(within(navigation).queryByText("交接")).toBeNull();
    expect(container.querySelector(".nav-glyph")).toBeNull();
    expect(container.querySelector(".nav-footer")).toBeTruthy();
    expect(
      container.querySelectorAll(".nav-icon").length,
    ).toBeGreaterThanOrEqual(5);
    for (const index of ["1", "2", "3"]) {
      expect(within(navigation).queryByText(index)).toBeNull();
    }

    expect(await screen.findByText("开发端点")).toBeTruthy();
    expect(screen.getAllByText("dev_codex_local").length).toBeGreaterThan(0);
    expect(screen.queryByText("已连接 Hub")).toBeNull();
    expect(
      screen.getByRole("tooltip", { name: "端点连接状态提示" }).textContent,
    ).toContain("绿色表示当前岗位数据已从 Hub 加载");

    const workspace = await screen.findByRole("region", {
      name: "任务协作面板",
    });
    expect(within(workspace).getByText("需求版本")).toBeTruthy();
    expect(
      (
        within(workspace).getByRole("combobox", {
          name: "需求版本",
        }) as HTMLSelectElement
      ).value,
    ).toBe("v0.2-local-collaboration");
    expect(
      within(workspace).getAllByText("checkout-flow-regression").length,
    ).toBeGreaterThan(0);

    for (const column of ["已发送", "已接收", "已结束"]) {
      expect(
        within(workspace).getByRole("region", { name: column }),
      ).toBeTruthy();
    }
    for (const removedColumn of ["待办", "处理中"]) {
      expect(
        within(workspace).queryByRole("region", { name: removedColumn }),
      ).toBeNull();
    }
    expect(
      within(workspace).getByRole("button", { name: "新增任务" }),
    ).toBeTruthy();

    const sentColumn = within(workspace).getByRole("region", {
      name: "已发送",
    });
    expect(
      within(sentColumn).getAllByText("checkout-flow-regression").length,
    ).toBeGreaterThan(0);
    expect(within(sentColumn).getByText("发给 质量")).toBeTruthy();
    expect(within(sentColumn).getByText("00:04")).toBeTruthy();
    expect(
      within(sentColumn).queryByText("执行质量冒烟测试并返回报告"),
    ).toBeNull();
    expect(within(sentColumn).queryByText("收发状态：处理中")).toBeNull();
    expect(
      within(workspace).queryByRole("complementary", {
        name: "任务详情",
      }),
    ).toBeNull();
    expect(
      within(workspace).queryByRole("region", {
        name: "任务时间线",
      }),
    ).toBeNull();

    fireEvent.click(
      within(sentColumn).getByRole("button", {
        name: /checkout-flow-regression/,
      }),
    );

    const detail = within(workspace).getByRole("complementary", {
      name: "任务详情",
    });
    expect(within(detail).getByText("执行质量冒烟测试并返回报告")).toBeTruthy();
    expect(within(detail).getByText("发起方")).toBeTruthy();
    expect(within(detail).getByText("接收方")).toBeTruthy();
    expect(
      within(detail).getAllByText("dev_codex_local").length,
    ).toBeGreaterThan(0);
    expect(
      within(detail).getAllByText("qa_codex_local").length,
    ).toBeGreaterThan(0);

    const timeline = within(detail).getByRole("region", {
      name: "任务时间线",
    });
    for (const event of ["已入队", "已投递", "已确认", "报告已返回"]) {
      expect(within(timeline).getByText(event)).toBeTruthy();
    }
    expect(within(detail).getByText("qa-report.md")).toBeTruthy();

    const executionFacts = await within(detail).findByRole("region", {
      name: "运行事实",
    });
    expect(
      within(executionFacts).getByText("model_run_delivery_1"),
    ).toBeTruthy();
    expect(within(executionFacts).getByText("codex / gpt-5")).toBeTruthy();
    expect(
      within(executionFacts).getByText("QA Agent 已生成测试范围和风险报告。"),
    ).toBeTruthy();
    expect(conversationLoader).toHaveBeenCalledWith({
      actor: "dev",
      endpointId: "dev_codex_local",
    });

    fireEvent.click(within(workspace).getByRole("button", { name: "表格" }));
    const table = within(workspace).getByRole("table", { name: "任务表格" });
    for (const header of [
      "需求版本",
      "Feature",
      "任务",
      "收发状态",
      "Agent",
      "状态",
    ]) {
      expect(within(table).getByText(header)).toBeTruthy();
    }
    expect(
      within(table).getAllByText("checkout-flow-regression").length,
    ).toBeGreaterThan(0);
  });

  it("excludes internal demo handoffs from the normal inbox", async () => {
    renderDismissed(
      createElement(App, {
        overviewLoader: async () =>
          createActorScopedOverview("web-console-demo-handoff"),
      }),
    );

    const workspace = await screen.findByRole("region", {
      name: "任务协作面板",
    });
    expect(
      within(workspace).queryByRole("button", { name: /试运行/ }),
    ).toBeNull();
    expect(within(workspace).queryByText("试运行交接任务")).toBeNull();
    expect(
      within(workspace).queryByText("web-console-demo-handoff"),
    ).toBeNull();
    expect(
      within(workspace).queryByRole("complementary", { name: "任务详情" }),
    ).toBeNull();
  });

  it("shows failed execution error facts in task detail", async () => {
    const baseModelRun = executionConversationFixture.model_runs[0];
    if (!baseModelRun) {
      throw new Error("executionConversationFixture requires a model run");
    }
    const failedConversation: ConversationDetailResponse = {
      ...executionConversationFixture,
      messages: executionConversationFixture.messages.slice(0, 1),
      model_runs: [
        {
          ...baseModelRun,
          status: "failed",
          error: {
            category: "NeedUserAction",
            message: "Please login to Codex before running this command",
          },
          metadata: {
            delivery_id: "delivery_1",
            error_category: "NeedUserAction",
            error_message: "Please login to Codex before running this command",
          },
        },
      ],
    };
    const conversationLoader = vi.fn(async () => ({
      list: {
        schema_version: "1.0" as const,
        tenant_id: "local-demo",
        endpoint_id: "dev_codex_local",
        conversations: [
          {
            ...failedConversation.conversation,
            latest_message: failedConversation.messages[0] ?? null,
            message_count: 1,
            latest_projection:
              failedConversation.context_projections[0] ?? null,
          },
        ],
      },
      detail: failedConversation,
    }));

    renderDismissed(
      createElement(App, {
        overviewLoader: createPopulatedOverview,
        conversationLoader,
      }),
    );

    const workspace = await screen.findByRole("region", {
      name: "任务协作面板",
    });
    const sentColumn = within(workspace).getByRole("region", {
      name: "已发送",
    });
    fireEvent.click(
      within(sentColumn).getByRole("button", {
        name: /checkout-flow-regression/,
      }),
    );

    await waitFor(() => expect(conversationLoader).toHaveBeenCalled());
    const detail = within(workspace).getByRole("complementary", {
      name: "任务详情",
    });
    const executionFacts = within(detail).getByRole("region", {
      name: "运行事实",
    });
    await waitFor(() =>
      expect(within(executionFacts).getByText("失败")).toBeTruthy(),
    );
    expect(within(executionFacts).getByText("NeedUserAction")).toBeTruthy();
    expect(
      within(executionFacts).getByText(
        "Please login to Codex before running this command",
      ),
    ).toBeTruthy();
  });

  it("reloads the board when switching local endpoint identity", async () => {
    const overviewLoader = vi.fn(
      async (context?: { actor?: "dev" | "qa"; endpointId?: string }) =>
        context?.actor === "qa"
          ? createActorScopedOverview("qa-to-dev-checklist")
          : createActorScopedOverview("dev-to-qa-release"),
    );

    renderDismissed(createElement(App, { overviewLoader }));

    await waitFor(() =>
      expect(screen.getAllByText("dev-to-qa-release").length).toBeGreaterThan(
        0,
      ),
    );
    expect(overviewLoader).toHaveBeenLastCalledWith({
      actor: "dev",
      endpointId: "dev_codex_local",
    });

    fireEvent.change(screen.getByLabelText("当前岗位"), {
      target: { value: "qa" },
    });

    await waitFor(() =>
      expect(screen.getAllByText("qa-to-dev-checklist").length).toBeGreaterThan(
        0,
      ),
    );
    expect(overviewLoader).toHaveBeenLastCalledWith({
      actor: "qa",
      endpointId: "qa_codex_local",
    });
    expect(screen.getByText("质量端点")).toBeTruthy();
  });

  it("shows endpoint-scoped conversation ledgers and provider projections", async () => {
    const conversationLoader = vi.fn(async () => ({
      list: {
        schema_version: "1.0",
        tenant_id: "local-demo",
        endpoint_id: "dev_codex_local",
        conversations: [
          {
            ...conversationFixture.conversation,
            latest_message: conversationFixture.messages[0],
            message_count: 1,
            latest_projection: conversationFixture.context_projections[0],
          },
        ],
      },
      detail: conversationFixture,
    }));

    renderDismissed(
      createElement(App, {
        overviewLoader: createPopulatedOverview,
        conversationLoader,
      } as never),
    );

    fireEvent.click(await screen.findByRole("button", { name: "会话" }));

    const workspace = await screen.findByRole("region", {
      name: "会话账本",
    });
    expect(within(workspace).getByText("订单模块联调")).toBeTruthy();
    expect(within(workspace).getByText("dev_codex_local")).toBeTruthy();
    expect(within(workspace).getByText("qa_codex_local")).toBeTruthy();
    expect(within(workspace).getByText("请准备测试范围。")).toBeTruthy();
    expect(within(workspace).getByText("测试范围已确认。")).toBeTruthy();
    expect(within(workspace).getByText("anthropic / claude-code")).toBeTruthy();
    expect(within(workspace).getByText("projection_1")).toBeTruthy();
    expect(
      within(workspace).queryByRole("textbox", { name: /发送消息/ }),
    ).toBeNull();
    expect(conversationLoader).toHaveBeenCalledWith({
      actor: "dev",
      endpointId: "dev_codex_local",
    });
  });

  it("shows the current endpoint provider model registry without secret or execution controls", async () => {
    const providerRegistryLoader = vi.fn(
      async (context: { actor: "dev" | "qa"; endpointId: string }) =>
        context.endpointId === "qa_codex_local"
          ? createProviderRegistryProjection("qa")
          : createProviderRegistryProjection("dev"),
    );

    renderDismissed(
      createElement(App, {
        overviewLoader: createPopulatedOverview,
        providerRegistryLoader,
      } as never),
    );

    const navigation = screen.getByRole("navigation", {
      name: "Sartre 控制台",
    });
    fireEvent.click(within(navigation).getByRole("button", { name: /模型/ }));

    const registry = await screen.findByRole("region", {
      name: "模型注册表",
    });
    expect(providerRegistryLoader).toHaveBeenLastCalledWith({
      actor: "dev",
      endpointId: "dev_codex_local",
    });
    expect(within(registry).getAllByText("Codex GPT-5").length).toBeGreaterThan(
      0,
    );
    expect(within(registry).getByText("openai / gpt-5-codex")).toBeTruthy();
    expect(within(registry).getByText("Codex CLI")).toBeTruthy();
    expect(within(registry).getByText("默认模型")).toBeTruthy();
    expect(within(registry).getByText("health: passed")).toBeTruthy();
    expect(within(registry).getByText("128,000 context")).toBeTruthy();
    expect(within(registry).getByText("16,384 output")).toBeTruthy();
    for (const capability of ["chat", "tool_use", "repo_context"]) {
      expect(within(registry).getByText(capability)).toBeTruthy();
    }

    expect(within(registry).queryByRole("textbox")).toBeNull();
    expect(
      within(registry).queryByRole("button", { name: /执行|运行|发送/ }),
    ).toBeNull();
    expect(
      within(registry).queryByText(/API Key|secret|token|密钥/i),
    ).toBeNull();

    fireEvent.change(screen.getByLabelText("当前岗位"), {
      target: { value: "qa" },
    });

    await waitFor(() =>
      expect(providerRegistryLoader).toHaveBeenLastCalledWith({
        actor: "qa",
        endpointId: "qa_codex_local",
      }),
    );
    expect(
      (await screen.findAllByText("Claude Code Sonnet")).length,
    ).toBeGreaterThan(0);
    const updatedRegistry = screen.getByRole("region", {
      name: "模型注册表",
    });
    expect(
      within(updatedRegistry).getByText("anthropic / claude-code"),
    ).toBeTruthy();
    expect(within(updatedRegistry).queryByText("Codex GPT-5")).toBeNull();
  });

  it("switches sidebar views without dead menu items and scopes capability pages to the current actor", async () => {
    renderDismissed(
      createElement(App, { overviewLoader: createPopulatedOverview }),
    );

    const navigation = screen.getByRole("navigation", {
      name: "Sartre 控制台",
    });

    fireEvent.click(within(navigation).getByRole("button", { name: /Agent/ }));
    const devAgents = await screen.findByRole("region", { name: "Agent 列表" });
    expect(within(devAgents).getByText("dev_codex_local")).toBeTruthy();
    expect(within(devAgents).queryByText("qa_codex_local")).toBeNull();
    expect(document.querySelector(".agent-card-grid")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("当前岗位"), {
      target: { value: "qa" },
    });

    await waitFor(() =>
      expect(within(devAgents).getByText("qa_codex_local")).toBeTruthy(),
    );
    expect(within(devAgents).queryByText("dev_codex_local")).toBeNull();

    fireEvent.click(within(navigation).getByRole("button", { name: /Hooks/ }));
    const hooks = await screen.findByRole("region", { name: "Hooks" });
    expect(within(hooks).getByText("Hook 配置")).toBeTruthy();
    expect(within(hooks).getByText("PreToolUse")).toBeTruthy();
    expect(within(hooks).getByText("PostToolUse")).toBeTruthy();
    expect(within(hooks).getAllByRole("button", { name: "Test" }).length).toBe(
      2,
    );
    expect(within(hooks).queryByText("Connector 命令")).toBeNull();
    expect(
      within(hooks).queryByText("pnpm --filter", { exact: false }),
    ).toBeNull();

    fireEvent.click(within(navigation).getByRole("button", { name: /Skills/ }));
    const skills = await screen.findByRole("region", { name: "Skills" });
    expect(within(skills).getByText("岗位 Skills")).toBeTruthy();
    expect(within(skills).getByText("交接包阅读")).toBeTruthy();

    expect(
      within(navigation).queryByRole("button", { name: /报告/ }),
    ).toBeNull();
    expect(
      within(navigation).queryByRole("button", { name: /健康/ }),
    ).toBeNull();

    fireEvent.click(within(navigation).getByRole("button", { name: /设置/ }));
    const settings = await screen.findByRole("region", { name: "设置" });
    expect(within(settings).getByText("权限模式")).toBeTruthy();
    expect(within(settings).getByText("manual_confirm")).toBeTruthy();
    expect(within(settings).getByText("连接状态")).toBeTruthy();
    expect(screen.getByRole("button", { name: "重新打开引导" })).toBeTruthy();
    expect(within(settings).queryByText("能力声明")).toBeNull();
    expect(within(settings).queryByText("注册状态")).toBeNull();
    expect(within(settings).queryByText("待处理投递")).toBeNull();
  }, 10_000);

  it("projects Agent, Hook, and Skill surfaces from endpoint capability manifests", async () => {
    renderDismissed(
      createElement(App, {
        overviewLoader: () =>
          Promise.resolve(createCapabilityManifestOverview()),
      }),
    );

    const navigation = screen.getByRole("navigation", {
      name: "Sartre 控制台",
    });

    fireEvent.change(screen.getByLabelText("当前岗位"), {
      target: { value: "qa" },
    });

    fireEvent.click(within(navigation).getByRole("button", { name: /Agent/ }));
    const agents = await screen.findByRole("region", { name: "Agent 列表" });
    expect(within(agents).getByText("Codex CLI")).toBeTruthy();

    fireEvent.click(within(navigation).getByRole("button", { name: /Hooks/ }));
    const hooks = await screen.findByRole("region", { name: "Hooks" });
    expect(within(hooks).getByText("接收后准备提示词")).toBeTruthy();
    expect(within(hooks).queryByText("PreToolUse")).toBeNull();

    fireEvent.click(within(navigation).getByRole("button", { name: /Skills/ }));
    const skills = await screen.findByRole("region", { name: "Skills" });
    expect(within(skills).getByText("QA 测试范围分析")).toBeTruthy();
    expect(within(skills).queryByText("交接包阅读")).toBeNull();
  });

  it("opens a full-screen onboarding guide on first load and can reopen it from settings", async () => {
    render(createElement(App, { overviewLoader: createPopulatedOverview }));

    expect(
      await screen.findByRole("dialog", { name: "Agent 创建引导" }),
    ).toBeTruthy();
    expect(screen.queryByText("能力声明")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "跳过" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Agent 创建引导" }),
      ).toBeNull(),
    );

    const navigation = screen.getByRole("navigation", {
      name: "Sartre 控制台",
    });
    fireEvent.click(within(navigation).getByRole("button", { name: /设置/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "重新打开引导" }),
    );

    expect(
      await screen.findByRole("dialog", { name: "Agent 创建引导" }),
    ).toBeTruthy();
  });

  it("lets the receiving role run an Agent or manually reply from the detail panel", async () => {
    const operations = createOperationsStub();
    renderDismissed(
      createElement(App, {
        overviewLoader: createPopulatedOverview,
        operations,
      }),
    );

    fireEvent.change(screen.getByLabelText("当前岗位"), {
      target: { value: "qa" },
    });

    const workspace = await screen.findByRole("region", {
      name: "任务协作面板",
    });
    fireEvent.click(
      within(workspace).getByRole("button", {
        name: /checkout-flow-regression/,
      }),
    );

    const detail = await within(workspace).findByRole("complementary", {
      name: "任务详情",
    });

    const agentPanel = within(detail).getByRole("region", {
      name: "Agent 执行",
    });
    fireEvent.click(
      within(agentPanel).getByRole("button", { name: "交给 Agent 执行" }),
    );
    const confirmModal = await screen.findByRole("dialog", {
      name: "确认交给 Agent 执行",
    });
    expect(operations.acceptDelivery).not.toHaveBeenCalled();
    fireEvent.click(
      within(confirmModal).getByRole("button", { name: "确认执行" }),
    );
    await waitFor(() =>
      expect(operations.acceptDelivery).toHaveBeenCalledWith(
        "delivery_1",
        "qa_codex_local",
      ),
    );
    expect(
      (await screen.findByRole("status", { name: "操作反馈" })).textContent,
    ).toContain("已放行 delivery_1");

    const replyPanel = within(detail).getByRole("region", {
      name: "人工回传",
    });
    const replyEditor = within(replyPanel).getByRole("textbox", {
      name: "回传内容",
    });
    replyEditor.textContent = "质量已验证，发现支付按钮在 Safari 下不可点击。";
    fireEvent.input(replyEditor);
    fireEvent.click(
      within(replyPanel).getByRole("button", { name: "发送给对方 Agent" }),
    );
    fireEvent.click(
      within(replyPanel).getByRole("button", { name: "标记已结束" }),
    );

    expect(operations.sendTaskReply).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        deliveryId: "delivery_1",
        currentStatus: "acknowledged",
        actorEndpointId: "qa_codex_local",
        targetAgentEndpointId: "dev_codex_local",
        content: "质量已验证，发现支付按钮在 Safari 下不可点击。",
        closeTask: false,
      }),
    );
    expect(operations.sendTaskReply).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        deliveryId: "delivery_1",
        closeTask: true,
      }),
    );
  });

  it("keeps Agent execution unavailable when the current role has no online Agent", async () => {
    const operations = createOperationsStub();
    renderDismissed(
      createElement(App, {
        overviewLoader: createQaOfflineOverview,
        operations,
      }),
    );

    fireEvent.change(screen.getByLabelText("当前岗位"), {
      target: { value: "qa" },
    });

    const workspace = await screen.findByRole("region", {
      name: "任务协作面板",
    });
    fireEvent.click(
      within(workspace).getByRole("button", {
        name: /checkout-flow-regression/,
      }),
    );

    const detail = await within(workspace).findByRole("complementary", {
      name: "任务详情",
    });
    const agentPanel = within(detail).getByRole("region", {
      name: "Agent 执行",
    });

    expect(
      within(agentPanel).getByText("当前岗位没有可执行 Agent"),
    ).toBeTruthy();
    expect(
      within(agentPanel).queryByRole("button", { name: "交给 Agent 执行" }),
    ).toBeNull();
    expect(
      within(detail).getByRole("region", { name: "人工回传" }),
    ).toBeTruthy();
    expect(operations.acceptDelivery).not.toHaveBeenCalled();
  });

  it("classifies a QA reply as sent for QA and received for Dev", async () => {
    renderDismissed(
      createElement(App, {
        overviewLoader: createReturnedToDevOverview,
      }),
    );

    fireEvent.change(screen.getByLabelText("当前岗位"), {
      target: { value: "qa" },
    });

    const qaWorkspace = await screen.findByRole("region", {
      name: "任务协作面板",
    });
    const qaSent = within(qaWorkspace).getByRole("region", {
      name: "已发送",
    });
    const qaReceived = within(qaWorkspace).getByRole("region", {
      name: "已接收",
    });
    expect(within(qaSent).getByText("checkout-flow-regression")).toBeTruthy();
    expect(
      within(qaReceived).queryByText("checkout-flow-regression"),
    ).toBeNull();

    fireEvent.change(screen.getByLabelText("当前岗位"), {
      target: { value: "dev" },
    });

    await screen.findByText("开发端点");
    const devWorkspace = await screen.findByRole("region", {
      name: "任务协作面板",
    });
    const devSent = within(devWorkspace).getByRole("region", {
      name: "已发送",
    });
    const devReceived = within(devWorkspace).getByRole("region", {
      name: "已接收",
    });
    expect(
      within(devReceived).getByText("checkout-flow-regression"),
    ).toBeTruthy();
    expect(within(devSent).queryByText("checkout-flow-regression")).toBeNull();
  });

  it("lets users mention uploaded files from the Tiptap editor", async () => {
    const operations = createOperationsStub();
    renderDismissed(
      createElement(App, {
        overviewLoader: createPopulatedOverview,
        operations,
      }),
    );

    const workspace = await screen.findByRole("region", {
      name: "任务协作面板",
    });
    fireEvent.click(
      within(workspace).getByRole("button", { name: "新增任务" }),
    );

    const creationPage = await screen.findByRole("region", {
      name: "创建任务",
    });
    fireEvent.change(within(creationPage).getByLabelText("标题"), {
      target: { value: "v0.2 checkout: 支付回归" },
    });
    fireEvent.change(within(creationPage).getByLabelText("描述上传文件"), {
      target: {
        files: [new File(["first"], "图片1.png", { type: "image/png" })],
      },
    });

    const description = within(creationPage).getByRole("textbox", {
      name: "描述",
    });
    description.textContent = "把 @图 的问题交给质量看";
    fireEvent.input(description);

    const mentionList = await within(creationPage).findByRole("listbox", {
      name: "描述可引用对象",
    });
    fireEvent.click(
      within(mentionList).getByRole("option", { name: "图片1.png" }),
    );

    expect(within(creationPage).getByText("@图片1.png")).toBeTruthy();
    fireEvent.click(within(creationPage).getByRole("button", { name: "发送" }));

    await waitFor(() =>
      expect(operations.createTaskHandoff).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining("@图片1.png"),
          descriptionHtml: expect.stringContaining('data-type="mention"'),
          attachments: [expect.objectContaining({ name: "图片1.png" })],
        }),
      ),
    );
  });

  it("lets users mention role capabilities from the Tiptap editor", async () => {
    const operations = createOperationsStub();
    renderDismissed(
      createElement(App, {
        overviewLoader: createPopulatedOverview,
        operations,
        roleCapabilityCatalogLoader: async () => roleCapabilityCatalogFixture,
      }),
    );

    const workspace = await screen.findByRole("region", {
      name: "任务协作面板",
    });
    fireEvent.click(
      within(workspace).getByRole("button", { name: "新增任务" }),
    );

    const creationPage = await screen.findByRole("region", {
      name: "创建任务",
    });
    fireEvent.change(within(creationPage).getByLabelText("标题"), {
      target: { value: "v0.2 checkout: 支付回归" },
    });
    const description = within(creationPage).getByRole("textbox", {
      name: "描述",
    });
    description.textContent = "请 @ui 执行回归";
    fireEvent.input(description);

    const mentionList = await within(creationPage).findByRole("listbox", {
      name: "描述可引用对象",
    });
    fireEvent.click(
      within(mentionList).getByRole("option", {
        name: /@qa.ui-regression-execution/,
      }),
    );

    expect(
      within(creationPage).getAllByText("@qa.ui-regression-execution").length,
    ).toBeGreaterThan(0);
    const referencedCapabilities = within(creationPage).getByRole("group", {
      name: "描述已引用能力",
    });
    fireEvent.click(
      within(referencedCapabilities).getByRole("button", {
        name: /@qa.ui-regression-execution/,
      }),
    );
    const capabilityPopover = await screen.findByRole("dialog", {
      name: "能力详情",
    });
    expect(within(capabilityPopover).getByText("ai-native-qa")).toBeTruthy();
    expect(
      within(capabilityPopover).getByText("Run reviewed UI regression."),
    ).toBeTruthy();

    fireEvent.click(within(creationPage).getByRole("button", { name: "发送" }));

    await waitFor(() =>
      expect(operations.createTaskHandoff).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining("@qa.ui-regression-execution"),
          capabilityReferences: [
            expect.objectContaining({
              mention: "@qa.ui-regression-execution",
              targetId: "qa_skill_ui_regression_execution",
              sourceProjectId: "ai-native-qa",
            }),
          ],
        }),
      ),
    );
    expect(
      (await screen.findByRole("status", { name: "操作反馈" })).textContent,
    ).toContain("发送任务");
  });

  it("opens a secondary task creation page with ordered attachments and target Agent selection", async () => {
    const operations = createOperationsStub();
    renderDismissed(
      createElement(App, {
        overviewLoader: createPopulatedOverview,
        operations,
      }),
    );

    const workspace = await screen.findByRole("region", {
      name: "任务协作面板",
    });
    fireEvent.click(
      within(workspace).getByRole("button", { name: "新增任务" }),
    );

    const creationPage = await screen.findByRole("region", {
      name: "创建任务",
    });
    fireEvent.change(within(creationPage).getByLabelText("标题"), {
      target: { value: "v0.2 checkout: 支付回归" },
    });
    const description = within(creationPage).getByRole("textbox", {
      name: "描述",
    });
    description.textContent = "支付入口已改完，请按附件顺序看图并执行冒烟。";
    fireEvent.input(description);
    fireEvent.paste(description, {
      clipboardData: {
        getData: () => "",
        files: [new File(["first"], "01-entry.png", { type: "image/png" })],
      },
    });
    fireEvent.change(within(creationPage).getByLabelText("描述上传文件"), {
      target: {
        files: [new File(["second"], "02-result.png", { type: "image/png" })],
      },
    });

    expect(within(creationPage).queryByText("@01-entry.png")).toBeNull();
    expect(within(creationPage).queryByText("@02-result.png")).toBeNull();
    expect(
      within(creationPage).queryByRole("region", { name: "附件" }),
    ).toBeNull();
    expect(within(creationPage).queryByText(/secret/i)).toBeNull();
    expect(
      (within(creationPage).getByLabelText("目标 Agent") as HTMLSelectElement)
        .value,
    ).toBe("qa_codex_local");

    fireEvent.click(within(creationPage).getByRole("button", { name: "发送" }));

    await waitFor(() =>
      expect(operations.createTaskHandoff).toHaveBeenCalledWith(
        expect.objectContaining({
          actor: "dev",
          title: "v0.2 checkout: 支付回归",
          description: expect.stringContaining(
            "支付入口已改完，请按附件顺序看图并执行冒烟。",
          ),
          descriptionHtml: expect.stringContaining(
            "支付入口已改完，请按附件顺序看图并执行冒烟。",
          ),
          targetActor: "qa",
          targetAgentEndpointId: "qa_codex_local",
          attachments: [
            expect.objectContaining({ name: "01-entry.png" }),
            expect.objectContaining({ name: "02-result.png" }),
          ],
        }),
      ),
    );
  });

  it("keeps refresh behavior and error state visible", async () => {
    const overviewLoader = vi
      .fn()
      .mockResolvedValueOnce(populatedOverview)
      .mockRejectedValueOnce(new Error("temporary 502"));
    renderDismissed(createElement(App, { overviewLoader }));

    const workspace = await screen.findByRole("region", {
      name: "任务协作面板",
    });
    expect(
      within(workspace).getAllByText("checkout-flow-regression").length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: "刷新" }));

    expect(await screen.findByText("刷新失败：temporary 502")).toBeTruthy();
    expect(
      screen.getAllByText("checkout-flow-regression").length,
    ).toBeGreaterThan(0);
    await waitFor(() => expect(overviewLoader).toHaveBeenCalledTimes(2));
  });

  it("shows empty and unavailable Hub states", async () => {
    const { unmount } = renderDismissed(
      createElement(App, {
        overviewLoader: async () => ({
          ...populatedOverview,
          agent_endpoints: [],
          handoffs: [],
          deliveries: [],
          timeline: [],
          reports: [],
          metrics: {
            pending_handoffs: 0,
            failed_deliveries: 0,
            reports_returned: 0,
            endpoint_online: 0,
            endpoint_total: 0,
          },
        }),
      }),
    );

    expect(await screen.findByText("暂无 Hub 活动")).toBeTruthy();
    unmount();

    renderDismissed(
      createElement(App, {
        overviewLoader: async () => {
          throw new Error("Handoff Hub request failed: 503");
        },
        hubBaseUrl: "http://localhost:3000",
      }),
    );

    expect(
      await screen.findByRole("heading", { name: "Hub 不可用" }),
    ).toBeTruthy();
    expect(screen.getByText("http://localhost:3000")).toBeTruthy();
  });

  it("keeps Hub connection in the workspace bar instead of exposing a health page", async () => {
    renderDismissed(
      createElement(App, {
        overviewLoader: async () => createQaHealthOverview("blocked"),
      }),
    );

    const navigation = screen.getByRole("navigation", {
      name: "Sartre 控制台",
    });
    fireEvent.change(screen.getByLabelText("当前岗位"), {
      target: { value: "qa" },
    });

    expect(await screen.findByText("质量端点")).toBeTruthy();
    expect(screen.queryByText("已连接 Hub")).toBeNull();
    expect(
      within(navigation).queryByRole("button", { name: /健康/ }),
    ).toBeNull();
    expect(screen.queryByRole("region", { name: "端点诊断" })).toBeNull();
  });
});

function renderDismissed(element: React.ReactElement) {
  window.localStorage.setItem(onboardingStorageKey, "1");
  return render(element);
}

const populatedOverview: HandoffOverviewResponse = {
  schema_version: "1.0" as const,
  tenant_id: "local-demo",
  generated_at: "2026-06-23T00:00:00.000Z",
  agent_endpoints: [
    {
      agent_endpoint_id: "dev_codex_local",
      tenant_id: "local-demo",
      user_id: "dev_user",
      role: "developer",
      online: true,
      capabilities: ["generate_change_report"],
      execution_mode: "manual_confirm",
      capability_sources: [],
      executor: { kind: "manual_prompt", label: "Manual prompt" },
      approval_policy: {
        mode: "manual_confirm",
        require_human_for: [],
        allow_auto_for: [],
      },
      updated_at: "2026-06-23T00:00:00.000Z",
    },
    {
      agent_endpoint_id: "qa_codex_local",
      tenant_id: "local-demo",
      user_id: "qa_user",
      role: "qa",
      online: true,
      capabilities: ["read_handoff_pack"],
      execution_mode: "manual_confirm",
      capability_sources: [],
      executor: { kind: "manual_prompt", label: "Manual prompt" },
      approval_policy: {
        mode: "manual_confirm",
        require_human_for: [],
        allow_auto_for: [],
      },
      updated_at: "2026-06-23T00:01:00.000Z",
    },
  ],
  handoffs: [
    {
      id: "handoff_1",
      title: "checkout-flow-regression",
      summary: "Run QA smoke and return report",
      status: "created",
      created_at: "2026-06-23T00:02:00.000Z",
      from: {
        user_id: "dev_user",
        role: "developer",
        agent_endpoint_id: "dev_codex_local",
      },
      to: {
        user_id: "qa_user",
        role: "qa",
        agent_endpoint_id: "qa_codex_local",
      },
      entry_artifact_name: "handoff.md",
      artifact_count: 1,
    },
  ],
  deliveries: [
    {
      id: "delivery_1",
      handoff_id: "handoff_1",
      recipient_endpoint_id: "qa_codex_local",
      cursor: 1,
      status: "acknowledged",
      delivered_at: "2026-06-23T00:03:00.000Z",
      acknowledged_at: "2026-06-23T00:04:00.000Z",
      title: "checkout-flow-regression",
      summary: "Run QA smoke and return report",
      from: {
        user_id: "dev_user",
        role: "developer",
        agent_endpoint_id: "dev_codex_local",
      },
      to: {
        user_id: "qa_user",
        role: "qa",
        agent_endpoint_id: "qa_codex_local",
      },
    },
  ],
  timeline: [
    {
      id: "handoff_1:queued",
      type: "handoff.created",
      label: "Queued",
      detail: "Dev published checkout-flow-regression",
      time: "00:02",
      tone: "blue" as const,
      handoff_id: "handoff_1",
      delivery_id: null,
    },
    {
      id: "delivery_1:delivered",
      type: "delivery.delivered",
      label: "Delivered",
      detail: "QA endpoint received checkout-flow-regression",
      time: "00:03",
      tone: "blue" as const,
      handoff_id: "handoff_1",
      delivery_id: "delivery_1",
    },
    {
      id: "delivery_1:acknowledged",
      type: "delivery.acknowledged",
      label: "Acknowledged",
      detail: "QA accepted ownership",
      time: "00:04",
      tone: "yellow" as const,
      handoff_id: "handoff_1",
      delivery_id: "delivery_1",
    },
    {
      id: "artifact_report:report",
      type: "artifact.report_returned",
      label: "Report returned",
      detail: "qa-report.md uploaded to Hub",
      time: "00:05",
      tone: "green" as const,
      handoff_id: "handoff_1",
      delivery_id: "delivery_1",
    },
  ],
  reports: [
    {
      id: "artifact_report",
      handoff_id: "handoff_1",
      name: "qa-report.md",
      kind: "qa_to_dev_report",
      storage_url: "file://qa-report.md",
      created_at: "2026-06-23T00:05:00.000Z",
      title: "checkout-flow-regression",
    },
  ],
  metrics: {
    pending_handoffs: 3,
    failed_deliveries: 1,
    reports_returned: 2,
    endpoint_online: 2,
    endpoint_total: 2,
  },
};

const conversationFixture = {
  schema_version: "1.0" as const,
  tenant_id: "local-demo",
  conversation: {
    id: "conversation_1",
    schema_version: "1.0" as const,
    tenant_id: "local-demo",
    title: "订单模块联调",
    owner_endpoint_id: "dev_codex_local",
    participant_endpoint_ids: ["dev_codex_local", "qa_codex_local"],
    status: "active" as const,
    created_at: "2026-06-25T10:00:00.000Z",
    updated_at: "2026-06-25T10:01:00.000Z",
  },
  messages: [
    {
      id: "message_1",
      conversation_id: "conversation_1",
      seq: 1,
      author_endpoint_id: "dev_codex_local",
      role: "user" as const,
      content: "请准备测试范围。",
      references: [],
      created_at: "2026-06-25T10:00:10.000Z",
    },
  ],
  tool_invocations: [],
  summary_checkpoints: [
    {
      id: "summary_1",
      conversation_id: "conversation_1",
      author_endpoint_id: "qa_codex_local",
      covered_message_start_seq: 1,
      covered_message_end_seq: 1,
      summary: "测试范围已确认。",
      created_at: "2026-06-25T10:00:20.000Z",
    },
  ],
  model_runs: [
    {
      id: "model_run_1",
      conversation_id: "conversation_1",
      context_projection_id: "projection_1",
      executor_endpoint_id: "qa_codex_local",
      provider: "anthropic",
      model: "claude-code",
      status: "queued" as const,
      started_at: null,
      completed_at: null,
    },
  ],
  context_projections: [
    {
      id: "projection_1",
      conversation_id: "conversation_1",
      provider: "anthropic",
      model: "claude-code",
      source_message_ids: ["message_1"],
      summary_checkpoint_ids: ["summary_1"],
      reference_ids: [],
      token_budget: 16000,
      rendered_context: "## 历史上下文\n请准备测试范围。",
      created_at: "2026-06-25T10:00:30.000Z",
    },
  ],
};

const executionConversationFixture: ConversationDetailResponse = {
  ...conversationFixture,
  conversation: {
    ...conversationFixture.conversation,
    id: "conversation_delivery_1",
    title: "checkout-flow-regression",
    metadata: {
      handoff_id: "handoff_1",
      delivery_id: "delivery_1",
    },
  },
  messages: [
    {
      id: "message_prompt_delivery_1",
      conversation_id: "conversation_delivery_1",
      seq: 1,
      author_endpoint_id: "qa_codex_local",
      role: "user",
      content: "请根据交接内容生成测试范围。",
      references: [
        {
          id: "ref_delivery_1",
          type: "delivery" as const,
          target_id: "delivery_1",
        },
      ],
      created_at: "2026-06-25T10:01:00.000Z",
      metadata: {
        delivery_id: "delivery_1",
      },
    },
    {
      id: "message_result_delivery_1",
      conversation_id: "conversation_delivery_1",
      seq: 2,
      author_endpoint_id: "qa_codex_local",
      role: "assistant" as const,
      content: "QA Agent 已生成测试范围和风险报告。",
      references: [
        {
          id: "ref_delivery_1_result",
          type: "delivery" as const,
          target_id: "delivery_1",
        },
      ],
      created_at: "2026-06-25T10:02:00.000Z",
      metadata: {
        delivery_id: "delivery_1",
      },
    },
  ],
  model_runs: [
    {
      id: "model_run_delivery_1",
      conversation_id: "conversation_delivery_1",
      context_projection_id: "projection_delivery_1",
      executor_endpoint_id: "qa_codex_local",
      provider: "codex",
      model: "gpt-5",
      status: "succeeded" as const,
      started_at: "2026-06-25T10:01:00.000Z",
      completed_at: "2026-06-25T10:02:00.000Z",
      metadata: {
        delivery_id: "delivery_1",
        provider_profile_id: "profile_dev_codex_gpt5",
      },
    },
  ],
  context_projections: [
    {
      ...conversationFixture.context_projections[0],
      id: "projection_delivery_1",
      conversation_id: "conversation_delivery_1",
      provider: "codex",
      model: "gpt-5",
      source_message_ids: ["message_prompt_delivery_1"],
      summary_checkpoint_ids: [],
      reference_ids: ["delivery_1"],
      token_budget: 16000,
      rendered_context: "Role Agent: qa / qa_codex_local",
      created_at: "2026-06-25T10:01:30.000Z",
      metadata: {
        delivery_id: "delivery_1",
      },
    },
  ],
};

const roleCapabilityCatalogFixture: RoleCapabilityCatalogResponse = {
  schema_version: "1.0",
  tenant_id: "local-demo",
  generated_at: "2026-06-26T10:00:00.000Z",
  packs: [],
  mentions: [
    {
      mention: "@qa.ui-regression-execution",
      kind: "skill",
      label: "UI regression execution",
      summary: "Run reviewed UI regression.",
      role: "qa",
      packId: "qa-falcocut-capability-pack",
      sourceProjectId: "ai-native-qa",
      targetId: "qa_skill_ui_regression_execution",
    },
    {
      mention: "@dev.frontend.build-qa",
      kind: "command",
      label: "Build US QA frontend",
      summary: "Run the frontend QA build.",
      role: "developer",
      packId: "frontend-marketing-ai-aws-capability-pack",
      sourceProjectId: "marketing-ai-aws",
      targetId: "dev.frontend.command.build-qa",
    },
  ],
};

function createProviderRegistryProjection(actor: "dev" | "qa"): {
  registry: ProviderModelRegistryListResponse;
  selection: ProviderModelSelectionResponse;
} {
  const isQa = actor === "qa";
  const endpointId = isQa ? "qa_codex_local" : "dev_codex_local";
  const provider = isQa ? "anthropic" : "openai";
  const model = isQa ? "claude-code" : "gpt-5-codex";
  const label = isQa ? "Claude Code Sonnet" : "Codex GPT-5";
  const profileId = isQa ? "profile_qa_claude_code" : "profile_dev_codex_gpt5";
  const capabilities: ProviderModelCapability[] = isQa
    ? ["chat", "streaming", "tool_use"]
    : ["chat", "tool_use", "repo_context"];
  const selectedProfile = {
    id: profileId,
    schema_version: "1.0" as const,
    tenant_id: "local-demo",
    agent_endpoint_id: endpointId,
    provider,
    model,
    label,
    executor: {
      kind: isQa ? ("claude_code" as const) : ("codex_cli" as const),
      label: isQa ? "Claude Code" : "Codex CLI",
      command: isQa ? "claude" : "codex",
    },
    capabilities,
    context_window: isQa ? 200_000 : 128_000,
    max_output_tokens: isQa ? 8_192 : 16_384,
    default_for_endpoint: true,
    status: "available" as const,
    latest_health: {
      id: `${profileId}_health`,
      schema_version: "1.0" as const,
      tenant_id: "local-demo",
      profile_id: profileId,
      status: "passed" as const,
      checks: [
        {
          key: "command",
          label: "Command",
          status: "passed" as const,
          detail: "local command is available",
          observed_at: "2026-06-25T10:00:00.000Z",
        },
      ],
      reported_at: "2026-06-25T10:00:00.000Z",
    },
    created_at: "2026-06-25T09:00:00.000Z",
    updated_at: "2026-06-25T10:00:00.000Z",
    metadata: {
      runtime: "local",
    },
  };

  return {
    registry: {
      schema_version: "1.0",
      tenant_id: "local-demo",
      endpoint_id: endpointId,
      default_profile_id: profileId,
      profiles: [selectedProfile],
    },
    selection: {
      schema_version: "1.0",
      tenant_id: "local-demo",
      endpoint_id: endpointId,
      selected_profile_id: profileId,
      selected_profile: selectedProfile,
      required_capabilities: ["chat"],
      selection_reason: "default compatible profile",
    },
  };
}

async function createPopulatedOverview() {
  return populatedOverview;
}

async function createQaOfflineOverview() {
  return {
    ...populatedOverview,
    agent_endpoints: populatedOverview.agent_endpoints.map((endpoint) =>
      endpoint.agent_endpoint_id === "qa_codex_local"
        ? { ...endpoint, online: false }
        : endpoint,
    ),
    metrics: {
      ...populatedOverview.metrics,
      endpoint_online: 1,
    },
  } satisfies HandoffOverviewResponse;
}

async function createReturnedToDevOverview() {
  return {
    ...populatedOverview,
    deliveries: populatedOverview.deliveries.map((delivery) => ({
      ...delivery,
      status: "report_ready" as const,
      active_actor_endpoint_id: "qa_codex_local",
      active_target_agent_endpoint_id: "dev_codex_local",
    })),
    reports: [],
    timeline: [
      ...populatedOverview.timeline,
      {
        id: "delivery_1:report_ready",
        type: "delivery.report_ready",
        label: "Report ready",
        detail: "QA result is ready for checkout-flow-regression",
        time: "00:05",
        tone: "yellow" as const,
        handoff_id: "handoff_1",
        delivery_id: "delivery_1",
      },
    ],
  } satisfies HandoffOverviewResponse;
}

function createActorScopedOverview(title: string) {
  return {
    ...populatedOverview,
    handoffs: populatedOverview.handoffs.map((handoff) => ({
      ...handoff,
      title,
    })),
    deliveries: populatedOverview.deliveries.map((delivery) => ({
      ...delivery,
      title,
    })),
    timeline: populatedOverview.timeline.map((event) => ({
      ...event,
      detail: event.detail.replace("checkout-flow-regression", title),
    })),
    reports: populatedOverview.reports.map((report) => ({
      ...report,
      title,
    })),
  } satisfies HandoffOverviewResponse;
}

function createCapabilityManifestOverview() {
  return {
    ...populatedOverview,
    agent_endpoints: populatedOverview.agent_endpoints.map((endpoint) =>
      endpoint.agent_endpoint_id === "qa_codex_local"
        ? {
            ...endpoint,
            capabilities: ["read_handoff_pack", "generate_test_scope"],
            capability_sources: [
              {
                id: "skill_qa_test_scope",
                type: "skill" as const,
                name: "QA 测试范围分析",
                summary: "读取交接包并生成测试范围",
                capabilities: ["read_handoff_pack", "generate_test_scope"],
                approval_mode: "manual_confirm" as const,
                enabled: true,
              },
              {
                id: "hook_delivery_accepted",
                type: "hook" as const,
                name: "接收后准备提示词",
                summary: "delivery.accepted 后生成本地 Agent prompt",
                capabilities: ["prepare_prompt"],
                approval_mode: "prompt_only" as const,
                enabled: true,
              },
            ],
            executor: {
              kind: "codex_cli" as const,
              label: "Codex CLI",
              command: "codex",
            },
            approval_policy: {
              mode: "manual_confirm" as const,
              require_human_for: ["run_command"],
              allow_auto_for: [],
            },
          }
        : endpoint,
    ),
  } satisfies HandoffOverviewResponse;
}

function createQaHealthOverview(status: "passed" | "blocked") {
  return {
    ...populatedOverview,
    agent_endpoints: populatedOverview.agent_endpoints.map((endpoint) =>
      endpoint.agent_endpoint_id === "qa_codex_local"
        ? {
            ...endpoint,
            health_report: {
              schema_version: "1.0" as const,
              endpoint_id: endpoint.agent_endpoint_id,
              tenant_id: endpoint.tenant_id,
              reported_at: "2026-06-23T10:00:00.000Z",
              checks: [
                {
                  key: "workspace",
                  label: "Workspace",
                  status,
                  detail:
                    status === "passed"
                      ? "Workspace control directory is writeable."
                      : "Cannot prepare .sartre/inbox: permission denied",
                  observed_at: "2026-06-23T10:00:00.000Z",
                },
              ],
            },
          }
        : endpoint,
    ),
  } satisfies HandoffOverviewResponse;
}

function createOperationsStub() {
  return {
    registerActor: vi.fn().mockResolvedValue({
      status: "succeeded",
      detail: "已注册 qa_codex_local",
    }),
    createDemoHandoff: vi.fn().mockResolvedValue({
      status: "succeeded",
      detail: "已创建投递 delivery_1",
    }),
    createTaskHandoff: vi.fn().mockResolvedValue({
      status: "succeeded",
      detail: "已发送任务 delivery_task",
    }),
    replayActor: vi.fn().mockResolvedValue({
      status: "succeeded",
      detail: "已重放 0 个事件",
      nextCursor: 0,
    }),
    connectActor: vi.fn().mockResolvedValue({
      status: "succeeded",
      detail: "已连接 qa_codex_local，同步 1 个事件",
      nextCursor: 1,
    }),
    ackDelivery: vi.fn().mockResolvedValue({
      status: "succeeded",
      detail: "已确认 delivery_1",
    }),
    failDelivery: vi.fn().mockResolvedValue({
      status: "succeeded",
      detail: "已标记失败 delivery_1",
    }),
    expireDelivery: vi.fn().mockResolvedValue({
      status: "succeeded",
      detail: "已标记过期 delivery_1",
    }),
    acceptDelivery: vi.fn().mockResolvedValue({
      status: "succeeded",
      detail: "已放行 delivery_1",
    }),
    markDeliveryReportReady: vi.fn().mockResolvedValue({
      status: "succeeded",
      detail: "已生成结果 delivery_1",
    }),
    closeDelivery: vi.fn().mockResolvedValue({
      status: "succeeded",
      detail: "已发送结果 delivery_1",
    }),
    sendTaskReply: vi.fn().mockResolvedValue({
      status: "succeeded",
      detail: "已发送结果 delivery_1",
    }),
  };
}
