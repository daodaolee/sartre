import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readlinkSync, realpathSync } from "node:fs";
import type { Stats } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { FreezeManifest, FreezeManifestEntry } from "./create-freeze-manifest.js";

export type FreezeManifestViolation = {
  readonly code:
    | "source_repository_mismatch"
    | "source_head_mismatch"
    | "dirty_diff_hash_mismatch"
    | "entry_missing"
    | "entry_unexpected"
    | "entry_mismatch"
    | "entry_order_mismatch"
    | "manifest_entry_duplicate"
    | "manifest_schema_invalid";
  readonly path: string;
};

function git(source: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd: source, encoding: "utf8" });
}

function nul(value: string): string[] {
  return value.split("\0").filter((path) => path.length > 0);
}

function order(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function isSensitive(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  const basename = normalized.split("/").at(-1) ?? "";
  return (
    normalized.split("/").includes(".local-secrets") ||
    basename === ".env" ||
    (basename.startsWith(".env.") && basename !== ".env.example") ||
    basename === ".npmrc" ||
    /\.(?:pem|key|p12|pfx)$/iu.test(basename)
  );
}

function inspect(source: string, path: string) {
  let stat: Stats;
  try {
    stat = lstatSync(resolve(source, path));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { kind: "missing" as const, size: null, sha256: null };
    }
    throw error;
  }
  if (stat.isSymbolicLink()) {
    return {
      kind: "symlink" as const,
      size: stat.size,
      sha256: isSensitive(path) ? null : sha(readlinkSync(resolve(source, path))),
    };
  }
  if (!stat.isFile()) {
    return { kind: "other" as const, size: stat.size, sha256: null };
  }
  if (isSensitive(path)) {
    return { kind: "file" as const, size: stat.size, sha256: null };
  }
  try {
    return {
      kind: "file" as const,
      size: stat.size,
      sha256: sha(readFileSync(resolve(source, path))),
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EACCES" || code === "EPERM") {
      return { kind: "file" as const, size: stat.size, sha256: null };
    }
    throw error;
  }
}

function enumerate(source: string): {
  head: string;
  entries: FreezeManifestEntry[];
  dirtyHash: string;
} {
  const head = git(source, ["rev-parse", "HEAD"]).trim();
  const atHead = new Set(nul(git(source, ["ls-tree", "-r", "--name-only", "-z", "HEAD"])));
  const inIndex = new Set(nul(git(source, ["ls-files", "--cached", "-z"])));
  const changed = new Set(nul(git(source, ["diff", "--name-only", "-z", "HEAD", "--"])));
  const tracked = [...new Set([...atHead, ...inIndex])].sort(order);
  const untracked = nul(git(source, ["ls-files", "--others", "--exclude-standard", "-z"]));

  const entries: FreezeManifestEntry[] = tracked.map((path) => {
    const fact = inspect(source, path);
    return {
      path,
      ...fact,
      gitState:
        fact.kind === "missing"
          ? "deleted"
          : changed.has(path) || !atHead.has(path)
            ? "modified"
            : "tracked",
    };
  });
  for (const path of untracked) {
    if (!atHead.has(path) && !inIndex.has(path)) {
      entries.push({ path, ...inspect(source, path), gitState: "untracked" });
    }
  }
  entries.sort((left, right) => order(left.path, right.path));
  const dirtyHash = sha(
    JSON.stringify([head, entries.filter((entry) => entry.gitState !== "tracked")]),
  );
  return { head, entries, dirtyHash };
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort(order);
  const expected = [...keys].sort(order);
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function isFreezeManifestEntry(value: unknown): value is FreezeManifestEntry {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    hasExactKeys(entry, ["path", "kind", "size", "sha256", "gitState"]) &&
    typeof entry.path === "string" &&
    entry.path.length > 0 &&
    ["file", "symlink", "other", "missing"].includes(String(entry.kind)) &&
    (entry.size === null ||
      (typeof entry.size === "number" && Number.isSafeInteger(entry.size) && entry.size >= 0)) &&
    (entry.sha256 === null ||
      (typeof entry.sha256 === "string" && /^[a-f0-9]{64}$/u.test(entry.sha256))) &&
    ["tracked", "modified", "untracked", "deleted"].includes(String(entry.gitState))
  );
}

