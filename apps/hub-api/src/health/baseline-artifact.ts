import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { ExpectedMigrationArtifact } from "../infrastructure/database/schema-compatibility.js";

const BASELINE_VERSION = "000001_ms0_baseline";
const BASELINE_PATH = new URL(
  "../infrastructure/database/migrations/000001_ms0_baseline.sql",
  import.meta.url,
);

let cachedArtifact: Promise<ExpectedMigrationArtifact> | undefined;

export function loadExpectedBaselineArtifact(): Promise<ExpectedMigrationArtifact> {
  cachedArtifact ??= readFile(BASELINE_PATH, "utf8").then((sql) => ({
    version: BASELINE_VERSION,
    checksum: createHash("sha256").update(sql, "utf8").digest("hex"),
  }));
  return cachedArtifact;
}
