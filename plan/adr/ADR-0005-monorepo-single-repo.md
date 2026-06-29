# ADR-0005：代码、规范、计划合并为单一 monorepo

- 状态：已接受，2026-06-26 清理后修订
- 相关：`README.md`、`AGENTS.md`

## 背景

Sartre 的开发依赖规范、计划、证据和代码同时演进。若代码和约束分离，AI 执行时容易读取过期规则，导致实现漂移。

## 决策

保持单仓：

```text
apps/
packages/
.agents/
docs/
spec/
workflow/
openspec/
bdd/
acceptance/
reports/
scripts/
plan/
```

当前技术栈是 TypeScript monorepo：

- apps: Hub API、Web Console、Connector CLI。
- packages: domain、contracts、sdk、connector-core。
- docs/spec/workflow/plan 与代码同源同仓。

## 理由

1. 规范和代码在同一次变更里演进，减少漂移。
2. AI 能在同一工作区读取实现、约束和证据。
3. pnpm workspace 已足够，不需要额外 monorepo 编排工具。

## 影响

- 当前发布和验收以 `lane-a-service-baseline` 证据链为准。
