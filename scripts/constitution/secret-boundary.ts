import { execFileSync } from "node:child_process";
import { lstatSync, readFileSync, readlinkSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export type SecretViolation = {
  readonly ruleId: "secret-pattern" | "forbidden-path";
  readonly path: string;
};

type StagedIndexEntry = {
  readonly mode: string;
  readonly objectId: string;
  readonly path: string;
};

const literalSecretPatterns = [
  /\buk-sa-[A-Za-z0-9]{32,}\b/,
  /\b(?:AKIA|ASIA|AIDA|AROA|AIPA|ANPA|ANVA|AKID)[A-Z0-9]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/,
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
];

const credentialUrlPattern =
  /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|amqps?|mssql):\/\/[^:\s/@]+:([^@\s/]+)@/giu;
const bearerTokenPattern = /\bBearer[ \t]+([^\s"',;`]+)/giu;
const secretAssignmentPattern =
  /\b(?:SARTRE_(?:CODEX_[A-Z0-9_]+_API_KEY|COS_SECRET_(?:ID|KEY))|AWS_(?:SECRET_ACCESS_KEY|SESSION_TOKEN)|AZURE_(?:CLIENT_SECRET|STORAGE_KEY)|CLOUDFLARE_API_TOKEN|GITHUB_TOKEN|GOOGLE_API_KEY)\s*=\s*(?:"([^"\r\n]*)"|'([^'\r\n]*)'|([^\s#;\r\n]+))/gu;
const shellVariableReferencePattern = /^\$(?:[A-Za-z_][A-Za-z0-9_]*|\{[A-Za-z_][A-Za-z0-9_]*\})$/u;

function hasForbiddenPathSegment(path: string): boolean {
  return path.replaceAll("\\", "/").split("/").includes(".local-secrets");
}

function isContainedPath(root: string, path: string): boolean {
  const repositoryRelativePath = relative(root, path);
  return (
    repositoryRelativePath === "" ||
    (!isAbsolute(repositoryRelativePath) &&
      repositoryRelativePath !== ".." &&
      !repositoryRelativePath.startsWith(`..${sep}`))
  );
}

function isShellVariableReference(value: string): boolean {
  return shellVariableReferencePattern.test(value.trim());
}

function hasCredentialUrl(content: string): boolean {
  return [...content.matchAll(credentialUrlPattern)].some(
    (match) => !isShellVariableReference(match[1] ?? ""),
  );
}

function hasBearerToken(content: string): boolean {
  return [...content.matchAll(bearerTokenPattern)].some((match) => {
    const token = match[1] ?? "";
    return token.length >= 12 && !isShellVariableReference(token);
  });
}

function hasSecretAssignment(content: string): boolean {
  return [...content.matchAll(secretAssignmentPattern)].some((match) => {
    const value = match[1] ?? match[2] ?? match[3] ?? "";
    return value.length > 0 && !isShellVariableReference(value);
  });
}

function hasSecretPattern(content: string): boolean {
  return (
    literalSecretPatterns.some((pattern) => pattern.test(content)) ||
    hasCredentialUrl(content) ||
    hasBearerToken(content) ||
    hasSecretAssignment(content)
  );
}

export function scanTextForSecrets(path: string, content: string): SecretViolation[] {
  if (hasForbiddenPathSegment(path)) {
    return [{ ruleId: "forbidden-path", path }];
  }

  return hasSecretPattern(content) ? [{ ruleId: "secret-pattern", path }] : [];
}

function scanSymlink(
  repositoryRoot: string,
  repositoryPath: string,
  target: string,
): SecretViolation[] {
  if (
    hasForbiddenPathSegment(target) ||
    !hasSafeSymlinkResolution(repositoryRoot, repositoryPath, target)
  ) {
    return [{ ruleId: "forbidden-path", path: repositoryPath }];
  }

  return scanTextForSecrets(repositoryPath, target);
}

function hasSafeSymlinkResolution(
  repositoryRoot: string,
  repositoryPath: string,
  target: string,
): boolean {
  return resolvePathMetadata(
    repositoryRoot,
    dirname(join(repositoryRoot, repositoryPath)),
    target,
    new Set(),
    { intermediateExpanded: false },
    0,
  );
}

type PathResolutionState = {
  readonly intermediateExpanded: boolean;
};

function resolvePathMetadata(
  repositoryRoot: string,
  base: string,
  target: string,
  visitedSymlinks: Set<string>,
  state: PathResolutionState,
  depth: number,
): boolean {
  if (depth > 40 || hasForbiddenPathSegment(target)) {
    return false;
  }

  const portableRoot = repositoryRoot.replaceAll("\\", "/");
  const portableTarget = target.replaceAll("\\", "/");
  let current: string;
  let segments: string[];
  if (isAbsolute(target)) {
    if (portableTarget === portableRoot) {
      current = repositoryRoot;
      segments = [];
    } else if (portableTarget.startsWith(`${portableRoot}/`)) {
      current = repositoryRoot;
      segments = portableTarget.slice(portableRoot.length + 1).split("/");
    } else {
      return false;
    }
  } else {
    current = base;
    segments = portableTarget.split("/");
  }

  if (!isContainedPath(repositoryRoot, current) || hasForbiddenPathSegment(current)) {
    return false;
  }

  let currentIsDirectory = true;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (!segment || segment === ".") {
      continue;
    }
    if (!currentIsDirectory) {
      return false;
    }
    if (segment === "..") {
      current = dirname(current);
      if (!isContainedPath(repositoryRoot, current) || hasForbiddenPathSegment(current)) {
        return false;
      }
      continue;
    }

    const next = join(current, segment);
    if (!isContainedPath(repositoryRoot, next) || hasForbiddenPathSegment(next)) {
      return false;
    }

    let stat: ReturnType<typeof lstatSync>;
    try {
      stat = lstatSync(next);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        return false;
      }
      const unresolvedSegments = segments.slice(index);
      if (
        unresolvedSegments.includes("..") ||
        (state.intermediateExpanded && unresolvedSegments.length > 1)
      ) {
        return false;
      }
      const unresolvedPath = resolve(current, ...unresolvedSegments);
      return (
        isContainedPath(repositoryRoot, unresolvedPath) && !hasForbiddenPathSegment(unresolvedPath)
      );
    }

    if (stat.isSymbolicLink()) {
      if (visitedSymlinks.has(next)) {
        return false;
      }
      visitedSymlinks.add(next);
      let linkTarget: string;
      try {
        linkTarget = readlinkSync(next);
      } catch {
        return false;
      }
      const remaining = segments.slice(index + 1).join("/");
      const combinedTarget = remaining ? `${linkTarget}/${remaining}` : linkTarget;
      return resolvePathMetadata(
        repositoryRoot,
        dirname(next),
        combinedTarget,
        visitedSymlinks,
        { intermediateExpanded: true },
        depth + 1,
      );
    }

    current = next;
    currentIsDirectory = stat.isDirectory();
  }

  return true;
}

