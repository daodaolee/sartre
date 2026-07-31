import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";

export const EXPECTED_WORKSPACES = [
  "apps/electron-app",
  "apps/hub-api",
  "apps/hub-worker",
  "apps/local-runtime",
  "packages/contracts",
  "packages/domain",
  "packages/runtime-core",
  "packages/sdk",
] as const;

export const REQUIRED_ROOT_SCRIPTS = [
  "toolchain:check",
  "format:check",
  "lint",
  "typecheck",
  "test",
  "build",
  "architecture:check",
  "secret:check",
  "secret:artifacts",
  "docker-context:check",
  "sast",
  "dependency:check",
  "license:check",
  "openspec:validate",
  "contract:compatibility",
  "pg:verify",
  "migrate",
  "health:smoke",
  "ops:trace-correlation",
  "package:mac:arm64",
  "harness:ms0",
  "verify:ms0",
  "prepack",
] as const;

type RepositoryPolicyCode =
  | "missing_file"
  | "root_must_be_private"
  | "root_script_missing"
  | "root_packaging_not_prohibited"
  | "ignore_rule_missing"
  | "dockerignore_negation_unsafe"
  | "workspace_config_missing"
  | "workspace_config_drift"
  | "workspace_unexpected"
  | "workspace_missing"
  | "workspace_script_missing";

export type RepositoryPolicyViolation = {
  readonly code: RepositoryPolicyCode;
  readonly path: string;
  readonly detail: string;
};

const requiredWorkspaceScripts = ["typecheck", "test", "build"] as const;
const canonicalPnpmWorkspace = `packages:
  - "apps/*"
  - "packages/*"

allowBuilds:
  electron: true
  esbuild: true

onlyBuiltDependencies:
  - electron
  - esbuild

overrides:
  brace-expansion: 5.0.8
  tar: 7.5.21
`;
const requiredIgnoreRules = [
  ".local-secrets/",
  "node_modules/",
  "dist/",
  "out/",
  "coverage/",
  "reports/**/raw/",
  ".env",
  ".env.*",
  "*.pem",
  "*.key",
  "*.tgz",
  "*.dmg",
  "*.zip",
  "*.asar",
] as const;

function readJson(path: string): Record<string, unknown> | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

