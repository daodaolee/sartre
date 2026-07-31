import {
  appendFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXPECTED_WORKSPACES,
  REQUIRED_ROOT_SCRIPTS,
  validateRepositoryPolicy,
} from "./repository-policy.js";

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

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function createPolicyFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "sartre-repository-policy-"));
  writeFileSync(join(root, ".node-version"), "24.11.0\n", "utf8");
  writeFileSync(
    join(root, ".gitignore"),
    "/.local-secrets/\nnode_modules/\ndist/\nout/\ncoverage/\nreports/**/raw/\n.env\n.env.*\n*.pem\n*.key\n*.tgz\n*.dmg\n*.zip\n*.asar\n",
    "utf8",
  );
  writeFileSync(
    join(root, ".dockerignore"),
    ".git/\n.local-secrets/\nnode_modules/\ndist/\nout/\ncoverage/\nreports/**/raw/\n.env\n.env.*\n*.pem\n*.key\n*.tgz\n*.dmg\n*.zip\n*.asar\n",
    "utf8",
  );
  writeJson(join(root, "package.json"), {
    private: true,
    scripts: Object.fromEntries(
      REQUIRED_ROOT_SCRIPTS.map((script) => [
        script,
        script === "prepack" ? "tsx scripts/constitution/forbid-root-pack.ts" : "safe-command",
      ]),
    ),
  });
  writeFileSync(join(root, "pnpm-workspace.yaml"), canonicalPnpmWorkspace, "utf8");

  for (const workspace of EXPECTED_WORKSPACES) {
    mkdirSync(join(root, workspace), { recursive: true });
    writeJson(join(root, workspace, "package.json"), {
      scripts: { typecheck: "tsc --noEmit", test: "vitest run", build: "tsc" },
    });
  }

  return root;
}

