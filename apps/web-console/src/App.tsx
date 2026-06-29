import type {
  ConversationDetailResponse,
  ConversationListResponse,
  HandoffOverviewResponse,
  ProviderModelRegistryListResponse,
  ProviderModelSelectionResponse,
  RoleCapabilityCatalogResponse,
  RoleCapabilityMention,
} from "@sartre/contracts";
import { HandoffHubClient } from "@sartre/sdk";
import Mention from "@tiptap/extension-mention";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type AgentSetupWizard,
  deriveAgentSetupWizard,
} from "./agent-setup-wizard";
import {
  deriveEndpointDiagnostics,
  type EndpointDiagnostic,
} from "./endpoint-diagnostics";
import {
  type CreateTaskHandoffInput,
  createWebConsoleOperations,
  type LocalActor,
  localDemoProfiles,
  type OperationResult,
  type TaskHandoffAttachmentInput,
  type WebConsoleOperations,
} from "./hub-operations";

type ViewKey =
  | "inbox"
  | "conversations"
  | "agents"
  | "models"
  | "hooks"
  | "skills"
  | "settings";

type BoardViewMode = "board" | "table";

type ProjectColumnKey = "sent" | "received" | "done";

type NavItem = {
  group: "工作区" | "能力";
  icon: NavIconKind;
  label: string;
  view: ViewKey;
};

type NavIconKind =
  | "inbox"
  | "conversations"
  | "agents"
  | "models"
  | "hooks"
  | "skills"
  | "settings";

type AgentEndpoint = {
  id: string;
  userId: string;
  label: string;
  actor: LocalActor | null;
  executor: string;
  capabilitySources: CapabilitySource[];
  status: "online" | "standby";
  lastCheck: string;
  executionMode: string;
  healthSummary: string;
  healthReport: string;
  healthTone: "green" | "yellow" | "red";
};

type CapabilitySource =
  HandoffOverviewResponse["agent_endpoints"][number]["capability_sources"][number];

type TaskArtifact = {
  id: string;
  name: string;
  kind: string;
};

type DraftTaskAttachment = TaskHandoffAttachmentInput & {
  source: "paste" | "upload";
};

type RichTaskEditorValue = {
  text: string;
  html: string;
  attachments: DraftTaskAttachment[];
  capabilityReferences: RoleCapabilityMention[];
};

type ActorTaskRelation = "sent" | "received";

type CollaborationTask = {
  id: string;
  handoffId: string;
  title: string;
  summary: string;
  versionId: string;
  versionName: string;
  featureId: string;
  featureName: string;
  fromRole: string;
  toRole: string;
  fromAgentId: string;
  toAgentId: string;
  activeActorEndpointId: string | null;
  activeTargetAgentEndpointId: string | null;
  actorRelation: ActorTaskRelation;
  directionLabel: string;
  flowStatus: string;
  agentSummary: string;
  rawStatus: string;
  status: string;
  statusTone: "blue" | "green" | "yellow" | "red";
  column: ProjectColumnKey;
  markers: string[];
  relationLabel: string;
  displayTime: string;
  artifacts: TaskArtifact[];
};

type FeatureGroup = {
  id: string;
  name: string;
  tasks: CollaborationTask[];
};

type RequirementVersion = {
  id: string;
  name: string;
  description: string;
  features: FeatureGroup[];
};

type TimelineEvent = {
  id: string;
  label: string;
  detail: string;
  time: string;
  tone: "blue" | "green" | "yellow" | "red";
  handoffId: string;
  deliveryId: string | null;
};

type TaskExecutionFacts = {
  conversationId: string;
  modelRunId: string;
  runStatus: string;
  providerModel: string;
  executorEndpointId: string;
  errorCategory: string | null;
  errorMessage: string | null;
  assistantOutput: string;
  projectionPreview: string;
  runtimeProfileLabel: string | null;
  tone: "blue" | "green" | "yellow" | "red";
};

type SetupStep = {
  title: string;
  detail: string;
};

type OverviewViewModel = {
  currentEndpoint: string;
  currentEndpointName: string;
  agentEndpoints: AgentEndpoint[];
  collaborationTasks: CollaborationTask[];
  projectVersions: RequirementVersion[];
  timelineEvents: TimelineEvent[];
  endpointDiagnostics: Record<LocalActor, EndpointDiagnostic[]>;
  setupWizards: Record<LocalActor, AgentSetupWizard>;
};

type OverviewLoadContext = {
  actor: LocalActor;
  endpointId: string;
};

type OverviewState =
  | { status: "loading" }
  | { status: "empty"; overview: HandoffOverviewResponse }
  | {
      status: "ready";
      overview: HandoffOverviewResponse;
      view: OverviewViewModel;
    }
  | { status: "error"; message: string };

export type OverviewLoader = (
  context: OverviewLoadContext,
) => Promise<HandoffOverviewResponse>;

export type ConversationLoader = (context: OverviewLoadContext) => Promise<{
  list: ConversationListResponse;
  detail: ConversationDetailResponse | null;
}>;

export type ProviderRegistryLoader = (context: OverviewLoadContext) => Promise<{
  registry: ProviderModelRegistryListResponse;
  selection: ProviderModelSelectionResponse | null;
}>;

export type RoleCapabilityCatalogLoader = (
  tenantId: string,
) => Promise<RoleCapabilityCatalogResponse>;

export type AppProps = {
  overviewLoader?: OverviewLoader;
  conversationLoader?: ConversationLoader;
  providerRegistryLoader?: ProviderRegistryLoader;
  roleCapabilityCatalogLoader?: RoleCapabilityCatalogLoader;
  hubBaseUrl?: string;
  operations?: WebConsoleOperations;
};

type OperationLogItem = {
  id: string;
  label: string;
  status: OperationResult["status"];
  detail: string;
};

type OperationRunState =
  | { status: "idle" }
  | { status: "running"; label: string }
  | { status: "succeeded"; label: string }
  | { status: "failed"; label: string };

type RefreshState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "succeeded"; message: string }
  | { status: "failed"; message: string };

type ConversationState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      list: ConversationListResponse;
      detail: ConversationDetailResponse | null;
    }
  | { status: "error"; message: string };

type ProviderRegistryState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "ready";
      registry: ProviderModelRegistryListResponse;
      selection: ProviderModelSelectionResponse | null;
    }
  | { status: "error"; message: string };

type RoleCapabilityCatalogState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; catalog: RoleCapabilityCatalogResponse }
  | { status: "error"; message: string };

type OperationPanelProps = {
  activeView: ViewKey;
  boardViewMode: BoardViewMode;
  selectedVersionId: string;
  selectedTaskId: string | null;
  setBoardViewMode: (mode: BoardViewMode) => void;
  setSelectedVersionId: (versionId: string) => void;
  setSelectedTaskId: (taskId: string | null) => void;
  selectedActor: LocalActor;
  setSelectedActor: (actor: LocalActor) => void;
  cursorByActor: Record<LocalActor, number>;
  operationLog: OperationLogItem[];
  operationState: OperationRunState;
  operations: WebConsoleOperations;
  runOperation: (
    label: string,
    run: () => Promise<OperationResult>,
  ) => Promise<void>;
  openOnboarding: () => void;
  conversationState: ConversationState;
  providerRegistryState: ProviderRegistryState;
  capabilityMentions: RoleCapabilityMention[];
};

const navGroups: NavItem[] = [
  { group: "工作区", icon: "inbox", label: "收件箱", view: "inbox" },
  {
    group: "工作区",
    icon: "conversations",
    label: "会话",
    view: "conversations",
  },
  { group: "能力", icon: "agents", label: "Agent", view: "agents" },
  { group: "能力", icon: "models", label: "模型", view: "models" },
  { group: "能力", icon: "hooks", label: "Hooks", view: "hooks" },
  { group: "能力", icon: "skills", label: "Skills", view: "skills" },
];

const settingsNavItem: Omit<NavItem, "group"> = {
  icon: "settings",
  label: "设置",
  view: "settings",
};

const projectColumns: Array<{
  key: ProjectColumnKey;
  label: string;
  description: string;
  tone: "blue" | "green" | "yellow" | "red";
}> = [
  {
    key: "sent",
    label: "已发送",
    description: "我方已发起，等待对方处理或回传。",
    tone: "blue",
  },
  {
    key: "received",
    label: "已接收",
    description: "当前岗位收到任务，可人工回复、交给 Agent 或结束。",
    tone: "yellow",
  },
  {
    key: "done",
    label: "已结束",
    description: "任务已关闭、失败、过期或已有结果产物。",
    tone: "green",
  },
];

const onboardingStorageKey = "sartre:web-console:onboarding-dismissed:v1";
const defaultRequirementVersionId = "v0.2-local-collaboration";
const defaultRequirementVersionName = "v0.2 本地协作";
const taskArtifactStorageProfile = {
  id: "falcocut-assets-sgp",
  name: "falcocut前端资源",
  bucket: "falcocut-assets-sgp-1375136936",
  region: "ap-singapore",
  cdnDomain: "assets.falcocut.ai",
  basePrefix: "sartre",
} as const;

const setupSteps: SetupStep[] = [
  {
    title: "岗位选择",
    detail: "选择开发、质量，或自定义岗位端点。",
  },
  {
    title: "执行器选择",
    detail:
      "可使用 Codex、Claude、command、MCP、plugin、hook、subagent、manual、mock。",
  },
  {
    title: "Hooks 与 Skills",
    detail: "按岗位选择触发时机、可读产物和本地执行边界。",
  },
  {
    title: "权限模式",
    detail: "健康状态稳定前，高风险动作保留 manual_confirm。",
  },
  {
    title: "健康检查",
    detail: "验证 Hub 可达性、本地路径和执行器可用性。",
  },
];

const defaultHubBaseUrl = resolveHubBaseUrl();
const defaultOverviewLoader = createHubOverviewLoader(defaultHubBaseUrl);
const defaultConversationLoader =
  createHubConversationLoader(defaultHubBaseUrl);
const defaultProviderRegistryLoader =
  createHubProviderRegistryLoader(defaultHubBaseUrl);
const defaultRoleCapabilityCatalogLoader =
  createHubRoleCapabilityCatalogLoader(defaultHubBaseUrl);

