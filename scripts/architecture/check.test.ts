import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { checkArchitecture } from "./check.js";
import { loadTsConfig } from "./config-resolution.js";
import {
  createArchitectureFixture,
  readFixtureJson,
  writeFixtureFile,
  writeFixtureJson,
} from "./fixtures/repository.js";
import { createTargetModules } from "./model.js";

const fixtureRoots: string[] = [];

function createFixture(): string {
  const root = createArchitectureFixture();
  fixtureRoots.push(root);
  return root;
}

function expectRule(root: string, ruleId: string): void {
  expect(checkArchitecture(root)).toContainEqual(
    expect.objectContaining({
      ruleId,
      file: expect.any(String),
      line: expect.any(Number),
      remediation: expect.any(String),
    }),
  );
}

function templateInterpolation(value: string): string {
  return ["$", "{", JSON.stringify(value), "}"].join("");
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("architecture dependency boundaries", () => {
  it("accepts the canonical eight-module graph", () => {
    expect(checkArchitecture(createFixture())).toEqual([]);
  });

  it.each(["@nestjs/common", "electron", "node:fs", "http"])(
    "rejects domain dependency on %s",
    (specifier) => {
      const root = createFixture();
      writeFixtureFile(
        root,
        "packages/domain/src/index.ts",
        `import ${JSON.stringify(specifier)};\n`,
      );

      expectRule(root, "domain_dependency_forbidden");
    },
  );

  it("rejects a scoped app source-subpath import", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "apps/hub-api/src/index.ts",
      'export { fixture } from "@sartre/hub-worker/src/index.js";\n',
    );

    expectRule(root, "app_source_import_forbidden");
  });

  it("rejects a relative app-to-app source import", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "apps/hub-api/src/index.ts",
      'import "../../hub-worker/src/index.js";\n',
    );

    expectRule(root, "app_source_import_forbidden");
  });

  it("rejects a disallowed package import direction", () => {
    const root = createFixture();
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "@sartre/domain";\n');

    expectRule(root, "dependency_direction_forbidden");
  });

  it("rejects require and dynamic import bypasses", () => {
    const requireRoot = createFixture();
    writeFixtureFile(
      requireRoot,
      "packages/sdk/src/index.ts",
      'const domain = require("@sartre/domain");\nexport { domain };\n',
    );
    expectRule(requireRoot, "dependency_direction_forbidden");

    const dynamicRoot = createFixture();
    writeFixtureFile(
      dynamicRoot,
      "packages/sdk/src/index.ts",
      'export const domain = import("@sartre/domain/src/index.js");\n',
    );
    expectRule(dynamicRoot, "dependency_direction_forbidden");

    const dynamicOptionsRoot = createFixture();
    writeFixtureFile(
      dynamicOptionsRoot,
      "packages/sdk/src/index.ts",
      'export const domain = import("@sartre/domain/data.json", { with: { type: "json" } });\n',
    );
    expectRule(dynamicOptionsRoot, "dependency_direction_forbidden");
  });

  it("resolves root path-alias indirection used by source", () => {
    const root = createFixture();
    writeFixtureJson(root, "tsconfig.base.json", {
      compilerOptions: {
        baseUrl: ".",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        paths: { "@domain/*": ["packages/domain/src/*"] },
      },
    });
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "@domain/index.js";\n');

    expectRule(root, "dependency_direction_forbidden");
  });

  it("rejects a module-local tsconfig path crossing the graph", () => {
    const root = createFixture();
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: "../../tsconfig.base.json",
      compilerOptions: {
        baseUrl: "../..",
        paths: { "@runtime/*": ["packages/runtime-core/src/*"] },
      },
      include: ["src/**/*.ts"],
    });

    expectRule(root, "tsconfig_path_boundary_forbidden");
  });

  it("rejects a TypeScript project reference crossing the graph", () => {
    const root = createFixture();
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: "../../tsconfig.base.json",
      compilerOptions: { rootDir: "src" },
      references: [{ path: "../runtime-core" }],
    });

    expectRule(root, "tsconfig_reference_boundary_forbidden");
  });

  it("rejects a package dependency crossing the graph", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: {
        "@sartre/contracts": "workspace:*",
        "@sartre/domain": "workspace:*",
      },
    });

    expectRule(root, "manifest_dependency_direction_forbidden");
  });
});

describe("fail-closed module and config inventory", () => {
  it("rejects a missing root tsconfig", () => {
    const root = createFixture();
    rmSync(join(root, "tsconfig.base.json"));

    expectRule(root, "root_tsconfig_missing");
  });

  it("rejects invalid root and module tsconfig JSON", () => {
    const rootConfig = createFixture();
    writeFixtureFile(rootConfig, "tsconfig.base.json", "{ invalid\n");
    expectRule(rootConfig, "root_tsconfig_invalid");

    const moduleConfig = createFixture();
    writeFixtureFile(moduleConfig, "packages/sdk/tsconfig.json", "{ invalid\n");
    expectRule(moduleConfig, "module_tsconfig_invalid");
  });

  it("rejects missing, invalid, and misidentified module manifests", () => {
    const missing = createFixture();
    rmSync(join(missing, "packages/sdk/package.json"));
    expectRule(missing, "module_manifest_missing");

    const invalid = createFixture();
    writeFixtureFile(invalid, "packages/sdk/package.json", "{ invalid\n");
    expectRule(invalid, "module_manifest_invalid");

    const identity = createFixture();
    writeFixtureJson(identity, "packages/sdk/package.json", {
      name: "@sartre/not-sdk",
      private: true,
    });
    expectRule(identity, "module_package_identity_invalid");
  });

  it("rejects an extra app or package module", () => {
    const root = createFixture();
    writeFixtureJson(root, "packages/rogue/package.json", {
      name: "@sartre/rogue",
      private: true,
    });
    writeFixtureJson(root, "packages/rogue/tsconfig.json", { compilerOptions: {} });
    writeFixtureFile(root, "packages/rogue/src/index.ts", "export const rogue = true;\n");

    expectRule(root, "module_inventory_extra");
  });
});

