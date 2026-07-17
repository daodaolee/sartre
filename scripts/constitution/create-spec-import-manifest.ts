import { writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPROVED_SPEC_IMPORT_SOURCE_ROOT,
  APPROVED_SPEC_IMPORTS,
  createImportEntry,
} from "./spec-import-manifest.js";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = APPROVED_SPEC_IMPORT_SOURCE_ROOT;

const entries = APPROVED_SPEC_IMPORTS.map((mapping) =>
  createImportEntry(join(sourceRoot, mapping.source), join(repositoryRoot, mapping.target)),
);

const manifest = {
  schemaVersion: 1,
  sourceRoot,
  generatedAt: new Date().toISOString(),
  entries: entries.map((entry) => ({
    source: relative(sourceRoot, entry.source),
    target: relative(repositoryRoot, entry.target),
    sha256: entry.sha256,
  })),
};

writeFileSync(
  join(repositoryRoot, "reference/spec-import-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8",
);
console.log(`Wrote ${manifest.entries.length} approved document hashes.`);
