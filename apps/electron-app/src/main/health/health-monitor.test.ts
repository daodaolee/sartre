import { describe, expect, it, vi } from "vitest";

import type { AggregatedServiceHealth } from "@sartre/sdk";
import * as electronApp from "../../index.js";

const TEST_COMMIT_SHA = "a".repeat(40);
const START_TIME = Date.parse("2026-07-21T06:00:00.000Z");

interface HealthMonitor {
  getSnapshot: () => AggregatedServiceHealth;
  pollNow: () => Promise<void>;
  start: () => void;
  stop: () => void;
  subscribe: (listener: (snapshot: AggregatedServiceHealth) => void) => () => void;
}

type HealthMonitorFactory = (options: {
  poll: (signal: AbortSignal) => Promise<unknown>;
  pollIntervalMs: number;
  timeoutMs: number;
  staleAfterMs: number;
  now?: () => number;
}) => HealthMonitor;

function healthMonitorFactory(): HealthMonitorFactory {
  const factory = (electronApp as { createHealthMonitor?: unknown }).createHealthMonitor;
  expect(factory).toBeTypeOf("function");
  return factory as HealthMonitorFactory;
}

function processSnapshot(
  service: "electron" | "hub-api" | "hub-worker" | "local-runtime",
  checkedAt: string,
) {
  return {
    service,
    status: "healthy" as const,
    version: "0.1.0-test",
    commitSha: TEST_COMMIT_SHA,
    checkedAt,
    dependencies: [],
  };
}

function healthySnapshot(checkedAt = new Date(START_TIME).toISOString()): AggregatedServiceHealth {
  return {
    status: "healthy",
    checkedAt,
    processes: {
      electron: processSnapshot("electron", checkedAt),
      "hub-api": processSnapshot("hub-api", checkedAt),
      "hub-worker": processSnapshot("hub-worker", checkedAt),
      "local-runtime": processSnapshot("local-runtime", checkedAt),
    },
  };
}