describe("specification re-review A - config and inventory", () => {
  it("preflights every TypeScript extends array target before recursive parsing", () => {
    const root = createFixture();
    const externalRoot = createFixture();
    writeFixtureJson(root, "configs/sdk-base.json", {
      extends: "../tsconfig.base.json",
      compilerOptions: { rootDir: "../packages/sdk/src" },
    });
    writeFixtureFile(externalRoot, "outside-invalid.json", "{ invalid outside sentinel\n");
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: ["../../configs/sdk-base.json", join(externalRoot, "outside-invalid.json")],
      compilerOptions: { rootDir: "src" },
      include: ["src/**/*.ts"],
    });

    const violations = checkArchitecture(root);
    expect(violations).toContainEqual(
      expect.objectContaining({
        ruleId: "tsconfig_extends_outside_graph",
        file: "packages/sdk/tsconfig.json",
      }),
    );
    expect(violations).not.toContainEqual(
      expect.objectContaining({
        ruleId: "module_tsconfig_invalid",
        file: "packages/sdk/tsconfig.json",
      }),
    );
  });

  it("validates only the final effective paths after a child override", () => {
    const root = createFixture();
    writeFixtureJson(root, "configs/sdk-base.json", {
      extends: "../tsconfig.base.json",
      compilerOptions: {
        baseUrl: "..",
        paths: { "@contracts/*": ["missing-parent/*"] },
      },
    });
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: "../../configs/sdk-base.json",
      compilerOptions: {
        baseUrl: "../..",
        rootDir: "src",
        paths: { "@contracts/*": ["packages/contracts/src/*"] },
      },
      include: ["src/**/*.ts"],
    });

    expect(checkArchitecture(root)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "tsconfig_path_target_unresolved" }),
      ]),
    );
  });

  it("validates every fallback from inherited final paths", () => {
    const root = createFixture();
    writeFixtureJson(root, "configs/sdk-base.json", {
      extends: "../tsconfig.base.json",
      compilerOptions: {
        baseUrl: "..",
        paths: {
          "@contracts/*": ["missing-inherited/*", "packages/contracts/src/*"],
        },
      },
    });
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: "../../configs/sdk-base.json",
      compilerOptions: { rootDir: "src" },
      include: ["src/**/*.ts"],
    });

    expectRule(root, "tsconfig_path_target_unresolved");
  });

  it("reports a stable inventory violation when an inventory container cannot be enumerated", () => {
    const root = createFixture();
    rmSync(join(root, "apps"), { recursive: true, force: true });
    writeFixtureFile(root, "apps", "not a directory\n");

    expectRule(root, "module_inventory_unreadable");
  });
});

describe("third specification re-review - safe module containers", () => {
  it.each(["apps", "packages"])(
    "rejects an unsafe %s container without enumerating its outside target",
    (container) => {
      const root = createFixture();
      const externalRoot = createFixture();
      const marker = "outside-read-marker";
      const externalContainer = join(externalRoot, `${container}-sentinel`);
      writeFixtureFile(externalRoot, `${container}-sentinel/${marker}/marker.ts`, "marker\n");
      rmSync(join(root, container), { recursive: true, force: true });
      symlinkSync(externalContainer, join(root, container), "dir");

      const violations = checkArchitecture(root);
      expect(violations).toContainEqual(
        expect.objectContaining({
          ruleId: "module_inventory_unreadable",
          file: container,
        }),
      );
      expect(violations.map((candidate) => candidate.file).join("\n")).not.toContain(marker);
    },
  );

  it("accepts canonical real apps and packages directories", () => {
    expect(checkArchitecture(createFixture())).toEqual([]);
  });
});

describe("fourth specification re-review - config no-outside-read", () => {
  it("rejects a module source symlink before TypeScript file enumeration", () => {
    const root = createFixture();
    const externalRoot = createFixture();
    const marker = "outside-read-marker";
    writeFixtureFile(externalRoot, `outside-source/${marker}.ts`, "export const marker = true;\n");
    rmSync(join(root, "packages/sdk/src"), { recursive: true, force: true });
    symlinkSync(join(externalRoot, "outside-source"), join(root, "packages/sdk/src"), "dir");
    const modules = createTargetModules(root);
    const sdk = modules.find((module) => module.id === "packages/sdk");
    expect(sdk).toBeDefined();

    const config = loadTsConfig(
      root,
      modules,
      join(root, "packages/sdk/tsconfig.json"),
      "module",
      sdk,
    );

    expect(config?.violations).toContainEqual(
      expect.objectContaining({ ruleId: "tsconfig_unsafe_path" }),
    );
    expect(config?.parsed.fileNames.join("\n")).not.toContain(marker);
  });

  it("rejects an external baseUrl without resolving its bare import", () => {
    const root = createFixture();
    const externalRoot = createFixture();
    const marker = "outside-bare-marker";
    writeFixtureFile(externalRoot, `outside-base/${marker}.ts`, "export const marker = true;\n");
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: "../../tsconfig.base.json",
      compilerOptions: { baseUrl: join(externalRoot, "outside-base"), rootDir: "src" },
      include: ["src/**/*.ts"],
    });
    writeFixtureFile(root, "packages/sdk/src/index.ts", `import ${JSON.stringify(marker)};\n`);

    const violations = checkArchitecture(root);
    expect(violations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ruleId: "tsconfig_unsafe_path" }),
        expect.objectContaining({ ruleId: "source_specifier_unresolved" }),
      ]),
    );
    expect(violations.map((candidate) => candidate.file).join("\n")).not.toContain(marker);
  });

  it.each(["files", "include", "exclude", "rootDirs", "typeRoots", "paths", "references"])(
    "rejects outside path-bearing field %s before TypeScript parse",
    (field) => {
      const root = createFixture();
      const externalRoot = createFixture();
      const externalFile = join(externalRoot, "packages/domain/src/index.ts");
      const externalDirectory = join(externalRoot, "packages/domain");
      const config: Record<string, unknown> = {
        extends: "../../tsconfig.base.json",
        compilerOptions: { rootDir: "src" },
        include: ["src/**/*.ts"],
      };
      const compilerOptions = config.compilerOptions as Record<string, unknown>;
      if (field === "files") config.files = [externalFile];
      if (field === "include") config.include = [`${externalDirectory}/src/**/*.ts`];
      if (field === "exclude") config.exclude = [`${externalDirectory}/src/**/*.ts`];
      if (field === "rootDirs") compilerOptions.rootDirs = [externalDirectory];
      if (field === "typeRoots") compilerOptions.typeRoots = [externalDirectory];
      if (field === "paths") {
        compilerOptions.baseUrl = ".";
        compilerOptions.paths = { "@outside/*": [`${externalDirectory}/src/*`] };
      }
      if (field === "references") config.references = [{ path: externalDirectory }];
      writeFixtureJson(root, "packages/sdk/tsconfig.json", config);

      expectRule(root, "tsconfig_unsafe_path");
    },
  );

  it("rejects an ambiguous glob escape before TypeScript parse", () => {
    const root = createFixture();
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: "../../tsconfig.base.json",
      compilerOptions: { rootDir: "src" },
      include: ["src/{safe,../../outside}/**/*.ts"],
    });

    expectRule(root, "tsconfig_unsafe_path");
  });

  it("applies path preflight to inherited contained configs", () => {
    const root = createFixture();
    const externalRoot = createFixture();
    writeFixtureJson(root, "configs/sdk-base.json", {
      extends: "../tsconfig.base.json",
      compilerOptions: { baseUrl: externalRoot },
    });
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: "../../configs/sdk-base.json",
      compilerOptions: { rootDir: "src" },
      include: ["src/**/*.ts"],
    });

    expectRule(root, "tsconfig_unsafe_path");
  });

  it("accepts legitimate contained root config paths", () => {
    const root = createFixture();
    writeFixtureJson(root, "tsconfig.base.json", {
      compilerOptions: {
        baseUrl: ".",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        rootDirs: ["apps", "packages"],
        typeRoots: ["node_modules/@types"],
      },
    });

    expect(checkArchitecture(root)).toEqual([]);
  });
});

