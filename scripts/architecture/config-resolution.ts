import { type Dirent, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import ts from "typescript";
import {
  type ArchitectureViolation,
  dependencyRule,
  isContained,
  moduleForPath,
  type TargetModule,
  textLine,
  violation,
} from "./model.js";

type ConfigKind = "root" | "module";

type PathEntry = {
  readonly alias: string;
  readonly targets: readonly string[];
  readonly configPath: string;
  readonly content: string;
  readonly baseDirectory: string;
};

type ConfigChainResult = {
  readonly pathEntries: readonly PathEntry[];
  readonly hasPaths: boolean;
  readonly baseDirectory: string | undefined;
};

const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:[\\/]/u;
const URL_LIKE_PATH = /^[A-Za-z][A-Za-z0-9+.-]*:/u;
const UNSUPPORTED_GLOB_ESCAPE = /[[\]{}\\]/u;
const GLOB_MAGIC = /[*?]/u;
const PREFLIGHT_SKIP_DIRECTORIES = new Set([
  ".git",
  ".local-secrets",
  "coverage",
  "dist",
  "node_modules",
  "out",
]);

export type LoadedTsConfig = {
  readonly path: string;
  readonly parsed: ts.ParsedCommandLine;
  readonly pathEntries: readonly PathEntry[];
  readonly violations: readonly ArchitectureViolation[];
  readonly resolutionHost: ts.ModuleResolutionHost;
};

function configRule(kind: ConfigKind, suffix: "missing" | "invalid"): string {
  return `${kind}_tsconfig_${suffix}`;
}

function regularContainedFile(repositoryRoot: string, path: string): boolean {
  try {
    const stat = lstatSync(path);
    return (
      stat.isFile() &&
      !stat.isSymbolicLink() &&
      isContained(realpathSync(repositoryRoot), realpathSync(path))
    );
  } catch {
    return false;
  }
}

function resolveExtends(configPath: string, extended: string): string | undefined {
  if (!extended.startsWith(".") && !isAbsolute(extended)) return undefined;
  const candidate = resolve(dirname(configPath), extended);
  return extname(candidate) ? candidate : `${candidate}.json`;
}

type PathMetadataStatus = "safe-existing" | "safe-missing" | "unsafe";

function pathMetadataStatus(args: {
  readonly repositoryRoot: string;
  readonly baseDirectory: string;
  readonly value: string;
  readonly allowGlob: boolean;
}): PathMetadataStatus {
  const lexicalRepositoryRoot = resolve(args.repositoryRoot);
  const lexicalBaseDirectory = resolve(args.baseDirectory);
  if (!isContained(lexicalRepositoryRoot, lexicalBaseDirectory)) return "unsafe";

  let canonicalRepositoryRoot: string;
  try {
    const rootStat = lstatSync(lexicalRepositoryRoot);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) return "unsafe";
    canonicalRepositoryRoot = realpathSync(lexicalRepositoryRoot);
  } catch {
    return "unsafe";
  }

  let candidate = lexicalRepositoryRoot;
  const baseSegments = relative(lexicalRepositoryRoot, lexicalBaseDirectory)
    .split(/[\\/]/u)
    .filter(Boolean);
  for (const segment of baseSegments) {
    candidate = join(candidate, segment);
    try {
      const stat = lstatSync(candidate);
      if (stat.isSymbolicLink()) return "unsafe";
      if (!isContained(canonicalRepositoryRoot, realpathSync(candidate))) return "unsafe";
    } catch {
      return "unsafe";
    }
  }

  const valueSegments = args.value.split("/").filter((segment) => segment.length > 0);
  if (args.allowGlob && valueSegments.includes("..")) return "unsafe";
  let missing = false;
  for (const segment of valueSegments) {
    if (segment === ".") continue;
    if (segment === "..") {
      if (missing) return "unsafe";
      candidate = dirname(candidate);
      if (!isContained(lexicalRepositoryRoot, candidate)) return "unsafe";
    } else if (GLOB_MAGIC.test(segment)) {
      return missing ? "safe-missing" : "safe-existing";
    } else {
      candidate = join(candidate, segment);
    }

    if (missing) continue;
    try {
      const stat = lstatSync(candidate);
      if (stat.isSymbolicLink()) return "unsafe";
      if (!isContained(canonicalRepositoryRoot, realpathSync(candidate))) return "unsafe";
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        missing = true;
        continue;
      }
      return "unsafe";
    }
  }
  return missing ? "safe-missing" : "safe-existing";
}

