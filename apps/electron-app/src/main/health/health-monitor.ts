import {
  AggregatedServiceHealthSchema,
  type AggregatedServiceHealth,
  type HealthSnapshot,
  type ServiceProcessId,
} from "@sartre/sdk";

const PROCESS_IDS = ["electron", "hub-api", "hub-worker", "local-runtime"] as const;
const UNAVAILABLE_COMMIT_SHA = "0".repeat(40);

export interface HealthMonitor {
  getSnapshot: () => AggregatedServiceHealth;
  pollNow: () => Promise<void>;
  start: () => void;
  stop: () => void;
  subscribe: (listener: (snapshot: AggregatedServiceHealth) => void) => () => void;
}

export interface HealthMonitorOptions {
  readonly poll: (signal: AbortSignal) => Promise<unknown>;
  readonly pollIntervalMs: number;
  readonly timeoutMs: number;
  readonly staleAfterMs: number;
  readonly now?: () => number;
}

function unavailableProcess(
  service: ServiceProcessId,
  checkedAt: string,
  previous?: HealthSnapshot,
): HealthSnapshot {
  return {
    service,
    status: "unavailable",
    version: previous?.version ?? "unavailable",
    commitSha: previous?.commitSha ?? UNAVAILABLE_COMMIT_SHA,
    checkedAt,
    dependencies: [],
    errorCode: "dependency_unavailable",
  };
}

function unavailableSnapshot(
  checkedAt: string,
  previous?: AggregatedServiceHealth,
): AggregatedServiceHealth {
  const processes = Object.fromEntries(
    PROCESS_IDS.map((service) => [
      service,
      unavailableProcess(service, checkedAt, previous?.processes[service]),
    ]),
  );
  return AggregatedServiceHealthSchema.parse({
    status: "degraded",
    checkedAt,
    processes,
  });
}

function assertDuration(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0 || value > 300_000) {
    throw new Error(`${label}_invalid`);
  }
}

export function createHealthMonitor(options: HealthMonitorOptions): HealthMonitor {
  assertDuration(options.pollIntervalMs, "health_poll_interval");
  assertDuration(options.timeoutMs, "health_poll_timeout");
  assertDuration(options.staleAfterMs, "health_stale_after");

  const now = options.now ?? Date.now;
  const listeners = new Set<(snapshot: AggregatedServiceHealth) => void>();
  let snapshot = unavailableSnapshot(new Date(now()).toISOString());
  let activePoll:
    | {
        readonly controller: AbortController;
        readonly attempt: Promise<void>;
      }
    | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;

  const publish = (next: AggregatedServiceHealth): void => {
    snapshot = next;
    for (const listener of listeners) listener(next);
  };

  const pollNow = (): Promise<void> => {
    if (activePoll) return activePoll.attempt;
    const controller = new AbortController();
    const operation = Promise.resolve().then(() => options.poll(controller.signal));
    const request = {
      controller,
      attempt: (async () => {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          const timeoutFailure = new Promise<never>((_resolve, reject) => {
            timeout = setTimeout(() => {
              controller.abort();
              reject(new Error("health_poll_timed_out"));
            }, options.timeoutMs);
          });
          const observed = await Promise.race([operation, timeoutFailure]);
          publish(AggregatedServiceHealthSchema.parse(observed));
        } catch {
          publish(unavailableSnapshot(new Date(now()).toISOString(), snapshot));
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      })(),
    };
    activePoll = request;
    void operation.then(
      () => {
        if (activePoll === request) activePoll = undefined;
      },
      () => {
        if (activePoll === request) activePoll = undefined;
      },
    );
    return request.attempt;
  };

  return {
    getSnapshot: () => {
      if (now() - Date.parse(snapshot.checkedAt) > options.staleAfterMs) {
        snapshot = unavailableSnapshot(new Date(now()).toISOString(), snapshot);
      }
      return snapshot;
    },
    pollNow,
    start: () => {
      if (interval) return;
      void pollNow();
      interval = setInterval(() => void pollNow(), options.pollIntervalMs);
    },
    stop: () => {
      if (interval) clearInterval(interval);
      interval = undefined;
      activePoll?.controller.abort();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