describe("fifth specification re-review - config metadata preflight", () => {
  it("rejects an inherited contained baseUrl symlink before TypeScript access", () => {
    const root = createFixture();
    const externalRoot = createFixture();
    const marker = "outside-config-base-marker";
    writeFixtureFile(externalRoot, `outside-base/${marker}.d.ts`, "export const marker: true;\n");
    writeFixtureFile(root, "config-links/.keep", "");
    symlinkSync(join(externalRoot, "outside-base"), join(root, "config-links/outside-base"), "dir");
    writeFixtureJson(root, "configs/sdk-base.json", {
      extends: "../tsconfig.base.json",
      compilerOptions: { baseUrl: "../config-links/outside-base" },
    });
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: "../../configs/sdk-base.json",
      compilerOptions: { rootDir: "src" },
      files: [],
    });
    const modules = createTargetModules(root);
    const sdk = modules.find((module) => module.id === "packages/sdk");
    expect(sdk).toBeDefined();

    const config = loadTsConfig(
      root,
      modules,
      join(root, "packages/sdk/tsconfig.json"),
      "module",
      sdk,
    );

    expect(config?.violations).toContainEqual(
      expect.objectContaining({ ruleId: "tsconfig_unsafe_path" }),
    );
    expect(config?.parsed.fileNames.join("\n")).not.toContain(marker);
    expect(config?.violations.map((candidate) => candidate.file).join("\n")).not.toContain(marker);
  });
});

describe("sixth specification re-review - config paths before reads", () => {
  it("rejects an extends path with an intermediate contained symlink before reading it", () => {
    const root = createFixture();
    const marker = "extends-read-detection-marker";
    writeFixtureFile(root, "configs/sentinel/base.json", `${marker} {\n`);
    writeFixtureFile(root, "node_modules/.keep", "");
    symlinkSync(join(root, "configs/sentinel"), join(root, "node_modules/config-link"), "dir");
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: "../../node_modules/config-link/base.json",
      compilerOptions: { rootDir: "src" },
      files: [],
    });
    const modules = createTargetModules(root);
    const sdk = modules.find((module) => module.id === "packages/sdk");
    expect(sdk).toBeDefined();

    const config = loadTsConfig(
      root,
      modules,
      join(root, "packages/sdk/tsconfig.json"),
      "module",
      sdk,
    );

    expect(config?.violations).toContainEqual(
      expect.objectContaining({ ruleId: "tsconfig_extends_outside_graph" }),
    );
    expect(config?.violations).not.toContainEqual(
      expect.objectContaining({ ruleId: "module_tsconfig_invalid" }),
    );
    expect(config?.parsed.fileNames.join("\n")).not.toContain(marker);
  });

  it("rejects parent traversal after a wildcard before directory enumeration", () => {
    const root = createFixture();
    const outside = join(root, "../outside");
    mkdirSync(outside, { recursive: true });
    fixtureRoots.push(outside);
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: "../../tsconfig.base.json",
      compilerOptions: { rootDir: "src" },
      include: ["src/*/../../../../outside/*.ts"],
    });

    expectRule(root, "tsconfig_unsafe_path");
  });
});

describe("fail-closed source specifier resolution", () => {
  it("checks cross-app imports in target test files", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "apps/hub-api/src/cross-app.test.ts",
      'import "@sartre/hub-worker/src/index.js";\n',
    );

    expectRule(root, "app_source_import_forbidden");
  });

  it("checks import type and canonical package edges in target test files", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "packages/domain/src/cross-package.test.ts",
      'import type { fixture } from "@sartre/contracts";\nexport type Fixture = typeof fixture;\n',
    );

    expectRule(root, "dependency_direction_forbidden");
  });

  it("rejects nonliteral require and dynamic import specifiers", () => {
    const requireRoot = createFixture();
    writeFixtureFile(
      requireRoot,
      "packages/sdk/src/index.ts",
      'const target = "@sartre/domain";\nexport const loaded = require(target);\n',
    );
    expectRule(requireRoot, "source_specifier_nonliteral");

    const importRoot = createFixture();
    writeFixtureFile(
      importRoot,
      "packages/sdk/src/index.ts",
      'const target = "@sartre/domain";\nexport const loaded = import(target, { with: { type: "json" } });\n',
    );
    expectRule(importRoot, "source_specifier_nonliteral");
  });

  it("rejects an unresolved target-module source specifier", () => {
    const root = createFixture();
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "unregistered-boundary";\n');

    expectRule(root, "source_specifier_unresolved");
  });
});

describe("specification re-review B - source resolution", () => {
  it("checks ImportTypeNode canonical edges", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "packages/sdk/src/index.ts",
      'export type DomainFixture = import("@sartre/domain").fixture;\n',
    );

    expectRule(root, "dependency_direction_forbidden");
  });

  it("rejects a missing relative source target inside the lexical module", () => {
    const root = createFixture();
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "./missing.js";\n');

    expectRule(root, "source_specifier_unresolved");
  });

  it("rejects a missing canonical package subpath", () => {
    const root = createFixture();
    writeFixtureFile(root, "apps/electron-app/src/main.ts", 'import "@sartre/sdk/missing";\n');

    expectRule(root, "source_specifier_unresolved");
  });

  it("rejects a root path alias whose requested file does not exist", () => {
    const root = createFixture();
    writeFixtureJson(root, "tsconfig.base.json", {
      compilerOptions: {
        baseUrl: ".",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        paths: { "@sdk-local/*": ["packages/sdk/src/*"] },
      },
    });
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "@sdk-local/missing.js";\n');

    expectRule(root, "source_specifier_unresolved");
  });
});

