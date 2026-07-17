import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { scanTextForSecrets } from "./secret-boundary.js";

export type ArtifactSecretViolation = {
  readonly code:
    | "artifact_path_missing"
    | "artifact_symlink_escape"
    | "forbidden_artifact_path"
    | "secret_artifact_violation";
  readonly path: string;
};

function outside(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return (
    path === ".." ||
    path.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) ||
    isAbsolute(path)
  );
}

function forbiddenArtifactPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/");
  const segments = normalized.split("/");
  const basename = segments.at(-1) ?? "";
  return (
    segments.includes(".local-secrets") ||
    segments.includes(".git") ||
    basename === ".env" ||
    (basename.startsWith(".env.") && basename !== ".env.example") ||
    basename === ".npmrc" ||
    /\.(?:pem|key|p12|pfx)$/iu.test(basename) ||
    /\/reports\/[^/]+\/raw(?:\/|$)/u.test(normalized)
  );
}

function scanOne(root: string, path: string): ArtifactSecretViolation[] {
  if (forbiddenArtifactPath(path)) {
    return [{ code: "forbidden_artifact_path", path }];
  }
  const stat = lstatSync(path);
  if (stat.isSymbolicLink()) {
    const target = readlinkSync(path);
    const resolvedTarget = resolve(dirname(path), target);
    if (outside(root, resolvedTarget)) {
      return [{ code: "artifact_symlink_escape", path }];
    }
    return scanTextForSecrets(path, target).map(() => ({
      code: "secret_artifact_violation" as const,
      path,
    }));
  }
  if (stat.isDirectory()) {
    return readdirSync(path)
      .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
      .flatMap((entry) => scanOne(root, join(path, entry)));
  }
  if (!stat.isFile()) {
    return [];
  }
  return scanTextForSecrets(path, readFileSync(path).toString("utf8")).map(() => ({
    code: "secret_artifact_violation" as const,
    path,
  }));
}

export function scanArtifactPaths(paths: readonly string[]): ArtifactSecretViolation[] {
  return paths.flatMap((requestedPath) => {
    const path = resolve(requestedPath);
    if (!existsSync(path)) {
      return [{ code: "artifact_path_missing" as const, path }];
    }
    const stat = lstatSync(path);
    const root = stat.isDirectory() ? path : dirname(path);
    return scanOne(root, path);
  });
}
