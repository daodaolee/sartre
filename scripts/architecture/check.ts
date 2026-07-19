import {
  type Dirent,
  lstatSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  realpathSync,
} from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { valid, validRange } from "semver";
import ts from "typescript";
import { scanTextForSecrets } from "../constitution/secret-boundary.js";
import { type LoadedTsConfig, loadTsConfig } from "./config-resolution.js";
import {
  type ArchitectureViolation,
  createTargetModules,
  dependencyRule,
  isContained,
  portable,
  type TargetModule,
  textLine,
  uniqueSorted,
  violation,
} from "./model.js";
import { analyzeSourceFile } from "./source-analysis.js";
import { isTargetSourceFile } from "./source-policy.js";

export type { ArchitectureViolation } from "./model.js";

type Manifest = {
  readonly content: string;
  readonly value: Record<string, unknown>;
};

type TextTarget = {
  readonly file: string;
  readonly content: string;
};

type InventoryResult = {
  readonly violations: readonly ArchitectureViolation[];
  readonly safeModuleRoots: ReadonlyMap<TargetModule, string>;
};

type ManifestDependencyAnalysis = {
  readonly violations: readonly ArchitectureViolation[];
  readonly declaredIdentities: ReadonlyMap<TargetModule, ReadonlyMap<string, string>>;
};

type ManifestExportAnalysis = {
  readonly violations: readonly ArchitectureViolation[];
  readonly exposedKeys: ReadonlyMap<TargetModule, ReadonlySet<string>>;
};

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".json",
  ".jsonc",
  ".scss",
  ".sh",
  ".toml",
  ".yaml",
  ".yml",
]);
const MAX_TEXT_BYTES = 4 * 1024 * 1024;
const BUILD_FILE_NAME = /^(?:Dockerfile|Containerfile|Makefile)(?:[._-].*)?$/u;

function regularContainedFile(repositoryRoot: string, moduleRoot: string, path: string): boolean {
  try {
    const stat = lstatSync(path);
    const canonicalPath = realpathSync(path);
    return (
      stat.isFile() &&
      !stat.isSymbolicLink() &&
      isContained(realpathSync(repositoryRoot), canonicalPath) &&
      isContained(realpathSync(moduleRoot), canonicalPath)
    );
  } catch {
    return false;
  }
}

function verifiedDirectory(canonicalRepositoryRoot: string, path: string): string | undefined {
  try {
    const stat = lstatSync(path);
    const canonicalPath = realpathSync(path);
    return stat.isDirectory() &&
      !stat.isSymbolicLink() &&
      isContained(canonicalRepositoryRoot, canonicalPath)
      ? canonicalPath
      : undefined;
  } catch {
    return undefined;
  }
}

function inventoryViolations(
  repositoryRoot: string,
  modules: readonly TargetModule[],
): InventoryResult {
  const violations: ArchitectureViolation[] = [];
  const safeModuleRoots = new Map<TargetModule, string>();
  const expectedRoots = new Set(modules.map((module) => module.root));
  const safeContainers = new Map<"apps" | "packages", string>();
  let canonicalRepositoryRoot: string;
  try {
    canonicalRepositoryRoot = realpathSync(repositoryRoot);
  } catch {
    return {
      violations: [violation(repositoryRoot, "module_inventory_unreadable", repositoryRoot)],
      safeModuleRoots,
    };
  }
  for (const container of ["apps", "packages"] as const) {
    const containerPath = join(repositoryRoot, container);
    const canonicalContainer = verifiedDirectory(canonicalRepositoryRoot, containerPath);
    if (!canonicalContainer) {
      violations.push(violation(repositoryRoot, "module_inventory_unreadable", containerPath));
      continue;
    }
    let entries: Dirent<string>[];
    try {
      entries = readdirSync(containerPath, { withFileTypes: true, encoding: "utf8" });
    } catch {
      violations.push(violation(repositoryRoot, "module_inventory_unreadable", containerPath));
      continue;
    }
    safeContainers.set(container, canonicalContainer);
    for (const entry of entries) {
      if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
      const entryPath = join(containerPath, entry.name);
      if (!expectedRoots.has(resolve(entryPath))) {
        violations.push(violation(repositoryRoot, "module_inventory_extra", entryPath));
      }
    }
  }

  for (const module of modules) {
    const container = module.id.startsWith("apps/") ? "apps" : "packages";
    const canonicalContainer = safeContainers.get(container);
    const canonicalModuleRoot = canonicalContainer
      ? verifiedDirectory(canonicalRepositoryRoot, module.root)
      : undefined;
    if (
      !canonicalContainer ||
      !canonicalModuleRoot ||
      !isContained(canonicalContainer, canonicalModuleRoot)
    ) {
      violations.push(violation(repositoryRoot, "module_inventory_missing", module.root));
      continue;
    }
    safeModuleRoots.set(module, canonicalModuleRoot);
  }
  return { violations, safeModuleRoots };
}

