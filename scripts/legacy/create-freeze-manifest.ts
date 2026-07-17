import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import type { Stats } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type FreezeManifestEntry = {
  readonly path: string;
  readonly kind: "file" | "symlink" | "other" | "missing";
  readonly size: number | null;
  readonly sha256: string | null;
  readonly gitState: "tracked" | "modified" | "untracked" | "deleted";
};

export type FreezeManifest = {
  readonly schemaVersion: 1;
  readonly sourceRepository: string;
  readonly sourceHead: string;
  readonly dirtyDiffHash: string;
  readonly generatedAt: string;
  entries: FreezeManifestEntry[];
};

type CreateFreezeManifestOptions = {
  readonly source: string;
  readonly generatedAt?: string;
};

function git(source: string, args: readonly string[]): string {
  return execFileSync("git", [...args], { cwd: source, encoding: "utf8" });
}

function splitNul(value: string): string[] {
  return value.split("\0").filter(Boolean);
}

function comparePath(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function hash(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function isCredentialBearingPath(path: string): boolean {
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

function inspectPath(
  source: string,
  path: string,
): Pick<FreezeManifestEntry, "kind" | "size" | "sha256"> {
  let stat: Stats;
  try {
    stat = lstatSync(resolve(source, path));
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { kind: "missing", size: null, sha256: null };
    }
    throw error;
  }

  if (stat.isSymbolicLink()) {
    const target = readlinkSync(resolve(source, path));
    return {
      kind: "symlink",
      size: stat.size,
      sha256: isCredentialBearingPath(path) ? null : hash(target),
    };
  }
  if (!stat.isFile()) {
    return { kind: "other", size: stat.size, sha256: null };
  }
  if (isCredentialBearingPath(path)) {
    return { kind: "file", size: stat.size, sha256: null };
  }

  try {
    return { kind: "file", size: stat.size, sha256: hash(readFileSync(resolve(source, path))) };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EACCES" || code === "EPERM") {
      return { kind: "file", size: stat.size, sha256: null };
    }
    throw error;
  }
}

function enumerateEntries(source: string): FreezeManifestEntry[] {
  const headPaths = new Set(splitNul(git(source, ["ls-tree", "-r", "--name-only", "-z", "HEAD"])));
  const indexPaths = new Set(splitNul(git(source, ["ls-files", "--cached", "-z"])));
  const untrackedPaths = splitNul(
    git(source, ["ls-files", "--others", "--exclude-standard", "-z"]),
  );
  const modifiedPaths = new Set(splitNul(git(source, ["diff", "--name-only", "-z", "HEAD", "--"])));
  const trackedPaths = [...new Set([...headPaths, ...indexPaths])].sort(comparePath);

  const trackedEntries = trackedPaths.map((path): FreezeManifestEntry => {
    const inspected = inspectPath(source, path);
    const gitState =
      inspected.kind === "missing"
        ? "deleted"
        : modifiedPaths.has(path) || !headPaths.has(path)
          ? "modified"
          : "tracked";
    return { path, ...inspected, gitState };
  });

  const untrackedEntries = untrackedPaths
    .filter((path) => !headPaths.has(path) && !indexPaths.has(path))
    .map(
      (path): FreezeManifestEntry => ({
        path,
        ...inspectPath(source, path),
        gitState: "untracked",
      }),
    );

  return [...trackedEntries, ...untrackedEntries].sort((left, right) =>
    comparePath(left.path, right.path),
  );
}

function createDirtyDiffHash(sourceHead: string, entries: readonly FreezeManifestEntry[]): string {
  const dirtyEntries = entries.filter((entry) => entry.gitState !== "tracked");
  return hash(JSON.stringify([sourceHead, dirtyEntries]));
}

export function createFreezeManifest(options: CreateFreezeManifestOptions): FreezeManifest {
  const requestedSource = realpathSync(resolve(options.source));
  const sourceRepository = realpathSync(
    git(requestedSource, ["rev-parse", "--show-toplevel"]).trim(),
  );
  const sourceHead = git(sourceRepository, ["rev-parse", "HEAD"]).trim();
  const entries = enumerateEntries(sourceRepository);

  return {
    schemaVersion: 1,
    sourceRepository,
    sourceHead,
    dirtyDiffHash: createDirtyDiffHash(sourceHead, entries),
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    entries,
  };
}

function valueAfter(args: readonly string[], flag: string): string {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value) {
    throw new Error(`Missing required ${flag}`);
  }
  return value;
}

function runCli(): void {
  const source = valueAfter(process.argv.slice(2), "--source");
  const output = resolve(valueAfter(process.argv.slice(2), "--output"));
  const manifest = createFreezeManifest({ source });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`Legacy freeze manifest generated with ${manifest.entries.length} path facts.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runCli();
}