describe("code-quality re-review - clean canonical source resolution", () => {
  it("resolves allowed canonical root and subpath imports from source without dist", () => {
    const root = createFixture();
    const contractsManifest = readFixtureJson(root, "packages/contracts/package.json");
    writeFixtureJson(root, "packages/contracts/package.json", {
      ...contractsManifest,
      exports: {
        ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
        "./feature": { types: "./dist/feature.d.ts", default: "./dist/feature.js" },
      },
    });
    writeFixtureFile(root, "packages/contracts/src/feature.ts", "export const feature = true;\n");
    writeFixtureFile(
      root,
      "packages/sdk/src/index.ts",
      'import "@sartre/contracts";\nimport "@sartre/contracts/feature";\n',
    );

    expect(checkArchitecture(root)).toEqual([]);
  });

  it.each([
    ["string", "./dist/index.js"],
    ["array", [null, "./dist/index.js"]],
    ["conditional", { types: "./dist/index.d.ts", default: "./dist/index.js" }],
  ])("accepts root exposure through a %s target shape", (_case, exportsValue) => {
    const root = createFixture();
    const contractsManifest = readFixtureJson(root, "packages/contracts/package.json");
    writeFixtureJson(root, "packages/contracts/package.json", {
      ...contractsManifest,
      exports: exportsValue,
    });
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "@sartre/contracts";\n');

    expect(checkArchitecture(root)).toEqual([]);
  });

  it("rejects a contained source subpath that is not explicitly exported", () => {
    const root = createFixture();
    const contractsManifest = readFixtureJson(root, "packages/contracts/package.json");
    writeFixtureJson(root, "packages/contracts/package.json", {
      ...contractsManifest,
      exports: { ".": "./dist/index.js" },
    });
    writeFixtureFile(root, "packages/contracts/src/internal.ts", "export const internal = true;\n");
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "@sartre/contracts/internal";\n');

    expectRule(root, "source_specifier_unresolved");
  });

  it.each([
    ["missing exports", undefined],
    ["null root", null],
    ["null-only root array", [null]],
    ["null explicit root", { ".": null }],
  ])("rejects a canonical import with %s", (_case, exportsValue) => {
    const root = createFixture();
    const contractsManifest = readFixtureJson(root, "packages/contracts/package.json");
    if (exportsValue !== undefined) {
      writeFixtureJson(root, "packages/contracts/package.json", {
        ...contractsManifest,
        exports: exportsValue,
      });
    }
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "@sartre/contracts";\n');

    expectRule(root, "source_specifier_unresolved");
  });

  it("rejects a missing canonical source subpath even when exports declare dist output", () => {
    const root = createFixture();
    const contractsManifest = readFixtureJson(root, "packages/contracts/package.json");
    writeFixtureJson(root, "packages/contracts/package.json", {
      ...contractsManifest,
      exports: {
        "./missing": { types: "./dist/missing.d.ts", default: "./dist/missing.js" },
      },
    });
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "@sartre/contracts/missing";\n');

    expectRule(root, "source_specifier_unresolved");
  });

  it.each([
    ["mixed condition/subpath keys", { ".": "./dist/index.js", default: "./dist/index.js" }],
    ["wildcard subpath", { "./*": "./dist/*.js" }],
    ["invalid scalar", 42],
    ["invalid nested target", { ".": { default: false } }],
  ])("rejects invalid export shape %s", (_case, exportsValue) => {
    const root = createFixture();
    const contractsManifest = readFixtureJson(root, "packages/contracts/package.json");
    writeFixtureJson(root, "packages/contracts/package.json", {
      ...contractsManifest,
      exports: exportsValue,
    });

    expectRule(root, "manifest_exports_invalid");
  });
});

describe("quality re-review - canonical TypeScript extension mapping", () => {
  it("rejects an exported mjs subpath backed only by a ts source", () => {
    const root = createFixture();
    const contractsManifest = readFixtureJson(root, "packages/contracts/package.json");
    writeFixtureJson(root, "packages/contracts/package.json", {
      ...contractsManifest,
      exports: { "./feature.mjs": "./dist/feature.mjs" },
    });
    writeFixtureFile(root, "packages/contracts/src/feature.ts", "export const feature = true;\n");
    writeFixtureFile(
      root,
      "packages/sdk/src/index.ts",
      'import "@sartre/contracts/feature.mjs";\n',
    );

    expectRule(root, "source_specifier_unresolved");
  });

  it.each([
    ["feature.mjs", "feature.mts"],
    ["feature.mjs", "feature.d.mts"],
    ["feature.mjs", "feature.mjs"],
    ["feature.cjs", "feature.cts"],
    ["feature.cjs", "feature.d.cts"],
    ["feature.cjs", "feature.cjs"],
    ["feature.js", "feature.ts"],
    ["feature.js", "feature.tsx"],
    ["feature.js", "feature.d.ts"],
    ["feature.js", "feature.js"],
    ["feature.js", "feature.jsx"],
    ["feature", "feature.ts"],
    ["feature", "feature/index.ts"],
  ])("maps exported subpath %s to contained source %s", (exportSubpath, sourceSubpath) => {
    const root = createFixture();
    const contractsManifest = readFixtureJson(root, "packages/contracts/package.json");
    writeFixtureJson(root, "packages/contracts/package.json", {
      ...contractsManifest,
      exports: { [`./${exportSubpath}`]: `./dist/${exportSubpath}` },
    });
    writeFixtureFile(
      root,
      `packages/contracts/src/${sourceSubpath}`,
      "export const feature = true;\n",
    );
    writeFixtureFile(
      root,
      "packages/sdk/src/index.ts",
      `import ${JSON.stringify(`@sartre/contracts/${exportSubpath}`)};\n`,
    );

    expect(checkArchitecture(root)).toEqual([]);
  });

  it.each([
    ["root entry", null, "index.ts"],
    ["extensionless direct", "feature", "feature.ts"],
    ["extensionless index", "feature", "feature/index.ts"],
    ["mjs mts", "feature.mjs", "feature.mts"],
    ["mjs declaration", "feature.mjs", "feature.d.mts"],
    ["mjs source", "feature.mjs", "feature.mjs"],
    ["cjs cts", "feature.cjs", "feature.cts"],
    ["cjs declaration", "feature.cjs", "feature.d.cts"],
    ["cjs source", "feature.cjs", "feature.cjs"],
    ["js ts", "feature.js", "feature.ts"],
    ["js tsx", "feature.js", "feature.tsx"],
    ["js declaration", "feature.js", "feature.d.ts"],
    ["js source", "feature.js", "feature.js"],
    ["js jsx", "feature.js", "feature.jsx"],
  ])("analyzes the resolved target source for %s at %s", (_case, exportSubpath, sourceSubpath) => {
    const root = createFixture();
    const contractsManifest = readFixtureJson(root, "packages/contracts/package.json");
    const exportKey = exportSubpath ? `./${exportSubpath}` : ".";
    const importSpecifier = exportSubpath
      ? `@sartre/contracts/${exportSubpath}`
      : "@sartre/contracts";
    writeFixtureJson(root, "packages/contracts/package.json", {
      ...contractsManifest,
      exports: { [exportKey]: `./dist/${exportSubpath ?? "index.js"}` },
    });
    const targetPath = `packages/contracts/src/${sourceSubpath}`;
    writeFixtureFile(
      root,
      targetPath,
      'import "@sartre/domain";\nexport declare const feature: true;\n',
    );
    writeFixtureFile(
      root,
      "packages/sdk/src/index.ts",
      `import ${JSON.stringify(importSpecifier)};\n`,
    );

    expect(checkArchitecture(root)).toContainEqual(
      expect.objectContaining({
        ruleId: "dependency_direction_forbidden",
        file: targetPath,
        line: 1,
      }),
    );
  });
});

