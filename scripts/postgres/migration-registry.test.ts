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
      "000005_ms1_defer_feishu_login",
      "000006_ms1_defer_email_delivery",
      "000007_ms1_workspace_commands",
      "000008_ms1_workspace_access_commands",
      "000009_ms1_endpoint_pairing",
    ]);
    expect(artifacts?.every((artifact) => /^[0-9a-f]{64}$/.test(artifact.checksum))).toBe(true);
    expect(artifacts?.[0]?.sql).not.toContain("diagnostic_records");
    expect(artifacts?.[1]?.sql).toContain("diagnostic_records");
    expect(artifacts?.[2]?.sql).toContain("FORCE ROW LEVEL SECURITY");
    expect(artifacts?.[3]?.sql).toContain("company_email_credentials");
    expect(artifacts?.[4]?.sql).toContain("DROP TABLE oauth_login_attempts");
    expect(artifacts?.[5]?.sql).toContain("DROP TABLE email_verification_challenges");
    expect(artifacts?.[6]?.sql).toContain("workspace_command_receipts");
    expect(artifacts?.[7]?.sql).toContain("project.access.grant");
    expect(artifacts?.[8]?.sql).toContain("endpoint_pairing_intents");
  });
});
