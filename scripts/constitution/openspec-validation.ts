import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type OpenSpecViolation = {
  readonly code: "legacy_openspec_state_present" | "missing_file" | "missing_required_content";
  readonly path: string;
};

type OpenSpecChangeRule = {
  readonly required: boolean;
  readonly files: Readonly<Record<string, readonly RegExp[]>>;
};

const changeRules: Readonly<Record<string, OpenSpecChangeRule>> = {
  "ms0-repository-constitution": {
    required: true,
    files: {
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
    },
  },
  "ms1-identity-workspace-tenant-boundary": {
    required: false,
    files: {
      "proposal.md": [
        /Identity/iu,
        /Workspace/iu,
        /Endpoint/iu,
        /RLS/u,
        /non-goals/iu,
        /Requirement/u,
        /Session/u,
        /Agent/iu,
        /Lease/iu,
        /Steward/iu,
      ],
      "design.md": [
        /actor/iu,
        /authentication/iu,
        /authorization/iu,
        /RLS/u,
        /FORCE RLS/u,
        /Electron/iu,
        /Runtime/iu,
        /diagnostic/iu,
      ],
      "tasks.md": Array.from(
        { length: 9 },
        (_, index) => new RegExp(`(?:^|\\n)${index + 1}\\.`, "u"),
      ),
      "scenarios.md": [
        /positive-human/u,
        /email-rejection/u,
        /refresh-concurrency/u,
        /refresh_token_reused/u,
        /dependency-failure/u,
        /dependency_unavailable/u,
        /Secret/u,
        /secret_boundary_violation/u,
        /recovery/u,
        /identity_recovered/u,
        /cross-tenant-IDOR/u,
        /RLS/u,
        /endpoint-rejection/u,
        /endpoint_credential_invalid/u,
        /renderer-secret/u,
        /ops-diagnostic/u,
        /ops-rejection/u,
        /immutable/iu,
        /audit/iu,
      ],
    },
  },
};

export function validateOpenSpec(root: string): OpenSpecViolation[] {
  const changesRoot = join(root, "openspec/changes");
  const violations: OpenSpecViolation[] = [];
  const knownChanges = new Set(Object.keys(changeRules));

  if (existsSync(changesRoot)) {
    for (const entry of readdirSync(changesRoot, { withFileTypes: true })) {
      if (!knownChanges.has(entry.name)) {
        violations.push({
          code: "legacy_openspec_state_present",
          path: `openspec/changes/${entry.name}`,
        });
      }
    }
  }

  for (const [changeName, rule] of Object.entries(changeRules)) {
    const changeRoot = join(changesRoot, changeName);
    if (!rule.required && !existsSync(changeRoot)) continue;

    for (const [file, patterns] of Object.entries(rule.files)) {
      const path = `openspec/changes/${changeName}/${file}`;
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
  }

  return violations;
}
