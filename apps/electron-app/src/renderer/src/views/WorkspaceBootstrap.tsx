import { ArrowRight, Building2, Link2, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import type { DesktopWorkspaceResult } from "../../../shared/ms1-desktop-contract.js";

interface WorkspaceBootstrapProps {
  readonly hasCurrentWorkspace: boolean;
  readonly onWorkspace: (result: DesktopWorkspaceResult) => void;
}

type PendingAction = "accept" | "create" | "open";

export function WorkspaceBootstrap({ hasCurrentWorkspace, onWorkspace }: WorkspaceBootstrapProps) {
  const [pending, setPending] = useState<PendingAction>();
  const [feedback, setFeedback] = useState<string>();

  async function run(
    action: PendingAction,
    operation: () => Promise<DesktopWorkspaceResult>,
  ): Promise<void> {
    setPending(action);
    setFeedback(undefined);
    try {
      const result = await operation();
      if (result.success) onWorkspace(result);
      else setFeedback(result.error.message);
    } catch {
      setFeedback("输入格式无效，请检查 ID 和版本。 ");
    } finally {
      setPending(undefined);
    }
  }

  function submitCreate(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "");
    void run("create", () => window.sartre.workspaces.create({ name }));
  }

  function submitOpen(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const workspaceId = String(new FormData(event.currentTarget).get("workspaceId") ?? "");
    void run("open", () => window.sartre.workspaces.open({ workspaceId }));
  }

  function submitAccept(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run("accept", () =>
      window.sartre.workspaces.acceptInvitation({
        workspaceId: String(data.get("workspaceId") ?? ""),
        invitationId: String(data.get("invitationId") ?? ""),
        expectedVersion: Number(data.get("expectedVersion") ?? 0),
      }),
    );
  }

  return (
    <section className="content-view" aria-labelledby="workspace-bootstrap-title">
      <header className="content-header">
        <div>
          <p className="eyebrow">WORKSPACE</p>
          <h1 id="workspace-bootstrap-title">
            {hasCurrentWorkspace ? "切换或创建工作区" : "开始使用工作区"}
          </h1>
          <p>工作区事实每次都从 Hub 重新校验，本机只保留当前导航选择。</p>
        </div>
      </header>

      {feedback ? (
        <div className="inline-alert inline-alert--error" role="alert">
          {feedback}
        </div>
      ) : null}

      <div className="bootstrap-grid">
        <form className="tool-section" onSubmit={submitCreate}>
          <div className="section-heading">
            <Plus aria-hidden="true" size={16} />
            <div>
              <h2>创建工作区</h2>
              <p>当前登录用户成为 Owner。</p>
            </div>
          </div>
          <label htmlFor="workspace-name">工作区名称</label>
          <input id="workspace-name" maxLength={200} name="name" required />
          <button className="button button--primary" disabled={pending !== undefined} type="submit">
            创建并打开
            <ArrowRight aria-hidden="true" size={14} />
          </button>
        </form>

        <form className="tool-section" onSubmit={submitOpen}>
          <div className="section-heading">
            <Building2 aria-hidden="true" size={16} />
            <div>
              <h2>打开已有工作区</h2>
              <p>无权限与不存在使用同一占位结果。</p>
            </div>
          </div>
          <label htmlFor="open-workspace-id">Workspace ID</label>
          <input id="open-workspace-id" name="workspaceId" required />
          <button
            className="button button--secondary"
            disabled={pending !== undefined}
            type="submit"
          >
            打开工作区
          </button>
        </form>

        <form className="tool-section tool-section--wide" onSubmit={submitAccept}>
          <div className="section-heading">
            <Link2 aria-hidden="true" size={16} />
            <div>
              <h2>接受邀请</h2>
              <p>当前不发送邀请邮件，由管理员安全地传递三个公开标识。</p>
            </div>
          </div>
          <div className="form-row form-row--three">
            <div>
              <label htmlFor="accept-workspace-id">Workspace ID</label>
              <input id="accept-workspace-id" name="workspaceId" required />
            </div>
            <div>
              <label htmlFor="invitation-id">Invitation ID</label>
              <input id="invitation-id" name="invitationId" required />
            </div>
            <div>
              <label htmlFor="invitation-version">版本</label>
              <input
                defaultValue={0}
                id="invitation-version"
                min={0}
                name="expectedVersion"
                type="number"
              />
            </div>
          </div>
          <button
            className="button button--secondary"
            disabled={pending !== undefined}
            type="submit"
          >
            接受并打开
          </button>
        </form>
      </div>
    </section>
  );
}