describe("fail-closed config and dependency aliases", () => {
  it("rejects an outside extends target before TypeScript recursive parsing", () => {
    const root = createFixture();
    const externalRoot = createFixture();
    writeFixtureFile(externalRoot, "tsconfig.base.json", "{ invalid external sentinel\n");
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: join(externalRoot, "tsconfig.base.json"),
      compilerOptions: { rootDir: "src" },
    });

    const violations = checkArchitecture(root);
    expect(violations).toContainEqual(
      expect.objectContaining({ ruleId: "tsconfig_extends_outside_graph" }),
    );
    expect(violations).not.toContainEqual(
      expect.objectContaining({
        ruleId: "module_tsconfig_invalid",
        file: "packages/sdk/tsconfig.json",
      }),
    );
  });

  it("rejects every unresolved tsconfig path fallback", () => {
    const root = createFixture();
    writeFixtureJson(root, "tsconfig.base.json", {
      compilerOptions: {
        baseUrl: ".",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        paths: { "@contracts/*": ["missing/*", "packages/contracts/src/*"] },
      },
    });
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "@contracts/index.js";\n');

    expectRule(root, "tsconfig_path_target_unresolved");
  });

  it("rejects project references outside the canonical graph", () => {
    const root = createFixture();
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: "../../tsconfig.base.json",
      compilerOptions: { rootDir: "src" },
      references: [{ path: "../../../outside-project" }],
    });

    expectRule(root, "tsconfig_reference_outside_graph");
  });

  it("rejects an unresolved project reference inside a canonical module", () => {
    const root = createFixture();
    writeFixtureJson(root, "packages/sdk/tsconfig.json", {
      extends: "../../tsconfig.base.json",
      compilerOptions: { rootDir: "src" },
      references: [{ path: "../contracts/missing-project" }],
    });

    expectRule(root, "tsconfig_reference_unresolved");
  });

  it.each(["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"])(
    "resolves workspace aliases in %s",
    (field) => {
      const root = createFixture();
      const manifest = readFixtureJson(root, "packages/sdk/package.json");
      writeFixtureJson(root, "packages/sdk/package.json", {
        ...manifest,
        [field]: { "domain-alias": "workspace:@sartre/domain@*" },
      });

      expectRule(root, "manifest_dependency_direction_forbidden");
    },
  );

  it("resolves file and link dependency aliases", () => {
    for (const protocol of ["file", "link"] as const) {
      const root = createFixture();
      const manifest = readFixtureJson(root, "packages/sdk/package.json");
      writeFixtureJson(root, "packages/sdk/package.json", {
        ...manifest,
        dependencies: { "domain-alias": `${protocol}:../domain` },
      });

      expectRule(root, "manifest_dependency_direction_forbidden");
    }
  });

  it("rejects a dependency alias outside the canonical graph", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { outside: "file:../../../outside-package" },
    });

    expectRule(root, "manifest_dependency_target_outside_graph");
  });
});

describe("specification re-review C - dependency protocols", () => {
  it("uses the actual npm alias identity instead of the dependency key", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "@sartre/contracts": "npm:@sartre/domain@1.0.0" },
    });

    expectRule(root, "manifest_dependency_direction_forbidden");
  });

  it("rejects a canonical dependency key aliased to a noncanonical npm identity", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "@sartre/contracts": "npm:external-contracts@1.0.0" },
    });

    expectRule(root, "manifest_dependency_target_outside_graph");
  });

  it("uses the dependency key identity for workspace star", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "@sartre/domain": "workspace:*" },
    });

    expectRule(root, "manifest_dependency_direction_forbidden");
  });

  it("uses the explicit actual identity for workspace package aliases", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "@sartre/contracts": "workspace:@sartre/domain@*" },
    });

    expectRule(root, "manifest_dependency_direction_forbidden");
  });

  it.each([
    ["file", "../domain/subdir"],
    ["link", "../domain/nested-package"],
  ])("rejects a %s target below a canonical module root", (protocol, relativeTarget) => {
    const root = createFixture();
    writeFixtureJson(root, `packages/domain/${relativeTarget.split("/").at(-1)}/package.json`, {
      name: "@sartre/domain",
      private: true,
    });
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "domain-alias": `${protocol}:${relativeTarget}` },
    });

    expectRule(root, "manifest_dependency_target_outside_graph");
  });

  it("rejects a canonical file target whose package identity is wrong", () => {
    const root = createFixture();
    writeFixtureJson(root, "packages/contracts/package.json", {
      name: "@sartre/not-contracts",
      private: true,
      type: "module",
    });
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "contracts-alias": "file:../contracts" },
    });

    expectRule(root, "manifest_dependency_target_outside_graph");
  });

  it.each(["npm:", "workspace:", "file:"])(
    "rejects an invalid or unresolved protocol target %s",
    (dependencyTarget) => {
      const root = createFixture();
      const manifest = readFixtureJson(root, "packages/sdk/package.json");
      writeFixtureJson(root, "packages/sdk/package.json", {
        ...manifest,
        dependencies: { "@sartre/contracts": dependencyTarget },
      });

      expectRule(root, "manifest_dependency_target_outside_graph");
    },
  );
});

describe("code-quality re-review - dependency diagnostic lines", () => {
  it("anchors a dependency violation to its section key after duplicate metadata text", () => {
    const root = createFixture();
    const manifest = {
      name: "@sartre/sdk",
      version: "0.1.0",
      private: true,
      type: "module",
      description: "@sartre/domain",
      dependencies: { "@sartre/domain": "workspace:*" },
    };
    const content = `${JSON.stringify(manifest, null, 2)}\n`;
    writeFixtureFile(root, "packages/sdk/package.json", content);
    const expectedLine =
      content.split("\n").findIndex((line) => line.trimStart().startsWith('"@sartre/domain":')) + 1;

    expect(checkArchitecture(root)).toContainEqual(
      expect.objectContaining({
        ruleId: "manifest_dependency_direction_forbidden",
        file: "packages/sdk/package.json",
        line: expectedLine,
      }),
    );
  });
});

