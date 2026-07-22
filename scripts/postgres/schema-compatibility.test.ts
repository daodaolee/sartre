import { describe, expect, test } from "vitest";

import {
  assertDatabaseSchemaCompatible,
  type DatabaseQueryPort,
} from "../../apps/hub-api/src/infrastructure/database/schema-compatibility.js";

const artifacts = [
  {
    version: "000001_ms0_baseline",
    checksum: "baseline-checksum",
  },
  {
    version: "000002_ms0_diagnostics",
    checksum: "diagnostics-checksum",
  },
] as const;

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

const diagnosticColumn = (
  column_name: string,
  data_type: string,
  udt_name: string,
  is_nullable: "YES" | "NO",
) => ({
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default: null,
  character_maximum_length: null,
});

const exactDiagnosticColumns = [
  diagnosticColumn("actor_id", "text", "text", "NO"),
  diagnosticColumn("actor_type", "text", "text", "NO"),
  diagnosticColumn("causation_id", "uuid", "uuid", "NO"),
  diagnosticColumn("component", "text", "text", "NO"),
  diagnosticColumn("correlation_id", "uuid", "uuid", "NO"),
  diagnosticColumn("endpoint_id", "uuid", "uuid", "YES"),
  diagnosticColumn("error_code", "text", "text", "YES"),
  diagnosticColumn("execution_id", "uuid", "uuid", "YES"),
  diagnosticColumn("initiated_by_user_id", "uuid", "uuid", "NO"),
  diagnosticColumn("lease_id", "uuid", "uuid", "YES"),
  diagnosticColumn("occurred_at", "timestamp with time zone", "timestamptz", "NO"),
  diagnosticColumn("operation", "text", "text", "NO"),
  diagnosticColumn("record_id", "uuid", "uuid", "NO"),
  diagnosticColumn("recorded_at", "timestamp with time zone", "timestamptz", "NO"),
  diagnosticColumn("request_id", "uuid", "uuid", "NO"),
  diagnosticColumn("requirement_id", "uuid", "uuid", "YES"),
  diagnosticColumn("resource_id", "uuid", "uuid", "YES"),
  diagnosticColumn("resource_type", "text", "text", "YES"),
  diagnosticColumn("retention_expires_at", "timestamp with time zone", "timestamptz", "NO"),
  diagnosticColumn("retryable", "boolean", "bool", "NO"),
  diagnosticColumn("sequence", "integer", "int4", "NO"),
  diagnosticColumn("session_id", "uuid", "uuid", "YES"),
  diagnosticColumn("stage", "text", "text", "NO"),
  diagnosticColumn("status", "text", "text", "NO"),
  diagnosticColumn("user_id", "uuid", "uuid", "NO"),
  diagnosticColumn("workspace_id", "uuid", "uuid", "YES"),
];

const exactDiagnosticConstraints = [
  {
    constraint_name: "diagnostic_records_actor_type_check",
    constraint_type: "c",
    constraint_definition:
      "CHECK ((actor_type = ANY (ARRAY['human'::text, 'endpoint'::text, 'system'::text])))",
  },
  {
    constraint_name: "diagnostic_records_correlation_sequence_key",
    constraint_type: "u",
    constraint_definition: "UNIQUE (correlation_id, sequence)",
  },
  {
    constraint_name: "diagnostic_records_error_code_check",
    constraint_type: "c",
    constraint_definition:
      "CHECK (((error_code IS NULL) OR (error_code = 'dependency_unavailable'::text)))",
  },
  {
    constraint_name: "diagnostic_records_initiator_check",
    constraint_type: "c",
    constraint_definition: "CHECK ((user_id = initiated_by_user_id))",
  },
  {
    constraint_name: "diagnostic_records_pkey",
    constraint_type: "p",
    constraint_definition: "PRIMARY KEY (record_id)",
  },
  {
    constraint_name: "diagnostic_records_retention_check",
    constraint_type: "c",
    constraint_definition: "CHECK ((retention_expires_at > recorded_at))",
  },
  {
    constraint_name: "diagnostic_records_sequence_check",
    constraint_type: "c",
    constraint_definition: "CHECK (((sequence > 0) AND (sequence <= 4)))",
  },
  {
    constraint_name: "diagnostic_records_stage_check",
    constraint_type: "c",
    constraint_definition:
      "CHECK ((stage = ANY (ARRAY['request_received'::text, 'context_validated'::text, 'dependency_check'::text, 'probe_completed'::text])))",
  },
  {
    constraint_name: "diagnostic_records_status_check",
    constraint_type: "c",
    constraint_definition: "CHECK ((status = ANY (ARRAY['succeeded'::text, 'failed'::text])))",
  },
];

