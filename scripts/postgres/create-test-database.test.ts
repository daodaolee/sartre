import { afterEach, describe, expect, test, vi } from "vitest";

const postgresModuleState = vi.hoisted(() => ({
  factory: undefined as undefined | ((connectionString: string) => unknown),
}));

vi.mock("pg", () => ({
  Client: function Client(options: { connectionString: string }) {
    if (!postgresModuleState.factory) {
      throw new Error("postgres_test_client_factory_missing");
    }
    return postgresModuleState.factory(options.connectionString);
  },
}));

import * as disposableDatabaseModule from "./create-test-database.js";
import { createDisposableDatabase, type DisposableDatabase } from "./create-test-database.js";

interface TestClient {
  connect: ReturnType<typeof vi.fn<() => Promise<void>>>;
  query: ReturnType<typeof vi.fn<(text: string) => Promise<{ rows: unknown[] }>>>;
  end: ReturnType<typeof vi.fn<() => Promise<void>>>;
}

type TestClientFactory = (connectionString: string) => TestClient;

const TEST_ADMIN_CONNECTION = "postgresql://local/postgres";

function testClient(overrides: Partial<TestClient> = {}): TestClient {
  return {
    connect: vi.fn(async () => undefined),
    query: vi.fn(async () => ({ rows: [] })),
    end: vi.fn(async () => undefined),
    ...overrides,
  };
}

function factoryFor(...clients: TestClient[]): ReturnType<typeof vi.fn<TestClientFactory>> {
  const remaining = [...clients];
  const factory = vi.fn<TestClientFactory>(() => {
    const client = remaining.shift();
    if (!client) {
      throw new Error("unexpected_postgres_test_client");
    }
    return client;
  });
  postgresModuleState.factory = factory;
  return factory;
}

function createWithFactory(factory: TestClientFactory): Promise<DisposableDatabase> {
  const create = createDisposableDatabase as unknown as (
    adminConnectionString: string,
    label: string,
    clientFactory: TestClientFactory,
  ) => Promise<DisposableDatabase>;
  return create(TEST_ADMIN_CONNECTION, "fault", factory);
}

function runWithDisposableDatabase<Result>(
  factory: TestClientFactory,
  operation: (database: DisposableDatabase) => Promise<Result>,
): Promise<Result> {
  const run = Reflect.get(disposableDatabaseModule, "withDisposableDatabase") as unknown;
  if (typeof run !== "function") {
    return Promise.reject(new Error("with_disposable_database_missing"));
  }
  return (
    run as (
      adminConnectionString: string,
      label: string,
      operation: (database: DisposableDatabase) => Promise<Result>,
      clientFactory: TestClientFactory,
    ) => Promise<Result>
  )(TEST_ADMIN_CONNECTION, "fault", operation, factory);
}

afterEach(() => {
  postgresModuleState.factory = undefined;
  vi.restoreAllMocks();
});

describe("disposable PostgreSQL database lifecycle", () => {
  test("ends the admin client when connect fails", async () => {
    const connectError = new Error("admin_connect_failed");
    const admin = testClient({
      connect: vi.fn(async () => {
        throw connectError;
      }),
    });
    const factory = factoryFor(admin);

    await expect(createWithFactory(factory)).rejects.toBe(connectError);
    expect(admin.end).toHaveBeenCalledOnce();
  });

  test("compensates CREATE when the admin client end fails", async () => {
    const endError = new Error("admin_end_failed");
    const admin = testClient({
      end: vi.fn(async () => {
        throw endError;
      }),
    });
    const cleanup = testClient();
    const factory = factoryFor(admin, cleanup);

    await expect(createWithFactory(factory)).rejects.toBe(endError);
    expect(cleanup.query).toHaveBeenCalledWith(expect.stringContaining("DROP DATABASE IF EXISTS"));
    expect(cleanup.end).toHaveBeenCalledOnce();
  });

  test("aggregates admin end and compensation failures", async () => {
    const endError = new Error("admin_end_failed");
    const compensationError = new Error("compensation_connect_failed");
    const admin = testClient({
      end: vi.fn(async () => {
        throw endError;
      }),
    });
    const cleanup = testClient({
      connect: vi.fn(async () => {
        throw compensationError;
      }),
    });
    const factory = factoryFor(admin, cleanup);

    const error = await createWithFactory(factory).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([endError, compensationError]);
    expect(cleanup.end).toHaveBeenCalledOnce();
  });

  test("ends the cleanup client when its connect fails", async () => {
    const cleanupConnectError = new Error("cleanup_connect_failed");
    const admin = testClient();
    const cleanup = testClient({
      connect: vi.fn(async () => {
        throw cleanupConnectError;
      }),
    });
    const factory = factoryFor(admin, cleanup);
    const database = await createWithFactory(factory);

    await expect(database.dispose()).rejects.toBe(cleanupConnectError);
    expect(cleanup.end).toHaveBeenCalledOnce();
  });

  test("shares one in-flight cleanup across concurrent dispose calls", async () => {
    let releaseDrop: (() => void) | undefined;
    const dropBarrier = new Promise<void>((resolve) => {
      releaseDrop = resolve;
    });
    const admin = testClient();
    const cleanup = testClient({
      query: vi.fn(async () => {
        await dropBarrier;
        return { rows: [] };
      }),
    });
    const competingCleanup = testClient({
      query: vi.fn(async () => {
        await dropBarrier;
        return { rows: [] };
      }),
    });
    const factory = factoryFor(admin, cleanup, competingCleanup);
    const database = await createWithFactory(factory);

    const first = database.dispose();
    const second = database.dispose();
    await Promise.resolve();
    await Promise.resolve();
    const factoryCallCount = factory.mock.calls.length;
    releaseDrop?.();
    await Promise.all([first, second]);

    expect(factoryCallCount).toBe(2);
    expect(cleanup.query).toHaveBeenCalledOnce();
    expect(competingCleanup.query).not.toHaveBeenCalled();
  });

  test("aggregates a primary operation failure with cleanup failure", async () => {
    const primaryError = new Error("primary_assertion_failed");
    const cleanupError = new Error("cleanup_failed");
    const admin = testClient();
    const cleanup = testClient({
      query: vi.fn(async () => {
        throw cleanupError;
      }),
    });
    const factory = factoryFor(admin, cleanup);

    const error = await runWithDisposableDatabase(factory, async () => {
      throw primaryError;
    }).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(AggregateError);
    expect((error as AggregateError).errors).toEqual([primaryError, cleanupError]);
    expect(cleanup.end).toHaveBeenCalledOnce();
  });
});