describe("third specification re-review - strict dependency identities", () => {
  it("accepts the constitution dependency selector subset", () => {
    const root = createFixture();
    const sdkManifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...sdkManifest,
      dependencies: {
        "@sartre/contracts": "workspace:*",
        "contracts-alias": "npm:@sartre/contracts@^1.2.3",
      },
    });
    const runtimeManifest = readFixtureJson(root, "packages/runtime-core/package.json");
    writeFixtureJson(root, "packages/runtime-core/package.json", {
      ...runtimeManifest,
      optionalDependencies: {
        "domain-alias": "workspace:@sartre/domain@~1.2.3",
      },
    });

    expect(checkArchitecture(root)).toEqual([]);
  });

  it.each([
    ["@sartre/contracts/rogue", "1.0.0"],
    ["@sartre/rogue", "1.0.0"],
  ])("rejects non-exact canonical dependency key %s", (name, value) => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { [name]: value },
    });

    expect(checkArchitecture(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: expect.stringMatching(/^manifest_dependency_(?:invalid|target_outside_graph)$/u),
        }),
      ]),
    );
  });

  it.each([
    "npm:@sartre/contracts/rogue@1.0.0",
    "npm:@sartre/contracts@@1.0.0",
    "npm:@sartre/contracts@latest",
    "npm:@sartre/contracts@https://example.invalid/archive.tgz",
  ])("rejects malformed npm alias %s", (value) => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "contracts-alias": value },
    });

    expectRule(root, "manifest_dependency_target_outside_graph");
  });

  it.each([
    "workspace:@sartre/contracts/rogue@*",
    "workspace:@sartre/contracts@https://example.invalid/archive.tgz",
    "workspace:https://example.invalid/archive.tgz",
    "workspace:../contracts",
  ])("rejects malformed or unsupported workspace payload %s", (value) => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "@sartre/contracts": value },
    });

    expectRule(root, "manifest_dependency_target_outside_graph");
  });

  it("rejects a URL payload instead of treating it as a plain version", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "@sartre/contracts": "https://example.invalid/archive.tgz" },
    });

    expectRule(root, "manifest_dependency_target_outside_graph");
  });
});

describe("fourth specification re-review - dependency actual identity", () => {
  it("rejects workspace star for a noncanonical dependency key", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "external-workspace": "workspace:*" },
    });

    expectRule(root, "manifest_dependency_target_outside_graph");
  });

  it("rejects a workspace alias whose actual identity is noncanonical", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { alias: "workspace:external-workspace@1.2.3" },
    });

    expectRule(root, "manifest_dependency_target_outside_graph");
  });

  it("rejects an npm alias into an unknown Sartre namespace identity", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { alias: "npm:@sartre/rogue@1.2.3" },
    });

    expectRule(root, "manifest_dependency_target_outside_graph");
  });

  it("rejects a canonical key mapped to a different npm identity", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "@sartre/contracts": "npm:zod@4.4.3" },
    });

    expectRule(root, "manifest_dependency_target_outside_graph");
  });

  it("accepts a legitimate external npm alias", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "validation-tool": "npm:zod@4.4.3" },
    });

    expect(checkArchitecture(root)).toEqual([]);
  });

  it("applies domain restrictions to an npm alias actual identity", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/domain/package.json");
    writeFixtureJson(root, "packages/domain/package.json", {
      ...manifest,
      dependencies: { "framework-alias": "npm:@nestjs/common@1.2.3" },
    });

    expectRule(root, "domain_dependency_forbidden");
  });
});

describe("fourth specification re-review - mature SemVer validation", () => {
  it("pins semver and its types as direct root development dependencies", () => {
    const manifest = readFixtureJson(process.cwd(), "package.json");
    expect(manifest.devDependencies).toEqual(
      expect.objectContaining({ semver: "7.8.5", "@types/semver": "7.7.1" }),
    );
  });

  it.each(["01.2.3", "1.2.3-01"])("rejects invalid SemVer selector %s", (value) => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "validation-tool": value },
    });

    expectRule(root, "manifest_dependency_target_outside_graph");
  });

  it.each([
    "1.2.3-alpha-beta.1",
    ">=1.2.3 <2.0.0",
    ">=1.2.3+build.5 <2.0.0",
    "1.2.3 - 2.3.4",
    "^1.2.3 || ~2.0.0",
    "x",
  ])("accepts documented SemVer selector %s", (value) => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "validation-tool": value },
    });

    expect(checkArchitecture(root)).toEqual([]);
  });

  it.each(["latest", "https://example.invalid/archive.tgz"])(
    "continues to reject non-SemVer selector %s",
    (value) => {
      const root = createFixture();
      const manifest = readFixtureJson(root, "packages/sdk/package.json");
      writeFixtureJson(root, "packages/sdk/package.json", {
        ...manifest,
        dependencies: { "validation-tool": value },
      });

      expectRule(root, "manifest_dependency_target_outside_graph");
    },
  );
});

describe("fourth specification re-review - declared external imports", () => {
  function writeExternalPackage(root: string, name: string): void {
    writeFixtureJson(root, `node_modules/${name}/package.json`, {
      name,
      version: "1.2.3",
      types: "index.d.ts",
    });
    writeFixtureFile(root, `node_modules/${name}/index.d.ts`, "export const fixture: true;\n");
  }

  it("rejects a resolved but undeclared external package", () => {
    const root = createFixture();
    writeExternalPackage(root, "undeclared-tool");
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "undeclared-tool";\n');

    expectRule(root, "source_dependency_undeclared");
  });

  it("accepts a declared external package from contained node_modules", () => {
    const root = createFixture();
    writeExternalPackage(root, "declared-tool");
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "declared-tool": "1.2.3" },
    });
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "declared-tool";\n');

    expect(checkArchitecture(root)).toEqual([]);
  });
});

describe("fifth specification re-review - resolved external package identity", () => {
  function declareDependency(root: string, importKey: string, value = "1.2.3"): void {
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { [importKey]: value },
    });
  }

  function writeResolvedPackage(
    root: string,
    installRoot: string,
    importKey: string,
    packageName: string | undefined,
  ): void {
    if (packageName !== undefined) {
      writeFixtureJson(root, `${installRoot}/${importKey}/package.json`, {
        name: packageName,
        version: "1.2.3",
        types: "index.d.ts",
      });
    }
    writeFixtureFile(
      root,
      `${installRoot}/${importKey}/index.d.ts`,
      "export const fixture: true;\n",
    );
  }

  it.each([
    ["missing package identity", "node_modules", undefined],
    ["different actual identity", "node_modules", "different-tool"],
    ["module-local node_modules", "packages/sdk/node_modules", "declared-tool"],
  ])("rejects %s for a declared external import", (_case, installRoot, packageName) => {
    const root = createFixture();
    declareDependency(root, "declared-tool");
    writeResolvedPackage(root, installRoot, "declared-tool", packageName);
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "declared-tool";\n');

    expectRule(root, "source_dependency_identity_invalid");
  });

  it.each(["zod", "semver"])("accepts root-installed direct package %s", (packageName) => {
    const root = createFixture();
    declareDependency(root, packageName);
    writeResolvedPackage(root, "node_modules", packageName, packageName);
    writeFixtureFile(root, "packages/sdk/src/index.ts", `import ${JSON.stringify(packageName)};\n`);

    expect(checkArchitecture(root)).toEqual([]);
  });

  it("accepts root test tooling only when its resolved package identity matches", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "package.json");
    writeFixtureJson(root, "package.json", {
      ...manifest,
      devDependencies: { vitest: "4.1.10" },
    });
    writeResolvedPackage(root, "node_modules", "vitest", "vitest");
    writeFixtureFile(root, "packages/sdk/src/tooling.test.ts", 'import "vitest";\n');

    expect(checkArchitecture(root)).toEqual([]);
  });

  it("accepts an npm alias only when the installed package has its actual identity", () => {
    const root = createFixture();
    declareDependency(root, "validation-tool", "npm:zod@4.4.3");
    writeResolvedPackage(root, "node_modules", "validation-tool", "zod");
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "validation-tool";\n');

    expect(checkArchitecture(root)).toEqual([]);
  });
});