function listStagedIndexEntries(repositoryRoot: string): StagedIndexEntry[] {
  const output = execFileSync("git", ["ls-files", "--cached", "--stage", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  });

  return output
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const separator = record.indexOf("\t");
      if (separator < 0) {
        throw new Error("Unexpected git ls-files --stage output");
      }

      const [mode, objectId] = record.slice(0, separator).split(" ");
      if (!mode || !objectId) {
        throw new Error("Incomplete git index entry");
      }

      return { mode, objectId, path: record.slice(separator + 1) };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function scanStagedIndex(repositoryRoot: string): SecretViolation[] {
  return listStagedIndexEntries(repositoryRoot).flatMap((entry) => {
    const forbiddenPathViolations = scanTextForSecrets(entry.path, "");
    if (forbiddenPathViolations.length > 0) {
      return forbiddenPathViolations;
    }

    if (entry.mode !== "120000" && !entry.mode.startsWith("100")) {
      return [];
    }

    const content = execFileSync("git", ["cat-file", "blob", entry.objectId], {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    });

    return entry.mode === "120000"
      ? scanSymlink(repositoryRoot, entry.path, content)
      : scanTextForSecrets(entry.path, content);
  });
}

function listUntrackedWorktreePaths(repositoryRoot: string): string[] {
  return execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
    cwd: repositoryRoot,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));
}

function scanUntrackedWorktree(repositoryRoot: string): SecretViolation[] {
  return listUntrackedWorktreePaths(repositoryRoot).flatMap((repositoryPath) =>
    scanWorktreePath(repositoryRoot, repositoryPath, true),
  );
}

function scanTrackedWorktree(repositoryRoot: string): SecretViolation[] {
  return listStagedIndexEntries(repositoryRoot).flatMap((entry) =>
    scanWorktreePath(repositoryRoot, entry.path, true),
  );
}

