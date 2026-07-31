import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

export type SpecImportMapping = {
  readonly source: string;
  readonly target: string;
};

export const APPROVED_SPEC_IMPORT_SOURCE_ROOT = "/Users/xy/personal/Sartre(agent-workspace-design)";

export const APPROVED_SPEC_IMPORTS: readonly Readonly<SpecImportMapping>[] = Object.freeze(
  [
    { source: "docs/01-architecture-overview.md", target: "docs/01-architecture-overview.md" },
    { source: "docs/DATABASE-SCHEMA.md", target: "docs/DATABASE-SCHEMA.md" },
    {
      source: "docs/plans/2026-07-16-multi-user-ai-native-workspace-design.md",
      target: "docs/plans/2026-07-16-multi-user-ai-native-workspace-design.md",
    },
    {
      source: "plan/adr/ADR-0004-codex-sdk-work-agent-and-bounded-steward.md",
      target: "plan/adr/ADR-0004-codex-sdk-work-agent-and-bounded-steward.md",
    },
    {
      source: "plan/adr/ADR-0005-shared-agent-caller-runtime-and-version-pinning.md",
      target: "plan/adr/ADR-0005-shared-agent-caller-runtime-and-version-pinning.md",
    },
    { source: "spec/AcceptanceScenarioSpec.md", target: "spec/AcceptanceScenarioSpec.md" },
    { source: "spec/AgentConnectorUXSpec.md", target: "spec/AgentConnectorUXSpec.md" },
    { source: "spec/ArchitectureConstraints.md", target: "spec/ArchitectureConstraints.md" },
    { source: "spec/ArchitectureFitnessSpec.md", target: "spec/ArchitectureFitnessSpec.md" },
    { source: "spec/BDD_TestSpec.md", target: "spec/BDD_TestSpec.md" },
    { source: "spec/DDDSpec.md", target: "spec/DDDSpec.md" },
    { source: "spec/ElectronAppSpec.md", target: "spec/ElectronAppSpec.md" },
    { source: "spec/EngineeringPrinciples.md", target: "spec/EngineeringPrinciples.md" },
    {
      source: "spec/ExecutionArchitectureSpec.md",
      target: "spec/ExecutionArchitectureSpec.md",
    },
    {
      source: "spec/HandoffHubArchitectureSpec.md",
      target: "spec/HandoffHubArchitectureSpec.md",
    },
    { source: "spec/HubApiSpec.md", target: "spec/HubApiSpec.md" },
    { source: "spec/LocalRuntimeSpec.md", target: "spec/LocalRuntimeSpec.md" },
    { source: "spec/ModuleContractSpec.md", target: "spec/ModuleContractSpec.md" },
    { source: "spec/ProgramSpec.md", target: "spec/ProgramSpec.md" },
    { source: "spec/README.md", target: "spec/README.md" },
    { source: "spec/StateMachineSpec.md", target: "spec/StateMachineSpec.md" },
    { source: "spec/TestStrategy.md", target: "spec/TestStrategy.md" },
    { source: "spec/UIDesignV2Spec.md", target: "spec/UIDesignV2Spec.md" },
    { source: "workflow/WORKFLOW.md", target: "workflow/WORKFLOW.md" },
    { source: "workflow/harness-sop.md", target: "workflow/harness-sop.md" },
    { source: "workflow/plan-ledger-sop.md", target: "workflow/plan-ledger-sop.md" },
  ].map((mapping) => Object.freeze(mapping)),
);

export type SpecImportEntry = {
  readonly source: string;
  readonly target: string;
  readonly sha256: string;
};

export type SpecImportViolation = {
  readonly code:
    | "source_checksum_mismatch"
    | "target_checksum_mismatch"
    | "missing_file"
    | "manifest_entry_extra"
    | "manifest_entry_missing"
    | "manifest_entry_duplicate"
    | "manifest_mapping_drift"
    | "manifest_source_root_drift"
    | "manifest_schema_invalid"
    | "target_path_unsafe"
    | "source_path_unsafe";
  readonly target: string;
};

export type VerifyImportOptions =
  | {
      readonly verifySource?: boolean;
      readonly enforceApprovedManifest?: false;
      readonly repositoryRoot?: never;
      readonly sourceRoot?: never;
    }
  | {
      readonly verifySource?: boolean;
      readonly enforceApprovedManifest: true;
      readonly repositoryRoot: string;
      readonly sourceRoot: string;
    };