function configPathIsSafe(args: {
  readonly repositoryRoot: string;
  readonly configPath: string;
  readonly baseDirectory?: string;
  readonly value: string;
  readonly allowGlob: boolean;
}): boolean {
  if (
    args.value.length === 0 ||
    isAbsolute(args.value) ||
    WINDOWS_ABSOLUTE_PATH.test(args.value) ||
    URL_LIKE_PATH.test(args.value) ||
    UNSUPPORTED_GLOB_ESCAPE.test(args.value)
  ) {
    return false;
  }
  if (!args.allowGlob && GLOB_MAGIC.test(args.value)) return false;
  return (
    pathMetadataStatus({
      repositoryRoot: args.repositoryRoot,
      baseDirectory: args.baseDirectory ?? dirname(args.configPath),
      value: args.value,
      allowGlob: args.allowGlob,
    }) !== "unsafe"
  );
}

function rawConfigPathViolations(
  repositoryRoot: string,
  configPath: string,
  content: string,
  raw: Record<string, unknown>,
): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  const reject = (field: string): void => {
    violations.push(
      violation(repositoryRoot, "tsconfig_unsafe_path", configPath, textLine(content, field)),
    );
  };
  const validateArray = (field: string, value: unknown, allowGlob: boolean): void => {
    if (value === undefined) return;
    if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) {
      reject(JSON.stringify(field));
      return;
    }
    for (const entry of value) {
      if (!configPathIsSafe({ repositoryRoot, configPath, value: entry, allowGlob })) {
        reject(JSON.stringify(entry));
      }
    }
  };

  validateArray("files", raw.files, false);
  validateArray("include", raw.include, true);
  validateArray("exclude", raw.exclude, true);

  const compilerOptions = raw.compilerOptions;
  if (compilerOptions !== undefined) {
    if (!compilerOptions || typeof compilerOptions !== "object" || Array.isArray(compilerOptions)) {
      reject('"compilerOptions"');
    } else {
      const options = compilerOptions as Record<string, unknown>;
      for (const field of ["baseUrl", "rootDir"] as const) {
        const value = options[field];
        if (
          value !== undefined &&
          (typeof value !== "string" ||
            !configPathIsSafe({ repositoryRoot, configPath, value, allowGlob: false }))
        ) {
          reject(JSON.stringify(field));
        }
      }
      validateArray("rootDirs", options.rootDirs, false);
      validateArray("typeRoots", options.typeRoots, false);
      const paths = options.paths;
      if (paths !== undefined) {
        if (!paths || typeof paths !== "object" || Array.isArray(paths)) {
          reject('"paths"');
        } else {
          for (const targets of Object.values(paths)) {
            if (!Array.isArray(targets) || !targets.every((target) => typeof target === "string")) {
              reject('"paths"');
              continue;
            }
            for (const target of targets) {
              if (
                !configPathIsSafe({
                  repositoryRoot,
                  configPath,
                  value: target,
                  allowGlob: true,
                })
              ) {
                reject(JSON.stringify(target));
              }
            }
          }
        }
      }
    }
  }

  if (raw.references !== undefined) {
    if (!Array.isArray(raw.references)) {
      reject('"references"');
    } else {
      for (const reference of raw.references) {
        const path =
          reference && typeof reference === "object" && !Array.isArray(reference)
            ? (reference as Record<string, unknown>).path
            : undefined;
        if (
          typeof path !== "string" ||
          !configPathIsSafe({ repositoryRoot, configPath, value: path, allowGlob: false })
        ) {
          reject(typeof path === "string" ? JSON.stringify(path) : '"references"');
        }
      }
    }
  }
  return violations;
}

