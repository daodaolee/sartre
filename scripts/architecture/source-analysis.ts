import { lstatSync, readFileSync, realpathSync, type Stats } from "node:fs";
import { builtinModules } from "node:module";
import { basename, isAbsolute, join, relative } from "node:path";
import ts from "typescript";
import { scanTextForSecrets } from "../constitution/secret-boundary.js";
import { type LoadedTsConfig, resolveTypeScriptModule } from "./config-resolution.js";
import {
  type ArchitectureViolation,
  dependencyRule,
  isContained,
  moduleForPackageSpecifier,
  moduleForPath,
  portable,
  type TargetModule,
  violation,
} from "./model.js";
import { canonicalSourceCandidatePolicy, EXTENSIONLESS_SOURCE_SUFFIXES } from "./source-policy.js";

export { isTargetSourceFile } from "./source-policy.js";

type SpecifierOccurrence = {
  readonly value: string | undefined;
  readonly node: ts.Node;
};

const NODE_MODULES = new Set([...builtinModules, ...builtinModules.map((name) => `node:${name}`)]);
const RENDERER_LOCAL_PATH =
  /^(?:file:\/\/|\/(?:Users|private|Volumes|System|Library|Applications|home|root|tmp|var|etc|opt|usr|bin|sbin|lib|dev|run|srv|mnt|media|work|workspace)(?:\/|$)|[A-Za-z]:[\\/])/u;
const AMBIGUOUS_CONST = Symbol("ambiguous-const");
const MAX_CONST_FOLD_DEPTH = 32;
const MAX_CONST_EVALUATION_OPERATIONS = 4_096;
const MAX_FOLDED_BYTES = 64 * 1024;
const EXACT_PACKAGE_NAME = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/u;

type ConstBinding = ts.Expression | typeof AMBIGUOUS_CONST;
type FoldResult =
  | { readonly kind: "value"; readonly value: string; readonly bytes: number }
  | { readonly kind: "unknown" }
  | { readonly kind: "budget" };
type ResolvedPath = {
  readonly lexical: string;
  readonly canonical: string;
};