const exactDiagnosticIndexes = [
  {
    index_name: "diagnostic_records_correlation_lookup_idx",
    is_unique: false,
    ordered_columns: ["correlation_id", "sequence"],
    index_definition:
      "CREATE INDEX diagnostic_records_correlation_lookup_idx ON public.diagnostic_records USING btree (correlation_id, sequence)",
  },
  {
    index_name: "diagnostic_records_correlation_sequence_key",
    is_unique: true,
    ordered_columns: ["correlation_id", "sequence"],
    index_definition:
      "CREATE UNIQUE INDEX diagnostic_records_correlation_sequence_key ON public.diagnostic_records USING btree (correlation_id, sequence)",
  },
  {
    index_name: "diagnostic_records_pkey",
    is_unique: true,
    ordered_columns: ["record_id"],
    index_definition:
      "CREATE UNIQUE INDEX diagnostic_records_pkey ON public.diagnostic_records USING btree (record_id)",
  },
];

function databaseWithDiagnosticCatalog(options?: {
  diagnosticColumns?: readonly unknown[];
  diagnosticConstraints?: readonly unknown[];
  diagnosticIndexes?: readonly unknown[];
}): DatabaseQueryPort {
  return {
    query: async (text, parameters) => {
      if (text === "SHOW server_version_num") {
        return { rows: [{ server_version_num: "170006" }] };
      }
      if (text.includes("information_schema.columns") && parameters?.[1] === "schema_migrations") {
        return { rows: exactColumns };
      }
      if (text.includes("is_exact_primary_key")) {
        return { rows: [{ is_exact_primary_key: true }] };
      }
      if (text.includes("information_schema.columns") && parameters?.[1] === "diagnostic_records") {
        return { rows: [...(options?.diagnosticColumns ?? exactDiagnosticColumns)] };
      }
      if (text.includes("pg_get_constraintdef")) {
        return { rows: [...(options?.diagnosticConstraints ?? exactDiagnosticConstraints)] };
      }
      if (text.includes("pg_get_indexdef")) {
        return { rows: [...(options?.diagnosticIndexes ?? exactDiagnosticIndexes)] };
      }
      if (text === "SELECT version, checksum FROM schema_migrations ORDER BY version") {
        return { rows: [...artifacts] };
      }
      throw new Error("unexpected_query");
    },
  };
}

type CompatibilityOptions = {
  database: DatabaseQueryPort;
  artifacts: typeof artifacts;
};

function assertCompatible(options: CompatibilityOptions) {
  return (
    assertDatabaseSchemaCompatible as unknown as (
      input: CompatibilityOptions,
    ) => ReturnType<typeof assertDatabaseSchemaCompatible>
  )(options);
}

