import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { ExpectedMigrationArtifact } from "../infrastructure/database/schema-compatibility.js";

const APPROVED_MIGRATIONS = [
  {
    version: "000001_ms0_baseline",
    path: new URL("../infrastructure/database/migrations/000001_ms0_baseline.sql", import.meta.url),
  },
  {
    version: "000002_ms0_diagnostics",
    path: new URL(
      "../infrastructure/database/migrations/000002_ms0_diagnostics.sql",
      import.meta.url,
    ),
  },
  {
    version: "000003_ms1_identity_workspace",
    path: new URL(
      "../infrastructure/database/migrations/000003_ms1_identity_workspace.sql",
      import.meta.url,
    ),
  },
  {
    version: "000004_ms1_human_authentication",
    path: new URL(
      "../infrastructure/database/migrations/000004_ms1_human_authentication.sql",
      import.meta.url,
    ),
  },
  {
    version: "000005_ms1_defer_feishu_login",
    path: new URL(
      "../infrastructure/database/migrations/000005_ms1_defer_feishu_login.sql",
      import.meta.url,
    ),
  },
  {
    version: "000006_ms1_defer_email_delivery",
    path: new URL(
      "../infrastructure/database/migrations/000006_ms1_defer_email_delivery.sql",
      import.meta.url,
    ),
  },
  {
    version: "000007_ms1_workspace_commands",
    path: new URL(
      "../infrastructure/database/migrations/000007_ms1_workspace_commands.sql",
      import.meta.url,
    ),
  },
  {
    version: "000008_ms1_workspace_access_commands",
    path: new URL(
      "../infrastructure/database/migrations/000008_ms1_workspace_access_commands.sql",
      import.meta.url,
    ),
  },
  {
    version: "000009_ms1_endpoint_pairing",
    path: new URL(
      "../infrastructure/database/migrations/000009_ms1_endpoint_pairing.sql",
      import.meta.url,
    ),
  },
] as const;

let cachedArtifacts: Promise<readonly ExpectedMigrationArtifact[]> | undefined;

export function loadExpectedMigrationArtifacts(): Promise<readonly ExpectedMigrationArtifact[]> {
  cachedArtifacts ??= Promise.all(
    APPROVED_MIGRATIONS.map(async (migration) => ({
      version: migration.version,
      checksum: createHash("sha256")
        .update(await readFile(migration.path, "utf8"), "utf8")
        .digest("hex"),
    })),
  );
  return cachedArtifacts;
}