function scanWorktreePath(
  repositoryRoot: string,
  repositoryPath: string,
  skipMissing: boolean,
): SecretViolation[] {
  const result = readSafeWorktreePath(repositoryRoot, repositoryPath, skipMissing);
  if (result.kind === "unsafe") {
    return [{ ruleId: "forbidden-path", path: repositoryPath }];
  }
  if (result.kind === "missing") {
    return [];
  }
  return scanTextForSecrets(repositoryPath, result.content.toString("utf8"));
}

type SafeWorktreeReadResult =
  | { readonly kind: "safe"; readonly content: Buffer }
  | { readonly kind: "missing" }
  | { readonly kind: "unsafe" };

function readSafeWorktreePath(
  repositoryRoot: string,
  repositoryPath: string,
  skipMissing: boolean,
): SafeWorktreeReadResult {
  const pathViolations = scanTextForSecrets(repositoryPath, "");
  if (pathViolations.length > 0) {
    return { kind: "unsafe" };
  }

  const absolutePath = resolve(repositoryRoot, repositoryPath);
  if (!isContainedPath(repositoryRoot, absolutePath)) {
    return { kind: "unsafe" };
  }

  let stat: ReturnType<typeof lstatSync>;
  try {
    stat = lstatSync(absolutePath);
  } catch (error) {
    if (skipMissing && (error as NodeJS.ErrnoException).code === "ENOENT") {
      return { kind: "missing" };
    }
    return { kind: "unsafe" };
  }

  if (stat.isSymbolicLink()) {
    try {
      const target = readlinkSync(absolutePath);
      return scanSymlink(repositoryRoot, repositoryPath, target).length === 0
        ? { kind: "safe", content: Buffer.from(target) }
        : { kind: "unsafe" };
    } catch {
      return { kind: "unsafe" };
    }
  }
  if (!stat.isFile()) {
    return { kind: "safe", content: Buffer.alloc(0) };
  }

  try {
    const containedRealPath = realpathSync(absolutePath);
    if (
      !isContainedPath(repositoryRoot, containedRealPath) ||
      hasForbiddenPathSegment(containedRealPath)
    ) {
      return { kind: "unsafe" };
    }
    return { kind: "safe", content: readFileSync(containedRealPath) };
  } catch {
    return { kind: "unsafe" };
  }
}

export function buildRepositoryWorktreeGitleaksInput(root: string): Buffer | undefined {
  const repositoryRoot = realpathSync(resolve(root));
  try {
    const chunks: Buffer[] = [];
    const trackedPaths = listStagedIndexEntries(repositoryRoot).map((entry) => entry.path);
    for (const repositoryPath of trackedPaths) {
      const result = readSafeWorktreePath(repositoryRoot, repositoryPath, true);
      if (result.kind === "unsafe") {
        return undefined;
      }
      if (result.kind === "safe") {
        chunks.push(...frameWorktreeContent("tracked", repositoryPath, result.content));
      }
    }

    for (const repositoryPath of listUntrackedWorktreePaths(repositoryRoot)) {
      const result = readSafeWorktreePath(repositoryRoot, repositoryPath, false);
      if (result.kind !== "safe") {
        return undefined;
      }
      chunks.push(...frameWorktreeContent("untracked", repositoryPath, result.content));
    }
    return Buffer.concat(chunks);
  } catch {
    return undefined;
  }
}

function frameWorktreeContent(
  kind: "tracked" | "untracked",
  repositoryPath: string,
  content: Buffer,
): Buffer[] {
  const path = Buffer.from(repositoryPath);
  return [
    Buffer.from(`\nSARTRE_WORKTREE_${kind.toUpperCase()}:${path.length}:${content.length}\n`),
    path,
    Buffer.from("\n"),
    content,
  ];
}

export function scanRepositorySecrets(root: string): SecretViolation[] {
  const repositoryRoot = realpathSync(resolve(root));
  const violations = [
    ...scanStagedIndex(repositoryRoot),
    ...scanTrackedWorktree(repositoryRoot),
    ...scanUntrackedWorktree(repositoryRoot),
  ];

  return violations.filter(
    (violation, index) =>
      violations.findIndex(
        (candidate) => candidate.ruleId === violation.ruleId && candidate.path === violation.path,
      ) === index,
  );
}

export function scanRepositoryIndexSecrets(root: string): SecretViolation[] {
  return scanStagedIndex(realpathSync(resolve(root)));
}