function compatibleResponses(
  columns = exactColumns,
  diagnosticColumns = exactDiagnosticColumns,
  migrations: readonly unknown[] = artifacts,
): Array<{ rows: unknown[] }> {
  return [
    { rows: [{ server_version_num: "170006" }] },
    { rows: columns },
    { rows: [{ columns: ["version"], is_exact_primary_key: true }] },
    { rows: diagnosticColumns },
    { rows: exactDiagnosticConstraints },
    { rows: exactDiagnosticIndexes },
    { rows: [...migrations] },
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
      assertCompatible({
        database: databaseWithResponses(compatibleResponses(driftedColumns)),
        artifacts,
      }),
    ).rejects.toMatchObject({ code: "schema_incompatible" });
  });

  test("accepts only the exact ordered approved migration set", async () => {
    await expect(
      assertCompatible({
        database: databaseWithResponses(compatibleResponses()),
        artifacts,
      }),
    ).resolves.toEqual({
      compatible: true,
      schemaVersion: "000002_ms0_diagnostics",
      checksum: "diagnostics-checksum",
    });

    for (const migrationRows of [
      [artifacts[0]],
      [...artifacts, { version: "000003_unapproved", checksum: "extra" }],
      [artifacts[1], artifacts[0]],
      [artifacts[0], { ...artifacts[1], checksum: "drifted" }],
    ]) {
      await expect(
        assertCompatible({
          database: databaseWithResponses(
            compatibleResponses(exactColumns, exactDiagnosticColumns, migrationRows),
          ),
          artifacts,
        }),
      ).rejects.toMatchObject({ code: "schema_incompatible" });
    }
  });

  test("rejects a missing or extra diagnostic table column", async () => {
    await expect(
      assertCompatible({
        database: databaseWithResponses(
          compatibleResponses(exactColumns, exactDiagnosticColumns.slice(1)),
        ),
        artifacts,
      }),
    ).rejects.toMatchObject({ code: "schema_incompatible" });
    await expect(
      assertCompatible({
        database: databaseWithResponses(
          compatibleResponses(exactColumns, [...exactDiagnosticColumns, { column_name: "body" }]),
        ),
        artifacts,
      }),
    ).rejects.toMatchObject({ code: "schema_incompatible" });
  });

  test.each([
    ["type", { data_type: "character varying", udt_name: "varchar" }],
    ["nullability", { is_nullable: "YES" }],
    ["default", { column_default: "false" }],
  ])("rejects diagnostic column %s drift", async (_label, drift) => {
    const driftedColumns = exactDiagnosticColumns.map((column) =>
      column.column_name === "retryable" ? { ...column, ...drift } : column,
    );

    await expect(
      assertCompatible({
        database: databaseWithDiagnosticCatalog({ diagnosticColumns: driftedColumns }),
        artifacts,
      }),
    ).rejects.toMatchObject({ code: "schema_incompatible" });
  });

  test("rejects a missing named diagnostic constraint", async () => {
    await expect(
      assertCompatible({
        database: databaseWithDiagnosticCatalog({
          diagnosticConstraints: exactDiagnosticConstraints.slice(1),
        }),
        artifacts,
      }),
    ).rejects.toMatchObject({ code: "schema_incompatible" });
  });

  test.each([
    ["type", { constraint_type: "u" }],
    ["definition", { constraint_definition: "CHECK ((actor_type = 'human'::text))" }],
  ])("rejects diagnostic constraint %s drift", async (_label, drift) => {
    const driftedConstraints = exactDiagnosticConstraints.map((constraint) =>
      constraint.constraint_name === "diagnostic_records_actor_type_check"
        ? { ...constraint, ...drift }
        : constraint,
    );
    await expect(
      assertCompatible({
        database: databaseWithDiagnosticCatalog({
          diagnosticConstraints: driftedConstraints,
        }),
        artifacts,
      }),
    ).rejects.toMatchObject({ code: "schema_incompatible" });
  });

  test("rejects a missing named diagnostic index", async () => {
    await expect(
      assertCompatible({
        database: databaseWithDiagnosticCatalog({
          diagnosticIndexes: exactDiagnosticIndexes.slice(1),
        }),
        artifacts,
      }),
    ).rejects.toMatchObject({ code: "schema_incompatible" });
  });

  test.each([
    ["uniqueness", { is_unique: true }],
    ["ordered columns", { ordered_columns: ["sequence", "correlation_id"] }],
    [
      "definition",
      {
        index_definition:
          "CREATE INDEX diagnostic_records_correlation_lookup_idx ON public.diagnostic_records USING btree (sequence, correlation_id)",
      },
    ],
  ])("rejects diagnostic index %s drift", async (_label, drift) => {
    const driftedIndexes = exactDiagnosticIndexes.map((index) =>
      index.index_name === "diagnostic_records_correlation_lookup_idx"
        ? { ...index, ...drift }
        : index,
    );
    await expect(
      assertCompatible({
        database: databaseWithDiagnosticCatalog({ diagnosticIndexes: driftedIndexes }),
        artifacts,
      }),
    ).rejects.toMatchObject({ code: "schema_incompatible" });
  });

  test("uses only read-only parameterized catalog queries", async () => {
    const calls: Array<{ text: string; parameters: readonly unknown[] | undefined }> = [];
    const catalog = databaseWithDiagnosticCatalog();
    await expect(
      assertCompatible({
        database: {
          query: async (text, parameters) => {
            calls.push({ text, parameters });
            return catalog.query(text, parameters);
          },
        },
        artifacts,
      }),
    ).resolves.toMatchObject({ compatible: true });

    expect(calls).toHaveLength(7);
    expect(calls.every(({ text }) => /^(?:SELECT|SHOW)\b/u.test(text.trim()))).toBe(true);
    expect(calls.slice(1, 6).map(({ parameters }) => parameters)).toEqual([
      ["public", "schema_migrations"],
      ["public.schema_migrations"],
      ["public", "diagnostic_records"],
      ["public.diagnostic_records"],
      ["public.diagnostic_records"],
    ]);
  });

  test.each([0, 1, 2, 3, 4, 5, 6])(
    "preserves a dependency error from query boundary %i",
    async (failureIndex) => {
      const dependencyError = Object.assign(new Error("dependency failed"), {
        code: "ECONNRESET",
      });
      const responses: Array<{ rows: unknown[] } | Error> = compatibleResponses();
      responses[failureIndex] = dependencyError;

      await expect(
        assertCompatible({
          database: databaseWithResponses(responses),
          artifacts,
        }),
      ).rejects.toBe(dependencyError);
    },
  );
});