function readConfigChain(
  repositoryRoot: string,
  configPath: string,
  seen: Set<string>,
  violations: ArchitectureViolation[],
): ConfigChainResult {
  const absolutePath = resolve(configPath);
  if (seen.has(absolutePath)) {
    violations.push(violation(repositoryRoot, "module_tsconfig_invalid", absolutePath));
    return { pathEntries: [], hasPaths: false, baseDirectory: undefined };
  }
  const ancestors = new Set(seen).add(absolutePath);

  if (!regularContainedFile(repositoryRoot, absolutePath)) {
    violations.push(violation(repositoryRoot, "tsconfig_extends_outside_graph", absolutePath));
    return { pathEntries: [], hasPaths: false, baseDirectory: undefined };
  }

  let content: string;
  let raw: Record<string, unknown>;
  try {
    content = readFileSync(absolutePath, "utf8");
    const result = ts.parseConfigFileTextToJson(absolutePath, content);
    if (result.error || !result.config || typeof result.config !== "object") {
      violations.push(violation(repositoryRoot, "module_tsconfig_invalid", absolutePath));
      return { pathEntries: [], hasPaths: false, baseDirectory: undefined };
    }
    raw = result.config as Record<string, unknown>;
  } catch {
    violations.push(violation(repositoryRoot, "module_tsconfig_invalid", absolutePath));
    return { pathEntries: [], hasPaths: false, baseDirectory: undefined };
  }
  violations.push(...rawConfigPathViolations(repositoryRoot, absolutePath, content, raw));

  let inheritedEntries: readonly PathEntry[] = [];
  let inheritedHasPaths = false;
  let inheritedBaseDirectory: string | undefined;
  const extendedConfigs =
    typeof raw.extends === "string"
      ? [raw.extends]
      : Array.isArray(raw.extends) && raw.extends.every((entry) => typeof entry === "string")
        ? raw.extends
        : raw.extends === undefined
          ? []
          : undefined;
  if (!extendedConfigs) {
    violations.push(violation(repositoryRoot, "module_tsconfig_invalid", absolutePath));
  }
  for (const extended of extendedConfigs ?? []) {
    const parent = resolveExtends(absolutePath, extended);
    if (
      !parent ||
      !configPathIsSafe({
        repositoryRoot,
        configPath: absolutePath,
        value: extended,
        allowGlob: false,
      }) ||
      !isContained(repositoryRoot, parent) ||
      !regularContainedFile(repositoryRoot, parent)
    ) {
      violations.push(
        violation(
          repositoryRoot,
          "tsconfig_extends_outside_graph",
          absolutePath,
          textLine(content, extended),
        ),
      );
    } else {
      const parentResult = readConfigChain(repositoryRoot, parent, ancestors, violations);
      if (parentResult.hasPaths) {
        inheritedEntries = parentResult.pathEntries;
        inheritedHasPaths = true;
      }
      if (parentResult.baseDirectory !== undefined) {
        inheritedBaseDirectory = parentResult.baseDirectory;
      }
    }
  }

  const compilerOptions = raw.compilerOptions;
  if (!compilerOptions || typeof compilerOptions !== "object" || Array.isArray(compilerOptions)) {
    return {
      pathEntries: inheritedEntries,
      hasPaths: inheritedHasPaths,
      baseDirectory: inheritedBaseDirectory,
    };
  }
  const options = compilerOptions as Record<string, unknown>;
  const baseDirectory =
    typeof options.baseUrl === "string"
      ? resolve(dirname(absolutePath), options.baseUrl)
      : inheritedBaseDirectory;
  const paths = options.paths;
  if (paths === undefined) {
    return {
      pathEntries: inheritedEntries,
      hasPaths: inheritedHasPaths,
      baseDirectory,
    };
  }
  if (!paths || typeof paths !== "object" || Array.isArray(paths)) {
    violations.push(violation(repositoryRoot, "module_tsconfig_invalid", absolutePath));
    return { pathEntries: [], hasPaths: true, baseDirectory };
  }

  const entries: PathEntry[] = [];
  for (const [alias, targets] of Object.entries(paths)) {
    if (!Array.isArray(targets) || !targets.every((target) => typeof target === "string")) {
      violations.push(
        violation(
          repositoryRoot,
          "module_tsconfig_invalid",
          absolutePath,
          textLine(content, JSON.stringify(alias)),
        ),
      );
      continue;
    }
    entries.push({
      alias,
      targets,
      configPath: absolutePath,
      content,
      baseDirectory: baseDirectory ?? dirname(absolutePath),
    });
  }
  return { pathEntries: entries, hasPaths: true, baseDirectory };
}

function pathProbe(baseDirectory: string, target: string): string {
  const wildcard = target.indexOf("*");
  const prefix = wildcard < 0 ? target : target.slice(0, wildcard);
  return resolve(baseDirectory, prefix.replace(/[\\/]$/u, ""));
}

function pathTargetExists(repositoryRoot: string, path: string): boolean {
  return [
    path,
    ...[".ts", ".tsx", ".js", ".jsx", ".json"].map((extension) => `${path}${extension}`),
  ].some((candidate) => {
    try {
      const stat = lstatSync(candidate);
      return (
        !stat.isSymbolicLink() &&
        (stat.isFile() || stat.isDirectory()) &&
        isContained(realpathSync(repositoryRoot), realpathSync(candidate))
      );
    } catch {
      return false;
    }
  });
}