function readManifests(
  repositoryRoot: string,
  modules: readonly TargetModule[],
  violations: ArchitectureViolation[],
): Map<TargetModule, Manifest> {
  const manifests = new Map<TargetModule, Manifest>();
  for (const module of modules) {
    const path = join(module.root, "package.json");
    if (!regularContainedFile(repositoryRoot, module.root, path)) {
      violations.push(violation(repositoryRoot, "module_manifest_missing", path));
      continue;
    }
    let content: string;
    let value: unknown;
    try {
      content = readFileSync(path, "utf8");
      value = JSON.parse(content) as unknown;
    } catch {
      violations.push(violation(repositoryRoot, "module_manifest_invalid", path));
      continue;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      violations.push(violation(repositoryRoot, "module_manifest_invalid", path));
      continue;
    }
    const manifest = value as Record<string, unknown>;
    if (manifest.name !== module.packageName) {
      violations.push(
        violation(
          repositoryRoot,
          "module_package_identity_invalid",
          path,
          textLine(content, '"name"'),
        ),
      );
    }
    manifests.set(module, { content, value: manifest });
  }
  return manifests;
}

type ExportTargetResult = {
  readonly valid: boolean;
  readonly exposed: boolean;
};

function exportTargetResult(value: unknown): ExportTargetResult {
  if (typeof value === "string") return { valid: true, exposed: true };
  if (value === null) return { valid: true, exposed: false };
  if (Array.isArray(value)) {
    const results = value.map(exportTargetResult);
    return {
      valid: results.every((result) => result.valid),
      exposed: results.some((result) => result.exposed),
    };
  }
  if (!value || typeof value !== "object") return { valid: false, exposed: false };
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.some(([condition]) => condition.startsWith("."))) {
    return { valid: false, exposed: false };
  }
  const results = entries.map(([, target]) => exportTargetResult(target));
  return {
    valid: results.every((result) => result.valid),
    exposed: results.some((result) => result.exposed),
  };
}

function isExactExportKey(key: string): boolean {
  if (key === ".") return true;
  if (!key.startsWith("./") || key.includes("*")) return false;
  const segments = key.slice(2).split("/");
  return segments.every(
    (segment) =>
      segment.length > 0 && segment !== "." && segment !== ".." && !segment.includes("\\"),
  );
}

function exposedExportKeys(value: unknown): {
  readonly valid: boolean;
  readonly keys: Set<string>;
} {
  const keys = new Set<string>();
  if (value === undefined || value === null) return { valid: true, keys };
  if (typeof value === "string" || Array.isArray(value)) {
    const result = exportTargetResult(value);
    if (result.exposed) keys.add(".");
    return { valid: result.valid, keys };
  }
  if (typeof value !== "object") return { valid: false, keys };

  const entries = Object.entries(value as Record<string, unknown>);
  const dottedCount = entries.filter(([key]) => key.startsWith(".")).length;
  if (dottedCount === 0) {
    const result = exportTargetResult(value);
    if (result.exposed) keys.add(".");
    return { valid: result.valid, keys };
  }
  if (dottedCount !== entries.length) return { valid: false, keys };

  for (const [key, target] of entries) {
    const result = exportTargetResult(target);
    if (!isExactExportKey(key) || !result.valid) return { valid: false, keys: new Set() };
    if (result.exposed) keys.add(key);
  }
  return { valid: true, keys };
}

