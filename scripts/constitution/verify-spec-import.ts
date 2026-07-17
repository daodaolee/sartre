import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type SpecImportEntry, verifyImportEntries } from "./spec-import-manifest.js";

type RawImportManifest = {
  readonly schemaVersion: 1;
  readonly sourceRoot: string;
  readonly generatedAt: string;
  readonly entries: ReadonlyArray<{
    readonly source: string;
    readonly target: string;
    readonly sha256: string;
  }>;
};

function isRawImportManifest(value: unknown): value is RawImportManifest {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    !("schemaVersion" in value) ||
    value.schemaVersion !== 1 ||
    !("sourceRoot" in value) ||
    typeof value.sourceRoot !== "string" ||
    !("generatedAt" in value) ||
    typeof value.generatedAt !== "string" ||
    !("entries" in value) ||
    !Array.isArray(value.entries)
  ) {
    return false;
  }
  return value.entries.every(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      !Array.isArray(entry) &&
      "source" in entry &&
      typeof entry.source === "string" &&
      "target" in entry &&
      typeof entry.target === "string" &&
      "sha256" in entry &&
      typeof entry.sha256 === "string" &&
      /^[a-f0-9]{64}$/iu.test(entry.sha256),
  );
}

const repositoryRoot = process.cwd();
const manifestPath = resolve(repositoryRoot, "reference/spec-import-manifest.json");
const rawManifest: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));

if (!isRawImportManifest(rawManifest)) {
  console.error("manifest_schema_invalid: manifest");
  process.exitCode = 1;
} else {
  const entries: SpecImportEntry[] = rawManifest.entries.map((entry) => ({
    source: resolve(rawManifest.sourceRoot, entry.source),
    target: resolve(repositoryRoot, entry.target),
    sha256: entry.sha256,
  }));
  const verifySource = process.argv.slice(2).includes("--verify-source");
  const violations = verifyImportEntries(entries, {
    verifySource,
    enforceApprovedManifest: true,
    repositoryRoot,
    sourceRoot: rawManifest.sourceRoot,
  });
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(`${violation.code}: ${violation.target}`);
    }
    process.exitCode = 1;
  } else {
    const scope = verifySource ? "source and target" : "target";
    console.log(`Verified ${entries.length} approved ${scope} document hashes.`);
  }
}
