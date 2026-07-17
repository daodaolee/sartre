import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APPROVED_SPEC_IMPORT_SOURCE_ROOT,
  APPROVED_SPEC_IMPORTS,
  createImportEntry,
  type SpecImportEntry,
  type SpecImportViolation,
  verifyContainedImportFiles,
  verifyImportEntries,
} from "./spec-import-manifest.js";

const approvedContent = "approved\n";
const approvedHash = createHash("sha256").update(approvedContent).digest("hex");

function createApprovedEntries(
  sourceRoot: string,
  targetRoot: string,
  createSources: boolean,
): SpecImportEntry[] {
  return APPROVED_SPEC_IMPORTS.map((mapping) => {
    const source = join(sourceRoot, mapping.source);
    const target = join(targetRoot, mapping.target);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, approvedContent, "utf8");
    if (createSources) {
      mkdirSync(dirname(source), { recursive: true });
      writeFileSync(source, approvedContent, "utf8");
    }
    return { source, target, sha256: approvedHash };
  });
}

describe("spec import manifest", () => {
  it("defines the immutable exact 27-document source-target allowlist", () => {
    expect(APPROVED_SPEC_IMPORT_SOURCE_ROOT).toBe(
      "/Users/xy/personal/Sartre(agent-workspace-design)",
    );
    expect(APPROVED_SPEC_IMPORTS).toEqual([
      { source: "docs/01-architecture-overview.md", target: "docs/01-architecture-overview.md" },
      { source: "docs/DATABASE-SCHEMA.md", target: "docs/DATABASE-SCHEMA.md" },
      {
        source: "docs/plans/2026-07-16-multi-user-ai-native-workspace-design.md",
        target: "docs/plans/2026-07-16-multi-user-ai-native-workspace-design.md",
      },
      { source: "plan/00-master-plan.md", target: "plan/00-master-plan.md" },
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
    ]);
    expect(Object.isFrozen(APPROVED_SPEC_IMPORTS)).toBe(true);
    expect(APPROVED_SPEC_IMPORTS.every(Object.isFrozen)).toBe(true);
  });

  it("accepts unchanged source and target files", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-"));
    const source = join(root, "source.md");
    const target = join(root, "target.md");
    writeFileSync(source, "approved\n", "utf8");
    writeFileSync(target, "approved\n", "utf8");

    const entry = createImportEntry(source, target);

    expect(verifyImportEntries([entry])).toEqual([]);
  });

  it("rejects target drift", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-"));
    const source = join(root, "source.md");
    const target = join(root, "target.md");
    writeFileSync(source, "approved\n", "utf8");
    writeFileSync(target, "approved\n", "utf8");
    const entry = createImportEntry(source, target);
    writeFileSync(target, "drifted\n", "utf8");

    expect(verifyImportEntries([entry])).toEqual([
      {
        code: "target_checksum_mismatch",
        target,
      },
    ]);
  });

  it("verifies a clean-clone target from the signed manifest without the source checkout", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-"));
    const source = join(root, "source.md");
    const target = join(root, "target.md");
    writeFileSync(source, "approved\n", "utf8");
    writeFileSync(target, "approved\n", "utf8");
    const entry = createImportEntry(source, target);
    rmSync(source);

    expect(verifyImportEntries([entry])).toEqual([]);
    expect(verifyImportEntries([entry], { verifySource: true })).toEqual([
      {
        code: "missing_file",
        target,
      },
    ]);
  });

  it("rejects a manifest entry outside the immutable approved allowlist", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-shape-"));
    const sourceRoot = join(root, "source");
    const targetRoot = join(root, "target");
    const path = "docs/unapproved.md";
    mkdirSync(join(sourceRoot, "docs"), { recursive: true });
    mkdirSync(join(targetRoot, "docs"), { recursive: true });
    writeFileSync(join(sourceRoot, path), "unapproved\n", "utf8");
    writeFileSync(join(targetRoot, path), "unapproved\n", "utf8");
    const entry = createImportEntry(join(sourceRoot, path), join(targetRoot, path));

    expect(
      verifyImportEntries([entry], {
        enforceApprovedManifest: true,
        repositoryRoot: targetRoot,
        sourceRoot,
      }),
    ).toContainEqual({ code: "manifest_entry_extra", target: path });
  });

  it("rejects an approved allowlist entry missing from the manifest", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-shape-"));

    expect(
      verifyImportEntries([], {
        enforceApprovedManifest: true,
        repositoryRoot: join(root, "target"),
        sourceRoot: join(root, "source"),
      }),
    ).toContainEqual({ code: "manifest_entry_missing", target: "spec/README.md" });
  });

  it("rejects source-root provenance drift without reading the source", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-shape-"));
    const sourceRoot = join(root, "substituted-source");

    expect(
      verifyImportEntries([], {
        enforceApprovedManifest: true,
        repositoryRoot: join(root, "target"),
        sourceRoot,
      }),
    ).toContainEqual({ code: "manifest_source_root_drift", target: sourceRoot });
  });

  it("rejects duplicate approved manifest entries", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-shape-"));
    const sourceRoot = join(root, "source");
    const targetRoot = join(root, "target");
    const path = "spec/README.md";
    mkdirSync(join(sourceRoot, "spec"), { recursive: true });
    mkdirSync(join(targetRoot, "spec"), { recursive: true });
    writeFileSync(join(sourceRoot, path), "approved\n", "utf8");
    writeFileSync(join(targetRoot, path), "approved\n", "utf8");
    const entry = createImportEntry(join(sourceRoot, path), join(targetRoot, path));

    expect(
      verifyImportEntries([entry, entry], {
        enforceApprovedManifest: true,
        repositoryRoot: targetRoot,
        sourceRoot,
      }),
    ).toContainEqual({ code: "manifest_entry_duplicate", target: path });
  });

  it("rejects approved source and target paths paired with the wrong mapping", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-shape-"));
    const sourceRoot = join(root, "source");
    const targetRoot = join(root, "target");
    const sourcePath = "docs/01-architecture-overview.md";
    const targetPath = "spec/README.md";
    mkdirSync(join(sourceRoot, "docs"), { recursive: true });
    mkdirSync(join(targetRoot, "spec"), { recursive: true });
    writeFileSync(join(sourceRoot, sourcePath), "approved\n", "utf8");
    writeFileSync(join(targetRoot, targetPath), "approved\n", "utf8");
    const entry = createImportEntry(join(sourceRoot, sourcePath), join(targetRoot, targetPath));

    expect(
      verifyImportEntries([entry], {
        enforceApprovedManifest: true,
        repositoryRoot: targetRoot,
        sourceRoot,
      }),
    ).toContainEqual({ code: "manifest_mapping_drift", target: targetPath });
  });

  it("returns an extra-entry shape violation without reading an external target directory", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-no-read-"));
    const targetRoot = join(root, "target");
    const externalTarget = join(root, "external-target-sentinel");
    mkdirSync(targetRoot);
    mkdirSync(externalTarget);
    const entries: SpecImportEntry[] = [
      {
        source: join(APPROVED_SPEC_IMPORT_SOURCE_ROOT, "docs/unapproved.md"),
        target: externalTarget,
        sha256: approvedHash,
      },
    ];

    let violations: SpecImportViolation[] | undefined;
    expect(() => {
      violations = verifyImportEntries(entries, {
        enforceApprovedManifest: true,
        repositoryRoot: targetRoot,
        sourceRoot: APPROVED_SPEC_IMPORT_SOURCE_ROOT,
      });
    }).not.toThrow();
    expect(violations?.some(({ code }) => code === "manifest_entry_extra")).toBe(true);
  });

  it("returns source-root drift without reading the external source directory", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-no-read-"));
    const sourceRoot = join(root, "external-source-sentinel");
    const targetRoot = join(root, "target");
    const target = join(targetRoot, "docs/unapproved.md");
    mkdirSync(sourceRoot);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, approvedContent, "utf8");

    let violations: SpecImportViolation[] | undefined;
    expect(() => {
      violations = verifyImportEntries([{ source: sourceRoot, target, sha256: approvedHash }], {
        verifySource: true,
        enforceApprovedManifest: true,
        repositoryRoot: targetRoot,
        sourceRoot,
      });
    }).not.toThrow();
    expect(violations).toContainEqual({ code: "manifest_source_root_drift", target: sourceRoot });
  });

  it("rejects an approved target symlink outside before reading its sentinel", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-no-read-"));
    const targetRoot = join(root, "target");
    const externalTarget = join(root, "external-target-sentinel");
    mkdirSync(externalTarget);
    const entries = createApprovedEntries(APPROVED_SPEC_IMPORT_SOURCE_ROOT, targetRoot, false);
    const entry = entries.find(({ target }) => target.endsWith("spec/README.md"));
    expect(entry).toBeDefined();
    rmSync(entry?.target ?? "");
    symlinkSync(externalTarget, entry?.target ?? "", "dir");

    let violations: SpecImportViolation[] | undefined;
    expect(() => {
      violations = verifyImportEntries(entries, {
        enforceApprovedManifest: true,
        repositoryRoot: targetRoot,
        sourceRoot: APPROVED_SPEC_IMPORT_SOURCE_ROOT,
      });
    }).not.toThrow();
    expect(violations).toContainEqual({ code: "target_path_unsafe", target: entry?.target });
  });

  it("rejects an approved source symlink outside before explicit source reading", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-no-read-"));
    const sourceRoot = join(root, "source");
    const targetRoot = join(root, "target");
    const externalSource = join(root, "external-source-sentinel");
    mkdirSync(externalSource);
    const entries = createApprovedEntries(sourceRoot, targetRoot, true);
    const entry = entries.find(({ source }) => source.endsWith("spec/README.md"));
    expect(entry).toBeDefined();
    rmSync(entry?.source ?? "");
    symlinkSync(externalSource, entry?.source ?? "", "dir");

    let violations: SpecImportViolation[] | undefined;
    expect(() => {
      violations = verifyContainedImportFiles(entries, {
        verifySource: true,
        repositoryRoot: targetRoot,
        sourceRoot,
      });
    }).not.toThrow();
    expect(violations).toContainEqual({ code: "source_path_unsafe", target: entry?.target });
  });

  it("rejects an invalid entry schema before filesystem access", () => {
    const root = mkdtempSync(join(tmpdir(), "sartre-spec-import-no-read-"));
    let violations: SpecImportViolation[] | undefined;

    expect(() => {
      violations = verifyImportEntries([{}], {
        enforceApprovedManifest: true,
        repositoryRoot: join(root, "target"),
        sourceRoot: APPROVED_SPEC_IMPORT_SOURCE_ROOT,
      });
    }).not.toThrow();
    expect(violations).toContainEqual({ code: "manifest_schema_invalid", target: "entry:0" });
  });
});