function manifestExportAnalysis(
  repositoryRoot: string,
  manifests: ReadonlyMap<TargetModule, Manifest>,
): ManifestExportAnalysis {
  const violations: ArchitectureViolation[] = [];
  const exposedKeys = new Map<TargetModule, ReadonlySet<string>>();
  for (const [module, manifest] of manifests) {
    const analysis = exposedExportKeys(manifest.value.exports);
    exposedKeys.set(module, analysis.valid ? analysis.keys : new Set());
    if (!analysis.valid) {
      violations.push(
        violation(
          repositoryRoot,
          "manifest_exports_invalid",
          join(module.root, "package.json"),
          textLine(manifest.content, '"exports"'),
        ),
      );
    }
  }
  return { violations, exposedKeys };
}

const EXACT_PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u;
const URL_LIKE_SELECTOR = /^[A-Za-z][A-Za-z0-9+.-]*:/u;
const DIST_TAG_SELECTOR = /^[A-Za-z][A-Za-z0-9._-]*$/u;

function isExactPackageName(value: string): boolean {
  return EXACT_PACKAGE_NAME.test(value);
}

function moduleForExactPackageName(
  modules: readonly TargetModule[],
  packageName: string,
): TargetModule | undefined {
  return modules.find((module) => module.packageName === packageName);
}

function isVersionSelector(value: string): boolean {
  if (
    value.trim().length === 0 ||
    value === "^" ||
    value === "~" ||
    URL_LIKE_SELECTOR.test(value)
  ) {
    return false;
  }
  if (valid(value) !== null) return true;
  const range = validRange(value);
  if (DIST_TAG_SELECTOR.test(value) && range === null) return false;
  return range !== null;
}

function isWorkspaceSelector(value: string): boolean {
  return value === "^" || value === "~" || isVersionSelector(value);
}

function aliasedPackageIdentity(
  payload: string,
  selectorIsValid: (selector: string) => boolean,
): string | undefined {
  const versionSeparator = payload.lastIndexOf("@");
  if (versionSeparator <= 0) return undefined;
  const packageName = payload.slice(0, versionSeparator);
  const selector = payload.slice(versionSeparator + 1);
  return isExactPackageName(packageName) && selectorIsValid(selector) ? packageName : undefined;
}

function manifestDependencyTarget(args: {
  readonly repositoryRoot: string;
  readonly modules: readonly TargetModule[];
  readonly manifests: ReadonlyMap<TargetModule, Manifest>;
  readonly module: TargetModule;
  readonly name: string;
  readonly value: string;
}): {
  readonly target: TargetModule | undefined;
  readonly actualIdentity: string | undefined;
  readonly outsideGraph: boolean;
} {
  const keyTarget = moduleForExactPackageName(args.modules, args.name);
  if (args.value.startsWith("npm:")) {
    const identity = aliasedPackageIdentity(args.value.slice("npm:".length), isVersionSelector);
    if (!identity) return { target: undefined, actualIdentity: undefined, outsideGraph: true };
    const target = moduleForExactPackageName(args.modules, identity);
    return {
      target,
      actualIdentity: identity,
      outsideGraph:
        (identity.startsWith("@sartre/") && !target) ||
        (keyTarget !== undefined && target?.id !== keyTarget.id),
    };
  }
  if (args.value.startsWith("workspace:")) {
    const payload = args.value.slice("workspace:".length);
    if (!payload) return { target: undefined, actualIdentity: undefined, outsideGraph: true };
    if (payload.includes("@")) {
      const identity = aliasedPackageIdentity(payload, isWorkspaceSelector);
      const target = identity ? moduleForExactPackageName(args.modules, identity) : undefined;
      return {
        target,
        actualIdentity: identity,
        outsideGraph: !target || (keyTarget !== undefined && target.id !== keyTarget.id),
      };
    }
    return isWorkspaceSelector(payload)
      ? { target: keyTarget, actualIdentity: args.name, outsideGraph: !keyTarget }
      : { target: undefined, actualIdentity: undefined, outsideGraph: true };
  }
  if (args.value.startsWith("file:") || args.value.startsWith("link:")) {
    const payload = args.value.slice(args.value.indexOf(":") + 1);
    if (!payload) return { target: undefined, actualIdentity: undefined, outsideGraph: true };
    const path = resolve(args.module.root, payload);
    const target = args.modules.find((candidate) => candidate.root === path);
    const hasCanonicalIdentity =
      target && args.manifests.get(target)?.value.name === target.packageName;
    return {
      target: hasCanonicalIdentity ? target : undefined,
      actualIdentity: hasCanonicalIdentity ? target.packageName : undefined,
      outsideGraph:
        !isContained(args.repositoryRoot, path) ||
        !target ||
        !hasCanonicalIdentity ||
        (keyTarget !== undefined && target.id !== keyTarget.id),
    };
  }
  if (!isVersionSelector(args.value)) {
    return { target: undefined, actualIdentity: undefined, outsideGraph: true };
  }
  return {
    target: keyTarget,
    actualIdentity: args.name,
    outsideGraph: args.name.startsWith("@sartre/") && !keyTarget,
  };
}

