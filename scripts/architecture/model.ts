import { isAbsolute, relative, resolve, sep } from "node:path";

export type ModuleId =
  | "apps/electron-app"
  | "apps/hub-api"
  | "apps/hub-worker"
  | "apps/local-runtime"
  | "packages/contracts"
  | "packages/domain"
  | "packages/runtime-core"
  | "packages/sdk";

export type TargetModule = {
  readonly id: ModuleId;
  readonly packageName: string;
  readonly root: string;
};

export type ArchitectureViolation = {
  readonly ruleId: string;
  readonly file: string;
  readonly line: number;
  readonly remediation: string;
};

export const MODULE_DEFINITIONS = [
  ["apps/electron-app", "@sartre/electron-app"],
  ["apps/hub-api", "@sartre/hub-api"],
  ["apps/hub-worker", "@sartre/hub-worker"],
  ["apps/local-runtime", "@sartre/local-runtime"],
  ["packages/contracts", "@sartre/contracts"],
  ["packages/domain", "@sartre/domain"],
  ["packages/runtime-core", "@sartre/runtime-core"],
  ["packages/sdk", "@sartre/sdk"],
] as const satisfies readonly (readonly [ModuleId, string])[];

export const ALLOWED_INTERNAL_DEPENDENCIES: Readonly<Record<ModuleId, ReadonlySet<ModuleId>>> = {
  "apps/electron-app": new Set(["packages/sdk"]),
  "apps/hub-api": new Set(["packages/contracts", "packages/domain"]),
  "apps/hub-worker": new Set(["packages/contracts", "packages/domain"]),
  "apps/local-runtime": new Set(["packages/runtime-core"]),
  "packages/contracts": new Set(),
  "packages/domain": new Set(),
  "packages/runtime-core": new Set(["packages/contracts", "packages/domain", "packages/sdk"]),
  "packages/sdk": new Set(["packages/contracts"]),
};

const REMEDIATIONS: Readonly<Record<string, string>> = {
  app_source_import_forbidden:
    "Replace app source imports with an allowed packages/contracts boundary.",
  dependency_direction_forbidden: "Route this dependency through the canonical module graph.",
  domain_dependency_forbidden:
    "Keep packages/domain pure; move framework and I/O code behind an outer module port.",
  forbidden_secret_path:
    "Remove the forbidden Secret path; inject credentials outside tracked and built files.",
  legacy_domain_noun_forbidden:
    "Use the target Sartre ubiquitous language and keep legacy models outside packages/domain.",
  manifest_dependency_direction_forbidden:
    "Remove the manifest dependency or replace it with an allowed direct module dependency.",
  manifest_dependency_invalid: "Use a string dependency target in an approved manifest field.",
  manifest_dependency_target_outside_graph:
    "Point workspace/file/link aliases at one of the eight canonical modules.",
  manifest_exports_invalid:
    "Use exact package export keys and non-null string, array, or conditional targets.",
  module_inventory_extra: "Remove the unapproved app/package root or update repository authority.",
  module_inventory_missing: "Restore the missing canonical app/package root.",
  module_inventory_unreadable:
    "Restore readable apps and packages inventory containers as directories.",
  module_manifest_invalid: "Restore a readable JSON object package manifest.",
  module_manifest_missing: "Restore the required regular package.json for this canonical module.",
  module_package_identity_invalid: "Restore the canonical @sartre package identity.",
  module_tsconfig_invalid: "Restore a valid contained TypeScript project configuration.",
  module_tsconfig_missing: "Restore the required regular tsconfig.json for this canonical module.",
  renderer_hub_sdk_forbidden:
    "Expose a named, validated preload method instead of importing the Hub SDK in renderer.",
  renderer_local_path_forbidden:
    "Keep absolute local paths in main/preload or Runtime and return only safe identifiers.",
  renderer_node_access_forbidden:
    "Move Node access behind a contextBridge preload method with validated input and Result output.",
  renderer_raw_ipc_forbidden: "Replace raw Electron IPC with a named contextBridge preload method.",
  renderer_runtime_access_forbidden:
    "Renderer must call a named preload boundary and may not access Runtime source directly.",
  root_tsconfig_invalid: "Restore a valid contained root tsconfig.base.json.",
  root_tsconfig_missing: "Restore the required regular root tsconfig.base.json.",
  secret_literal_forbidden:
    "Remove the literal Secret and use an approved runtime credential reference.",
  source_import_outside_module_forbidden:
    "Keep relative source imports inside the current module or use an allowed package boundary.",
  source_dependency_undeclared:
    "Declare the external package in the module manifest or use approved root test tooling.",
  source_dependency_identity_invalid:
    "Resolve the declared import from contained root tooling with the expected package identity.",
  source_parse_invalid: "Restore syntactically valid target source before architecture analysis.",
  source_specifier_nonliteral:
    "Use a statically resolvable literal import/require specifier in target modules.",
  source_specifier_unresolved:
    "Declare and resolve the dependency or remove the unresolved target-module import.",
  static_evaluation_budget_exceeded:
    "Reduce deterministic static string construction below the architecture evaluation budget.",
  target_file_unreadable: "Restore a readable contained regular target text/build file.",
  target_symlink_forbidden:
    "Replace target-tree symlinks with contained regular files reviewed by repository policy.",
  target_text_file_oversized:
    "Keep architecture-scanned text/build files within the bounded text size limit.",
  tsconfig_extends_outside_graph:
    "Keep TypeScript extends targets inside the repository and resolvable.",
  tsconfig_unsafe_path:
    "Keep TypeScript config paths and compiler filesystem access inside verified repository roots.",
  tsconfig_path_boundary_forbidden:
    "Remove the path alias or point it only at an allowed direct dependency.",
  tsconfig_path_target_outside_graph:
    "Keep every TypeScript path fallback inside one of the canonical modules.",
  tsconfig_path_target_unresolved:
    "Make every TypeScript path fallback target resolve to a contained path.",
  tsconfig_reference_boundary_forbidden:
    "Remove the project reference or point it only at an allowed direct dependency.",
  tsconfig_reference_outside_graph:
    "Keep TypeScript project references inside the canonical module graph.",
  tsconfig_reference_unresolved:
    "Point TypeScript project references at a contained regular tsconfig.json.",
  unknown_internal_import_forbidden: "Use one of the eight approved @sartre package boundaries.",
};

