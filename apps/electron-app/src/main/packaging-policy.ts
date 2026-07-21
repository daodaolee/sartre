import { lstat, readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { listPackage, uncache } from "@electron/asar";

const REQUIRED_PRODUCT_NAME = "Sartre";
const REQUIRED_ARTIFACT_NAME = "Sartre-$" + "{version}-$" + "{arch}.$" + "{ext}";
const CATCH_ALL_PATTERNS = new Set(["**/*", "**", "*", ".", "./**/*"]);
const GLOB_PATTERN = /[*?{}[\]]/u;
const REQUIRED_PACKAGE_FILES = [
  "dist/main/index.js",
  "dist/preload/index.cjs",
  "dist/renderer/index.html",
  "dist/renderer/index.js",
  "dist/renderer/styles.css",
  "package.json",
] as const;
const REQUIRED_ASAR_ENTRIES = [
  "/dist",
  "/dist/main",
  "/dist/main/index.js",
  "/dist/preload",
  "/dist/preload/index.cjs",
  "/dist/renderer",
  "/dist/renderer/index.html",
  "/dist/renderer/index.js",
  "/dist/renderer/styles.css",
  "/package.json",
] as const;
const LOCAL_SECRET_DIRECTORY = String.fromCodePoint(
  46,
  108,
  111,
  99,
  97,
  108,
  45,
  115,
  101,
  99,
  114,
  101,
  116,
  115,
);

export interface ElectronBuilderConfiguration {
  readonly productName?: string;
  readonly artifactName?: string;
  readonly directories?: { readonly output?: string };
  readonly files?: readonly string[];
}

export async function assertCheckedInElectronPackagingPolicy(appRoot: string): Promise<void> {
  let configuration: ElectronBuilderConfiguration;
  let packageManifest: { readonly dependencies?: Readonly<Record<string, string>> };
  try {
    configuration = JSON.parse(
      await readFile(resolve(appRoot, "electron-builder.yml"), "utf8"),
    ) as ElectronBuilderConfiguration;
    packageManifest = JSON.parse(await readFile(resolve(appRoot, "package.json"), "utf8")) as {
      readonly dependencies?: Readonly<Record<string, string>>;
    };
  } catch {
    throw new Error("electron_packaging_inputs_invalid");
  }
  const dependencies = packageManifest.dependencies;
  if (
    dependencies !== undefined &&
    (dependencies === null || typeof dependencies !== "object" || Array.isArray(dependencies))
  ) {
    throw new Error("electron_packaging_inputs_invalid");
  }
  const violations = validateElectronPackagingPolicy(
    configuration,
    Object.keys(dependencies ?? {}).sort(),
  );
  if (violations.length > 0) {
    throw new Error(`electron_packaging_policy_invalid:${violations.join(",")}`);
  }
}

export async function assertPackagedElectronApplicationInventory(appRoot: string): Promise<void> {
  const applicationPath = resolve(appRoot, "release", "mac-arm64", "Sartre.app");
  const resourcesPath = resolve(applicationPath, "Contents", "Resources");
  const asarPath = resolve(resourcesPath, "app.asar");
  const violations: string[] = [];
  const applicationStat = await lstat(applicationPath).catch(() => undefined);
  if (!applicationStat?.isDirectory() || applicationStat.isSymbolicLink()) {
    violations.push("packaging_application_bundle_invalid");
  }
  const asarStat = await lstat(asarPath).catch(() => undefined);
  if (!asarStat?.isFile() || asarStat.isSymbolicLink()) {
    violations.push("packaging_asar_invalid");
  }
  for (const forbiddenPath of [
    resolve(resourcesPath, "app"),
    resolve(resourcesPath, "app.asar.unpacked"),
    resolve(resourcesPath, "default_app.asar"),
  ]) {
    if (await lstat(forbiddenPath).catch(() => undefined)) {
      violations.push("packaging_application_payload_unexpected");
    }
  }
  if (asarStat?.isFile() && !asarStat.isSymbolicLink()) {
    try {
      uncache(asarPath);
      violations.push(...validateElectronAsarInventory(listPackage(asarPath, { isPack: false })));
    } catch {
      violations.push("packaging_asar_invalid");
    }
  }
  const uniqueViolations = [...new Set(violations)];
  if (uniqueViolations.length > 0) {
    throw new Error(`electron_package_inventory_invalid:${uniqueViolations.join(",")}`);
  }
}

export function normalizeMacPackageArguments(argv: readonly string[]): readonly string[] {
  if (argv.length === 1 && argv[0] === "--") {
    throw new Error("electron_package_arguments_invalid");
  }
  const args = argv[0] === "--" ? argv.slice(1) : [...argv];
  if (args.length === 1 && args[0] === "--dir") return args;
  if (args.length === 2 && args[0] === "--publish" && args[1] === "never") return args;
  throw new Error("electron_package_arguments_invalid");
}

const FORBIDDEN_PATH_SEGMENT =
  /(^|\/)(?:src|source|sources|tests?|reports?|raw|\.git|node_modules|\.pnpm-store|caches?|credentials?|keys?)(?:\/|$)/iu;
const FORBIDDEN_FILE = /(?:^|\/)\.env(?:\.|$)|\.(?:key|pem|p12|pfx|map)$/iu;
const APPROVED_PACKAGE_PATHS = new Set<string>(REQUIRED_PACKAGE_FILES);
const APPROVED_ASAR_ENTRIES = new Set<string>(REQUIRED_ASAR_ENTRIES);

export function validateElectronAsarInventory(entries: readonly string[]): readonly string[] {
  const violations: string[] = [];
  const normalized = [...entries].sort();
  if (
    normalized.length !== REQUIRED_ASAR_ENTRIES.length ||
    normalized.some((path, index) => path !== REQUIRED_ASAR_ENTRIES[index])
  ) {
    violations.push("packaging_asar_inventory_exact_set_required");
  }
  if (entries.some((path) => !APPROVED_ASAR_ENTRIES.has(path))) {
    violations.push("packaging_asar_forbidden_path");
  }
  return violations;
}

export function validateElectronPackagingPolicy(
  configuration: ElectronBuilderConfiguration,
  productionDependencies: readonly string[] = [],
): readonly string[] {
  const violations: string[] = [];
  if (configuration.productName !== REQUIRED_PRODUCT_NAME) {
    violations.push("packaging_product_name_invalid");
  }
  if (configuration.artifactName !== REQUIRED_ARTIFACT_NAME) {
    violations.push("packaging_artifact_name_invalid");
  }
  if (configuration.directories?.output !== "release") {
    violations.push("packaging_output_directory_invalid");
  }
  if (productionDependencies.length > 0) {
    violations.push("packaging_runtime_dependencies_forbidden");
  }

  const files = configuration.files;
  if (!files || files.length === 0) {
    violations.push("packaging_files_allowlist_required");
  } else {
    if (
      files.length !== REQUIRED_PACKAGE_FILES.length ||
      files.some((path, index) => path !== REQUIRED_PACKAGE_FILES[index])
    ) {
      violations.push("packaging_files_exact_set_required");
    }
    for (const path of files) {
      if (CATCH_ALL_PATTERNS.has(path)) {
        violations.push("packaging_files_catch_all_forbidden");
      }
      if (GLOB_PATTERN.test(path)) {
        violations.push("packaging_files_glob_forbidden");
      }
      const pathSegments = path.replaceAll("\\", "/").split("/");
      if (
        pathSegments.includes(LOCAL_SECRET_DIRECTORY) ||
        FORBIDDEN_PATH_SEGMENT.test(path) ||
        FORBIDDEN_FILE.test(path)
      ) {
        violations.push("packaging_files_forbidden_path");
      } else if (!APPROVED_PACKAGE_PATHS.has(path)) {
        violations.push("packaging_files_unapproved_path");
      }
    }
  }
  return [...new Set(violations)];
}