function manifestDependencyViolations(
  repositoryRoot: string,
  modules: readonly TargetModule[],
  manifests: ReadonlyMap<TargetModule, Manifest>,
): ManifestDependencyAnalysis {
  const violations: ArchitectureViolation[] = [];
  const declaredIdentities = new Map<TargetModule, Map<string, string>>();
  for (const module of modules) {
    const manifest = manifests.get(module);
    if (!manifest) continue;
    const path = join(module.root, "package.json");
    const dependencyLines = manifestDependencyLines(manifest.content);
    for (const field of DEPENDENCY_FIELDS) {
      const dependencies = manifest.value[field];
      if (dependencies === undefined) continue;
      if (!dependencies || typeof dependencies !== "object" || Array.isArray(dependencies)) {
        violations.push(
          violation(
            repositoryRoot,
            "manifest_dependency_invalid",
            path,
            textLine(manifest.content, `"${field}"`),
          ),
        );
        continue;
      }
      for (const [name, value] of Object.entries(dependencies)) {
        const line =
          dependencyLines.get(`${field}\0${name}`) ??
          textLine(manifest.content, JSON.stringify(name));
        if (typeof value !== "string" || !isExactPackageName(name)) {
          violations.push(violation(repositoryRoot, "manifest_dependency_invalid", path, line));
          continue;
        }
        const resolved = manifestDependencyTarget({
          repositoryRoot,
          modules,
          manifests,
          module,
          name,
          value,
        });
        if (resolved.outsideGraph) {
          if (resolved.target && dependencyRule(module, resolved.target)) {
            violations.push(
              violation(repositoryRoot, "manifest_dependency_direction_forbidden", path, line),
            );
          }
          violations.push(
            violation(repositoryRoot, "manifest_dependency_target_outside_graph", path, line),
          );
          continue;
        }
        if (resolved.actualIdentity) {
          const identities = declaredIdentities.get(module) ?? new Map<string, string>();
          identities.set(name, resolved.actualIdentity);
          declaredIdentities.set(module, identities);
        }
        if (module.id === "packages/domain" && resolved.target?.id !== "packages/domain") {
          violations.push(violation(repositoryRoot, "domain_dependency_forbidden", path, line));
          continue;
        }
        if (resolved.target && dependencyRule(module, resolved.target)) {
          violations.push(
            violation(repositoryRoot, "manifest_dependency_direction_forbidden", path, line),
          );
        }
      }
    }
  }
  return { violations, declaredIdentities };
}