describe("Electron four-process health monitor", () => {
  it("polls immediately and at the configured cadence without overlapping reads", async () => {
    vi.useFakeTimers();
    try {
      const firstRead = Promise.withResolvers<AggregatedServiceHealth>();
      const poll = vi
        .fn<() => Promise<unknown>>()
        .mockImplementationOnce(() => firstRead.promise)
        .mockResolvedValue(healthySnapshot());
      const monitor = healthMonitorFactory()({
        poll,
        pollIntervalMs: 1_000,
        timeoutMs: 5_000,
        staleAfterMs: 5_000,
        now: () => START_TIME + Date.now(),
      });

      monitor.start();
      await vi.advanceTimersByTimeAsync(0);
      expect(poll).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1_000);
      expect(poll).toHaveBeenCalledTimes(1);

      firstRead.resolve(healthySnapshot());
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(1_000);
      expect(poll).toHaveBeenCalledTimes(2);
      monitor.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it("bounds a hung SDK read and publishes an unavailable four-row snapshot", async () => {
    vi.useFakeTimers();
    try {
      const poll = vi.fn<() => Promise<unknown>>(() => new Promise(() => undefined));
      const monitor = healthMonitorFactory()({
        poll,
        pollIntervalMs: 1_000,
        timeoutMs: 100,
        staleAfterMs: 5_000,
        now: () => START_TIME + Date.now(),
      });
      const published: AggregatedServiceHealth[] = [];
      monitor.subscribe((snapshot) => published.push(snapshot));

      const pendingPoll = monitor.pollNow();
      await vi.advanceTimersByTimeAsync(100);
      await pendingPoll;

      expect(published).toHaveLength(1);
      expect(published[0]?.status).toBe("degraded");
      expect(Object.values(published[0]?.processes ?? {})).toHaveLength(4);
      expect(
        Object.values(published[0]?.processes ?? {}).every(
          (process) =>
            typeof process === "object" &&
            process !== null &&
            "status" in process &&
            process.status === "unavailable",
        ),
      ).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps ownership after timeout until an abort-ignoring poll actually settles", async () => {
    vi.useFakeTimers();
    try {
      const firstRead = Promise.withResolvers<AggregatedServiceHealth>();
      let firstSignal: AbortSignal | undefined;
      const poll = vi
        .fn<(signal: AbortSignal) => Promise<unknown>>()
        .mockImplementationOnce((signal) => {
          firstSignal = signal;
          return firstRead.promise;
        })
        .mockResolvedValue(healthySnapshot());
      const monitor = healthMonitorFactory()({
        poll,
        pollIntervalMs: 1_000,
        timeoutMs: 100,
        staleAfterMs: 5_000,
        now: () => START_TIME + Date.now(),
      });
      const published: AggregatedServiceHealth[] = [];
      monitor.subscribe((snapshot) => published.push(snapshot));

      const timedOut = monitor.pollNow();
      await vi.advanceTimersByTimeAsync(100);
      await timedOut;
      expect(published.at(-1)?.status).toBe("degraded");
      expect(firstSignal?.aborted).toBe(true);

      await monitor.pollNow();
      expect(poll).toHaveBeenCalledTimes(1);

      firstRead.resolve(healthySnapshot());
      await vi.advanceTimersByTimeAsync(0);
      await monitor.pollNow();
      expect(poll).toHaveBeenCalledTimes(2);
      expect(published.at(-1)?.status).toBe("healthy");
      monitor.stop();
    } finally {
      vi.useRealTimers();
    }
  });

  it("aborts an active poll when stopped and does not schedule another read", async () => {
    vi.useFakeTimers();
    try {
      let observedSignal: AbortSignal | undefined;
      const poll = vi.fn<(signal: AbortSignal) => Promise<unknown>>((signal) => {
        observedSignal = signal;
        return new Promise(() => undefined);
      });
      const monitor = healthMonitorFactory()({
        poll,
        pollIntervalMs: 1_000,
        timeoutMs: 5_000,
        staleAfterMs: 5_000,
        now: () => START_TIME + Date.now(),
      });

      monitor.start();
      await vi.advanceTimersByTimeAsync(0);
      monitor.stop();
      expect(observedSignal?.aborted).toBe(true);
      await vi.advanceTimersByTimeAsync(2_000);
      expect(poll).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("fails stale observations closed while retaining fixed process identity and version", async () => {
    let now = START_TIME;
    const monitor = healthMonitorFactory()({
      poll: async () => healthySnapshot(new Date(now).toISOString()),
      pollIntervalMs: 1_000,
      timeoutMs: 100,
      staleAfterMs: 2_000,
      now: () => now,
    });

    await monitor.pollNow();
    expect(monitor.getSnapshot().status).toBe("healthy");

    now += 2_001;
    const stale = monitor.getSnapshot();
    expect(stale.status).toBe("degraded");
    expect(Object.keys(stale.processes)).toEqual([
      "electron",
      "hub-api",
      "hub-worker",
      "local-runtime",
    ]);
    expect(stale.processes["hub-worker"]).toMatchObject({
      status: "unavailable",
      version: "0.1.0-test",
      errorCode: "dependency_unavailable",
    });
  });

  it("never exposes raw endpoints, session material, or transport errors in snapshots", async () => {
    const rawHubEndpoint = "http://127.0.0.1:49152";
    const rawRuntimeEndpoint = "http://127.0.0.1:49153";
    const sessionMaterial = "b".repeat(64);
    const transportError = `${rawHubEndpoint}:${sessionMaterial}:connection_refused`;
    const monitor = healthMonitorFactory()({
      poll: async () => {
        void rawRuntimeEndpoint;
        throw new Error(transportError);
      },
      pollIntervalMs: 1_000,
      timeoutMs: 100,
      staleAfterMs: 2_000,
      now: () => START_TIME,
    });

    await monitor.pollNow();
    const serialized = JSON.stringify(monitor.getSnapshot());
    expect(serialized).not.toContain(rawHubEndpoint);
    expect(serialized).not.toContain(rawRuntimeEndpoint);
    expect(serialized).not.toContain(sessionMaterial);
    expect(serialized).not.toContain("connection_refused");
    expect(serialized).toContain("dependency_unavailable");
  });
});
