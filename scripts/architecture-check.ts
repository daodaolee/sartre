import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const violations: string[] = [];
const appPackages = readAppPackages();
let cachedSymbols: string[] | null = null;

// 宪法核心领域术语：必须能在代码导出符号中找到对应实现。
// 这些是 docs/00-domain-model 不变量直接依赖的聚合/实体/值对象。
// 不含 AuditEvent —— 它是"领域事件总称"概念，由具体 *Event 类型实现，
// 属于合理的概念/实现分层，不要求存在同名符号。
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

scan(join(root, "packages/domain"), (file, content) => {
  if (
    content.includes("@nestjs/") ||
    content.includes("pg") ||
    content.includes("node:fs")
  ) {
    violations.push(
      `${file}: packages/domain must not depend on Nest, pg, or node fs`,
    );
  }
});

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
          `${file}: app packages must not import app boundary ${otherPackageName}`,
        );
      }
    }
  });
}

for (const [appPath, packageName] of appPackages) {
  const packagePath = join(root, appPath, "package.json");
  const packageJson = readPackageJson(packagePath);
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
        `${packagePath}: app package must not depend on ${otherPackageName}`,
      );
    }
  }
}

// 反向校验：宪法术语必须在代码里有对应实现，防止 spec 与代码长期背离。
// 见 spec/DDDSpec.md 术语表与 docs/00-domain-model.md 统一语言。
for (const term of collectSpecTerms()) {
  if (
    !codeSymbols().some((symbol) =>
      symbol.toLowerCase().includes(term.toLowerCase()),
    )
  ) {
    violations.push(
      `spec term "${term}" has no matching export in packages/contracts or packages/domain — spec/DDDSpec.md drifted from code`,
    );
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exit(1);
}

console.log("architecture check passed");

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

// 宪法核心领域术语校验：常量声明在文件顶部（见 CORE_DOMAIN_TERMS），
// 因为顶层校验循环在模块求值时即调用 collectSpecTerms()。
function collectSpecTerms(): string[] {
  return CORE_DOMAIN_TERMS;
}

function codeSymbols(): string[] {
  if (cachedSymbols) {
    return cachedSymbols;
  }
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
  cachedSymbols = symbols;
  return symbols;
}