export function createImportEntry(source: string, target: string): SpecImportEntry {
  const sourceHash = hashFile(source);
  const targetHash = hashFile(target);
  if (sourceHash !== targetHash) {
    throw new Error(`Imported target does not match approved source: ${target}`);
  }
  return { source, target, sha256: sourceHash };
}

export function verifyImportEntries(
  entries: readonly unknown[],
  options: VerifyImportOptions = {},
): SpecImportViolation[] {
  const parsed = parseImportEntries(entries);
  if (parsed.violations.length > 0) {
    return parsed.violations;
  }
  const parsedEntries = parsed.entries;

  if (options.enforceApprovedManifest) {
    const structuralViolations = verifyApprovedManifestShape(
      parsedEntries,
      options.repositoryRoot,
      options.sourceRoot,
    );
    if (structuralViolations.length > 0) {
      return structuralViolations;
    }
    return verifyContainedImportFiles(parsedEntries, {
      verifySource: options.verifySource,
      repositoryRoot: options.repositoryRoot,
      sourceRoot: options.sourceRoot,
    });
  }

  return verifyLooseImportFiles(parsedEntries, options.verifySource === true);
}

type ParsedImportEntries = {
  readonly entries: SpecImportEntry[];
  readonly violations: SpecImportViolation[];
};

function parseImportEntries(entries: readonly unknown[]): ParsedImportEntries {
  const parsedEntries: SpecImportEntry[] = [];
  const violations: SpecImportViolation[] = [];
  entries.forEach((entry, index) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      Array.isArray(entry) ||
      !("source" in entry) ||
      !("target" in entry) ||
      !("sha256" in entry) ||
      typeof entry.source !== "string" ||
      typeof entry.target !== "string" ||
      typeof entry.sha256 !== "string" ||
      !/^[a-f0-9]{64}$/iu.test(entry.sha256)
    ) {
      violations.push({ code: "manifest_schema_invalid", target: `entry:${index}` });
      return;
    }
    parsedEntries.push({ source: entry.source, target: entry.target, sha256: entry.sha256 });
  });
  return { entries: parsedEntries, violations };
}

function verifyLooseImportFiles(
  entries: readonly SpecImportEntry[],
  verifySource: boolean,
): SpecImportViolation[] {
  const violations: SpecImportViolation[] = [];

  for (const entry of entries) {
    if (!existsSync(entry.target)) {
      violations.push({ code: "missing_file", target: entry.target });
      continue;
    }
    if (hashFile(entry.target) !== entry.sha256) {
      violations.push({ code: "target_checksum_mismatch", target: entry.target });
      continue;
    }
    if (verifySource) {
      if (!existsSync(entry.source)) {
        violations.push({ code: "missing_file", target: entry.target });
        continue;
      }
      if (hashFile(entry.source) !== entry.sha256) {
        violations.push({ code: "source_checksum_mismatch", target: entry.target });
      }
    }
  }

  return violations;
}

export type VerifyContainedImportOptions = {
  readonly verifySource?: boolean;
  readonly repositoryRoot: string;
  readonly sourceRoot: string;
};

type SafeImportPaths = {
  readonly entry: SpecImportEntry;
  readonly target: string;
  readonly source?: string;
};

export function verifyContainedImportFiles(
  entries: readonly SpecImportEntry[],
  options: VerifyContainedImportOptions,
): SpecImportViolation[] {
  const targetRoot = safeDirectoryRoot(options.repositoryRoot);
  if (!targetRoot) {
    return [{ code: "target_path_unsafe", target: options.repositoryRoot }];
  }

  const safePaths: SafeImportPaths[] = [];
  const targetViolations: SpecImportViolation[] = [];
  for (const entry of entries) {
    const target = containedRegularFile(entry.target, targetRoot);
    if (target.kind === "missing") {
      targetViolations.push({ code: "missing_file", target: entry.target });
    } else if (target.kind === "unsafe") {
      targetViolations.push({ code: "target_path_unsafe", target: entry.target });
    } else {
      safePaths.push({ entry, target: target.path });
    }
  }
  if (targetViolations.length > 0) {
    return targetViolations;
  }

  if (options.verifySource) {
    const sourceRoot = safeDirectoryRoot(options.sourceRoot);
    if (!sourceRoot) {
      return [{ code: "source_path_unsafe", target: options.sourceRoot }];
    }
    const sourceViolations: SpecImportViolation[] = [];
    for (let index = 0; index < safePaths.length; index += 1) {
      const safePath = safePaths[index];
      const source = containedRegularFile(safePath.entry.source, sourceRoot);
      if (source.kind === "missing") {
        sourceViolations.push({ code: "missing_file", target: safePath.entry.target });
      } else if (source.kind === "unsafe") {
        sourceViolations.push({ code: "source_path_unsafe", target: safePath.entry.target });
      } else {
        safePaths[index] = { ...safePath, source: source.path };
      }
    }
    if (sourceViolations.length > 0) {
      return sourceViolations;
    }
  }

  const hashViolations: SpecImportViolation[] = [];
  for (const safePath of safePaths) {
    const targetHash = tryHashFile(safePath.target);
    if (!targetHash) {
      hashViolations.push({ code: "target_path_unsafe", target: safePath.entry.target });
      continue;
    }
    if (targetHash !== safePath.entry.sha256) {
      hashViolations.push({ code: "target_checksum_mismatch", target: safePath.entry.target });
      continue;
    }
    if (options.verifySource && safePath.source) {
      const sourceHash = tryHashFile(safePath.source);
      if (!sourceHash) {
        hashViolations.push({ code: "source_path_unsafe", target: safePath.entry.target });
      } else if (sourceHash !== safePath.entry.sha256) {
        hashViolations.push({ code: "source_checksum_mismatch", target: safePath.entry.target });
      }
    }
  }
  return hashViolations;
}

