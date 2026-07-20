import { pathToFileURL } from "node:url";

import { Client } from "pg";

export const EXPECTED_POSTGRES_SERVER_VERSION_NUM = "170006";

export class PostgresVersionMismatchError extends Error {
  readonly code = "postgres_version_mismatch" as const;
  readonly actualVersion: string;
  readonly expectedVersion: string;

  constructor(actualVersion: string, expectedVersion = EXPECTED_POSTGRES_SERVER_VERSION_NUM) {
    super("postgres_version_mismatch");
    this.name = "PostgresVersionMismatchError";
    this.actualVersion = actualVersion;
    this.expectedVersion = expectedVersion;
  }
}

export interface VerifiedPostgresVersion {
  serverVersionNum: string;
}

export async function verifyConnectedPostgresVersion(
  client: Client,
): Promise<VerifiedPostgresVersion> {
  const result = await client.query("SHOW server_version_num");
  const value = (result.rows[0] as { server_version_num?: unknown } | undefined)
    ?.server_version_num;
  const serverVersionNum = typeof value === "string" ? value : String(value);

  if (serverVersionNum !== EXPECTED_POSTGRES_SERVER_VERSION_NUM) {
    throw new PostgresVersionMismatchError(serverVersionNum);
  }

  return { serverVersionNum };
}

export async function verifyPostgresVersion(
  connectionString: string,
): Promise<VerifiedPostgresVersion> {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    return await verifyConnectedPostgresVersion(client);
  } finally {
    await client.end();
  }
}

function requiredDatabaseUrl(): string {
  const value = process.env.SARTRE_DATABASE_URL;
  if (!value) {
    throw new Error("SARTRE_DATABASE_URL_required");
  }
  return value;
}

function stableErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "postgres_version_mismatch"
  ) {
    return error.code;
  }
  if (error instanceof Error && error.message === "SARTRE_DATABASE_URL_required") {
    return error.message;
  }
  return "dependency_unavailable";
}

export async function runVerifyVersionCli(): Promise<number> {
  try {
    const version = await verifyPostgresVersion(requiredDatabaseUrl());
    console.info(`server_version_num=${version.serverVersionNum}`);
    return 0;
  } catch (error) {
    console.error(stableErrorCode(error));
    return 1;
  }
}

const executedPath = process.argv[1];
if (executedPath && import.meta.url === pathToFileURL(executedPath).href) {
  process.exitCode = await runVerifyVersionCli();
}
