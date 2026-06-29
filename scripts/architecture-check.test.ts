import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const appPackages = readAppPackages();

describe("monorepo package isolation", () => {
  it("prevents application packages from importing other application packages", () => {
    const violations: string[] = [];

    for (const [appPath, packageName] of appPackages) {
      scan(join(root, appPath), (file, content) => {
        const importSpecifiers = extractImportSpecifiers(content);
        for (const [otherAppPath, otherPackageName] of appPackages) {
          if (otherPackageName === packageName) {
            continue;
          }

          if (
            importSpecifiers.some(
              (specifier) =>
                specifier === otherPackageName ||
                specifier.startsWith(`${otherPackageName}/`) ||
                specifier.includes(otherAppPath),
            )
          ) {
            violations.push(
              `${relative(root, file)} imports app boundary ${otherPackageName}`,
            );
          }
        }
      });
    }

    expect(violations).toEqual([]);
  });

  it("keeps app package dependencies free of other app package dependencies", () => {
    const violations: string[] = [];

    for (const [appPath, packageName] of appPackages) {
      const packageJson = readPackageJson(join(root, appPath, "package.json"));
      const dependencyNames = [
        ...Object.keys(packageJson.dependencies ?? {}),
        ...Object.keys(packageJson.devDependencies ?? {}),
        ...Object.keys(packageJson.peerDependencies ?? {}),
        ...Object.keys(packageJson.optionalDependencies ?? {}),
      ];

      for (const [, otherPackageName] of appPackages) {
        if (
          otherPackageName !== packageName &&
          dependencyNames.includes(otherPackageName)
        ) {
          violations.push(
            `${appPath}/package.json depends on app package ${otherPackageName}`,
          );
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

// 反向校验：宪法术语必须在代码里有对应实现，防止 spec 与代码长期背离。
// 与 scripts/architecture-check.ts 中的 CORE_DOMAIN_TERMS 同步。
const CORE_DOMAIN_TERMS = [
  "TaskHandoff",
  "HandoffPack",
  "Delivery",
  "AgentEndpoint",
  "RoleCapabilityPack",
  "Conversation",
  "ContextProjection",
  "ModelRun",
];

function collectCodeSymbols(): string[] {
  const symbols: string[] = [];
  for (const dir of ["packages/contracts/src", "packages/domain/src"]) {
    scan(join(root, dir), (_file, content) => {
      for (const match of content.matchAll(
        /export\s+(?:const|class|interface|type|enum|function)\s+([A-Za-z0-9_]+)/g,
      )) {
        if (match[1]) {
          symbols.push(match[1]);
        }
      }
    });
  }
  return symbols;
}

describe("spec-to-code term alignment", () => {
  const symbols = collectCodeSymbols();
  const hasSymbolFor = (term: string) =>
    symbols.some((symbol) => symbol.toLowerCase().includes(term.toLowerCase()));

  it("keeps every core domain term backed by a code export", () => {
    const drifted = CORE_DOMAIN_TERMS.filter((term) => !hasSymbolFor(term));
    expect(drifted).toEqual([]);
  });

  it("flags a term that has no matching code export", () => {
    expect(hasSymbolFor("GhostTermThatDoesNotExist")).toBe(false);
  });
});

function scan(dir: string, visit: (file: string, content: string) => void) {
  if (!existsSync(dir)) {
    return;
  }

  for (const entry of readdirSync(dir)) {
    if (["node_modules", "dist", "build", ".turbo"].includes(entry)) {
      continue;
    }

    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      scan(path, visit);
      continue;
    }

    if (
      (!path.endsWith(".ts") && !path.endsWith(".tsx")) ||
      path.endsWith(".test.ts") ||
      path.endsWith(".test.tsx")
    ) {
      continue;
    }

    visit(path, readFileSync(path, "utf8"));
  }
}

function readAppPackages(): Map<string, string> {
  const appsDir = join(root, "apps");
  const packages = new Map<string, string>();
  if (!existsSync(appsDir)) {
    return packages;
  }

  for (const entry of readdirSync(appsDir)) {
    const appPath = `apps/${entry}`;
    const packagePath = join(root, appPath, "package.json");
    if (!existsSync(packagePath)) {
      continue;
    }
    packages.set(appPath, readPackageJson(packagePath).name);
  }

  return packages;
}

function readPackageJson(path: string): {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
} {
  return JSON.parse(readFileSync(path, "utf8"));
}

function extractImportSpecifiers(content: string): string[] {
  return [
    ...content.matchAll(
      /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/g,
    ),
    ...content.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g),
  ].flatMap((match) => (match[1] ? [match[1]] : []));
}