export function portable(path: string): string {
  return path.replaceAll("\\", "/");
}

export function isContained(root: string, candidate: string): boolean {
  const rootRelative = relative(root, candidate);
  return (
    rootRelative === "" ||
    (!isAbsolute(rootRelative) && rootRelative !== ".." && !rootRelative.startsWith(`..${sep}`))
  );
}

export function createTargetModules(repositoryRoot: string): TargetModule[] {
  return MODULE_DEFINITIONS.map(([id, packageName]) => ({
    id,
    packageName,
    root: resolve(repositoryRoot, id),
  })).sort((left, right) => right.root.length - left.root.length);
}

export function moduleForPath(
  modules: readonly TargetModule[],
  path: string,
): TargetModule | undefined {
  const absolutePath = resolve(path);
  return modules.find((module) => isContained(module.root, absolutePath));
}

export function moduleForPackageSpecifier(
  modules: readonly TargetModule[],
  specifier: string,
): TargetModule | undefined {
  return modules.find(
    (module) => specifier === module.packageName || specifier.startsWith(`${module.packageName}/`),
  );
}

export function dependencyRule(source: TargetModule, target: TargetModule): string | undefined {
  if (source.id === target.id) return undefined;
  if (source.id.startsWith("apps/") && target.id.startsWith("apps/")) {
    return "app_source_import_forbidden";
  }
  return ALLOWED_INTERNAL_DEPENDENCIES[source.id].has(target.id)
    ? undefined
    : "dependency_direction_forbidden";
}

export function violation(
  repositoryRoot: string,
  ruleId: string,
  file: string,
  line = 1,
): ArchitectureViolation {
  return {
    ruleId,
    file: portable(relative(repositoryRoot, file)),
    line,
    remediation: REMEDIATIONS[ruleId] ?? "Restore the approved architecture boundary.",
  };
}

export function textLine(content: string, search: string): number {
  const index = content.split(/\r?\n/u).findIndex((line) => line.includes(search));
  return index < 0 ? 1 : index + 1;
}

export function uniqueSorted(
  violations: readonly ArchitectureViolation[],
): ArchitectureViolation[] {
  const unique = new Map<string, ArchitectureViolation>();
  for (const candidate of violations) {
    unique.set(
      `${candidate.ruleId}\0${candidate.file}\0${candidate.line}\0${candidate.remediation}`,
      candidate,
    );
  }
  return [...unique.values()].sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.ruleId.localeCompare(right.ruleId),
  );
}