function manifestDependencyLines(content: string): ReadonlyMap<string, number> {
  const lines = new Map<string, number>();
  const sourceFile = ts.parseJsonText("package.json", content);
  const statement = sourceFile.statements[0];
  if (
    !statement ||
    !ts.isExpressionStatement(statement) ||
    !ts.isObjectLiteralExpression(statement.expression)
  ) {
    return lines;
  }
  for (const section of statement.expression.properties) {
    if (
      !ts.isPropertyAssignment(section) ||
      !ts.isStringLiteralLike(section.name) ||
      !DEPENDENCY_FIELDS.includes(section.name.text as (typeof DEPENDENCY_FIELDS)[number]) ||
      !ts.isObjectLiteralExpression(section.initializer)
    ) {
      continue;
    }
    for (const property of section.initializer.properties) {
      if (!ts.isPropertyAssignment(property) || !ts.isStringLiteralLike(property.name)) continue;
      const line = sourceFile.getLineAndCharacterOfPosition(
        property.name.getStart(sourceFile),
      ).line;
      lines.set(`${section.name.text}\0${property.name.text}`, line + 1);
    }
  }
  return lines;
}

function readRootTestTooling(
  repositoryRoot: string,
  violations: ArchitectureViolation[],
): ReadonlyMap<string, string> {
  const path = join(repositoryRoot, "package.json");
  if (!regularContainedFile(repositoryRoot, repositoryRoot, path)) {
    violations.push(violation(repositoryRoot, "module_manifest_missing", path));
    return new Map();
  }
  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid");
    const devDependencies = (value as Record<string, unknown>).devDependencies;
    if (!devDependencies || typeof devDependencies !== "object" || Array.isArray(devDependencies)) {
      return new Map();
    }
    const identities = new Map<string, string>();
    for (const [name, selector] of Object.entries(devDependencies)) {
      if (!isExactPackageName(name) || typeof selector !== "string") continue;
      const actualIdentity = selector.startsWith("npm:")
        ? aliasedPackageIdentity(selector.slice("npm:".length), isVersionSelector)
        : isVersionSelector(selector)
          ? name
          : undefined;
      if (actualIdentity) identities.set(name, actualIdentity);
    }
    return identities;
  } catch {
    violations.push(violation(repositoryRoot, "module_manifest_invalid", path));
    return new Map();
  }
}

function isCandidateTextFile(name: string): boolean {
  return (
    isTargetSourceFile(name) ||
    TEXT_EXTENSIONS.has(extname(name)) ||
    BUILD_FILE_NAME.test(name) ||
    extname(name) === ""
  );
}

function decodeText(buffer: Buffer): string | undefined {
  if (buffer.includes(0)) return undefined;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return undefined;
  }
}

function collectModuleTextTargets(
  repositoryRoot: string,
  verifiedModuleRoot: string,
  violations: ArchitectureViolation[],
): TextTarget[] {
  const targets: TextTarget[] = [];
  const walk = (directory: string): void => {
    let entries: Dirent<string>[];
    try {
      entries = readdirSync(directory, { withFileTypes: true, encoding: "utf8" });
    } catch {
      violations.push(violation(repositoryRoot, "target_file_unreadable", directory));
      return;
    }
    for (const entry of entries) {
      if (["coverage", "node_modules"].includes(entry.name)) continue;
      const path = join(directory, entry.name);
      if (entry.name === ".local-secrets") {
        violations.push(violation(repositoryRoot, "forbidden_secret_path", path));
        continue;
      }
      if (entry.isSymbolicLink()) {
        let target = "";
        try {
          target = readlinkSync(path);
        } catch {
          // The path is rejected without reading target content.
        }
        violations.push(
          violation(
            repositoryRoot,
            target.includes(".local-secrets")
              ? "forbidden_secret_path"
              : "target_symlink_forbidden",
            path,
          ),
        );
        continue;
      }
      if (entry.isDirectory()) {
        walk(path);
        continue;
      }
      if (!entry.isFile() || !isCandidateTextFile(entry.name)) continue;
      if (!regularContainedFile(repositoryRoot, verifiedModuleRoot, path)) {
        violations.push(violation(repositoryRoot, "target_file_unreadable", path));
        continue;
      }
      let buffer: Buffer;
      try {
        const stat = lstatSync(path);
        if (stat.size > MAX_TEXT_BYTES) {
          violations.push(violation(repositoryRoot, "target_text_file_oversized", path));
          continue;
        }
        buffer = readFileSync(path);
      } catch {
        violations.push(violation(repositoryRoot, "target_file_unreadable", path));
        continue;
      }
      const content = decodeText(buffer);
      if (content !== undefined) targets.push({ file: path, content });
    }
  };
  walk(verifiedModuleRoot);
  return targets;
}