function scriptsOf(manifest: Record<string, unknown>): Record<string, string> {
  const scripts = manifest.scripts;
  if (!scripts || typeof scripts !== "object" || Array.isArray(scripts)) {
    return {};
  }
  return Object.fromEntries(
    Object.entries(scripts).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}

function normalizeIgnoreRule(rule: string): string {
  return rule.trim().replace(/^\//u, "");
}

function validateIgnoreFile(root: string, path: ".gitignore") {
  const absolutePath = join(root, path);
  if (!existsSync(absolutePath)) {
    return [{ code: "missing_file" as const, path, detail: path }];
  }
  const rules = new Set(
    readFileSync(absolutePath, "utf8").split(/\r?\n/u).map(normalizeIgnoreRule).filter(Boolean),
  );
  return requiredIgnoreRules
    .filter((rule) => !rules.has(normalizeIgnoreRule(rule)))
    .map((rule) => ({ code: "ignore_rule_missing" as const, path, detail: rule }));
}

export function validateDockerContextPolicy(root: string): RepositoryPolicyViolation[] {
  const path = ".dockerignore" as const;
  const absolutePath = join(root, path);
  let content: string;
  try {
    const stat = lstatSync(absolutePath);
    const canonicalRoot = realpathSync(root);
    const canonicalPath = realpathSync(absolutePath);
    if (!stat.isFile() || !isContainedPath(canonicalRoot, canonicalPath)) {
      return [{ code: "missing_file", path, detail: path }];
    }
    content = readFileSync(canonicalPath, "utf8");
  } catch {
    return [{ code: "missing_file", path, detail: path }];
  }

  const activeRules = content
    .split(/\r?\n/u)
    .map((line, index) => ({ line: index + 1, rule: line.trim() }))
    .filter(({ rule }) => rule.length > 0 && !rule.startsWith("#"));
  const rules = new Set(
    activeRules
      .filter(({ rule }) => !rule.startsWith("!"))
      .map(({ rule }) => normalizeIgnoreRule(rule)),
  );
  const violations: RepositoryPolicyViolation[] = requiredIgnoreRules
    .filter((rule) => !rules.has(normalizeIgnoreRule(rule)))
    .map((rule) => ({ code: "ignore_rule_missing", path, detail: rule }));
  violations.push(
    ...activeRules
      .filter(({ rule }) => rule.startsWith("!"))
      .map(({ line }) => ({
        code: "dockerignore_negation_unsafe" as const,
        path,
        detail: `line:${line}`,
      })),
  );
  return violations;
}

function validatePnpmWorkspacePolicy(root: string): RepositoryPolicyViolation[] {
  const path = "pnpm-workspace.yaml" as const;
  const absolutePath = join(root, path);
  let content: string;
  try {
    const stat = lstatSync(absolutePath);
    const canonicalRoot = realpathSync(root);
    const canonicalPath = realpathSync(absolutePath);
    if (!stat.isFile() || !isContainedPath(canonicalRoot, canonicalPath)) {
      return [{ code: "workspace_config_missing", path, detail: path }];
    }
    content = readFileSync(canonicalPath, "utf8");
  } catch {
    return [{ code: "workspace_config_missing", path, detail: path }];
  }

  return content === canonicalPnpmWorkspace
    ? []
    : [{ code: "workspace_config_drift", path, detail: "canonical_content" }];
}

type WorkspaceInventory = {
  readonly roots: string[];
  readonly unsafeSymlinks: string[];
  readonly safeManifests: ReadonlyMap<string, string>;
};

function enumerateWorkspaceRoots(root: string): WorkspaceInventory {
  const workspaces: string[] = [];
  const unsafeSymlinks: string[] = [];
  const safeManifests = new Map<string, string>();
  const canonicalRoot = realpathSync(root);
  for (const group of ["apps", "packages"] as const) {
    const groupPath = join(root, group);
    if (!isSafeContainedDirectory(canonicalRoot, groupPath)) {
      continue;
    }
    for (const entry of readdirSync(groupPath, { withFileTypes: true })) {
      const workspace = `${group}/${entry.name}`;
      const workspacePath = join(groupPath, entry.name);
      if (entry.isSymbolicLink() || !isSafeContainedDirectory(canonicalRoot, workspacePath)) {
        unsafeSymlinks.push(workspace);
        continue;
      }
      if (!entry.isDirectory()) {
        continue;
      }
      const manifestPath = join(groupPath, entry.name, "package.json");
      let manifestStat: ReturnType<typeof lstatSync>;
      try {
        manifestStat = lstatSync(manifestPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          continue;
        }
        unsafeSymlinks.push(workspace);
        continue;
      }
      if (manifestStat.isSymbolicLink()) {
        unsafeSymlinks.push(workspace);
      } else if (manifestStat.isFile() && isSafeContainedPath(canonicalRoot, manifestPath)) {
        workspaces.push(workspace);
        safeManifests.set(workspace, realpathSync(manifestPath));
      } else {
        unsafeSymlinks.push(workspace);
      }
    }
  }
  return {
    roots: workspaces.sort((left, right) => left.localeCompare(right)),
    unsafeSymlinks: unsafeSymlinks.sort((left, right) => left.localeCompare(right)),
    safeManifests,
  };
}

function isContainedPath(root: string, path: string): boolean {
  const rootRelativePath = relative(root, path);
  return (
    rootRelativePath === "" ||
    (!isAbsolute(rootRelativePath) &&
      rootRelativePath !== ".." &&
      !rootRelativePath.startsWith(`..${sep}`))
  );
}

function isSafeContainedPath(canonicalRoot: string, path: string): boolean {
  try {
    return isContainedPath(canonicalRoot, realpathSync(path));
  } catch {
    return false;
  }
}

function isSafeContainedDirectory(canonicalRoot: string, path: string): boolean {
  try {
    return lstatSync(path).isDirectory() && isSafeContainedPath(canonicalRoot, path);
  } catch {
    return false;
  }
}

export function validateRepositoryPolicy(root: string): RepositoryPolicyViolation[] {
  const rootManifestPath = join(root, "package.json");
  const rootManifest = readJson(rootManifestPath);
  if (!rootManifest) {
    return [{ code: "missing_file", path: "package.json", detail: "package.json" }];
  }

  const violations: RepositoryPolicyViolation[] = [];
  const rootScripts = scriptsOf(rootManifest);
  if (rootManifest.private !== true) {
    violations.push({ code: "root_must_be_private", path: "package.json", detail: "private" });
  }
  for (const script of REQUIRED_ROOT_SCRIPTS) {
    if (!rootScripts[script]) {
      violations.push({ code: "root_script_missing", path: "package.json", detail: script });
    }
  }
  if (!rootScripts.prepack?.includes("forbid-root-pack")) {
    violations.push({
      code: "root_packaging_not_prohibited",
      path: "package.json",
      detail: "prepack",
    });
  }

  violations.push(...validateIgnoreFile(root, ".gitignore"));
  violations.push(...validateDockerContextPolicy(root));
  violations.push(...validatePnpmWorkspacePolicy(root));

  const inventory = enumerateWorkspaceRoots(root);
  const actualWorkspaces = new Set(inventory.roots);
  const expectedWorkspaces = new Set<string>(EXPECTED_WORKSPACES);
  for (const workspace of inventory.unsafeSymlinks) {
    if (!expectedWorkspaces.has(workspace)) {
      violations.push({
        code: "workspace_unexpected",
        path: `${workspace}/package.json`,
        detail: workspace,
      });
    }
  }
  for (const workspace of actualWorkspaces) {
    if (!expectedWorkspaces.has(workspace)) {
      violations.push({
        code: "workspace_unexpected",
        path: `${workspace}/package.json`,
        detail: workspace,
      });
    }
  }
  for (const workspace of EXPECTED_WORKSPACES) {
    if (!actualWorkspaces.has(workspace)) {
      violations.push({
        code: "workspace_missing",
        path: `${workspace}/package.json`,
        detail: workspace,
      });
    }
  }

  for (const workspace of EXPECTED_WORKSPACES) {
    const path = `${workspace}/package.json`;
    const safeManifestPath = inventory.safeManifests.get(workspace);
    const manifest = safeManifestPath ? readJson(safeManifestPath) : undefined;
    if (!manifest) {
      for (const script of requiredWorkspaceScripts) {
        violations.push({ code: "workspace_script_missing", path, detail: script });
      }
      continue;
    }
    const scripts = scriptsOf(manifest);
    for (const script of requiredWorkspaceScripts) {
      if (!scripts[script]) {
        violations.push({ code: "workspace_script_missing", path, detail: script });
      }
    }
  }

  return violations;
}