export function isFreezeManifest(value: unknown): value is FreezeManifest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const manifest = value as Record<string, unknown>;
  return (
    hasExactKeys(manifest, [
      "schemaVersion",
      "sourceRepository",
      "sourceHead",
      "dirtyDiffHash",
      "generatedAt",
      "entries",
    ]) &&
    manifest.schemaVersion === 1 &&
    typeof manifest.sourceRepository === "string" &&
    manifest.sourceRepository.length > 0 &&
    typeof manifest.sourceHead === "string" &&
    /^[a-f0-9]{40,64}$/u.test(manifest.sourceHead) &&
    typeof manifest.dirtyDiffHash === "string" &&
    /^[a-f0-9]{64}$/u.test(manifest.dirtyDiffHash) &&
    typeof manifest.generatedAt === "string" &&
    !Number.isNaN(Date.parse(manifest.generatedAt)) &&
    Array.isArray(manifest.entries) &&
    manifest.entries.every(isFreezeManifestEntry)
  );
}

export function verifyFreezeManifest(
  requestedSource: string,
  manifest: unknown,
): FreezeManifestViolation[] {
  if (!isFreezeManifest(manifest)) {
    return [{ code: "manifest_schema_invalid", path: "manifest" }];
  }

  const seenPaths = new Set<string>();
  for (const entry of manifest.entries) {
    if (seenPaths.has(entry.path)) {
      return [{ code: "manifest_entry_duplicate", path: entry.path }];
    }
    seenPaths.add(entry.path);
  }
  for (let index = 1; index < manifest.entries.length; index += 1) {
    const previous = manifest.entries[index - 1];
    const current = manifest.entries[index];
    if (previous && current && order(previous.path, current.path) >= 0) {
      return [{ code: "entry_order_mismatch", path: current.path }];
    }
  }

  const source = realpathSync(
    git(realpathSync(resolve(requestedSource)), ["rev-parse", "--show-toplevel"]).trim(),
  );
  const current = enumerate(source);
  const violations: FreezeManifestViolation[] = [];

  if (manifest.sourceRepository !== source) {
    violations.push({ code: "source_repository_mismatch", path: "." });
  }
  if (manifest.sourceHead !== current.head) {
    violations.push({ code: "source_head_mismatch", path: "." });
  }
  if (manifest.dirtyDiffHash !== current.dirtyHash) {
    violations.push({ code: "dirty_diff_hash_mismatch", path: "." });
  }

  const expectedByPath = new Map(current.entries.map((entry) => [entry.path, entry]));
  const actualByPath = new Map(manifest.entries.map((entry) => [entry.path, entry]));
  for (const [path, expected] of expectedByPath) {
    const actual = actualByPath.get(path);
    if (!actual) {
      violations.push({ code: "entry_missing", path });
    } else if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      violations.push({ code: "entry_mismatch", path });
    }
  }
  for (const path of actualByPath.keys()) {
    if (!expectedByPath.has(path)) {
      violations.push({ code: "entry_unexpected", path });
    }
  }
  return violations;
}

function requiredArg(flag: string): string {
  const args = process.argv.slice(2);
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value) {
    throw new Error(`Missing required ${flag}`);
  }
  return value;
}

function runCli(): void {
  const manifest: unknown = JSON.parse(readFileSync(resolve(requiredArg("--manifest")), "utf8"));
  const violations = verifyFreezeManifest(requiredArg("--source"), manifest);
  for (const violation of violations) {
    console.error(`${violation.code}: ${violation.path}`);
  }
  if (violations.length > 0) {
    process.exitCode = 1;
  } else if (isFreezeManifest(manifest)) {
    console.log(`Legacy freeze manifest verified across ${manifest.entries.length} path facts.`);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli();
}
