import { describe, expect, test } from "vitest";

import {
  assertDatabaseSchemaCompatible,
  type DatabaseQueryPort,
} from "../../apps/hub-api/src/infrastructure/database/schema-compatibility.js";

const artifact = {
  version: "000001_ms0_baseline",
  checksum: "checksum",
};

const exactColumns = [
  {
    column_name: "applied_at",
    data_type: "timestamp with time zone",
    is_nullable: "NO",
    column_default: "now()",
  },
  {
    column_name: "checksum",
    data_type: "text",
    is_nullable: "NO",
    column_default: null,
  },
  {
    column_name: "version",
    data_type: "text",
    is_nullable: "NO",
    column_default: null,
  },
];

function databaseWithResponses(responses: Array<{ rows: unknown[] } | Error>): DatabaseQueryPort {
  let call = 0;
  return {
    query: async () => {
      const response = responses[call];
      call += 1;
      if (!response) {
        throw new Error("unexpected_query");
      }
      if (response instanceof Error) {
        throw response;
      }
      return response;
    },
  };
}

function compatibleResponses(columns = exactColumns): Array<{ rows: unknown[] }> {
  return [
    { rows: [{ server_version_num: "170006" }] },
    { rows: columns },
    { rows: [{ columns: ["version"], is_exact_primary_key: true }] },
    { rows: [{ version: artifact.version, checksum: artifact.checksum }] },
  ];
}

describe("Hub PostgreSQL schema compatibility boundary", () => {
  test("rejects an applied_at default that is not exactly now()", async () => {
    const driftedColumns = exactColumns.map((column) =>
      column.column_name === "applied_at"
        ? { ...column, column_default: "clock_timestamp()" }
        : column,
    );

    await expect(
      assertDatabaseSchemaCompatible({
        database: databaseWithResponses(compatibleResponses(driftedColumns)),
        artifact,
      }),
    ).rejects.toMatchObject({ code: "schema_incompatible" });
  });

  test.each([0, 1, 2, 3])(
    "preserves a dependency error from query boundary %i",
    async (failureIndex) => {
      const dependencyError = Object.assign(new Error("dependency failed"), {
        code: "ECONNRESET",
      });
      const responses: Array<{ rows: unknown[] } | Error> = compatibleResponses();
      responses[failureIndex] = dependencyError;

      await expect(
        assertDatabaseSchemaCompatible({
          database: databaseWithResponses(responses),
          artifact,
        }),
      ).rejects.toBe(dependencyError);
    },
  );
});