function pathEntryViolations(
  repositoryRoot: string,
  modules: readonly TargetModule[],
  sourceModule: TargetModule | undefined,
  localConfigPath: string,
  entries: readonly PathEntry[],
): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  for (const entry of entries) {
    for (const target of entry.targets) {
      const probe = pathProbe(entry.baseDirectory, target);
      const line = textLine(entry.content, JSON.stringify(entry.alias));
      if (
        !configPathIsSafe({
          repositoryRoot,
          configPath: entry.configPath,
          baseDirectory: entry.baseDirectory,
          value: target,
          allowGlob: true,
        })
      ) {
        violations.push(violation(repositoryRoot, "tsconfig_unsafe_path", entry.configPath, line));
        continue;
      }
      if (!isContained(repositoryRoot, probe)) {
        violations.push(
          violation(repositoryRoot, "tsconfig_path_target_outside_graph", entry.configPath, line),
        );
        continue;
      }
      if (!pathTargetExists(repositoryRoot, probe)) {
        violations.push(
          violation(repositoryRoot, "tsconfig_path_target_unresolved", entry.configPath, line),
        );
        continue;
      }
      const targetModule = moduleForPath(modules, probe);
      if (!targetModule) {
        violations.push(
          violation(repositoryRoot, "tsconfig_path_target_outside_graph", entry.configPath, line),
        );
        continue;
      }
      if (
        sourceModule &&
        entry.configPath === localConfigPath &&
        dependencyRule(sourceModule, targetModule)
      ) {
        violations.push(
          violation(repositoryRoot, "tsconfig_path_boundary_forbidden", entry.configPath, line),
        );
      }
    }
  }
  return violations;
}

function referenceViolations(
  repositoryRoot: string,
  modules: readonly TargetModule[],
  sourceModule: TargetModule | undefined,
  configPath: string,
  rawConfig: Record<string, unknown>,
  content: string,
): ArchitectureViolation[] {
  if (!Array.isArray(rawConfig.references)) return [];
  const violations: ArchitectureViolation[] = [];
  for (const reference of rawConfig.references) {
    const path =
      reference && typeof reference === "object" && !Array.isArray(reference)
        ? (reference as Record<string, unknown>).path
        : undefined;
    if (typeof path !== "string") {
      violations.push(violation(repositoryRoot, "module_tsconfig_invalid", configPath));
      continue;
    }
    const absoluteReference = resolve(dirname(configPath), path);
    const target = moduleForPath(modules, absoluteReference);
    const line = textLine(content, JSON.stringify(path));
    if (!isContained(repositoryRoot, absoluteReference) || !target) {
      violations.push(
        violation(repositoryRoot, "tsconfig_reference_outside_graph", configPath, line),
      );
    } else if (
      !regularContainedFile(
        repositoryRoot,
        extname(absoluteReference)
          ? absoluteReference
          : resolve(absoluteReference, "tsconfig.json"),
      )
    ) {
      violations.push(violation(repositoryRoot, "tsconfig_reference_unresolved", configPath, line));
    } else if (sourceModule && dependencyRule(sourceModule, target)) {
      violations.push(
        violation(repositoryRoot, "tsconfig_reference_boundary_forbidden", configPath, line),
      );
    }
  }
  return violations;
}

type SafeTypeScriptHost = ts.ParseConfigHost & ts.ModuleResolutionHost;

function recordUnsafeAccess(
  repositoryRoot: string,
  configPath: string,
  violations: ArchitectureViolation[],
): void {
  if (!violations.some((candidate) => candidate.ruleId === "tsconfig_unsafe_path")) {
    violations.push(violation(repositoryRoot, "tsconfig_unsafe_path", configPath));
  }
}