describe("sixth specification re-review - root package entry binding", () => {
  it("rejects a nested node_modules package.json that impersonates the import identity", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "declared-tool": "1.2.3" },
    });
    writeFixtureJson(root, "node_modules/declared-tool/package.json", {
      name: "outer-tool",
      version: "1.2.3",
      types: "node_modules/nested-entry/index.d.ts",
    });
    writeFixtureJson(root, "node_modules/declared-tool/node_modules/nested-entry/package.json", {
      name: "declared-tool",
      version: "1.2.3",
      types: "index.d.ts",
    });
    writeFixtureFile(
      root,
      "node_modules/declared-tool/node_modules/nested-entry/index.d.ts",
      "export const fixture: true;\n",
    );
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "declared-tool";\n');

    expectRule(root, "source_dependency_identity_invalid");
  });
});

describe("seventh specification re-review - first existing package entry", () => {
  it("does not fall back to pnpm when the direct package entry has the wrong identity", () => {
    const root = createFixture();
    const manifest = readFixtureJson(root, "packages/sdk/package.json");
    writeFixtureJson(root, "packages/sdk/package.json", {
      ...manifest,
      dependencies: { "declared-tool": "1.2.3" },
    });
    writeFixtureJson(root, "node_modules/declared-tool/package.json", {
      name: "wrong-tool",
      version: "1.2.3",
      types: "../.pnpm/node_modules/declared-tool/index.d.ts",
    });
    writeFixtureJson(root, "node_modules/.pnpm/node_modules/declared-tool/package.json", {
      name: "declared-tool",
      version: "1.2.3",
      types: "index.d.ts",
    });
    writeFixtureFile(
      root,
      "node_modules/.pnpm/node_modules/declared-tool/index.d.ts",
      "export const fixture: true;\n",
    );
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "declared-tool";\n');

    expectRule(root, "source_dependency_identity_invalid");
  });
});

describe("Electron renderer boundaries", () => {
  it.each([
    ['import { ipcRenderer } from "electron";\n', "renderer_raw_ipc_forbidden"],
    ['import { client } from "@sartre/sdk";\nexport { client };\n', "renderer_hub_sdk_forbidden"],
    ['import path from "node:path";\nexport { path };\n', "renderer_node_access_forbidden"],
    ['import "../../../local-runtime/src/index.js";\n', "renderer_runtime_access_forbidden"],
    ['export const projectRoot = "/Users/example/project";\n', "renderer_local_path_forbidden"],
  ])("rejects renderer bypass %#", (source, ruleId) => {
    const root = createFixture();
    writeFixtureFile(root, "apps/electron-app/src/renderer/index.ts", source);

    expectRule(root, ruleId);
  });
});

describe("fail-closed renderer classification", () => {
  it.each([
    ["apps/electron-app/renderer/index.ts", 'import { ipcRenderer } from "electron";\n'],
    ["apps/electron-app/src/ui/renderer/view.ts", 'import path from "node:path";\n'],
    ["apps/electron-app/src/renderer-entry.ts", 'import "@sartre/sdk";\n'],
  ])("classifies renderer entry %s", (path, source) => {
    const root = createFixture();
    writeFixtureFile(root, path, source);

    expect(checkArchitecture(root)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: expect.stringMatching(/^renderer_/u),
          file: path,
        }),
      ]),
    );
  });

  it.each([
    ["/tmp/sartre-project", "POSIX tmp"],
    ["/Users/example/sartre", "macOS user"],
    ["file:///Users/example/sartre", "file URL"],
    ["C:\\Users\\example\\sartre", "Windows absolute"],
  ])("rejects %s renderer local path", (localPath) => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "apps/electron-app/src/ui/renderer/view.ts",
      `export const projectRoot = ${JSON.stringify(localPath)};\n`,
    );

    expectRule(root, "renderer_local_path_forbidden");
  });
});

describe("specification re-review D - renderer, legacy, and static strings", () => {
  it.each([
    "/Users",
    "/private",
    "/Volumes",
    "/System",
    "/Library",
    "/Applications",
    "/home",
    "/root",
    "/tmp",
    "/var",
    "/etc",
    "/opt",
    "/usr",
    "/bin",
    "/sbin",
    "/lib",
    "/dev",
    "/run",
    "/srv",
    "/mnt",
    "/media",
    "/work",
    "/workspace",
  ])("rejects renderer local path root %s", (pathRoot) => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "apps/electron-app/src/renderer/index.ts",
      `export const localPath = ${JSON.stringify(`${pathRoot}/sartre`)};\n`,
    );

    expectRule(root, "renderer_local_path_forbidden");
  });

  it.each(["/health", "https://example.internal/workspace"])(
    "accepts renderer route or URL %s",
    (safeValue) => {
      const root = createFixture();
      writeFixtureFile(
        root,
        "apps/electron-app/src/renderer/index.ts",
        `export const safeValue = ${JSON.stringify(safeValue)};\n`,
      );

      expect(checkArchitecture(root)).toEqual([]);
    },
  );

  it.each(["SessionMemory", "failure_record", "FailureRecordProjection"])(
    "rejects legacy domain token %s",
    (identifier) => {
      const root = createFixture();
      writeFixtureFile(
        root,
        "packages/domain/src/index.ts",
        `export const ${identifier} = true;\n`,
      );

      expectRule(root, "legacy_domain_noun_forbidden");
    },
  );

  it("keeps Memory and FailureRecord wording in comments and test labels", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "packages/domain/src/index.ts",
      "// SessionMemory failure_record FailureRecordProjection\nexport const safe = true;\n",
    );
    writeFixtureFile(
      root,
      "packages/domain/src/legacy-labels.test.ts",
      'export const fixtureLabel = "Memory FailureRecord SessionMemory failure_record";\n',
    );

    expect(checkArchitecture(root)).toEqual([]);
  });

  it("folds deterministic file-local const identifiers", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "apps/hub-api/src/config.ts",
      [
        'const prefix = "AK";',
        'const family = "IA";',
        'export const value = prefix + family + "AAAAAAAAAAAAAAAA";',
        "",
      ].join("\n"),
    );

    expectRule(root, "secret_literal_forbidden");
  });

  it("handles const cycles and shadow declarations without executing runtime code", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "apps/hub-api/src/config.ts",
      [
        "const left = right;",
        "const right = left;",
        "{ const left = (() => { throw new Error('must not execute'); })(); void left; }",
        "export const value = left;",
        "",
      ].join("\n"),
    );

    expect(checkArchitecture(root)).toEqual([]);
  });
});

