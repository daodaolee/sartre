import { randomUUID } from "node:crypto";

import { Client } from "pg";

import type { DatabaseQueryParameter } from "../../apps/hub-api/src/infrastructure/database/schema-compatibility.js";

const SAFE_DATABASE_NAME = /^[a-z][a-z0-9_]{0,62}$/;

export interface DisposableDatabase {
  databaseName: string;
  connectionString: string;
  dispose: () => Promise<void>;
}

export interface DatabaseQueryClient {
  query: (
    text: string,
    parameters?: readonly DatabaseQueryParameter[],
  ) => Promise<{ rows: unknown[] }>;
}

export interface DisposableDatabaseClient {
  connect: () => Promise<void>;
  query: (text: string) => Promise<{ rows: unknown[] }>;
  end: () => Promise<void>;
}

export type DisposableDatabaseClientFactory = (
  connectionString: string,
) => DisposableDatabaseClient;

const createPostgresClient: DisposableDatabaseClientFactory = (connectionString) => {
  const client = new Client({ connectionString });
  return {
    connect: async () => client.connect(),
    query: async (text) => {
      const result = await client.query(text);
      return { rows: result.rows as unknown[] };
    },
    end: async () => client.end(),
  };
};

function quoteGeneratedIdentifier(value: string): string {
  if (!SAFE_DATABASE_NAME.test(value)) {
    throw new Error("unsafe_generated_database_name");
  }
  return `"${value}"`;
}

function databaseUrl(source: string, databaseName: string): string {
  const url = new URL(source);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

async function withClientEnd<Result>(
  client: DisposableDatabaseClient,
  operation: () => Promise<Result>,
): Promise<Result> {
  let result: Result;
  try {
    result = await operation();
  } catch (operationError) {
    try {
      await client.end();
    } catch (endError) {
      throw new AggregateError(
        [operationError, endError],
        "postgres_client_operation_and_end_failed",
      );
    }
    throw operationError;
  }

  await client.end();
  return result;
}

async function dropDisposableDatabase(
  adminConnectionString: string,
  identifier: string,
  clientFactory: DisposableDatabaseClientFactory,
): Promise<void> {
  const cleanup = clientFactory(adminConnectionString);
  await withClientEnd(cleanup, async () => {
    await cleanup.connect();
    await cleanup.query(`DROP DATABASE IF EXISTS ${identifier} WITH (FORCE)`);
  });
}

export async function createDisposableDatabase(
  adminConnectionString: string,
  label = "integration",
  clientFactory: DisposableDatabaseClientFactory = createPostgresClient,
): Promise<DisposableDatabase> {
  const normalizedLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  const databaseName = `sartre_ms0_${normalizedLabel}_${randomUUID()
    .replaceAll("-", "")
    .slice(0, 16)}`;
  const identifier = quoteGeneratedIdentifier(databaseName);
  const admin = clientFactory(adminConnectionString);
  let createCompleted = false;
  try {
    await withClientEnd(admin, async () => {
      await admin.connect();
      await admin.query(`CREATE DATABASE ${identifier} TEMPLATE template0`);
      createCompleted = true;
    });
  } catch (creationError) {
    if (createCompleted) {
      try {
        await dropDisposableDatabase(adminConnectionString, identifier, clientFactory);
      } catch (compensationError) {
        throw new AggregateError(
          [creationError, compensationError],
          "disposable_database_creation_compensation_failed",
        );
      }
    }
    throw creationError;
  }

  let disposePromise: Promise<void> | undefined;
  return {
    databaseName,
    connectionString: databaseUrl(adminConnectionString, databaseName),
    dispose: () => {
      if (disposePromise) {
        return disposePromise;
      }

      disposePromise = dropDisposableDatabase(
        adminConnectionString,
        identifier,
        clientFactory,
      ).catch((error: unknown) => {
        disposePromise = undefined;
        throw error;
      });
      return disposePromise;
    },
  };
}

export async function withDisposableDatabase<Result>(
  adminConnectionString: string,
  label: string,
  operation: (database: DisposableDatabase) => Promise<Result>,
  clientFactory: DisposableDatabaseClientFactory = createPostgresClient,
): Promise<Result> {
  const database = await createDisposableDatabase(adminConnectionString, label, clientFactory);

  let result: Result;
  try {
    result = await operation(database);
  } catch (operationError) {
    try {
      await database.dispose();
    } catch (cleanupError) {
      throw new AggregateError(
        [operationError, cleanupError],
        "disposable_database_operation_and_cleanup_failed",
      );
    }
    throw operationError;
  }

  await database.dispose();
  return result;
}

export async function queryDatabase<Row extends Record<string, unknown>>(
  connectionString: string,
  text: string,
  values?: unknown[],
): Promise<Row[]> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query(text, values);
    return result.rows as Row[];
  } finally {
    await client.end();
  }
}

export async function withDatabaseQueryClient<Result>(
  connectionString: string,
  operation: (database: DatabaseQueryClient) => Promise<Result>,
): Promise<Result> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await operation({
      query: async (text, parameters) => {
        const result = await client.query(text, parameters ? [...parameters] : undefined);
        return { rows: result.rows as unknown[] };
      },
    });
  } finally {
    await client.end();
  }
}

export async function readDatabaseObjectFingerprint(connectionString: string): Promise<string> {
  const rows = await queryDatabase<{ fingerprint: string }>(
    connectionString,
    `SELECT md5(COALESCE(string_agg(object_identity, ',' ORDER BY object_identity), '')) AS fingerprint
       FROM (
         SELECT n.nspname || ':' || c.relkind::text || ':' || c.relname AS object_identity
           FROM pg_catalog.pg_class AS c
           JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
          WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
            AND n.nspname NOT LIKE 'pg_toast%'
       ) AS application_objects`,
  );
  const fingerprint = rows[0]?.fingerprint;
  if (!fingerprint) {
    throw new Error("database_object_fingerprint_unavailable");
  }
  return fingerprint;
}