function preflightDirectoryTree(
  repositoryRoot: string,
  directory: string,
  configPath: string,
  violations: ArchitectureViolation[],
  visited = new Set<string>(),
): boolean {
  const absoluteDirectory = resolve(directory);
  if (!isContained(repositoryRoot, absoluteDirectory)) {
    recordUnsafeAccess(repositoryRoot, configPath, violations);
    return false;
  }
  let canonicalDirectory: string;
  try {
    const stat = lstatSync(absoluteDirectory);
    canonicalDirectory = realpathSync(absoluteDirectory);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      !isContained(realpathSync(repositoryRoot), canonicalDirectory)
    ) {
      recordUnsafeAccess(repositoryRoot, configPath, violations);
      return false;
    }
  } catch {
    recordUnsafeAccess(repositoryRoot, configPath, violations);
    return false;
  }
  if (visited.has(canonicalDirectory)) return true;
  visited.add(canonicalDirectory);

  let entries: Dirent<string>[];
  try {
    entries = readdirSync(absoluteDirectory, { withFileTypes: true, encoding: "utf8" });
  } catch {
    recordUnsafeAccess(repositoryRoot, configPath, violations);
    return false;
  }
  let safe = true;
  for (const entry of entries) {
    if (PREFLIGHT_SKIP_DIRECTORIES.has(entry.name)) continue;
    const path = join(absoluteDirectory, entry.name);
    if (entry.isSymbolicLink()) {
      recordUnsafeAccess(repositoryRoot, configPath, violations);
      safe = false;
      continue;
    }
    if (entry.isDirectory()) {
      safe = preflightDirectoryTree(repositoryRoot, path, configPath, violations, visited) && safe;
    }
  }
  return safe;
}

function createSafeTypeScriptHost(
  repositoryRoot: string,
  configPath: string,
  violations: ArchitectureViolation[],
): SafeTypeScriptHost {
  const canonicalRepositoryRoot = realpathSync(repositoryRoot);
  const absolutePathStatus = (path: string): PathMetadataStatus => {
    const absolutePath = resolve(path);
    if (
      !isContained(repositoryRoot, absolutePath) &&
      !isContained(canonicalRepositoryRoot, absolutePath)
    ) {
      return "unsafe";
    }
    try {
      return isContained(canonicalRepositoryRoot, realpathSync(absolutePath))
        ? "safe-existing"
        : "unsafe";
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") return "unsafe";
      let candidate = dirname(absolutePath);
      while (
        isContained(repositoryRoot, candidate) ||
        isContained(canonicalRepositoryRoot, candidate)
      ) {
        try {
          return isContained(canonicalRepositoryRoot, realpathSync(candidate))
            ? "safe-missing"
            : "unsafe";
        } catch (ancestorError) {
          if ((ancestorError as NodeJS.ErrnoException).code !== "ENOENT") return "unsafe";
          const parent = dirname(candidate);
          if (parent === candidate) break;
          candidate = parent;
        }
      }
      return "unsafe";
    }
  };
  const canonicalExistingPath = (path: string, kind: "file" | "directory"): string | undefined => {
    const status = absolutePathStatus(path);
    if (status === "unsafe") {
      recordUnsafeAccess(repositoryRoot, configPath, violations);
      return undefined;
    }
    if (status === "safe-missing") return undefined;
    try {
      const canonicalPath = realpathSync(path);
      const stat = lstatSync(canonicalPath);
      if (!isContained(canonicalRepositoryRoot, canonicalPath)) {
        recordUnsafeAccess(repositoryRoot, configPath, violations);
        return undefined;
      }
      return (kind === "file" ? stat.isFile() : stat.isDirectory()) ? canonicalPath : undefined;
    } catch {
      recordUnsafeAccess(repositoryRoot, configPath, violations);
      return undefined;
    }
  };

  return {
    useCaseSensitiveFileNames: ts.sys.useCaseSensitiveFileNames,
    getCurrentDirectory: () => repositoryRoot,
    fileExists: (path) => canonicalExistingPath(path, "file") !== undefined,
    readFile: (path) => {
      const canonicalPath = canonicalExistingPath(path, "file");
      if (!canonicalPath) return undefined;
      try {
        return readFileSync(canonicalPath, "utf8");
      } catch {
        recordUnsafeAccess(repositoryRoot, configPath, violations);
        return undefined;
      }
    },
    directoryExists: (path) => canonicalExistingPath(path, "directory") !== undefined,
    getDirectories: (path) => {
      const canonicalPath = canonicalExistingPath(path, "directory");
      if (!canonicalPath) return [];
      try {
        return readdirSync(canonicalPath, { withFileTypes: true, encoding: "utf8" })
          .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink())
          .map((entry) => entry.name);
      } catch {
        recordUnsafeAccess(repositoryRoot, configPath, violations);
        return [];
      }
    },
    readDirectory: (rootDir, extensions, excludes, includes, depth) => {
      const canonicalRoot = canonicalExistingPath(rootDir, "directory");
      if (
        !canonicalRoot ||
        !preflightDirectoryTree(repositoryRoot, canonicalRoot, configPath, violations)
      ) {
        return [];
      }
      return ts.sys.readDirectory(canonicalRoot, extensions, excludes, includes, depth);
    },
    realpath: (path) => {
      const status = absolutePathStatus(path);
      if (status !== "safe-existing") {
        if (status === "unsafe") recordUnsafeAccess(repositoryRoot, configPath, violations);
        return path;
      }
      try {
        const canonicalPath = realpathSync(path);
        if (isContained(canonicalRepositoryRoot, canonicalPath)) return canonicalPath;
      } catch {
        recordUnsafeAccess(repositoryRoot, configPath, violations);
      }
      recordUnsafeAccess(repositoryRoot, configPath, violations);
      return path;
    },
  };
}

