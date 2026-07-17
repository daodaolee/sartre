import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type OpenSpecViolation = {
  readonly code: "legacy_openspec_state_present" | "missing_file" | "missing_required_content";
  readonly path: string;
};

const changePath = "openspec/changes/ms0-repository-constitution";
const requiredContent: Readonly<Record<string, readonly RegExp[]>> = {
  "proposal.md": [
    /Electron/iu,
    /Hub API/iu,
    /Hub Worker/iu,
    /Local Runtime/iu,
    /non-goals/iu,
    /identity/iu,
    /Requirement/u,
    /Session/u,
    /Agent\s+execution/iu,
  ],
  "design.md": [
    /repository/iu,
    /evidence/iu,
    /database/iu,
    /health/iu,
    /diagnostic/iu,
    /Electron/iu,
    /trust boundar/iu,
  ],
  "tasks.md": Array.from({ length: 9 }, (_, index) => new RegExp(`Task ${index + 1}\\b`, "iu")),
  "scenarios.md": [
    /positive/iu,
    /rejection/iu,
    /concurrency/iu,
    /dependency[ -]failure/iu,
    /Secret/u,
    /packaged[ -]app/iu,
    /recovery/iu,
    /root_packaging_prohibited/u,
    /migration_lock_timeout/u,
    /dependency_unavailable/u,
    /secret_boundary_violation/u,
    /secret_artifact_violation/u,
    /process_recovered/u,
  ],
};

export function validateMs0OpenSpec(root: string): OpenSpecViolation[] {
  const changesRoot = join(root, "openspec/changes");
  const violations: OpenSpecViolation[] = [];

  if (existsSync(changesRoot)) {
    for (const entry of readdirSync(changesRoot, { withFileTypes: true })) {
      if (entry.name !== "ms0-repository-constitution") {
        violations.push({
          code: "legacy_openspec_state_present",
          path: `openspec/changes/${entry.name}`,
        });
      }
    }
  }

  for (const [file, patterns] of Object.entries(requiredContent)) {
    const path = `${changePath}/${file}`;
    const absolutePath = join(root, path);
    if (!existsSync(absolutePath)) {
      violations.push({ code: "missing_file", path });
      continue;
    }
    const content = readFileSync(absolutePath, "utf8");
    if (patterns.some((pattern) => !pattern.test(content))) {
      violations.push({ code: "missing_required_content", path });
    }
  }

  return violations;
}