describe("code-quality re-review - bounded constant evaluation", () => {
  it("fails closed once when an exponential const chain exceeds the folded-byte budget", () => {
    const root = createFixture();
    const declarations = ['const value0 = "A";'];
    for (let index = 1; index <= 18; index += 1) {
      declarations.push(`const value${index} = value${index - 1} + value${index - 1};`);
    }
    declarations.push("export const value = value18;", "");
    writeFixtureFile(root, "apps/hub-api/src/config.ts", declarations.join("\n"));

    const budgetViolations = checkArchitecture(root).filter(
      (candidate) => candidate.ruleId === "static_evaluation_budget_exceeded",
    );
    expect(budgetViolations).toHaveLength(1);
  }, 2_000);

  it("preflights an oversized repeat without allocating its result", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "apps/hub-api/src/config.ts",
      'export const value = "safe".repeat(1_000_000_000);\n',
    );

    expectRule(root, "static_evaluation_budget_exceeded");
  }, 2_000);

  it("keeps normal small repeat folding and credential detection", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "apps/hub-api/src/config.ts",
      'export const credential = "AK" + "IA" + "A".repeat(16);\n',
    );

    expectRule(root, "secret_literal_forbidden");
  });
});

describe("legacy and Secret boundaries", () => {
  it.each(["Phase", "Dispatch", "Delivery", "WorkspaceToken"])(
    "rejects legacy domain noun %s",
    (noun) => {
      const root = createFixture();
      writeFixtureFile(root, "packages/domain/src/index.ts", `export class ${noun} {}\n`);

      expectRule(root, "legacy_domain_noun_forbidden");
    },
  );

  it("does not report legacy nouns or imports that occur only in comments and labels", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "packages/domain/src/index.ts",
      [
        "// Phase Dispatch Delivery WorkspaceToken",
        '// import "electron";',
        'export const fixtureLabel = "phased-deliverable-check";',
        "",
      ].join("\n"),
    );

    expect(checkArchitecture(root)).toEqual([]);
  });

  it("rejects a Secret literal in target source", () => {
    const root = createFixture();
    const syntheticValue = `${["AK", "IA"].join("")}${"A".repeat(16)}`;
    writeFixtureFile(
      root,
      "apps/hub-api/src/config.ts",
      `export const value = ${JSON.stringify(syntheticValue)};\n`,
    );

    expectRule(root, "secret_literal_forbidden");
  });

  it("rejects a Secret literal in a target build file", () => {
    const root = createFixture();
    const syntheticValue = `${["AK", "IA"].join("")}${"B".repeat(16)}`;
    writeFixtureFile(
      root,
      "apps/hub-api/Dockerfile",
      `FROM scratch\nENV SYNTHETIC_VALUE=${syntheticValue}\n`,
    );

    expectRule(root, "secret_literal_forbidden");
  });

  it("rejects the forbidden local Secret path in target build configuration", () => {
    const root = createFixture();
    const forbiddenPath = [".local", "secrets"].join("-");
    writeFixtureJson(root, "apps/hub-api/package.json", {
      name: "@sartre/hub-api",
      private: true,
      scripts: { build: `cp ../../${forbiddenPath}/development.env dist/` },
    });

    expectRule(root, "forbidden_secret_path");
  });
});

describe("fail-closed legacy tokenization", () => {
  it.each([
    "RequirementPhase",
    "dispatch_record",
    "delivery_state",
    "WorkItemProjection",
    "handoff_event",
    "WorkspaceTokenEnvelope",
  ])("rejects composite legacy token %s", (identifier) => {
    const root = createFixture();
    writeFixtureFile(root, "packages/domain/src/index.ts", `export const ${identifier} = true;\n`);

    expectRule(root, "legacy_domain_noun_forbidden");
  });

  it("ignores legacy wording in comments and test labels", () => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "packages/domain/src/index.ts",
      "// RequirementPhase dispatch_record Delivery WorkspaceToken\nexport const safe = true;\n",
    );
    writeFixtureFile(
      root,
      "packages/domain/src/legacy-labels.test.ts",
      'export const fixtureLabel = "Phase Dispatch Delivery WorkItem Handoff WorkspaceToken";\n',
    );

    expect(checkArchitecture(root)).toEqual([]);
  });
});

describe("fail-closed build and folded Secret inventory", () => {
  it("scans an extensionless Makefile", () => {
    const root = createFixture();
    const syntheticValue = `${["AK", "IA"].join("")}${"C".repeat(16)}`;
    writeFixtureFile(root, "apps/hub-api/Makefile", `VALUE := ${syntheticValue}\n`);

    expectRule(root, "secret_literal_forbidden");
  });

  it.each([
    ["binary concatenation", '"AK" + "IA" + "DDDDDDDDDDDDDDDD"'],
    [
      "template expression",
      [
        "`",
        templateInterpolation("AK"),
        templateInterpolation("IA"),
        templateInterpolation("EEEEEEEEEEEEEEEE"),
        "`",
      ].join(""),
    ],
    ["static join", '["AK", "IA", "FFFFFFFFFFFFFFFF"].join("")'],
  ])("folds a deterministic %s", (_description, expression) => {
    const root = createFixture();
    writeFixtureFile(
      root,
      "apps/hub-api/src/config.ts",
      `export const credential = ${expression};\n`,
    );

    expectRule(root, "secret_literal_forbidden");
  });
});

describe("production repository", () => {
  it("prints stable violation fields and exits nonzero from the CLI", () => {
    const root = createFixture();
    writeFixtureFile(root, "packages/sdk/src/index.ts", 'import "@sartre/domain";\n');
    const result = spawnSync(
      join(process.cwd(), "node_modules/.bin/tsx"),
      [join(process.cwd(), "scripts/architecture/check.ts")],
      { cwd: root, encoding: "utf8" },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('"ruleId":"dependency_direction_forbidden"');
    expect(result.stderr).toContain('"file":"packages/sdk/src/index.ts"');
    expect(result.stderr).toContain('"line":1');
    expect(result.stderr).toContain('"remediation":');
  });

  it("passes the current target tree", () => {
    expect(checkArchitecture(process.cwd())).toEqual([]);
  });
});