export function loadTsConfig(
  repositoryRoot: string,
  modules: readonly TargetModule[],
  path: string,
  kind: ConfigKind,
  sourceModule?: TargetModule,
): LoadedTsConfig | undefined {
  const absolutePath = resolve(path);
  const violations: ArchitectureViolation[] = [];
  const safeHost = createSafeTypeScriptHost(repositoryRoot, absolutePath, violations);
  if (!regularContainedFile(repositoryRoot, absolutePath)) {
    return {
      path: absolutePath,
      parsed: { options: {}, fileNames: [], errors: [] },
      pathEntries: [],
      violations: [violation(repositoryRoot, configRule(kind, "missing"), absolutePath)],
      resolutionHost: safeHost,
    };
  }

  let content: string;
  let readResult: ReturnType<typeof ts.readConfigFile>;
  try {
    content = readFileSync(absolutePath, "utf8");
    readResult = ts.readConfigFile(absolutePath, safeHost.readFile);
  } catch {
    return {
      path: absolutePath,
      parsed: { options: {}, fileNames: [], errors: [] },
      pathEntries: [],
      violations: [violation(repositoryRoot, configRule(kind, "invalid"), absolutePath)],
      resolutionHost: safeHost,
    };
  }
  if (readResult.error || !readResult.config || typeof readResult.config !== "object") {
    return {
      path: absolutePath,
      parsed: { options: {}, fileNames: [], errors: [] },
      pathEntries: [],
      violations: [violation(repositoryRoot, configRule(kind, "invalid"), absolutePath)],
      resolutionHost: safeHost,
    };
  }

  const sourceTreeSafe = sourceModule
    ? preflightDirectoryTree(repositoryRoot, sourceModule.root, absolutePath, violations)
    : true;
  const entries = readConfigChain(repositoryRoot, absolutePath, new Set(), violations).pathEntries;
  violations.push(
    ...pathEntryViolations(repositoryRoot, modules, sourceModule, absolutePath, entries),
  );
  violations.push(
    ...referenceViolations(
      repositoryRoot,
      modules,
      sourceModule,
      absolutePath,
      readResult.config as Record<string, unknown>,
      content,
    ),
  );
  const unsafeConfig =
    !sourceTreeSafe ||
    violations.some((candidate) =>
      [
        "module_tsconfig_invalid",
        "root_tsconfig_invalid",
        "tsconfig_extends_outside_graph",
        "tsconfig_unsafe_path",
      ].includes(candidate.ruleId),
    );
  const parsedCandidate = unsafeConfig
    ? { options: {}, fileNames: [], errors: [] }
    : ts.parseJsonConfigFileContent(
        readResult.config,
        safeHost,
        dirname(absolutePath),
        undefined,
        absolutePath,
      );
  const parsed = violations.some((candidate) => candidate.ruleId === "tsconfig_unsafe_path")
    ? { options: {}, fileNames: [], errors: [] }
    : parsedCandidate;
  const blockingDiagnostics = parsed.errors.filter(
    (diagnostic) => diagnostic.code !== 18002 && diagnostic.code !== 18003,
  );
  violations.push(
    ...blockingDiagnostics.map(() =>
      violation(repositoryRoot, configRule(kind, "invalid"), absolutePath),
    ),
  );
  return {
    path: absolutePath,
    parsed,
    pathEntries: entries,
    violations,
    resolutionHost: safeHost,
  };
}

export function resolveTypeScriptModule(
  specifier: string,
  containingFile: string,
  config: LoadedTsConfig,
): string | undefined {
  return ts.resolveModuleName(
    specifier,
    containingFile,
    config.parsed.options,
    config.resolutionHost,
  ).resolvedModule?.resolvedFileName;
}
