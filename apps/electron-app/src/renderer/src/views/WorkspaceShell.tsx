import {
  Activity,
  Building2,
  ChevronRight,
  FolderKanban,
  LogOut,
  MonitorCog,
  Plus,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  UserPlus,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import { useState, type FormEvent } from "react";

import type { AggregatedServiceHealth } from "../../../shared/system-health-contract.js";
import type {
  DesktopWorkspaceResult,
  DesktopWorkspaceView,
} from "../../../shared/ms1-desktop-contract.js";
import { SystemHealthView } from "./SystemHealthView.js";
import { WorkspaceBootstrap } from "./WorkspaceBootstrap.js";

type Section = "health" | "members" | "overview" | "projects" | "runtime" | "switch";

const NAVIGATION = [
  { id: "overview", label: "概览", icon: Building2 },
  { id: "members", label: "成员与邀请", icon: Users },
  { id: "projects", label: "项目权限", icon: FolderKanban },
  { id: "runtime", label: "本机 Endpoint", icon: MonitorCog },
  { id: "health", label: "系统健康", icon: Activity },
] as const;

interface WorkspaceShellProps {
  readonly health: AggregatedServiceHealth | undefined;
  readonly view: DesktopWorkspaceView;
  readonly onLogout: () => Promise<void>;
  readonly onWorkspace: (result: DesktopWorkspaceResult) => void;
}

function invitationExpiry(): string {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000);
  date.setSeconds(0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function WorkspaceShell({ health, view, onLogout, onWorkspace }: WorkspaceShellProps) {
  const [section, setSection] = useState<Section>("overview");
  const [pending, setPending] = useState<string>();
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string }>();
  const [removeTarget, setRemoveTarget] = useState<DesktopWorkspaceView["members"][number]>();
  const writesDisabled = view.stale;

  async function run(
    key: string,
    operation: () => Promise<DesktopWorkspaceResult>,
    successMessage: string,
  ): Promise<void> {
    setPending(key);
    setFeedback(undefined);
    try {
      const result = await operation();
      if (result.success) {
        onWorkspace(result);
        setFeedback({ kind: "success", message: successMessage });
      } else {
        setFeedback({ kind: "error", message: result.error.message });
      }
    } catch {
      setFeedback({ kind: "error", message: "输入格式无效，请检查后重试。" });
    } finally {
      setPending(undefined);
    }
  }

  function invite(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const expiresAt = new Date(String(data.get("expiresAt") ?? "")).toISOString();
    void (async () => {
      setPending("invite");
      setFeedback(undefined);
      try {
        const result = await window.sartre.workspaces.invite({
          invitedEmail: String(data.get("invitedEmail") ?? ""),
          role: String(data.get("role") ?? "member") as "admin" | "member" | "owner",
          expiresAt,
        });
        setFeedback(
          result.success
            ? { kind: "success", message: `邀请已创建，版本 ${result.data.version}` }
            : { kind: "error", message: result.error.message },
        );
      } catch {
        setFeedback({ kind: "error", message: "邀请信息格式无效。" });
      } finally {
        setPending(undefined);
      }
    })();
  }

  function changeRole(event: FormEvent<HTMLFormElement>, membershipId: string): void {
    event.preventDefault();
    const member = view.members.find((item) => item.membershipId === membershipId);
    if (!member) return;
    const role = String(new FormData(event.currentTarget).get("role") ?? member.role) as
      | "admin"
      | "member"
      | "owner";
    void run(
      `role:${membershipId}`,
      () =>
        window.sartre.workspaces.changeMembershipRole({
          membershipId,
          role,
          expectedVersion: member.version,
        }),
      "成员角色已更新。",
    );
  }

  function createProject(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "");
    void run(
      "create-project",
      () => window.sartre.workspaces.createProject({ name }),
      "项目已创建。",
    );
  }

  function grantAccess(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const rawVersion = String(data.get("expectedVersion") ?? "").trim();
    void run(
      "grant-project-access",
      () =>
        window.sartre.workspaces.grantProjectAccess({
          projectId: String(data.get("projectId") ?? ""),
          userId: String(data.get("userId") ?? ""),
          role: String(data.get("role") ?? "viewer") as "editor" | "viewer",
          expectedVersion: rawVersion === "" ? null : Number(rawVersion),
        }),
      "项目权限已提交。",
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <div>
            <strong>Sartre</strong>
            <span>工作台</span>
          </div>
        </div>

        <button className="workspace-switcher" onClick={() => setSection("switch")} type="button">
          <span className="workspace-switcher__avatar" aria-hidden="true">
            {view.workspace.name.slice(0, 1).toUpperCase()}
          </span>
          <span>
            <strong>{view.workspace.name}</strong>
            <small>{view.workspace.role.toUpperCase()}</small>
          </span>
          <ChevronRight aria-hidden="true" size={14} />
        </button>

        <nav aria-label="工作区导航" className="sidebar__nav">
          {NAVIGATION.map((item) => {
            const Icon = item.icon;
            return (
              <button
                aria-current={section === item.id ? "page" : undefined}
                className={section === item.id ? "nav-item nav-item--active" : "nav-item"}
                key={item.id}
                onClick={() => setSection(item.id)}
                type="button"
              >
                <Icon aria-hidden="true" size={15} />
                <span>{item.label}</span>
                {item.id === "runtime" ? <small>离线</small> : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <div className={view.stale ? "sync-state sync-state--warning" : "sync-state"}>
            {view.stale ? (
              <WifiOff aria-hidden="true" size={13} />
            ) : (
              <ShieldCheck aria-hidden="true" size={13} />
            )}
            <span>{view.stale ? "只读缓存" : "Hub 已校验"}</span>
          </div>
          <button className="nav-item" onClick={() => void onLogout()} type="button">
            <LogOut aria-hidden="true" size={15} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div>
            <strong>{NAVIGATION.find((item) => item.id === section)?.label ?? "工作区"}</strong>
            <span>Workspace {view.workspace.workspaceId}</span>
          </div>
          <button
            aria-label="刷新当前工作区"
            className="icon-button"
            disabled={pending !== undefined}
            onClick={() =>
              void run("refresh", () => window.sartre.workspaces.refresh(), "工作区已刷新。")
            }
            title="刷新"
            type="button"
          >
            <RefreshCw className={pending === "refresh" ? "spin" : undefined} size={15} />
          </button>
        </header>

        {feedback ? (
          <div
            aria-live="polite"
            className={`feedback-bar feedback-bar--${feedback.kind}`}
            role={feedback.kind === "error" ? "alert" : "status"}
          >
            {feedback.kind === "error" ? (
              <TriangleAlert aria-hidden="true" size={14} />
            ) : (
              <ShieldCheck aria-hidden="true" size={14} />
            )}
            <span>{feedback.message}</span>
            <button aria-label="关闭提示" onClick={() => setFeedback(undefined)} type="button">
              <X aria-hidden="true" size={13} />
            </button>
          </div>
        ) : null}

        <div className="content-scroll">
          {section === "switch" ? (
            <WorkspaceBootstrap hasCurrentWorkspace onWorkspace={onWorkspace} />
          ) : null}
          {section === "overview" ? <Overview view={view} /> : null}
          {section === "members" ? (
            <MembersView
              invite={invite}
              pending={pending}
              setRemoveTarget={setRemoveTarget}
              submitRole={changeRole}
              view={view}
              writesDisabled={writesDisabled}
            />
          ) : null}
          {section === "projects" ? (
            <ProjectsView
              createProject={createProject}
              grantAccess={grantAccess}
              pending={pending}
              view={view}
              writesDisabled={writesDisabled}
            />
          ) : null}
          {section === "runtime" ? <RuntimeView view={view} /> : null}
          {section === "health" ? <SystemHealthView snapshot={health} /> : null}
        </div>
      </div>

      {removeTarget ? (
        <div className="modal-backdrop" role="presentation">
          <section
            aria-labelledby="remove-member-title"
            aria-modal="true"
            className="modal"
            role="dialog"
          >
            <h2 id="remove-member-title">移除成员</h2>
            <p>
              将移除 <strong>{removeTarget.displayName}</strong>。项目权限不会被解释为成员权限。
            </p>
            <div className="modal__actions">
              <button
                className="button button--secondary"
                onClick={() => setRemoveTarget(undefined)}
                type="button"
              >
                取消
              </button>
              <button
                className="button button--danger"
                disabled={pending !== undefined}
                onClick={() =>
                  void run(
                    `remove:${removeTarget.membershipId}`,
                    () =>
                      window.sartre.workspaces.removeMembership({
                        membershipId: removeTarget.membershipId,
                        expectedVersion: removeTarget.version,
                      }),
                    "成员已移除。",
                  ).finally(() => setRemoveTarget(undefined))
                }
                type="button"
              >
                确认移除
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function Overview({ view }: { readonly view: DesktopWorkspaceView }) {
  const metrics = [
    { label: "有效成员", value: view.capabilities.manageMembers ? view.members.length : "受限" },
    { label: "可访问项目", value: view.projects.length },
    { label: "本机 Runtime", value: "离线" },
  ];
  return (
    <section className="content-view" aria-labelledby="overview-title">
      <header className="content-header">
        <div>
          <p className="eyebrow">WORKSPACE OVERVIEW</p>
          <h1 id="overview-title">{view.workspace.name}</h1>
          <p>当前仅交付身份、工作区、项目授权与本机 Endpoint 边界。</p>
        </div>
        <span className="role-badge">{view.workspace.role}</span>
      </header>
      {view.stale ? (
        <div className="inline-alert inline-alert--warning" role="alert">
          <WifiOff aria-hidden="true" size={17} />
          <div>
            <strong>当前为只读缓存</strong>
            <p>Hub 不可用时不允许成员、项目或 Endpoint 写操作。</p>
          </div>
        </div>
      ) : null}
      <div className="metric-row">
        {metrics.map((metric) => (
          <div className="metric" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
      <section className="detail-list" aria-labelledby="boundary-title">
        <div className="section-heading">
          <ShieldCheck aria-hidden="true" size={16} />
          <div>
            <h2 id="boundary-title">当前安全边界</h2>
            <p>来自 Hub 的授权事实与本机状态分离。</p>
          </div>
        </div>
        <dl>
          <div>
            <dt>Workspace ID</dt>
            <dd>{view.workspace.workspaceId}</dd>
          </div>
          <div>
            <dt>Workspace version</dt>
            <dd>{view.workspace.version}</dd>
          </div>
          <div>
            <dt>Last synced</dt>
            <dd>{new Date(view.lastSyncedAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Endpoint pairing</dt>
            <dd>等待 authenticated local IPC</dd>
          </div>
        </dl>
      </section>
    </section>
  );
}

interface MembersViewProps {
  readonly view: DesktopWorkspaceView;
  readonly pending: string | undefined;
  readonly writesDisabled: boolean;
  readonly invite: (event: FormEvent<HTMLFormElement>) => void;
  readonly submitRole: (event: FormEvent<HTMLFormElement>, membershipId: string) => void;
  readonly setRemoveTarget: (member: DesktopWorkspaceView["members"][number]) => void;
}

function MembersView({
  view,
  pending,
  writesDisabled,
  invite,
  submitRole,
  setRemoveTarget,
}: MembersViewProps) {
  if (!view.capabilities.manageMembers) {
    return (
      <ForbiddenView
        title="成员管理不可用"
        description="当前角色不能查询成员目录，也不会探测成员是否存在。"
      />
    );
  }
  return (
    <section className="content-view" aria-labelledby="members-title">
      <header className="content-header">
        <div>
          <p className="eyebrow">ACCESS</p>
          <h1 id="members-title">成员与邀请</h1>
          <p>Workspace 角色与 Project Access 保持独立。</p>
        </div>
        <span className="count-badge">{view.members.length} 名成员</span>
      </header>
      <form className="inline-form" onSubmit={invite}>
        <div>
          <label htmlFor="invite-email">公司邮箱</label>
          <input id="invite-email" name="invitedEmail" required type="email" />
        </div>
        <div>
          <label htmlFor="invite-role">Workspace 角色</label>
          <select defaultValue="member" id="invite-role" name="role">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label htmlFor="invite-expiry">有效期</label>
          <input
            defaultValue={invitationExpiry()}
            id="invite-expiry"
            name="expiresAt"
            required
            type="datetime-local"
          />
        </div>
        <button
          className="button button--primary"
          disabled={writesDisabled || pending !== undefined}
          type="submit"
        >
          <UserPlus aria-hidden="true" size={14} />
          创建邀请
        </button>
      </form>
      <table className="data-table" aria-label="工作区成员">
        <thead>
          <tr className="data-table__header">
            <th scope="col">成员</th>
            <th scope="col">角色</th>
            <th scope="col">状态</th>
            <th scope="col">操作</th>
          </tr>
        </thead>
        <tbody>
          {view.members.map((member) => (
            <tr className="data-row" key={member.membershipId}>
              <td>
                <strong>{member.displayName}</strong>
                <code>{member.userId}</code>
              </td>
              <td>
                <form
                  className="row-action"
                  onSubmit={(event) => submitRole(event, member.membershipId)}
                >
                  <label className="sr-only" htmlFor={`role-${member.membershipId}`}>
                    更改 {member.displayName} 的角色
                  </label>
                  <select defaultValue={member.role} id={`role-${member.membershipId}`} name="role">
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                  <button
                    className="button button--quiet"
                    disabled={writesDisabled || pending !== undefined}
                    type="submit"
                  >
                    保存
                  </button>
                </form>
              </td>
              <td>
                <span className="status-text">
                  {member.status === "active" ? "有效" : "已移除"}
                </span>
              </td>
              <td>
                <button
                  className="button button--danger-quiet"
                  disabled={writesDisabled || pending !== undefined}
                  onClick={() => setRemoveTarget(member)}
                  type="button"
                >
                  移除
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

interface ProjectsViewProps {
  readonly view: DesktopWorkspaceView;
  readonly pending: string | undefined;
  readonly writesDisabled: boolean;
  readonly createProject: (event: FormEvent<HTMLFormElement>) => void;
  readonly grantAccess: (event: FormEvent<HTMLFormElement>) => void;
}

function ProjectsView({
  view,
  pending,
  writesDisabled,
  createProject,
  grantAccess,
}: ProjectsViewProps) {
  return (
    <section className="content-view" aria-labelledby="projects-title">
      <header className="content-header">
        <div>
          <p className="eyebrow">PROJECT ACCESS</p>
          <h1 id="projects-title">项目权限</h1>
          <p>列表只展示当前用户有权看到的项目。</p>
        </div>
        <span className="count-badge">{view.projects.length} 个项目</span>
      </header>
      {view.capabilities.manageProjects ? (
        <div className="split-tools">
          <form className="tool-section" onSubmit={createProject}>
            <div className="section-heading">
              <Plus aria-hidden="true" size={16} />
              <div>
                <h2>创建项目</h2>
                <p>创建者获得 Editor 权限。</p>
              </div>
            </div>
            <label htmlFor="project-name">项目名称</label>
            <input id="project-name" maxLength={200} name="name" required />
            <button
              className="button button--primary"
              disabled={writesDisabled || pending !== undefined}
              type="submit"
            >
              创建项目
            </button>
          </form>
          <form className="tool-section" onSubmit={grantAccess}>
            <div className="section-heading">
              <ShieldCheck aria-hidden="true" size={16} />
              <div>
                <h2>授予 Project Access</h2>
                <p>首次授予版本留空；更新必须提供已知版本。</p>
              </div>
            </div>
            <div className="form-row">
              <div>
                <label htmlFor="grant-project-id">Project ID</label>
                <input id="grant-project-id" name="projectId" required />
              </div>
              <div>
                <label htmlFor="grant-user-id">User ID</label>
                <input id="grant-user-id" name="userId" required />
              </div>
            </div>
            <div className="form-row">
              <div>
                <label htmlFor="grant-role">权限</label>
                <select defaultValue="viewer" id="grant-role" name="role">
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <div>
                <label htmlFor="grant-version">已知版本</label>
                <input
                  id="grant-version"
                  min={0}
                  name="expectedVersion"
                  placeholder="首次授予留空"
                  type="number"
                />
              </div>
            </div>
            <button
              className="button button--secondary"
              disabled={writesDisabled || pending !== undefined}
              type="submit"
            >
              提交权限
            </button>
          </form>
        </div>
      ) : (
        <ForbiddenView
          title="项目管理不可用"
          description="当前角色只能查看自己已有 Project Access 的项目。"
        />
      )}
      <table className="data-table data-table--projects" aria-label="项目访问列表">
        <thead>
          <tr className="data-table__header">
            <th scope="col">项目</th>
            <th scope="col">我的权限</th>
            <th scope="col">版本</th>
          </tr>
        </thead>
        <tbody>
          {view.projects.length === 0 ? (
            <tr className="empty-row">
              <td colSpan={3}>
                <FolderKanban aria-hidden="true" size={18} />
                <span>没有可访问的项目</span>
              </td>
            </tr>
          ) : (
            view.projects.map((project) => (
              <tr className="data-row" key={project.projectId}>
                <td>
                  <strong>{project.name}</strong>
                  <code>{project.projectId}</code>
                </td>
                <td>
                  <span className="role-badge">{project.accessRole}</span>
                </td>
                <td>
                  <span className="status-text">v{project.version}</span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

function RuntimeView({ view }: { readonly view: DesktopWorkspaceView }) {
  return (
    <section className="content-view" aria-labelledby="runtime-title">
      <header className="content-header">
        <div>
          <p className="eyebrow">LOCAL ENDPOINT</p>
          <h1 id="runtime-title">本机 Endpoint</h1>
          <p>Endpoint Credential 只能由 Local Runtime 的 macOS Keychain adapter 保存。</p>
        </div>
        <span className="status-badge status-badge--offline">
          <WifiOff aria-hidden="true" size={12} />
          离线
        </span>
      </header>
      <div className="inline-alert inline-alert--warning" role="status">
        <MonitorCog aria-hidden="true" size={18} />
        <div>
          <strong>Local Runtime 尚未连接</strong>
          <p>
            当前 Electron 包未提供 authenticated local IPC 和 Runtime daemon
            生命周期，因此配对、轮换与撤销保持禁用。
          </p>
        </div>
      </div>
      <section className="detail-list">
        <dl>
          <div>
            <dt>状态</dt>
            <dd>{view.runtime.status}</dd>
          </div>
          <div>
            <dt>配对可用</dt>
            <dd>{view.runtime.pairingAvailable ? "是" : "否"}</dd>
          </div>
          <div>
            <dt>Renderer 可见凭据</dt>
            <dd>无</dd>
          </div>
          <div>
            <dt>恢复动作</dt>
            <dd>安装并验证受信任的 Local Runtime 后重试</dd>
          </div>
        </dl>
      </section>
      <div className="button-row">
        <button className="button button--secondary" disabled type="button">
          配对本机 Runtime
        </button>
        <button className="button button--secondary" disabled type="button">
          轮换凭据
        </button>
        <button className="button button--danger" disabled type="button">
          撤销 Endpoint
        </button>
      </div>
    </section>
  );
}

function ForbiddenView({
  title,
  description,
}: {
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="inline-alert inline-alert--muted" role="status">
      <TriangleAlert aria-hidden="true" size={17} />
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  );
}