function sourceLine(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function literalSpecifier(node: ts.Expression | undefined): string | undefined {
  return node && ts.isStringLiteralLike(node) ? node.text : undefined;
}

function externalPackageIdentity(specifier: string): string | undefined {
  if (specifier.startsWith("@")) {
    const [scope, name] = specifier.split("/");
    return scope && name ? `${scope}/${name}` : undefined;
  }
  return specifier.split("/")[0] || undefined;
}

function moduleSpecifiers(sourceFile: ts.SourceFile): SpecifierOccurrence[] {
  const occurrences: SpecifierOccurrence[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteralLike(node.moduleSpecifier)
    ) {
      occurrences.push({ value: node.moduleSpecifier.text, node: node.moduleSpecifier });
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression
    ) {
      occurrences.push({
        value: literalSpecifier(node.moduleReference.expression),
        node: node.moduleReference.expression,
      });
    } else if (ts.isImportTypeNode(node)) {
      const argument = node.argument;
      occurrences.push({
        value:
          ts.isLiteralTypeNode(argument) && ts.isStringLiteralLike(argument.literal)
            ? argument.literal.text
            : undefined,
        node: argument,
      });
    } else if (ts.isCallExpression(node)) {
      const isRequire = ts.isIdentifier(node.expression) && node.expression.text === "require";
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      if (isRequire || isDynamicImport) {
        occurrences.push({
          value: literalSpecifier(node.arguments[0]),
          node: node.arguments[0] ?? node,
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return occurrences;
}

function regularResolvedPath(path: string | undefined): ResolvedPath | undefined {
  if (!path) return undefined;
  try {
    const stat = lstatSync(path);
    return stat.isFile() && !stat.isSymbolicLink()
      ? { lexical: path, canonical: realpathSync(path) }
      : undefined;
  } catch {
    return undefined;
  }
}

function moduleForResolvedPath(
  modules: readonly TargetModule[],
  resolvedPath: ResolvedPath | undefined,
): TargetModule | undefined {
  if (!resolvedPath) return undefined;
  const lexicalTarget = moduleForPath(modules, resolvedPath.lexical);
  if (
    lexicalTarget &&
    !portable(relative(lexicalTarget.root, resolvedPath.lexical))
      .split("/")
      .includes("node_modules")
  ) {
    return lexicalTarget;
  }
  return modules.find((module) => {
    try {
      const canonicalModuleRoot = realpathSync(module.root);
      return (
        isContained(canonicalModuleRoot, resolvedPath.canonical) &&
        !portable(relative(canonicalModuleRoot, resolvedPath.canonical))
          .split("/")
          .includes("node_modules")
      );
    } catch {
      return false;
    }
  });
}

function resolveCanonicalModuleSource(
  specifier: string,
  target: TargetModule,
): ResolvedPath | undefined {
  const lexicalSourceRoot = join(target.root, "src");
  let canonicalSourceRoot: string;
  try {
    const sourceRootStat = lstatSync(lexicalSourceRoot);
    const canonicalModuleRoot = realpathSync(target.root);
    canonicalSourceRoot = realpathSync(lexicalSourceRoot);
    if (
      !sourceRootStat.isDirectory() ||
      sourceRootStat.isSymbolicLink() ||
      !isContained(canonicalModuleRoot, canonicalSourceRoot)
    ) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  const subpath =
    specifier === target.packageName ? "" : specifier.slice(target.packageName.length + 1);
  const segments = subpath ? subpath.split("/") : [];
  if (
    segments.some(
      (segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"),
    )
  ) {
    return undefined;
  }

  const candidates: string[] = [];
  if (segments.length === 0) {
    candidates.push(
      ...EXTENSIONLESS_SOURCE_SUFFIXES.map((suffix) => join(lexicalSourceRoot, `index${suffix}`)),
    );
  } else {
    const requestedPath = join(lexicalSourceRoot, ...segments);
    const policy = canonicalSourceCandidatePolicy(requestedPath);
    candidates.push(...policy.suffixes.map((suffix) => `${policy.basePath}${suffix}`));
    if (policy.includeIndex) {
      candidates.push(...policy.suffixes.map((suffix) => join(requestedPath, `index${suffix}`)));
    }
  }

  for (const candidate of candidates) {
    const resolved = regularResolvedPath(candidate);
    if (
      resolved &&
      isContained(lexicalSourceRoot, resolved.lexical) &&
      isContained(canonicalSourceRoot, resolved.canonical)
    ) {
      return resolved;
    }
  }
  return undefined;
}

type VerifiedExternalPackage = {
  readonly canonicalRoot: string;
  readonly identity: string;
};

function definitelyTypedIdentity(importKey: string): string {
  if (!importKey.startsWith("@")) return `@types/${importKey}`;
  const [scope, name] = importKey.slice(1).split("/");
  return scope && name ? `@types/${scope}__${name}` : "";
}

function verifiedExternalPackage(args: {
  readonly repositoryRoot: string;
  readonly canonicalNodeModulesRoot: string;
  readonly importKey: string;
}): VerifiedExternalPackage | undefined {
  const keySegments = args.importKey.split("/");
  let logicalEntry = join(args.repositoryRoot, "node_modules", ...keySegments);
  let entryStat: Stats;
  try {
    entryStat = lstatSync(logicalEntry);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      return undefined;
    }
    logicalEntry = join(args.repositoryRoot, "node_modules/.pnpm/node_modules", ...keySegments);
    try {
      entryStat = lstatSync(logicalEntry);
    } catch {
      return undefined;
    }
  }

  try {
    const canonicalPackageRoot = realpathSync(logicalEntry);
    const packageRootStat = lstatSync(canonicalPackageRoot);
    if (
      (!entryStat.isDirectory() && !entryStat.isSymbolicLink()) ||
      !packageRootStat.isDirectory() ||
      packageRootStat.isSymbolicLink() ||
      !isContained(args.canonicalNodeModulesRoot, canonicalPackageRoot)
    ) {
      return undefined;
    }

    const packageJson = join(canonicalPackageRoot, "package.json");
    const packageJsonStat = lstatSync(packageJson);
    const canonicalPackageJson = realpathSync(packageJson);
    if (
      !packageJsonStat.isFile() ||
      packageJsonStat.isSymbolicLink() ||
      !isContained(canonicalPackageRoot, canonicalPackageJson)
    ) {
      return undefined;
    }
    const manifest = JSON.parse(readFileSync(canonicalPackageJson, "utf8")) as unknown;
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return undefined;
    const identity = (manifest as Record<string, unknown>).name;
    return typeof identity === "string" && EXACT_PACKAGE_NAME.test(identity)
      ? { canonicalRoot: canonicalPackageRoot, identity }
      : undefined;
  } catch {
    return undefined;
  }
}

function resolvedExternalPackageMatches(args: {
  repositoryRoot: string;
  importKey: string;
  expectedActualIdentity: string;
  resolvedPath: ResolvedPath;
  declaredDependencies: ReadonlyMap<string, string>;
}): boolean {
  let canonicalRepositoryRoot: string;
  let canonicalNodeModulesRoot: string;
  try {
    canonicalRepositoryRoot = realpathSync(args.repositoryRoot);
    const nodeModulesRoot = join(args.repositoryRoot, "node_modules");
    const nodeModulesStat = lstatSync(nodeModulesRoot);
    if (!nodeModulesStat.isDirectory() || nodeModulesStat.isSymbolicLink()) return false;
    canonicalNodeModulesRoot = realpathSync(nodeModulesRoot);
  } catch {
    return false;
  }
  if (
    !isContained(canonicalRepositoryRoot, canonicalNodeModulesRoot) ||
    !isContained(canonicalNodeModulesRoot, args.resolvedPath.canonical) ||
    !EXACT_PACKAGE_NAME.test(args.importKey) ||
    !EXACT_PACKAGE_NAME.test(args.expectedActualIdentity)
  ) {
    return false;
  }

  const runtimePackage = verifiedExternalPackage({
    repositoryRoot: args.repositoryRoot,
    canonicalNodeModulesRoot,
    importKey: args.importKey,
  });
  if (!runtimePackage || runtimePackage.identity !== args.expectedActualIdentity) return false;
  if (isContained(runtimePackage.canonicalRoot, args.resolvedPath.canonical)) return true;

  const typeIdentity = definitelyTypedIdentity(args.importKey);
  if (
    args.expectedActualIdentity !== args.importKey ||
    !typeIdentity ||
    args.declaredDependencies.get(typeIdentity) !== typeIdentity
  ) {
    return false;
  }
  const typePackage = verifiedExternalPackage({
    repositoryRoot: args.repositoryRoot,
    canonicalNodeModulesRoot,
    importKey: typeIdentity,
  });
  return Boolean(
    typePackage &&
      typePackage.identity === typeIdentity &&
      isContained(typePackage.canonicalRoot, args.resolvedPath.canonical),
  );
}

function isTestSource(file: string): boolean {
  return /(?:^|\/)__tests__(?:\/|$)|\.(?:spec|test)\.[cm]?[jt]sx?$/u.test(portable(file));
}

export function isRendererFile(electronModule: TargetModule, file: string): boolean {
  const moduleRelative = portable(relative(electronModule.root, file));
  if (moduleRelative.startsWith("../") || moduleRelative === "..") return false;
  const segments = moduleRelative.split("/");
  const fileName = basename(moduleRelative);
  return (
    segments.slice(0, -1).includes("renderer") ||
    /^renderer(?:[-_.]entry)?\.[cm]?[jt]sx?$/u.test(fileName) ||
    /^renderer-entry\.[cm]?[jt]sx?$/u.test(fileName)
  );
}

function rendererAstViolations(
  repositoryRoot: string,
  electronModule: TargetModule,
  file: string,
  sourceFile: ts.SourceFile,
): ArchitectureViolation[] {
  if (!isRendererFile(electronModule, file)) return [];
  const violations: ArchitectureViolation[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) {
      if (node.text === "ipcRenderer") {
        violations.push(
          violation(
            repositoryRoot,
            "renderer_raw_ipc_forbidden",
            file,
            sourceLine(sourceFile, node),
          ),
        );
      } else if (["Buffer", "__dirname", "__filename", "process"].includes(node.text)) {
        violations.push(
          violation(
            repositoryRoot,
            "renderer_node_access_forbidden",
            file,
            sourceLine(sourceFile, node),
          ),
        );
      }
    }
    if (ts.isStringLiteralLike(node) && RENDERER_LOCAL_PATH.test(node.text)) {
      violations.push(
        violation(
          repositoryRoot,
          "renderer_local_path_forbidden",
          file,
          sourceLine(sourceFile, node),
        ),
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
}

function tokenized(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/gu, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/gu, "$1 $2")
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean)
    .map((token) => token.toLowerCase());
}

function hasLegacyTokens(value: string): boolean {
  const tokens = tokenized(value);
  if (
    tokens.some((token) => ["phase", "dispatch", "delivery", "handoff", "memory"].includes(token))
  ) {
    return true;
  }
  return tokens.some(
    (token, index) =>
      (token === "work" && tokens[index + 1] === "item") ||
      (token === "workspace" && tokens[index + 1] === "token") ||
      (token === "failure" && tokens[index + 1] === "record"),
  );
}

function legacyDomainViolations(
  repositoryRoot: string,
  sourceModule: TargetModule,
  file: string,
  sourceFile: ts.SourceFile,
): ArchitectureViolation[] {
  if (sourceModule.id !== "packages/domain" || isTestSource(file)) return [];
  const violations: ArchitectureViolation[] = [];
  const visit = (node: ts.Node): void => {
    if (
      (ts.isIdentifier(node) && hasLegacyTokens(node.text)) ||
      (ts.isStringLiteralLike(node) && hasLegacyTokens(node.text))
    ) {
      violations.push(
        violation(
          repositoryRoot,
          "legacy_domain_noun_forbidden",
          file,
          sourceLine(sourceFile, node),
        ),
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
}

function collectConstBindings(sourceFile: ts.SourceFile): ReadonlyMap<string, ConstBinding> {
  const bindings = new Map<string, ConstBinding>();
  const visit = (node: ts.Node): void => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isVariableDeclarationList(node.parent) &&
      (node.parent.flags & ts.NodeFlags.Const) !== 0
    ) {
      const name = node.name.text;
      bindings.set(name, bindings.has(name) ? AMBIGUOUS_CONST : node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return bindings;
}

const FOLD_UNKNOWN: FoldResult = { kind: "unknown" };
const FOLD_BUDGET: FoldResult = { kind: "budget" };

function createStringEvaluator(bindings: ReadonlyMap<string, ConstBinding>): {
  readonly evaluate: (node: ts.Expression) => FoldResult;
} {
  const cache = new Map<ts.Expression, FoldResult>();
  let operations = 0;
  let budgetExceeded = false;

  const exceedBudget = (): FoldResult => {
    budgetExceeded = true;
    return FOLD_BUDGET;
  };
  const valueResult = (value: string): FoldResult => {
    const bytes = Buffer.byteLength(value, "utf8");
    return bytes > MAX_FOLDED_BYTES ? exceedBudget() : { kind: "value", value, bytes };
  };
  const evaluate = (
    node: ts.Expression,
    visiting: ReadonlySet<string> = new Set(),
    depth = 0,
  ): FoldResult => {
    if (budgetExceeded) return FOLD_BUDGET;
    const cached = cache.get(node);
    if (cached) return cached;
    operations += 1;
    if (operations > MAX_CONST_EVALUATION_OPERATIONS || depth > MAX_CONST_FOLD_DEPTH) {
      return exceedBudget();
    }

    let result: FoldResult = FOLD_UNKNOWN;
    if (ts.isStringLiteralLike(node)) {
      result = valueResult(node.text);
    } else if (ts.isIdentifier(node)) {
      const binding = bindings.get(node.text);
      if (binding && binding !== AMBIGUOUS_CONST && !visiting.has(node.text)) {
        result = evaluate(binding, new Set(visiting).add(node.text), depth + 1);
      }
    } else if (ts.isParenthesizedExpression(node)) {
      result = evaluate(node.expression, visiting, depth + 1);
    } else if (
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node)
    ) {
      result = evaluate(node.expression, visiting, depth + 1);
    } else if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      const left = evaluate(node.left, visiting, depth + 1);
      const right = evaluate(node.right, visiting, depth + 1);
      if (left.kind === "budget" || right.kind === "budget") {
        result = FOLD_BUDGET;
      } else if (left.kind === "value" && right.kind === "value") {
        result =
          left.bytes + right.bytes > MAX_FOLDED_BYTES
            ? exceedBudget()
            : {
                kind: "value",
                value: left.value + right.value,
                bytes: left.bytes + right.bytes,
              };
      }
    } else if (ts.isTemplateExpression(node)) {
      const parts: string[] = [node.head.text];
      let bytes = Buffer.byteLength(node.head.text, "utf8");
      let complete = true;
      for (const span of node.templateSpans) {
        const expression = evaluate(span.expression, visiting, depth + 1);
        if (expression.kind !== "value") {
          result = expression;
          complete = false;
          break;
        }
        const literalBytes = Buffer.byteLength(span.literal.text, "utf8");
        if (bytes + expression.bytes + literalBytes > MAX_FOLDED_BYTES) {
          result = exceedBudget();
          complete = false;
          break;
        }
        parts.push(expression.value, span.literal.text);
        bytes += expression.bytes + literalBytes;
      }
      if (complete) result = { kind: "value", value: parts.join(""), bytes };
    } else if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "join" &&
      ts.isArrayLiteralExpression(node.expression.expression) &&
      node.arguments.length <= 1
    ) {
      const separator = node.arguments[0]
        ? evaluate(node.arguments[0], visiting, depth + 1)
        : valueResult(",");
      if (separator.kind === "budget") {
        result = FOLD_BUDGET;
      } else if (separator.kind === "value") {
        const parts: string[] = [];
        let bytes = 0;
        let complete = true;
        for (const element of node.expression.expression.elements) {
          if (ts.isSpreadElement(element)) {
            result = FOLD_UNKNOWN;
            complete = false;
            break;
          }
          const part = evaluate(element as ts.Expression, visiting, depth + 1);
          if (part.kind !== "value") {
            result = part;
            complete = false;
            break;
          }
          const separatorBytes = parts.length === 0 ? 0 : separator.bytes;
          if (bytes + separatorBytes + part.bytes > MAX_FOLDED_BYTES) {
            result = exceedBudget();
            complete = false;
            break;
          }
          parts.push(part.value);
          bytes += separatorBytes + part.bytes;
        }
        if (complete) result = { kind: "value", value: parts.join(separator.value), bytes };
      }
    } else if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "repeat" &&
      node.arguments.length === 1
    ) {
      const input = evaluate(node.expression.expression, visiting, depth + 1);
      const countExpression = node.arguments[0];
      const count =
        countExpression && ts.isNumericLiteral(countExpression)
          ? Number(countExpression.text)
          : undefined;
      if (input.kind === "budget") {
        result = FOLD_BUDGET;
      } else if (
        input.kind === "value" &&
        count !== undefined &&
        Number.isSafeInteger(count) &&
        count >= 0
      ) {
        if (input.bytes > 0 && count > Math.floor(MAX_FOLDED_BYTES / input.bytes)) {
          result = exceedBudget();
        } else {
          result = { kind: "value", value: input.value.repeat(count), bytes: input.bytes * count };
        }
      }
    }
    cache.set(node, result);
    return result;
  };
  return { evaluate };
}

function foldedSecretViolations(
  repositoryRoot: string,
  file: string,
  sourceFile: ts.SourceFile,
): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  const repositoryPath = portable(relative(repositoryRoot, file));
  const bindings = collectConstBindings(sourceFile);
  const evaluator = createStringEvaluator(bindings);
  let budgetReported = false;
  const visit = (node: ts.Node): void => {
    if (ts.isExpression(node)) {
      const result = evaluator.evaluate(node);
      if (result.kind === "budget" && !budgetReported) {
        budgetReported = true;
        violations.push(
          violation(
            repositoryRoot,
            "static_evaluation_budget_exceeded",
            file,
            sourceLine(sourceFile, node),
          ),
        );
      } else if (
        result.kind === "value" &&
        scanTextForSecrets(repositoryPath, result.value).length > 0
      ) {
        violations.push(
          violation(repositoryRoot, "secret_literal_forbidden", file, sourceLine(sourceFile, node)),
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
}

function dependencyViolations(
  repositoryRoot: string,
  modules: readonly TargetModule[],
  electronModule: TargetModule,
  sourceModule: TargetModule,
  file: string,
  sourceFile: ts.SourceFile,
  config: LoadedTsConfig,
  declaredDependencies: ReadonlyMap<string, string>,
  canonicalExportKeys: ReadonlyMap<TargetModule, ReadonlySet<string>>,
  rootTestTooling: ReadonlyMap<string, string>,
): ArchitectureViolation[] {
  const violations: ArchitectureViolation[] = [];
  for (const occurrence of moduleSpecifiers(sourceFile)) {
    const line = sourceLine(sourceFile, occurrence.node);
    if (occurrence.value === undefined) {
      violations.push(violation(repositoryRoot, "source_specifier_nonliteral", file, line));
      continue;
    }
    const specifier = occurrence.value;
    const packageTarget = moduleForPackageSpecifier(modules, specifier);
    const exportKey = packageTarget
      ? specifier === packageTarget.packageName
        ? "."
        : `./${specifier.slice(packageTarget.packageName.length + 1)}`
      : undefined;
    const packageExported = Boolean(
      packageTarget && exportKey && canonicalExportKeys.get(packageTarget)?.has(exportKey),
    );
    const resolvedFile =
      packageTarget && packageExported
        ? resolveCanonicalModuleSource(specifier, packageTarget)
        : packageTarget
          ? undefined
          : regularResolvedPath(resolveTypeScriptModule(specifier, file, config));
    const resolvedTarget = moduleForResolvedPath(modules, resolvedFile);
    const target = packageTarget ?? resolvedTarget;

    if (isRendererFile(electronModule, file)) {
      if (specifier === "electron" || specifier.startsWith("electron/")) {
        violations.push(violation(repositoryRoot, "renderer_raw_ipc_forbidden", file, line));
        continue;
      }
      if (NODE_MODULES.has(specifier)) {
        violations.push(violation(repositoryRoot, "renderer_node_access_forbidden", file, line));
        continue;
      }
      if (target?.id === "packages/sdk") {
        violations.push(violation(repositoryRoot, "renderer_hub_sdk_forbidden", file, line));
        continue;
      }
      if (target?.id === "apps/local-runtime" || target?.id === "packages/runtime-core") {
        violations.push(violation(repositoryRoot, "renderer_runtime_access_forbidden", file, line));
        continue;
      }
    }

    if (
      sourceModule.id === "packages/domain" &&
      !isTestSource(file) &&
      target?.id !== "packages/domain"
    ) {
      if (!specifier.startsWith(".") || target) {
        violations.push(violation(repositoryRoot, "domain_dependency_forbidden", file, line));
        continue;
      }
    }
    if (packageTarget) {
      const ruleId = dependencyRule(sourceModule, packageTarget);
      if (ruleId) violations.push(violation(repositoryRoot, ruleId, file, line));
      if (!resolvedFile || resolvedTarget?.id !== packageTarget.id) {
        violations.push(violation(repositoryRoot, "source_specifier_unresolved", file, line));
      }
      continue;
    }
    if (resolvedTarget) {
      const ruleId = dependencyRule(sourceModule, resolvedTarget);
      if (ruleId) violations.push(violation(repositoryRoot, ruleId, file, line));
      continue;
    }
    if (specifier.startsWith("@sartre/")) {
      violations.push(violation(repositoryRoot, "unknown_internal_import_forbidden", file, line));
    } else if (specifier.startsWith(".") || isAbsolute(specifier)) {
      violations.push(
        violation(
          repositoryRoot,
          resolvedFile ? "source_import_outside_module_forbidden" : "source_specifier_unresolved",
          file,
          line,
        ),
      );
    } else if (!NODE_MODULES.has(specifier)) {
      if (!resolvedFile) {
        violations.push(violation(repositoryRoot, "source_specifier_unresolved", file, line));
        continue;
      }
      const packageIdentity = externalPackageIdentity(specifier);
      const expectedActualIdentity = packageIdentity
        ? (declaredDependencies.get(packageIdentity) ??
          (isTestSource(file) ? rootTestTooling.get(packageIdentity) : undefined))
        : undefined;
      if (!packageIdentity || !expectedActualIdentity) {
        violations.push(violation(repositoryRoot, "source_dependency_undeclared", file, line));
        continue;
      }
      if (
        !resolvedFile ||
        !resolvedExternalPackageMatches({
          repositoryRoot,
          importKey: packageIdentity,
          expectedActualIdentity,
          resolvedPath: resolvedFile,
          declaredDependencies,
        })
      ) {
        violations.push(
          violation(repositoryRoot, "source_dependency_identity_invalid", file, line),
        );
      }
    }
  }
  return violations;
}

export function analyzeSourceFile(args: {
  readonly repositoryRoot: string;
  readonly modules: readonly TargetModule[];
  readonly electronModule: TargetModule;
  readonly sourceModule: TargetModule;
  readonly file: string;
  readonly content: string;
  readonly config: LoadedTsConfig;
  readonly declaredDependencies: ReadonlyMap<string, string>;
  readonly canonicalExportKeys: ReadonlyMap<TargetModule, ReadonlySet<string>>;
  readonly rootTestTooling: ReadonlyMap<string, string>;
}): ArchitectureViolation[] {
  const sourceFile = ts.createSourceFile(
    args.file,
    args.content,
    ts.ScriptTarget.Latest,
    true,
    args.file.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : args.file.endsWith(".jsx")
        ? ts.ScriptKind.JSX
        : args.file.endsWith(".js") || args.file.endsWith(".mjs") || args.file.endsWith(".cjs")
          ? ts.ScriptKind.JS
          : ts.ScriptKind.TS,
  );
  const violations: ArchitectureViolation[] = [];
  const parseDiagnostics = (
    sourceFile as ts.SourceFile & { readonly parseDiagnostics?: readonly ts.Diagnostic[] }
  ).parseDiagnostics;
  if (parseDiagnostics && parseDiagnostics.length > 0) {
    violations.push(violation(args.repositoryRoot, "source_parse_invalid", args.file));
  }
  violations.push(
    ...dependencyViolations(
      args.repositoryRoot,
      args.modules,
      args.electronModule,
      args.sourceModule,
      args.file,
      sourceFile,
      args.config,
      args.declaredDependencies,
      args.canonicalExportKeys,
      args.rootTestTooling,
    ),
  );
  violations.push(
    ...rendererAstViolations(args.repositoryRoot, args.electronModule, args.file, sourceFile),
  );
  violations.push(
    ...legacyDomainViolations(args.repositoryRoot, args.sourceModule, args.file, sourceFile),
  );
  violations.push(...foldedSecretViolations(args.repositoryRoot, args.file, sourceFile));
  return violations;
}
