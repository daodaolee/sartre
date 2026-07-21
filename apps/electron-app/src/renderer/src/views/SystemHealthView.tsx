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
  healthy: "Healthy",
  degraded: "Degraded",
  unavailable: "Unavailable",
} as const;

const REMEDIATION = {
  electron: "Restart Sartre if this process stops responding.",
  "hub-api": "Check Hub API readiness and PostgreSQL connectivity.",
  "hub-worker": "Restart Hub Worker and wait for its heartbeat.",
  "local-runtime": "Restart Local Runtime on this Mac.",
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
  return Number.isNaN(date.getTime()) ? "Not checked" : date.toLocaleTimeString();
}

export interface SystemHealthViewProps {
  readonly snapshot: AggregatedServiceHealth | undefined;
}

export function SystemHealthView({ snapshot }: SystemHealthViewProps) {
  return (
    <main className="workbench">
      <header className="workbench__header">
        <div>
          <p className="workbench__eyebrow">SARTRE WORKBENCH</p>
          <h1>System health</h1>
        </div>
        <p className="workbench__summary">
          {snapshot?.status === "healthy" ? "All processes operational" : "Action required"}
        </p>
      </header>

      <section className="health-panel" aria-labelledby="health-heading">
        <div className="health-panel__heading">
          <div>
            <h2 id="health-heading">Four-process runtime</h2>
            <p>Live status from the local Electron control plane.</p>
          </div>
          <span className="health-panel__count">4 processes</span>
        </div>

        <table className="health-table" aria-label="Process health">
          <thead>
            <tr className="health-table__labels">
              <th scope="col">Process</th>
              <th scope="col">Status</th>
              <th scope="col">Last check</th>
              <th scope="col">Version</th>
              <th scope="col">Remediation</th>
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
    </main>
  );
}
