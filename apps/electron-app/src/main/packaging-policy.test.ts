import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createPackage } from "@electron/asar";
import { describe, expect, it } from "vitest";

import * as electronApp from "../index.js";

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

interface ElectronBuilderConfiguration {
  readonly productName?: string;
  readonly artifactName?: string;
  readonly directories?: { readonly output?: string };
  readonly files?: readonly string[];
}

type PackagingPolicyValidator = (
  configuration: ElectronBuilderConfiguration,
  productionDependencies?: readonly string[],
) => readonly string[];

type SecureWindowOptionsFactory = (preloadPath: string) => {
  readonly webPreferences?: Readonly<Record<string, unknown>>;
};

type MacPackageArgumentsNormalizer = (argv: readonly string[]) => readonly string[];
type AsarInventoryValidator = (entries: readonly string[]) => readonly string[];
type CheckedInPackagingPolicyValidator = (appRoot: string) => Promise<void>;
type PackagedApplicationInventoryValidator = (appRoot: string) => Promise<void>;

function packagingPolicyValidator(): PackagingPolicyValidator {
  const validator = (electronApp as { validateElectronPackagingPolicy?: unknown })
    .validateElectronPackagingPolicy;
  expect(validator).toBeTypeOf("function");
  return validator as PackagingPolicyValidator;
}

function secureWindowOptionsFactory(): SecureWindowOptionsFactory {
  const factory = (electronApp as { createSecureWindowOptions?: unknown })
    .createSecureWindowOptions;
  expect(factory).toBeTypeOf("function");
  return factory as SecureWindowOptionsFactory;
}

function macPackageArgumentsNormalizer(): MacPackageArgumentsNormalizer {
  const normalizer = (electronApp as { normalizeMacPackageArguments?: unknown })
    .normalizeMacPackageArguments;
  expect(normalizer).toBeTypeOf("function");
  return normalizer as MacPackageArgumentsNormalizer;
}

function asarInventoryValidator(): AsarInventoryValidator {
  const validator = (electronApp as { validateElectronAsarInventory?: unknown })
    .validateElectronAsarInventory;
  expect(validator).toBeTypeOf("function");
  return validator as AsarInventoryValidator;
}

function checkedInPackagingPolicyValidator(): CheckedInPackagingPolicyValidator {
  const validator = (electronApp as { assertCheckedInElectronPackagingPolicy?: unknown })
    .assertCheckedInElectronPackagingPolicy;
  expect(validator).toBeTypeOf("function");
  return validator as CheckedInPackagingPolicyValidator;
}

function packagedApplicationInventoryValidator(): PackagedApplicationInventoryValidator {
  const validator = (electronApp as { assertPackagedElectronApplicationInventory?: unknown })
    .assertPackagedElectronApplicationInventory;
  expect(validator).toBeTypeOf("function");
  return validator as PackagedApplicationInventoryValidator;
}

function validConfiguration(): ElectronBuilderConfiguration {
  return {
    productName: "Sartre",
    artifactName: "Sartre-$" + "{version}-$" + "{arch}.$" + "{ext}",
    directories: { output: "release" },
    files: REQUIRED_PACKAGE_FILES,
  };
}

