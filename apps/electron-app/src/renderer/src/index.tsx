import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import type {
  DesktopAuthResult,
  DesktopAuthState,
  DesktopWorkspaceResult,
  DesktopWorkspaceView,
} from "../../shared/ms1-desktop-contract.js";
import type { SystemHealthResult } from "../../shared/system-health-contract.js";
import { AuthView } from "./views/AuthView.js";
import { SystemHealthView } from "./views/SystemHealthView.js";
import { WorkspaceBootstrap } from "./views/WorkspaceBootstrap.js";
import { WorkspaceShell } from "./views/WorkspaceShell.js";

function Application() {
  const [auth, setAuth] = useState<DesktopAuthState>();
  const [health, setHealth] = useState<SystemHealthResult>();
  const [workspace, setWorkspace] = useState<DesktopWorkspaceView>();
  const healthOnlyTestMode =
    new URLSearchParams(window.location.search).get("mode") === "health-e2e";

  useEffect(() => {
    let active = true;
    const unsubscribeHealth = window.systemHealth.subscribe((result) => {
      if (active) setHealth(() => result);
    });
    const unsubscribeAuth = window.sartre.auth.subscribe((result) => {
      if (active && result.success) {
        setAuth(result.data);
        if (result.data.status !== "authenticated") setWorkspace(undefined);
      }
    });
    void Promise.all([
      window.sartre.auth.getState(),
      window.sartre.workspaces.current(),
      window.systemHealth.getSnapshot(),
    ]).then(([authResult, workspaceResult, healthResult]) => {
      if (!active) return;
      if (authResult.success) setAuth(authResult.data);
      if (workspaceResult.success && workspaceResult.data) setWorkspace(workspaceResult.data);
      setHealth(healthResult);
    });
    return () => {
      active = false;
      unsubscribeAuth();
      unsubscribeHealth();
    };
  }, []);

  async function login(
    command: Parameters<typeof window.sartre.auth.login>[0],
  ): Promise<DesktopAuthResult> {
    const result = await window.sartre.auth.login(command);
    if (result.success) setAuth(result.data);
    return result;
  }

  async function recover(): Promise<DesktopAuthResult> {
    const result = await window.sartre.auth.recover();
    if (result.success) {
      setAuth(result.data);
      setWorkspace(undefined);
    }
    return result;
  }

  function updateWorkspace(result: DesktopWorkspaceResult): void {
    if (result.success) setWorkspace(result.data);
  }

  if (healthOnlyTestMode) {
    return <SystemHealthView snapshot={health?.success === true ? health.data : undefined} />;
  }

  if (auth?.status !== "authenticated") {
    return <AuthView onLogin={login} onRecover={recover} state={auth} />;
  }

  if (!workspace) {
    return (
      <main className="bootstrap-shell">
        <header className="bootstrap-shell__topbar">
          <span className="brand-mark" aria-hidden="true">
            S
          </span>
          <div>
            <strong>Sartre</strong>
            <span>身份已验证</span>
          </div>
          <button
            className="button button--quiet"
            onClick={() => {
              void window.sartre.auth.logout().then((result) => {
                if (result.success) setAuth(result.data);
              });
            }}
            type="button"
          >
            退出登录
          </button>
        </header>
        <WorkspaceBootstrap hasCurrentWorkspace={false} onWorkspace={updateWorkspace} />
      </main>
    );
  }

  return (
    <WorkspaceShell
      health={health?.success === true ? health.data : undefined}
      onLogout={async () => {
        const result = await window.sartre.auth.logout();
        if (result.success) {
          setAuth(result.data);
          setWorkspace(undefined);
        }
      }}
      onWorkspace={updateWorkspace}
      view={workspace}
    />
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("renderer_root_missing");
createRoot(rootElement).render(
  <StrictMode>
    <Application />
  </StrictMode>,
);
