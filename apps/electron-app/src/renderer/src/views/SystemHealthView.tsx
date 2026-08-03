import type {
  AggregatedServiceHealth,
  HealthSnapshot,
} from "../../../shared/system-health-contract.js";

const PROCESS_ROWS = [
  { id: "electron", label: "Electron" },
  { id: "hub-api", label: "Hub API" },
  { id: "hub-worker", label: "Hub Worker" },
  { id: "local-runtime", label: "Local Runtime" },
] as const;

const STATUS_TEXT = {
  healthy: "正常",
  degraded: "降级",
  unavailable: "不可用",
} as const;

const REMEDIATION = {
  electron: "如果界面停止响应，请重新启动 Sartre。",
  "hub-api": "检查 Hub API readiness 与 PostgreSQL 连接。",
  "hub-worker": "重新启动 Hub Worker 并等待 heartbeat。",
  "local-runtime": "在这台 Mac 上安装或重新启动 Local Runtime。",
} as const;

const UNAVAILABLE_COMMIT_SHA = "0".repeat(40);

function unavailableProcess(service: (typeof PROCESS_ROWS)[number]["id"]): HealthSnapshot {
  return {
    service,
    status: "unavailable",
    version: "unavailable",
    commitSha: UNAVAILABLE_COMMIT_SHA,
    checkedAt: new Date(0).toISOString(),
    dependencies: [],
    errorCode: "dependency_unavailable",
  };
}

function displayTime(checkedAt: string): string {
  const date = new Date(checkedAt);
  return Number.isNaN(date.getTime()) ? "尚未检查" : date.toLocaleTimeString();
}

export interface SystemHealthViewProps {
  readonly snapshot: AggregatedServiceHealth | undefined;
}

export function SystemHealthView({ snapshot }: SystemHealthViewProps) {
  return (
    <section className="content-view" aria-labelledby="health-heading">
      <header className="content-header">
        <div>
          <p className="eyebrow">SYSTEM HEALTH</p>
          <h1 id="health-heading">四进程健康状态</h1>
          <p>由 Electron 本机控制平面定时校验。</p>
        </div>
        <span className="status-badge">
          {snapshot?.status === "healthy" ? "全部正常" : "需要处理"}
        </span>
      </header>

      <section className="health-panel" aria-label="进程健康列表">
        <div className="health-panel__heading">
          <div>
            <h2>运行时依赖</h2>
            <p>状态只代表健康探针，不代表业务能力 PASS。</p>
          </div>
          <span className="count-badge">4 个进程</span>
        </div>

        <table className="health-table" aria-label="进程健康">
          <thead>
            <tr className="health-table__labels">
              <th scope="col">进程</th>
              <th scope="col">状态</th>
              <th scope="col">最近检查</th>
              <th scope="col">版本</th>
              <th scope="col">恢复动作</th>
            </tr>
          </thead>
          <tbody>
            {PROCESS_ROWS.map((row) => {
              const processSnapshot = snapshot?.processes[row.id] ?? unavailableProcess(row.id);
              return (
                <tr
                  className="health-row"
                  key={row.id}
                  data-testid={`health-row-${row.id}`}
                  data-process={row.id}
                >
                  <td className="health-row__process">
                    <span
                      className={`health-row__signal health-row__signal--${processSnapshot.status}`}
                    />
                    <strong>{row.label}</strong>
                  </td>
                  <td>
                    <span
                      className={`status status--${processSnapshot.status}`}
                      data-testid={`health-status-${processSnapshot.status}`}
                    >
                      {STATUS_TEXT[processSnapshot.status]}
                    </span>
                  </td>
                  <td>
                    <time dateTime={processSnapshot.checkedAt}>
                      {displayTime(processSnapshot.checkedAt)}
                    </time>
                  </td>
                  <td>
                    <code>{processSnapshot.version}</code>
                  </td>
                  <td>
                    <p>{REMEDIATION[row.id]}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </section>
  );
}