type ContainedFileResult =
  | { readonly kind: "safe"; readonly path: string }
  | { readonly kind: "missing" }
  | { readonly kind: "unsafe" };

type SafeDirectoryRoot = {
  readonly lexical: string;
  readonly canonical: string;
};

function safeDirectoryRoot(path: string): SafeDirectoryRoot | undefined {
  try {
    const stat = lstatSync(path);
    return stat.isDirectory() && !stat.isSymbolicLink()
      ? { lexical: resolve(path), canonical: realpathSync(path) }
      : undefined;
  } catch {
    return undefined;
  }
}

function containedRegularFile(path: string, root: SafeDirectoryRoot): ContainedFileResult {
  const absolutePath = resolve(path);
  if (!isContainedPath(root.lexical, absolutePath)) {
    return { kind: "unsafe" };
  }
  try {
    const stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      return { kind: "unsafe" };
    }
    const canonicalPath = realpathSync(absolutePath);
    return isContainedPath(root.canonical, canonicalPath)
      ? { kind: "safe", path: canonicalPath }
      : { kind: "unsafe" };
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ENOENT"
      ? { kind: "missing" }
      : { kind: "unsafe" };
  }
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

function tryHashFile(path: string): string | undefined {
  try {
    return hashFile(path);
  } catch {
    return undefined;
  }
}

function verifyApprovedManifestShape(
  entries: readonly SpecImportEntry[],
  repositoryRoot: string,
  sourceRoot: string,
): SpecImportViolation[] {
  const violations: SpecImportViolation[] = [];
  if (sourceRoot !== APPROVED_SPEC_IMPORT_SOURCE_ROOT) {
    violations.push({ code: "manifest_source_root_drift", target: sourceRoot });
  }
  const approvedPairs = new Set(APPROVED_SPEC_IMPORTS.map(mappingKey));
  const approvedTargets = new Set(APPROVED_SPEC_IMPORTS.map((mapping) => mapping.target));
  const actualApprovedPairs = new Set<string>();
  const seenSources = new Set<string>();
  const seenTargets = new Set<string>();

  for (const entry of entries) {
    const mapping = {
      source: portableRelative(sourceRoot, entry.source),
      target: portableRelative(repositoryRoot, entry.target),
    };
    const key = mappingKey(mapping);

    if (seenSources.has(mapping.source) || seenTargets.has(mapping.target)) {
      violations.push({ code: "manifest_entry_duplicate", target: mapping.target });
    }
    seenSources.add(mapping.source);
    seenTargets.add(mapping.target);

    if (!approvedPairs.has(key)) {
      violations.push({
        code: approvedTargets.has(mapping.target)
          ? "manifest_mapping_drift"
          : "manifest_entry_extra",
        target: mapping.target,
      });
      continue;
    }
    actualApprovedPairs.add(key);
  }

  for (const approved of APPROVED_SPEC_IMPORTS) {
    if (!actualApprovedPairs.has(mappingKey(approved))) {
      violations.push({ code: "manifest_entry_missing", target: approved.target });
    }
  }

  return violations;
}

function mappingKey(mapping: SpecImportMapping): string {
  return `${mapping.source}\u0000${mapping.target}`;
}

function portableRelative(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