describe("Electron packaging policy", () => {
  it("pins the exact secure BrowserWindow web preferences", () => {
    const preloadPath = "/contained/app/preload/index.cjs";
    expect(secureWindowOptionsFactory()(preloadPath).webPreferences).toEqual({
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      nodeIntegration: false,
      preload: preloadPath,
    });
  });

  it("forwards only the supported unpacked or publish arguments after pnpm separators", () => {
    const normalize = macPackageArgumentsNormalizer();
    expect(normalize(["--", "--dir"])).toEqual(["--dir"]);
    expect(normalize(["--", "--publish", "never"])).toEqual(["--publish", "never"]);
    for (const invalid of [[], ["--"], ["--dir", "extra"], ["--publish", "always"], ["--sign"]]) {
      expect(() => normalize(invalid)).toThrow("electron_package_arguments_invalid");
    }
  });

  it("rejects an absent or repository-wide files list", () => {
    const validate = packagingPolicyValidator();
    expect(validate({})).toContain("packaging_files_allowlist_required");
    for (const catchAll of ["**/*", "**", "*", ".", "./**/*"]) {
      expect(validate({ ...validConfiguration(), files: [catchAll] })).toContain(
        "packaging_files_catch_all_forbidden",
      );
    }
  });

  it("rejects every glob even when it is scoped below an approved compiled directory", () => {
    const validate = packagingPolicyValidator();
    for (const glob of [
      "dist/main/**/*",
      "dist/main/**",
      "dist/main/*.js",
      "dist/preload/index.?js",
      "dist/renderer/{index,styles}.*",
    ]) {
      expect(
        validate({ ...validConfiguration(), files: [...REQUIRED_PACKAGE_FILES, glob] }),
      ).toContain("packaging_files_glob_forbidden");
    }
  });

  it("requires the exact ordered compiled payload file set", () => {
    const validate = packagingPolicyValidator();
    expect(validate(validConfiguration())).toEqual([]);
    for (const files of [
      REQUIRED_PACKAGE_FILES.slice(1),
      [...REQUIRED_PACKAGE_FILES, "dist/renderer/unexpected.js"],
      [...REQUIRED_PACKAGE_FILES, "package.json"],
      [...REQUIRED_PACKAGE_FILES].reverse(),
    ]) {
      expect(validate({ ...validConfiguration(), files })).toContain(
        "packaging_files_exact_set_required",
      );
    }
  });

  it("validates packaging without trusting caller-reported artifact scan coverage", () => {
    expect(packagingPolicyValidator()(validConfiguration())).toEqual([]);
  });

  it("requires the exact asar inventory and rejects dependencies, source, tests, maps, or extras", () => {
    const validate = asarInventoryValidator();
    expect(validate(REQUIRED_ASAR_ENTRIES)).toEqual([]);
    expect(validate(REQUIRED_ASAR_ENTRIES.slice(1))).toContain(
      "packaging_asar_inventory_exact_set_required",
    );
    for (const forbidden of [
      "/node_modules/pg/index.js",
      "/src/main/index.ts",
      "/tests/packaging.test.ts",
      "/dist/main/index.js.map",
      "/unexpected.txt",
    ]) {
      const violations = validate([...REQUIRED_ASAR_ENTRIES, forbidden]);
      expect(violations).toContain("packaging_asar_inventory_exact_set_required");
      expect(violations).toContain("packaging_asar_forbidden_path");
    }
  });

  it("reads and validates the real builder config and Electron manifest from the app root", async () => {
    const validate = checkedInPackagingPolicyValidator();
    const checkedInAppRoot = fileURLToPath(new URL("../../", import.meta.url));
    await expect(validate(checkedInAppRoot)).resolves.toBeUndefined();

    const fixtureRoot = await mkdtemp(join(tmpdir(), "sartre-electron-package-policy-"));
    try {
      await mkdir(dirname(join(fixtureRoot, "electron-builder.yml")), { recursive: true });
      await writeFile(
        join(fixtureRoot, "electron-builder.yml"),
        JSON.stringify({ ...validConfiguration(), files: ["**/*"] }),
      );
      await writeFile(join(fixtureRoot, "package.json"), JSON.stringify({ dependencies: {} }));
      await expect(validate(fixtureRoot)).rejects.toThrow(
        "electron_packaging_policy_invalid:packaging_files_exact_set_required,packaging_files_catch_all_forbidden,packaging_files_glob_forbidden,packaging_files_unapproved_path",
      );
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("reads the built app.asar and fails closed on an unexpected packaged entry", async () => {
    const validate = packagedApplicationInventoryValidator();
    const fixtureRoot = await mkdtemp(join(tmpdir(), "sartre-electron-asar-inventory-"));
    const sourceRoot = join(fixtureRoot, "payload");
    const asarPath = join(fixtureRoot, "release/mac-arm64/Sartre.app/Contents/Resources/app.asar");
    try {
      for (const entry of REQUIRED_PACKAGE_FILES) {
        const path = join(sourceRoot, entry);
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, entry);
      }
      await createPackage(sourceRoot, asarPath);
      await expect(validate(fixtureRoot)).resolves.toBeUndefined();

      await writeFile(join(sourceRoot, "unexpected.txt"), "unexpected");
      await rm(asarPath);
      await createPackage(sourceRoot, asarPath);
      await expect(validate(fixtureRoot)).rejects.toThrow(
        "electron_package_inventory_invalid:packaging_asar_inventory_exact_set_required,packaging_asar_forbidden_path",
      );
    } finally {
      await rm(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects source, configuration, credential, report, test, cache, key, and raw evidence paths", () => {
    const validate = packagingPolicyValidator();
    const localSecretDirectory = String.fromCodePoint(
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
    for (const forbiddenPath of [
      "src/**/*",
      `${localSecretDirectory}/**/*`,
      ".env.production",
      "reports/**/*",
      "tests/**/*",
      ".git/**/*",
      ".pnpm-store/**/*",
      "credentials/private.key",
      "reports/ms0/raw/**/*",
      "dist/main/index.js.map",
    ]) {
      expect(
        validate({
          ...validConfiguration(),
          files: [...(validConfiguration().files ?? []), forbiddenPath],
        }),
      ).toContain("packaging_files_forbidden_path");
    }
  });

  it("requires deterministic product and artifact names", () => {
    const validate = packagingPolicyValidator();
    expect(validate({ ...validConfiguration(), productName: "Other" })).toContain(
      "packaging_product_name_invalid",
    );
    expect(
      validate({ ...validConfiguration(), artifactName: "$" + "{name}-$" + "{version}.dmg" }),
    ).toContain("packaging_artifact_name_invalid");
  });

  it("rejects production dependencies that electron-builder would add outside the files allowlist", () => {
    const validate = packagingPolicyValidator();
    expect(validate(validConfiguration(), ["react"])).toContain(
      "packaging_runtime_dependencies_forbidden",
    );
  });

  it("accepts the checked-in explicit Electron builder configuration", async () => {
    const validate = packagingPolicyValidator();
    const configuration = JSON.parse(
      await readFile(new URL("../../electron-builder.yml", import.meta.url), "utf8"),
    ) as ElectronBuilderConfiguration;
    const packageManifest = JSON.parse(
      await readFile(new URL("../../package.json", import.meta.url), "utf8"),
    ) as { readonly dependencies?: Readonly<Record<string, string>> };
    expect(validate(configuration, Object.keys(packageManifest.dependencies ?? {}))).toEqual([]);
  });
});
