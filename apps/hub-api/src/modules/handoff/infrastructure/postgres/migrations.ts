import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;

export type HandoffMigrationResult = {
  applied: string[];
  existing: string[];
};

export type HandoffMigrationInput =
  | { connectionString: string; pool?: never }
  | { connectionString?: never; pool: pg.Pool };

const migrationDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "migration-files",
);

export async function runHandoffMigrations(
  input: HandoffMigrationInput,
): Promise<HandoffMigrationResult> {
  const pool =
    input.pool ?? new Pool({ connectionString: input.connectionString });
  const shouldClosePool = !input.pool;
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(`
      create table if not exists handoff_schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const files = (await readdir(migrationDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();
    const existingResult = await client.query<{ version: string }>(
      "select version from handoff_schema_migrations order by version asc",
    );
    const existing = existingResult.rows.map((row) => row.version);
    const existingSet = new Set(existing);
    const applied: string[] = [];

    for (const file of files) {
      if (existingSet.has(file)) {
        continue;
      }
      const sql = await readFile(join(migrationDir, file), "utf8");
      await client.query(sql);
      await client.query(
        "insert into handoff_schema_migrations (version) values ($1)",
        [file],
      );
      applied.push(file);
      existingSet.add(file);
    }

    await client.query("commit");

    return {
      applied,
      existing: [...existing, ...applied].sort(),
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    if (shouldClosePool) {
      await pool.end();
    }
  }
}