export function App({
  overviewLoader = defaultOverviewLoader,
  conversationLoader = defaultConversationLoader,
  providerRegistryLoader = defaultProviderRegistryLoader,
  roleCapabilityCatalogLoader = defaultRoleCapabilityCatalogLoader,
  hubBaseUrl = defaultHubBaseUrl,
  operations,
}: AppProps) {
  const [overviewState, setOverviewState] = useState<OverviewState>({
    status: "loading",
  });
  const [activeView, setActiveView] = useState<ViewKey>("inbox");
  const [boardViewMode, setBoardViewMode] = useState<BoardViewMode>("board");
  const [selectedVersionId, setSelectedVersionId] = useState(
    defaultRequirementVersionId,
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedActor, setSelectedActor] = useState<LocalActor>("dev");
  const [showOnboarding, setShowOnboarding] = useState(
    () => !hasDismissedOnboarding(),
  );
  const [cursorByActor, setCursorByActor] = useState<
    Record<LocalActor, number>
  >(() => ({ dev: 0, qa: 0 }));
  const [operationLog, setOperationLog] = useState<OperationLogItem[]>([]);
  const [operationState, setOperationState] = useState<OperationRunState>({
    status: "idle",
  });
  const [refreshState, setRefreshState] = useState<RefreshState>({
    status: "idle",
  });
  const [conversationState, setConversationState] = useState<ConversationState>(
    {
      status: "idle",
    },
  );
  const [providerRegistryState, setProviderRegistryState] =
    useState<ProviderRegistryState>({
      status: "idle",
    });
  const [roleCapabilityCatalogState, setRoleCapabilityCatalogState] =
    useState<RoleCapabilityCatalogState>({
      status: "idle",
    });

  const loadOverview = useCallback(
    async (options?: { preserveOnError?: boolean }) => {
      if (!options?.preserveOnError) {
        setOverviewState({ status: "loading" });
      }

      try {
        const endpointId = localDemoProfiles[selectedActor].agent_endpoint_id;
        const overview = await overviewLoader({
          actor: selectedActor,
          endpointId,
        });
        if (
          overview.agent_endpoints.length === 0 &&
          overview.handoffs.length === 0
        ) {
          setOverviewState({ status: "empty", overview });
          return overview;
        }
        setOverviewState({
          status: "ready",
          overview,
          view: toOverviewViewModel(overview, selectedActor),
        });
        return overview;
      } catch (error: unknown) {
        if (!options?.preserveOnError) {
          setOverviewState({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
        throw error;
      }
    },
    [overviewLoader, selectedActor],
  );

  const loadConversations = useCallback(async () => {
    const endpointId = localDemoProfiles[selectedActor].agent_endpoint_id;
    return conversationLoader({
      actor: selectedActor,
      endpointId,
    });
  }, [conversationLoader, selectedActor]);

  const loadProviderRegistry = useCallback(async () => {
    const endpointId = localDemoProfiles[selectedActor].agent_endpoint_id;
    return providerRegistryLoader({
      actor: selectedActor,
      endpointId,
    });
  }, [providerRegistryLoader, selectedActor]);

  const defaultOperations = useMemo(() => {
    const client = new HandoffHubClient({ baseUrl: hubBaseUrl });
    return createWebConsoleOperations({
      client,
      refreshOverview: () => loadOverview({ preserveOnError: true }),
    });
  }, [hubBaseUrl, loadOverview]);

  const activeOperations = operations ?? defaultOperations;

  useEffect(() => {
    let cancelled = false;

    loadOverview().catch(() => {
      if (cancelled) {
        return;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadOverview]);

  useEffect(() => {
    let cancelled = false;
    setRoleCapabilityCatalogState({ status: "loading" });

    roleCapabilityCatalogLoader("local-demo")
      .then((catalog) => {
        if (cancelled) {
          return;
        }
        setRoleCapabilityCatalogState({ status: "ready", catalog });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setRoleCapabilityCatalogState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [roleCapabilityCatalogLoader]);

  useEffect(() => {
    if (activeView !== "conversations") {
      return;
    }

    let cancelled = false;
    setConversationState({ status: "loading" });

    loadConversations()
      .then((result) => {
        if (cancelled) {
          return;
        }
        setConversationState({
          status: "ready",
          list: result.list,
          detail: result.detail,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setConversationState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, loadConversations]);

  useEffect(() => {
    if (activeView !== "models") {
      return;
    }

    let cancelled = false;
    setProviderRegistryState({ status: "loading" });

    loadProviderRegistry()
      .then((result) => {
        if (cancelled) {
          return;
        }
        setProviderRegistryState({
          status: "ready",
          registry: result.registry,
          selection: result.selection,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setProviderRegistryState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, loadProviderRegistry]);

  useEffect(() => {
    if (activeView !== "inbox" || selectedTaskId === null) {
      return;
    }

    let cancelled = false;
    setConversationState({ status: "loading" });
    setProviderRegistryState({ status: "loading" });

    const conversationsPromise = loadConversations();
    const providerRegistryPromise = loadProviderRegistry();

    conversationsPromise
      .then((result) => {
        if (cancelled) {
          return;
        }
        setConversationState({
          status: "ready",
          list: result.list,
          detail: result.detail,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setConversationState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    providerRegistryPromise
      .then((result) => {
        if (cancelled) {
          return;
        }
        setProviderRegistryState({
          status: "ready",
          registry: result.registry,
          selection: result.selection,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setProviderRegistryState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [activeView, loadConversations, loadProviderRegistry, selectedTaskId]);

  const selectView = useCallback((view: ViewKey) => {
    setActiveView(view);
  }, []);

  const appendOperationResult = useCallback(
    (label: string, result: OperationResult) => {
      setOperationLog((items) => [
        {
          id: `${Date.now()}-${label}`,
          label,
          status: result.status,
          detail: result.detail,
        },
        ...items,
      ]);
      setOperationState({ status: result.status, label });
    },
    [],
  );

  const refreshOverview = useCallback(async () => {
    setRefreshState({ status: "running" });
    try {
      await loadOverview({ preserveOnError: true });
      setRefreshState({
        status: "succeeded",
        message: "收件箱已刷新",
      });
    } catch (error: unknown) {
      setRefreshState({
        status: "failed",
        message: `刷新失败：${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
  }, [loadOverview]);

  const runOperation = useCallback(
    async (label: string, run: () => Promise<OperationResult>) => {
      setOperationState({ status: "running", label });
      const result: OperationResult = await run().catch((error: unknown) => ({
        status: "failed" as const,
        detail: error instanceof Error ? error.message : String(error),
      }));
      appendOperationResult(label, result);
      if (result.nextCursor !== undefined) {
        setCursorByActor((current) => ({
          ...current,
          [selectedActor]: result.nextCursor ?? current[selectedActor],
        }));
      }
    },
    [appendOperationResult, selectedActor],
  );

  const dismissOnboarding = useCallback(() => {
    persistOnboardingDismissed();
    setShowOnboarding(false);
  }, []);

  const openOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);

  const currentEndpointId =
    overviewState.status === "ready"
      ? overviewState.view.currentEndpoint
      : "等待 Hub";
  const currentEndpointName =
    overviewState.status === "ready"
      ? overviewState.view.currentEndpointName
      : "当前端点";
  const capabilityMentions =
    roleCapabilityCatalogState.status === "ready"
      ? roleCapabilityCatalogState.catalog.mentions
      : [];

  return (
    <div
      className="app-frame"
      data-design-system="vercel-geist"
      data-testid="web-console-frame"
    >
      <aside className="source-list">
        <div className="window-controls" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="brand-lockup">
          <span className="brand-mark">S</span>
          <div>
            <p>Sartre</p>
            <span>{selectedActor === "dev" ? "开发" : "质量"}</span>
          </div>
        </div>
        <nav aria-label="Sartre 控制台" className="nav-list">
          <div className="nav-primary">
            {renderNavGroups(navGroups, activeView, selectView)}
          </div>
          <div className="nav-footer">
            <NavButton
              item={settingsNavItem}
              isActive={activeView === settingsNavItem.view}
              onSelect={selectView}
            />
          </div>
        </nav>
      </aside>

      <main className="control-surface">
        <header className="workspace-bar">
          <div className="endpoint-identity">
            <span className="status-tooltip-anchor">
              <span
                className={`status-dot ${
                  overviewState.status === "ready"
                    ? "status-green"
                    : "status-yellow"
                }`}
                aria-hidden="true"
              />
              <span
                aria-label="端点连接状态提示"
                className="tooltip-content"
                role="tooltip"
              >
                {overviewState.status === "ready"
                  ? "绿色表示当前岗位数据已从 Hub 加载"
                  : "黄色表示正在等待 Hub 数据"}
              </span>
            </span>
            <div>
              <span>{currentEndpointName}</span>
              <strong>{currentEndpointId}</strong>
            </div>
            <label className="endpoint-selector">
              <span>当前岗位</span>
              <select
                aria-label="当前岗位"
                onChange={(event) => {
                  setSelectedTaskId(null);
                  setConversationState({ status: "idle" });
                  setProviderRegistryState({ status: "idle" });
                  setSelectedActor(event.target.value as LocalActor);
                }}
                value={selectedActor}
              >
                <option value="dev">开发</option>
                <option value="qa">质量</option>
              </select>
            </label>
          </div>
          <div className="workspace-actions">
            <button
              className="action-button"
              disabled={refreshState.status === "running"}
              onClick={() => void refreshOverview()}
              type="button"
            >
              {refreshState.status === "running" ? "正在刷新" : "刷新"}
            </button>
            {refreshState.status === "idle" ? null : (
              <p
                aria-live="polite"
                className={`refresh-status ${refreshState.status}`}
              >
                {refreshState.status === "running"
                  ? "正在同步 Hub"
                  : refreshState.message}
              </p>
            )}
          </div>
        </header>

        {renderOverviewState(overviewState, hubBaseUrl, {
          activeView,
          boardViewMode,
          selectedVersionId,
          selectedTaskId,
          setBoardViewMode,
          setSelectedVersionId,
          setSelectedTaskId,
          selectedActor,
          setSelectedActor,
          cursorByActor,
          operationLog,
          operationState,
          operations: activeOperations,
          runOperation,
          openOnboarding,
          conversationState,
          providerRegistryState,
          capabilityMentions,
        })}
        <OperationMessage
          latestLog={operationLog[0] ?? null}
          operationState={operationState}
        />
      </main>
      {showOnboarding ? (
        <OnboardingOverlay onDismiss={dismissOnboarding} />
      ) : null}
    </div>
  );
}

function renderOverviewState(
  state: OverviewState,
  hubBaseUrl: string,
  operationProps: OperationPanelProps,
) {
  if (state.status === "loading") {
    return (
      <section className="panel status-panel" aria-label="收件箱状态">
        <p className="eyebrow">Hub</p>
        <h2>正在加载收件箱...</h2>
        <p>正在读取 Agent 端点、交接、投递和报告。</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="panel status-panel" aria-label="Hub 错误">
        <p className="eyebrow">Hub</p>
        <h2>Hub 不可用</h2>
        <p>{state.message}</p>
        <code>{hubBaseUrl}</code>
      </section>
    );
  }

  if (state.status === "empty") {
    return (
      <div className="empty-operation-layout">
        <section className="panel status-panel" aria-label="收件箱为空">
          <p className="eyebrow">Hub</p>
          <h2>暂无 Hub 活动</h2>
          <p>注册一个 Agent 端点，或运行本地 Connector 演示来生成总览数据。</p>
        </section>
        <OperationsPanel {...operationProps} />
      </div>
    );
  }

  return <WorkspaceContent operationProps={operationProps} view={state.view} />;
}

function OperationMessage({
  latestLog,
  operationState,
}: {
  latestLog: OperationLogItem | null;
  operationState: OperationRunState;
}) {
  if (operationState.status === "idle" && latestLog === null) {
    return null;
  }

  if (operationState.status === "running") {
    return (
      <div
        aria-label="操作反馈"
        className="operation-message running"
        role="status"
      >
        正在执行：{operationState.label}
      </div>
    );
  }

  if (!latestLog) {
    return null;
  }

  return (
    <div
      aria-label="操作反馈"
      className={`operation-message ${latestLog.status}`}
      role="status"
    >
      {latestLog.label}
      {latestLog.status === "succeeded" ? "成功" : "失败"}：{latestLog.detail}
    </div>
  );
}

function WorkspaceContent({
  view,
  operationProps,
}: {
  view: OverviewViewModel;
  operationProps: OperationPanelProps;
}) {
  if (operationProps.activeView === "inbox") {
    return <TaskWorkspace operationProps={operationProps} view={view} />;
  }

  if (operationProps.activeView === "conversations") {
    return <ConversationWorkspace state={operationProps.conversationState} />;
  }

  if (operationProps.activeView === "agents") {
    return (
      <AgentDirectory
        agentEndpoints={view.agentEndpoints}
        selectedActor={operationProps.selectedActor}
      />
    );
  }

  if (operationProps.activeView === "models") {
    return (
      <ModelRegistryWorkspace
        endpointId={
          localDemoProfiles[operationProps.selectedActor].agent_endpoint_id
        }
        selectedActor={operationProps.selectedActor}
        state={operationProps.providerRegistryState}
      />
    );
  }

  if (operationProps.activeView === "hooks") {
    return (
      <ConnectorGuide
        agentEndpoints={view.agentEndpoints}
        selectedActor={operationProps.selectedActor}
      />
    );
  }

  if (operationProps.activeView === "skills") {
    return (
      <SkillsWorkspace
        agentEndpoints={view.agentEndpoints}
        selectedActor={operationProps.selectedActor}
      />
    );
  }

  return (
    <SettingsWorkspace
      currentCursor={operationProps.cursorByActor[operationProps.selectedActor]}
      onOpenGuide={operationProps.openOnboarding}
      operations={operationProps.operations}
      runOperation={operationProps.runOperation}
      selectedActor={operationProps.selectedActor}
      wizard={view.setupWizards[operationProps.selectedActor]}
    />
  );
}

function ConversationWorkspace({ state }: { state: ConversationState }) {
  if (state.status === "idle" || state.status === "loading") {
    return (
      <section className="single-column-view" aria-label="会话状态">
        <div className="empty-panel">
          <strong>正在加载会话</strong>
          <span>正在读取当前端点可见的 conversation ledger。</span>
        </div>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="single-column-view" aria-label="会话错误">
        <div className="empty-panel">
          <strong>会话账本不可用</strong>
          <span>{state.message}</span>
        </div>
      </section>
    );
  }

  if (state.list.conversations.length === 0 || state.detail === null) {
    return (
      <section className="conversation-workspace" aria-label="会话账本">
        <div className="empty-panel">
          <strong>暂无会话</strong>
          <span>当前端点还没有可读取的 conversation ledger。</span>
        </div>
      </section>
    );
  }

  const selectedConversation = state.detail.conversation;

  return (
    <section className="conversation-workspace" aria-label="会话账本">
      <div className="conversation-list-panel">
        <div className="conversation-panel-head">
          <div>
            <span>会话</span>
            <strong>端点 {state.list.endpoint_id}</strong>
          </div>
          <code>{state.list.conversations.length}</code>
        </div>
        <ol className="conversation-list">
          {state.list.conversations.map((conversation) => (
            <li key={conversation.id}>
              <article
                className={
                  conversation.id === selectedConversation.id
                    ? "conversation-card active"
                    : "conversation-card"
                }
              >
                <div className="conversation-card-title">
                  <strong>{conversation.title}</strong>
                  <code>{conversation.message_count}</code>
                </div>
                {conversation.latest_message ? (
                  <p>最新消息：{conversation.latest_message.content}</p>
                ) : (
                  <p>暂无消息</p>
                )}
                <div className="conversation-card-meta">
                  <span>拥有者 {conversation.owner_endpoint_id}</span>
                  <time>{formatTime(conversation.updated_at)}</time>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>

      <article className="conversation-detail-panel">
        <div className="conversation-detail-head">
          <div>
            <span>Ledger</span>
            <h2>会话详情</h2>
          </div>
          <code>{selectedConversation.id}</code>
        </div>

        <div className="conversation-participants">
          <AgentChip
            agentId={selectedConversation.owner_endpoint_id}
            roleLabel="Owner"
            title="拥有者"
          />
          {selectedConversation.participant_endpoint_ids
            .filter(
              (endpointId) =>
                endpointId !== selectedConversation.owner_endpoint_id,
            )
            .map((endpointId) => (
              <AgentChip
                agentId={endpointId}
                key={endpointId}
                roleLabel="Participant"
                title="参与方"
              />
            ))}
        </div>

        <section aria-label="消息列表" className="conversation-message-panel">
          <div className="conversation-panel-head">
            <div>
              <span>Messages</span>
              <strong>按 seq 升序</strong>
            </div>
            <code>{state.detail.messages.length}</code>
          </div>
          <ol className="conversation-message-list">
            {state.detail.messages.map((message) => (
              <li key={message.id}>
                <div className="message-head">
                  <strong>作者 {message.author_endpoint_id}</strong>
                  <code>#{message.seq}</code>
                </div>
                <p>{message.content}</p>
                <div className="conversation-card-meta">
                  <span>{message.role}</span>
                  <time>{formatTime(message.created_at)}</time>
                </div>
                {message.references.length > 0 ? (
                  <div className="reference-row">
                    {message.references.map((reference) => (
                      <span key={reference.id}>
                        {reference.type}:{reference.target_id}
                      </span>
                    ))}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <section aria-label="Summary Checkpoints" className="projection-panel">
          <div className="conversation-panel-head">
            <div>
              <span>Summary</span>
              <strong>上下文摘要</strong>
            </div>
            <code>{state.detail.summary_checkpoints.length}</code>
          </div>
          {state.detail.summary_checkpoints.length === 0 ? (
            <p className="operation-hint">暂无 summary checkpoint。</p>
          ) : (
            <ol className="projection-list">
              {state.detail.summary_checkpoints.map((checkpoint) => (
                <li key={checkpoint.id}>
                  <div>
                    <strong>
                      seq {checkpoint.covered_message_start_seq}-
                      {checkpoint.covered_message_end_seq}
                    </strong>
                    <code>{checkpoint.id}</code>
                  </div>
                  <p>{checkpoint.summary}</p>
                  <div className="projection-source-grid">
                    <span>作者 {checkpoint.author_endpoint_id}</span>
                    <time>{formatTime(checkpoint.created_at)}</time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-label="Provider Projection" className="projection-panel">
          <div className="conversation-panel-head">
            <div>
              <span>Context Projection</span>
              <strong>Provider 上下文</strong>
            </div>
            <code>{state.detail.context_projections.length}</code>
          </div>
          {state.detail.context_projections.length === 0 ? (
            <p className="operation-hint">暂无 projection。</p>
          ) : (
            <ol className="projection-list">
              {state.detail.context_projections.map((projection) => (
                <li key={projection.id}>
                  <div>
                    <strong>
                      {projection.provider} / {projection.model}
                    </strong>
                    <code>{projection.id}</code>
                  </div>
                  <p>{projection.rendered_context}</p>
                  <div className="projection-source-grid">
                    <span>messages {projection.source_message_ids.length}</span>
                    <span>
                      summaries {projection.summary_checkpoint_ids.length}
                    </span>
                    <span>refs {projection.reference_ids.length}</span>
                    <span>budget {projection.token_budget}</span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <ConversationAuditFacts detail={state.detail} />
      </article>
    </section>
  );
}

function ConversationAuditFacts({
  detail,
}: {
  detail: ConversationDetailResponse;
}) {
  return (
    <section aria-label="会话审计" className="conversation-audit-grid">
      <AuditFact label="Tool" value={String(detail.tool_invocations.length)} />
      <AuditFact
        label="Summary"
        value={String(detail.summary_checkpoints.length)}
      />
      <AuditFact label="Run" value={String(detail.model_runs.length)} />
      <AuditFact
        label="Projection"
        value={String(detail.context_projections.length)}
      />
    </section>
  );
}

function AuditFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="audit-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TaskWorkspace({
  view,
  operationProps,
}: {
  view: OverviewViewModel;
  operationProps: OperationPanelProps;
}) {
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const selectedVersion =
    view.projectVersions.find(
      (version) => version.id === operationProps.selectedVersionId,
    ) ??
    view.projectVersions[0] ??
    emptyRequirementVersion();
  const versionTasks = selectedVersion.features.flatMap(
    (feature) => feature.tasks,
  );
  const selectedTask = operationProps.selectedTaskId
    ? versionTasks.find((task) => task.id === operationProps.selectedTaskId)
    : undefined;
  const selectedTimeline = selectedTask
    ? view.timelineEvents.filter(
        (event) =>
          event.handoffId === selectedTask.handoffId ||
          event.deliveryId === selectedTask.id,
      )
    : [];
  const selectedExecutionFacts = selectedTask
    ? toTaskExecutionFacts({
        conversationState: operationProps.conversationState,
        providerRegistryState: operationProps.providerRegistryState,
        task: selectedTask,
      })
    : null;

  if (isCreatingTask) {
    return (
      <TaskCreationPage
        onCancel={() => setIsCreatingTask(false)}
        operationProps={operationProps}
        view={view}
      />
    );
  }

  return (
    <section className="task-workspace" aria-label="任务协作面板">
      <div className="project-workspace">
        <div className="project-toolbar">
          <div className="project-title-block">
            <span>需求版本</span>
            <select
              aria-label="需求版本"
              onChange={(event) => {
                operationProps.setSelectedVersionId(event.target.value);
                operationProps.setSelectedTaskId(null);
              }}
              value={selectedVersion.id}
            >
              {view.projectVersions.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.name}
                </option>
              ))}
            </select>
            <p>{selectedVersion.description}</p>
          </div>
          <fieldset className="view-switch">
            <legend className="visually-hidden">视图切换</legend>
            {(["board", "table"] as const).map((mode) => (
              <button
                className={
                  operationProps.boardViewMode === mode
                    ? "view-switch-button active"
                    : "view-switch-button"
                }
                key={mode}
                onClick={() => operationProps.setBoardViewMode(mode)}
                type="button"
              >
                {mode === "board" ? "看板" : "表格"}
              </button>
            ))}
          </fieldset>
          <button
            className="action-button primary"
            onClick={() => setIsCreatingTask(true)}
            type="button"
          >
            新增任务
          </button>
        </div>

        {operationProps.boardViewMode === "board" ? (
          <ProjectBoard
            onSelectTask={operationProps.setSelectedTaskId}
            selectedTaskId={operationProps.selectedTaskId}
            version={selectedVersion}
          />
        ) : (
          <ProjectTable
            onSelectTask={operationProps.setSelectedTaskId}
            selectedTaskId={operationProps.selectedTaskId}
            tasks={versionTasks}
          />
        )}
      </div>

      {selectedTask ? (
        <TaskDetail
          agentEndpoints={view.agentEndpoints}
          executionFacts={selectedExecutionFacts}
          operationProps={operationProps}
          providerRegistryState={operationProps.providerRegistryState}
          task={selectedTask}
          timeline={selectedTimeline}
          conversationState={operationProps.conversationState}
        />
      ) : null}
    </section>
  );
}

function TaskCreationPage({
  view,
  operationProps,
  onCancel,
}: {
  view: OverviewViewModel;
  operationProps: OperationPanelProps;
  onCancel: () => void;
}) {
  const defaultTargetActor: LocalActor =
    operationProps.selectedActor === "dev" ? "qa" : "dev";
  const [title, setTitle] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState(
    createEmptyRichTaskEditorValue,
  );
  const [targetActor, setTargetActor] =
    useState<LocalActor>(defaultTargetActor);
  const [targetAgentEndpointId, setTargetAgentEndpointId] = useState<string>(
    () => localDemoProfiles[defaultTargetActor].agent_endpoint_id,
  );
  const targetAgents = getAgentEndpointsForActor(view, targetActor);

  const handleTargetActorChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const nextActor = event.currentTarget.value as LocalActor;
      setTargetActor(nextActor);
      setTargetAgentEndpointId(localDemoProfiles[nextActor].agent_endpoint_id);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const payload: CreateTaskHandoffInput = {
        actor: operationProps.selectedActor,
        title: title.trim(),
        description: descriptionDraft.text.trim(),
        descriptionHtml: descriptionDraft.html,
        targetActor,
        targetAgentEndpointId,
        attachments: descriptionDraft.attachments,
        capabilityReferences: descriptionDraft.capabilityReferences,
      };
      await operationProps.runOperation("发送任务", () =>
        operationProps.operations.createTaskHandoff(payload),
      );
      onCancel();
    },
    [
      descriptionDraft,
      onCancel,
      operationProps,
      targetActor,
      targetAgentEndpointId,
      title,
    ],
  );

  return (
    <section className="task-creation-page" aria-label="创建任务">
      <form className="task-creation-form" onSubmit={handleSubmit}>
        <div className="task-creation-head">
          <div>
            <span>新任务</span>
            <h2>创建交接任务</h2>
          </div>
          <div className="task-creation-actions">
            <button className="action-button" onClick={onCancel} type="button">
              取消
            </button>
            <button
              className="action-button primary"
              disabled={!title.trim() || !descriptionDraft.text.trim()}
              type="submit"
            >
              发送
            </button>
          </div>
        </div>

        <div className="task-form-grid">
          <label className="form-field">
            <span>标题</span>
            <input
              aria-label="标题"
              onChange={(event) => setTitle(event.currentTarget.value)}
              required
              value={title}
            />
          </label>
          <RichTaskEditor
            actor={operationProps.selectedActor}
            capabilityMentions={operationProps.capabilityMentions}
            label="描述"
            onValueChange={setDescriptionDraft}
            placeholder="写清楚任务原由、改动背景和期望对方处理的内容。"
            value={descriptionDraft}
          />
        </div>

        <section className="target-agent-section" aria-label="目标选择">
          <div className="section-heading-row">
            <div>
              <span>目标</span>
              <strong>发送给哪个岗位的哪个 Agent</strong>
            </div>
          </div>
          <div className="target-agent-grid">
            <label className="form-field">
              <span>目标岗位</span>
              <select onChange={handleTargetActorChange} value={targetActor}>
                <option value="dev">开发</option>
                <option value="qa">质量</option>
              </select>
            </label>
            <label className="form-field">
              <span>目标 Agent</span>
              <select
                aria-label="目标 Agent"
                onChange={(event) =>
                  setTargetAgentEndpointId(event.currentTarget.value)
                }
                value={targetAgentEndpointId}
              >
                {targetAgents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.id}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>
      </form>
    </section>
  );
}

function RichTaskEditor({
  actor,
  capabilityMentions = [],
  label,
  onValueChange,
  placeholder,
  value,
}: {
  actor: LocalActor;
  capabilityMentions?: RoleCapabilityMention[];
  label: string;
  onValueChange: (value: RichTaskEditorValue) => void;
  placeholder: string;
  value: RichTaskEditorValue;
}) {
  const attachmentsRef = useRef(value.attachments);
  const capabilityReferencesRef = useRef(value.capabilityReferences);
  const textRef = useRef(value.text);
  const htmlRef = useRef(value.html);
  const onValueChangeRef = useRef(onValueChange);
  const [mentionQuery, setMentionQuery] = useState<{
    from: number;
    to: number;
    query: string;
  } | null>(null);
  const [activeCapability, setActiveCapability] =
    useState<RoleCapabilityMention | null>(null);

  useEffect(() => {
    attachmentsRef.current = value.attachments;
    capabilityReferencesRef.current = value.capabilityReferences;
    textRef.current = value.text;
    htmlRef.current = value.html;
  }, [value.attachments, value.capabilityReferences, value.html, value.text]);

  useEffect(() => {
    onValueChangeRef.current = onValueChange;
  }, [onValueChange]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Mention.configure({
        HTMLAttributes: {
          class: "editor-mention",
        },
        renderText({ node, options }) {
          return `${options.suggestion.char ?? "@"}${node.attrs.label ?? node.attrs.id}`;
        },
      }),
    ],
    content: value.html,
    editorProps: {
      attributes: {
        "aria-label": label,
        class: "task-rich-editor-content",
        role: "textbox",
      },
    },
    onUpdate({ editor: updatedEditor }) {
      const nextText = updatedEditor.getText();
      const nextHtml = updatedEditor.getHTML();
      onValueChangeRef.current({
        text: nextText,
        html: nextHtml,
        attachments: attachmentsRef.current,
        capabilityReferences: capabilityReferencesRef.current,
      });
      textRef.current = nextText;
      htmlRef.current = nextHtml;
      setMentionQuery(findActiveMentionQuery(nextText));
    },
  });

  const appendFiles = useCallback(
    (files: File[], source: DraftTaskAttachment["source"]) => {
      if (files.length === 0) {
        return;
      }
      const nextAttachments = files.map((file, fileIndex) =>
        toDraftTaskAttachment({
          file,
          source,
          actor,
          order: attachmentsRef.current.length + fileIndex + 1,
        }),
      );
      attachmentsRef.current = [...attachmentsRef.current, ...nextAttachments];
      onValueChangeRef.current({
        text: textRef.current,
        html: htmlRef.current,
        attachments: attachmentsRef.current,
        capabilityReferences: capabilityReferencesRef.current,
      });
    },
    [actor],
  );

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const files = Array.from(event.clipboardData.files ?? []);
      if (files.length === 0) {
        return;
      }
      event.preventDefault();
      appendFiles(files, "paste");
    },
    [appendFiles],
  );

  const handleInput = useCallback(
    (event: FormEvent<HTMLDivElement>) => {
      const nextText = event.currentTarget.textContent ?? "";
      const editorHtml = editor?.getHTML() ?? value.html;
      const nextHtml =
        isEmptyTiptapDocumentHtml(editorHtml) && nextText.trim().length > 0
          ? renderPlainTextAsHtml(nextText)
          : editorHtml;
      textRef.current = nextText;
      htmlRef.current = nextHtml;
      setMentionQuery(findActiveMentionQuery(nextText));
      onValueChangeRef.current({
        text: nextText,
        html: nextHtml,
        attachments: attachmentsRef.current,
        capabilityReferences: capabilityReferencesRef.current,
      });
    },
    [editor, value.html],
  );

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      appendFiles(Array.from(event.currentTarget.files ?? []), "upload");
      event.currentTarget.value = "";
    },
    [appendFiles],
  );

  const mentionOptions = useMemo(() => {
    if (!mentionQuery) {
      return [];
    }
    const normalizedQuery = mentionQuery.query.toLowerCase();
    const attachmentOptions = value.attachments
      .filter((attachment) =>
        attachment.name.toLowerCase().includes(normalizedQuery),
      )
      .map((attachment) => ({
        id: attachment.id,
        kind: "attachment" as const,
        label: attachment.name,
        description: "附件",
        attachment,
      }));
    const capabilityOptions = capabilityMentions
      .filter((capability) =>
        [
          capability.mention,
          capability.label,
          capability.summary,
          capability.sourceProjectId,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
      .map((capability) => ({
        id: `${capability.packId}:${capability.targetId}`,
        kind: "capability" as const,
        label: capability.mention,
        description: `${formatCapabilityMentionKind(capability.kind)} / ${capability.label}`,
        capability,
      }));
    return [...attachmentOptions, ...capabilityOptions].slice(0, 8);
  }, [capabilityMentions, mentionQuery, value.attachments]);

  const handleMentionSelect = useCallback(
    (option: (typeof mentionOptions)[number]) => {
      if (!mentionQuery) {
        return;
      }
      const before = textRef.current.slice(0, mentionQuery.from);
      const after = textRef.current.slice(mentionQuery.to);
      const spacer = after.startsWith(" ") || after.length === 0 ? "" : " ";
      const selectedMention =
        option.kind === "attachment"
          ? `@${option.attachment.name}`
          : option.capability.mention;
      const nextText = `${before}${selectedMention}${spacer}${after}`;
      const nextHtml =
        option.kind === "attachment"
          ? renderTextWithAttachmentMention({
              before,
              attachment: option.attachment,
              after: `${spacer}${after}`,
            })
          : renderTextWithCapabilityMention({
              before,
              capability: option.capability,
              after: `${spacer}${after}`,
            });
      if (option.kind === "capability") {
        capabilityReferencesRef.current = appendUniqueCapabilityReference(
          capabilityReferencesRef.current,
          option.capability,
        );
      }
      editor?.commands.setContent(nextHtml, { emitUpdate: false });
      textRef.current = nextText;
      htmlRef.current = nextHtml;
      setMentionQuery(null);
      onValueChangeRef.current({
        text: nextText,
        html: nextHtml,
        attachments: attachmentsRef.current,
        capabilityReferences: capabilityReferencesRef.current,
      });
    },
    [editor, mentionQuery],
  );

  return (
    <section className="rich-task-editor">
      <div className="rich-task-editor-toolbar">
        <span>{label}</span>
        <label className="file-upload-button compact">
          上传文件
          <input
            aria-label={`${label}上传文件`}
            multiple
            onChange={handleFileChange}
            type="file"
          />
        </label>
      </div>
      <div className="rich-task-editor-frame" onPaste={handlePaste}>
        <EditorContent editor={editor} onInput={handleInput} />
        {mentionOptions.length > 0 ? (
          <div
            aria-label={`${label}可引用对象`}
            className="mention-suggestion-menu"
            role="listbox"
          >
            {mentionOptions.map((option) => (
              <button
                aria-label={option.label}
                className="mention-suggestion-option"
                key={option.id}
                onClick={() => handleMentionSelect(option)}
                role="option"
                type="button"
              >
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        ) : null}
        {value.text.trim().length === 0 ? (
          <span className="rich-task-editor-placeholder">{placeholder}</span>
        ) : null}
      </div>
      {value.capabilityReferences.length > 0 ? (
        <fieldset
          aria-label={`${label}已引用能力`}
          className="capability-reference-strip"
        >
          {value.capabilityReferences.map((capability) => (
            <button
              className="capability-reference-chip"
              key={`${capability.packId}:${capability.targetId}`}
              onClick={() => setActiveCapability(capability)}
              type="button"
            >
              <span>{capability.mention}</span>
              <small>{formatCapabilityMentionKind(capability.kind)}</small>
            </button>
          ))}
          {activeCapability ? (
            <CapabilityPopover
              capability={activeCapability}
              onClose={() => setActiveCapability(null)}
            />
          ) : null}
        </fieldset>
      ) : null}
    </section>
  );
}

function CapabilityPopover({
  capability,
  onClose,
}: {
  capability: RoleCapabilityMention;
  onClose: () => void;
}) {
  return (
    <div aria-label="能力详情" className="capability-popover" role="dialog">
      <div className="capability-popover-head">
        <div>
          <span>{formatCapabilityMentionKind(capability.kind)}</span>
          <strong>{capability.mention}</strong>
        </div>
        <button
          aria-label="关闭能力详情"
          className="icon-button"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <p>{capability.summary}</p>
      <dl className="capability-popover-facts">
        <div>
          <dt>来源</dt>
          <dd>{capability.sourceProjectId}</dd>
        </div>
        <div>
          <dt>能力包</dt>
          <dd>{capability.packId}</dd>
        </div>
        <div>
          <dt>目标</dt>
          <dd>{capability.targetId}</dd>
        </div>
      </dl>
    </div>
  );
}

function ProjectBoard({
  onSelectTask,
  selectedTaskId,
  version,
}: {
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
  version: RequirementVersion;
}) {
  return (
    <section className="project-board" aria-label="Project 看板">
      {projectColumns.map((column) => {
        const tasks = version.features.flatMap((feature) =>
          feature.tasks
            .filter((task) => task.column === column.key)
            .map((task) => ({ feature, task })),
        );
        return (
          <section
            aria-label={column.label}
            className="project-column"
            key={column.key}
          >
            <div className="project-column-head">
              <span
                className={`status-dot status-${column.tone}`}
                aria-hidden="true"
              />
              <strong>{column.label}</strong>
              <code>{tasks.length}</code>
            </div>
            <p>{column.description}</p>
            {tasks.length === 0 ? (
              <div className="project-column-empty">暂无任务</div>
            ) : (
              <ol className="project-card-list">
                {tasks.map(({ task }) => (
                  <li key={task.id}>
                    <ProjectTaskCard
                      isSelected={task.id === selectedTaskId}
                      onSelectTask={onSelectTask}
                      task={task}
                    />
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </section>
  );
}

function ProjectTaskCard({
  isSelected,
  onSelectTask,
  task,
}: {
  isSelected: boolean;
  onSelectTask: (taskId: string) => void;
  task: CollaborationTask;
}) {
  return (
    <button
      className={isSelected ? "project-card active" : "project-card"}
      onClick={() => onSelectTask(task.id)}
      type="button"
    >
      <div className="project-card-head">
        <span
          className={`task-status-dot status-${task.statusTone}`}
          aria-hidden="true"
        />
        <strong>{task.title}</strong>
      </div>
      <div className="project-card-meta">
        <span>{task.relationLabel}</span>
        <time>{task.displayTime}</time>
      </div>
    </button>
  );
}

function ProjectTable({
  onSelectTask,
  selectedTaskId,
  tasks,
}: {
  onSelectTask: (taskId: string) => void;
  selectedTaskId: string | null;
  tasks: CollaborationTask[];
}) {
  if (tasks.length === 0) {
    return (
      <div className="project-table-frame">
        <div className="empty-panel">
          <strong>暂无任务</strong>
          <span>这个需求版本下还没有交接任务。</span>
        </div>
      </div>
    );
  }

  return (
    <div className="project-table-frame">
      <table className="project-table" aria-label="任务表格">
        <thead>
          <tr>
            <th scope="col">需求版本</th>
            <th scope="col">Feature</th>
            <th scope="col">任务</th>
            <th scope="col">收发状态</th>
            <th scope="col">Agent</th>
            <th scope="col">状态</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr
              className={task.id === selectedTaskId ? "active" : undefined}
              key={task.id}
              onClick={() => onSelectTask(task.id)}
            >
              <td>{task.versionName}</td>
              <td>{task.featureName}</td>
              <td>
                <strong>{task.title}</strong>
                <span>{task.summary}</span>
              </td>
              <td>{task.flowStatus}</td>
              <td>{task.agentSummary}</td>
              <td>
                <code>{task.status}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function emptyRequirementVersion(): RequirementVersion {
  return {
    id: defaultRequirementVersionId,
    name: defaultRequirementVersionName,
    description: "当前没有可展示的交接任务。",
    features: [],
  };
}

function TaskDetail({
  agentEndpoints,
  conversationState,
  executionFacts,
  operationProps,
  providerRegistryState,
  task,
  timeline,
}: {
  agentEndpoints: AgentEndpoint[];
  conversationState: ConversationState;
  executionFacts: TaskExecutionFacts | null;
  operationProps: OperationPanelProps;
  providerRegistryState: ProviderRegistryState;
  task: CollaborationTask | undefined;
  timeline: TimelineEvent[];
}) {
  if (!task) {
    return (
      <aside className="task-detail-panel" aria-label="任务详情">
        <div className="empty-panel">
          <strong>选择一个任务</strong>
          <span>任务被选中后，会在这里展示 Agent、状态和时间线。</span>
        </div>
      </aside>
    );
  }

  return (
    <TaskDetailContent
      agentEndpoints={agentEndpoints}
      conversationState={conversationState}
      executionFacts={executionFacts}
      operationProps={operationProps}
      providerRegistryState={providerRegistryState}
      task={task}
      timeline={timeline}
    />
  );
}

function TaskDetailContent({
  agentEndpoints,
  conversationState,
  executionFacts,
  operationProps,
  providerRegistryState,
  task,
  timeline,
}: {
  agentEndpoints: AgentEndpoint[];
  conversationState: ConversationState;
  executionFacts: TaskExecutionFacts | null;
  operationProps: OperationPanelProps;
  providerRegistryState: ProviderRegistryState;
  task: CollaborationTask;
  timeline: TimelineEvent[];
}) {
  const currentActor = operationProps.selectedActor;
  const currentActorEndpointId =
    localDemoProfiles[currentActor].agent_endpoint_id;
  const executableAgents = useMemo(
    () => getRealAgentEndpointsForActor(agentEndpoints, currentActor),
    [agentEndpoints, currentActor],
  );
  const [selectedExecutorEndpointId, setSelectedExecutorEndpointId] = useState(
    () => executableAgents[0]?.id ?? "",
  );
  const replyTargetActor = currentActor === "dev" ? "qa" : "dev";
  const replyTargetAgents = useMemo(
    () => getAgentEndpointsForActorFromList(agentEndpoints, replyTargetActor),
    [agentEndpoints, replyTargetActor],
  );
  const defaultReplyTargetId = useMemo(
    () =>
      replyTargetAgents[0]?.id ??
      (currentActorEndpointId === task.fromAgentId
        ? task.toAgentId
        : task.fromAgentId),
    [
      currentActorEndpointId,
      replyTargetAgents,
      task.fromAgentId,
      task.toAgentId,
    ],
  );
  const [replyTargetEndpointId, setReplyTargetEndpointId] =
    useState(defaultReplyTargetId);
  const [replyDraft, setReplyDraft] = useState(createEmptyRichTaskEditorValue);

  useEffect(() => {
    setSelectedExecutorEndpointId(executableAgents[0]?.id ?? "");
  }, [executableAgents]);

  useEffect(() => {
    setReplyTargetEndpointId(defaultReplyTargetId);
  }, [defaultReplyTargetId]);

  const handleReleaseToAgent = useCallback(() => {
    if (!selectedExecutorEndpointId) {
      return;
    }
    void operationProps.runOperation("交给 Agent 执行", () =>
      operationProps.operations.acceptDelivery(
        task.id,
        selectedExecutorEndpointId,
      ),
    );
  }, [operationProps, selectedExecutorEndpointId, task.id]);

  const handleSendReply = useCallback(
    (closeTask: boolean) => {
      const content = replyDraft.text.trim();
      const fallbackContent = closeTask ? "人工标记已结束" : "";
      if (!content && !fallbackContent) {
        return;
      }
      void operationProps.runOperation(
        closeTask ? "标记已结束" : "发送回传",
        () =>
          operationProps.operations.sendTaskReply({
            deliveryId: task.id,
            currentStatus: task.rawStatus,
            actorEndpointId: currentActorEndpointId,
            targetAgentEndpointId: replyTargetEndpointId,
            content: content || fallbackContent,
            contentHtml: replyDraft.html,
            attachments: replyDraft.attachments,
            capabilityReferences: replyDraft.capabilityReferences,
            closeTask,
          }),
      );
    },
    [
      currentActorEndpointId,
      operationProps,
      replyDraft,
      replyTargetEndpointId,
      task.id,
      task.rawStatus,
    ],
  );

  return (
    <aside className="task-detail-panel" aria-label="任务详情">
      <div className="task-detail-head">
        <span className={`status-dot status-${task.statusTone}`} />
        <div>
          <h2>{task.title}</h2>
          <p>{task.summary}</p>
        </div>
      </div>

      <div className="task-agent-grid">
        <AgentChip
          title="发起方"
          roleLabel={task.fromRole}
          agentId={task.fromAgentId}
        />
        <AgentChip
          title="接收方"
          roleLabel={task.toRole}
          agentId={task.toAgentId}
        />
      </div>

      <div className="task-marker-row">
        <code>{task.status}</code>
        {task.markers.map((marker) => (
          <span className="task-marker" key={marker}>
            {marker}
          </span>
        ))}
      </div>

      <TaskArtifacts artifacts={task.artifacts} />
      <ExecutionFactsPanel
        conversationState={conversationState}
        facts={executionFacts}
        providerRegistryState={providerRegistryState}
      />

      <AgentExecutionPanel
        executableAgents={executableAgents}
        onReleaseToAgent={handleReleaseToAgent}
        selectedExecutorEndpointId={selectedExecutorEndpointId}
        setSelectedExecutorEndpointId={setSelectedExecutorEndpointId}
      />

      <TaskReplyPanel
        actor={currentActor}
        capabilityMentions={operationProps.capabilityMentions}
        onSendReply={handleSendReply}
        replyDraft={replyDraft}
        replyTargetEndpointId={replyTargetEndpointId}
        replyTargetAgents={replyTargetAgents}
        setReplyDraft={setReplyDraft}
        setReplyTargetEndpointId={setReplyTargetEndpointId}
      />

      <TimelinePanel timeline={timeline} />
    </aside>
  );
}

function AgentExecutionPanel({
  executableAgents,
  onReleaseToAgent,
  selectedExecutorEndpointId,
  setSelectedExecutorEndpointId,
}: {
  executableAgents: AgentEndpoint[];
  onReleaseToAgent: () => void;
  selectedExecutorEndpointId: string;
  setSelectedExecutorEndpointId: (endpointId: string) => void;
}) {
  const hasExecutableAgent = executableAgents.length > 0;
  const [isConfirming, setIsConfirming] = useState(false);
  const selectedAgent = executableAgents.find(
    (agent) => agent.id === selectedExecutorEndpointId,
  );

  return (
    <section aria-label="Agent 执行" className="task-operation-panel">
      <div className="section-heading-row compact">
        <div>
          <span>Agent</span>
          <strong>交给当前岗位的真实 Agent</strong>
        </div>
      </div>
      {hasExecutableAgent ? (
        <div className="task-operation-grid">
          <label className="form-field">
            <span>执行 Agent</span>
            <select
              aria-label="执行 Agent"
              onChange={(event) =>
                setSelectedExecutorEndpointId(event.currentTarget.value)
              }
              value={selectedExecutorEndpointId}
            >
              {executableAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.id}
                </option>
              ))}
            </select>
          </label>
          <button
            className="action-button primary"
            onClick={() => setIsConfirming(true)}
            type="button"
          >
            交给 Agent 执行
          </button>
        </div>
      ) : (
        <div className="empty-panel compact">
          <strong>当前岗位没有可执行 Agent</strong>
          <span>可先人工回传，或去设置创建当前岗位 Agent。</span>
        </div>
      )}
      {isConfirming ? (
        <ConfirmActionModal
          detail={`将当前任务放行给 ${selectedAgent?.id ?? selectedExecutorEndpointId}。`}
          onCancel={() => setIsConfirming(false)}
          onConfirm={() => {
            setIsConfirming(false);
            onReleaseToAgent();
          }}
          title="确认交给 Agent 执行"
        />
      ) : null}
    </section>
  );
}

function ConfirmActionModal({
  detail,
  onCancel,
  onConfirm,
  title,
}: {
  detail: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <div className="modal-backdrop">
      <section
        aria-label={title}
        aria-modal="true"
        className="confirmation-modal"
        role="dialog"
      >
        <div className="confirmation-modal-copy">
          <span>确认动作</span>
          <h3>{title}</h3>
          <p>{detail}</p>
        </div>
        <div className="modal-actions">
          <button className="action-button" onClick={onCancel} type="button">
            取消
          </button>
          <button
            className="action-button primary"
            onClick={onConfirm}
            type="button"
          >
            确认执行
          </button>
        </div>
      </section>
    </div>
  );
}

function TaskReplyPanel({
  actor,
  capabilityMentions,
  onSendReply,
  replyDraft,
  replyTargetAgents,
  replyTargetEndpointId,
  setReplyDraft,
  setReplyTargetEndpointId,
}: {
  actor: LocalActor;
  capabilityMentions: RoleCapabilityMention[];
  onSendReply: (closeTask: boolean) => void;
  replyDraft: RichTaskEditorValue;
  replyTargetAgents: AgentEndpoint[];
  replyTargetEndpointId: string;
  setReplyDraft: (value: RichTaskEditorValue) => void;
  setReplyTargetEndpointId: (endpointId: string) => void;
}) {
  const canSendReply = replyDraft.text.trim().length > 0;

  return (
    <section aria-label="人工回传" className="task-operation-panel">
      <div className="section-heading-row compact">
        <div>
          <span>回传</span>
          <strong>人工写结果并发送给对方 Agent</strong>
        </div>
      </div>
      <RichTaskEditor
        actor={actor}
        capabilityMentions={capabilityMentions}
        label="回传内容"
        onValueChange={setReplyDraft}
        placeholder="写测试结论、复现信息、风险或需要开发继续处理的内容。"
        value={replyDraft}
      />
      <div className="task-operation-grid">
        <label className="form-field">
          <span>发送给</span>
          <select
            aria-label="发送给"
            onChange={(event) =>
              setReplyTargetEndpointId(event.currentTarget.value)
            }
            value={replyTargetEndpointId}
          >
            {replyTargetAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.id}
              </option>
            ))}
            {replyTargetAgents.some(
              (agent) => agent.id === replyTargetEndpointId,
            ) ? null : (
              <option value={replyTargetEndpointId}>
                {replyTargetEndpointId}
              </option>
            )}
          </select>
        </label>
        <div className="task-reply-actions">
          <button
            className="action-button"
            disabled={!canSendReply}
            onClick={() => onSendReply(false)}
            type="button"
          >
            发送给对方 Agent
          </button>
          <button
            className="action-button primary"
            onClick={() => onSendReply(true)}
            type="button"
          >
            标记已结束
          </button>
        </div>
      </div>
    </section>
  );
}

function TaskArtifacts({ artifacts }: { artifacts: TaskArtifact[] }) {
  if (artifacts.length === 0) {
    return null;
  }

  return (
    <section aria-label="报告与产物" className="task-artifact-panel">
      <h3>报告与产物</h3>
      <ol className="task-artifact-list">
        {artifacts.map((artifact) => (
          <li key={artifact.id}>
            <strong>{artifact.name}</strong>
            <span>{artifact.kind}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ExecutionFactsPanel({
  conversationState,
  facts,
  providerRegistryState,
}: {
  conversationState: ConversationState;
  facts: TaskExecutionFacts | null;
  providerRegistryState: ProviderRegistryState;
}) {
  const isLoading =
    conversationState.status === "loading" ||
    providerRegistryState.status === "loading";

  if (isLoading) {
    return (
      <section aria-label="运行事实" className="execution-facts-panel">
        <h3>运行事实</h3>
        <p className="operation-hint">正在读取 Agent 执行记录...</p>
      </section>
    );
  }

  if (conversationState.status === "error") {
    return (
      <section aria-label="运行事实" className="execution-facts-panel">
        <h3>运行事实</h3>
        <p className="operation-hint">{conversationState.message}</p>
      </section>
    );
  }

  if (!facts) {
    return (
      <section aria-label="运行事实" className="execution-facts-panel">
        <h3>运行事实</h3>
        <p className="operation-hint">暂无当前任务的 Agent 执行记录。</p>
      </section>
    );
  }

  return (
    <section aria-label="运行事实" className="execution-facts-panel">
      <div className="execution-facts-head">
        <h3>运行事实</h3>
        <span className={`run-status tone-${facts.tone}`}>
          {facts.runStatus}
        </span>
      </div>
      <div className="execution-fact-grid">
        <AuditFact label="Run" value={facts.modelRunId} />
        <AuditFact label="Conversation" value={facts.conversationId} />
      </div>
      <div className="runtime-binding-row">
        <span>Runtime Binding</span>
        <strong>{facts.providerModel}</strong>
        <code>{facts.executorEndpointId}</code>
        {facts.runtimeProfileLabel ? (
          <em>{facts.runtimeProfileLabel}</em>
        ) : null}
      </div>
      {facts.errorCategory || facts.errorMessage ? (
        <fieldset className="execution-error-facts">
          <legend>执行失败</legend>
          {facts.errorCategory ? <code>{facts.errorCategory}</code> : null}
          {facts.errorMessage ? <p>{facts.errorMessage}</p> : null}
        </fieldset>
      ) : null}
      <p className="execution-output">{facts.assistantOutput}</p>
      <p className="execution-context">{facts.projectionPreview}</p>
    </section>
  );
}

function AgentChip({
  title,
  roleLabel,
  agentId,
}: {
  title: string;
  roleLabel: string;
  agentId: string;
}) {
  return (
    <div className="agent-chip">
      <span>{title}</span>
      <strong>{roleLabel}</strong>
      <code>{agentId}</code>
    </div>
  );
}

function TimelinePanel({ timeline }: { timeline: TimelineEvent[] }) {
  return (
    <section aria-label="任务时间线" className="timeline-panel">
      <h3>时间线</h3>
      {timeline.length === 0 ? (
        <p className="operation-hint">暂无事件。</p>
      ) : (
        <ol className="timeline-list">
          {timeline.map((event) => (
            <li className={`timeline-item tone-${event.tone}`} key={event.id}>
              <span
                className={`timeline-marker status-${event.tone}`}
                aria-hidden="true"
              />
              <div>
                <div className="timeline-title">
                  <strong>{event.label}</strong>
                  <time>{event.time}</time>
                </div>
                <p>{event.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function AgentDirectory({
  agentEndpoints,
  selectedActor,
}: {
  agentEndpoints: AgentEndpoint[];
  selectedActor: LocalActor;
}) {
  const ownEndpoints = getRealAgentEndpointsForActor(
    agentEndpoints,
    selectedActor,
  );

  return (
    <section className="single-column-view" aria-label="Agent 列表">
      <PanelHeading
        eyebrow="Agent"
        meta={formatLocalActor(selectedActor)}
        title="我的 Agent"
      />
      {ownEndpoints.length === 0 ? (
        <div className="empty-panel">
          <strong>当前岗位还没有 Agent</strong>
          <span>打开设置重新引导，创建当前岗位的本地端点。</span>
        </div>
      ) : (
        <div className="agent-card-grid">
          {ownEndpoints.map((endpoint) => (
            <article className="agent-card" key={endpoint.id}>
              <div className="agent-card-head">
                <span className="role-chip">{endpoint.label}</span>
                <span
                  className={`status-dot status-${
                    endpoint.status === "online" ? "green" : "yellow"
                  }`}
                  aria-hidden="true"
                />
              </div>
              <h3>{endpoint.id}</h3>
              <p>{endpoint.userId}</p>
              <dl>
                <div>
                  <dt>执行器</dt>
                  <dd>{endpoint.executor}</dd>
                </div>
                <div>
                  <dt>权限</dt>
                  <dd>{endpoint.executionMode}</dd>
                </div>
                <div>
                  <dt>健康</dt>
                  <dd className="health-status-value">
                    <span
                      className={`status-dot status-${endpoint.healthTone}`}
                      aria-hidden="true"
                    />
                    {endpoint.healthSummary}
                  </dd>
                </div>
                <div>
                  <dt>最近检查</dt>
                  <dd>{endpoint.lastCheck}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ModelRegistryWorkspace({
  endpointId,
  selectedActor,
  state,
}: {
  endpointId: string;
  selectedActor: LocalActor;
  state: ProviderRegistryState;
}) {
  return (
    <section className="single-column-view" aria-label="模型注册表">
      <PanelHeading
        eyebrow="Models"
        meta={`${formatLocalActor(selectedActor)} / ${endpointId}`}
        title="模型注册表"
      />
      {renderProviderRegistryState(state)}
    </section>
  );
}

function renderProviderRegistryState(state: ProviderRegistryState) {
  if (state.status === "idle" || state.status === "loading") {
    return (
      <div className="empty-panel">
        <strong>正在加载模型注册表</strong>
        <span>正在读取当前端点可见的 Provider、Model 与 Executor。</span>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="empty-panel">
        <strong>模型注册表不可用</strong>
        <span>{state.message}</span>
      </div>
    );
  }

  if (state.registry.profiles.length === 0) {
    return (
      <div className="empty-panel">
        <strong>暂无模型配置</strong>
        <span>当前端点还没有注册 Provider/Model/Executor profile。</span>
      </div>
    );
  }

  const defaultProfileId =
    state.selection?.selected_profile_id ?? state.registry.default_profile_id;

  return (
    <div className="model-registry-layout">
      <section className="model-selection-panel" aria-label="默认模型选择">
        <div>
          <span>默认选择</span>
          <strong>
            {state.selection?.selected_profile.label ?? "暂无兼容默认模型"}
          </strong>
        </div>
        <code>
          {state.selection?.selection_reason ?? "selection unavailable"}
        </code>
      </section>

      <div className="model-card-grid">
        {state.registry.profiles.map((profile) => (
          <article className="model-card" key={profile.id}>
            <div className="model-card-head">
              <span
                className={`status-dot status-${providerProfileTone(profile)}`}
                aria-hidden="true"
              />
              <div>
                <strong>{profile.label}</strong>
                <span>
                  {profile.provider} / {profile.model}
                </span>
              </div>
              {profile.id === defaultProfileId ||
              profile.default_for_endpoint ? (
                <span className="model-badge">默认模型</span>
              ) : null}
            </div>

            <dl className="config-detail-list">
              <div>
                <dt>Executor</dt>
                <dd>{profile.executor.label}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{profile.status}</dd>
              </div>
              <div>
                <dt>Health</dt>
                <dd>{formatProviderHealth(profile)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatTime(profile.updated_at)}</dd>
              </div>
            </dl>

            <div className="model-meta-row">
              {profile.context_window ? (
                <span>{formatNumber(profile.context_window)} context</span>
              ) : null}
              {profile.max_output_tokens ? (
                <span>{formatNumber(profile.max_output_tokens)} output</span>
              ) : null}
            </div>

            <div className="model-capability-row">
              {profile.capabilities.map((capability) => (
                <span key={capability}>{capability}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ConnectorGuide({
  agentEndpoints,
  selectedActor,
}: {
  agentEndpoints: AgentEndpoint[];
  selectedActor: LocalActor;
}) {
  const endpointId = localDemoProfiles[selectedActor].agent_endpoint_id;
  const endpoint = agentEndpoints.find(
    (candidate) => candidate.id === endpointId,
  );
  const hookConfigurations = getHookConfigurations(
    selectedActor,
    endpoint?.capabilitySources,
  );

  return (
    <section className="single-column-view" aria-label="Hooks">
      <PanelHeading eyebrow="Hooks" meta={endpointId} title="Hook 配置" />
      <div className="hook-config-grid">
        {hookConfigurations.map((hook) => (
          <article className="hook-config-card" key={hook.id}>
            <div className="hook-card-head">
              <span
                className={`status-dot status-${hook.enabled ? "green" : "yellow"}`}
                aria-hidden="true"
              />
              <div>
                <strong>{hook.name}</strong>
                <span>{hook.description}</span>
              </div>
              <button className="action-button" type="button">
                Test
              </button>
            </div>
            <div className="hook-pill-row">
              <span>{hook.event}</span>
              <span>{hook.runtime}</span>
              <span>{hook.status}</span>
            </div>
            <dl className="config-detail-list">
              <div>
                <dt>触发对象</dt>
                <dd>{hook.scope}</dd>
              </div>
              <div>
                <dt>权限模式</dt>
                <dd>{hook.permissionMode}</dd>
              </div>
              <div>
                <dt>回传位置</dt>
                <dd>{hook.outputTarget}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function SkillsWorkspace({
  agentEndpoints,
  selectedActor,
}: {
  agentEndpoints: AgentEndpoint[];
  selectedActor: LocalActor;
}) {
  const endpointId = localDemoProfiles[selectedActor].agent_endpoint_id;
  const endpoint = agentEndpoints.find(
    (candidate) => candidate.id === endpointId,
  );
  const skills = getSkillConfigurations(
    selectedActor,
    endpoint?.capabilitySources,
  );

  return (
    <section className="single-column-view" aria-label="Skills">
      <PanelHeading
        eyebrow="Skills"
        meta={formatLocalActor(selectedActor)}
        title="岗位 Skills"
      />
      <div className="skill-card-grid">
        {skills.map((skill) => (
          <article className="skill-card" key={skill.id}>
            <div className="skill-card-head">
              <strong>{skill.name}</strong>
              <span>{skill.status}</span>
            </div>
            <p>{skill.description}</p>
            <dl className="config-detail-list">
              <div>
                <dt>岗位</dt>
                <dd>{skill.owner}</dd>
              </div>
              <div>
                <dt>更新</dt>
                <dd>{skill.updatedAt}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

function SettingsWorkspace({
  currentCursor,
  onOpenGuide,
  operations,
  runOperation,
  selectedActor,
  wizard,
}: {
  currentCursor: number;
  onOpenGuide: () => void;
  operations: WebConsoleOperations;
  runOperation: (
    label: string,
    run: () => Promise<OperationResult>,
  ) => Promise<void>;
  selectedActor: LocalActor;
  wizard: AgentSetupWizard;
}) {
  return (
    <section className="settings-workspace" aria-label="设置">
      <div className="settings-page-head">
        <div>
          <span>设置</span>
          <h2>{formatLocalActor(selectedActor)}工作区</h2>
        </div>
        <code>{wizard.endpointId}</code>
      </div>

      <section className="settings-list-card" aria-label="Agent 设置项">
        <div className="settings-row">
          <div className="settings-row-copy">
            <strong>Agent 引导</strong>
            <span>重新运行端点创建流程，调整执行器、Hook 和本地路径。</span>
          </div>
          <button className="action-button" onClick={onOpenGuide} type="button">
            重新打开引导
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <strong>权限模式</strong>
            <span>高风险动作需要人工确认，后续可在这里调整自动化级别。</span>
          </div>
          <code>{wizard.permissionMode}</code>
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <strong>连接状态</strong>
            <span>连接 Hub 后会同步当前岗位的投递事件。</span>
          </div>
          <button
            className="action-button"
            onClick={() =>
              void runOperation("连接端点", () =>
                operations.connectActor(wizard.actor, currentCursor),
              )
            }
            type="button"
          >
            连接端点
          </button>
        </div>
        <div className="settings-row">
          <div className="settings-row-copy">
            <strong>离线补发游标</strong>
            <span>岗位重新上线后，从该游标继续同步未确认事件。</span>
          </div>
          <div className="settings-inline-actions">
            <code>{currentCursor}</code>
            <button
              className="action-button"
              onClick={() =>
                void runOperation("重放事件", () =>
                  operations.replayActor(wizard.actor, currentCursor),
                )
              }
              type="button"
            >
              重放事件
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}

function getHookConfigurations(
  actor: LocalActor,
  capabilitySources: CapabilitySource[] | undefined,
) {
  const endpointId = localDemoProfiles[actor].agent_endpoint_id;
  const hookSources =
    capabilitySources?.filter((source) => source.type === "hook") ?? [];
  if (hookSources.length > 0) {
    return hookSources.map((source) => ({
      id: source.id,
      name: source.name,
      event: source.metadata?.event ?? source.id,
      runtime: formatCapabilitySourceType(source.type),
      status: source.enabled ? "已启用" : "停用",
      enabled: source.enabled,
      description: source.summary,
      scope: endpointId,
      permissionMode: source.approval_mode,
      outputTarget: source.capabilities.join(", "),
    }));
  }

  return [
    {
      id: `${actor}-pretooluse-guard`,
      name: "执行前确认",
      event: "PreToolUse",
      runtime: "Codex",
      status: "OK",
      enabled: true,
      description: "拦截高风险操作，进入 manual_confirm。",
      scope: endpointId,
      permissionMode: localDemoProfiles[actor].execution_mode,
      outputTarget: "任务详情 / timeline",
    },
    {
      id: `${actor}-posttooluse-report`,
      name: "产物回传",
      event: "PostToolUse",
      runtime: "Connector",
      status: "OK",
      enabled: true,
      description: "把报告、日志和截图挂回当前任务。",
      scope: endpointId,
      permissionMode: localDemoProfiles[actor].execution_mode,
      outputTarget: "任务详情 / timeline",
    },
  ];
}

function getSkillConfigurations(
  actor: LocalActor,
  capabilitySources: CapabilitySource[] | undefined,
) {
  const skillSources =
    capabilitySources?.filter((source) => source.type === "skill") ?? [];
  if (skillSources.length > 0) {
    return skillSources.map((source) => ({
      id: source.id,
      name: source.name,
      description: source.summary,
      owner: formatLocalActor(actor),
      status: source.enabled ? "已启用" : "停用",
      updatedAt: source.approval_mode,
    }));
  }

  if (actor === "qa") {
    return [
      {
        id: "qa-read-handoff-pack",
        name: "交接包阅读",
        description: "读取任务说明、变更摘要和相关产物，形成测试入口。",
        owner: "质量",
        status: "已启用",
        updatedAt: "随 Agent 配置同步",
      },
      {
        id: "qa-test-scope",
        name: "测试范围分析",
        description: "根据任务状态和 artifact 输出冒烟范围、风险点和回归建议。",
        owner: "质量",
        status: "已启用",
        updatedAt: "随 Agent 配置同步",
      },
    ];
  }

  return [
    {
      id: "dev-change-report",
      name: "变更报告生成",
      description: "把代码变更、影响范围和自测结果整理成可交接说明。",
      owner: "开发",
      status: "已启用",
      updatedAt: "随 Agent 配置同步",
    },
    {
      id: "dev-handoff-pack",
      name: "交接包生成",
      description: "生成 agent-readable 的交接入口和任务上下文。",
      owner: "开发",
      status: "已启用",
      updatedAt: "随 Agent 配置同步",
    },
  ];
}

function formatLocalActor(actor: LocalActor) {
  return actor === "qa" ? "质量" : "开发";
}

function formatCapabilitySourceType(type: CapabilitySource["type"]) {
  const labels: Record<CapabilitySource["type"], string> = {
    skill: "Skill",
    hook: "Hook",
    plugin: "Plugin",
    mcp: "MCP",
    command: "Command",
    manual_prompt: "Manual prompt",
    local_resource: "Local resource",
  };
  return labels[type];
}

function OperationsPanel({
  selectedActor,
  setSelectedActor,
  cursorByActor,
  operationLog,
  operationState,
  operations,
  runOperation,
  selectedDeliveryId,
}: OperationPanelProps & { selectedDeliveryId?: string }) {
  const selectedProfile = localDemoProfiles[selectedActor];
  const currentCursor = cursorByActor[selectedActor];
  const canCreateDemoHandoff = selectedActor === "dev";
  const hasSelectedDelivery = selectedDeliveryId !== undefined;

  return (
    <section className="panel operations-panel" aria-label="用户操作">
      <PanelHeading
        eyebrow="操作"
        title="用户操作"
        meta={operationState.status === "running" ? operationState.label : ""}
      />

      <div className="operation-block">
        <div className="operation-label-row">
          <span>执行方</span>
          <code>{selectedProfile.agent_endpoint_id}</code>
        </div>
        <fieldset className="segmented-control">
          <legend className="visually-hidden">执行方</legend>
          {(["dev", "qa"] as const).map((actor) => (
            <button
              className={
                actor === selectedActor
                  ? "segment-button active"
                  : "segment-button"
              }
              key={actor}
              onClick={() => setSelectedActor(actor)}
              type="button"
            >
              {actor === "dev" ? "开发" : "质量"}
            </button>
          ))}
        </fieldset>
      </div>

      <div className="operation-actions">
        <button
          className="action-button primary"
          onClick={() =>
            void runOperation("注册端点", () =>
              operations.registerActor(selectedActor),
            )
          }
          type="button"
        >
          注册端点
        </button>
        <button
          className="action-button"
          disabled={!canCreateDemoHandoff}
          onClick={() =>
            void runOperation("创建演示交接", () =>
              operations.createDemoHandoff(),
            )
          }
          type="button"
        >
          创建演示交接
        </button>
        {!canCreateDemoHandoff ? (
          <p className="operation-hint">演示交接需要从开发端发起</p>
        ) : null}
      </div>

      <div className="operation-block">
        <div className="operation-label-row">
          <span>重放游标</span>
          <code>{currentCursor}</code>
        </div>
        <div className="delivery-command-grid">
          <button
            className="action-button"
            onClick={() =>
              void runOperation("重放事件", () =>
                operations.replayActor(selectedActor, currentCursor),
              )
            }
            type="button"
          >
            重放事件
          </button>
          <button
            className="action-button"
            onClick={() =>
              void runOperation("连接端点", () =>
                operations.connectActor(selectedActor, currentCursor),
              )
            }
            type="button"
          >
            连接端点
          </button>
        </div>
      </div>

      <div className="operation-block">
        <div className="operation-label-row">
          <span>当前投递</span>
          <code>{selectedDeliveryId ?? "无"}</code>
        </div>
        <div className="delivery-command-grid">
          <button
            className="action-button"
            disabled={!hasSelectedDelivery}
            onClick={() =>
              void runOperation("确认接收", () =>
                operations.ackDelivery(selectedDeliveryId ?? ""),
              )
            }
            type="button"
          >
            确认接收
          </button>
          <button
            className="action-button"
            disabled={!hasSelectedDelivery}
            onClick={() =>
              void runOperation("标记失败", () =>
                operations.failDelivery(
                  selectedDeliveryId ?? "",
                  "Web Console 标记失败",
                ),
              )
            }
            type="button"
          >
            标记失败
          </button>
          <button
            className="action-button"
            disabled={!hasSelectedDelivery}
            onClick={() =>
              void runOperation("标记过期", () =>
                operations.expireDelivery(
                  selectedDeliveryId ?? "",
                  "Web Console 标记过期",
                ),
              )
            }
            type="button"
          >
            标记过期
          </button>
        </div>
      </div>

      <div className="operation-log" aria-live="polite">
        <div className="operation-label-row">
          <span>操作日志</span>
          <code>{operationLog.length}</code>
        </div>
        {operationLog.length === 0 ? (
          <p className="operation-hint">本次会话还没有执行任何操作。</p>
        ) : (
          <ol className="operation-log-list">
            {operationLog.map((item) => (
              <li className={`operation-log-item ${item.status}`} key={item.id}>
                <span
                  className={
                    item.status === "succeeded"
                      ? "status-dot status-green"
                      : "status-dot status-red"
                  }
                  aria-hidden="true"
                />
                <div>
                  <strong>{item.label}</strong>
                  <p>{item.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function OnboardingOverlay({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      aria-label="Agent 创建引导"
      aria-modal="true"
      className="onboarding-layer"
      role="dialog"
    >
      <section className="onboarding-card">
        <p className="eyebrow">首次配置</p>
        <h2>创建一个可协作的岗位 Agent</h2>
        <ol className="onboarding-steps">
          {setupSteps.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </li>
          ))}
        </ol>
        <div className="onboarding-actions">
          <button
            className="action-button primary"
            onClick={onDismiss}
            type="button"
          >
            开始使用
          </button>
          <button className="action-button" onClick={onDismiss} type="button">
            跳过
          </button>
        </div>
      </section>
    </div>
  );
}

function toOverviewViewModel(
  overview: HandoffOverviewResponse,
  selectedActor: LocalActor,
): OverviewViewModel {
  const actorEndpointId = localDemoProfiles[selectedActor].agent_endpoint_id;
  const currentEndpoint =
    overview.agent_endpoints.find(
      (endpoint) => endpoint.agent_endpoint_id === actorEndpointId,
    )?.agent_endpoint_id ??
    overview.agent_endpoints[0]?.agent_endpoint_id ??
    "暂无端点";
  const artifactsByHandoffId = new Map<string, TaskArtifact[]>();
  for (const report of overview.reports) {
    const artifacts = artifactsByHandoffId.get(report.handoff_id) ?? [];
    artifacts.push({
      id: report.id,
      name: report.name,
      kind: formatReportKind(report.kind),
    });
    artifactsByHandoffId.set(report.handoff_id, artifacts);
  }
  const collaborationTasks = overview.deliveries
    .filter(
      (delivery) =>
        !isInternalDemoDelivery(delivery) &&
        (delivery.from.agent_endpoint_id === actorEndpointId ||
          delivery.to.agent_endpoint_id === actorEndpointId),
    )
    .map((delivery) =>
      toCollaborationTask({
        actorEndpointId,
        artifacts: artifactsByHandoffId.get(delivery.handoff_id) ?? [],
        delivery,
      }),
    );
  const visibleHandoffIds = new Set(
    collaborationTasks.map((task) => task.handoffId),
  );

  const endpointDiagnostics = {
    dev: deriveEndpointDiagnostics({ overview, actor: "dev" }),
    qa: deriveEndpointDiagnostics({ overview, actor: "qa" }),
  };

  return {
    currentEndpoint,
    currentEndpointName: formatEndpointName(currentEndpoint),
    agentEndpoints: overview.agent_endpoints.map((endpoint) => {
      const health = summarizeEndpointHealth(endpoint.health_report);
      return {
        id: endpoint.agent_endpoint_id,
        userId: endpoint.user_id,
        label: formatRole(endpoint.role),
        actor: toLocalActorFromRole(endpoint.role),
        executor: endpoint.executor.label,
        capabilitySources: endpoint.capability_sources,
        status: endpoint.online ? "online" : "standby",
        lastCheck: `最近检查 ${formatTime(endpoint.updated_at)}`,
        executionMode: endpoint.approval_policy.mode,
        healthSummary: health.summary,
        healthReport: health.report,
        healthTone: health.tone,
      };
    }),
    collaborationTasks,
    projectVersions: buildRequirementVersions(collaborationTasks),
    timelineEvents: overview.timeline
      .filter((event) => visibleHandoffIds.has(event.handoff_id))
      .map((event) => ({
        id: event.id,
        label: formatTimelineLabel(event.label),
        detail: formatTimelineDetail(event.detail),
        time: event.time,
        tone: event.tone,
        handoffId: event.handoff_id,
        deliveryId: event.delivery_id,
      })),
    endpointDiagnostics,
    setupWizards: {
      dev: deriveAgentSetupWizard({
        actor: "dev",
        diagnostics: endpointDiagnostics.dev,
      }),
      qa: deriveAgentSetupWizard({
        actor: "qa",
        diagnostics: endpointDiagnostics.qa,
      }),
    },
  };
}

function toCollaborationTask({
  actorEndpointId,
  artifacts,
  delivery,
}: {
  actorEndpointId: string;
  artifacts: TaskArtifact[];
  delivery: HandoffOverviewResponse["deliveries"][number];
}): CollaborationTask {
  const title = formatTaskTitle(delivery.title);
  const version = inferRequirementVersion(title);
  const feature = inferFeature(title);
  const activeActorEndpointId = delivery.active_actor_endpoint_id ?? null;
  const activeTargetAgentEndpointId =
    delivery.active_target_agent_endpoint_id ?? null;
  const actorRelation = resolveActorTaskRelation({
    actorEndpointId,
    activeActorEndpointId,
    activeTargetAgentEndpointId,
    originalFromEndpointId: delivery.from.agent_endpoint_id,
    status: delivery.status,
  });
  const directionLabel = actorRelation === "sent" ? "我发送的" : "我接收的";
  const relationLabel =
    actorRelation === "sent"
      ? `发给 ${formatEndpointRole({
          endpointId:
            activeTargetAgentEndpointId ?? delivery.to.agent_endpoint_id,
          delivery,
        })}`
      : `来自 ${formatEndpointRole({
          endpointId: activeActorEndpointId ?? delivery.from.agent_endpoint_id,
          delivery,
        })}`;
  const flowStatus = formatDeliveryFlowStatus(delivery.status, actorRelation);
  const hasReturnedReport = artifacts.length > 0;

  return {
    id: delivery.id,
    handoffId: delivery.handoff_id,
    title,
    summary: formatHandoffSummary(delivery.summary),
    versionId: version.id,
    versionName: version.name,
    featureId: feature.id,
    featureName: feature.name,
    fromRole: formatRole(delivery.from.role),
    toRole: formatRole(delivery.to.role),
    fromAgentId: delivery.from.agent_endpoint_id,
    toAgentId: delivery.to.agent_endpoint_id,
    activeActorEndpointId,
    activeTargetAgentEndpointId,
    actorRelation,
    directionLabel,
    flowStatus,
    agentSummary: `${delivery.from.agent_endpoint_id} -> ${delivery.to.agent_endpoint_id}`,
    rawStatus: delivery.status,
    status: formatDeliveryStatus(delivery.status),
    statusTone: deliveryStatusTone(delivery.status, hasReturnedReport),
    column: projectColumnForDelivery({
      status: delivery.status,
      actorRelation,
    }),
    relationLabel,
    displayTime: formatTaskDisplayTime(delivery),
    markers: [
      version.name,
      feature.name,
      directionLabel,
      `收发状态：${flowStatus}`,
      `cursor ${delivery.cursor}`,
      delivery.delivered_at ? "已投递" : "待投递",
      delivery.acknowledged_at ? "已确认" : "待确认",
    ],
    artifacts,
  };
}

function toTaskExecutionFacts(input: {
  conversationState: ConversationState;
  providerRegistryState: ProviderRegistryState;
  task: CollaborationTask;
}): TaskExecutionFacts | null {
  if (
    input.conversationState.status !== "ready" ||
    input.conversationState.detail === null
  ) {
    return null;
  }
  const detail = input.conversationState.detail;
  if (!conversationMatchesTask(detail, input.task)) {
    return null;
  }

  const modelRun =
    [...detail.model_runs]
      .reverse()
      .find((run) => recordMatchesTask(run, input.task)) ??
    [...detail.model_runs].reverse()[0];
  const assistantMessage =
    [...detail.messages]
      .reverse()
      .find(
        (message) =>
          message.role === "assistant" &&
          recordMatchesTask(message, input.task),
      ) ??
    [...detail.messages]
      .reverse()
      .find((message) => message.role === "assistant");
  const projection =
    [...detail.context_projections]
      .reverse()
      .find((item) => recordMatchesTask(item, input.task)) ??
    [...detail.context_projections].reverse()[0];
  const selectedProfile =
    input.providerRegistryState.status === "ready"
      ? (input.providerRegistryState.selection?.selected_profile ?? null)
      : null;
  const provider = modelRun?.provider ?? selectedProfile?.provider ?? "codex";
  const model = modelRun?.model ?? selectedProfile?.model ?? "未选择模型";
  const errorCategory =
    modelRun?.error?.category ?? modelRun?.metadata?.error_category ?? null;
  const errorMessage =
    modelRun?.error?.message ?? modelRun?.metadata?.error_message ?? null;

  return {
    conversationId: detail.conversation.id,
    modelRunId: modelRun?.id ?? "暂无 model run",
    runStatus: formatModelRunStatus(modelRun?.status),
    providerModel: `${provider} / ${model}`,
    executorEndpointId:
      modelRun?.executor_endpoint_id ??
      selectedProfile?.agent_endpoint_id ??
      input.task.toAgentId,
    errorCategory,
    errorMessage,
    assistantOutput: assistantMessage?.content ?? "暂无 assistant 输出。",
    projectionPreview: projection
      ? compactText(projection.rendered_context, 160)
      : "暂无 context projection。",
    runtimeProfileLabel: selectedProfile?.label ?? null,
    tone: modelRunStatusTone(modelRun?.status),
  };
}

function conversationMatchesTask(
  detail: ConversationDetailResponse,
  task: CollaborationTask,
) {
  return (
    metadataMatchesTask(detail.conversation.metadata, task) ||
    detail.messages.some((message) => recordMatchesTask(message, task)) ||
    detail.model_runs.some((run) => recordMatchesTask(run, task)) ||
    detail.context_projections.some((projection) =>
      recordMatchesTask(projection, task),
    )
  );
}

function resolveActorTaskRelation(input: {
  actorEndpointId: string;
  activeActorEndpointId: string | null;
  activeTargetAgentEndpointId: string | null;
  originalFromEndpointId: string;
  status: string;
}): ActorTaskRelation {
  if (input.activeTargetAgentEndpointId === input.actorEndpointId) {
    return "received";
  }
  if (input.activeActorEndpointId === input.actorEndpointId) {
    return input.status === "report_ready" || input.status === "closed"
      ? "sent"
      : "received";
  }
  if (input.activeActorEndpointId) {
    return "sent";
  }
  return input.originalFromEndpointId === input.actorEndpointId
    ? "sent"
    : "received";
}

function formatEndpointRole(input: {
  endpointId: string;
  delivery: HandoffOverviewResponse["deliveries"][number];
}) {
  if (input.endpointId === input.delivery.from.agent_endpoint_id) {
    return formatRole(input.delivery.from.role);
  }
  if (input.endpointId === input.delivery.to.agent_endpoint_id) {
    return formatRole(input.delivery.to.role);
  }
  if (input.endpointId === localDemoProfiles.dev.agent_endpoint_id) {
    return "开发";
  }
  if (input.endpointId === localDemoProfiles.qa.agent_endpoint_id) {
    return "质量";
  }
  return input.endpointId;
}

function recordMatchesTask(
  record: {
    references?: Array<{ target_id: string }>;
    reference_ids?: string[];
    metadata?: Record<string, string>;
  },
  task: CollaborationTask,
) {
  return (
    metadataMatchesTask(record.metadata, task) ||
    record.references?.some(
      (reference) =>
        reference.target_id === task.id ||
        reference.target_id === task.handoffId,
    ) ||
    record.reference_ids?.some(
      (referenceId) =>
        referenceId === task.id || referenceId === task.handoffId,
    ) ||
    false
  );
}

function metadataMatchesTask(
  metadata: Record<string, string> | undefined,
  task: CollaborationTask,
) {
  return (
    metadata?.delivery_id === task.id || metadata?.handoff_id === task.handoffId
  );
}

function isInternalDemoDelivery(
  delivery: HandoffOverviewResponse["deliveries"][number],
) {
  return delivery.title === "web-console-demo-handoff";
}

function buildRequirementVersions(
  tasks: CollaborationTask[],
): RequirementVersion[] {
  if (tasks.length === 0) {
    return [emptyRequirementVersion()];
  }

  const versionMap = new Map<string, RequirementVersion>();
  for (const task of tasks) {
    const version =
      versionMap.get(task.versionId) ??
      ({
        id: task.versionId,
        name: task.versionName,
        description:
          "按需求版本组织 Feature，每个 Feature 可以包含多个交接任务。",
        features: [],
      } satisfies RequirementVersion);
    const feature =
      version.features.find((item) => item.id === task.featureId) ??
      ({
        id: task.featureId,
        name: task.featureName,
        tasks: [],
      } satisfies FeatureGroup);
    feature.tasks.push(task);
    if (!version.features.some((item) => item.id === feature.id)) {
      version.features.push(feature);
    }
    versionMap.set(version.id, version);
  }

  return Array.from(versionMap.values());
}

function getAgentEndpointsForActor(
  view: OverviewViewModel,
  actor: LocalActor,
): AgentEndpoint[] {
  return getAgentEndpointsForActorFromList(view.agentEndpoints, actor);
}

function getAgentEndpointsForActorFromList(
  agentEndpoints: AgentEndpoint[],
  actor: LocalActor,
): AgentEndpoint[] {
  const fallbackEndpointId = localDemoProfiles[actor].agent_endpoint_id;
  const endpoints = agentEndpoints.filter(
    (endpoint) =>
      endpoint.actor === actor || endpoint.id === fallbackEndpointId,
  );
  if (endpoints.length > 0) {
    return endpoints;
  }
  return [
    {
      id: fallbackEndpointId,
      userId: localDemoProfiles[actor].user_id,
      label: formatLocalActor(actor),
      actor,
      executor: inferExecutor(fallbackEndpointId),
      capabilitySources: [],
      status: "standby",
      lastCheck: "等待注册",
      executionMode: localDemoProfiles[actor].execution_mode,
      healthSummary: "等待健康检查",
      healthReport: "暂无报告",
      healthTone: "yellow",
    },
  ];
}

function getRealAgentEndpointsForActor(
  agentEndpoints: AgentEndpoint[],
  actor: LocalActor,
): AgentEndpoint[] {
  return agentEndpoints.filter(
    (endpoint) => endpoint.actor === actor && endpoint.status === "online",
  );
}

function createEmptyRichTaskEditorValue(): RichTaskEditorValue {
  return { text: "", html: "", attachments: [], capabilityReferences: [] };
}

function findActiveMentionQuery(text: string) {
  const matches = Array.from(text.matchAll(/(^|\s)@([^\s@]*)/g));
  const match = matches.at(-1);
  if (!match || match.index === undefined) {
    return null;
  }
  const prefixLength = match[1]?.length ?? 0;
  const query = match[2] ?? "";
  const from = match.index + prefixLength;
  return {
    from,
    to: from + query.length + 1,
    query,
  };
}

function renderTextWithAttachmentMention(input: {
  before: string;
  attachment: DraftTaskAttachment;
  after: string;
}) {
  return `<p>${escapeHtml(input.before)}${toAttachmentMentionHtml(
    input.attachment,
  )}${escapeHtml(input.after)}</p>`;
}

function renderTextWithCapabilityMention(input: {
  before: string;
  capability: RoleCapabilityMention;
  after: string;
}) {
  return `<p>${escapeHtml(input.before)}${toCapabilityMentionHtml(
    input.capability,
  )}${escapeHtml(input.after)}</p>`;
}

function renderPlainTextAsHtml(value: string) {
  return `<p>${escapeHtml(value).replaceAll("\n", "<br>")}</p>`;
}

function isEmptyTiptapDocumentHtml(value: string) {
  return value.replace(/\s+/g, "") === "<p></p>";
}

function toAttachmentMentionHtml(attachment: DraftTaskAttachment) {
  return `<span data-type="mention" data-id="${escapeHtml(
    attachment.id,
  )}" data-label="${escapeHtml(
    attachment.name,
  )}" data-mention-suggestion-char="@" class="editor-mention">@${escapeHtml(
    attachment.name,
  )}</span>`;
}

function toCapabilityMentionHtml(capability: RoleCapabilityMention) {
  return `<span data-type="mention" data-id="${escapeHtml(
    capability.targetId,
  )}" data-label="${escapeHtml(
    capability.mention.replace(/^@/, ""),
  )}" data-capability-kind="${escapeHtml(
    capability.kind,
  )}" data-source-project="${escapeHtml(
    capability.sourceProjectId,
  )}" data-mention-suggestion-char="@" class="editor-mention">${escapeHtml(
    capability.mention,
  )}</span>`;
}

function appendUniqueCapabilityReference(
  references: RoleCapabilityMention[],
  capability: RoleCapabilityMention,
) {
  if (
    references.some(
      (reference) =>
        reference.packId === capability.packId &&
        reference.targetId === capability.targetId,
    )
  ) {
    return references;
  }
  return [...references, capability];
}

function formatCapabilityMentionKind(kind: RoleCapabilityMention["kind"]) {
  const labels: Record<RoleCapabilityMention["kind"], string> = {
    repo: "Repo",
    skill: "Skill",
    command: "Command",
    hook: "Hook",
    constraint: "Constraint",
  };
  return labels[kind];
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toDraftTaskAttachment(input: {
  file: File;
  source: DraftTaskAttachment["source"];
  actor: LocalActor;
  order: number;
}): DraftTaskAttachment {
  const userId = localDemoProfiles[input.actor].user_id;
  const safeName = toSafeFileName(
    input.file.name || `attachment-${input.order}`,
  );
  return {
    id: `attachment_${input.order}_${safeName}`,
    name: safeName,
    kind:
      input.source === "paste" && input.file.type.startsWith("image/")
        ? "pasted_image"
        : "uploaded_file",
    storageUrl: `https://${taskArtifactStorageProfile.cdnDomain}/${taskArtifactStorageProfile.basePrefix}/${userId}/${input.order}-${safeName}`,
    checksum: `sha256-${input.order}-${safeName}-${input.file.size}`,
    source: input.source,
  };
}

function toSafeFileName(value: string) {
  return value.replace(/[^\p{L}\p{N}._-]+/gu, "-") || "attachment";
}

function createHubOverviewLoader(baseUrl: string): OverviewLoader {
  const client = new HandoffHubClient({ baseUrl });
  return () => client.getOverview("local-demo");
}

function createHubConversationLoader(baseUrl: string): ConversationLoader {
  const client = new HandoffHubClient({ baseUrl });
  return async ({ endpointId }) => {
    const list = await client.getConversations({
      tenantId: "local-demo",
      endpointId,
    });
    const firstConversation = list.conversations[0];
    const detail = firstConversation
      ? await client.getConversationDetail(firstConversation.id, list.tenant_id)
      : null;
    return { list, detail };
  };
}

function createHubProviderRegistryLoader(
  baseUrl: string,
): ProviderRegistryLoader {
  const client = new HandoffHubClient({ baseUrl });
  return async ({ endpointId }) => {
    const registry = await client.getProviderModelRegistry({
      tenantId: "local-demo",
      endpointId,
    });
    const selection =
      registry.profiles.length === 0
        ? null
        : await resolveDefaultProviderSelection(client, endpointId);
    return { registry, selection };
  };
}

function createHubRoleCapabilityCatalogLoader(
  baseUrl: string,
): RoleCapabilityCatalogLoader {
  const client = new HandoffHubClient({ baseUrl });
  return (tenantId) => client.getRoleCapabilityCatalog(tenantId);
}

async function resolveDefaultProviderSelection(
  client: HandoffHubClient,
  endpointId: string,
) {
  try {
    return await client.resolveProviderModelSelection({
      schema_version: "1.0",
      tenant_id: "local-demo",
      endpoint_id: endpointId,
      required_capabilities: ["chat"],
    });
  } catch {
    return null;
  }
}

function resolveHubBaseUrl() {
  const meta = import.meta as ImportMeta & {
    env?: { VITE_SARTRE_HUB_URL?: string };
  };
  return meta.env?.VITE_SARTRE_HUB_URL ?? "http://localhost:3000";
}

function renderNavGroups(
  items: NavItem[],
  activeView: ViewKey,
  selectView: (view: ViewKey) => void,
) {
  const groups = Array.from(new Set(items.map((item) => item.group)));

  return groups.map((group) => (
    <section className="nav-group" key={group}>
      <p>{group}</p>
      {items
        .filter((item) => item.group === group)
        .map((item) => (
          <NavButton
            isActive={item.view === activeView}
            item={item}
            key={item.label}
            onSelect={selectView}
          />
        ))}
    </section>
  ));
}

function NavButton({
  item,
  isActive,
  onSelect,
}: {
  item: Pick<NavItem, "icon" | "label" | "view">;
  isActive: boolean;
  onSelect: (view: ViewKey) => void;
}) {
  return (
    <button
      aria-current={isActive ? "page" : undefined}
      className={isActive ? "nav-item active" : "nav-item"}
      onClick={() => onSelect(item.view)}
      type="button"
    >
      <NavIcon kind={item.icon} />
      {item.label}
    </button>
  );
}

function NavIcon({ kind }: { kind: NavIconKind }) {
  const iconPath = navIconPath(kind);

  return (
    <svg
      aria-hidden="true"
      className="nav-icon"
      fill="none"
      focusable="false"
      viewBox="0 0 16 16"
    >
      {iconPath}
    </svg>
  );
}

function navIconPath(kind: NavIconKind) {
  if (kind === "inbox") {
    return (
      <>
        <path d="M3 3.5h10l1 5v4H2v-4l1-5Z" />
        <path d="M2.8 8.5h3.1l.9 1.5h2.4l.9-1.5h3.1" />
      </>
    );
  }

  if (kind === "conversations") {
    return (
      <>
        <path d="M3 3.4h10v7.1H8.2L5.4 13v-2.5H3V3.4Z" />
        <path d="M5.5 6h5" />
        <path d="M5.5 8h3.4" />
      </>
    );
  }

  if (kind === "agents") {
    return (
      <>
        <circle cx="5.2" cy="5.6" r="2" />
        <circle cx="10.8" cy="5.6" r="2" />
        <path d="M2.5 13c.6-2 1.9-3 3.9-3" />
        <path d="M13.5 13c-.6-2-1.9-3-3.9-3" />
      </>
    );
  }

  if (kind === "models") {
    return (
      <>
        <rect x="2.6" y="3" width="10.8" height="10" rx="1.6" />
        <path d="M5.2 5.5h5.6" />
        <path d="M5.2 8h5.6" />
        <path d="M5.2 10.5h3.4" />
      </>
    );
  }

  if (kind === "hooks") {
    return (
      <>
        <path d="M4 3.5v3.2c0 1.6 1.1 2.6 2.7 2.6H8" />
        <path d="M12 3.5v3.2c0 1.6-1.1 2.6-2.7 2.6H8" />
        <path d="M8 9.3v3.2" />
        <path d="M6.3 12.5h3.4" />
      </>
    );
  }

  if (kind === "skills") {
    return <path d="M8.8 1.8 3.7 8.7h3.4l-.7 5.5 5.9-7.4H8.7l.1-5Z" />;
  }

  return (
    <>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.8v2" />
      <path d="M8 12.2v2" />
      <path d="m3.6 3.6 1.4 1.4" />
      <path d="m11 11 1.4 1.4" />
      <path d="M1.8 8h2" />
      <path d="M12.2 8h2" />
      <path d="m3.6 12.4 1.4-1.4" />
      <path d="m11 5 1.4-1.4" />
    </>
  );
}

function PanelHeading({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="panel-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {meta ? <span>{meta}</span> : null}
    </div>
  );
}

function formatEndpointName(endpointId: string) {
  if (endpointId.includes("qa")) {
    return "质量端点";
  }
  if (endpointId.includes("dev")) {
    return "开发端点";
  }
  return "当前端点";
}

function formatRole(role: string) {
  if (role === "qa") {
    return "质量";
  }
  if (role === "developer") {
    return "开发";
  }
  return role;
}

function toLocalActorFromRole(role: string): LocalActor | null {
  if (role === "qa") {
    return "qa";
  }
  if (role === "developer") {
    return "dev";
  }
  return null;
}

function inferExecutor(endpointId: string) {
  if (endpointId.includes("codex")) {
    return "Codex";
  }
  if (endpointId.includes("claude")) {
    return "Claude";
  }
  return "手动";
}

function formatTaskTitle(title: string) {
  return title.replaceAll("web-console-demo-handoff", "试运行交接任务");
}

function formatTaskText(value: string) {
  return value.replaceAll("web-console-demo-handoff", "试运行交接任务");
}

function formatTaskDisplayTime(
  delivery: HandoffOverviewResponse["deliveries"][number],
) {
  const timestamp = delivery.acknowledged_at ?? delivery.delivered_at;
  return timestamp ? formatTime(timestamp) : "待投递";
}

function formatDeliveryStatus(status: string) {
  const statusLabels: Record<string, string> = {
    pending_delivery: "待投递",
    delivered: "已投递",
    acknowledged: "已确认",
    accepted: "已放行",
    running: "执行中",
    report_ready: "已生成结果",
    closed: "已结束",
    failed: "失败",
    expired: "已过期",
  };
  return statusLabels[status] ?? status;
}

function deliveryStatusTone(status: string, hasReturnedReport: boolean) {
  if (hasReturnedReport) {
    return "green";
  }
  if (status === "failed" || status === "expired") {
    return "red";
  }
  if (status === "closed") {
    return "green";
  }
  if (status === "delivered" || status === "pending_delivery") {
    return "blue";
  }
  return "yellow";
}

function formatDeliveryFlowStatus(
  status: string,
  actorRelation: ActorTaskRelation,
) {
  if (status === "report_ready") {
    return actorRelation === "sent" ? "已发送" : "已接收";
  }
  if (status === "accepted" || status === "running") {
    return actorRelation === "sent" ? "已发送" : "已接收";
  }
  const statusLabels: Record<string, string> = {
    pending_delivery: "已发送",
    delivered: "已接收",
    acknowledged: "已接收",
    closed: "已结束",
    failed: "失败",
    expired: "过期",
  };
  return statusLabels[status] ?? status;
}

function projectColumnForDelivery(input: {
  status: string;
  actorRelation: ActorTaskRelation;
}): ProjectColumnKey {
  if (
    input.status === "closed" ||
    input.status === "failed" ||
    input.status === "expired"
  ) {
    return "done";
  }
  if (input.actorRelation === "sent") {
    return "sent";
  }
  if (
    [
      "delivered",
      "acknowledged",
      "accepted",
      "running",
      "report_ready",
    ].includes(input.status)
  ) {
    return "received";
  }
  return "sent";
}

function inferRequirementVersion(title: string) {
  const versionMatch = title.match(/\b(v\d+(?:\.\d+)*)\b/i);
  if (!versionMatch) {
    return {
      id: defaultRequirementVersionId,
      name: defaultRequirementVersionName,
    };
  }

  const versionToken = versionMatch[1] ?? defaultRequirementVersionName;
  const normalized = versionToken.toLowerCase();
  return {
    id: normalized,
    name: `${versionToken} 需求版本`,
  };
}

function inferFeature(title: string) {
  const featureSegment =
    title
      .replace(/\b(v\d+(?:\.\d+)*)\b/gi, "")
      .split(":")
      .at(0) ?? "";
  const normalized = featureSegment.trim().replace(/\s+/g, "-");
  const featureName = normalized || "默认 Feature";
  return {
    id: featureName.toLowerCase(),
    name: featureName,
  };
}

function formatHandoffSummary(summary: string) {
  if (summary === "Run QA smoke and return report") {
    return "执行质量冒烟测试并返回报告";
  }
  if (summary === "Run the local QA smoke and return a concise report.") {
    return "执行本地质量冒烟测试，并返回简明报告。";
  }
  return formatTaskText(summary);
}

function formatTimelineLabel(label: string) {
  const labelMap: Record<string, string> = {
    Queued: "已入队",
    Delivered: "已投递",
    Redelivered: "已补投",
    Acknowledged: "已确认",
    Accepted: "已放行",
    Running: "执行中",
    "Report ready": "已生成结果",
    Closed: "已结束",
    "Report returned": "报告已返回",
    Failed: "投递失败",
    Expired: "投递过期",
  };
  return labelMap[label] ?? label;
}

function formatTimelineDetail(detail: string) {
  const readableDetail = formatTaskText(detail);
  if (readableDetail.startsWith("Dev published ")) {
    return `开发已发布 ${readableDetail.slice("Dev published ".length)}`;
  }
  if (readableDetail.startsWith("QA endpoint received ")) {
    return `质量端点已接收 ${readableDetail.slice(
      "QA endpoint received ".length,
    )}`;
  }
  if (readableDetail.startsWith("Dev endpoint received ")) {
    return `开发端点已接收 ${readableDetail.slice(
      "Dev endpoint received ".length,
    )}`;
  }
  if (readableDetail.startsWith("QA endpoint reconnected for ")) {
    return `质量端点已重新连接并同步 ${readableDetail.slice(
      "QA endpoint reconnected for ".length,
    )}`;
  }
  if (readableDetail.startsWith("Dev endpoint reconnected for ")) {
    return `开发端点已重新连接并同步 ${readableDetail.slice(
      "Dev endpoint reconnected for ".length,
    )}`;
  }
  if (readableDetail === "QA accepted ownership") {
    return "质量已确认接手";
  }
  if (readableDetail === "Dev accepted ownership") {
    return "开发已确认接手";
  }
  if (
    readableDetail.startsWith("QA released ") &&
    readableDetail.endsWith(" to Agent")
  ) {
    return `质量已放行 ${readableDetail
      .slice("QA released ".length, -" to Agent".length)
      .trim()} 给 Agent`;
  }
  if (
    readableDetail.startsWith("Dev released ") &&
    readableDetail.endsWith(" to Agent")
  ) {
    return `开发已放行 ${readableDetail
      .slice("Dev released ".length, -" to Agent".length)
      .trim()} 给 Agent`;
  }
  if (readableDetail.startsWith("QA result is ready for ")) {
    return `质量已写入结果：${readableDetail.slice(
      "QA result is ready for ".length,
    )}`;
  }
  if (readableDetail.startsWith("Dev result is ready for ")) {
    return `开发已写入结果：${readableDetail.slice(
      "Dev result is ready for ".length,
    )}`;
  }
  if (readableDetail.startsWith("QA sent result for ")) {
    return `质量已发送结果：${readableDetail.slice(
      "QA sent result for ".length,
    )}`;
  }
  if (readableDetail.startsWith("Dev sent result for ")) {
    return `开发已发送结果：${readableDetail.slice(
      "Dev sent result for ".length,
    )}`;
  }
  const uploadSuffix = " uploaded to Hub";
  if (readableDetail.endsWith(uploadSuffix)) {
    return `${readableDetail.slice(0, -uploadSuffix.length)} 已上传到 Hub`;
  }
  if (readableDetail.startsWith("Delivery failed: ")) {
    return `投递失败：${formatTimelineReason(
      readableDetail.slice("Delivery failed: ".length),
    )}`;
  }
  if (readableDetail.startsWith("Delivery expired: ")) {
    return `投递过期：${formatTimelineReason(
      readableDetail.slice("Delivery expired: ".length),
    )}`;
  }
  return readableDetail;
}

function formatTimelineReason(reason: string) {
  if (reason === "No reason provided") {
    return "未提供原因";
  }
  return reason;
}

function formatModelRunStatus(status: string | undefined) {
  const statusMap: Record<string, string> = {
    queued: "排队中",
    running: "执行中",
    succeeded: "已完成",
    failed: "失败",
    cancelled: "已取消",
  };
  return status ? (statusMap[status] ?? status) : "暂无运行";
}

function modelRunStatusTone(
  status: string | undefined,
): "blue" | "green" | "yellow" | "red" {
  if (status === "succeeded") {
    return "green";
  }
  if (status === "failed" || status === "cancelled") {
    return "red";
  }
  if (status === "running") {
    return "blue";
  }
  return "yellow";
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1)}...`;
}

function formatReportKind(kind: string) {
  const kindLabels: Record<string, string> = {
    qa_to_dev_report: "质量给开发的报告",
    agent_readable_instruction: "Agent 可读指令",
  };
  return kindLabels[kind] ?? kind;
}

function summarizeEndpointHealth(
  healthReport:
    | HandoffOverviewResponse["agent_endpoints"][number]["health_report"]
    | undefined,
): { summary: string; report: string; tone: "green" | "yellow" | "red" } {
  if (!healthReport) {
    return {
      summary: "尚未提交健康报告",
      report: "暂无报告",
      tone: "yellow",
    };
  }

  if (healthReport.checks.some((check) => check.status === "blocked")) {
    return {
      summary: "健康阻塞",
      report: `健康报告 ${formatTime(healthReport.reported_at)}`,
      tone: "red",
    };
  }

  if (healthReport.checks.some((check) => check.status === "warning")) {
    return {
      summary: "健康警告",
      report: `健康报告 ${formatTime(healthReport.reported_at)}`,
      tone: "yellow",
    };
  }

  return {
    summary: "健康通过",
    report: `健康报告 ${formatTime(healthReport.reported_at)}`,
    tone: "green",
  };
}

function providerProfileTone(
  profile: ProviderModelRegistryListResponse["profiles"][number],
) {
  if (profile.status === "blocked" || profile.status === "disabled") {
    return "red";
  }
  if (profile.latest_health?.status === "blocked") {
    return "red";
  }
  if (
    profile.status === "degraded" ||
    profile.latest_health?.status === "warning"
  ) {
    return "yellow";
  }
  return "green";
}

function formatProviderHealth(
  profile: ProviderModelRegistryListResponse["profiles"][number],
) {
  if (profile.latest_health) {
    return `health: ${profile.latest_health.status}`;
  }
  return `health: ${profile.status}`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function hasDismissedOnboarding() {
  if (typeof window === "undefined") {
    return true;
  }
  return window.localStorage.getItem(onboardingStorageKey) === "1";
}

function persistOnboardingDismissed() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(onboardingStorageKey, "1");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(value));
}
