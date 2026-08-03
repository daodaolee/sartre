import { describe, expect, test } from "vitest";

import * as migrations from "./migrate.js";

describe("approved PostgreSQL migration registry", () => {
  test("loads the exact ordered MS0 and MS1 migration set with immutable checksums", async () => {
    const loadApprovedMigrations = (
      migrations as typeof migrations & {
        loadApprovedMigrations?: () => Promise<
          ReadonlyArray<{ version: string; checksum: string; sql: string }>
        >;
      }
    ).loadApprovedMigrations;

    expect(loadApprovedMigrations).toBeTypeOf("function");
    const artifacts = await loadApprovedMigrations?.();
    expect(artifacts?.map((artifact) => artifact.version)).toEqual([
      "000001_ms0_baseline",
      "000002_ms0_diagnostics",
      "000003_ms1_identity_workspace",
      "000004_ms1_human_authentication",
    ]);
    expect(artifacts?.every((artifact) => /^[0-9a-f]{64}$/.test(artifact.checksum))).toBe(true);
    expect(artifacts?.[0]?.sql).not.toContain("diagnostic_records");
    expect(artifacts?.[1]?.sql).toContain("diagnostic_records");
    expect(artifacts?.[2]?.sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(artifacts?.[3]?.sql).toContain("company_email_credentials");
  });
});