function firstSecretLine(path: string, content: string): number {
  const index = content
    .split(/\r?\n/u)
    .findIndex((line) => scanTextForSecrets(path, line).length > 0);
  return index < 0 ? 1 : index + 1;
}

function rawTextViolations(repositoryRoot: string, target: TextTarget): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  const repositoryPath = portable(relative(repositoryRoot, target.file));
  if (target.content.includes(".local-secrets")) {
    violations.push(
      violation(
        repositoryRoot,
        "forbidden_secret_path",
        target.file,
        textLine(target.content, ".local-secrets"),
      ),
    );
  }
  if (scanTextForSecrets(repositoryPath, target.content).length > 0) {
    violations.push(
      violation(
        repositoryRoot,
        "secret_literal_forbidden",
        target.file,
        firstSecretLine(repositoryPath, target.content),
      ),
    );
  }
  return violations;
}

export function checkArchitecture(repositoryRoot: string): ArchitectureViolation[] {
  const requestedRoot = resolve(repositoryRoot);
  let absoluteRoot: string;
  try {
    absoluteRoot = realpathSync(requestedRoot);
  } catch {
    return [violation(requestedRoot, "module_inventory_unreadable", requestedRoot)];
  }
  const modules = createTargetModules(absoluteRoot);
  const inventory = inventoryViolations(absoluteRoot, modules);
  const safeModules = modules.filter((module) => inventory.safeModuleRoots.has(module));
  const violations: ArchitectureViolation[] = [...inventory.violations];
  const manifests = readManifests(absoluteRoot, safeModules, violations);
  const exportsAnalysis = manifestExportAnalysis(absoluteRoot, manifests);
  violations.push(...exportsAnalysis.violations);
  const dependencyAnalysis = manifestDependencyViolations(absoluteRoot, modules, manifests);
  violations.push(...dependencyAnalysis.violations);
  const rootTestTooling = readRootTestTooling(absoluteRoot, violations);

  const rootConfig = loadTsConfig(
    absoluteRoot,
    modules,
    join(absoluteRoot, "tsconfig.base.json"),
    "root",
  );
  if (rootConfig) violations.push(...rootConfig.violations);

  const moduleConfigs = new Map<TargetModule, LoadedTsConfig>();
  for (const module of safeModules) {
    const config = loadTsConfig(
      absoluteRoot,
      modules,
      join(module.root, "tsconfig.json"),
      "module",
      module,
    );
    if (config) {
      moduleConfigs.set(module, config);
      violations.push(...config.violations);
    }
  }

  const electronModule = modules.find((module) => module.id === "apps/electron-app");
  if (!electronModule) {
    return uniqueSorted(violations);
  }
  for (const module of safeModules) {
    const config = moduleConfigs.get(module) ?? rootConfig;
    const verifiedModuleRoot = inventory.safeModuleRoots.get(module);
    if (!verifiedModuleRoot) continue;
    for (const target of collectModuleTextTargets(absoluteRoot, verifiedModuleRoot, violations)) {
      violations.push(...rawTextViolations(absoluteRoot, target));
      if (config && isTargetSourceFile(target.file)) {
        violations.push(
          ...analyzeSourceFile({
            repositoryRoot: absoluteRoot,
            modules,
            electronModule,
            sourceModule: module,
            file: target.file,
            content: target.content,
            config,
            declaredDependencies:
              dependencyAnalysis.declaredIdentities.get(module) ?? new Map<string, string>(),
            canonicalExportKeys: exportsAnalysis.exposedKeys,
            rootTestTooling,
          }),
        );
      }
    }
  }
  return uniqueSorted(violations);
}

function runCli(): void {
  const violations = checkArchitecture(process.cwd());
  if (violations.length === 0) {
    console.log("Architecture check passed.");
    return;
  }
  for (const candidate of violations) console.error(JSON.stringify(candidate));
  process.exitCode = 1;
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) runCli();