describe("repository policy", () => {
  it("accepts the complete root and eight-workspace constitution", () => {
    expect(REQUIRED_ROOT_SCRIPTS).toContain("docker-context:check");
    expect(validateRepositoryPolicy(createPolicyFixture())).toEqual([]);
  });

  it("accepts the actual repository pnpm workspace constitution", () => {
    expect(validateRepositoryPolicy(process.cwd())).not.toContainEqual(
      expect.objectContaining({ code: expect.stringMatching(/^workspace_config_/u) }),
    );
  });

  it("rejects a missing pnpm workspace constitution", () => {
    const root = createPolicyFixture();
    rmSync(join(root, "pnpm-workspace.yaml"));

    expect(validateRepositoryPolicy(root)).toContainEqual({
      code: "workspace_config_missing",
      path: "pnpm-workspace.yaml",
      detail: "pnpm-workspace.yaml",
    });
  });

  it("rejects a pnpm workspace constitution symlink without reading its target", () => {
    const root = createPolicyFixture();
    const externalRoot = mkdtempSync(join(tmpdir(), "sartre-external-pnpm-workspace-"));
    const externalConfig = join(externalRoot, "pnpm-workspace.yaml");
    writeFileSync(externalConfig, canonicalPnpmWorkspace, "utf8");
    rmSync(join(root, "pnpm-workspace.yaml"));
    symlinkSync(externalConfig, join(root, "pnpm-workspace.yaml"), "file");

    expect(validateRepositoryPolicy(root)).toContainEqual({
      code: "workspace_config_missing",
      path: "pnpm-workspace.yaml",
      detail: "pnpm-workspace.yaml",
    });
  });

  it.each([
    ["shrunk", canonicalPnpmWorkspace.replace('  - "apps/*"\n', "")],
    [
      "expanded",
      canonicalPnpmWorkspace.replace('  - "packages/*"\n', '  - "packages/*"\n  - "packages/**"\n'),
    ],
    [
      "excluded",
      canonicalPnpmWorkspace.replace(
        '  - "packages/*"\n',
        '  - "packages/*"\n  - "!packages/legacy"\n',
      ),
    ],
    ["weakened security override", canonicalPnpmWorkspace.replace("5.0.8", "5.0.7")],
    ["extra key", `${canonicalPnpmWorkspace}catalog:\n  react: 19.2.7\n`],
  ])("rejects a %s pnpm workspace constitution", (_description, content) => {
    const root = createPolicyFixture();
    writeFileSync(join(root, "pnpm-workspace.yaml"), content, "utf8");

    expect(validateRepositoryPolicy(root)).toContainEqual({
      code: "workspace_config_drift",
      path: "pnpm-workspace.yaml",
      detail: "canonical_content",
    });
  });

  it("accepts Docker policy comments and blank lines", () => {
    const root = createPolicyFixture();
    appendFileSync(join(root, ".dockerignore"), "\n# retained explanation\n\n", "utf8");

    expect(validateRepositoryPolicy(root)).toEqual([]);
  });

  it("rejects an active Docker ignore negation after required exclusions", () => {
    const root = createPolicyFixture();
    appendFileSync(join(root, ".dockerignore"), "!.local-secrets/development.env\n", "utf8");

    expect(validateRepositoryPolicy(root)).toContainEqual({
      code: "dockerignore_negation_unsafe",
      path: ".dockerignore",
      detail: "line:16",
    });
  });

  it("fails closed when the Docker ignore file is missing", () => {
    const root = createPolicyFixture();
    rmSync(join(root, ".dockerignore"));

    expect(validateRepositoryPolicy(root)).toContainEqual({
      code: "missing_file",
      path: ".dockerignore",
      detail: ".dockerignore",
    });
  });

  it("fails closed without following a Docker ignore symlink outside the repository", () => {
    const root = createPolicyFixture();
    const externalRoot = mkdtempSync(join(tmpdir(), "sartre-external-dockerignore-"));
    const externalIgnore = join(externalRoot, ".dockerignore");
    writeFileSync(externalIgnore, ".local-secrets/\nnode_modules/\n", "utf8");
    rmSync(join(root, ".dockerignore"));
    symlinkSync(externalIgnore, join(root, ".dockerignore"), "file");

    expect(validateRepositoryPolicy(root)).toContainEqual({
      code: "missing_file",
      path: ".dockerignore",
      detail: ".dockerignore",
    });
  });

  it("validates Docker exclusion policy without traversing forbidden sentinel directories", () => {
    const root = createPolicyFixture();
    for (const path of [
      ".local-secrets/sentinel",
      "node_modules/sentinel",
      "dist/sentinel",
      "reports/example/raw/sentinel",
    ]) {
      mkdirSync(join(root, path), { recursive: true });
    }

    expect(validateRepositoryPolicy(root)).toEqual([]);
  });

  it("rejects any target workspace that omits typecheck, test, or build", () => {
    const root = createPolicyFixture();
    writeJson(join(root, "apps/hub-worker/package.json"), {
      scripts: { typecheck: "tsc --noEmit", test: "vitest run" },
    });

    expect(validateRepositoryPolicy(root)).toContainEqual({
      code: "workspace_script_missing",
      path: "apps/hub-worker/package.json",
      detail: "build",
    });
  });

  it("rejects a root prepack command that does not deliberately fail", () => {
    const root = createPolicyFixture();
    const scripts = Object.fromEntries(
      REQUIRED_ROOT_SCRIPTS.map((script) => [script, script === "prepack" ? "echo pack" : "safe"]),
    );
    writeJson(join(root, "package.json"), { private: true, scripts });

    expect(validateRepositoryPolicy(root)).toContainEqual({
      code: "root_packaging_not_prohibited",
      path: "package.json",
      detail: "prepack",
    });
  });

  it("rejects an unexpected ninth app or package workspace", () => {
    const root = createPolicyFixture();
    mkdirSync(join(root, "apps/unexpected"), { recursive: true });
    writeJson(join(root, "apps/unexpected/package.json"), {
      scripts: { typecheck: "tsc --noEmit", test: "vitest run", build: "tsc" },
    });

    expect(validateRepositoryPolicy(root)).toContainEqual({
      code: "workspace_unexpected",
      path: "apps/unexpected/package.json",
      detail: "apps/unexpected",
    });
  });

  it("rejects an expected workspace missing from the package.json set", () => {
    const root = createPolicyFixture();
    rmSync(join(root, "packages/sdk/package.json"));

    expect(validateRepositoryPolicy(root)).toContainEqual({
      code: "workspace_missing",
      path: "packages/sdk/package.json",
      detail: "packages/sdk",
    });
  });

  it("does not follow an expected workspace symlink outside the repository", () => {
    const root = createPolicyFixture();
    const externalRoot = mkdtempSync(join(tmpdir(), "sartre-external-workspace-"));
    writeFileSync(join(externalRoot, "package.json"), "external invalid json", "utf8");
    rmSync(join(root, "packages/sdk"), { recursive: true });
    symlinkSync(externalRoot, join(root, "packages/sdk"), "dir");

    expect(() => validateRepositoryPolicy(root)).not.toThrow();
    const violations = validateRepositoryPolicy(root);
    expect(violations).toContainEqual({
      code: "workspace_missing",
      path: "packages/sdk/package.json",
      detail: "packages/sdk",
    });
    expect(violations).toContainEqual({
      code: "workspace_script_missing",
      path: "packages/sdk/package.json",
      detail: "build",
    });
  });

  it("does not follow an expected package manifest symlink outside the repository", () => {
    const root = createPolicyFixture();
    const externalRoot = mkdtempSync(join(tmpdir(), "sartre-external-workspace-"));
    const externalManifest = join(externalRoot, "package.json");
    writeFileSync(externalManifest, "external invalid json", "utf8");
    rmSync(join(root, "packages/sdk/package.json"));
    symlinkSync(externalManifest, join(root, "packages/sdk/package.json"), "file");

    expect(() => validateRepositoryPolicy(root)).not.toThrow();
    const violations = validateRepositoryPolicy(root);
    expect(violations).toContainEqual({
      code: "workspace_missing",
      path: "packages/sdk/package.json",
      detail: "packages/sdk",
    });
    expect(violations).toContainEqual({
      code: "workspace_script_missing",
      path: "packages/sdk/package.json",
      detail: "build",
    });
  });

  it("rejects an unexpected workspace symlink without following it", () => {
    const root = createPolicyFixture();
    const externalRoot = mkdtempSync(join(tmpdir(), "sartre-external-workspace-"));
    writeJson(join(externalRoot, "package.json"), {
      scripts: { typecheck: "tsc --noEmit", test: "vitest run", build: "tsc" },
    });
    symlinkSync(externalRoot, join(root, "apps/unexpected"), "dir");

    expect(validateRepositoryPolicy(root)).toContainEqual({
      code: "workspace_unexpected",
      path: "apps/unexpected/package.json",
      detail: "apps/unexpected",
    });
  });
});
